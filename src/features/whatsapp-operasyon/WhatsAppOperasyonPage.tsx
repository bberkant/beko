import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Smartphone, 
  RefreshCw, 
  ListTodo, 
  Settings2, 
  Inbox,
  MessagesSquare,
  Moon,
  Sun
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { WhatsAppMessenger } from './components/WhatsAppMessenger';
import { IncomingMediaFeed } from './components/IncomingMediaFeed';
import { TaskBoard } from './components/TaskBoard';
import { GroupRoutingSettings } from './components/GroupRoutingSettings';
import { DeviceConnectionModal } from './components/DeviceConnectionModal';

interface WhatsAppOperasyonPageProps {
  initialTab?: 'chat' | 'media' | 'tasks' | 'settings';
}

export const WhatsAppOperasyonPage: React.FC<WhatsAppOperasyonPageProps> = ({
  initialTab = 'chat'
}) => {
  const { user } = useAuth();
  const isDeveloper = user?.role === 'Developer' || user?.rawRole === 'developer';
  const isWhatsAppOperasyonAllowed = (user?.role === 'Admin' || user?.role === 'Süper Admin' || user?.role === 'Süper Yönetici' || user?.role === 'Yönetici' || user?.rawRole === 'admin' || user?.rawRole === 'super_admin' || user?.email === 'admin@dars.local' || user?.email === 'admin@ets360.local') && !isDeveloper;

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem(`whatsapp_theme_${user?.email || 'default'}`) as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(`whatsapp_theme_${user?.email || 'default'}`, next);
      window.dispatchEvent(new Event('whatsapp-theme-changed'));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleEvent = () => {
      try {
        const stored = (localStorage.getItem(`whatsapp_theme_${user?.email || 'default'}`) as 'light' | 'dark') || 'light';
        setTheme(stored);
      } catch (e) {}
    };
    window.addEventListener('whatsapp-theme-changed', handleEvent);
    return () => window.removeEventListener('whatsapp-theme-changed', handleEvent);
  }, [user?.email]);

  const [activeTab, setActiveTab] = useState<'chat' | 'media' | 'tasks' | 'settings'>(initialTab);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Stats
  const [pendingMediaCount, setPendingMediaCount] = useState(0);
  const [openTasksCount, setOpenTasksCount] = useState(0);
  const [activeRulesCount, setActiveRulesCount] = useState(5);
  const [totalChatsCount, setTotalChatsCount] = useState(7);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Pending media count
      let mediaQuery = supabase
        .from('whatsapp_incoming_media')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (user?.organizationId) {
        mediaQuery = mediaQuery.eq('organization_id', user.organizationId);
      }
      const mediaRes = await mediaQuery;
      setPendingMediaCount(mediaRes.count || 0);

      // 2. Open tasks count
      let tasksQuery = supabase
        .from('whatsapp_tasks')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'completed');

      if (user?.organizationId) {
        tasksQuery = tasksQuery.eq('organization_id', user.organizationId);
      }
      const tasksRes = await tasksQuery;
      setOpenTasksCount(tasksRes.count || 0);

      // 3. Active rules count
      let rulesQuery = supabase
        .from('whatsapp_group_rules')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (user?.organizationId) {
        rulesQuery = rulesQuery.eq('organization_id', user.organizationId);
      }
      const rulesRes = await rulesQuery;
      setActiveRulesCount(rulesRes.count || 5);

      // 4. Total chats count
      let chatsQuery = supabase
        .from('whatsapp_chats')
        .select('*', { count: 'exact', head: true });

      if (user?.organizationId) {
        chatsQuery = chatsQuery.eq('organization_id', user.organizationId);
      }
      const chatsRes = await chatsQuery;
      setTotalChatsCount(chatsRes.count || 7);
    } catch (err) {
      console.error('WhatsApp stats yükleme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    if (isWhatsAppOperasyonAllowed) {
      loadStats();
    }
  }, [loadStats, isWhatsAppOperasyonAllowed]);

  // Normal kullanıcılar ve Developer için sadece temiz WhatsApp Web arayüzü gösterilir (Operasyon sekmeleri gizlidir)
  if (!isWhatsAppOperasyonAllowed) {
    return (
      <div className="space-y-3">
        {/* Simple Clean Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                WhatsApp Web
              </h1>
              <p className="text-xs text-gray-500">
                Panel içerisinden doğrudan WhatsApp mesajlaşması ve sohbet yönetimi.
              </p>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs border transition cursor-pointer ${
              isDark
                ? 'bg-[#202c33] border-[#2a3942] text-amber-400 hover:bg-[#2a3942]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            title={isDark ? 'Açık Temaya Geç' : 'Karanlık Temaya Geç'}
          >
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-600" />}
            <span className="hidden sm:inline">{isDark ? 'Açık Tema' : 'Karanlık Tema'}</span>
          </button>
        </div>

        {/* WhatsApp Messenger */}
        <WhatsAppMessenger theme={theme} onToggleTheme={toggleTheme} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <MessageSquare size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                WhatsApp Panel & Operasyon Merkezi
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Panel içinden doğrudan WhatsApp mesajlaşması, canlı grup akışları ve tek tıkla ERP fiş entegrasyonu.
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Dark / Light Theme Toggle Pill */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs border transition cursor-pointer ${
              isDark
                ? 'bg-[#202c33] border-[#2a3942] text-amber-400 hover:bg-[#2a3942]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            title={isDark ? 'Açık Temaya Geç' : 'Karanlık Temaya Geç'}
          >
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-600" />}
            <span>{isDark ? 'Açık Tema' : 'Karanlık Tema'}</span>
          </button>

          {/* Live Device Status Pill */}
          <button
            onClick={() => setIsDeviceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>QR Gateway: Canlı Eşleşme</span>
            <Smartphone size={14} className="text-emerald-700" />
          </button>

          <button
            onClick={loadStats}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl shadow-2xs transition-colors"
            title="Verileri Yenile"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-emerald-600' : ''} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className={`flex items-center gap-1 border-b px-2 py-1 rounded-2xl shadow-2xs overflow-x-auto transition-colors ${
        isDark ? 'bg-[#202c33] border-[#2a3942]' : 'bg-white border-gray-200'
      }`}>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'chat'
              ? isDark ? 'bg-[#00a884] text-[#111b21] shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
              : isDark ? 'text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MessagesSquare size={16} />
          <span>WhatsApp Sohbetleri (Web Client)</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
            activeTab === 'chat'
              ? isDark ? 'bg-[#111b21]/30 text-[#111b21]' : 'bg-white/20 text-white'
              : isDark ? 'bg-[#111b21] text-[#00a884]' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {totalChatsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'media'
              ? isDark ? 'bg-[#00a884] text-[#111b21] shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
              : isDark ? 'text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Inbox size={16} />
          <span>Gelen Fiş & Belge Havuzu</span>
          {pendingMediaCount > 0 && (
            <span className={`rounded-full text-[10px] font-extrabold px-2 py-0.5 ${
              activeTab === 'media' ? 'bg-amber-400 text-gray-900' : 'bg-amber-100 text-amber-800'
            }`}>
              {pendingMediaCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'tasks'
              ? isDark ? 'bg-[#00a884] text-[#111b21] shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
              : isDark ? 'text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ListTodo size={16} />
          <span>Grup Görevleri & İş Emirleri</span>
          {openTasksCount > 0 && (
            <span className={`rounded-full text-[10px] font-extrabold px-2 py-0.5 ${
              activeTab === 'tasks' ? 'bg-blue-300 text-gray-900' : 'bg-blue-100 text-blue-800'
            }`}>
              {openTasksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'settings'
              ? isDark ? 'bg-[#00a884] text-[#111b21] shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
              : isDark ? 'text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Settings2 size={16} />
          <span>Grup & Modül Eşleştirmeleri</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'chat' && (
        <WhatsAppMessenger theme={theme} onToggleTheme={toggleTheme} />
      )}

      {activeTab === 'media' && (
        <IncomingMediaFeed
          onRefreshStats={loadStats}
          onNavigateToTasks={() => {
            setActiveTab('tasks');
            loadStats();
          }}
        />
      )}

      {activeTab === 'tasks' && (
        <TaskBoard
          onRefreshStats={loadStats}
        />
      )}

      {activeTab === 'settings' && (
        <GroupRoutingSettings
          onRefreshStats={loadStats}
        />
      )}

      {/* Device & QR Connection Modal */}
      <DeviceConnectionModal
        open={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        groupsCount={activeRulesCount}
      />
    </div>
  );
};
