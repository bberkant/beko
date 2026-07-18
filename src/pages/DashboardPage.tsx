import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import {
  Wallet, TrendingUp, Users, FileText, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { CalendarPage } from '../features/calendar/CalendarPage';

export function DashboardPage() {
  const kpis = [
    { label: 'Toplam Gelir', value: '₺2.450.000', change: '+12%', up: true, icon: TrendingUp },
    { label: 'Toplam Gider', value: '₺1.820.000', change: '-8%', up: false, icon: Wallet },
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
        <SectionCard title="Hızlı Erişim" icon={<Wallet size={16} className="text-gray-400" />}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Kredi Kartları', to: '/finance/credit-cards' },
              { label: 'Ödemeler', to: '/finans/odemeler' },
              { label: 'Belgeler', to: '/belgeler' },
              { label: 'Araçlar', to: '/arac-yonetimi' },
            ].map((q) => (
              <a key={q.to} href={q.to} className="card flex items-center justify-center p-4 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600">
                {q.label}
              </a>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
