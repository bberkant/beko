import type { LucideIcon } from 'lucide-react';
import {
  Wallet,
  Car,
  Gavel,
  FileText,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Clock,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';

export type StatusLevel = 'green' | 'yellow' | 'red';

export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  level: 'high' | 'medium' | 'low';
  icon: LucideIcon;
}

export interface TodoItem {
  id: string;
  title: string;
  time: string;
  done: boolean;
  category: string;
}

export interface FinanceMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
}

export interface VehicleStatus {
  id: string;
  label: string;
  count: number;
  total: number;
  color: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: 'ihale' | 'belge' | 'bakim' | 'odeme';
  daysLeft: number;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  icon: LucideIcon;
}

export interface CashFlowPoint {
  label: string;
  income: number;
  expense: number;
}

export interface AISuggestion {
  id: string;
  title: string;
  detail: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

export interface OperationModule {
  id: string;
  label: string;
  status: StatusLevel;
  summary: string;
  detail: string;
  icon: LucideIcon;
}

export interface KpiCard {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
  hint: string;
}

export const operationModules: OperationModule[] = [
  {
    id: 'kredi-kartlari',
    label: 'Kredi Kartları',
    status: 'yellow',
    summary: 'Nakit akışında dikkat',
    detail: '₺180.000 açık tahmin ediliyor',
    icon: CreditCard,
  },
  {
    id: 'araclar',
    label: 'Araçlar',
    status: 'green',
    summary: 'Filo sağlıklı',
    detail: '25 araç, 2 müsait',
    icon: Car,
  },
  {
    id: 'ihaleler',
    label: 'İhaleler',
    status: 'yellow',
    summary: 'İstanbul teklifi bekliyor',
    detail: 'Saat 14:00 son tarih',
    icon: Gavel,
  },
  {
    id: 'belgeler',
    label: 'Belgeler',
    status: 'green',
    summary: 'Belgeler güncel',
    detail: '5 belge onay bekliyor',
    icon: FileText,
  },
];

export const kpiCards: KpiCard[] = [
  {
    id: 'k1',
    label: 'Aylık Gelir',
    value: '₺1.248.500',
    delta: '+12,4%',
    trend: 'up',
    icon: TrendingUp,
    hint: 'geçen aya göre',
  },
  {
    id: 'k2',
    label: 'Aktif İhale',
    value: '8',
    delta: '+2',
    trend: 'up',
    icon: Gavel,
    hint: 'bu hafta',
  },
  {
    id: 'k3',
    label: 'Filo Doluluk',
    value: '%92',
    delta: '+4%',
    trend: 'up',
    icon: Car,
    hint: '23 / 25 araç',
  },
  {
    id: 'k4',
    label: 'Bekleyen Ödeme',
    value: '₺248.500',
    delta: '-3,2%',
    trend: 'down',
    icon: Clock,
    hint: '3 tedarikçi',
  },
];

export const attentionItems: AttentionItem[] = [
  {
    id: 'a1',
    title: '3 ödeme bugün son tarih',
    detail: 'Toplam ₺248.500 ödeme bekliyor',
    level: 'high',
    icon: AlertTriangle,
  },
  {
    id: 'a2',
    title: '2 aracın sigortası bitiyor',
    detail: '34 ABC 123, 06 XYZ 789',
    level: 'high',
    icon: FileText,
  },
  {
    id: 'a3',
    title: 'İstanbul ihalesi saat 14:00',
    detail: 'Teklif hazırlığı tamamlanmalı',
    level: 'medium',
    icon: Gavel,
  },
  {
    id: 'a4',
    title: '5 belge onay bekliyor',
    detail: 'Finans biriminde sıralı',
    level: 'medium',
    icon: FileText,
  },
  {
    id: 'a5',
    title: 'Filo kapasitesi %92',
    detail: '2 araç müsait durumda',
    level: 'low',
    icon: Car,
  },
  {
    id: 'a6',
    title: 'Aylık nakit açığı',
    detail: '₺180.000 açık tahmin ediliyor',
    level: 'medium',
    icon: Wallet,
  },
  {
    id: 'a7',
    title: 'Yeni AI önerisi',
    detail: 'Maliyet optimizasyonu raporu hazır',
    level: 'low',
    icon: Sparkles,
  },
];

export const todoItems: TodoItem[] = [
  { id: 't1', title: 'İstanbul ihale teklifini gözden geçir', time: '09:30', done: true, category: 'İhale' },
  { id: 't2', title: 'Tedarikçi ödeme onayları', time: '11:00', done: false, category: 'Finans' },
  { id: 't3', title: 'Araç muayene randevusu', time: '13:00', done: false, category: 'Araç' },
  { id: 't4', title: 'Müşteri sözleşmesi imza', time: '14:30', done: false, category: 'Belge' },
  { id: 't5', title: 'Haftalık bütçe toplantısı', time: '16:00', done: false, category: 'Finans' },
];

export const financeMetrics: FinanceMetric[] = [
  {
    id: 'f1',
    label: 'Toplam Gelir',
    value: '₺1.248.500',
    delta: '+12,4%',
    trend: 'up',
    icon: TrendingUp,
  },
  {
    id: 'f2',
    label: 'Toplam Gider',
    value: '₺873.200',
    delta: '+4,1%',
    trend: 'down',
    icon: TrendingDown,
  },
  {
    id: 'f3',
    label: 'Net Kâr',
    value: '₺375.300',
    delta: '+28,6%',
    trend: 'up',
    icon: Wallet,
  },
  {
    id: 'f4',
    label: 'Bekleyen Alacak',
    value: '₺420.000',
    delta: '-3,2%',
    trend: 'down',
    icon: Clock,
  },
];

export const vehicleStatus: VehicleStatus[] = [
  { id: 'v1', label: 'Yolda', count: 18, total: 25, color: 'bg-brand-500' },
  { id: 'v2', label: 'Müsait', count: 2, total: 25, color: 'bg-emerald-500' },
  { id: 'v3', label: 'Bakımda', count: 3, total: 25, color: 'bg-amber-500' },
  { id: 'v4', label: 'Pasif', count: 2, total: 25, color: 'bg-gray-400' },
];

export const upcomingEvents: UpcomingEvent[] = [
  { id: 'e1', title: 'İstanbul ihalesi', date: '17 Tem 2026', type: 'ihale', daysLeft: 0 },
  { id: 'e2', title: 'Araç sigorta yenileme', date: '17 Tem 2026', type: 'belge', daysLeft: 0 },
  { id: 'e3', title: 'Tedarikçi ödeme', date: '18 Tem 2026', type: 'odeme', daysLeft: 1 },
  { id: 'e4', title: 'Periyodik bakım', date: '20 Tem 2026', type: 'bakim', daysLeft: 3 },
  { id: 'e5', title: 'Ankara ihalesi', date: '22 Tem 2026', type: 'ihale', daysLeft: 5 },
];

export const activityItems: ActivityItem[] = [
  { id: 'ac1', user: 'Ahmet Y.', action: 'teklif gönderdi', target: 'İstanbul ihalesi', time: '5 dk önce', icon: Gavel },
  { id: 'ac2', user: 'Zeynep K.', action: 'ödeme onayladı', target: 'Tedarikçi #1042', time: '23 dk önce', icon: Wallet },
  { id: 'ac3', user: 'Mehmet D.', action: 'belge yükledi', target: 'Sigorta poliçesi', time: '1 sa önce', icon: FileText },
  { id: 'ac4', user: 'Ayşe T.', action: 'araç atadı', target: '34 ABC 123', time: '2 sa önce', icon: Car },
  { id: 'ac5', user: 'Can B.', action: 'rapor oluşturdu', target: 'Haziran maliyet', time: '3 sa önce', icon: TrendingUp },
];

export const cashFlowData: CashFlowPoint[] = [
  { label: 'Pzt', income: 180, expense: 120 },
  { label: 'Sal', income: 220, expense: 140 },
  { label: 'Çar', income: 160, expense: 180 },
  { label: 'Per', income: 280, expense: 150 },
  { label: 'Cum', income: 240, expense: 200 },
  { label: 'Cmt', income: 130, expense: 90 },
  { label: 'Paz', income: 90, expense: 60 },
];

export const aiSuggestions: AISuggestion[] = [
  {
    id: 's1',
    title: 'Bakım maliyetlerini merkeziyştir',
    detail: '3 farklı servis yerine tek servis anlaşması aylık ₺42.000 tasarruf sağlayabilir.',
    category: 'Maliyet Optimizasyonu',
    priority: 'high',
  },
  {
    id: 's2',
    title: 'Boş kapasiteyi değerlendir',
    detail: 'Cmt-Paz düşük kullanım. Kısa mesafe kiralama talebi değerlendirilebilir.',
    category: 'Filo Verimliliği',
    priority: 'medium',
  },
  {
    id: 's3',
    title: 'Alacak yaşlandırma',
    detail: '₺180.000 alacak 30+ gün gecikmiş. Otomatik hatırlatma akışı önerilir.',
    category: 'Finans',
    priority: 'high',
  },
  {
    id: 's4',
    title: 'İhale başarı oranı',
    detail: 'Son 30 günde %68 başarı. Teklif şablonu güncellenmesi önerilir.',
    category: 'İhale',
    priority: 'low',
  },
];

export const eventBadge: Record<UpcomingEvent['type'], { label: string; cls: string }> = {
  ihale: { label: 'İhale', cls: 'bg-brand-50 text-brand-700' },
  belge: { label: 'Belge', cls: 'bg-violet-50 text-violet-700' },
  bakim: { label: 'Bakım', cls: 'bg-amber-50 text-amber-700' },
  odeme: { label: 'Ödeme', cls: 'bg-emerald-50 text-emerald-700' },
};

export const priorityBadge: Record<AISuggestion['priority'], { label: string; cls: string }> = {
  high: { label: 'Yüksek', cls: 'bg-red-50 text-red-600' },
  medium: { label: 'Orta', cls: 'bg-amber-50 text-amber-600' },
  low: { label: 'Düşük', cls: 'bg-gray-100 text-gray-600' },
};

export const levelBadge: Record<AttentionItem['level'], { dot: string; text: string }> = {
  high: { dot: 'bg-red-500', text: 'text-red-600' },
  medium: { dot: 'bg-amber-500', text: 'text-amber-600' },
  low: { dot: 'bg-brand-500', text: 'text-brand-600' },
};

export const eventIcon: Record<UpcomingEvent['type'], LucideIcon> = {
  ihale: Gavel,
  belge: FileText,
  bakim: Car,
  odeme: Wallet,
};

export const statusBadge: Record<StatusLevel, { label: string; dot: string; cls: string }> = {
  green: { label: 'Sorun yok', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700' },
  yellow: { label: 'Dikkat', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-700' },
  red: { label: 'Acil', dot: 'bg-red-500', cls: 'bg-red-50 text-red-700' },
};
