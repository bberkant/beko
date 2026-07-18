import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, PanelLeft, Bell, Search, ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface TopbarProps {
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

export function Topbar({ onToggleSidebar, onOpenMobileSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const signOut = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={onOpenMobileSidebar}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="Menü"
      >
        <Menu size={20} />
      </button>
      <button
        onClick={onToggleSidebar}
        className="hidden rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:block"
        aria-label="Kenar çubuğu"
      >
        <PanelLeft size={20} />
      </button>
      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Ara..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Bildirimler">
          <Bell size={19} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="relative" ref={profileRef}>
          <button onClick={() => setProfileOpen(v => !v)} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-gray-100" aria-expanded={profileOpen} aria-label="Profil menüsü">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user?.name?.[0]?.toUpperCase() ?? 'D'}
            </div>
            <div className="hidden flex-col text-left leading-tight sm:flex">
              <span className="text-sm font-medium text-gray-900">{user?.name ?? 'Demo'}</span>
              <span className="text-xs text-gray-500">{user?.role ?? 'Yönetici'}</span>
            </div>
            <ChevronDown size={14} className={`hidden text-gray-400 transition-transform sm:block ${profileOpen ? 'rotate-180' : ''}`}/>
          </button>
          {profileOpen && <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-100 px-4 py-3"><div className="flex items-center gap-2 text-sm font-medium text-gray-900"><UserRound size={16}/>{user?.name}</div><div className="mt-1 truncate text-xs text-gray-500">{user?.email}</div></div>
            <div className="p-1.5"><button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setProfileOpen(false); navigate('/ayarlar'); }}><Settings size={16}/> Profil ve Ayarlar</button><button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => void signOut()}><LogOut size={16}/> Çıkış Yap</button></div>
          </div>}
        </div>
      </div>
    </header>
  );
}
