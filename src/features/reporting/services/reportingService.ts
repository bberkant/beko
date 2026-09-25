import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { 
  CariAgingRow, 
  SlaughterEfficiencyRow, 
  ExpenseCategoryRow,
  AgingBucket,
  RiskLevel,
  CariStatusIndicator
} from '../types';

/**
 * Quantity normalization for Vega movement rows
 */
export function getNormalizedQuantity(m: {
  quantity?: number | string | null;
  unit_price?: number | string | null;
  line_tutar?: number | string | null;
  borc?: number | string | null;
}): number {
  const rawQ = Number(m.quantity) || 0;
  if (rawQ > 0.001) return rawQ;
  const unitPrice = Number(m.unit_price) || 0;
  const lineTutar = Number(m.line_tutar) || 0;
  const borc = Number(m.borc) || 0;
  if (unitPrice > 0 && lineTutar > 0) {
    return Number((lineTutar / unitPrice).toFixed(4));
  }
  if (unitPrice > 0 && borc > 0) {
    return Number((borc / unitPrice).toFixed(4));
  }
  return 0;
}

/**
 * Filter out non-commodity or accounting adjustment items
 */
export function isExcludedProductName(name?: string | null): boolean {
  if (!name) return false;
  const upper = name.trim().toLocaleUpperCase('tr-TR');
  return (
    upper === 'DEVIR' ||
    upper === 'DEVİR' ||
    upper.includes('STOPAJ') ||
    upper.includes('KDV') ||
    upper.includes('KOMİSYON') ||
    upper.includes('KOMISYON') ||
    upper.includes('MASRAF')
  );
}

/**
 * Calculate dynamic unit prices for each product across system-wide sales (last 10 exits)
 * Filters outliers outside [0.50 * M, 2.00 * M] where M is median when >= 3 prices exist.
 */
export function calculateDynamicProductPrices(movements: any[]): Map<string, number> {
  // Pre-sort movements descending by date (latest first) to ensure latest 10 sales are sampled even if input is unsorted
  const sortedMovements = [...movements].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });

  const productSalesMap = new Map<string, Array<{ price: number; quantity: number }>>();

  for (const m of sortedMovements) {
    const prod = (m.product_name || '').trim();
    if (!prod || isExcludedProductName(prod)) continue;
    const price = Number(m.unit_price) || 0;
    if (price <= 0) continue;

    const isSale = Number(m.borc) > 0 || (m.type && ['FATURA', 'SATIS', 'SATIS_FATURASI', 'MAL_SATIS'].some((t: string) => m.type.toUpperCase().includes(t)));
    if (!isSale) continue;

    const prodKey = prod.toLocaleUpperCase('tr-TR');
    if (!productSalesMap.has(prodKey)) {
      productSalesMap.set(prodKey, []);
    }
    const list = productSalesMap.get(prodKey)!;
    if (list.length < 10) {
      const quantity = getNormalizedQuantity(m);
      list.push({ price, quantity });
    }
  }

  const priceMap = new Map<string, number>();

  productSalesMap.forEach((items, prodKey) => {
    if (items.length === 0) return;
    const prices = items.map(it => it.price).sort((a, b) => a - b);
    let cleanItems = items;

    if (prices.length >= 3) {
      const mid = Math.floor(prices.length / 2);
      const median = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
      const lower = 0.50 * median;
      const upper = 2.00 * median;
      const filtered = items.filter(it => it.price >= lower && it.price <= upper);
      if (filtered.length > 0) {
        cleanItems = filtered;
      } else {
        cleanItems = [{ price: median, quantity: 1 }];
      }
    }

    const totalQ = cleanItems.reduce((acc, it) => acc + (it.quantity > 0 ? it.quantity : 1), 0);
    let weightedAvg = 0;
    if (totalQ > 0) {
      weightedAvg = cleanItems.reduce((acc, it) => acc + it.price * (it.quantity > 0 ? it.quantity : 1), 0) / totalQ;
    } else {
      weightedAvg = cleanItems.reduce((acc, it) => acc + it.price, 0) / cleanItems.length;
    }
    priceMap.set(prodKey, Number(weightedAvg.toFixed(2)));
  });

  return priceMap;
}

/**
 * Fetch and compute Cari Aging, Risk & Commodity-Based Capacity Credit Data
 */
export async function fetchCariAgingData(): Promise<CariAgingRow[]> {
  const today = new Date();
  const d180Str = new Date(today.getTime() - 180 * 24 * 3600 * 1000).toISOString();
  const d60Str = new Date(today.getTime() - 60 * 24 * 3600 * 1000).toISOString();
  const pageSize = 1000;

  // 1 & 2. Concurrently fetch Cariler and Movements in parallel
  const fetchCarilerPromise = (async () => {
    let allCariler: any[] = [];
    let fromC = 0;
    while (true) {
      const { data, error } = await supabase
        .from('vega_cariler')
        .select('code, name, company_code, city, type, balance, last_transaction_date')
        .order('balance', { ascending: false })
        .range(fromC, fromC + pageSize - 1);

      if (error) {
        console.error('Cariler fetch error:', error);
        throw error;
      }
      if (!data || data.length === 0) break;
      allCariler = allCariler.concat(data);
      if (data.length < pageSize) break;
      fromC += pageSize;
    }
    return allCariler;
  })();

  const fetchMovementsPromise = (async () => {
    let allMovements: any[] = [];
    let fromM = 0;
    const batchPages = 8;
    let hasMoreMovements = true;

    while (hasMoreMovements) {
      const pagePromises = [];
      for (let i = 0; i < batchPages; i++) {
        const from = fromM + i * pageSize;
        pagePromises.push(
          supabase
            .from('vega_cari_hareketler')
            .select('cari_code, date, invoice_no, izahat, product_name, unit_price, quantity, line_tutar, borc, alacak, vade, type, amount')
            .gte('date', d180Str)
            .order('date', { ascending: false })
            .range(from, from + pageSize - 1)
        );
      }

      const results = await Promise.all(pagePromises);
      for (const res of results) {
        if (res.error) {
          console.warn('Movements fetch warning:', res.error);
          hasMoreMovements = false;
          break;
        }
        if (res.data && res.data.length > 0) {
          allMovements = allMovements.concat(res.data);
          if (res.data.length < pageSize) {
            hasMoreMovements = false;
            break;
          }
        } else {
          hasMoreMovements = false;
          break;
        }
      }
      fromM += batchPages * pageSize;
    }
    return allMovements;
  })();

  const [allCariler, allMovements] = await Promise.all([fetchCarilerPromise, fetchMovementsPromise]);

  // 3. Dynamic Product Price Engine
  const dynamicPrices = calculateDynamicProductPrices(allMovements);

  // 4. Group movements by cari_code
  const movMap = new Map<string, any[]>();
  for (const m of allMovements) {
    if (!movMap.has(m.cari_code)) {
      movMap.set(m.cari_code, []);
    }
    movMap.get(m.cari_code)!.push(m);
  }

  const result: CariAgingRow[] = [];

  for (const c of allCariler) {
    const cariMoves = movMap.get(c.code) || [];
    const balance = Number(c.balance) || 0;

    // Latest Invoice / Sale (borc > 0)
    const lastInvoice = cariMoves.find(m => Number(m.borc) > 0 || (m.type && ['FATURA', 'SATIS', 'SATIS_FATURASI', 'MAL_ALIS', 'MAL_SATIS'].some((t: string) => m.type.toUpperCase().includes(t))));

    // Latest Payment / Collection (alacak > 0)
    const lastPayment = cariMoves.find(m => Number(m.alacak) > 0 || (m.type && ['TAHSILAT', 'ODEME', 'HAVALE', 'EFT', 'KASA', 'BANKA'].some((t: string) => m.type.toUpperCase().includes(t))));

    // Commodity (Kg) & Financial Consumption Calculation in 180d & 60d
    let totalKg180 = 0;
    let totalAmt180 = 0;
    let totalKg60 = 0;
    let totalAmt60 = 0;

    const prodQty180 = new Map<string, number>();
    const prodAmt180 = new Map<string, number>();
    let nonProdAmt180 = 0;

    const prodQty60 = new Map<string, number>();
    const prodAmt60 = new Map<string, number>();
    let nonProdAmt60 = 0;

    for (const m of cariMoves) {
      const isSale = Number(m.borc) > 0 && !isExcludedProductName(m.product_name);
      if (!isSale) continue;

      const qty = getNormalizedQuantity(m);
      const lineAmt = Number(m.line_tutar) > 0 ? Number(m.line_tutar) : (Number(m.borc) > 0 ? Number(m.borc) : Number(m.amount) || 0);
      const prodName = (m.product_name || '').trim();
      const prodKey = prodName ? prodName.toLocaleUpperCase('tr-TR') : '';

      totalKg180 += qty;
      totalAmt180 += lineAmt;

      if (prodKey) {
        prodQty180.set(prodKey, (prodQty180.get(prodKey) || 0) + qty);
        prodAmt180.set(prodKey, (prodAmt180.get(prodKey) || 0) + lineAmt);
      } else {
        nonProdAmt180 += lineAmt;
      }

      if (m.date >= d60Str) {
        totalKg60 += qty;
        totalAmt60 += lineAmt;

        if (prodKey) {
          prodQty60.set(prodKey, (prodQty60.get(prodKey) || 0) + qty);
          prodAmt60.set(prodKey, (prodAmt60.get(prodKey) || 0) + lineAmt);
        } else {
          nonProdAmt60 += lineAmt;
        }
      }
    }

    // Monthly Averages
    const monthlyAvgKg = totalKg180 / 6;
    const recentMonthlyKg = totalKg60 / 2;
    const monthlyAvgAmtHist = totalAmt180 / 6;
    const recentMonthlyAmtHist = totalAmt60 / 2;

    // Product-based dynamic monthly amount
    let dynamicMonthlyAmt180 = 0;
    prodQty180.forEach((qty, prodKey) => {
      const mQ = qty / 6;
      const p = dynamicPrices.get(prodKey) || 0;
      if (p > 0) {
        dynamicMonthlyAmt180 += mQ * p;
      } else {
        dynamicMonthlyAmt180 += (prodAmt180.get(prodKey) || 0) / 6;
      }
    });
    dynamicMonthlyAmt180 += nonProdAmt180 / 6;
    const monthlyAvgAmount = dynamicMonthlyAmt180 > 0 ? dynamicMonthlyAmt180 : monthlyAvgAmtHist;

    let dynamicMonthlyAmt60 = 0;
    prodQty60.forEach((qty, prodKey) => {
      const mQ = qty / 2;
      const p = dynamicPrices.get(prodKey) || 0;
      if (p > 0) {
        dynamicMonthlyAmt60 += mQ * p;
      } else {
        dynamicMonthlyAmt60 += (prodAmt60.get(prodKey) || 0) / 2;
      }
    });
    dynamicMonthlyAmt60 += nonProdAmt60 / 2;
    const recentMonthlyAmount = dynamicMonthlyAmt60 > 0 ? dynamicMonthlyAmt60 : recentMonthlyAmtHist;

    // Volume Contraction Detection (>= 40% drop)
    let volumeDropRate = 0;
    let isVolumeShrunk = false;
    if (monthlyAvgKg > 0) {
      volumeDropRate = ((monthlyAvgKg - recentMonthlyKg) / monthlyAvgKg) * 100;
    } else if (monthlyAvgAmount > 0) {
      volumeDropRate = ((monthlyAvgAmount - recentMonthlyAmount) / monthlyAvgAmount) * 100;
    }
    if (volumeDropRate >= 40) {
      isVolumeShrunk = true;
    }

    // Safe Limit Calculation (1.0x natural monthly capacity)
    const originalSafeLimit = Number(monthlyAvgAmount.toFixed(2));
    let safeLimit = originalSafeLimit;
    if (isVolumeShrunk) {
      safeLimit = Number(recentMonthlyAmount.toFixed(2));
    }

    // Real excess risk amount
    const riskAmount = balance > 0 ? Math.max(0, Number((balance - safeLimit).toFixed(2))) : 0;

    // FIFO Backward Excess Debt Aging
    let overdueDays = 0;
    let weightedOverdueDays = 0;
    let bucket: AgingBucket = 'current';
    let riskLevel: RiskLevel = 'dusuk';

    if (balance <= 0 || riskAmount === 0) {
      overdueDays = 0;
      weightedOverdueDays = 0;
      bucket = 'current';
      riskLevel = 'dusuk';
    } else {
      // Group/deduplicate debit invoices per invoice_no for multi-line Vega invoices
      const invoiceMap = new Map<string, { date: string; vade: string; invoice_no?: string; borc: number }>();
      for (let idx = 0; idx < cariMoves.length; idx++) {
        const m = cariMoves[idx];
        const borcAmt = Number(m.borc) || 0;
        if (borcAmt <= 0) continue;
        const invNo = m.invoice_no ? String(m.invoice_no).trim() : '';
        const invKey = invNo ? invNo : `_NO_INV_${m.date}_${borcAmt}_${idx}`;
        if (!invoiceMap.has(invKey)) {
          invoiceMap.set(invKey, {
            date: m.date,
            vade: m.vade || m.date,
            invoice_no: m.invoice_no,
            borc: borcAmt,
          });
        }
      }

      // Collect debit invoices chronological (oldest to newest)
      const debitInvoices = Array.from(invoiceMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      let balanceToCover = balance;
      const openInvoices: Array<{
        date: string;
        vade: string;
        invoice_no?: string;
        unpaidAmount: number;
        excessAmount: number;
      }> = [];

      // Open invoices comprise the current balance (from newest to oldest)
      for (let i = debitInvoices.length - 1; i >= 0; i--) {
        const inv = debitInvoices[i];
        if (balanceToCover <= 0) break;
        const unpaid = Math.min(inv.borc, balanceToCover);
        openInvoices.unshift({
          date: inv.date,
          vade: inv.vade,
          invoice_no: inv.invoice_no,
          unpaidAmount: unpaid,
          excessAmount: 0,
        });
        balanceToCover -= unpaid;
      }

      // If balanceToCover > 0 (remainder from before 180 days or opening devir debt), add synthetic DEVIR_BAKIYE invoice
      if (balanceToCover > 0) {
        const threshold180Ms = today.getTime() - 180 * 24 * 3600 * 1000;
        let oldestDate: string;
        if (
          c.last_transaction_date &&
          !isNaN(new Date(c.last_transaction_date).getTime()) &&
          new Date(c.last_transaction_date).getTime() < threshold180Ms
        ) {
          oldestDate = c.last_transaction_date;
        } else {
          oldestDate = new Date(threshold180Ms).toISOString();
        }
        openInvoices.unshift({
          date: oldestDate,
          vade: oldestDate,
          invoice_no: 'DEVIR_BAKIYE',
          unpaidAmount: balanceToCover,
          excessAmount: 0,
        });
        balanceToCover = 0;
      }

      // Safe limit covers newest invoices in openInvoices
      let limitRemaining = safeLimit;
      const excessInvoices: typeof openInvoices = [];

      for (let i = openInvoices.length - 1; i >= 0; i--) {
        const inv = openInvoices[i];
        if (limitRemaining >= inv.unpaidAmount) {
          limitRemaining -= inv.unpaidAmount;
          inv.excessAmount = 0;
        } else {
          inv.excessAmount = Number((inv.unpaidAmount - limitRemaining).toFixed(2));
          limitRemaining = 0;
          excessInvoices.unshift(inv);
        }
      }

      if (excessInvoices.length > 0) {
        const oldestExcess = excessInvoices[0];
        const oldestDueDate = new Date(oldestExcess.vade || oldestExcess.date);
        const diffMs = today.getTime() - oldestDueDate.getTime();
        overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        let weightedSum = 0;
        let totalExcessFound = 0;
        for (const inv of excessInvoices) {
          const dMs = today.getTime() - new Date(inv.vade || inv.date).getTime();
          const d = Math.max(0, Math.floor(dMs / (1000 * 60 * 60 * 24)));
          weightedSum += inv.excessAmount * d;
          totalExcessFound += inv.excessAmount;
        }
        weightedOverdueDays = totalExcessFound > 0 ? Math.round(weightedSum / totalExcessFound) : overdueDays;
      } else {
        if (c.last_transaction_date) {
          const actDate = new Date(c.last_transaction_date);
          if (!isNaN(actDate.getTime())) {
            const diffMs = today.getTime() - actDate.getTime();
            overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            weightedOverdueDays = overdueDays;
          }
        }
        if (overdueDays === 0) {
          overdueDays = 180;
          weightedOverdueDays = 180;
        }
      }

      // Bucket assignment
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

    // Status Label & Indicator
    let statusLabel = 'Normal Akış';
    let statusIndicator: CariStatusIndicator = 'normal';
    const roundedDrop = Math.round(volumeDropRate);

    if (isVolumeShrunk && riskAmount > 0) {
      statusIndicator = 'drop_and_exceeded';
      statusLabel = `Alım Hacmi Düşüşte (%${roundedDrop})`;
    } else if (isVolumeShrunk) {
      statusIndicator = 'volume_drop';
      statusLabel = `Alım Hacmi Düşüşte (%${roundedDrop})`;
    } else if (riskAmount > 0) {
      statusIndicator = 'limit_exceeded';
      statusLabel = 'Limit Aşımı';
    } else {
      statusIndicator = 'normal';
      statusLabel = 'Normal Akış';
    }

    const statusBadgeText = statusLabel;

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

      monthlyAvgKg: Number(monthlyAvgKg.toFixed(2)),
      monthlyAvgAmount: Number(monthlyAvgAmount.toFixed(2)),
      safeLimit,
      originalSafeLimit,
      riskAmount,
      overdueDays,
      weightedOverdueDays,
      volumeDropRate: Number(volumeDropRate.toFixed(1)),
      isVolumeShrunk,
      statusLabel,
      statusBadgeText,

      excessAmount: riskAmount,
      volumeDropPercent: Number(volumeDropRate.toFixed(1)),
      hasVolumeDrop: isVolumeShrunk,
      statusIndicator,
      monthlyKgConsumption: Number(monthlyAvgKg.toFixed(2)),
      monthly60KgConsumption: Number(recentMonthlyKg.toFixed(2)),

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
 * Export Cari Aging table to Excel (.xlsx) with 20+ comprehensive financial columns
 */
export function exportCariAgingToExcel(rows: CariAgingRow[]): void {
  const exportData = rows.map((r, idx) => ({
    'Sıra': idx + 1,
    'Cari Kodu': r.cariCode,
    'Cari Ünvanı': r.cariName,
    'Şehir': r.city || '-',
    'Cari Tipi': r.type,
    'Güncel Net Bakiye (TL)': r.balance,
    'Aylık Ort. Tüketim (Kg)': r.monthlyAvgKg,
    'Aylık Ort. Alım Tutarı (TL)': r.monthlyAvgAmount,
    'Açık Alacak Limiti (TL)': r.safeLimit,
    'Gerçek Riskli / Aşan Tutar (TL)': r.riskAmount,
    'Vade Gecikmesi (Gün)': r.overdueDays,
    'Vade Dilimi': r.bucket === 'current' ? 'Vadesinde / Güvenli' : `${r.bucket} Gün`,
    'Durum Göstergesi': r.statusLabel,
    'Hacim Değişimi (%)': `${r.volumeDropRate > 0 ? '-' : '+'}${Math.abs(Math.round(r.volumeDropRate))}%`,
    'Risk Seviyesi': r.riskLevel === 'kritik' ? 'YÜKSEK' : r.riskLevel.toUpperCase(),
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
    { wch: 14 }, // Şehir
    { wch: 12 }, // Cari Tipi
    { wch: 20 }, // Güncel Net Bakiye
    { wch: 18 }, // Aylık Ort. Tüketim (Kg)
    { wch: 20 }, // Aylık Ort. Alım Tutarı (TL)
    { wch: 20 }, // Güvenli Vadeli Limit (TL)
    { wch: 22 }, // Gerçek Riskli / Aşan Tutar (TL)
    { wch: 16 }, // Vade Gecikmesi (Gün)
    { wch: 18 }, // Vade Dilimi
    { wch: 26 }, // Durum Göstergesi
    { wch: 16 }, // Hacim Değişimi (%)
    { wch: 14 }, // Risk Seviyesi
    { wch: 18 }, // Son Mal Alış Tarihi
    { wch: 16 }, // Son Fatura No
    { wch: 18 }, // Son Fatura Tutarı
    { wch: 25 }, // Son Ürün/Açıklama
    { wch: 18 }, // Son Tahsilat Tarihi
    { wch: 18 }, // Son Tahsilat Tutarı
    { wch: 18 }, // Son İşlemden Beri
  ];

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Cari_Yaslandirma_Raporu_${dateStr}.xlsx`);
}

/**
 * Export Acik Alacak Riski table to Excel (.xlsx) with capacity and safe credit metrics
 */
export function exportAcikAlacakRiskiToExcel(rows: CariAgingRow[]): void {
  const exportData = rows.map((r, idx) => ({
    'Sıra': idx + 1,
    'Cari Kodu': r.cariCode,
    'Cari Ünvanı': r.cariName,
    'Şehir': r.city || '-',
    'Cari Tipi': r.type,
    'Güncel Net Bakiye (TL)': r.balance,
    'Aylık Ort. Tüketim (Kg)': r.monthlyAvgKg,
    'Açık Alacak Limiti (1x) (TL)': r.safeLimit,
    'Gerçek Riskli / Aşan Tutar (TL)': r.riskAmount,
    'Vade Gecikmesi (Gün)': r.overdueDays,
    'Vade Dilimi': r.bucket === 'current' ? 'Vadesinde / Güvenli' : `${r.bucket} Gün`,
    'Durum Göstergesi': r.statusLabel,
    'Hacim Değişimi (%)': `${r.volumeDropRate > 0 ? '-' : '+'}${Math.abs(Math.round(r.volumeDropRate))}%`,
    'Son Mal Alış Tarihi': r.lastInvoiceDate ? new Date(r.lastInvoiceDate).toLocaleDateString('tr-TR') : '-',
    'Son Fatura No': r.lastInvoiceNo || '-',
    'Son Fatura Tutarı (TL)': r.lastInvoiceAmount || 0,
    'Son Tahsilat Tarihi': r.lastPaymentDate ? new Date(r.lastPaymentDate).toLocaleDateString('tr-TR') : '-',
    'Son Tahsilat Tutarı (TL)': r.lastPaymentAmount || 0,
    'Son İşlemden Beri (Gün)': r.daysSinceLastActivity,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Acik Alacak Riski');

  ws['!cols'] = [
    { wch: 6 },  // Sıra
    { wch: 15 }, // Cari Kodu
    { wch: 35 }, // Cari Ünvanı
    { wch: 14 }, // Şehir
    { wch: 12 }, // Cari Tipi
    { wch: 20 }, // Güncel Net Bakiye
    { wch: 18 }, // Aylık Ort. Tüketim (Kg)
    { wch: 22 }, // Güvenli Vadeli Limit (1x)
    { wch: 22 }, // Gerçek Riskli / Aşan Tutar
    { wch: 16 }, // Vade Gecikmesi
    { wch: 18 }, // Vade Dilimi
    { wch: 28 }, // Durum Göstergesi
    { wch: 16 }, // Hacim Değişimi
    { wch: 18 }, // Son Mal Alış Tarihi
    { wch: 16 }, // Son Fatura No
    { wch: 18 }, // Son Fatura Tutarı
    { wch: 18 }, // Son Tahsilat Tarihi
    { wch: 18 }, // Son Tahsilat Tutarı
    { wch: 18 }, // Son İşlemden Beri
  ];

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Acik_Alacak_Riski_Raporu_${dateStr}.xlsx`);
}

/**
 * Generate context-aware WhatsApp reminder message text
 */
export function generateCariWhatsAppMessage(row: CariAgingRow): string {
  const balanceFormatted = Math.abs(row.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const balanceDisplayText = row.balance < 0 
    ? `${balanceFormatted} TL (Alacak Bakiyesi)` 
    : `${balanceFormatted} TL`;
  const riskAmountFormatted = (row.riskAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateStr = new Date().toLocaleDateString('tr-TR');

  let text = `Sayın *${row.cariName}*,\n\n`;

  if (row.riskAmount && row.riskAmount > 0) {
    text += `Firmamız nezdindeki cari hesabınızda ${dateStr} tarihi itibarıyla açık alacak limitinizi aşan *${riskAmountFormatted} TL* vadesi geçmiş bakiye bulunmaktadır.\n`;
    if (row.overdueDays > 0) {
      text += `Aşan hesap bakiyeniz yaklaşık *${row.overdueDays} gündür* vadesini aşmış durumdadır.\n`;
    }
  } else {
    text += `Firmamız nezdindeki cari hesabınız açık alacak limitiniz dahilindedir (Güncel bakiye: *${balanceDisplayText}*).\n`;
    text += `Hesap hareketlerinizin mutabakatı ve güncel durum bilgisi için bilgi ve ilginizi rica ederiz.\n`;
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
