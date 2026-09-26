import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Image as ImageIcon, 
  Edit3, 
  Sparkles, 
  Coins, 
  RefreshCw, 
  ShieldCheck,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';
import { FindeksCheckInquiry, ParsedCheckQR, FindeksSettings } from '../types';
import { CheckScannerModal } from '../components/CheckScannerModal';
import { ManualInquiryModal } from '../components/ManualInquiryModal';
import { CheckReportCard } from '../components/CheckReportCard';
import { FindeksHistoryList } from '../components/FindeksHistoryList';
import { FindeksSettingsModal } from '../components/FindeksSettingsModal';
import { decodeCheckFromImageFile } from '../utils/checkQrDecoder';
import { queryCheck, getInquiryHistory, getFindeksSettings } from '../services/findeksService';

export const FindeksPage: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useToast();

  const isAdmin = user?.role === 'Admin' || user?.role === 'Süper Admin' || user?.role === 'Developer' || user?.role === 'Yönetici' || user?.role === 'Süper Yönetici' || user?.rawRole === 'admin' || user?.rawRole === 'super_admin' || user?.rawRole === 'developer' || user?.email === 'admin@dars.local' || user?.email === 'admin@ets360.local' || user?.email === 'admin';

  const [inquiries, setInquiries] = useState<FindeksCheckInquiry[]>([]);
  const [activeReport, setActiveReport] = useState<FindeksCheckInquiry | null>(null);
  const [settings, setSettings] = useState<FindeksSettings | null>(null);
  const [isProcessingGallery, setIsProcessingGallery] = useState<boolean>(false);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    if (!isAdmin || !user?.organizationId) return;
    try {
      const [historyData, settingsData] = await Promise.all([
        getInquiryHistory(user.organizationId),
        getFindeksSettings(user.organizationId)
      ]);
      setInquiries(historyData);
      setSettings(settingsData);

      // Auto select first inquiry if no active report
      if (!activeReport && historyData.length > 0) {
        setActiveReport(historyData[0]);
      }
    } catch (err: any) {
      console.error('Findeks verileri yüklenirken hata:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [user?.organizationId, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-12 w-12 text-red-500 mb-3" />
          <h2 className="text-lg font-bold text-red-800">Yetkisiz Erişim</h2>
          <p className="mt-1 text-sm text-red-600">Findeks Karekodlu Çek Sorgulama modülünü yalnızca Admin ve yönetici yetkisine sahip kullanıcılar görüntüleyebilir.</p>
        </div>
      </div>
    );
  }

  // Handle Decoded QR from Camera or Gallery
  const handleDecodedQR = async (parsed: ParsedCheckQR) => {
    if (!user?.organizationId) return;

    try {
      notify('Findeks sorgusu yapılıyor, lütfen bekleyin...', 'info');

      const report = await queryCheck(user.organizationId, parsed);
      setActiveReport(report);
      notify('Findeks çek raporu başarıyla getirildi!', 'success');
      
      // Refresh history list and credits
      await loadData();
    } catch (err: any) {
      console.error('Sorgu işleme hatası:', err);
      notify(err.message || 'Sorgu gerçekleştirilemedi', 'error');
    }
  };

  // Direct Gallery File Handler (Mobile-first gallery button)
  const handleDirectGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingGallery(true);
      notify('Galerideki çek karekodu taranıyor...', 'info');

      const parsed = await decodeCheckFromImageFile(file);
      await handleDecodedQR(parsed);
    } catch (err: any) {
      console.error('Galeri görseli okuma hatası:', err);
      notify(err.message || 'Görselden çek karekodu okunamadı. Lütfen net bir fotoğraf seçin.', 'error');
    } finally {
      setIsProcessingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-3 sm:px-6">
      {/* Top Header & Remaining Credits */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Finans / Çek İstihbarat
            </span>
            <span className="text-xs text-gray-400">6102 TTK Uyumlu</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck size={26} className="text-emerald-600 shrink-0" />
            Findeks Karekodlu Çek Sorgulama
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Karekodlu çeklerin Findeks risk endeksini, ödeme performansını ve karşılıksız durumunu anında doğrulayın.
          </p>
        </div>

        {/* Credit Badge Pill & Settings Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 rounded-2xl flex items-center gap-3 shadow-2xs transition active:scale-95 group text-left"
            title="Findeks Hesap & Kontör Ayarları"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Coins size={16} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-800 flex items-center gap-1">
                <span>Findeks Kontörünüz</span>
                <SettingsIcon size={12} className="text-emerald-600 group-hover:rotate-45 transition-transform" />
              </div>
              <div className="text-sm font-black text-emerald-950">
                {settings?.remaining_credits ?? 85} <span className="text-xs font-normal text-emerald-700">Kredi Kaldı</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* MOBILE-FIRST ACTION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Action 1: Live Camera Scan */}
        <button
          onClick={() => setIsScannerOpen(true)}
          className="group relative p-5 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl shadow-md active:scale-[0.98] transition flex flex-col justify-between text-left overflow-hidden min-h-[120px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Camera size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
              Canlı Kamera
            </span>
          </div>

          <div className="mt-3">
            <h3 className="text-base font-extrabold text-white">Kamerayla Çek Tara</h3>
            <p className="text-xs text-emerald-100 mt-0.5">Telefon kamerasını çek karekoduna tutun</p>
          </div>
        </button>

        {/* Action 2: Gallery Image Upload (CRITICAL USER REQUIREMENT) */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleDirectGalleryUpload}
        />
        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={isProcessingGallery}
          className="group relative p-5 bg-gradient-to-br from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white rounded-2xl shadow-md active:scale-[0.98] transition flex flex-col justify-between text-left overflow-hidden min-h-[120px] disabled:opacity-70"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              {isProcessingGallery ? <RefreshCw size={24} className="animate-spin" /> : <ImageIcon size={24} />}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
              Fotoğraf Galerisi
            </span>
          </div>

          <div className="mt-3">
            <h3 className="text-base font-extrabold text-white">
              {isProcessingGallery ? 'Çek Okunuyor...' : 'Galeriden Çek Seç'}
            </h3>
            <p className="text-xs text-indigo-100 mt-0.5">Galerideki çek fotoğrafından karekod oku</p>
          </div>
        </button>

        {/* Action 3: Manual Check Input */}
        <button
          onClick={() => setIsManualModalOpen(true)}
          className="group relative p-5 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded-2xl shadow-md active:scale-[0.98] transition flex flex-col justify-between text-left overflow-hidden min-h-[120px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Edit3 size={22} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
              Elle Giriş
            </span>
          </div>

          <div className="mt-3">
            <h3 className="text-base font-extrabold text-white">Manuel Çek Sorgula</h3>
            <p className="text-xs text-gray-300 mt-0.5">Karekodsuz veya hasarlı çekleri elle sorgulayın</p>
          </div>
        </button>
      </div>

      {/* ACTIVE REPORT DISPLAY */}
      {activeReport ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600" />
              Görüntülenen Findeks Raporu
            </h3>
            <button
              onClick={() => setActiveReport(null)}
              className="text-xs text-gray-500 hover:text-gray-900 font-semibold"
            >
              Raporu Gizle
            </button>
          </div>

          <CheckReportCard
            report={activeReport}
            onRefresh={loadData}
            onAddedToPortfolio={() => notify('Çek ERP Çek & Senet Portföyüne başarıyla eklendi!', 'success')}
          />
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Camera size={24} />
          </div>
          <h4 className="text-sm font-bold text-gray-800">Henüz Bir Çek Taranmadı</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Yukarıdaki butonlardan kamerayı açarak veya galerinizdeki çek görselini yükleyerek Findeks risk analiz raporunu anında oluşturabilirsiniz.
          </p>
        </div>
      )}

      {/* INQUIRY HISTORY LIST */}
      <FindeksHistoryList
        inquiries={inquiries}
        onSelectInquiry={(inquiry) => {
          setActiveReport(inquiry);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        selectedId={activeReport?.id}
      />

      {/* MODALS */}
      <CheckScannerModal
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDecoded={handleDecodedQR}
      />

      <ManualInquiryModal
        open={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={async (parsed) => {
          setIsManualModalOpen(false);
          await handleDecodedQR(parsed);
        }}
      />

      <FindeksSettingsModal
        open={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaved={loadData}
      />
    </div>
  );
};
export default FindeksPage;
