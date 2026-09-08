import { useAuth } from '../../lib/auth';
import { useState, useEffect } from 'react';

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useAuth();
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

  if (sidebarTheme === 'bulut_erp') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#f37021] text-white font-extrabold text-[15px] select-none shadow-sm">
          L
        </div>
        {!collapsed && (
          <div className="flex flex-col select-none">
            <span className="text-sm font-black tracking-tight text-white" style={{ fontFamily: "'Roboto', sans-serif" }}>DARS BULUT</span>
            <span className="text-[9px] font-medium tracking-tighter text-gray-400 mt-1 leading-none whitespace-nowrap" style={{ fontFamily: "'Roboto', sans-serif" }}>
              Data Analysis & Reporting
            </span>
          </div>
        )}
      </div>
    );
  }

  if (sidebarTheme === 'one_dars_v4') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#004b93] select-none">
          <div className="h-[18px] w-[6px] bg-white rounded-[1px]" />
        </div>
        {!collapsed && (
          <div className="flex flex-col select-none">
            <div className="flex items-baseline leading-none">
              <span className="text-base font-extrabold tracking-tight text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>DARS</span>
            </div>
            <span className="text-[9.5px] font-normal tracking-tighter text-white mt-1 leading-none whitespace-nowrap" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Data Analysis and Reporting System
            </span>
          </div>
        )}
      </div>
    );
  }

  if (sidebarTheme === 'dia_v3') {
    return (
      <div className="flex items-center gap-2.5">
        <div className="flex flex-col h-[38px] w-[42px] shrink-0 overflow-hidden bg-[#003b73] rounded-tl-[16px] rounded-tr-[4px] rounded-bl-[4px] rounded-br-[4px] relative">
          <div className="flex-1 flex items-center justify-center text-white font-black text-[14px] select-none lowercase tracking-tighter" style={{ fontFamily: "'Century Gothic', 'Outfit', sans-serif" }}>
            dars
          </div>
          <div className="h-[3px] bg-[#f37021] w-full" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-[13px] font-extrabold tracking-tight text-gray-800 leading-none uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>DARS V3</span>
            <span className="text-[8px] text-[#f37021] font-bold mt-1 leading-none uppercase">Data Analysis and Reporting System</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600">
        <div className="h-[18px] w-[6px] bg-white" />
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-gray-900 leading-none">DARS</span>
          <span className="text-[10px] text-gray-500 font-medium mt-1 leading-none">Data Analysis & Reporting System</span>
        </div>
      )}
    </div>
  );
}
