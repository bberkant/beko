import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { 
  CariAgingRow, 
  SlaughterEfficiencyRow, 
  ExpenseCategoryRow,
  AgingBucket,
  RiskLevel
} from '../types';

/**
 * Fetch and compute Cari Aging & Risk data
 */
export async function fetchCariAgingData(): Promise<CariAgingRow[]> {
  const today = new Date();

  // 1. Fetch Cariler
  const { data: cariler, error: carilerErr } = await supabase
    .from('vega_cariler')
    .select('code, name, company_code, city, type, balance, last_transaction_date')
    .order('balance', { ascending: false });

  if (carilerErr) {
    console.error('Cariler fetch error:', carilerErr);
    throw carilerErr;
  }

  // 2. Fetch Movements
  const { data: movements, error: movErr } = await supabase
    .from('vega_cari_hareketler')
    .select('cari_code, date, invoice_no, izahat, description, product_name, borc, alacak, vade, type, amount')
    .order('date', { ascending: false });

  if (movErr) {
    console.warn('Movements fetch warning:', movErr);
  }

  // Group movements by cari_code
  const movMap = new Map<string, any[]>();
  if (Array.isArray(movements)) {
    for (const m of movements) {
      if (!movMap.has(m.cari_code)) {
        movMap.set(m.cari_code, []);
      }
      movMap.get(m.cari_code)!.push(m);
    }
  }

  const result: CariAgingRow[] = [];

  for (const c of (cariler || [])) {
    const cariMoves = movMap.get(c.code) || [];
    const balance = Number(c.balance) || 0;

    // Latest Invoice / Sale (borc > 0)
    const lastInvoice = cariMoves.find(m => Number(m.borc) > 0 || (m.type && ['FATURA', 'SATIS', 'MAL_ALIS'].includes(m.type.toUpperCase())));
    
    // Latest Payment / Collection (alacak > 0)
    const lastPayment = cariMoves.find(m => Number(m.alacak) > 0 || (m.type && ['TAHSILAT', 'ODEME', 'HAVALE', 'EFT', 'KASA'].includes(m.type.toUpperCase())));

    // Hybrid Overdue Days Calculation
    let overdueDays = 0;
    let bucket: AgingBucket = 'current';
    let riskLevel: RiskLevel = 'dusuk';

    if (balance > 0) {
      // Find oldest unpaid invoice or last invoice's due date
      let targetDueDate: Date | null = null;

      if (lastInvoice) {
        if (lastInvoice.vade) {
          targetDueDate = new Date(lastInvoice.vade);
        } else if (lastInvoice.date) {
          targetDueDate = new Date(lastInvoice.date);
        }
      } else if (c.last_transaction_date) {
        targetDueDate = new Date(c.last_transaction_date);
      }

      if (targetDueDate && !isNaN(targetDueDate.getTime())) {
        const diffMs = today.getTime() - targetDueDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        overdueDays = diffDays > 0 ? diffDays : 0;
      }

      if (overdueDays === 0) {
        bucket = 'current';
        riskLevel = 'dusuk';
      } else if (overdueDays <= 30) {
        bucket = '1-30';
        riskLevel = 'orta';
      } else if (overdueDays <= 60) {
        bucket = '31-60';
        riskLevel = 'yuksek';
      } else if (overdueDays <= 90) {
        bucket = '61-90';
        riskLevel = 'kritik';
      } else {
        bucket = '90+';
        riskLevel = 'kritik';
      }
    }

    // Days since last activity
    let daysSinceLastActivity = 0;
    if (c.last_transaction_date) {
      const actDate = new Date(c.last_transaction_date);
      if (!isNaN(actDate.getTime())) {
        const diffMs = today.getTime() - actDate.getTime();
        daysSinceLastActivity = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    result.push({
      cariCode: c.code,
      cariName: c.name,
      companyCode: c.company_code || undefined,
      city: c.city || undefined,
      type: c.type || 'Müşteri',
      balance,
      overdueDays,
      bucket,
      riskLevel,
      lastInvoiceDate: lastInvoice?.date,
      lastInvoiceNo: lastInvoice?.invoice_no,
      lastInvoiceAmount: lastInvoice ? Number(lastInvoice.borc || lastInvoice.amount) : undefined,
      lastInvoiceProductName: lastInvoice?.product_name || lastInvoice?.izahat,
      lastPaymentDate: lastPayment?.date,
      lastPaymentAmount: lastPayment ? Number(lastPayment.alacak || lastPayment.amount) : undefined,
      lastPaymentType: lastPayment?.izahat || lastPayment?.type,
      daysSinceLastActivity,
    });
  }

  return result.sort((a, b) => b.balance - a.balance);
}

/**
 * Export Cari Aging table to Excel (.xlsx)
 */
export function exportCariAgingToExcel(rows: CariAgingRow[]): void {
  const exportData = rows.map((r, idx) => ({
    'Sıra': idx + 1,
    'Cari Kodu': r.cariCode,
    'Cari Ünvanı': r.cariName,
    'Şehir': r.city || '-',
    'Cari Tipi': r.type,
    'Güncel Bakiye (TL)': r.balance,
    'Vadesi Geçen Gün': r.overdueDays,
    'Vade Dilimi': r.bucket === 'current' ? 'Vadesi Gelmemiş' : `${r.bucket} Gün`,
    'Risk Seviyesi': r.riskLevel.toUpperCase(),
    'Son Mal Alış Tarihi': r.lastInvoiceDate ? new Date(r.lastInvoiceDate).toLocaleDateString('tr-TR') : '-',
    'Son Fatura No': r.lastInvoiceNo || '-',
    'Son Fatura Tutarı (TL)': r.lastInvoiceAmount || 0,
    'Son Ürün/Açıklama': r.lastInvoiceProductName || '-',
    'Son Tahsilat Tarihi': r.lastPaymentDate ? new Date(r.lastPaymentDate).toLocaleDateString('tr-TR') : '-',
    'Son Tahsilat Tutarı (TL)': r.lastPaymentAmount || 0,
    'Son İşlemden Beri (Gün)': r.daysSinceLastActivity,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cari Yaslandirma Raporu');

  // Format column widths
  ws['!cols'] = [
    { wch: 6 },  // Sıra
    { wch: 15 }, // Cari Kodu
    { wch: 35 }, // Cari Ünvanı
    { wch: 12 }, // Şehir
    { wch: 12 }, // Cari Tipi
    { wch: 18 }, // Bakiye
    { wch: 16 }, // Vadesi Geçen Gün
    { wch: 16 }, // Vade Dilimi
    { wch: 14 }, // Risk
    { wch: 18 }, // Son Mal Alış
    { wch: 16 }, // Fatura No
    { wch: 18 }, // Son Tutar
    { wch: 25 }, // Açıklama
    { wch: 18 }, // Son Tahsilat
    { wch: 18 }, // Tahsilat Tutar
    { wch: 18 }, // Pasif Gün
  ];

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Cari_Yaslandirma_Raporu_${dateStr}.xlsx`);
}

/**
 * Generate WhatsApp reminder message text
 */
export function generateCariWhatsAppMessage(row: CariAgingRow): string {
  const balanceFormatted = Math.abs(row.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateStr = new Date().toLocaleDateString('tr-TR');

  let text = `Sayın *${row.cariName}*,\n\n`;
  text += `Firmamız nezdindeki cari hesabınızda ${dateStr} tarihi itibarıyla *${balanceFormatted} TL* vadesi geçmiş bakiyeniz bulunmaktadır.\n`;
  
  if (row.overdueDays > 0) {
    text += `Hesap bakiyeniz yaklaşık *${row.overdueDays} gündür* vadesini aşmış durumdadır.\n`;
  }
  if (row.lastInvoiceDate) {
    text += `En son fatura tarihiniz: ${new Date(row.lastInvoiceDate).toLocaleDateString('tr-TR')}\n`;
  }
  if (row.lastPaymentDate) {
    text += `En son yapılan ödeme/tahsilat: ${new Date(row.lastPaymentDate).toLocaleDateString('tr-TR')} (${(row.lastPaymentAmount || 0).toLocaleString('tr-TR')} TL)\n`;
  }

  text += `\nHesabınızın kapatılması veya mutabakat sağlanması hususunda bilgi ve ilginizi rica ederiz.\n\nİyi çalışmalar dileriz.`;
  return text;
}

/**
 * Fetch and compute Cash Flow & Checks Projection
 */
export async function fetchCashFlowData(): Promise<{
  liquidCash: number;
  bankTotal: number;
  totalLiquid: number;
  checksReceivable: { total: number; count: number; items: any[] };
  checksPayable: { total: number; count: number; items: any[] };
  creditCardsDebt: number;
  net30DaysProjection: number;
}> {
  // 1. Bank Accounts
  const { data: banks } = await supabase.from('bank_accounts').select('id, bank_name, account_number, balance');
  const bankTotal = (banks || []).reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

  // 2. Main Cashbox latest balance
  const { data: cashRows } = await supabase
    .from('main_cashbox_transactions')
    .select('type, amount')
    .limit(1000);

  let liquidCash = 0;
  (cashRows || []).forEach(r => {
    if (r.type === 'giris') liquidCash += Number(r.amount) || 0;
    else if (r.type === 'cikis') liquidCash -= Number(r.amount) || 0;
  });

  // 3. Checks
  const { data: checks } = await supabase
    .from('ebs_checks')
    .select('id, portfoy_no, cek_no, kesideci, borclu, tutar, vade_tarihi, durum, tip')
    .limit(1000);

  const checksReceivable = { total: 0, count: 0, items: [] as any[] };
  const checksPayable = { total: 0, count: 0, items: [] as any[] };

  (checks || []).forEach(c => {
    const amount = Number(c.tutar) || 0;
    const isPayable = c.tip === 'verilen' || (c.durum && c.durum.toLowerCase().includes('verilen'));
    if (isPayable) {
      checksPayable.total += amount;
      checksPayable.count += 1;
      checksPayable.items.push(c);
    } else {
      checksReceivable.total += amount;
      checksReceivable.count += 1;
      checksReceivable.items.push(c);
    }
  });

  // 4. Credit Cards Debt
  const { data: cards } = await supabase.from('credit_cards').select('current_debt');
  const creditCardsDebt = (cards || []).reduce((sum, c) => sum + (Number(c.current_debt) || 0), 0);

  const totalLiquid = Math.max(0, liquidCash) + bankTotal;
  const net30DaysProjection = totalLiquid + (checksReceivable.total * 0.7) - checksPayable.total - creditCardsDebt;

  return {
    liquidCash: Math.max(0, liquidCash),
    bankTotal,
    totalLiquid,
    checksReceivable,
    checksPayable,
    creditCardsDebt,
    net30DaysProjection,
  };
}

/**
 * Fetch and compute Slaughter & Producer Efficiency
 */
export async function fetchSlaughterEfficiencyData(): Promise<SlaughterEfficiencyRow[]> {
  const { data: kesimList } = await supabase
    .from('kesim_listesi')
    .select('id, kesim_tarihi, uretici, canli_kg, karkas_kg, randiman, toplam_tutar, birim_fiyat')
    .limit(1000);

  const producerMap = new Map<string, {
    count: number;
    live: number;
    carcass: number;
    amount: number;
    lastDate?: string;
  }>();

  (kesimList || []).forEach(k => {
    const prod = (k.uretici || 'Belirtilmemiş Üretici').trim();
    const live = Number(k.canli_kg) || 0;
    const carcass = Number(k.karkas_kg) || 0;
    const amount = Number(k.toplam_tutar) || 0;

    if (!producerMap.has(prod)) {
      producerMap.set(prod, { count: 0, live: 0, carcass: 0, amount: 0, lastDate: k.kesim_tarihi });
    }
    const cur = producerMap.get(prod)!;
    cur.count += 1;
    cur.live += live;
    cur.carcass += carcass;
    cur.amount += amount;
    if (k.kesim_tarihi && (!cur.lastDate || new Date(k.kesim_tarihi) > new Date(cur.lastDate))) {
      cur.lastDate = k.kesim_tarihi;
    }
  });

  const rows: SlaughterEfficiencyRow[] = [];
  producerMap.forEach((val, producer) => {
    const avgYield = val.live > 0 ? (val.carcass / val.live) * 100 : 0;
    const avgCost = val.carcass > 0 ? val.amount / val.carcass : 0;

    rows.push({
      producer,
      slaughterCount: val.count,
      totalLiveWeight: Math.round(val.live),
      totalCarcassWeight: Math.round(val.carcass),
      avgYieldPercent: Math.round(avgYield * 10) / 10,
      totalAmount: Math.round(val.amount),
      avgCostPerKg: Math.round(avgCost * 10) / 10,
      lastDate: val.lastDate,
    });
  });

  return rows.sort((a, b) => b.totalCarcassWeight - a.totalCarcassWeight);
}

/**
 * Fetch and compute Expense Categories Breakdown
 */
export async function fetchExpenseBreakdownData(): Promise<ExpenseCategoryRow[]> {
  const { data: cashOutflows } = await supabase
    .from('main_cashbox_transactions')
    .select('description, amount, company')
    .eq('type', 'cikis')
    .limit(1000);

  const { data: bankOutflows } = await supabase
    .from('bank_transactions')
    .select('description, amount')
    .eq('type', 'cikis')
    .limit(1000);

  const catMap = new Map<string, { total: number; count: number }>();
  let grandTotal = 0;

  const categorize = (desc: string) => {
    const d = (desc || '').toLocaleLowerCase('tr-TR');
    if (d.includes('yakıt') || d.includes('mazot') || d.includes('petrol') || d.includes('benzin')) return 'Akaryakıt & Ulaşım';
    if (d.includes('maaş') || d.includes('avans') || d.includes('personel') || d.includes('ücret') || d.includes('hakedis')) return 'Personel & Maaşlar';
    if (d.includes('kesim') || d.includes('mezbaha') || d.includes('hayvan') || d.includes('karkas')) return 'Kesimhane & Hayvan Alımları';
    if (d.includes('kira') || d.includes('aidat')) return 'Kira & Tesis Giderleri';
    if (d.includes('vergi') || d.includes('kdv') || d.includes('sgk') || d.includes('muhtasar')) return 'Vergi & Resmi Harçlar';
    if (d.includes('nakliye') || d.includes('kargo') || d.includes('lojistik')) return 'Nakliye & Lojistik';
    if (d.includes('yemek') || d.includes('mutfak') || d.includes('market') || d.includes('gıda')) return 'Mutfak & Yemek';
    if (d.includes('tamir') || d.includes('bakım') || d.includes('servis') || d.includes('lastik')) return 'Araç Bakım & Onarım';
    return 'Diğer Operasyonel Giderler';
  };

  const addRow = (desc: string, amount: number) => {
    if (amount <= 0) return;
    const cat = categorize(desc);
    if (!catMap.has(cat)) catMap.set(cat, { total: 0, count: 0 });
    const cur = catMap.get(cat)!;
    cur.total += amount;
    cur.count += 1;
    grandTotal += amount;
  };

  (cashOutflows || []).forEach(r => addRow(r.description || '', Number(r.amount) || 0));
  (bankOutflows || []).forEach(r => addRow(r.description || '', Number(r.amount) || 0));

  const rows: ExpenseCategoryRow[] = [];
  catMap.forEach((val, category) => {
    rows.push({
      category,
      totalAmount: Math.round(val.total),
      transactionCount: val.count,
      percentage: grandTotal > 0 ? Math.round((val.total / grandTotal) * 1000) / 10 : 0,
      source: 'Kasa & Banka',
    });
  });

  return rows.sort((a, b) => b.totalAmount - a.totalAmount);
}
