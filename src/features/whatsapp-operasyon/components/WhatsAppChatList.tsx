import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Users, 
  Pin, 
  Smartphone, 
  RefreshCw,
  Moon,
  Sun
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
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const WhatsAppChatList: React.FC<WhatsAppChatListProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  session,
  onOpenDeviceModal,
  onRefresh,
  isRefreshing = false,
  theme = 'light',
  onToggleTheme
}) => {
  const isDark = theme === 'dark';
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
    <div className={`flex flex-col h-full border-r transition-colors ${
      isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-gray-200'
    }`}>
      {/* Top Header Bar */}
      <div className={`p-3.5 border-b flex items-center justify-between transition-colors ${
        isDark ? 'bg-[#202c33] border-[#222e35]' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              BE
            </div>
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
              isDark ? 'border-[#202c33]' : 'border-white'
            } ${
              isConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
          </div>
          <div>
            <h2 className={`text-xs font-bold leading-tight ${isDark ? 'text-[#e9edef]' : 'text-gray-900'}`}>
              Beko WhatsApp Web
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] font-semibold ${
                isConnected ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 'text-amber-500'
              }`}>
                {isConnected ? 'Bağlantı Canlı' : 'QR Eşleşme Bekleniyor'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Dark / Light Theme Switcher */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl text-xs transition active:scale-95 flex items-center justify-center ${
                isDark 
                  ? 'text-amber-400 hover:bg-[#2a3942] hover:text-amber-300' 
                  : 'text-gray-500 hover:bg-gray-200/70 hover:text-gray-800'
              }`}
              title={isDark ? 'Açık Temaya Geç (Gündüz Modu)' : 'Karanlık Temaya Geç (Gece Modu)'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}

          <button
            onClick={onOpenDeviceModal}
            className={`p-2 rounded-xl text-xs transition active:scale-95 flex items-center gap-1.5 font-bold ${
              isConnected
                ? isDark
                  ? 'bg-[#054640] text-[#00a884] hover:bg-[#075e54] border border-[#00a884]/30'
                  : 'bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200/80'
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
            className={`p-2 rounded-xl transition active:scale-95 ${
              isDark 
                ? 'text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]' 
                : 'text-gray-500 hover:bg-gray-200/60 hover:text-gray-800'
            }`}
            title="Sohbetleri Yenile"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-emerald-500' : ''} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`p-3 border-b transition-colors ${
        isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-gray-100'
      }`}>
        <div className="relative">
          <input
            type="text"
            placeholder="Sohbet veya kişi ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl transition shadow-2xs ${
              isDark
                ? 'bg-[#202c33] text-[#d1d7db] placeholder-[#8696a0] border border-[#2a3942] focus:border-[#00a884] focus:outline-none'
                : 'bg-gray-50/80 text-gray-900 placeholder-gray-400 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500'
            }`}
          />
          <Search size={14} className={`absolute left-3 top-2.5 pointer-events-none ${
            isDark ? 'text-[#8696a0]' : 'text-gray-400'
          }`} />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto text-[11px] font-semibold">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg transition shrink-0 ${
              activeFilter === 'all'
                ? isDark 
                  ? 'bg-[#00a884] text-[#111b21] font-bold' 
                  : 'bg-emerald-600 text-white font-bold'
                : isDark 
                  ? 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-3 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
              activeFilter === 'unread'
                ? isDark 
                  ? 'bg-[#00a884] text-[#111b21] font-bold' 
                  : 'bg-emerald-600 text-white font-bold'
                : isDark 
                  ? 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Okunmamış</span>
            {chats.filter(c => c.unread_count > 0).length > 0 && (
              <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                isDark ? 'bg-[#111b21] text-[#00a884]' : 'bg-emerald-500 text-white'
              }`}>
                {chats.filter(c => c.unread_count > 0).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('groups')}
            className={`px-3 py-1 rounded-lg transition shrink-0 ${
              activeFilter === 'groups'
                ? isDark 
                  ? 'bg-[#00a884] text-[#111b21] font-bold' 
                  : 'bg-emerald-600 text-white font-bold'
                : isDark 
                  ? 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Gruplar
          </button>
          <button
            onClick={() => setActiveFilter('direct')}
            className={`px-3 py-1 rounded-lg transition shrink-0 ${
              activeFilter === 'direct'
                ? isDark 
                  ? 'bg-[#00a884] text-[#111b21] font-bold' 
                  : 'bg-emerald-600 text-white font-bold'
                : isDark 
                  ? 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Kişiler
          </button>
        </div>
      </div>

      {/* Chat List Scrollable Area */}
      <div className={`flex-1 overflow-y-auto divide-y transition-colors ${
        isDark ? 'bg-[#111b21] divide-[#222e35]' : 'bg-white divide-gray-100'
      }`}>
        {filteredChats.length === 0 ? (
          <div className={`p-8 text-center text-xs space-y-1 ${
            isDark ? 'text-[#8696a0]' : 'text-gray-400'
          }`}>
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
                    ? isDark 
                      ? 'bg-[#2a3942] border-l-4 border-l-[#00a884]' 
                      : 'bg-emerald-50/90 border-l-4 border-l-emerald-600' 
                    : isDark 
                      ? 'hover:bg-[#202c33] active:bg-[#2a3942] bg-[#111b21]' 
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
                    <h3 className={`text-xs font-bold truncate ${
                      isDark ? 'text-[#e9edef]' : 'text-gray-900'
                    }`}>
                      {chat.name}
                    </h3>
                    <span className={`text-[10px] shrink-0 font-medium ${
                      isDark ? 'text-[#8696a0]' : 'text-gray-400'
                    }`}>
                      {formatMessageTime(chat.last_message_time)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={`text-[11px] truncate ${
                      isDark ? 'text-[#8696a0]' : 'text-gray-500'
                    }`}>
                      {chat.last_message_text || 'Medya / Belge'}
                    </p>

                    <div className="flex items-center gap-1 shrink-0">
                      {chat.is_pinned && (
                        <Pin size={12} className={`rotate-45 ${isDark ? 'text-[#8696a0]' : 'text-gray-400'}`} />
                      )}
                      {chat.unread_count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full font-extrabold text-[9px] shadow-2xs ${
                          isDark 
                            ? 'bg-[#00a884] text-[#111b21]' 
                            : 'bg-emerald-500 text-white'
                        }`}>
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
