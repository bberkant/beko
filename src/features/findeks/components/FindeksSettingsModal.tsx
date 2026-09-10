import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Key, 
  Building2, 
  User, 
  ShieldCheck, 
  CheckCircle2
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { FindeksSettings } from '../types';
import { saveFindeksSettings } from '../services/findeksService';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';

interface FindeksSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: FindeksSettings | null;
  onSaved: () => void;
}

export const FindeksSettingsModal: React.FC<FindeksSettingsModalProps> = ({
  open,
  onClose,
  settings,
  onSaved
}) => {
  const { user } = useAuth();
  const { notify } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [institutionCode, setInstitutionCode] = useState('');
  const [credits, setCredits] = useState<number>(85);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setUsername(settings.username || '');
      setPassword(settings.password || '');
      setInstitutionCode(settings.institution_code || '');
      setCredits(settings.remaining_credits ?? 85);
    }
  }, [settings, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;

    try {
      setSaving(true);
      await saveFindeksSettings(user.organizationId, {
        username,
        password,
        institution_code: institutionCode,
        remaining_credits: Number(credits) || 0,
        is_active: true
      });

      notify('Findeks hesap ve kontör bilgileri başarıyla güncellendi!', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Findeks ayar kaydetme hatası:', err);
      notify(err.message || 'Ayarlar kaydedilemedi', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Findeks Kurumsal Hesap & Kontör Ayarları"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Banner */}
        <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-950">
          <div className="font-bold flex items-center gap-1.5 text-emerald-900">
            <ShieldCheck size={16} className="text-emerald-600" />
            Findeks / KKB Kurumsal Entegrasyonu
          </div>
          <p className="text-gray-600 text-[11px]">
            Findeks'te tanımlı kurumsal üyelik veya mobil paket bilgilerinizi tanımlayarak çek sorgulama kontörlerinizi doğrudan sisteminizle eşitleyin.
          </p>
        </div>

        {/* Remaining Credits Field */}
        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Coins size={15} className="text-emerald-600" />
              Mevcut Findeks Çek Kontörü
            </label>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Canlı Takip
            </span>
          </div>
          <input
            type="number"
            min="0"
            max="100000"
            required
            value={credits}
            onChange={e => setCredits(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 bg-white"
            placeholder="Örn: 85"
          />
          <p className="text-[10px] text-gray-500">
            Her yeni karekodlu çek sorgulandığında bu kontörden 1 adet otomatik düşülür.
          </p>
        </div>

        {/* Username / VKN */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Findeks Kullanıcı Adı veya VKN / TCKN
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Örn: findeks_kurumsal_kullanici"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
            <User size={16} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Institution / Member Code */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            KKB / Findeks Kurum Kodu (Varsa)
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Örn: KKB-94812"
              value={institutionCode}
              onChange={e => setInstitutionCode(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
            <Building2 size={16} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Password / API Secret */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Findeks API / Web Servis Şifresi (Opsiyonel)
          </label>
          <div className="relative">
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
            <Key size={16} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            <span>{saving ? 'Kaydediliyor...' : 'Hesabı Kaydet & Güncelle'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
