import React, { useState, useEffect, useCallback } from 'react';
import { WhatsAppChat, WhatsAppMessage, GatewaySession } from '../types';
import { WhatsAppChatList } from './WhatsAppChatList';
import { WhatsAppChatArea } from './WhatsAppChatArea';
import { WhatsAppWebLanding } from './WhatsAppWebLanding';
import { DeviceConnectionModal } from './DeviceConnectionModal';
import { 
  fetchWhatsAppChats, 
  fetchWhatsAppMessages, 
  markChatAsRead,
  getGatewaySession 
} from '../services/whatsappService';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

export const WhatsAppMessenger: React.FC = () => {
  const { user } = useAuth();
  const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';

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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[580px]">
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
            />
          ) : (
            <WhatsAppWebLanding
              session={session}
              onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
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
    </div>
  );
};
