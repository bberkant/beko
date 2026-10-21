import { fixCorruptedTurkishText } from '../../../lib/turkishTextFixer';
import {
  CustomerCheckItem,
  MatrixBlock,
  MatrixStrip,
  KasadaGroup,
  GroupedCustomerChecks,
} from '../types/customerChecks';

/**
 * Formats drawer and endorser into "DRAWER (ENDORSER)" or single name.
 * - Cleans both with fixCorruptedTurkishText
 * - Converts to uppercase in Turkish locale
 * - If both exist and differ: "DRAWER (ENDORSER)"
 * - If identical or only one exists: single name
 * - Fallback: "-"
 */
export function formatDrawerEndorser(kesideci?: string | null, creditor?: string | null): string {
  const k = fixCorruptedTurkishText(kesideci || '').trim().toLocaleUpperCase('tr-TR');
  const c = fixCorruptedTurkishText(creditor || '').trim().toLocaleUpperCase('tr-TR');

  if (k && c) {
    if (k === c) return k;
    return `${k} (${c})`;
  }
  return k || c || '-';
}

/**
 * Formats numeric values to Turkish currency format (e.g. "81.076.400 ₺" or "20.370.767,50 ₺").
 * - Whole numbers do not show decimal zeroes (e.g. "81.076.400 ₺")
 * - Fractional numbers show up to 2 decimal places
 * - Handles null, undefined, NaN safely
 */
export function formatCurrency(val: number | null | undefined, showSymbol = true): string {
  if (val === null || val === undefined || isNaN(val)) {
    return showSymbol ? '0 ₺' : '0';
  }
  const isWhole = Math.abs(val % 1) < 0.0001;
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(val);

  return showSymbol ? `${formatted} ₺` : formatted;
}

/**
 * Formats date string (YYYY-MM-DD or ISO timestamp) to DD.MM.YYYY.
 * - Fallback: "-"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return '-';
  const trimmed = dateStr.trim();
  if (!trimmed) return '-';
  const clean = trimmed.substring(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(clean)) {
    return clean;
  }
  return trimmed;
}

/**
 * Compares two checks by due_date ascending (null/empty dates sorted last).
 */
export function compareByDueDate(a: CustomerCheckItem, b: CustomerCheckItem): number {
  const dateA = a.due_date || '';
  const dateB = b.due_date || '';
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  return dateA.localeCompare(dateB);
}

/**
 * Normalizes ciro_edilen into canonical Kasada category and label.
 */
export function getKasadaCategory(ciroEdilen?: string | null): { category: string; label: string } {
  if (!ciroEdilen) return { category: 'DİĞER', label: 'DİĞER' };
  const raw = fixCorruptedTurkishText(ciroEdilen).trim().toLocaleUpperCase('tr-TR');
  if (!raw) return { category: 'DİĞER', label: 'DİĞER' };

  if (raw === 'KASADA YAZILDI' || raw === 'KASADA YAZLDI' || raw.includes('YAZILDI') || raw.includes('YAZLDI')) {
    return { category: 'KASADA YAZILDI', label: 'KASADA YAZILDI' };
  }
  if (raw.includes('AVUKAT') || raw.includes('İCRA') || raw.includes('ICRA')) {
    return { category: 'İCRADA / AVUKATTA', label: 'İCRADA / AVUKATTA' };
  }
  if (raw.includes('ÖNDER') || raw.includes('ONDER')) {
    return { category: 'ÖNDER ABİ DE', label: 'ÖNDER ABİ DE' };
  }
  if (raw.includes('APO')) {
    return { category: 'APO ABİ DE', label: 'APO ABİ DE' };
  }
  if (raw.includes('BANKADA')) {
    return { category: 'BANKADA', label: 'BANKADA' };
  }
  if (raw === 'KASADA' || raw === 'KASADA ALTTA' || raw === 'ÇEKMECEDE' || raw === 'KASA') {
    return { category: 'KASADA', label: 'KASADA' };
  }
  return { category: raw, label: raw };
}

/**
 * Checks whether a customer check matches a search query string.
 */
function checkMatchesSearch(c: CustomerCheckItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLocaleLowerCase('tr-TR');

  const fieldsToCheck: (string | null | undefined)[] = [
    c.check_no,
    c.kesideci,
    c.creditor,
    c.debtor,
    c.bank_name,
    c.bank_branch,
    c.tahsildar_banka,
    c.ciro_edilen,
    c.ozel_alan,
  ];

  for (const f of fieldsToCheck) {
    if (!f) continue;
    const rawLower = f.toLocaleLowerCase('tr-TR');
    if (rawLower.includes(q)) return true;
    const fixedLower = fixCorruptedTurkishText(f).toLocaleLowerCase('tr-TR');
    if (fixedLower.includes(q)) return true;
  }

  return false;
}

/**
 * Groups active customer checks into 6-strip matrix, dynamic fallback blocks,
 * and bottom Kasada table groups.
 */
export function groupCustomerChecks(
  checks: CustomerCheckItem[],
  searchQuery?: string
): GroupedCustomerChecks {
  const search = (searchQuery || '').trim();

  // Filter checks by search query and active status (check_type = 'alinan' and status !== 'Ödendi')
  const activeChecks = checks.filter((c) => {
    // Exclude settled checks
    const st = (c.status || '').trim().toLocaleLowerCase('tr-TR');
    if (st === 'ödendi' || st === 'odendi') return false;

    // If check_type is explicitly specified, only keep 'alinan'
    if (c.check_type && c.check_type.trim().toLowerCase() !== 'alinan') {
      return false;
    }

    // Apply search filter if query is present
    if (search && !checkMatchesSearch(c, search)) {
      return false;
    }

    return true;
  });

  // Predefined Matrix Blocks Initialization
  // Strip 1: KUVEYT
  const b_kuveyt: MatrixBlock = { id: 'kuveyt', title: 'KUVEYT', checks: [], subtotal: 0 };

  // Strip 2: ALBARAKA, MARİF KUVEYT, MARİF AKBANK
  const b_albaraka: MatrixBlock = { id: 'albaraka', title: 'ALBARAKA', checks: [], subtotal: 0 };
  const b_marif_kuveyt: MatrixBlock = { id: 'marif-kuveyt', title: 'MARİF KUVEYT', checks: [], subtotal: 0 };
  const b_marif_akbank: MatrixBlock = { id: 'marif-akbank', title: 'MARİF AKBANK', checks: [], subtotal: 0 };

  // Strip 3: ETİK DENİZ, MARİF FİBA, FİBA, İŞBANK, VAKIF KATILIM
  const b_etik_deniz: MatrixBlock = { id: 'etik-deniz', title: 'ETİK DENİZ', checks: [], subtotal: 0 };
  const b_marif_fiba: MatrixBlock = { id: 'marif-fiba', title: 'MARİF FİBA(İSKONTO)', checks: [], subtotal: 0 };
  const b_fiba: MatrixBlock = { id: 'fiba', title: 'FİBA', checks: [], subtotal: 0 };
  const b_isbank_iskonto: MatrixBlock = { id: 'isbank-iskonto', title: 'İŞBANK-İSKONTO', checks: [], subtotal: 0 };
  const b_vakif_katilim: MatrixBlock = { id: 'vakif-katilim', title: 'VAKIF KATILIM-SAMSUN', checks: [], subtotal: 0 };

  // Strip 4: GARANTİ FAK, MARİF ULUSAL, İŞBANK FAKİR, MARİF YAPI, DENİZ FAKİR
  const b_garanti_fak: MatrixBlock = { id: 'garanti-fak', title: 'GARANTİ FAK', checks: [], subtotal: 0 };
  const b_marif_ulusal: MatrixBlock = { id: 'marif-ulusal-fakir', title: 'MARİF ULUSAL FAKİR', checks: [], subtotal: 0 };
  const b_isbank_fakir: MatrixBlock = { id: 'isbank-fakir', title: 'İŞBANK FAKİR', checks: [], subtotal: 0 };
  const b_marif_yapi: MatrixBlock = { id: 'marif-yapi-fakir', title: 'MARİF YAPI FAKİR', checks: [], subtotal: 0 };
  const b_deniz_fakir: MatrixBlock = { id: 'deniz-fakir', title: 'DENİZ FAKİR', checks: [], subtotal: 0 };

  // Strip 5: FİNANS FAKİR, FİBA FAKİR, TEB FAKİR, ELİMİZDEKİ ÇEKLER
  const b_finans_fakir: MatrixBlock = { id: 'finans-fakir', title: 'FİNANS FAKİR', checks: [], subtotal: 0 };
  const b_fiba_fakir: MatrixBlock = { id: 'fiba-fakir', title: 'FİBA FAKİR', checks: [], subtotal: 0 };
  const b_teb_fakir: MatrixBlock = { id: 'teb-fakir', title: 'TEB FAKİR', checks: [], subtotal: 0 };
  const b_elimizdeki: MatrixBlock = { id: 'elimizdeki-cekler', title: 'ELİMİZDEKİ ÇEKLER', checks: [], subtotal: 0 };

  // Strip 6: TAHSİLDEKİ SENETLER
  const b_senet: MatrixBlock = { id: 'tahsildeki-senetler', title: 'TAHSİLDEKİ SENETLER', checks: [], subtotal: 0 };

  // Dynamic Fallback collection for other Teminata Verildi banks
  const dynamicBankMap = new Map<string, CustomerCheckItem[]>();

  // Bottom section: Kasada / Yazılan / Avukattaki Çekler
  const kasadaChecks: CustomerCheckItem[] = [];

  for (const c of activeChecks) {
    const statusLower = (c.status || '').trim().toLocaleLowerCase('tr-TR');
    const isTeminataVerildi = statusLower === 'teminata verildi';
    const isPortfoyde = statusLower === 'portföyde' || statusLower === 'portfoyde';

    const tb = fixCorruptedTurkishText(c.tahsildar_banka || '').trim().toLocaleUpperCase('tr-TR');
    const ce = fixCorruptedTurkishText(c.ciro_edilen || '').trim().toLocaleUpperCase('tr-TR');
    const docType = (c.document_type || '').trim().toLowerCase();

    // Strip 6: Promissory Notes
    if (tb === 'SENET' || docType === 'senet') {
      b_senet.checks.push(c);
    }
    // Strip 1: Kuveyt
    else if (isTeminataVerildi && (tb === 'KUVEYT' || tb === 'KUVEYT TÜRK' || tb === 'KUVEYT TURK')) {
      b_kuveyt.checks.push(c);
    }
    // Strip 2: Albaraka, Marif Kuveyt, Marif Akbank
    else if (isTeminataVerildi && (tb === 'ALBARAKA' || tb.includes('ALBARAKA'))) {
      b_albaraka.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'MARİF KUVEYT' || tb === 'MARIF KUVEYT')) {
      b_marif_kuveyt.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'MARİF AKBANK' || tb === 'MARIF AKBANK')) {
      b_marif_akbank.checks.push(c);
    }
    // Strip 3: Etik Deniz, Marif Fiba, Fiba, İşbank, Vakıf Katılım
    else if (isTeminataVerildi && (tb === 'DENİZ' || tb === 'DENİZ İSKONTO' || tb === 'ETİK DENİZ' || tb === 'DENIZ' || tb === 'DENIZ ISKONTO')) {
      b_etik_deniz.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'MARİF FİBA' || tb === 'MARIF FIBA')) {
      b_marif_fiba.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'FİBA' || tb === 'FIBA')) {
      b_fiba.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'İŞBANK' || tb === 'İŞ BANKASI' || tb === 'ISBANK')) {
      b_isbank_iskonto.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'VAKIF KATILIM' || tb === 'VAKIF KATILIM-SAMSUN')) {
      b_vakif_katilim.checks.push(c);
    }
    // Strip 4: Factoring 1 (Garanti, Marif Ulusal, İşbank Fakir, Marif Yapı, Deniz Fakir)
    else if (isTeminataVerildi && (tb === 'GARANTİ FAKTORİNG' || tb === 'GARANTI FAKTORING' || tb === 'GARANTİ FAK')) {
      b_garanti_fak.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'MARİF ULUSAL FAKTORİNG' || tb === 'MARIF ULUSAL FAKTORING' || tb === 'MARİF ULUSAL FAKİR')) {
      b_marif_ulusal.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'İŞBANK FAKTORİNG' || tb === 'ISBANK FAKTORING' || tb === 'İŞBANK FAKİR')) {
      b_isbank_fakir.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'YAPI FAKTORİNG' || tb === 'YAPI FAKTORING' || tb === 'MARİF YAPI FAKİR')) {
      b_marif_yapi.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'DENİZ FAKTORİNG' || tb === 'DENIZ FAKTORING' || tb === 'DENİZ FAKİR')) {
      b_deniz_fakir.checks.push(c);
    }
    // Strip 5: Factoring 2 & Portfolio in hand (Finans, Fiba, TEB, Elimizdeki Çekler)
    else if (isTeminataVerildi && (tb === 'FİNANS FAKTORİNG' || tb === 'FINANS FAKTORING' || tb === 'FİNANS FAKİR')) {
      b_finans_fakir.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'FİBA FAKTORİNG' || tb === 'FIBA FAKTORING' || tb === 'FİBA FAKİR')) {
      b_fiba_fakir.checks.push(c);
    }
    else if (isTeminataVerildi && (tb === 'TEB FAKTORİNG' || tb === 'TEB FAKTORING' || tb === 'TEB FAKİR')) {
      b_teb_fakir.checks.push(c);
    }
    else if ((isPortfoyde && ce === 'ELİMİZDE') || tb === 'FİGO FAKTORİNG' || tb === 'FIGO FAKTORING') {
      b_elimizdeki.checks.push(c);
    }
    // Dynamic Fallback: Any other Teminata Verildi bank
    else if (isTeminataVerildi) {
      const bankKey = tb || 'DİĞER TEMİNAT';
      if (!dynamicBankMap.has(bankKey)) {
        dynamicBankMap.set(bankKey, []);
      }
      dynamicBankMap.get(bankKey)!.push(c);
    }
    // Bottom Section: Remaining checks (Kasada, Kasada Yazıldı, Avukattaki, etc.)
    else {
      kasadaChecks.push(c);
    }
  }

  // Finalize Blocks: Sort checks ascending by due_date and calculate subtotal
  const allBlocks = [
    b_kuveyt,
    b_albaraka,
    b_marif_kuveyt,
    b_marif_akbank,
    b_etik_deniz,
    b_marif_fiba,
    b_fiba,
    b_isbank_iskonto,
    b_vakif_katilim,
    b_garanti_fak,
    b_marif_ulusal,
    b_isbank_fakir,
    b_marif_yapi,
    b_deniz_fakir,
    b_finans_fakir,
    b_fiba_fakir,
    b_teb_fakir,
    b_elimizdeki,
    b_senet,
  ];

  for (const block of allBlocks) {
    block.checks.sort(compareByDueDate);
    block.subtotal = block.checks.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  // Build Dynamic Fallback Blocks (if any)
  const dynamicBlocks: MatrixBlock[] = [];
  dynamicBankMap.forEach((bankChecks, bankName) => {
    bankChecks.sort(compareByDueDate);
    const subtotal = bankChecks.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const slug = bankName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    dynamicBlocks.push({
      id: `dynamic-${slug}`,
      title: bankName,
      checks: bankChecks,
      subtotal,
    });
  });

  // Construct 6 Vertical Column Strips
  const strip1: MatrixStrip = {
    stripNumber: 1,
    title: 'KUVEYT',
    blocks: [b_kuveyt],
    stripTotal: b_kuveyt.subtotal,
  };

  const strip2Blocks = [b_albaraka, b_marif_kuveyt, b_marif_akbank];
  const strip2: MatrixStrip = {
    stripNumber: 2,
    title: 'ALBARAKA / MARİF KUVEYT / MARİF AKBANK',
    blocks: strip2Blocks,
    stripTotal: strip2Blocks.reduce((sum, b) => sum + b.subtotal, 0),
  };

  const strip3Blocks = [b_etik_deniz, b_marif_fiba, b_fiba, b_isbank_iskonto, b_vakif_katilim];
  const strip3: MatrixStrip = {
    stripNumber: 3,
    title: 'ETİK DENİZ / MARİF FİBA / FİBA / İŞBANK / VAKIF KATILIM',
    blocks: strip3Blocks,
    stripTotal: strip3Blocks.reduce((sum, b) => sum + b.subtotal, 0),
  };

  const strip4Blocks = [b_garanti_fak, b_marif_ulusal, b_isbank_fakir, b_marif_yapi, b_deniz_fakir];
  const strip4: MatrixStrip = {
    stripNumber: 4,
    title: 'GARANTİ / ULUSAL / İŞBANK / YAPI / DENİZ FAKTORİNG',
    blocks: strip4Blocks,
    stripTotal: strip4Blocks.reduce((sum, b) => sum + b.subtotal, 0),
  };

  // Strip 5 includes Factoring 2, Elimizdeki Çekler, and any dynamic fallback blocks
  const strip5Blocks = [b_finans_fakir, b_fiba_fakir, b_teb_fakir, b_elimizdeki, ...dynamicBlocks];
  const strip5: MatrixStrip = {
    stripNumber: 5,
    title: 'FİNANS / FİBA / TEB FAKTORİNG & ELİMİZDEKİ ÇEKLER',
    blocks: strip5Blocks,
    stripTotal: strip5Blocks.reduce((sum, b) => sum + b.subtotal, 0),
  };

  const strip6Blocks = [b_senet];
  const strip6: MatrixStrip = {
    stripNumber: 6,
    title: 'TAHSİLDEKİ SENETLER',
    blocks: strip6Blocks,
    stripTotal: strip6Blocks.reduce((sum, b) => sum + b.subtotal, 0),
  };

  const strips: MatrixStrip[] = [strip1, strip2, strip3, strip4, strip5, strip6];

  // Matrix Subtotals & Counts
  const matrixTotal = strips.reduce((sum, s) => sum + s.stripTotal, 0);
  const totalMatrixChecks = strips.reduce(
    (count, s) => count + s.blocks.reduce((bCount, b) => bCount + b.checks.length, 0),
    0
  );

  // Bottom Section: Kasada Checks Grouping
  kasadaChecks.sort(compareByDueDate);
  const kasadaTotal = kasadaChecks.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Group kasada checks into KasadaGroup objects
  const kasadaCategoryMap = new Map<string, { label: string; checks: CustomerCheckItem[] }>();

  // Canonical category order
  const canonicalOrder = [
    'KASADA',
    'KASADA YAZILDI',
    'İCRADA / AVUKATTA',
    'ÖNDER ABİ DE',
    'APO ABİ DE',
    'BANKADA',
  ];

  for (const check of kasadaChecks) {
    const { category, label } = getKasadaCategory(check.ciro_edilen);
    if (!kasadaCategoryMap.has(category)) {
      kasadaCategoryMap.set(category, { label, checks: [] });
    }
    kasadaCategoryMap.get(category)!.checks.push(check);
  }

  const kasadaGroups: KasadaGroup[] = [];

  // Add canonical categories first if present
  for (const cat of canonicalOrder) {
    if (kasadaCategoryMap.has(cat)) {
      const entry = kasadaCategoryMap.get(cat)!;
      entry.checks.sort(compareByDueDate);
      const subtotal = entry.checks.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      kasadaGroups.push({
        category: cat,
        label: entry.label,
        checks: entry.checks,
        subtotal,
      });
      kasadaCategoryMap.delete(cat);
    }
  }

  // Add remaining dynamic categories
  kasadaCategoryMap.forEach((entry, cat) => {
    entry.checks.sort(compareByDueDate);
    const subtotal = entry.checks.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    kasadaGroups.push({
      category: cat,
      label: entry.label,
      checks: entry.checks,
      subtotal,
    });
  });

  const grandTotal = matrixTotal + kasadaTotal;
  const totalActiveChecks = totalMatrixChecks + kasadaChecks.length;

  return {
    strips,
    matrixTotal,
    totalMatrixChecks,
    kasadaChecks,
    kasadaGroups,
    kasadaTotal,
    grandTotal,
    totalActiveChecks,
    dynamicBlocks,
  };
}
