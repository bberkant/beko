import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Smartphone, 
  RefreshCw, 
  Sparkles, 
  ListTodo, 
  Settings2, 
  Building2, 
  Inbox
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { IncomingMediaFeed } from './components/IncomingMediaFeed';
import { TaskBoard } from './components/TaskBoard';
import { GroupRoutingSettings } from './components/GroupRoutingSettings';
import { DeviceConnectionModal } from './components/DeviceConnectionModal';

export const WhatsAppOperasyonPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'media' | 'tasks' | 'settings'>('media');
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [pendingMediaCount, setPendingMediaCount] = useState(0);
  const [openTasksCount, setOpenTasksCount] = useState(0);
  const [activeRulesCount, setActiveRulesCount] = useState(5);

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
    } catch (err) {
      console.error('WhatsApp stats yükleme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <MessageSquare size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Operasyon Masası</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Şirket içi gruplardan gelen fiş, fatura ve talimatların ERP&apos;ye tek tıkla aktarım ve görev masası.
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Live Device Status Pill */}
          <button
            onClick={() => setIsDeviceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Gateway: Canlı Bağlı</span>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setActiveTab('media')}
          className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between cursor-pointer hover:border-amber-300 transition"
        >
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">İşlem Bekleyen Fişler</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{pendingMediaCount} Adet</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Sanayi, yakıt, kasa fişleri</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Inbox size={24} />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('tasks')}
          className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between cursor-pointer hover:border-blue-300 transition"
        >
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Açık Grup Görevleri</div>
            <div className="text-2xl font-extrabold text-blue-600 mt-1">{openTasksCount} Görev</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Sevkiyat & operasyon işleri</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ListTodo size={24} />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('settings')}
          className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between cursor-pointer hover:border-emerald-300 transition"
        >
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">İzlenen WhatsApp Grubu</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{activeRulesCount} Grup</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Mezbaha, Lojistik, Şubeler</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Building2 size={24} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Otomasyon & OCR</div>
            <div className="text-2xl font-extrabold text-purple-600 mt-1">%100</div>
            <div className="text-[11px] text-purple-700 font-medium mt-0.5">Plaka ve tutar ayrıştırıcı aktif</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles size={24} />
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-2 rounded-xl shadow-2xs">
        <button
          onClick={() => setActiveTab('media')}
          className={`px-5 py-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'media'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Inbox size={16} />
          <span>Gelen Fiş & Belge Havuzu</span>
          {pendingMediaCount > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5">
              {pendingMediaCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-5 py-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <ListTodo size={16} />
          <span>Grup Görevleri & İş Emirleri</span>
          {openTasksCount > 0 && (
            <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5">
              {openTasksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Settings2 size={16} />
          <span>Grup & Modül Eşleştirmeleri</span>
        </button>
      </div>

      {/* Tab Content */}
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
