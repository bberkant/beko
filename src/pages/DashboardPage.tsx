import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import {
  Wallet, TrendingUp, Users, FileText, ArrowUpRight, ArrowDownRight,
  BarChart2, ShoppingCart, Briefcase, Sliders, Lightbulb, Cloud,
  Rocket, BookOpen, Bell, Coins, ChevronDown, Search
} from 'lucide-react';
import { CalendarPage } from '../features/calendar/CalendarPage';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sidebarTheme, setSidebarTheme] = useState<'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp'>(() => {
    try {
      return (localStorage.getItem(`sidebar_theme_${user?.email}`) as any) || 'one_dars_v4';
    } catch {
      return 'one_dars_v4';
    }
  });

  useEffect(() => {
    const handleThemeChange = () => {
      try {
        const theme = (localStorage.getItem(`sidebar_theme_${user?.email}`) as any) || 'one_dars_v4';
        setSidebarTheme(theme);
      } catch (e) {
        setSidebarTheme('one_dars_v4');
      }
    };
    window.addEventListener('sidebar-theme-changed', handleThemeChange);
    return () => window.removeEventListener('sidebar-theme-changed', handleThemeChange);
  }, [user?.email]);

  const bulutModules = [
    { label: 'Başlangıç Rehberi', bg: 'bg-[#ff6b3d]', icon: Rocket, to: '/finans/cek-vade-hesaplama' },
    { label: 'Nasıl Yaparım?', bg: 'bg-[#ff6b3d]', icon: Lightbulb, to: '/ai-asistan' },
    { label: 'Panolar', bg: 'bg-[#5b61ed]', icon: BarChart2, to: '/dashboard' },
    { label: 'Malzeme Yönetimi', bg: 'bg-[#4f67ff]', icon: ShoppingCart, to: '/muhasebe/stoklar' },
    { label: 'Varlık Yönetimi', bg: 'bg-[#3b82f6]', icon: Briefcase, to: '/gayrimenkul-listesi' },
    { label: 'Talep Yönetimi', bg: 'bg-[#6366f1]', icon: FileText, to: '/ihaleler' },
    { label: 'Satınalma Yönetimi', bg: 'bg-[#7c3aed]', icon: ShoppingCart, to: '/muhasebe/vega-son-islemler' },
    { label: 'Fırsat Takip Yönetimi', bg: 'bg-[#7c3aed]', icon: Users, to: '/arac-yonetimi/soforler' },
    { label: 'Satış Yönetimi', bg: 'bg-[#6366f1]', icon: ShoppingCart, to: '/arac-yonetimi' },
    { label: 'Satış Noktası', bg: 'bg-[#8b5cf6]', icon: Coins, to: '/pos' },
    { label: 'İthalat Yönetimi', bg: 'bg-[#585cfa]', icon: Sliders, to: '/arac-yonetimi/trafik-cezalari' },
    { label: 'İhracat Yönetimi', bg: 'bg-[#585cfa]', icon: Sliders, to: '/arac-yonetimi/hgs-gecis' },
    { label: 'Bütçe Yönetimi', bg: 'bg-[#059669]', icon: BarChart2, to: '/ana-kasa/rapor' },
    { label: 'Finans Yönetimi', bg: 'bg-[#10b981]', icon: Coins, to: '/cekler' },
    { label: 'Genel Muhasebe', bg: 'bg-[#0d9488]', icon: BookOpen, to: '/muhasebe/cariler' },
    { label: 'e-Dönüşüm', bg: 'bg-[#3b82f6]', icon: Cloud, to: '/belgeler' },
    { label: 'Bildirim ve Onay', bg: 'bg-[#4345d9]', icon: Bell, to: '/bildirimler' },
    { label: 'Kişisel Verilerin Yönetimi', bg: 'bg-[#3739a8]', icon: Users, to: '/kullanicilar' },
    { label: 'Sistem Ayarları', bg: 'bg-[#64748b]', icon: Sliders, to: '/ayarlar' },
    { label: 'Yönetim Paneli', bg: 'bg-[#5b61ed]', icon: Users, to: '/aktivite-gunlugu' },
  ];

  if (sidebarTheme === 'bulut_erp') {
    return (
      <div className="-mx-4 -my-6 lg:-mx-8 lg:-my-8 min-h-[calc(100vh-64px)] bg-gradient-to-br from-[#4c5270] to-[#1e223f] flex flex-col items-center py-12 px-6 overflow-y-auto">
        {/* Search Bar */}
        <div className="relative w-full max-w-2xl mb-12 flex items-center">
          <Search className="absolute left-4 text-white/50 pointer-events-none" size={18} />
          <input
            type="text"
            placeholder="Ara..."
            className="w-full h-11 pl-12 pr-4 bg-white/10 border-none rounded-lg text-white placeholder-white/40 focus:bg-white/20 focus:ring-0 focus:outline-none text-sm transition-all"
          />
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-10 gap-y-12 max-w-5xl justify-items-center">
          {bulutModules.map((m) => {
            const ModuleIcon = m.icon;
            return (
              <button
                key={m.label}
                onClick={() => navigate(m.to)}
                className="flex flex-col items-center focus:outline-none group transition-transform active:scale-95"
              >
                {/* Colorful Square Icon */}
                <div className={`w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-2xl flex items-center justify-center ${m.bg} shadow-lg shadow-black/10 group-hover:brightness-105 transition-all`}>
                  <ModuleIcon size={24} className="text-white" strokeWidth={2} />
                </div>
                {/* Label Text */}
                <span className="text-white text-[11px] sm:text-xs text-center mt-2.5 font-medium leading-snug max-w-[85px] line-clamp-2 drop-shadow-sm">
                  {m.label}
                </span>
                {/* Chevron */}
                <ChevronDown size={11} className="text-white/30 group-hover:text-white/65 mt-1 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Toplam Gelir', value: '2.450.000 ₺', change: '+12%', up: true, icon: TrendingUp },
    { label: 'Toplam Gider', value: '1.820.000 ₺', change: '-8%', up: false, icon: Wallet },
    { label: 'Aktif Çalışan', value: '147', change: '+3', up: true, icon: Users },
    { label: 'Bekleyen Belge', value: '23', change: '-5', up: false, icon: FileText },
  ];

  const recentActivity = [
    { id: '1', text: 'Garanti BBVA Business ekstresi yüklendi', time: '2 saat önce', type: 'success' },
    { id: '2', text: 'Yapı Kredi ödemesi tamamlandı', time: '5 saat önce', type: 'info' },
    { id: '3', text: 'Yeni satın alma talebi oluşturuldu', time: '1 gün önce', type: 'info' },
    { id: '4', text: 'Araç bakım raporu güncellendi', time: '2 gün önce', type: 'info' },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        description="Şirket operasyonlarına genel bakış."
      />
      <div className="mb-6">
        <CalendarPage embedded />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                  <Icon size={15} />
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${k.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {k.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {k.change}
                </span>
              </div>
              <p className="mt-3 text-lg font-semibold tracking-tight text-gray-900">{k.value}</p>
              <p className="mt-0.5 text-xs font-medium text-gray-600">{k.label}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Hızlı Erişim" icon={<Wallet size={16} className="text-gray-400" />}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Kredi Kartları', to: '/finans/kredi-kartlari' },
              { label: 'Araç Listesi', to: '/arac-yonetimi' },
              { label: 'İhaleler', to: '/ihaleler' },
              { label: 'Takvim', to: '/takvim' },
            ].map((q) => (
              <a key={q.to} href={q.to} className="card flex items-center justify-center p-4 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600">
                {q.label}
              </a>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Son Aktiviteler" icon={<FileText size={16} className="text-gray-400" />}>
          <div className="space-y-3">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.type === 'success' ? 'bg-emerald-500' : 'bg-brand-500'}`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{a.text}</p>
                  <p className="text-xs text-gray-400">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
