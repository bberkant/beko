import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  Search,
  BarChart2,
  ShoppingCart,
  Package,
  Briefcase,
  BookOpen,
  Sliders,
  Lightbulb,
  Cloud,
  TrendingUp,
  FolderOpen,
  Home,
  Settings,
  Users
} from 'lucide-react';
import { navItems } from '../../types/navigation';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../lib/auth';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const getActiveParents = (pathname: string) => {
  const active = new Set<string>();
  navItems.forEach((item) => {
    if (item.children) {
      const isParentMatch = 
        pathname === item.to || 
        pathname.startsWith(`${item.to}/`) ||
        (item.label === 'Ana Kasa' && (pathname === '/ana-kasa' || pathname.startsWith('/ana-kasa')));
      const hasActiveChild = item.children.some(
        (child) => {
          if (child.to === '/arac-yonetimi' || child.to === '/cekler' || child.to === '/kesim-listesi' || child.to === '/ihaleler') {
            return pathname === child.to;
          }
          return pathname === child.to || pathname.startsWith(`${child.to}/`);
        }
      );
      if (isParentMatch || hasActiveChild) {
        active.add(item.label);
      }
    }
  });
  return active;
};

// Denizbank style: circular background colors for icons (soft pastel tones)
const getIconBgColor = (label: string, isActive: boolean) => {
  if (isActive) {
    return 'bg-brand-50 text-brand-600 border border-brand-100';
  }
  
  switch (label) {
    case 'Dashboard':
      return 'bg-blue-50 text-blue-500 border border-blue-100';
    case 'Finans':
      return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
    case 'Muhasebe':
      return 'bg-violet-50 text-violet-600 border border-violet-100';
    case 'E-Faturalar':
      return 'bg-orange-50 text-orange-600 border border-orange-100';
    case 'Çek & Senet İşlemleri':
      return 'bg-emerald-50 text-emerald-500 border border-emerald-100';
    case 'POS':
      return 'bg-cyan-50 text-cyan-500 border border-cyan-100';
    case 'Kredi Kartları':
      return 'bg-purple-50 text-purple-500 border border-purple-100';
    case 'Araç Yönetimi':
      return 'bg-amber-50 text-amber-500 border border-amber-100';
    case 'İhaleler':
      return 'bg-red-50 text-red-500 border border-red-100';
    case 'Kesim Listesi':
      return 'bg-rose-50 text-rose-500 border border-rose-100';
    case 'Çek Vade Hesaplama':
      return 'bg-indigo-50 text-indigo-555 border border-indigo-100';
    case 'POS Fark Hesaplama':
      return 'bg-orange-50 text-orange-500 border border-orange-100';
    case 'Gayrimenkul Listesi':
      return 'bg-teal-50 text-teal-500 border border-teal-100';
    case 'Ana Kasa':
      return 'bg-emerald-50 text-emerald-555 border border-emerald-100';
    case 'Bildirimler':
      return 'bg-yellow-50 text-yellow-555 border border-yellow-100';
    case 'Takvim':
      return 'bg-sky-50 text-sky-500 border border-sky-100';
    case 'Belgeler':
      return 'bg-gray-50 text-gray-500 border border-gray-100';
    case 'AI Asistan':
      return 'bg-violet-50 text-violet-500 border border-violet-100';
    case 'Kullanıcılar':
      return 'bg-pink-50 text-pink-500 border border-pink-100';
    case 'Aktivite Günlüğü':
      return 'bg-slate-50 text-slate-500 border border-slate-100';
    case 'Ayarlar':
      return 'bg-zinc-50 text-zinc-500 border border-zinc-100';
    case 'Dış Muhasebe':
      return 'bg-blue-50 text-blue-600 border border-blue-100';
    case 'Hukuk Departmanı':
    case 'Hukuki İşlemler':
      return 'bg-rose-50 text-rose-600 border border-rose-100';
    case 'Şubelerimiz':
      return 'bg-sky-50 text-sky-500 border border-sky-100';
    default:
      return 'bg-gray-50 text-gray-400 border border-gray-100';
  }
};

const getBulutErpIconStyle = (label: string) => {
  const lower = label.toLowerCase();
  if (lower.includes('dashboard') || lower.includes('pano')) {
    return { bg: 'bg-indigo-500', text: 'text-white' };
  }
  if (lower.includes('çek') || lower.includes('senet') || lower.includes('finans') || lower.includes('kasa') || lower.includes('pos')) {
    return { bg: 'bg-emerald-500', text: 'text-white' };
  }
  if (lower.includes('muhasebe')) {
    return { bg: 'bg-teal-500', text: 'text-white' };
  }
  if (lower.includes('araç') || lower.includes('tasarım')) {
    return { bg: 'bg-blue-500', text: 'text-white' };
  }
  if (lower.includes('ihaleler') || lower.includes('gayrimenkul') || lower.includes('kesim')) {
    return { bg: 'bg-violet-500', text: 'text-white' };
  }
  if (lower.includes('takvim') || lower.includes('bildirim') || lower.includes('belge')) {
    return { bg: 'bg-amber-500', text: 'text-white' };
  }
  if (lower.includes('ayarlar') || lower.includes('kullanıcı') || lower.includes('aktivite')) {
    return { bg: 'bg-slate-500', text: 'text-white' };
  }
  return { bg: 'bg-orange-500', text: 'text-white' };
};

const getBulutErpIconComponent = (label: string, DefaultIcon: any) => {
  const lower = label.toLowerCase();
  if (lower.includes('dashboard') || lower.includes('pano')) return BarChart2;
  if (lower.includes('çek') || lower.includes('senet') || lower.includes('finans') || lower.includes('kasa') || lower.includes('pos')) return DefaultIcon;
  if (lower.includes('muhasebe')) return BookOpen;
  if (lower.includes('araç')) return ShoppingCart;
  if (lower.includes('ihale')) return TrendingUp;
  if (lower.includes('kesim')) return Package;
  if (lower.includes('gayrimenkul')) return Briefcase;
  if (lower.includes('takvim')) return DefaultIcon;
  if (lower.includes('belge')) return Cloud;
  if (lower.includes('asistan')) return Lightbulb;
  if (lower.includes('kullanıcı')) return DefaultIcon;
  if (lower.includes('aktivite') || lower.includes('ayar')) return Sliders;
  return DefaultIcon;
};

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isYonetici = user?.role === 'Admin' || user?.role === 'Süper Admin' || user?.role === 'Developer' || user?.role === 'Yönetici' || user?.role === 'Süper Yönetici' || user?.rawRole === 'admin' || user?.rawRole === 'super_admin' || user?.rawRole === 'developer';
  const isSuper = user?.role === 'Süper Admin' || user?.role === 'Developer' || user?.role === 'Süper Yönetici' || user?.rawRole === 'super_admin' || user?.rawRole === 'developer';
  
  const [sidebarTheme, setSidebarTheme] = useState<'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp'>(() => {
    try {
      return (localStorage.getItem(`sidebar_theme_${user?.email}`) as 'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp') || 'one_dars_v4';
    } catch {
      return 'one_dars_v4';
    }
  });

  const [expanded, setExpanded] = useState<Set<string>>(() => getActiveParents(location.pathname));
  const [customItems, setCustomItems] = useState<typeof navItems>(navItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulutFolderOpen, setBulutFolderOpen] = useState(true);

  // Listen to sidebar theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      try {
        const theme = (localStorage.getItem(`sidebar_theme_${user?.email}`) as 'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp') || 'one_dars_v4';
        setSidebarTheme(theme);
      } catch (e) {
        setSidebarTheme('one_dars_v4');
      }
    };
    window.addEventListener('sidebar-theme-changed', handleThemeChange);
    return () => window.removeEventListener('sidebar-theme-changed', handleThemeChange);
  }, [user?.email]);

  // Load custom menu layout configs
  useEffect(() => {
    const loadConfig = () => {
      if (!user?.email) {
        setCustomItems(navItems);
        return;
      }
      const stored = localStorage.getItem(`sidebar_custom_${user.email}`);
      if (!stored) {
        setCustomItems(navItems);
        return;
      }
      try {
        const config = JSON.parse(stored) as { order: string[]; hidden: string[] };
        
        // Zorunlu sıralama düzeltmesi: Eğer sıralamada Araç Yönetimi, Finans'tan önce geliyorsa otomatik düzelt
        if (config.order && config.order.includes('Araç Yönetimi') && config.order.includes('Finans')) {
          const aracIdx = config.order.indexOf('Araç Yönetimi');
          const finansIdx = config.order.indexOf('Finans');
          if (aracIdx < finansIdx) {
            config.order.splice(finansIdx, 1);
            config.order.splice(aracIdx, 0, 'Finans');
            if (config.order.includes('Muhasebe')) {
              const muhasebeIdx = config.order.indexOf('Muhasebe');
              const newFinansIdx = config.order.indexOf('Finans');
              config.order.splice(muhasebeIdx, 1);
              config.order.splice(newFinansIdx + 1, 0, 'Muhasebe');
            }
            localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
          }
        }

        // Zorunlu sıralama düzeltmesi: Eğer sıralamada İhaleler, Kesim Listesi'nden önce geliyorsa otomatik düzelt
        if (config.order && config.order.includes('İhaleler') && config.order.includes('Kesim Listesi')) {
          const ihalelerIdx = config.order.indexOf('İhaleler');
          const kesimIdx = config.order.indexOf('Kesim Listesi');
          if (ihalelerIdx < kesimIdx) {
            config.order.splice(ihalelerIdx, 1);
            const newKesimIdx = config.order.indexOf('Kesim Listesi');
            config.order.splice(newKesimIdx + 1, 0, 'İhaleler');
            localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
          }
        }
        
        // Otomatik migrasyon: POS menüsü özelleştirilmiş listede yoksa "İhaleler" altına yerleştir
        if (config.order && !config.order.includes('POS')) {
          const ihalelerIdx = config.order.indexOf('İhaleler');
          if (ihalelerIdx !== -1) {
            config.order.splice(ihalelerIdx + 1, 0, 'POS');
          } else {
            config.order.push('POS');
          }
          localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
        }

        // Otomatik migrasyon: Eski "E-Fatura" ismini "E-Faturalar" olarak güncelle
        if (config.order) {
          const eFaturaIdx = config.order.indexOf('E-Fatura');
          if (eFaturaIdx !== -1) {
            config.order[eFaturaIdx] = 'E-Faturalar';
            localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
          }
        }

        // Otomatik migrasyon: Finans menüsü özelleştirilmiş listede yoksa "Araç Yönetimi" üzerine yerleştir
        if (config.order && !config.order.includes('Finans')) {
          const aracIdx = config.order.indexOf('Araç Yönetimi');
          if (aracIdx !== -1) {
            config.order.splice(aracIdx, 0, 'Finans');
          } else {
            config.order.push('Finans');
          }
          localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
        }

        // Otomatik migrasyon: Muhasebe menüsü özelleştirilmiş listede yoksa "Araç Yönetimi" üzerine (Finans'ın hemen altına) yerleştir
        if (config.order && !config.order.includes('Muhasebe')) {
          const aracIdx = config.order.indexOf('Araç Yönetimi');
          if (aracIdx !== -1) {
            config.order.splice(aracIdx, 0, 'Muhasebe');
          } else {
            config.order.push('Muhasebe');
          }
          localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
        }

        // Otomatik migrasyon: Dış Muhasebe menüsü özelleştirilmiş listede yoksa "İhaleler" altına ekle
        if (config.order && !config.order.includes('Dış Muhasebe')) {
          const ihalelerIdx = config.order.indexOf('İhaleler');
          if (ihalelerIdx !== -1) {
            config.order.splice(ihalelerIdx + 1, 0, 'Dış Muhasebe');
          } else {
            config.order.push('Dış Muhasebe');
          }
          localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
        }

        // Otomatik migrasyon: Gayrimenkul Listesi menüsünü "Dış Muhasebe"nin üzerine yerleştir
        if (config.order) {
          const targetIndex = config.order.indexOf('Gayrimenkul Listesi');
          if (targetIndex !== -1) {
            config.order.splice(targetIndex, 1);
          }
          const disMuhasebeIdx = config.order.indexOf('Dış Muhasebe');
          if (disMuhasebeIdx !== -1) {
            config.order.splice(disMuhasebeIdx, 0, 'Gayrimenkul Listesi');
          } else {
            config.order.push('Gayrimenkul Listesi');
          }
          localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
        }

        // Otomatik migrasyon: Şubelerimiz menüsünü "Gayrimenkul Listesi"nin hemen üzerine yerleştir
        if (config.order) {
          const targetIndex = config.order.indexOf('Şubelerimiz');
          if (targetIndex !== -1) {
            config.order.splice(targetIndex, 1);
          }
          const gayrimenkulIdx = config.order.indexOf('Gayrimenkul Listesi');
          if (gayrimenkulIdx !== -1) {
            config.order.splice(gayrimenkulIdx, 0, 'Şubelerimiz');
          } else {
            config.order.push('Şubelerimiz');
          }
          localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
        }

        // Otomatik migrasyon: Hukuk Departmanı menüsünü "Dış Muhasebe"nin altına yerleştir ve eski ismi güncelle
        if (config.order) {
          const oldIndex = config.order.indexOf('Hukuki İşlemler');
          if (oldIndex !== -1) {
            config.order[oldIndex] = 'Hukuk Departmanı';
          }
          const targetIndex = config.order.indexOf('Hukuk Departmanı');
          if (targetIndex !== -1) {
            config.order.splice(targetIndex, 1);
          }
          const disMuhasebeIdx = config.order.indexOf('Dış Muhasebe');
          if (disMuhasebeIdx !== -1) {
            config.order.splice(disMuhasebeIdx + 1, 0, 'Hukuk Departmanı');
          } else {
            config.order.push('Hukuk Departmanı');
          }
          localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
        }

        // Otomatik migrasyon: Ana Kasa menüsünü "Hukuk Departmanı"nın altına yerleştir
        if (config.order && !config.order.includes('Ana Kasa')) {
          const hukukIdx = config.order.indexOf('Hukuk Departmanı');
          if (hukukIdx !== -1) {
            config.order.splice(hukukIdx + 1, 0, 'Ana Kasa');
          } else {
            config.order.push('Ana Kasa');
          }
          localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
        }

        // Ana Kasa daha önce gizlendiyse Developer / Super Admin için otomatik aç
        if (config.hidden && config.hidden.includes('Ana Kasa') && isSuper) {
          config.hidden = config.hidden.filter((h: string) => h !== 'Ana Kasa');
          localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
        }

        // Otomatik migrasyon: Ay Sonu menüsünü "Ana Kasa"nın hemen altına taşı
        if (config.order && isSuper) {
          const anaKasaIdx = config.order.indexOf('Ana Kasa');
          const aySonuIdx = config.order.indexOf('Ay Sonu');
          if (anaKasaIdx !== -1) {
            if (aySonuIdx !== -1) {
              config.order.splice(aySonuIdx, 1);
            }
            const newAnaKasaIdx = config.order.indexOf('Ana Kasa');
            config.order.splice(newAnaKasaIdx + 1, 0, 'Ay Sonu');
            localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
          }
        }

        // Otomatik migrasyon: Raporlama menüsünü "Ana Kasa"nın hemen üzerine taşı
        if (config.order) {
          const raporlamaIdx = config.order.indexOf('Raporlama');
          if (raporlamaIdx !== -1) {
            config.order.splice(raporlamaIdx, 1);
          }
          const anaKasaIdx = config.order.indexOf('Ana Kasa');
          if (anaKasaIdx !== -1) {
            config.order.splice(anaKasaIdx, 0, 'Raporlama');
          } else {
            config.order.push('Raporlama');
          }
          localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(config));
        }

        const itemsMap = new Map(navItems.map(item => [item.label, item]));
        const orderedItems: typeof navItems = [];
        
        config.order.forEach(label => {
          const item = itemsMap.get(label);
          if (item) {
            orderedItems.push(item);
            itemsMap.delete(label);
          }
        });
        
        itemsMap.forEach(item => {
          orderedItems.push(item);
        });

        const hiddenSet = new Set(config.hidden || []);
        const filtered = orderedItems.filter(item => !hiddenSet.has(item.label));
        setCustomItems(filtered);
      } catch (e) {
        setCustomItems(navItems);
      }
    };

    loadConfig();

    window.addEventListener('sidebar-custom-changed', loadConfig);
    return () => {
      window.removeEventListener('sidebar-custom-changed', loadConfig);
    };
  }, [user?.email]);

  useEffect(() => {
    const activeParents = getActiveParents(location.pathname);
    setExpanded(new Set(activeParents));
  }, [location.pathname]);

  const isSearching = searchQuery.trim().length > 0;
  const filteredItems = useMemo(() => {
    const isSuper = user?.role === 'Süper Admin' || user?.role === 'Developer' || user?.role === 'Süper Yönetici' || user?.rawRole === 'super_admin' || user?.rawRole === 'developer';

    const roleFiltered = customItems.map(item => {
      // Sadece Süper Admin ve Developer görebilir
      if (item.to === '/ay-sonu' && !isSuper) return null;
      if ((item.to === '/ana-kasa' || item.to === '/ana-kasa/rapor') && !isSuper && user?.email !== 'admin@dars.local' && user?.email !== 'admin@ets360.local') return null;

      if (!item.children) return item;
      
      const filteredChildren = item.children.filter(child => {
        if (child.to === '/muhasebe/vega-son-islemler' && !isYonetici) return false;
        if (
          (child.to === '/finans/banka-hesaplari' || child.to === '/finans/banka-hesap-hareketleri') && 
          !isSuper
        ) {
          return false;
        }
        return true;
      });
      
      return {
        ...item,
        children: filteredChildren
      };
    }).filter(Boolean) as typeof navItems;

    if (!isSearching) return roleFiltered;
    const query = searchQuery.toLowerCase();
    
    return roleFiltered.map(item => {
      const itemMatches = item.label.toLowerCase().includes(query);
      const matchingChildren = item.children?.filter(child => 
        child.label.toLowerCase().includes(query)
      );

      if (itemMatches || (matchingChildren && matchingChildren.length > 0)) {
        return {
          ...item,
          children: itemMatches ? item.children : matchingChildren
        };
      }
      return null;
    }).filter(Boolean) as typeof navItems;
  }, [customItems, searchQuery, isSearching, user?.role, user?.rawRole, user?.email, isYonetici, isSuper]);

  const asideCls = [
    'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 transition-all duration-300',
    sidebarTheme === 'classic' 
      ? 'bg-white' 
      : sidebarTheme === 'dia_v3' 
        ? 'bg-[#f0f4f8] border-r border-[#d0d8e2]' 
        : sidebarTheme === 'one_dars_v4' 
          ? 'bg-[#002d59] border-r border-[#001f3f]' 
          : sidebarTheme === 'bulut_erp'
            ? 'bg-white border-r border-gray-200'
            : 'bg-[#f4f6fa]',
    collapsed ? 'w-[72px]' : 'w-[230px]',
    'lg:translate-x-0',
    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
  ].join(' ');

  // Common item renderer
  const renderItemLink = (item: typeof navItems[0]) => {
    const Icon = item.icon;
    const hasChildren = Boolean(item.children);
    const isExpanded = isSearching || expanded.has(item.label);
    
    const isChildActive = item.children && item.children.some(
      (child) => child.to === '/arac-yonetimi' || child.to === '/cekler'
        ? location.pathname === child.to
        : location.pathname === child.to || location.pathname.startsWith(`${child.to}/`)
    );
    const isItemActive = location.pathname === item.to || (item.label === 'Ana Kasa' && (location.pathname === '/ana-kasa' || location.pathname.startsWith('/ana-kasa'))) || isChildActive;

    // CLASSIC SADE THEME
    if (sidebarTheme === 'classic') {
      if (hasChildren) {
        return (
          <div key={item.label}>
            <button
              onClick={() => {
                setExpanded((current) => {
                  const next = new Set(current);
                  if (next.has(item.label)) next.delete(item.label);
                  else next.add(item.label);
                  return next;
                });
                navigate(item.to);
                onCloseMobile();
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    size={15}
                    className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </>
              )}
            </button>
            {!collapsed && isExpanded && (
              <div className="mb-1 ml-6 border-l border-gray-100 pl-2">
                {item.children!
                  .filter(child => {
                    if (child.to === '/muhasebe/vega-son-islemler' && !isYonetici) return false;
                    return true;
                  })
                  .map((child) => {
                    const isSubActive = child.to === '/arac-yonetimi' || child.to === '/cekler' || child.to === '/kesim-listesi' || child.to === '/ihaleler' || child.to === '/ayarlar' || child.to === '/ana-kasa'
                      ? location.pathname === child.to
                      : location.pathname === child.to || location.pathname.startsWith(`${child.to}/`);
                    return (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end
                        onClick={onCloseMobile}
                        className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                          isSubActive
                            ? 'bg-brand-50 font-medium text-brand-700'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                        }`}
                      >
                        {child.label}
                      </NavLink>
                    );
                  })}
              </div>
            )}
          </div>
        );
      }

      return (
        <NavLink
          key={item.label}
          to={item.to}
          onClick={onCloseMobile}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : ''}`
          }
        >
          <Icon size={18} className="shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      );
    }

    // ONE DARS V4 THEME
    if (sidebarTheme === 'one_dars_v4') {
      if (hasChildren) {
        return (
          <div key={item.label} className="border-b border-white/5">
            <div
              role="button"
              onClick={() => {
                if (isSearching) return;
                setExpanded((current) => {
                  const next = new Set<string>();
                  if (!current.has(item.label)) {
                    next.add(item.label);
                  }
                  return next;
                });
                navigate(item.to);
                onCloseMobile();
              }}
              style={{ color: '#ffffff' }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-[14px] font-normal cursor-pointer transition-colors ${
                isItemActive
                  ? 'bg-[#004b93] text-white'
                  : 'text-white hover:bg-white/10'
              } ${collapsed ? 'justify-center h-[46px]' : 'h-[46px]'}`}
            >
              <Icon size={17} className="shrink-0 text-white" strokeWidth={2} style={{ color: '#ffffff' }} />
              
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-white" style={{ color: '#ffffff' }}>{item.label}</span>
                  <ChevronDown
                    size={13}
                    strokeWidth={2}
                    style={{ color: '#ffffff' }}
                    className={`text-white transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </>
              )}
            </div>
            
            {/* Expanded Submenu */}
            {!collapsed && isExpanded && (
              <div className="bg-[#002d5c] border-t border-white/5">
                {item.children!
                  .filter(child => {
                    if (child.to === '/muhasebe/vega-son-islemler' && !isYonetici) return false;
                    return true;
                  })
                  .map((child) => {
                    const isSubActive = child.to === '/arac-yonetimi' || child.to === '/cekler' || child.to === '/kesim-listesi' || child.to === '/ihaleler' || child.to === '/ayarlar' || child.to === '/ana-kasa'
                      ? location.pathname === child.to
                      : location.pathname === child.to || location.pathname.startsWith(`${child.to}/`);
                    return (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end
                        onClick={onCloseMobile}
                        style={{ color: '#ffffff' }}
                        className={`block py-2 pl-12 pr-4 text-[13px] font-normal border-b border-white/5 transition-colors ${
                          isSubActive
                            ? 'bg-[#004b93] text-white pl-[48px]'
                            : 'text-white hover:bg-white/08'
                        }`}
                      >
                        {child.label}
                      </NavLink>
                    );
                  })}
              </div>
            )}
          </div>
        );
      }

      return (
        <NavLink
          key={item.label}
          to={item.to}
          onClick={onCloseMobile}
          style={{ color: '#ffffff' }}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-[14px] font-normal border-b border-white/5 transition-all ${
              isActive
                ? 'bg-[#004b93] text-white'
                : 'text-white hover:bg-white/10'
            } ${collapsed ? 'justify-center h-[46px]' : 'h-[46px]'}`
          }
        >
          <Icon size={17} className="shrink-0 text-white" strokeWidth={2} style={{ color: '#ffffff' }} />
          {!collapsed && (
            <span className="flex-1 text-left text-white" style={{ color: '#ffffff' }}>{item.label}</span>
          )}
        </NavLink>
      );
    }

    // BULUT ERP THEME
    if (sidebarTheme === 'bulut_erp') {
      const iconStyle = getBulutErpIconStyle(item.label);
      const BulutIcon = getBulutErpIconComponent(item.label, Icon);

      if (hasChildren) {
        return (
          <div key={item.label} className="border-b border-gray-100 bg-white">
            <button
              onClick={() => {
                if (isSearching) return;
                setExpanded((current) => {
                  const next = new Set<string>();
                  if (current.has(item.label)) next.delete(item.label);
                  else next.add(item.label);
                  return next;
                });
                navigate(item.to);
                onCloseMobile();
              }}
              className={`flex w-full items-center gap-2.5 px-4 py-2 text-[11.5px] font-normal transition-all hover:bg-slate-50 ${
                isItemActive ? 'text-gray-900 bg-slate-50 font-medium' : 'text-gray-600'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 ${iconStyle.bg} ${iconStyle.text} border border-gray-100 shadow-sm`}>
                <BulutIcon size={11} strokeWidth={2.5} />
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    size={11}
                    className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </>
              )}
            </button>
            {!collapsed && isExpanded && (
              <div className="bg-slate-50/40 py-0.5 border-t border-gray-100">
                {item.children!
                  .filter(child => {
                    if (child.to === '/muhasebe/vega-son-islemler' && !isYonetici) return false;
                    return true;
                  })
                  .map((child) => {
                    const isSubActive = child.to === '/arac-yonetimi' || child.to === '/cekler' || child.to === '/kesim-listesi' || child.to === '/ihaleler' || child.to === '/ayarlar' || child.to === '/ana-kasa'
                      ? location.pathname === child.to
                      : location.pathname === child.to || location.pathname.startsWith(`${child.to}/`);
                    return (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end
                        onClick={onCloseMobile}
                        className={`flex items-center gap-2 py-1.5 pl-11 pr-4 text-[11px] font-normal transition-colors border-b border-gray-50/50 ${
                          isSubActive
                            ? 'bg-slate-100 text-[#f37021] font-semibold'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'
                        }`}
                      >
                        {child.label}
                      </NavLink>
                    );
                  })}
              </div>
            )}
          </div>
        );
      }

      return (
        <NavLink
          key={item.label}
          to={item.to}
          onClick={onCloseMobile}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-4 py-2 text-[11.5px] font-normal border-b border-gray-100 transition-all ${
              isActive
                ? 'bg-slate-100/70 text-[#f37021] font-medium'
                : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'
            } ${collapsed ? 'justify-center h-[40px]' : 'h-[40px]'}`
          }
        >
          <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 ${iconStyle.bg} ${iconStyle.text} border border-gray-100 shadow-sm`}>
            <BulutIcon size={11} strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <span className="flex-1 text-left">{item.label}</span>
          )}
        </NavLink>
      );
    }

    // BANKING DENIZBANK THEME
    const iconBg = getIconBgColor(item.label, !!isItemActive);

    if (hasChildren) {
      return (
        <div key={item.label} className="border-b border-gray-150">
          <button
            onClick={() => {
              if (isSearching) return;
              setExpanded((current) => {
                const next = new Set<string>();
                if (!current.has(item.label)) {
                  next.add(item.label);
                }
                return next;
              });
              navigate(item.to);
              onCloseMobile();
            }}
            className={`flex w-full items-center gap-3 px-4 py-2.5 text-[12.5px] font-medium text-gray-750 hover:bg-slate-50 transition-colors ${
              isItemActive ? 'bg-[#ebf0f5]/60 text-brand-700 font-semibold' : 'bg-white'
            } ${collapsed ? 'justify-center h-[46px]' : 'h-[46px]'}`}
          >
            {/* Circle Icon wrapper */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${iconBg}`}>
              <Icon size={14} strokeWidth={1.6} />
            </div>
            
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  size={12}
                  strokeWidth={1.5}
                  className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>
          
          {/* Expanded Submenu */}
          {!collapsed && isExpanded && (
            <div className="bg-[#f8fafc] border-t border-slate-100">
              {item.children!
                .filter(child => {
                  if (child.to === '/muhasebe/vega-son-islemler' && !isYonetici) return false;
                  return true;
                })
                .map((child) => {
                  const isSubActive = child.to === '/arac-yonetimi' || child.to === '/cekler' || child.to === '/kesim-listesi' || child.to === '/ihaleler' || child.to === '/ayarlar' || child.to === '/ana-kasa'
                    ? location.pathname === child.to
                    : location.pathname === child.to || location.pathname.startsWith(`${child.to}/`);
                  return (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end
                      onClick={onCloseMobile}
                      className={`block py-2 pl-12 pr-4 text-[12px] font-normal border-b border-slate-100/50 transition-colors ${
                        isSubActive
                          ? 'bg-blue-50/20 text-brand-600 font-semibold border-l-2 border-brand-500 pl-[46px]'
                          : 'text-gray-500 hover:bg-slate-100 hover:text-gray-800'
                      }`}
                    >
                      {child.label}
                    </NavLink>
                  );
                })}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.label}
        to={item.to}
        onClick={onCloseMobile}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2.5 text-[12.5px] font-medium border-b border-gray-150 transition-all ${
            isActive
              ? 'bg-[#ebf0f5] text-brand-700 font-semibold'
              : 'bg-white text-gray-700 hover:bg-slate-50'
          } ${collapsed ? 'justify-center h-[46px]' : 'h-[46px]'}`
        }
      >
        {/* Circle Icon wrapper */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${iconBg}`}>
          <Icon size={14} strokeWidth={1.6} />
        </div>
        
        {!collapsed && (
          <span className="flex-1 text-left">{item.label}</span>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <style>{`
        .sidebar-nav-container::-webkit-scrollbar {
          width: 0px !important;
          height: 0px !important;
          background: transparent !important;
        }
        .sidebar-nav-container {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
      `}</style>
      <aside className={asideCls}>
        
        {/* Logo / Profile Section */}
        {sidebarTheme === 'bulut_erp' ? (
          <div className="border-b border-gray-200 bg-white">
            {/* User Profile Card */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <div className="w-9 h-9 rounded-full bg-[#1e293b] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm border border-gray-200">
                <Users size={15} />
              </div>
              {!collapsed && (
                <div className="flex flex-col select-none">
                  <span className="text-[12px] font-bold text-gray-800 tracking-tight">LOGO YAZILIM</span>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 leading-none">{user?.name || 'Berkant'} · {user?.role || 'Developer'}</span>
                </div>
              )}
            </div>

            {/* Workspace Selector */}
            <div className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <Home size={13} className="text-gray-400 shrink-0" />
                {!collapsed && <span className="text-[11px] font-bold text-gray-600">BULUT ERP</span>}
              </div>
              {!collapsed && <ChevronDown size={11} className="text-gray-400" />}
            </div>

            {/* Action Buttons Row */}
            {!collapsed && (
              <div className="flex items-center justify-between px-4 py-1.5 border-t border-b border-gray-100 bg-slate-50/50">
                <div className="flex gap-1">
                  <button className="w-5 h-5 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors text-[9px] font-bold">1</button>
                  <button className="w-5 h-5 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors text-[9px] font-bold">2</button>
                  <button className="w-5 h-5 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors text-[9px] font-bold">3</button>
                  <button className="w-5 h-5 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors text-[9px] font-bold">4</button>
                </div>
                <button className="w-5 h-5 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors">
                  <Settings size={11} />
                </button>
              </div>
            )}

            {/* Desktop / Edit Row */}
            {!collapsed && (
              <div className="flex items-center justify-between px-4 py-1.5 bg-white">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Masaüstü</span>
                <button className="text-[10px] font-bold text-blue-600 hover:underline">Düzenle</button>
              </div>
            )}
          </div>
        ) : (
          <div className={`flex h-16 items-center ${
            sidebarTheme === 'one_dars_v4' 
              ? 'bg-[#002d59] border-b border-[#001f3f]' 
              : sidebarTheme === 'classic' 
                ? 'bg-white border-b border-gray-100' 
                : 'bg-white border-b border-gray-150'
          } ${collapsed ? 'justify-center' : 'px-4'}`}>
            <Logo collapsed={collapsed} />
          </div>
        )}

        {/* Real-time search bar right under Logo (Show in all themes except bulut_erp or when collapsed) */}
        {!collapsed && sidebarTheme !== 'bulut_erp' && (
          <div className={`px-3.5 py-2.5 border-b transition-colors ${
            sidebarTheme === 'one_dars_v4' 
              ? 'bg-transparent border-[#001f3f]/40' 
              : sidebarTheme === 'classic' 
                ? 'bg-white border-gray-100' 
                : 'bg-white border-gray-150'
          }`}>
            <div className={`relative flex items-center rounded px-3 py-1.5 border transition-all h-[34px] ${
              sidebarTheme === 'one_dars_v4'
                ? 'bg-white/5 border-white/10 focus-within:bg-white/10 focus-within:border-white/20'
                : 'bg-[#ebeff3] border-transparent focus-within:border-gray-300 focus-within:bg-white'
            }`}>
              <input
                type="text"
                placeholder="Ara..."
                className={`w-full bg-transparent border-none p-0 text-[11.5px] focus:ring-0 focus:outline-none font-medium pr-6 ${
                  sidebarTheme === 'one_dars_v4'
                    ? 'text-white placeholder-white/40'
                    : 'text-gray-700 placeholder-gray-450'
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={13} strokeWidth={2} className={`absolute right-3 shrink-0 ${
                sidebarTheme === 'one_dars_v4' ? 'text-white/40' : 'text-gray-400'
              }`} />
            </div>
          </div>
        )}

        {/* Sidebar Nav Items List */}
        <nav className={`flex-1 overflow-y-auto sidebar-nav-container ${
          sidebarTheme === 'classic' 
            ? 'pt-1.5 pb-3' 
            : sidebarTheme === 'one_dars_v4' 
              ? 'pt-1.5 pb-2 bg-[#002d59]' 
              : sidebarTheme === 'bulut_erp'
                ? 'pt-1.5 pb-2 bg-white'
                : ''
        }`}>
          {sidebarTheme === 'bulut_erp' ? (
            <div>
              {/* Parent Bulut ERP Folder Toggle */}
              <button 
                className="flex w-full items-center justify-between px-4 py-2.5 text-[11.5px] font-bold text-gray-700 hover:bg-slate-50 border-b border-gray-100 transition-colors"
                onClick={() => setBulutFolderOpen(!bulutFolderOpen)}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={13} className="text-gray-400 shrink-0" />
                  <span>Bulut ERP</span>
                </div>
                <ChevronDown size={11} className={`text-gray-400 transition-transform ${bulutFolderOpen ? '' : '-rotate-90'}`} />
              </button>

              {/* Folder Content */}
              {bulutFolderOpen && (
                <div className="pl-2">
                  {filteredItems.filter((item) => {
                    if (item.to === '/kullanicilar' && !isYonetici) return false;
                    if (item.to === '/ana-kasa' && !isSuper && user?.email !== 'admin@dars.local' && user?.email !== 'admin@ets360.local') return false;
                    if (item.to === '/aktivite-gunlugu' && !isYonetici && !isSuper && user?.email !== 'admin@dars.local' && user?.email !== 'admin@ets360.local') return false;
                    return true;
                  }).map((item) => renderItemLink(item))}
                </div>
              )}
            </div>
          ) : (
            filteredItems.filter((item) => {
              if (item.to === '/kullanicilar' && !isYonetici) return false;
              if (item.to === '/ana-kasa' && !isSuper && user?.email !== 'admin@dars.local' && user?.email !== 'admin@ets360.local') return false;
              if (item.to === '/aktivite-gunlugu' && !isYonetici && !isSuper && user?.email !== 'admin@dars.local' && user?.email !== 'admin@ets360.local') return false;
              return true;
            }).map((item) => renderItemLink(item))
          )}
        </nav>
      </aside>
    </>
  );
}
