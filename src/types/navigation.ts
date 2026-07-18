import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  CreditCard,
  Landmark,
  ReceiptText,
  Car,
  Gavel,
  FileText,
  CalendarDays,
  Sparkles,
  Bell,
  Users,
  Settings,
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
  { label: 'Kredi Kartları', to: '/finance/credit-cards', icon: CreditCard },
  { label: 'Banka Hesapları', to: '/finans/banka-hesaplari', icon: Landmark },
  { label: 'Çekler', to: '/finans/cekler', icon: ReceiptText },
  {
    label: 'Araç Yönetimi',
    to: '/arac-yonetimi',
    icon: Car,
    children: [
      { label: 'Araç Listesi', to: '/arac-yonetimi' },
      { label: 'Trafik Cezaları', to: '/arac-yonetimi/trafik-cezalari' },
      { label: 'Şoförler', to: '/arac-yonetimi/soforler' },
    ],
  },
  { label: 'İhaleler', to: '/ihaleler', icon: Gavel },
  { label: 'Belgeler', to: '/belgeler', icon: FileText },
  { label: 'Takvim', to: '/takvim', icon: CalendarDays },
  { label: 'AI Asistan', to: '/ai-asistan', icon: Sparkles },
  { label: 'Bildirimler', to: '/bildirimler', icon: Bell },
  { label: 'Kullanıcılar', to: '/kullanicilar', icon: Users },
  { label: 'Ayarlar', to: '/ayarlar', icon: Settings },
];
