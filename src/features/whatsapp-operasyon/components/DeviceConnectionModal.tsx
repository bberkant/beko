import React, { useState } from 'react';
import { 
  Smartphone, 
  QrCode, 
  RefreshCw, 
  Wifi, 
  ShieldCheck, 
  Users, 
  MessageSquare
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

interface DeviceConnectionModalProps {
  open: boolean;
  onClose: () => void;
  groupsCount: number;
}

export const DeviceConnectionModal: React.FC<DeviceConnectionModalProps> = ({
  open,
  onClose,
  groupsCount
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setQrKey] = useState(1);

  const handleRefreshQr = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setQrKey(prev => prev + 1);
      setIsRefreshing(false);
    }, 600);
  };

  const handleToggleConnection = () => {
    setIsConnected(prev => !prev);
  };

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
          isConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <div>
              <div className="font-bold text-sm">
                {isConnected ? 'Bağlantı Aktif (Canlı Eşleşme)' : 'Oturum Bekleniyor (QR Okutun)'}
              </div>
              <div className="text-xs opacity-80 mt-0.5">
                {isConnected 
                  ? 'Şirket WhatsApp grupları ve medya akışı panele canlı aktarılıyor.' 
                  : 'Lütfen WhatsApp uygulamasından Bağlı Cihazlar > Cihaz Bağla seçeneği ile QR kodu okutun.'}
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleConnection}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isConnected 
                ? 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100' 
                : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700'
            }`}
          >
            {isConnected ? 'Bağlantıyı Kes' : 'Yeniden Bağlan'}
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
                  <div className="text-sm font-bold text-gray-900">Samsung Galaxy S24</div>
                  <div className="text-xs text-gray-500">+90 (532) 555 05 05</div>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wifi size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Sinyal & Gecikme</div>
                  <div className="text-sm font-bold text-gray-900">Kusursuz (18 ms)</div>
                  <div className="text-xs text-emerald-600 font-medium">Wi-Fi (Mezbaha Ağ)</div>
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
          /* QR Code Pairing Box */
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="relative p-4 bg-white rounded-2xl shadow-md border border-gray-200">
              {/* Simulated QR Code */}
              <div className="w-52 h-52 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-3 flex flex-col items-center justify-center text-white text-center relative overflow-hidden">
                <QrCode size={120} className="text-white opacity-90" />
                <span className="text-[10px] font-mono mt-2 tracking-widest text-emerald-400">BEKO-ERP-WPP-SESSION</span>
                {isRefreshing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <RefreshCw size={28} className="animate-spin text-emerald-400" />
                  </div>
                )}
              </div>
              <button
                onClick={handleRefreshQr}
                disabled={isRefreshing}
                className="mt-3 w-full py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                Kodu Yenile
              </button>
            </div>

            <div className="max-w-xs space-y-3">
              <h4 className="font-bold text-gray-900 text-sm">WhatsApp Web ile Eşleştirin</h4>
              <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
                <li>Telefonunuzda <strong>WhatsApp</strong> uygulamasını açın.</li>
                <li><strong>Ayarlar</strong> veya menüden <strong>Bağlı Cihazlar</strong>&apos;a dokunun.</li>
                <li><strong>Cihaz Bağla</strong> butonuna basıp kameranızı bu koda tutun.</li>
              </ol>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px] flex items-start gap-2">
                <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span>Mesajlar uçtan uca şifreli oturum üzerinden doğrudan ERP sunucunuza aktarılır.</span>
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
