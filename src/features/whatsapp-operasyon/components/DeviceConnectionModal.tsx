import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  Wifi, 
  ShieldCheck, 
  Users, 
  MessageSquare
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
  status: 'disconnected' | 'qr_ready' | 'connected' | 'error';
  qr_code?: string | null;
  qr_raw?: string | null;
  phone_number?: string | null;
  device_name?: string | null;
  last_heartbeat?: string | null;
  error_message?: string | null;
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
      await supabase
        .from('whatsapp_gateway_sessions')
        .upsert({
          organization_id: orgId,
          status: 'disconnected',
          qr_code: null,
          phone_number: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id' });

      await fetchSession();
    } catch (err) {
      console.error('Session reset error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const isConnected = session.status === 'connected';
  const isQrReady = session.status === 'qr_ready' && !!session.qr_code;

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
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : isQrReady ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'
            }`} />
            <div>
              <div className="font-bold text-sm">
                {isConnected 
                  ? 'Bağlantı Aktif (Canlı Eşleşme)' 
                  : isQrReady 
                  ? 'Oturum Bekleniyor (QR Kodu Okutun)' 
                  : 'Gateway Servisi Başlatılıyor...'}
              </div>
              <div className="text-xs opacity-80 mt-0.5">
                {isConnected 
                  ? 'Şirket WhatsApp grupları ve medya akışı panele canlı aktarılıyor.' 
                  : isQrReady
                  ? 'Telefonunuzdan WhatsApp > Bağlı Cihazlar > Cihaz Bağla adımı ile aşağıdaki kodu okutun.'
                  : 'Arka plan gateway servisi ile bağlantı kuruluyor...'}
              </div>
            </div>
          </div>
          <button
            onClick={handleResetSession}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            Yenile
          </button>
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
                  <div className="text-sm font-bold text-gray-900">Canlı & Stabil</div>
                  <div className="text-xs text-emerald-600 font-medium">Uçtan Uca Şifreli</div>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">İzlenen Gruplar</div>
                  <div className="text-sm font-bold text-gray-900">{groupsCount || 5} Aktif Grup</div>
                  <div className="text-xs text-blue-600 font-medium">Tam Otomasyon Açık</div>
                </div>
              </div>
            </div>

            {/* Monitored Groups Quick List */}
            <div className="border border-gray-200 rounded-xl p-4 bg-white">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MessageSquare size={14} className="text-emerald-600" />
                Bağlı Operasyon Grupları
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="font-semibold text-gray-800">🔧 Sanayi & Araç Bakım Grubu</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Araç Modülü</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="font-semibold text-gray-800">⛽ Şoförler & Lojistik Grubu</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">Yakıt Modülü</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="font-semibold text-gray-800">🥩 Mezbaha & Kesimhane Grubu</span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">Kesim Modülü</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="font-semibold text-gray-800">🏪 Şubeler & Günlük Satış</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Kasa & POS</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="font-semibold text-gray-800">💰 Finans & Tahsilat Grubu</span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">Çek Modülü</span>
                </div>
              </div>
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
                /* Loading QR placeholder */
                <div className="w-56 h-56 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-3 flex flex-col items-center justify-center text-white text-center relative overflow-hidden">
                  <RefreshCw size={36} className="animate-spin text-emerald-400 mb-3" />
                  <span className="text-xs font-bold text-gray-200">WhatsApp Gateway</span>
                  <span className="text-[10px] text-gray-400 mt-1">Canlı QR Kodu Hazırlanıyor...</span>
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
                <li><strong>Ayarlar</strong> (veya sağ üst menüden) <strong>Bağlı Cihazlar</strong>&apos;a dokunun.</li>
                <li><strong>Cihaz Bağla</strong> butonuna basıp kameranızı soldaki koda tutun.</li>
              </ol>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-start gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Eşleşme sağlandığında şirket gruplarından gelen fiş ve talimatlar doğrudan ERP havuzuna akar.</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </Modal>
  );
};
