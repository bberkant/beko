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
  theme?: 'light' | 'dark';
}

export const WhatsAppWebLanding: React.FC<WhatsAppWebLandingProps> = ({
  session,
  onOpenDeviceModal,
  theme = 'light'
}) => {
  const isDark = theme === 'dark';
  const isConnected = session?.status === 'connected';

  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center select-none border-b-8 transition-colors ${
      isDark 
        ? 'bg-[#111b21] text-[#e9edef] border-b-[#00a884]' 
        : 'bg-gray-50/70 text-gray-900 border-b-emerald-500'
    }`}>
      <div className="max-w-md space-y-6 flex flex-col items-center">
        {/* Animated App Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageSquare size={40} />
          </div>
          <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 flex items-center justify-center text-[10px] font-bold text-white ${
            isDark ? 'border-[#111b21]' : 'border-white'
          } ${
            isConnected ? 'bg-emerald-500' : 'bg-amber-500'
          }`}>
            {isConnected ? '✓' : '!'}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className={`text-xl font-extrabold tracking-tight ${
            isDark ? 'text-[#e9edef]' : 'text-gray-900'
          }`}>
            WhatsApp Web ERP Entegrasyonu
          </h2>
          <p className={`text-xs leading-relaxed ${
            isDark ? 'text-[#8696a0]' : 'text-gray-500'
          }`}>
            WhatsApp sohbetlerinizi, şirket içi operasyon gruplarınızı doğrudan panel içinden yönetin; gelen fiş, fatura ve talimatları ERP&apos;ye tek tıkla işleyin.
          </p>
        </div>

        {/* Status / Connect Action */}
        <div className={`p-4 rounded-2xl border shadow-2xs w-full space-y-3 text-left transition-colors ${
          isDark 
            ? 'bg-[#202c33] border-[#2a3942] text-[#e9edef]' 
            : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className={`text-xs font-bold ${isDark ? 'text-[#e9edef]' : 'text-gray-800'}`}>
                {isConnected ? 'Gateway Canlı Eşleşmiş' : 'QR Kod ile Cihaz Eşleştirin'}
              </span>
            </div>
            <span className={`text-[10px] font-semibold ${isDark ? 'text-[#8696a0]' : 'text-gray-400'}`}>
              {isConnected ? '+90 532 000 0000' : 'Beklemede'}
            </span>
          </div>

          <p className={`text-[11px] leading-normal ${isDark ? 'text-[#8696a0]' : 'text-gray-500'}`}>
            {isConnected 
              ? 'Telefonunuzdaki WhatsApp ile senkronize çalışıyor. Sol menüden bir sohbet seçerek mesajlaşmaya başlayabilirsiniz.'
              : 'Telefonunuzdan WhatsApp > Bağlı Cihazlar menüsüne girip QR kodu okutarak sohbetlerinizi buraya bağlayın.'}
          </p>

          <button
            onClick={onOpenDeviceModal}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-xs ${
              isConnected
                ? isDark
                  ? 'bg-[#054640] text-[#00a884] hover:bg-[#075e54] border border-[#00a884]/30'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                : isDark
                  ? 'bg-[#00a884] hover:bg-[#02906f] text-[#111b21] shadow-emerald-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            <Smartphone size={15} />
            <span>{isConnected ? 'Cihaz & Gateway Bilgilerini Gör' : 'QR Kodu Aç & Cihaz Bağla'}</span>
          </button>
        </div>

        {/* Security / Encryption Note */}
        <div className={`flex items-center gap-2 text-[11px] font-medium ${
          isDark ? 'text-[#8696a0]' : 'text-gray-400'
        }`}>
          <Lock size={13} className={isDark ? 'text-[#8696a0]' : 'text-gray-400'} />
          <span>Uçtan uca şifreli şirket içi haberleşme</span>
        </div>
      </div>
    </div>
  );
};
