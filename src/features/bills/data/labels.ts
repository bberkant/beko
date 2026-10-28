import type { BillCategory, BillStatus, CompanyBill, InvoiceStatus } from '../types';

export const billCategoryConfig: Record<BillCategory, { label: string }> = {
  elektrik: { label: 'Elektrik' },
  su: { label: 'Su' },
  dogalgaz: { label: 'Doğalgaz' },
  internet_telefon: { label: 'İnternet / Tel' },
  kira: { label: 'Kira / Aidat' },
  diger: { label: 'Diğer' }
};

export const billStatusLabels: Record<BillStatus, { label: string }> = {
  odenecek: { label: 'Ödenecek' },
  odendi: { label: 'Ödendi' },
  gecikmede: { label: 'Gecikmede' }
};

export const invoiceStatusLabels: Record<InvoiceStatus, { label: string }> = {
  odenecek: { label: 'Ödenecek' },
  odendi: { label: 'Ödendi' },
  kismi: { label: 'Kısmi Ödendi' },
  gecikmede: { label: 'Gecikmede' }
};

export interface ResolvedBillDueDate {
  date: string;       // YYYY-MM-DD (active month's weekday-adjusted due date)
  nominalDay: number; // Base day of month (1..31)
  diffDays: number;   // Days remaining from today (>= 0)
  adjusted: boolean;  // True if shifted from weekend to Monday
  effectiveStatus: BillStatus;
}

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseLocalDate = (value: string): Date => {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

function moveWeekendToMonday(value: Date): Date {
  const date = new Date(value);
  const day = date.getDay();
  if (day === 6) {
    date.setDate(date.getDate() + 2);
  } else if (day === 0) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

/**
 * Her faturanın baz son ödeme gününü (1..31) koruyarak içinde bulunulan ayın
 * son ödeme tarihini hesaplar. Hafta sonuna denk gelirse Pazartesiye kaydırır,
 * sonraki ay hafta içine denk geldiğinde tekrar baz gününe döner.
 * Son ödeme günü geçtiği anda otomatik olarak bir sonraki ayın tarihine yenilenir.
 */
export function resolveBillDueDate(bill: CompanyBill, reference = new Date()): ResolvedBillDueDate {
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);

  const rawDue = (bill.dueDate || '').trim().slice(0, 10);
  const parts = rawDue.split('-').map(Number);
  const nominalDay = parts.length === 3 && parts[2] >= 1 && parts[2] <= 31 ? parts[2] : 10;

  const candidates = [-1, 0, 1, 2].map((offset) => {
    const targetMonthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = targetMonthDate.getFullYear();
    const month = targetMonthDate.getMonth();
    const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(nominalDay, maxDaysInMonth);

    const nominalDue = new Date(year, month, clampedDay);
    nominalDue.setHours(0, 0, 0, 0);
    const adjustedDue = moveWeekendToMonday(nominalDue);
    adjustedDue.setHours(0, 0, 0, 0);

    return {
      nominalDue,
      dueDate: adjustedDue,
      adjusted: toDateKey(nominalDue) !== toDateKey(adjustedDue),
    };
  });

  // Bugün veya gelecekteki ilk son ödeme tarihini seç (gün geçince otomatik sonraki aya atlar)
  const activeCycle = candidates.find((c) => c.dueDate.getTime() >= today.getTime()) ?? candidates[candidates.length - 1];
  const diffDays = Math.round((activeCycle.dueDate.getTime() - today.getTime()) / 86400000);
  const resolvedDateStr = toDateKey(activeCycle.dueDate);

  // Eğer önceki bir ayda ödendi işaretlenmişse yeni döngüde tekrar 'odenecek' olur
  let effectiveStatus: BillStatus = bill.billStatus === 'odendi' ? 'odendi' : 'odenecek';
  if (effectiveStatus === 'odendi' && bill.lastPaidAt) {
    const paidDate = parseLocalDate(bill.lastPaidAt);
    paidDate.setHours(0, 0, 0, 0);
    const daysBeforeDue = Math.round((activeCycle.dueDate.getTime() - paidDate.getTime()) / 86400000);
    if (daysBeforeDue > 25) {
      effectiveStatus = 'odenecek';
    }
  }

  return {
    date: resolvedDateStr,
    nominalDay,
    diffDays,
    adjusted: activeCycle.adjusted,
    effectiveStatus,
  };
}

export const formatTRY = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0,00 ₺';
  return `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val))} ₺`;
};

export const formatPlainNumber = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number(val));
};

export const formatNumberWithDots = (val: number | string | null | undefined): string => {
  if (val === '' || val === undefined || val === null || val === 0) {
    if (val === 0) return '0';
    return '';
  }
  const str = String(val).replace(/[^0-9]/g, '');
  if (!str) return '';
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const parseFormattedNumber = (str: string): number => {
  if (!str) return 0;
  const clean = str.replace(/[^0-9]/g, '');
  return Number(clean) || 0;
};

export const formatDateTR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) return `${d}.${m}.${y}`;
    return new Date(dateStr).toLocaleDateString('tr-TR');
  } catch {
    return dateStr;
  }
};
