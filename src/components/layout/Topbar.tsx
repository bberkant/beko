import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, PanelLeft, Bell, Search, ChevronDown, LogOut, Settings, Plus, KeyRound } from 'lucide-react';
import { useAuth, cleanDisplayUsername } from '../../lib/auth';
import { useStore } from '../../features/credit-cards/data/store';
import { useVehicles } from '../../features/vehicles/store';
import { supabase } from '../../lib/supabase';
import { resolveCardDueDate, resolveCardOutstandingDebt } from '../../features/credit-cards/lib/billingDateEngine';

interface TopbarProps {
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  type: 'credit-card' | 'inspection' | 'insurance' | 'tender' | 'note';
  dateStr: string;
  to: string;
}

export function Topbar({ onToggleSidebar, onOpenMobileSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

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
  const profileRef = useRef<HTMLDivElement>(null);
  
  const { cards, statements } = useStore();
  const { vehicles } = useVehicles();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
      if (!bellRef.current?.contains(event.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';

    const p1 = supabase
      .from('tenders')
      .select('id,tender_number,title,institution,deadline_at,status')
      .eq('organization_id', orgId)
      .neq('status', 'kazanildi')
      .neq('status', 'kaybedildi')
      .neq('status', 'iptal');

    let notesQuery = supabase
      .from('calendar_notes')
      .select('id,content,date,completed')
      .eq('organization_id', orgId)
      .eq('completed', false)
      .not('date', 'is', null);

    if (user?.id) {
      notesQuery = notesQuery.eq('created_by', user.id);
    }

    Promise.all([p1, notesQuery]).then(([{ data: tenderData }, { data: noteData }]) => {
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
            title: `${card.bank} Kart Ödemesi`,
            detail: `${card.cardName} ödemesi ${diffDays === 0 ? 'Bugün' : diffDays < 0 ? 'Gecikmiş (' + Math.abs(diffDays) + ' gün)' : diffDays + ' gün kaldı'}`,
            type: 'credit-card',
            dateStr: dueDateInfo.date,
            to: `/finans/kredi-kartlari/${card.id}`
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
              title: `${vehicle.plate} Muayene Son Günü`,
              detail: `${diffDays === 0 ? 'Bugün' : diffDays < 0 ? 'Geçti' : diffDays + ' gün kaldı'} (${vehicle.brand} ${vehicle.model})`,
              type: 'inspection',
              dateStr: vehicle.inspectionDate,
              to: `/arac-yonetimi/${vehicle.id}`
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
              title: `${vehicle.plate} Sigorta Bitişi`,
              detail: `${diffDays === 0 ? 'Bugün' : diffDays < 0 ? 'Geçti' : diffDays + ' gün kaldı'} (${vehicle.brand} ${vehicle.model})`,
              type: 'insurance',
              dateStr: vehicle.insuranceDate,
              to: `/arac-yonetimi/${vehicle.id}`
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
              title: `İhale Son Günü (${tender.tender_number})`,
              detail: `${tender.title} · ${diffDays === 0 ? 'Bugün' : diffDays < 0 ? 'Geçti' : diffDays + ' gün kaldı'}`,
              type: 'tender',
              dateStr: tender.deadline_at,
              to: '/ihaleler'
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
              title: `Takvim Hatırlatması`,
              detail: `${note.content} (${diffDays === 0 ? 'Bugün' : diffDays < 0 ? 'Geçmiş' : 'Yarın'})`,
              type: 'note',
              dateStr: note.date,
              to: '/takvim'
            });
          }
        }
      }

      list.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      setNotifications(list);
    }).catch(err => {
      console.error('Error fetching notification data', err);
    });
  }, [user?.organizationId, cards, statements, vehicles]);

  const signOut = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const isDarkTopbar = sidebarTheme === 'one_dars_v4' || sidebarTheme === 'dia_v3' || sidebarTheme === 'banking_trial';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={onOpenMobileSidebar}
        className={`rounded-md p-2 hover:bg-gray-100 lg:hidden ${isDarkTopbar ? 'text-white' : 'text-gray-500'}`}
        aria-label="Menü"
      >
        <Menu size={20} />
      </button>
      <button
        onClick={onToggleSidebar}
        className={`hidden rounded-md p-2 hover:bg-gray-100 lg:block ${isDarkTopbar ? 'text-white' : 'text-gray-500'}`}
        aria-label="Kenar çubuğu"
      >
        <PanelLeft size={20} />
      </button>
      <div className="relative hidden flex-1 max-w-md sm:flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 search-icon" />
          <input
            type="text"
            placeholder="Ara..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        {sidebarTheme === 'one_dars_v4' && (
          <button className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#004b93] text-white hover:bg-[#003b73] transition-colors shadow-sm" aria-label="Hızlı Ekle">
            <Plus size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="relative" ref={bellRef}>
          <button 
            onClick={() => setBellOpen(v => !v)} 
            className={`relative rounded-md p-2 hover:bg-gray-100 ${bellOpen ? 'bg-gray-100' : ''} ${isDarkTopbar ? 'text-white' : 'text-gray-500'}`} 
            aria-label="Bildirimler"
          >
            <Bell size={19} />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>
          
          {bellOpen && (
            <div
              data-dropdown
              className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg z-50"
            >
              <div className="border-b border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Bildirimler</span>
                {notifications.length > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    {notifications.length} Yeni
                  </span>
                )}
              </div>
              <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-6 text-center text-xs text-gray-400 font-medium">Yakın vadeli veya okunmamış bildirim bulunmuyor.</p>
                ) : (
                  notifications.map((item) => {
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setBellOpen(false);
                          navigate(item.to);
                        }}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          item.type === 'credit-card' ? 'bg-red-500' : 
                          item.type === 'inspection' ? 'bg-amber-500' : 
                          item.type === 'insurance' ? 'bg-blue-500' : 
                          item.type === 'tender' ? 'bg-purple-500' : 'bg-emerald-500'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                          <p className="mt-0.5 text-[11px] text-gray-500 leading-normal">{item.detail}</p>
                          <p className="mt-1 text-[10px] text-gray-400 font-semibold uppercase">{
                            new Date(item.dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
                          }</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        <div className="relative" ref={profileRef}>
          <button onClick={() => setProfileOpen(v => !v)} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-gray-100" aria-expanded={profileOpen} aria-label="Profil menüsü">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user?.name?.[0]?.toUpperCase() ?? 'D'}
            </div>
            <div className="hidden flex-col text-left leading-tight sm:flex">
              <span className="text-sm font-medium text-gray-900">{user?.name ?? 'Demo'}</span>
              <span className="text-xs text-gray-500">{user?.role ?? 'Admin'}</span>
            </div>
            <ChevronDown size={14} className={`hidden text-gray-400 transition-transform sm:block ${profileOpen ? 'rotate-180' : ''}`}/>
          </button>
          {profileOpen && (
            <div
              data-dropdown
              className="profile-menu absolute right-0 top-12 w-72 overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              {/* User Header */}
              <div className="border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 font-bold text-base shadow-sm ring-1 ring-brand-500/20">
                    {user?.name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{user?.name ?? 'Kullanıcı'}</p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-700/10">
                        {user?.role ?? 'Admin'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500 font-medium">{cleanDisplayUsername(user?.email)}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100/80 transition-colors"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/ayarlar');
                  }}
                >
                  <Settings size={17} className="text-gray-500 shrink-0" />
                  <span className="text-gray-700 font-medium text-sm">Profil ve Ayarlar</span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100/80 transition-colors"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/sifre-degistir');
                  }}
                >
                  <KeyRound size={17} className="text-gray-500 shrink-0" />
                  <span className="text-gray-700 font-medium text-sm">Şifre Değiştir</span>
                </button>
              </div>

              {/* Footer / Logout */}
              <div className="border-t border-gray-100 p-1.5">
                <button
                  type="button"
                  className="logout-btn flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50/80 transition-colors"
                  onClick={() => void signOut()}
                >
                  <LogOut size={17} className="text-red-600 shrink-0" />
                  <span className="text-red-600 font-medium text-sm">Çıkış Yap</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
