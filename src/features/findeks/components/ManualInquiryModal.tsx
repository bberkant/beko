import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Search, 
  User
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { ParsedCheckQR } from '../types';
import { TURKISH_BANKS } from '../utils/turkishBanks';

interface ManualInquiryModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (parsed: ParsedCheckQR) => void;
  loading?: boolean;
}

export const ManualInquiryModal: React.FC<ManualInquiryModalProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [bankCode, setBankCode] = useState<string>('0046'); // Default Akbank
  const [branchCode, setBranchCode] = useState<string>('0100');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [drawerName, setDrawerName] = useState<string>('');
  const [drawerTcknVkn, setDrawerTcknVkn] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankCode || !checkNumber) return;

    const selectedBank = TURKISH_BANKS[bankCode] || { name: 'Banka' };

    const parsed: ParsedCheckQR = {
      raw: `MANUAL_${bankCode}_${branchCode}_${accountNumber}_${checkNumber}`,
      bankCode,
      bankName: selectedBank.name,
      branchCode: branchCode || '0001',
      accountNumber: accountNumber || '1000001',
      checkNumber: checkNumber.trim(),
      drawerTcknVkn: drawerTcknVkn.trim() || undefined,
      amount: amount ? Number(amount) : undefined,
      dueDate: dueDate || undefined,
      isValid: true
    };

    onSubmit(parsed);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manuel Çek Bilgisi ile Findeks Sorgula"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-500">
          Karekodu yıpranmış veya okunamayan çeklerin banka ve seri numaralarını girerek Findeks risk endeksini anında sorgulayabilirsiniz.
        </p>

        {/* Bank Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Muhatap Banka *
          </label>
          <div className="relative">
            <select
              value={bankCode}
              onChange={e => setBankCode(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
              required
            >
              {Object.entries(TURKISH_BANKS).map(([code, bank]) => (
                <option key={code} value={code}>
                  {bank.name} ({code})
                </option>
              ))}
            </select>
            <Building2 size={16} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Check Number & Branch */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Çek Numarası (Seri No) *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Örn: 00458921"
                value={checkNumber}
                onChange={e => setCheckNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl font-bold text-gray-900 tracking-wider focus:ring-2 focus:ring-emerald-500"
              />
              <CreditCard size={16} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Şube Kodu
            </label>
            <input
              type="text"
              placeholder="Örn: 0123"
              value={branchCode}
              onChange={e => setBranchCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Account Number & TCKN / VKN */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Hesap Numarası
            </label>
            <input
              type="text"
              placeholder="Örn: 10098765"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Keşideci VKN / TCKN
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="10 veya 11 hane"
                value={drawerTcknVkn}
                onChange={e => setDrawerTcknVkn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
              <User size={16} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Keşideci Adı / Ünvanı */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Keşideci Firma / Şahıs Ünvanı (Opsiyonel)
          </label>
          <input
            type="text"
            placeholder="Örn: Anadolu Gıda San. ve Tic. Ltd. Şti."
            value={drawerName}
            onChange={e => setDrawerName(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Amount & Due Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Çek Tutarı (₺)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-xl font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
              />
              <DollarSign size={16} className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Vade Tarihi
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
              <Calendar size={16} className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading || !checkNumber}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Search size={14} />
            <span>{loading ? 'Sorgulanıyor...' : 'Findeks Raporunu Getir'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
