import { Menu, PanelLeft, Bell, Search } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface TopbarProps {
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

export function Topbar({ onToggleSidebar, onOpenMobileSidebar }: TopbarProps) {
  const { user } = useAuth();

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
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {user?.name?.[0] ?? 'D'}
          </div>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-medium text-gray-900">{user?.name ?? 'Demo'}</span>
            <span className="text-xs text-gray-500">{user?.role ?? 'Yönetici'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
