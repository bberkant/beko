import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  SwitchCamera, 
  X, 
  Image as ImageIcon, 
  AlertCircle, 
  RefreshCw
} from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { ParsedCheckQR } from '../types';
import { parseTurkishCheckQR, decodeCheckFromImageFile } from '../utils/checkQrDecoder';

interface CheckScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDecoded: (parsed: ParsedCheckQR, imagePreviewUrl?: string) => void;
}

export const CheckScannerModal: React.FC<CheckScannerModalProps> = ({
  open,
  onClose,
  onDecoded
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [open, facingMode]);

  const startCamera = async () => {
    setErrorMsg(null);
    setIsScanning(true);

    try {
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.QR_CODE
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      codeReaderRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        setHasCamera(false);
        setErrorMsg('Cihazda kullanılabilir kamera bulunamadı. Lütfen galeriden fotoğraf seçin.');
        setIsScanning(false);
        return;
      }

      // Select back camera if environment mode
      let selectedDeviceId = videoInputDevices[0].deviceId;
      if (facingMode === 'environment') {
        const backCamera = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('arka') ||
          device.label.toLowerCase().includes('environment')
        );
        if (backCamera) selectedDeviceId = backCamera.deviceId;
      }

      if (videoRef.current) {
        await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result) => {
            if (result) {
              const rawText = result.getText();
              const parsed = parseTurkishCheckQR(rawText);
              stopCamera();
              onDecoded(parsed);
              onClose();
            }
          }
        );
      }
    } catch (err: any) {
      console.error('Kamera başlatma hatası:', err);
      setErrorMsg('Kamera erişim izni verilmedi veya desteklenmiyor. Galeriden fotoğraf yükleyebilirsiniz.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsScanning(false);
  };

  const handleToggleCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleGalleryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingFile(true);
    setErrorMsg(null);

    try {
      const parsed = await decodeCheckFromImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      stopCamera();
      onDecoded(parsed, previewUrl);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Görselden karekod okunamadı. Lütfen net bir çek fotoğrafı yükleyin.');
    } finally {
      setLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4 backdrop-blur-md">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Camera size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold">Karekodlu Çek Tara</h3>
            <p className="text-[11px] text-gray-400">Çek üzerindeki karekodu kutucuğa hizalayın</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
        >
          <X size={20} />
        </button>
      </div>

      {/* Center Video Scanner Box */}
      <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl bg-black border border-white/10">
        {hasCamera && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
        )}

        {/* Reticle / Focus Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-64 h-64 sm:w-72 sm:h-72 border-2 border-emerald-400/80 rounded-3xl relative flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
            {/* Corner Indicators */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br-lg" />

            {/* Laser Scan Animation Line */}
            {isScanning && (
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute animate-pulse" />
            )}

            <span className="text-[11px] font-bold text-emerald-300 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
              Çek Karekodu (DataMatrix)
            </span>
          </div>
        </div>

        {/* Error / Loading Notice */}
        {errorMsg && (
          <div className="absolute bottom-6 inset-x-4 p-3 bg-rose-500/90 text-white rounded-xl text-xs flex items-center gap-2 backdrop-blur-md shadow-lg">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loadingFile && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white gap-2 backdrop-blur-sm">
            <RefreshCw size={32} className="animate-spin text-emerald-400" />
            <span className="text-xs font-semibold">Galerideki çek karekodu çözümleniyor...</span>
          </div>
        )}
      </div>

      {/* Bottom Action Controls (Mobile-First Touch Bar) */}
      <div className="flex items-center justify-around gap-4 pt-2 z-10 max-w-md mx-auto w-full">
        {/* Gallery Pick Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleGalleryFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loadingFile}
          className="flex-1 py-3 px-4 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition backdrop-blur-sm"
        >
          <ImageIcon size={18} className="text-emerald-400" />
          <span>Galeriden Seç</span>
        </button>

        {/* Switch Camera Button */}
        <button
          onClick={handleToggleCamera}
          className="p-3.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition backdrop-blur-sm"
          title="Kamera Değiştir"
        >
          <SwitchCamera size={20} />
        </button>
      </div>
    </div>
  );
};
