import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { navItems } from '../../types/navigation';
import { Logo } from '../ui/Logo';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const [expanded, setExpanded] = useState<string | null>('Finans');

  const asideCls = [
    'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-white transition-all duration-300',
    collapsed ? 'w-[72px]' : 'w-[240px]',
    'lg:translate-x-0',
    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
  ].join(' ');

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside className={asideCls}>
        <div className={`flex h-16 items-center border-b border-gray-100 ${collapsed ? 'justify-center' : 'px-4'}`}>
          <Logo collapsed={collapsed} />
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = Boolean(item.children);
            const isExpanded = expanded === item.label;

            if (hasChildren) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.label)}
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
                      {item.children!.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            `block rounded-md px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-brand-50 font-medium text-brand-700'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                            }`
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.to}
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
          })}
        </nav>
      </aside>
    </>
  );
}
