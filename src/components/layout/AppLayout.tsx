import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const COLLAPSE_KEY = 'ops360_sidebar_collapsed';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={[
          'flex min-h-screen flex-col transition-[padding] duration-300',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]',
        ].join(' ')}
      >
        <Topbar
          onToggleSidebar={toggleSidebar}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
