import React, { useState, useEffect, useCallback } from 'react';
import { WhatsAppChat, WhatsAppMessage, GatewaySession } from '../types';
import { WhatsAppChatList } from './WhatsAppChatList';
import { WhatsAppChatArea } from './WhatsAppChatArea';
import { WhatsAppWebLanding } from './WhatsAppWebLanding';
import { DeviceConnectionModal } from './DeviceConnectionModal';
import { WallpaperSettingsModal } from './WallpaperSettingsModal';
import { 
  WallpaperConfig, 
  DEFAULT_WALLPAPER_CONFIG 
} from '../services/wallpaperPresets';
import { 
  fetchWhatsAppChats, 
  fetchWhatsAppMessages, 
  markChatAsRead, 
  getGatewaySession 
} from '../services/whatsappService';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface WhatsAppMessengerProps {
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const WhatsAppMessenger: React.FC<WhatsAppMessengerProps> = ({
  theme: propTheme,
  onToggleTheme: propToggleTheme
}) => {
  const { user } = useAuth();
  const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';

  const [internalTheme, setInternalTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem(`whatsapp_theme_${user?.email || 'default'}`) as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  // Wallpaper settings state
  const [wallpaperConfig, setWallpaperConfig] = useState<WallpaperConfig>(() => {
    try {
      const stored = localStorage.getItem(`whatsapp_wallpaper_${user?.email || 'default'}`);
      if (stored) {
        return JSON.parse(stored) as WallpaperConfig;
      }
      return DEFAULT_WALLPAPER_CONFIG;
    } catch {
      return DEFAULT_WALLPAPER_CONFIG;
    }
  });

  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);

  const handleSaveWallpaper = (newConfig: WallpaperConfig) => {
    setWallpaperConfig(newConfig);
    try {
      localStorage.setItem(`whatsapp_wallpaper_${user?.email || 'default'}`, JSON.stringify(newConfig));
    } catch (e) {
      console.error(e);
    }
  };

  const theme = propTheme || internalTheme;
  const isDark = theme === 'dark';

  const handleToggleTheme = () => {
    if (propToggleTheme) {
      propToggleTheme();
      return;
    }
    const next = internalTheme === 'dark' ? 'light' : 'dark';
    setInternalTheme(next);
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
        setInternalTheme(stored);
      } catch (e) {}
    };
    window.addEventListener('whatsapp-theme-changed', handleEvent);
    return () => window.removeEventListener('whatsapp-theme-changed', handleEvent);
  }, [user?.email]);

  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [activeChat, setActiveChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [session, setSession] = useState<GatewaySession | null>(null);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load chats & gateway session
  const loadChats = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [chatData, sessionData] = await Promise.all([
        fetchWhatsAppChats(orgId),
        getGatewaySession(orgId)
      ]);
      setChats(chatData);
      setSession(sessionData);

      // Auto select first chat if none selected on desktop
      if (!activeChat && chatData.length > 0 && window.innerWidth >= 768) {
        setActiveChat(chatData[0]);
      }
    } catch (err) {
      console.error('Sohbetler yüklenemedi:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [orgId, activeChat]);

  // Load messages for active chat
  const loadMessages = useCallback(async () => {
    if (!activeChat) return;
    try {
      const msgData = await fetchWhatsAppMessages(activeChat.id, orgId);
      setMessages(msgData);
      await markChatAsRead(activeChat.id, orgId);
    } catch (err) {
      console.error('Mesajlar yüklenemedi:', err);
    }
  }, [activeChat, orgId]);

  useEffect(() => {
    loadChats();
  }, [orgId]);

  useEffect(() => {
    loadMessages();
  }, [activeChat?.id, loadMessages]);

  // Real-time Supabase subscription for incoming messages
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp_messenger_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload: any) => {
          const newMsg = payload.new as WhatsAppMessage;
          if (activeChat && newMsg.chat_id === activeChat.id) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          // Refresh chats to update last message snippet & time
          loadChats();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_gateway_sessions' },
        (payload: any) => {
          if (payload.new) {
            setSession(payload.new as GatewaySession);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat?.id, loadChats]);

  const handleSelectChat = (chat: WhatsAppChat) => {
    setActiveChat(chat);
  };

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[580px] transition-colors ${
      isDark
        ? 'bg-[#111b21] border-[#222e35] text-[#e9edef]'
        : 'bg-white border-gray-200 text-gray-900'
    }`}>
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Chat List (Hidden on mobile if chat is active) */}
        <div className={`w-full md:w-80 lg:w-96 flex flex-col shrink-0 ${
          activeChat ? 'hidden md:flex' : 'flex'
        }`}>
          <WhatsAppChatList
            chats={chats}
            activeChatId={activeChat?.id || null}
            onSelectChat={handleSelectChat}
            session={session}
            onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
            onRefresh={loadChats}
            isRefreshing={isRefreshing}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenWallpaperModal={() => setIsWallpaperModalOpen(true)}
          />
        </div>

        {/* Right Column: Chat Window or Welcome Landing */}
        <div className={`flex-1 flex flex-col min-w-0 ${
          !activeChat ? 'hidden md:flex' : 'flex'
        }`}>
          {activeChat ? (
            <WhatsAppChatArea
              chat={activeChat}
              messages={messages}
              onBack={() => setActiveChat(null)}
              onRefreshMessages={loadMessages}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              wallpaperConfig={wallpaperConfig}
              onOpenWallpaperModal={() => setIsWallpaperModalOpen(true)}
            />
          ) : (
            <WhatsAppWebLanding
              session={session}
              onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
              theme={theme}
            />
          )}
        </div>
      </div>

      {/* Device Connection Modal */}
      <DeviceConnectionModal
        open={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        groupsCount={chats.filter(c => c.is_group).length || 5}
      />

      {/* Wallpaper Settings & Customization Modal */}
      <WallpaperSettingsModal
        open={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        config={wallpaperConfig}
        onSaveConfig={handleSaveWallpaper}
        theme={theme}
      />
    </div>
  );
};
