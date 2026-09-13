import type { BillCategory, BillStatus, InvoiceStatus } from '../types';

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


