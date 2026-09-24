import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { POPULAR_BANKS, POPULAR_LOCATIONS, normalizeBankName } from '../data/seedData';
import type { PosDevice, PosDeviceFormInput, PosDeviceStatus } from '../types';

interface PosDeviceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: PosDeviceFormInput) => Promise<void>;
  device?: PosDevice | null;
}

export function PosDeviceModal({ open, onClose, onSubmit, device }: PosDeviceModalProps) {
  const [merchantNo, setMerchantNo] = useState('');
  const [terminalNo, setTerminalNo] = useState('');
  const [location, setLocation] = useState('MERKEZ');
  const [bank, setBank] = useState('ZİRAAT');
  const [customBank, setCustomBank] = useState('');
  const [isOtherBank, setIsOtherBank] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [isOtherLocation, setIsOtherLocation] = useState(false);
  const [deviceModel, setDeviceModel] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [status, setStatus] = useState<PosDeviceStatus>('aktif');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (device) {
      setMerchantNo(device.merchantNo || '');
      setTerminalNo(device.terminalNo || '');

      // Check if location in predefined
      const normLoc = (device.location || 'MERKEZ').toLocaleUpperCase('tr-TR');
      if (POPULAR_LOCATIONS.includes(normLoc)) {
        setLocation(normLoc);
        setIsOtherLocation(false);
        setCustomLocation('');
      } else {
        setLocation('DIGER');
        setIsOtherLocation(true);
        setCustomLocation(normLoc);
      }

      // Check if bank in predefined
      const normBank = normalizeBankName(device.bank);
      if (POPULAR_BANKS.includes(normBank)) {
        setBank(normBank);
        setIsOtherBank(false);
        setCustomBank('');
      } else {
        setBank('DIGER');
        setIsOtherBank(true);
        setCustomBank(normBank);
      }

      setDeviceModel(device.deviceModel || '');
      setSerialNo(device.serialNo || '');
      setStatus(device.status || 'aktif');
      setNotes(device.notes || '');
    } else {
      setMerchantNo('');
      setTerminalNo('');
      setLocation('MERKEZ');
      setIsOtherLocation(false);
      setCustomLocation('');
      setBank('ZİRAAT');
      setIsOtherBank(false);
      setCustomBank('');
      setDeviceModel('');
      setSerialNo('');
      setStatus('aktif');
      setNotes('');
    }
  }, [device, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantNo.trim() || !terminalNo.trim()) return;

    const finalLocation = ((isOtherLocation ? customLocation.trim() : location) || 'MERKEZ').toLocaleUpperCase('tr-TR');
    const chosenBank = (isOtherBank ? customBank.trim() : bank) || 'ZİRAAT';
    const finalBank = normalizeBankName(chosenBank).toLocaleUpperCase('tr-TR');

    setSubmitting(true);
    try {
      await onSubmit({
        merchantNo: merchantNo.trim(),
        terminalNo: terminalNo.trim(),
        location: finalLocation,
        bank: finalBank,
        deviceModel: deviceModel.trim() || undefined,
        serialNo: serialNo.trim() || undefined,
        status,
        notes: notes.trim() || undefined
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={device ? 'POS Cihazını Düzenle' : 'Yeni POS Cihazı Ekle'}
      description="Şirket adına kayıtlı üye işyeri numarası, terminal numarası, konum ve banka bilgilerini girin."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* İşyeri No & Pos No / Terminal No */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              İşyeri No <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="input w-full font-mono font-medium text-sm"
              placeholder="Örn: 104829104"
              value={merchantNo}
              onChange={(e) => setMerchantNo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Pos No / Terminal No <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="input w-full font-mono font-medium text-sm"
              placeholder="Örn: 84920192"
              value={terminalNo}
              onChange={(e) => setTerminalNo(e.target.value)}
            />
          </div>
        </div>

        {/* Nerede (Konum) & Banka */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nerede (Konum / Şube) <span className="text-red-500">*</span>
            </label>
            <select
              className="select w-full text-xs font-bold"
              value={isOtherLocation ? 'DIGER' : location}
              onChange={(e) => {
                if (e.target.value === 'DIGER') {
                  setIsOtherLocation(true);
                } else {
                  setIsOtherLocation(false);
                  setLocation(e.target.value);
                }
              }}
            >
              {POPULAR_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
              <option value="DIGER">Diğer (Özel Konum Yaz)...</option>
            </select>
            {isOtherLocation && (
              <input
                type="text"
                required
                className="input w-full mt-1.5 text-xs font-medium"
                placeholder="Özel şube / konum adı girin..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value.toLocaleUpperCase('tr-TR'))}
                autoFocus
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Banka <span className="text-red-500">*</span>
            </label>
            <select
              className="select w-full text-xs font-bold"
              value={isOtherBank ? 'DIGER' : bank}
              onChange={(e) => {
                if (e.target.value === 'DIGER') {
                  setIsOtherBank(true);
                } else {
                  setIsOtherBank(false);
                  setBank(e.target.value);
                }
              }}
            >
              {POPULAR_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="DIGER">Diğer Banka / Kuruluş...</option>
            </select>
            {isOtherBank && (
              <input
                type="text"
                required
                className="input w-full mt-1.5 text-xs font-medium"
                placeholder="Banka adını girin..."
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value.toLocaleUpperCase('tr-TR'))}
                autoFocus
              />
            )}
          </div>
        </div>

        {/* Model & Seri No */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Model / Cihaz Türü
            </label>
            <input
              type="text"
              className="input w-full text-xs font-medium"
              placeholder="Örn: Yazarkasa POS, Android POS, Mobil..."
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cihaz Seri No
            </label>
            <input
              type="text"
              className="input w-full font-mono text-xs"
              placeholder="Örn: SN-9948201"
              value={serialNo}
              onChange={(e) => setSerialNo(e.target.value)}
            />
          </div>
        </div>

        {/* Durum */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Cihaz Durumu
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatus('aktif')}
              className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                status === 'aktif'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-400/20'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setStatus('pasif')}
              className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                status === 'pasif'
                  ? 'bg-gray-100 text-gray-800 border-gray-300 ring-2 ring-gray-400/20'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Pasif
            </button>
            <button
              type="button"
              onClick={() => setStatus('arizali')}
              className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                status === 'arizali'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-400/20'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Arızalı / Serviste
            </button>
          </div>
        </div>

        {/* Notlar */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Notlar / Açıklama
          </label>
          <textarea
            rows={2}
            className="input w-full text-xs py-2"
            placeholder="Kasa masası, tahsis edilen personel veya cihazla ilgili özel notlar..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            className="btn-secondary text-xs px-3.5 py-2"
            onClick={onClose}
            disabled={submitting}
          >
            İptal
          </button>
          <button
            type="submit"
            className="btn-primary text-xs px-4 py-2 font-bold"
            disabled={submitting}
          >
            {submitting ? 'Kaydediliyor...' : device ? 'Değişiklikleri Kaydet' : 'Cihazı Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
