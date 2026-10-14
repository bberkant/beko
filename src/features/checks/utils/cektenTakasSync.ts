import { fixCorruptedTurkishText } from '../../../lib/turkishTextFixer';

export const cleanStatus = (status: string | null | undefined): string => {
  if (!status) return '';
  let cleaned = status
    .replace(/Ã–/g, 'Ö')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ä°/g, 'İ')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Ãž/g, 'Ş')
    .replace(/Äž/g, 'Ğ')
    .replace(/Ä±/g, 'ı')
    .replace(/Ã¶/g, 'ö')
    .replace(/ã¶/g, 'ö')
    .replace(/ã–/g, 'ö')
    .replace(/ãœ/g, 'ü')
    .replace(/ã¼/g, 'ü')
    .replace(/ä°/g, 'i')
    .replace(/ä±/g, 'ı')
    .replace(/ã§/g, 'ç')
    .replace(/ãŸ/g, 'ş')
    .replace(/äÿ/g, 'ğ')
    .replace(/ã°/g, 'ı')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/\u0307/g, '');
  return cleaned;
};

export const isCheckPaid = (status: string | null | undefined): boolean => {
  const clean = cleanStatus(status);
  return clean.includes('ödendi') || 
         clean.includes('ödenen') || 
         clean.includes('tahsil edildi') || 
         clean.includes('tahsilat') || 
         clean.includes('ciro') ||
         clean.includes('iade') || 
         clean.includes('iptal');
};

export const formatDateForDB = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.trim().includes('T') ? dateStr.trim().split('T')[0] : dateStr.trim();
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2].trim()}.${parts[1].trim()}.${parts[0].trim()}`; // yyyy-mm-dd to dd.mm.yyyy
  }
  return dateStr.trim();
};

export const isCektenCheck = (c: any): boolean => {
  if (!c) return false;
  if (c.id && String(c.id).startsWith('cekten_')) return true;
  const debtorClean = cleanStatus(String(c.debtor || ''));
  const bankClean = cleanStatus(String(c.bank_name || ''));
  const ozelClean = cleanStatus(String(c.ozel_alan || ''));
  const notlarClean = cleanStatus(String(c.notlar || ''));
  const kesideciClean = cleanStatus(String(c.kesideci || ''));
  return debtorClean.includes('çekten') || 
         debtorClean.includes('cekten') || 
         bankClean.includes('çekten') || 
         bankClean.includes('cekten') || 
         ozelClean.includes('çekten') || 
         ozelClean.includes('cekten') ||
         notlarClean.includes('çekten') || 
         notlarClean.includes('cekten') ||
         kesideciClean.includes('çekten') ||
         kesideciClean.includes('cekten');
};

export interface CektenBalanceSummary {
  supplier: string;
  netBalance: number;
}

export function aggregateCektenBalances(rows: any[]): Map<string, CektenBalanceSummary> {
  const supplierGroups = new Map<string, CektenBalanceSummary>();
  (rows || []).forEach((row: any) => {
    let name = (row.supplier || '').trim().replace(/\s+/g, ' ');
    if (!name) return;
    name = fixCorruptedTurkishText(name);
    const key = name.toLocaleUpperCase('tr-TR');
    const rem = row.remaining_amount != null 
      ? Number(row.remaining_amount) 
      : (Number(row.total_amount || 0) - Number(row.paid_amount || 0));
    const existing = supplierGroups.get(key);
    if (!existing) {
      supplierGroups.set(key, { supplier: name, netBalance: rem });
    } else {
      existing.netBalance += rem;
    }
  });
  return supplierGroups;
}

export function createCektenPaymentPayload(
  orgId: string,
  supplier: string,
  amount: number,
  targetDateStr?: string
) {
  const rawDate = targetDateStr || new Date().toISOString().split('T')[0];
  const date = rawDate.includes('T') ? rawDate.split('T')[0].trim() : rawDate.trim();
  const cleanAmount = Math.abs(Number(amount || 0));
  return {
    organization_id: orgId,
    date,
    supplier: (supplier || '').trim(),
    total_amount: 0,
    paid_amount: cleanAmount,
    remaining_amount: -cleanAmount,
    notes: 'Takas Çekleri Ödemesi',
    payment_date: formatDateForDB(date)
  };
}

export function syncCektenIntoChecksList<T extends Record<string, any>>(
  currentChecks: T[],
  cektenRows: any[]
): T[] {
  const supplierGroups = aggregateCektenBalances(cektenRows);
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Filter out checks whose balance is 0 or where we are creditor (alacaklıyız / netBalance <= 0)
  // Per rule: Takasta Olmayan Çekler only includes amounts we owe to pay (borçlu olduklarımız / ödeyeceklerimiz)
  let updated = currentChecks.filter(c => {
    if (isCheckPaid(c.status)) return true;
    if (!isCektenCheck(c)) return true;
    if (!c.ozel_alan?.includes('TAKASTA OLMAYAN')) return true;

    const cCreditor = fixCorruptedTurkishText(c.creditor || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
    const summary = supplierGroups.get(cCreditor);
    if (!summary || summary.netBalance <= 0.01) {
      return false;
    }
    return true;
  });

  // 2. Update existing or insert new dynamic checks
  // ONLY include caris where we owe money (netBalance > 0.01), NEVER when we are creditor (alacaklı olduklarımız)
  supplierGroups.forEach(({ supplier, netBalance }) => {
    if (netBalance <= 0.01) return;

    const supplierUpper = fixCorruptedTurkishText(supplier).trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
    const existingIndex = updated.findIndex(c => {
      if (isCheckPaid(c.status)) return false;
      const cCreditor = fixCorruptedTurkishText(c.creditor || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
      if (cCreditor !== supplierUpper) return false;
      return isCektenCheck(c);
    });

    const roundedAmount = Math.round(netBalance * 100) / 100;

    if (existingIndex >= 0) {
      const existingCheck = updated[existingIndex];
      if (existingCheck.ozel_alan?.includes('TAKASTA OLMAYAN')) {
        updated[existingIndex] = {
          ...existingCheck,
          amount: roundedAmount
        };
      }
    } else {
      const dynamicCheck: any = {
        id: `cekten_${encodeURIComponent(supplierUpper)}`,
        local_id: 0,
        check_type: 'kesilen',
        document_type: 'cek',
        issue_date: todayStr,
        due_date: todayStr,
        amount: roundedAmount,
        para_birimi: 'TRY',
        check_no: null,
        creditor: supplier,
        debtor: 'ÇEKTEN',
        bank_name: 'ÇEKTEN',
        bank_branch: null,
        status: 'Tahsilde',
        ozel_alan: 'TAKASTA OLMAYAN - ÇEKTEN',
        kesideci: null,
        keside_yeri: null,
        tahsildar_banka: null,
        ciro_edilen: null,
        created_at: new Date().toISOString()
      };
      updated.push(dynamicCheck as T);
    }
  });

  return updated;
}

export function notifyCektenDataChanged() {
  try {
    localStorage.setItem('cekten_last_update', Date.now().toString());
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cekten-data-changed'));
  }
}

