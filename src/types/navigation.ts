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
  Store,
  TrendingUp,
  BarChart3,
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
      { label: 'ÇEKTEN Hesabı', to: '/finans/cekten-hesabi' },
      { label: 'Çek Vade Hesaplama', to: '/finans/cek-vade-hesaplama' },
      { label: 'POS Fark Hesaplama', to: '/finans/pos-fark-hesaplama' },
      { label: 'Banka Hesapları', to: '/finans/banka-hesaplari' },
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
    label: 'E-Faturalar',
    to: '/e-fatura/etik',
    icon: FileText,
    children: [
      { label: 'Etik E-Fatura', to: '/e-fatura/etik' },
      { label: 'Marif E-Fatura', to: '/e-fatura/marif' },
    ],
  },
  {
    label: 'Araç Yönetimi',
    to: '/arac-yonetimi/arac-listesi',
    icon: Car,
    children: [
      { label: 'Araç Listesi', to: '/arac-yonetimi/arac-listesi' },
      { label: 'Araç Sigorta - Muayene', to: '/arac-yonetimi' },
      { label: 'HGS - Geçiş & Trafik Cezaları', to: '/arac-yonetimi/hgs-ve-cezalari' },
      { label: 'Yakıt Takip', to: '/arac-yonetimi/yakit-takip' },
      { label: 'Şoförler', to: '/arac-yonetimi/soforler' },
      { label: 'Sanayi Giderleri', to: '/arac-yonetimi/sanayi-giderleri' },
    ],
  },
  {
    label: 'Kesim Listesi',
    to: '/kesim-listesi',
    icon: Beef,
    children: [
      { label: 'Kesim Listesi', to: '/kesim-listesi' },
      { label: 'Açık Mal Ödemeleri', to: '/kesim-listesi/acik-mal-odemeleri' },
      { label: 'Kesim Listesi Cari', to: '/kesim-listesi/cari' },
    ],
  },
  {
    label: 'İhaleler',
    to: '/ihaleler',
    icon: Gavel,
    children: [
      { label: 'İhaleler', to: '/ihaleler' },
      { label: 'Doğrudan Temin', to: '/ihaleler/dogrudan-teminler' },
    ],
  },
  {
    label: 'Şubelerimiz',
    to: '/subeler/merkez',
    icon: Store,
    children: [
      { label: 'Merkez Şube', to: '/subeler/merkez' },
      { label: 'Merzifon Şube', to: '/subeler/merzifon' },
      { label: 'İlkadım Şube', to: '/subeler/ilkadim' },
      { label: 'Atakum Şube', to: '/subeler/atakum' },
      { label: 'Sucukhane Şube', to: '/subeler/sucukhane' },
      { label: 'Depo Şube', to: '/subeler/depo' },
    ],
  },
  { label: 'Gayrimenkul Listesi', to: '/gayrimenkul-listesi', icon: Building2 },
  {
    label: 'Dış Muhasebe',
    to: '/dis-muhasebe/veri-gonderimi',
    icon: Building2,
    children: [
      { label: 'Veri Gönderim Portalı', to: '/dis-muhasebe/veri-gonderimi' },
      { label: 'Beyanname & Tahakkuk Deposu', to: '/dis-muhasebe/beyannameler' },
      { label: 'Cari Mutabakat & BA/BS', to: '/dis-muhasebe/mutabakatlar' },
      { label: 'Mizan Eşitleme', to: '/dis-muhasebe/mizan' }
    ]
  },
  {
    label: 'Hukuk Departmanı',
    to: '/hukuk/dosyalar',
    icon: Gavel,
    children: [
      { label: 'Dava & İcra Takibi', to: '/hukuk/dosyalar' },
      { label: 'Duruşma & İş Takvimi', to: '/hukuk/takvim' },
      { label: 'UYAP Entegrasyon Merkezi', to: '/hukuk/uyap' },
      { label: 'Avukat Portalı', to: '/hukuk/avukatlar' }
    ]
  },
  { label: 'Raporlama', to: '/raporlama', icon: BarChart3 },
  { 
    label: 'Ana Kasa', 
    to: '/ana-kasa', 
    icon: Wallet,
    children: [
      { label: 'Ana Kasa Günlük Rapor', to: '/ana-kasa/rapor' },
      { label: 'Giriş Çıkış', to: '/ana-kasa/giris-cikis' },
      { label: 'Günlük Hesap', to: '/ana-kasa/gunluk-hesap' },
      { label: 'Günlük POS Takip', to: '/pos' },
      { label: 'Banka Hesap Hareketleri', to: '/finans/banka-hesap-hareketleri' },
    ]
  },
  { label: 'Ay Sonu', to: '/ay-sonu', icon: TrendingUp },
  { label: 'Bildirimler', to: '/bildirimler', icon: Bell },
  { label: 'Takvim', to: '/takvim', icon: CalendarDays },
  { label: 'Belgeler', to: '/belgeler', icon: FileText },
  { label: 'AI Asistan', to: '/ai-asistan', icon: Sparkles },
  { label: 'Kullanıcılar', to: '/kullanicilar', icon: Users },
  { label: 'Aktivite Günlüğü', to: '/aktivite-gunlugu', icon: History },
  { 
    label: 'Ayarlar', 
    to: '/ayarlar', 
    icon: Settings,
    children: [
      { label: 'Genel Ayarlar', to: '/ayarlar' },
      { label: 'Sistem Yedekleri', to: '/ayarlar/yedekler' },
    ]
  },
];
