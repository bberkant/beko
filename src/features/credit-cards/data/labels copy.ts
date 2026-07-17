import type {
  CardStatus, StatementStatus, AIAnalysisStatus, PaymentStatus,
  CardType, Currency, PaymentType, TransactionReviewStatus, SpendingCategory,
} from '../types';

export const formatTRY = (n: number): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);

export const formatNumber = (n: number): string => new Intl.NumberFormat('tr-TR').format(n);

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
};

export const maskCard = (last4: string): string => `•••• ${last4}`;

export const limitUsage = (debt: number, limit: number): number =>
  limit > 0 ? Math.round((debt / limit) * 100) : 0;

export const usageLevel = (pct: number): 'normal' | 'dikkat' | 'kritik' => {
  if (pct >= 90) return 'kritik';
  if (pct >= 70) return 'dikkat';
  return 'normal';
};

export const cardStatusLabel: Record<CardStatus, string> = {
  aktif: 'Aktif', pasif: 'Pasif', bloke: 'Bloke', 'yenileme-bekliyor': 'Yenileme Bekliyor',
};
export const cardStatusCls: Record<CardStatus, string> = {
  aktif: 'bg-emerald-50 text-emerald-700', pasif: 'bg-gray-100 text-gray-600',
  bloke: 'bg-red-50 text-red-700', 'yenileme-bekliyor': 'bg-amber-50 text-amber-700',
};
export const statementStatusLabel: Record<StatementStatus, string> = {
  yuklendi: 'Yüklendi', bekleniyor: 'Bekleniyor', isleniyor: 'İşleniyor', hata: 'Hata', 'bu-ay-eksik': 'Bu ay eksik',
};
export const statementStatusCls: Record<StatementStatus, string> = {
  yuklendi: 'bg-emerald-50 text-emerald-700', bekleniyor: 'bg-gray-100 text-gray-600',
  isleniyor: 'bg-brand-50 text-brand-700', hata: 'bg-red-50 text-red-700', 'bu-ay-eksik': 'bg-amber-50 text-amber-700',
};
export const aiStatusLabel: Record<AIAnalysisStatus, string> = {
  'analiz-bekliyor': 'Analiz Bekliyor', isleniyor: 'İşleniyor', tamamlandi: 'Tamamlandı',
  'manuel-kontrol': 'Manuel Kontrol Gerekli', hata: 'Hata',
};
export const aiStatusCls: Record<AIAnalysisStatus, string> = {
  'analiz-bekliyor': 'bg-gray-100 text-gray-600', isleniyor: 'bg-brand-50 text-brand-700',
  tamamlandi: 'bg-emerald-50 text-emerald-700', 'manuel-kontrol': 'bg-amber-50 text-amber-700', hata: 'bg-red-50 text-red-700',
};
export const paymentStatusLabel: Record<PaymentStatus, string> = {
  odenmedi: 'Ödenmedi', 'kismi-odendi': 'Kısmi Ödendi', odendi: 'Ödendi', gecikti: 'Gecikti',
};
export const paymentStatusCls: Record<PaymentStatus, string> = {
  odenmedi: 'bg-gray-100 text-gray-600', 'kismi-odendi': 'bg-amber-50 text-amber-700',
  odendi: 'bg-emerald-50 text-emerald-700', gecikti: 'bg-red-50 text-red-700',
};
export const cardTypeLabel: Record<CardType, string> = {
  business: 'Business', corporate: 'Corporate', ticari: 'Ticari', 'sanal-kart': 'Sanal Kart', 'ek-kart': 'Ek Kart',
};
export const currencyLabel: Record<Currency, string> = { TRY: '₺', USD: '$', EUR: '€' };
export const paymentTypeLabel: Record<PaymentType, string> = {
  'tam-odeme': 'Tam Ödeme', 'asgari-odeme': 'Asgari Ödeme', 'kismi-odeme': 'Kısmi Ödeme', duzeltme: 'Düzeltme',
};
export const reviewStatusLabel: Record<TransactionReviewStatus, string> = {
  normal: 'Normal', incelenecek: 'İncelenecek', 'aciklama-bekliyor': 'Açıklama Bekliyor', onaylandi: 'Onaylandı',
};
export const reviewStatusCls: Record<TransactionReviewStatus, string> = {
  normal: 'bg-gray-100 text-gray-600', incelenecek: 'bg-amber-50 text-amber-700',
  'aciklama-bekliyor': 'bg-amber-50 text-amber-700', onaylandi: 'bg-emerald-50 text-emerald-700',
};
export const categoryLabel: Record<SpendingCategory, string> = {
  yakit: 'Yakıt', market: 'Market', seyahat: 'Seyahat', konaklama: 'Konaklama',
  malzeme: 'Malzeme', bakim: 'Bakım', diger: 'Diğer',
};
export const categoryColor: Record<SpendingCategory, string> = {
  yakit: '#3b82f6', market: '#10b981', seyahat: '#8b5cf6', konaklama: '#f59e0b',
  malzeme: '#ef4444', bakim: '#06b6d4', diger: '#6b7280',
};
