import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Users, 
  Pin, 
  Smartphone, 
  RefreshCw
} from 'lucide-react';
import { WhatsAppChat, GatewaySession } from '../types';

interface WhatsAppChatListProps {
  chats: WhatsAppChat[];
  activeChatId: string | null;
  onSelectChat: (chat: WhatsAppChat) => void;
  session: GatewaySession | null;
  onOpenDeviceModal: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const WhatsAppChatList: React.FC<WhatsAppChatListProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  session,
  onOpenDeviceModal,
  onRefresh,
  isRefreshing = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups' | 'direct'>('all');

  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      // Search
      const matchesSearch = 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.phone_number && chat.phone_number.includes(searchQuery)) ||
        (chat.last_message_text && chat.last_message_text.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter tabs
      if (activeFilter === 'unread') return chat.unread_count > 0;
      if (activeFilter === 'groups') return chat.is_group;
      if (activeFilter === 'direct') return !chat.is_group;

      return true;
    });
  }, [chats, searchQuery, activeFilter]);

  const isConnected = session?.status === 'connected';

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  };

  const getChatAvatarBg = (name: string, isGroup: boolean) => {
    if (isGroup) {
      if (name.includes('Sanayi')) return 'bg-emerald-600 text-white';
      if (name.includes('Şoför') || name.includes('Lojistik')) return 'bg-blue-600 text-white';
      if (name.includes('Mezbaha') || name.includes('Kesim')) return 'bg-rose-600 text-white';
      if (name.includes('Şube') || name.includes('Satış')) return 'bg-amber-600 text-white';
      if (name.includes('Finans') || name.includes('Çek')) return 'bg-purple-600 text-white';
      return 'bg-teal-600 text-white';
    }
    return 'bg-gray-700 text-white';
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Top Header Bar */}
      <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              BE
            </div>
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
              isConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-900 leading-tight">Beko WhatsApp Web</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] font-semibold ${
                isConnected ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {isConnected ? 'Bağlantı Canlı' : 'QR Eşleşme Bekleniyor'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenDeviceModal}
            className={`p-2 rounded-xl text-xs transition active:scale-95 flex items-center gap-1.5 font-bold ${
              isConnected
                ? 'bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200/80'
                : 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse'
            }`}
            title="Cihaz & QR Bağlantı Ayarları"
          >
            <Smartphone size={14} />
            <span className="text-[11px] hidden sm:inline">
              {isConnected ? 'Bağlı' : 'QR Bağla'}
            </span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-200/60 transition active:scale-95"
            title="Sohbetleri Yenile"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-emerald-600' : ''} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-100 bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="Sohbet veya kişi ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50/80 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition shadow-2xs"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto text-[11px] font-semibold">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg transition shrink-0 ${
              activeFilter === 'all'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-3 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
              activeFilter === 'unread'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Okunmamış</span>
            {chats.filter(c => c.unread_count > 0).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">
                {chats.filter(c => c.unread_count > 0).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('groups')}
            className={`px-3 py-1 rounded-lg transition shrink-0 ${
              activeFilter === 'groups'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Gruplar
          </button>
          <button
            onClick={() => setActiveFilter('direct')}
            className={`px-3 py-1 rounded-lg transition shrink-0 ${
              activeFilter === 'direct'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Kişiler
          </button>
        </div>
      </div>

      {/* Chat List Scrollable Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 space-y-1">
            <p>Aradığınız kriterde sohbet bulunamadı.</p>
          </div>
        ) : (
          filteredChats.map(chat => {
            const isSelected = activeChatId === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`p-3.5 transition cursor-pointer flex items-center gap-3 select-none ${
                  isSelected 
                    ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600' 
                    : 'hover:bg-gray-50/80 active:bg-gray-100/80 bg-white'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                    getChatAvatarBg(chat.name, chat.is_group)
                  }`}>
                    {chat.is_group ? (
                      <Users size={20} />
                    ) : (
                      <span>{chat.name.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                {/* Name & Last Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs font-bold text-gray-900 truncate">
                      {chat.name}
                    </h3>
                    <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                      {formatMessageTime(chat.last_message_time)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[11px] text-gray-500 truncate">
                      {chat.last_message_text || 'Medya / Belge'}
                    </p>

                    <div className="flex items-center gap-1 shrink-0">
                      {chat.is_pinned && (
                        <Pin size={12} className="text-gray-400 rotate-45" />
                      )}
                      {chat.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold text-[9px] shadow-2xs">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
