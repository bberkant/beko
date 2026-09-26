import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  Wifi, 
  ShieldCheck, 
  Users, 
  MessageSquare,
  LogOut
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface DeviceConnectionModalProps {
  open: boolean;
  onClose: () => void;
  groupsCount: number;
}

interface GatewaySession {
  id?: string;
  organization_id?: string;
  status: 'disconnected' | 'qr_ready' | 'connected' | 'error' | 'logout_requested';
  qr_code?: string | null;
  qr_raw?: string | null;
  phone_number?: string | null;
  device_name?: string | null;
  last_heartbeat?: string | null;
  error_message?: string | null;
  updated_at?: string | null;
}

export const DeviceConnectionModal: React.FC<DeviceConnectionModalProps> = ({
  open,
  onClose,
  groupsCount
}) => {
  const { user } = useAuth();
  const [session, setSession] = useState<GatewaySession>({
    status: 'disconnected',
    device_name: 'Beko ERP Gateway'
  });
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_gateway_sessions')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (!error && data) {
        setSession(data as GatewaySession);
      }

      // Fetch recent real chats
      const { data: chatsData } = await supabase
        .from('whatsapp_chats')
        .select('id, name, phone_number, is_group, last_message_text, last_message_time')
        .eq('organization_id', orgId)
        .order('last_message_time', { ascending: false })
        .limit(8);

      if (chatsData) {
        setRecentChats(chatsData);
      }
    } catch (err) {
      console.error('WhatsApp gateway oturumu çekme hatası:', err);
    }
  };

  useEffect(() => {
    if (!open) return;

    fetchSession();

    // Poll every 2.5 seconds for live status & QR updates
    const interval = setInterval(fetchSession, 2500);

    // Also subscribe to real-time changes
    const channel = supabase
      .channel('whatsapp_gateway_changes')
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
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [open, orgId]);

  const handleResetSession = async () => {
    setIsRefreshing(true);
    try {
      await fetchSession();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleLogoutAndReset = async () => {
    if (!window.confirm('WhatsApp oturumu kapatılacak ve sunucu anında yeni bir QR kod üretecektir. Devam etmek istiyor musunuz?')) {
      return;
    }
    setIsRefreshing(true);
    try {
      await supabase
        .from('whatsapp_gateway_sessions')
        .upsert({
          organization_id: orgId,
          status: 'logout_requested',
          qr_code: null,
          phone_number: null,
          device_name: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id' });

      setTimeout(async () => {
        await fetchSession();
        setIsRefreshing(false);
      }, 2500);
    } catch (err) {
      console.error('Session reset error:', err);
      setIsRefreshing(false);
    }
  };

  const isConnected = session.status === 'connected';

  // WhatsApp QR kodları ~20-40 saniye geçerlidir. Gateway'in canlı olduğunu doğrulamak için
  // last_heartbeat veya updated_at değerinin son 90 saniye içinde güncellenmiş olması gerekir.
  const isHeartbeatFresh = Boolean(
    (session.last_heartbeat || session.updated_at) &&
    (Date.now() - new Date(session.last_heartbeat || session.updated_at!).getTime()) < 90 * 1000
  );

  const isQrReady = session.status === 'qr_ready' && !!session.qr_code && isHeartbeatFresh;
  const isGatewayOffline = !isConnected && (!isHeartbeatFresh || session.status === 'disconnected');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="WhatsApp Web Gateway Bağlantı Terminali"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Connection Status Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isConnected 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : isQrReady 
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : isQrReady ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
            }`} />
            <div>
              <div className="font-bold text-sm">
                {isConnected 
                  ? 'Bağlantı Aktif (Canlı Eşleşme)' 
                  : isQrReady 
                  ? 'Oturum Bekleniyor (Canlı QR Kodu Okutun)' 
                  : 'Gateway Servisi Kapalı / Bekleniyor'}
              </div>
              <div className="text-xs opacity-80 mt-0.5">
                {isConnected 
                  ? 'WhatsApp hattınız Mezbaha sunucusu üzerinden 7/24 panele canlı bağlıdır.' 
                  : isQrReady
                  ? 'Telefonunuzdan WhatsApp > Bağlı Cihazlar > Cihaz Bağla adımı ile aşağıdaki canlı kodu okutun.'
                  : 'Mezbaha sunucusunda servis arka planda başlatılıyor...'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSession}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              Yenile
            </button>
          </div>
        </div>

        {isConnected ? (
          /* Connected Device Details */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Smartphone size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Bağlı Cihaz</div>
                  <div className="text-sm font-bold text-gray-900">{session.device_name || 'WhatsApp Multi-Device'}</div>
                  <div className="text-xs text-gray-500 font-medium">+{session.phone_number || '905320000000'}</div>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wifi size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Bağlantı Durumu</div>
                  <div className="text-sm font-bold text-gray-900">Mezbaha 7/24 Canlı</div>
                  <div className="text-xs text-emerald-600 font-medium">Uçtan Uca Şifreli</div>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Aktif Sohbetler</div>
                  <div className="text-sm font-bold text-gray-900">{recentChats.length || groupsCount || 0} Sohbet</div>
                  <div className="text-xs text-blue-600 font-medium">İki Yönlü Mesajlaşma</div>
                </div>
              </div>
            </div>

            {/* Monitored Real Chats / Groups */}
            <div className="border border-gray-200 rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare size={14} className="text-emerald-600" />
                  Senkronize WhatsApp Sohbetleri ({recentChats.length})
                </h4>
                <button
                  onClick={handleLogoutAndReset}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition-colors border border-rose-200 cursor-pointer"
                  title="Oturumu sıfırlayıp baştan QR kod okutmak için tıklayın"
                >
                  <LogOut size={12} />
                  Oturumu Sıfırla &amp; Yeni QR Üret
                </button>
              </div>

              {recentChats.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {recentChats.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-gray-800 block truncate">
                          {c.is_group ? '👥 ' : '👤 '} {c.name}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate block">
                          {c.last_message_text || 'Sohbet aktif'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                        c.is_group ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {c.is_group ? 'Grup' : 'Kişi'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex flex-col gap-1.5">
                  <span className="font-semibold">Henüz senkronize edilmiş sohbet bulunmuyor.</span>
                  <span className="text-[11.5px] text-amber-800">
                    WhatsApp hattınıza yeni bir mesaj geldiğinde veya giden mesaj gönderildiğinde sohbetler otomatik listelenecektir. Tüm geçmiş sohbetlerinizi ve gruplarınızı tek seferde baştan çekmek için yukarıdaki <strong>&quot;Oturumu Sıfırla &amp; Yeni QR Üret&quot;</strong> butonuna basarak yeni bir QR kod okutabilirsiniz.
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Live Scannable QR Code Pairing Box */
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="relative p-4 bg-white rounded-2xl shadow-md border border-gray-200 flex flex-col items-center">
              {isQrReady ? (
                /* Real Scannable WhatsApp QR Image */
                <div className="w-56 h-56 bg-white rounded-xl p-2 flex flex-col items-center justify-center border border-gray-200 shadow-inner">
                  <img
                    src={session.qr_code!}
                    alt="WhatsApp Canlı QR Kodu"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                /* Offline / Loading placeholder */
                <div className="w-56 h-56 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-white text-center relative overflow-hidden">
                  <RefreshCw size={32} className={`mb-2.5 ${isGatewayOffline ? 'text-amber-400' : 'text-emerald-400 animate-spin'}`} />
                  <span className="text-xs font-bold text-gray-100">
                    {isGatewayOffline ? 'Gateway Servisi Bekleniyor' : 'WhatsApp Gateway'}
                  </span>
                  <span className="text-[11px] text-gray-300 mt-1.5 leading-snug px-1">
                    {isGatewayOffline
                      ? 'Sunucuda WhatsApp Gateway servisi başlatılıyor. Lütfen 3-5 saniye bekleyin...'
                      : 'Canlı QR Kodu Hazırlanıyor...'}
                  </span>
                </div>
              )}

              <button
                onClick={fetchSession}
                disabled={isRefreshing}
                className="mt-3 w-full py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                Kodu Tazele
              </button>
            </div>

            <div className="max-w-xs space-y-3">
              <h4 className="font-bold text-gray-900 text-sm">WhatsApp ile Canlı Eşleştirin</h4>
              <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
                <li>Telefonunuzda <strong>WhatsApp</strong> uygulamasını açın.</li>
                <li><strong>Ayarlar</strong> (veya sağ üst üç nokta menüsünden) <strong>Bağlı Cihazlar</strong>&apos;a dokunun.</li>
                <li><strong>Cihaz Bağla</strong> butonuna basıp kameranızı soldaki QR koda tutun.</li>
              </ol>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-start gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Eşleşme sağlandığında tüm WhatsApp sohbet geçmişiniz, müşteri konuşmalarınız ve gruplarınız anında panele aktarılacaktır.</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </Modal>
  );
};
