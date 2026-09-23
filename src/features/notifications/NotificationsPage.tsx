import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CreditCard, 
  Car, 
  FileText, 
  Calendar, 
  Search, 
  CheckCircle, 
  ExternalLink, 
  Clock, 
  AlertTriangle,
  Check,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useStore } from '../credit-cards/data/store';
import { useVehicles } from '../vehicles/store';
import { supabase } from '../../lib/supabase';
import { resolveCardDueDate, resolveCardOutstandingDebt } from '../credit-cards/lib/billingDateEngine';
import { useToast } from '../../lib/toast';
import { PageHeader } from '../../components/ui/PageHeader';

interface NotificationItem {
  id: string;
  rawId?: string;
  title: string;
  detail: string;
  type: 'credit-card' | 'inspection' | 'insurance' | 'tender' | 'note';
  dateStr: string;
  to: string;
  daysRemaining: number;
  completed?: boolean;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  
  const { cards, statements } = useStore();
  const { vehicles } = useVehicles();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'credit-card' | 'vehicles' | 'tender' | 'note'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';

    setLoading(true);
    const p1 = supabase
      .from('tenders')
      .select('id,tender_number,title,institution,deadline_at,status')
      .eq('organization_id', orgId)
      .neq('status', 'kazanildi')
      .neq('status', 'kaybedildi')
      .neq('status', 'iptal');

    const p2 = supabase
      .from('calendar_notes')
      .select('id,content,date,completed')
      .eq('organization_id', orgId)
      .eq('completed', false)
      .not('date', 'is', null);

    Promise.all([p1, p2]).then(([{ data: tenderData }, { data: noteData }]) => {
      const list: NotificationItem[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // --- Credit Cards ---
      for (const card of cards) {
        const debt = resolveCardOutstandingDebt(card, statements);
        if (card.status !== 'aktif' || card.limit <= 0 || debt <= 0) continue;
        const dueDateInfo = resolveCardDueDate(card, statements);
        const dueDate = new Date(dueDateInfo.date);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 3) {
          list.push({
            id: `card-${card.id}`,
            rawId: card.id,
            title: `${card.bank} Kart Ödemesi`,
            detail: `${card.cardName} ödemesi yaklaşmıştır.`,
            type: 'credit-card',
            dateStr: dueDateInfo.date,
            to: `/finans/kredi-kartlari/${card.id}`,
            daysRemaining: diffDays
          });
        }
      }

      // --- Vehicles ---
      for (const vehicle of vehicles) {
        if (vehicle.inspectionDate) {
          const inspDate = new Date(vehicle.inspectionDate);
          inspDate.setHours(0, 0, 0, 0);
          const diffTime = inspDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 15 && diffDays >= -5) {
            list.push({
              id: `insp-${vehicle.id}`,
              rawId: vehicle.id,
              title: `${vehicle.plate} Muayene Son Günü`,
              detail: `${vehicle.brand} ${vehicle.model} aracın muayenesi yaklaşmıştır.`,
              type: 'inspection',
              dateStr: vehicle.inspectionDate,
              to: `/arac-yonetimi/${vehicle.id}`,
              daysRemaining: diffDays
            });
          }
        }
        if (vehicle.insuranceDate) {
          const insDate = new Date(vehicle.insuranceDate);
          insDate.setHours(0, 0, 0, 0);
          const diffTime = insDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 15 && diffDays >= -5) {
            list.push({
              id: `ins-${vehicle.id}`,
              rawId: vehicle.id,
              title: `${vehicle.plate} Sigorta Bitişi`,
              detail: `${vehicle.brand} ${vehicle.model} aracın sigorta vadesi dolmaktadır.`,
              type: 'insurance',
              dateStr: vehicle.insuranceDate,
              to: `/arac-yonetimi/${vehicle.id}`,
              daysRemaining: diffDays
            });
          }
        }
      }

      // --- Tenders ---
      if (tenderData) {
        for (const tender of tenderData) {
          if (!tender.deadline_at) continue;
          const deadline = new Date(tender.deadline_at);
          deadline.setHours(0, 0, 0, 0);
          const diffTime = deadline.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 3 && diffDays >= -1) {
            list.push({
              id: `tender-${tender.id}`,
              rawId: tender.id,
              title: `İhale Son Günü (${tender.tender_number})`,
              detail: `${tender.title} - ${tender.institution}`,
              type: 'tender',
              dateStr: tender.deadline_at,
              to: '/ihaleler',
              daysRemaining: diffDays
            });
          }
        }
      }

      // --- Custom Notes ---
      if (noteData) {
        for (const note of noteData) {
          const noteDate = new Date(note.date);
          noteDate.setHours(0, 0, 0, 0);
          const diffTime = noteDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 1) {
            list.push({
              id: `note-${note.id}`,
              rawId: note.id,
              title: `Takvim Hatırlatması`,
              detail: note.content,
              type: 'note',
              dateStr: note.date,
              to: '/takvim',
              daysRemaining: diffDays
            });
          }
        }
      }

      list.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setNotifications(list);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching notification data', err);
      setLoading(false);
    });
  }, [user?.organizationId, cards, statements, vehicles]);

  const handleCompleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calendar_notes')
        .update({ completed: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.rawId !== id));
      notify('Görev tamamlandı olarak işaretlendi.', 'success');
    } catch (err: any) {
      notify('Hata: ' + err.message, 'error');
    }
  };

  // Filter count helpers
  const countByType = (type: 'all' | 'credit-card' | 'vehicles' | 'tender' | 'note') => {
    if (type === 'all') return notifications.length;
    if (type === 'vehicles') {
      return notifications.filter(n => n.type === 'inspection' || n.type === 'insurance').length;
    }
    return notifications.filter(n => n.type === type).length;
  };

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter(item => {
      // Tab filter
      if (activeTab === 'vehicles') {
        if (item.type !== 'inspection' && item.type !== 'insurance') return false;
      } else if (activeTab !== 'all') {
        if (item.type !== activeTab) return false;
      }

      // Search filter
      if (search) {
        const query = search.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDetail = item.detail.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDetail) return false;
      }

      return true;
    });
  }, [notifications, activeTab, search]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  };

  const getStatusBadge = (days: number) => {
    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
          <AlertTriangle size={12} className="text-red-500 animate-pulse" />
          Gecikmiş ({Math.abs(days)} gün)
        </span>
      );
    } else if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-inset ring-orange-600/10">
          <Clock size={12} className="text-orange-500 animate-pulse" />
          Bugün Son
        </span>
      );
    } else if (days <= 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/10">
          <Clock size={12} className="text-amber-500" />
          {days} Gün Kaldı
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/10">
          <Clock size={12} className="text-blue-500" />
          {days} Gün Kaldı
        </span>
      );
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'credit-card':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
            <CreditCard size={22} />
          </div>
        );
      case 'inspection':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Car size={22} />
          </div>
        );
      case 'insurance':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <ShieldAlert size={22} />
          </div>
        );
      case 'tender':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <FileText size={22} />
          </div>
        );
      case 'note':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Calendar size={22} />
          </div>
        );
      default:
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-600 border border-gray-100">
            <Bell size={22} />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bildirimler & Hatırlatıcılar"
        description="Yaklaşan ödemeler, muayeneler, ihale süreleri ve takvim hatırlatmalarını takip edin."
      />

      {/* Tabs & Search controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'text-gray-600 hover:text-gray-900 border border-transparent'
            }`}
          >
            <span>Tümü</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${activeTab === 'all' ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
              {countByType('all')}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('credit-card')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'credit-card'
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'text-gray-600 hover:text-gray-900 border border-transparent'
            }`}
          >
            <CreditCard size={14} />
            <span>Kredi Kartları</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${activeTab === 'credit-card' ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
              {countByType('credit-card')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'vehicles'
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'text-gray-600 hover:text-gray-900 border border-transparent'
            }`}
          >
            <Car size={14} />
            <span>Araç Yönetimi</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${activeTab === 'vehicles' ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
              {countByType('vehicles')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tender')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'tender'
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'text-gray-600 hover:text-gray-900 border border-transparent'
            }`}
          >
            <FileText size={14} />
            <span>İhaleler</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${activeTab === 'tender' ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
              {countByType('tender')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('note')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'note'
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'text-gray-600 hover:text-gray-900 border border-transparent'
            }`}
          >
            <Calendar size={14} />
            <span>Takvim Notları</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${activeTab === 'note' ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
              {countByType('note')}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            className="input pl-9 text-xs"
            placeholder="Bildirim ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white rounded-2xl border border-gray-200">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <span className="text-sm font-semibold text-gray-500">Bildirimler yükleniyor...</span>
          </div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-gray-200 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-base font-bold text-gray-900">Harika! Her şey yolunda</h3>
          <p className="mt-1.5 text-xs text-gray-500 max-w-xs mx-auto">
            {search 
              ? 'Arama kriterlerinize uyan aktif bir bildirim veya hatırlatıcı bulunamadı.' 
              : 'Şu anda ilgilenmeniz gereken herhangi bir süresi yaklaşmış ödeme, muayene veya hatırlatma bulunmuyor.'}
          </p>
        </div>
      ) : (
        /* Notification List */
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {filteredNotifications.map((item) => (
            <div 
              key={item.id} 
              className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all group"
            >
              {getIcon(item.type)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
                    {item.title}
                  </h4>
                  <div className="shrink-0">
                    {getStatusBadge(item.daysRemaining)}
                  </div>
                </div>
                
                <p className="mt-1 text-xs text-gray-600 font-medium leading-relaxed">
                  {item.detail}
                </p>
                
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                    <Calendar size={12} />
                    <span>Son Tarih: {formatDate(item.dateStr)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {item.type === 'note' && (
                      <button
                        onClick={() => item.rawId && handleCompleteNote(item.rawId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                      >
                        <Check size={11} />
                        <span>Tamamlandı</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => navigate(item.to)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-200"
                    >
                      <span>İncele</span>
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
