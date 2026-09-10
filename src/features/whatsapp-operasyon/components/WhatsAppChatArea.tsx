import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  ImageIcon, 
  FileText, 
  Camera, 
  Phone, 
  Video, 
  Search, 
  ArrowLeft, 
  Users, 
  CheckCheck, 
  ExternalLink,
  Moon,
  Sun
} from 'lucide-react';
import { WhatsAppChat, WhatsAppMessage } from '../types';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';

interface WhatsAppChatAreaProps {
  chat: WhatsAppChat;
  messages: WhatsAppMessage[];
  onBack?: () => void;
  onRefreshMessages: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const WhatsAppChatArea: React.FC<WhatsAppChatAreaProps> = ({
  chat,
  messages,
  onBack,
  onRefreshMessages,
  theme = 'light',
  onToggleTheme
}) => {
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const { notify } = useToast();

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, chat.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const bodyText = inputMessage.trim();
    setInputMessage('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);

    try {
      setIsSending(true);
      await sendWhatsAppMessage({
        chatId: chat.id,
        organizationId: chat.organization_id || user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391',
        senderName: user?.email ? user.email.split('@')[0] : 'Berkant Saray',
        body: bodyText
      });
      onRefreshMessages();
      setTimeout(() => scrollToBottom(true), 100);
    } catch (err: any) {
      console.error('Mesaj gönderim hatası:', err);
      notify('Mesaj gönderilemedi', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);
    notify('Fotoğraf / Belge gönderiliyor...', 'info');

    // Create object url for preview
    const previewUrl = URL.createObjectURL(file);

    try {
      setIsSending(true);
      await sendWhatsAppMessage({
        chatId: chat.id,
        organizationId: chat.organization_id || user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391',
        senderName: user?.email ? user.email.split('@')[0] : 'Berkant Saray',
        body: file.name,
        messageType: file.type.startsWith('image/') ? 'image' : 'document',
        mediaUrl: previewUrl,
        mediaCaption: `${file.name} (Gönderildi)`
      });
      onRefreshMessages();
      notify('Dosya başarıyla paylaşıldı', 'success');
      setTimeout(() => scrollToBottom(true), 100);
    } catch (err: any) {
      console.error('Dosya gönderim hatası:', err);
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const commonEmojis = ['👍', '✅', '🚗', '⛽', '🥩', '🧾', '💰', '🔧', '📍', '📦', '🙏', '👏'];

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex flex-col h-full relative transition-colors ${
      isDark ? 'bg-[#0b141a]' : 'bg-[#efeae2]/40'
    }`}>
      {/* Top Header */}
      <div className={`p-3 border-b flex items-center justify-between shadow-2xs z-10 transition-colors ${
        isDark ? 'bg-[#202c33] border-[#222e35]' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className={`p-1.5 rounded-lg md:hidden ${
                isDark ? 'text-[#8696a0] hover:bg-[#2a3942]' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            {chat.is_group ? <Users size={20} /> : <span>{chat.name.substring(0, 2).toUpperCase()}</span>}
          </div>

          <div>
            <h2 className={`text-xs sm:text-sm font-bold leading-tight ${
              isDark ? 'text-[#e9edef]' : 'text-gray-900'
            }`}>
              {chat.name}
            </h2>
            <p className={`text-[11px] mt-0.5 truncate max-w-xs sm:max-w-md ${
              isDark ? 'text-[#8696a0]' : 'text-gray-500'
            }`}>
              {chat.is_group 
                ? 'Ali Şoför, Hasan, Özkan Usta, Berkant Saray, Kenan...' 
                : (chat.phone_number || 'Çevrimiçi')}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          {/* Theme Switcher in Chat Header */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-lg transition active:scale-95 flex items-center justify-center ${
                isDark 
                  ? 'text-amber-400 hover:bg-[#2a3942] hover:text-amber-300' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
              title={isDark ? 'Açık Temaya Geç' : 'Karanlık Temaya Geç'}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          )}

          <div className={`hidden sm:flex items-center gap-1 ${
            isDark ? 'text-[#8696a0]' : 'text-gray-400'
          }`}>
            <button className={`p-2 rounded-lg transition ${
              isDark ? 'hover:bg-[#2a3942] text-[#8696a0]' : 'hover:bg-gray-100'
            }`} title="Sesli Arama">
              <Phone size={17} />
            </button>
            <button className={`p-2 rounded-lg transition ${
              isDark ? 'hover:bg-[#2a3942] text-[#8696a0]' : 'hover:bg-gray-100'
            }`} title="Görüntülü Arama">
              <Video size={17} />
            </button>
          </div>

          <button
            onClick={() => notify('Sohbet içi arama aktif', 'info')}
            className={`p-2 rounded-lg transition ${
              isDark ? 'text-[#8696a0] hover:bg-[#2a3942]' : 'text-gray-500 hover:bg-gray-100'
            }`}
            title="Mesajlarda Ara"
          >
            <Search size={17} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3"
        style={{
          backgroundImage: isDark
            ? `radial-gradient(#1f2c34 1px, transparent 1px)`
            : `radial-gradient(#cbd5e1 0.75px, transparent 0.75px)`,
          backgroundSize: '24px 24px'
        }}
      >
        {/* Date Divider */}
        <div className="flex items-center justify-center my-2">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold shadow-2xs border backdrop-blur-xs ${
            isDark 
              ? 'bg-[#182229] text-[#8696a0] border-[#222e35]' 
              : 'bg-white/90 text-gray-500 border-gray-200/60'
          }`}>
            Bugün
          </span>
        </div>

        {messages.map(msg => {
          const isMe = msg.is_from_me;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-md rounded-2xl p-3 shadow-2xs border text-xs ${
                  isMe
                    ? isDark
                      ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs border-[#005c4b]'
                      : 'bg-emerald-600 text-white rounded-tr-xs border-emerald-700/20'
                    : isDark
                      ? 'bg-[#202c33] text-[#e9edef] rounded-tl-xs border-[#222e35]'
                      : 'bg-white text-gray-900 rounded-tl-xs border-gray-200/80'
                }`}
              >
                {/* Sender Name in Groups */}
                {!isMe && chat.is_group && (
                  <div className={`text-[11px] font-bold mb-1 ${
                    isDark ? 'text-[#00a884]' : 'text-emerald-700'
                  }`}>
                    {msg.sender_name}
                  </div>
                )}

                {/* Media Content (Image or Document) */}
                {msg.message_type === 'image' && msg.media_url && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-black/10 bg-black/5 relative group/img">
                    <img
                      src={msg.media_url}
                      alt="WhatsApp Medya"
                      className="w-full max-h-60 object-cover cursor-pointer hover:opacity-95 transition"
                      onClick={() => setSelectedMediaUrl(msg.media_url!)}
                    />
                    <button
                      onClick={() => setSelectedMediaUrl(msg.media_url!)}
                      className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs opacity-0 group-hover/img:opacity-100 transition"
                    >
                      <ExternalLink size={12} />
                      Büyüt
                    </button>
                  </div>
                )}

                {msg.message_type === 'document' && (
                  <div className={`mb-2 p-2.5 rounded-xl flex items-center gap-2.5 border ${
                    isDark 
                      ? 'bg-[#111b21]/70 border-[#2a3942]' 
                      : 'bg-black/5 border-black/10'
                  }`}>
                    <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center font-bold">
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold block truncate">{msg.body || 'Fatura_Belgesi.pdf'}</span>
                      <span className={`text-[10px] ${isDark ? 'text-[#8696a0]' : 'opacity-75'}`}>PDF Belgesi &bull; 1.2 MB</span>
                    </div>
                  </div>
                )}

                {/* Text Body / Caption */}
                {msg.body && (
                  <p className="whitespace-pre-wrap leading-relaxed select-text">
                    {msg.body}
                  </p>
                )}

                {msg.media_caption && msg.message_type === 'image' && (
                  <p className="mt-1.5 font-medium whitespace-pre-wrap leading-relaxed select-text opacity-95">
                    {msg.media_caption}
                  </p>
                )}

                {/* Time & Read Status */}
                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium ${
                  isMe 
                    ? isDark ? 'text-[#8696a0]' : 'text-emerald-100'
                    : isDark ? 'text-[#8696a0]' : 'text-gray-400'
                }`}>
                  <span>{formatTime(msg.timestamp)}</span>
                  {isMe && (
                    <CheckCheck size={13} className={isDark ? 'text-[#53bdeb]' : 'text-emerald-200'} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Bar */}
      {showEmojiPicker && (
        <div className={`p-2 border-t flex items-center gap-2 overflow-x-auto shadow-inner ${
          isDark ? 'bg-[#202c33] border-[#222e35]' : 'bg-white border-gray-200'
        }`}>
          {commonEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => setInputMessage(prev => prev + emoji)}
              className={`p-1.5 rounded-lg text-lg transition active:scale-125 ${
                isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Attachment Menu Popup */}
      {showAttachMenu && (
        <div className={`absolute bottom-16 left-4 rounded-2xl shadow-xl border p-2 grid grid-cols-3 gap-2 z-20 w-72 animate-in fade-in slide-in-from-bottom-2 ${
          isDark 
            ? 'bg-[#202c33] border-[#2a3942] text-[#e9edef]' 
            : 'bg-white border-gray-200 text-gray-700'
        }`}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition ${
              isDark ? 'hover:bg-[#2a3942] text-[#e9edef]' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
              isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
            }`}>
              <ImageIcon size={20} />
            </div>
            <span className="text-[10px] font-bold">Fotoğraf</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition ${
              isDark ? 'hover:bg-[#2a3942] text-[#e9edef]' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
              isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
            }`}>
              <FileText size={20} />
            </div>
            <span className="text-[10px] font-bold">Belge / PDF</span>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              setInputMessage(prev => prev + '📍 Konum: Merkez Mezbaha Tesisi\n');
            }}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition ${
              isDark ? 'hover:bg-[#2a3942] text-[#e9edef]' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
              isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
            }`}>
              <Camera size={20} />
            </div>
            <span className="text-[10px] font-bold">Konum</span>
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className={`p-3 border-t flex items-center gap-2 z-10 transition-colors ${
        isDark ? 'bg-[#202c33] border-[#222e35]' : 'bg-white border-gray-200'
      }`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileUpload}
        />

        <button
          onClick={() => setShowEmojiPicker(prev => !prev)}
          className={`p-2 rounded-xl transition ${
            showEmojiPicker 
              ? isDark ? 'bg-[#2a3942] text-[#00a884]' : 'bg-gray-100 text-emerald-600'
              : isDark ? 'text-[#8696a0] hover:bg-[#2a3942]' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Emoji Ekle"
        >
          <Smile size={20} />
        </button>

        <button
          onClick={() => setShowAttachMenu(prev => !prev)}
          className={`p-2 rounded-xl transition ${
            showAttachMenu 
              ? isDark ? 'bg-[#2a3942] text-[#00a884]' : 'bg-gray-100 text-emerald-600'
              : isDark ? 'text-[#8696a0] hover:bg-[#2a3942]' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Fotoğraf veya Belge Ekle"
        >
          <Paperclip size={20} />
        </button>

        <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            placeholder="Bir mesaj yazın..."
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            className={`w-full px-4 py-2.5 text-xs rounded-xl shadow-2xs transition ${
              isDark
                ? 'bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] border border-transparent focus:border-[#00a884] focus:outline-none'
                : 'bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500'
            }`}
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className={`p-2.5 rounded-xl active:scale-95 transition disabled:opacity-40 shadow-xs shrink-0 ${
              isDark
                ? 'bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold disabled:hover:bg-[#00a884]'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:hover:bg-emerald-600'
            }`}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Media Lightbox Modal */}
      {selectedMediaUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedMediaUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img
              src={selectedMediaUrl}
              alt="Büyütülmüş Görsel"
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
