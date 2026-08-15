import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Car,
  Gavel,
  FileText,
  CalendarDays,
  Sparkles,
  Bell,
  Users,
  Settings,
  Coins,
  Building2,
  Wallet,
  Beef,
  History,
  Landmark,
  Receipt,
} from 'lucide-react';

export interface NavChild {
  label: string;
  to: string;
}

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  children?: NavChild[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Çek & Senet İşlemleri',
    to: '/cekler/takas',
    icon: Coins,
    children: [
      { label: 'Takas Çekleri', to: '/cekler/takas' },
      { label: 'Çek & Senet Listesi', to: '/cekler' },
    ],
  },
  {
    label: 'Finans',
    to: '/finans/kredi-kartlari',
    icon: Landmark,
    children: [
      { label: 'Kredi Kartları', to: '/finans/kredi-kartlari' },
      { label: 'POS Günlük Takip', to: '/pos' },
      { label: 'Çek Vade Hesaplama', to: '/finans/cek-vade-hesaplama' },
      { label: 'POS Fark Hesaplama', to: '/finans/pos-fark-hesaplama' },
      { label: 'Banka Hesapları', to: '/finans/banka-hesaplari' },
      { label: 'Banka Hesap Hareketleri', to: '/finans/banka-hesap-hareketleri' },
    ],
  },
  {
    label: 'Muhasebe',
    to: '/muhasebe/cariler',
    icon: Receipt,
    children: [
      { label: 'Cari Kart Listesi', to: '/muhasebe/cariler' },
      { label: 'Personel Cari Listesi', to: '/muhasebe/personel' },
      { label: 'Stok Yönetimi', to: '/muhasebe/stoklar' },
      { label: 'Vega Son İşlemler', to: '/muhasebe/vega-son-islemler' },
    ],
  },
  {
    label: 'Araç Yönetimi',
    to: '/arac-yonetimi',
    icon: Car,
    children: [
      { label: 'Araç Listesi - Muayene', to: '/arac-yonetimi' },
      { label: 'Araç Fiyat Listesi', to: '/arac-yonetimi/guncel-fiyat' },
      { label: 'Trafik Cezaları', to: '/arac-yonetimi/trafik-cezalari' },
      { label: 'HGS - Geçiş', to: '/arac-yonetimi/hgs-gecis' },
      { label: 'Şoförler', to: '/arac-yonetimi/soforler' },
    ],
  },
  { label: 'İhaleler', to: '/ihaleler', icon: Gavel },
  {
    label: 'Kesim Listesi',
    to: '/kesim-listesi',
    icon: Beef,
    children: [
      { label: 'Kesim Listesi', to: '/kesim-listesi' },
      { label: 'Açık Mal Ödemeleri', to: '/kesim-listesi/acik-mal-odemeleri' },
    ],
  },
  { label: 'Gayrimenkul Listesi', to: '/gayrimenkul-listesi', icon: Building2 },
  { 
    label: 'Ana Kasa', 
    to: '/ana-kasa', 
    icon: Wallet,
    children: [
      { label: 'Ana Kasa Raporu', to: '/ana-kasa/rapor' },
      { label: 'Günlük Hesap', to: '/ana-kasa/gunluk-hesap' },
    ]
  },
  { label: 'Bildirimler', to: '/bildirimler', icon: Bell },
  { label: 'Takvim', to: '/takvim', icon: CalendarDays },
  { label: 'Belgeler', to: '/belgeler', icon: FileText },
  { label: 'AI Asistan', to: '/ai-asistan', icon: Sparkles },
  { label: 'Kullanıcılar', to: '/kullanicilar', icon: Users },
  { label: 'Aktivite Günlüğü', to: '/aktivite-gunlugu', icon: History },
  { label: 'Ayarlar', to: '/ayarlar', icon: Settings },
];
