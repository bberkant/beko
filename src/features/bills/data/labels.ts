import { Zap, Droplet, Flame, Wifi, Building, FileText, type LucideIcon } from 'lucide-react';
import type { BillCategory, BillStatus, InvoiceStatus } from '../types';

export const billCategoryConfig: Record<BillCategory, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  elektrik: {
    label: 'Elektrik',
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200 text-amber-800'
  },
  su: {
    label: 'Su',
    icon: Droplet,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  dogalgaz: {
    label: 'Doğalgaz',
    icon: Flame,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200 text-orange-800'
  },
  internet_telefon: {
    label: 'İnternet / Tel',
    icon: Wifi,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200 text-indigo-800'
  },
  kira: {
    label: 'Kira / Aidat',
    icon: Building,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-800'
  },
  diger: {
    label: 'Diğer',
    icon: FileText,
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-gray-200 text-gray-800'
  }
};

export const billStatusLabels: Record<BillStatus, { label: string; badge: string }> = {
  odenecek: {
    label: 'Ödenecek',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200'
  },
  odendi: {
    label: 'Ödendi',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  },
  gecikmede: {
    label: 'Gecikmede',
    badge: 'bg-red-50 text-red-700 border border-red-200 font-bold'
  }
};

export const invoiceStatusLabels: Record<InvoiceStatus, { label: string; badge: string }> = {
  odenecek: {
    label: 'Ödenecek',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200'
  },
  odendi: {
    label: 'Ödendi',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  },
  kismi: {
    label: 'Kısmi Ödendi',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200'
  },
  gecikmede: {
    label: 'Gecikmede',
    badge: 'bg-red-50 text-red-700 border border-red-200 font-bold'
  }
};

export const formatTRY = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0,00 ₺';
  return `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val))} ₺`;
};

export const formatPlainNumber = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number(val));
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
