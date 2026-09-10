import React from 'react';
import { 
  MessageSquare, 
  Smartphone, 
  Lock
} from 'lucide-react';
import { GatewaySession } from '../types';

interface WhatsAppWebLandingProps {
  session: GatewaySession | null;
  onOpenDeviceModal: () => void;
}

export const WhatsAppWebLanding: React.FC<WhatsAppWebLandingProps> = ({
  session,
  onOpenDeviceModal
}) => {
  const isConnected = session?.status === 'connected';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/70 text-center select-none border-b-8 border-b-emerald-500">
      <div className="max-w-md space-y-6 flex flex-col items-center">
        {/* Animated App Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageSquare size={40} />
          </div>
          <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center text-[10px] font-bold text-white ${
            isConnected ? 'bg-emerald-500' : 'bg-amber-500'
          }`}>
            {isConnected ? '✓' : '!'}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
            WhatsApp Web ERP Entegrasyonu
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            WhatsApp sohbetlerinizi, şirket içi operasyon gruplarınızı doğrudan panel içinden yönetin; gelen fiş, fatura ve talimatları ERP&apos;ye tek tıkla işleyin.
          </p>
        </div>

        {/* Status / Connect Action */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs w-full space-y-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-xs font-bold text-gray-800">
                {isConnected ? 'Gateway Canlı Eşleşmiş' : 'QR Kod ile Cihaz Eşleştirin'}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-gray-400">
              {isConnected ? '+90 532 000 0000' : 'Beklemede'}
            </span>
          </div>

          <p className="text-[11px] text-gray-500 leading-normal">
            {isConnected 
              ? 'Telefonunuzdaki WhatsApp ile senkronize çalışıyor. Sol menüden bir sohbet seçerek mesajlaşmaya başlayabilirsiniz.'
              : 'Telefonunuzdan WhatsApp > Bağlı Cihazlar menüsüne girip QR kodu okutarak sohbetlerinizi buraya bağlayın.'}
          </p>

          <button
            onClick={onOpenDeviceModal}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-xs ${
              isConnected
                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            <Smartphone size={15} />
            <span>{isConnected ? 'Cihaz & Gateway Bilgilerini Gör' : 'QR Kodu Aç & Cihaz Bağla'}</span>
          </button>
        </div>

        {/* Security / Encryption Note */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
          <Lock size={13} className="text-gray-400" />
          <span>Uçtan uca şifreli şirket içi haberleşme</span>
        </div>
      </div>
    </div>
  );
};
