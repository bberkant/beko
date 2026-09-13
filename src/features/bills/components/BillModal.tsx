import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { billCategoryConfig, formatNumberWithDots, parseFormattedNumber } from '../data/labels';
import type { CompanyBill, BillFormInput, BillCategory, BillCompany, BillStatus } from '../types';

interface BillModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: BillFormInput) => Promise<void>;
  bill?: CompanyBill | null;
}

export function BillModal({ open, onClose, onSubmit, bill }: BillModalProps) {
  const [name, setName] = useState('');
  const [subscriberNo, setSubscriberNo] = useState('');
  const [category, setCategory] = useState<BillCategory>('elektrik');
  const [company, setCompany] = useState<BillCompany>('GENEL');
  const [autoPayment, setAutoPayment] = useState(false);
  const [autoPaymentBank, setAutoPaymentBank] = useState('');
  const [currentAmount, setCurrentAmount] = useState<string>('0');
  const [dueDate, setDueDate] = useState('');
  const [billStatus, setBillStatus] = useState<BillStatus>('odenecek');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bill) {
      setName(bill.name);
      setSubscriberNo(bill.subscriberNo);
      setCategory(bill.category);
      setCompany(bill.company || 'GENEL');
      setAutoPayment(bill.autoPayment);
      setAutoPaymentBank(bill.autoPaymentBank || '');
      setCurrentAmount(formatNumberWithDots(bill.currentAmount));
      setDueDate(bill.dueDate);
      setBillStatus(bill.billStatus);
      setNotes(bill.notes || '');
    } else {
      setName('');
      setSubscriberNo('');
      setCategory('elektrik');
      setCompany('GENEL');
      setAutoPayment(false);
      setAutoPaymentBank('');
      setCurrentAmount('0');
      setDueDate(new Date().toISOString().slice(0, 10));
      setBillStatus('odenecek');
      setNotes('');
    }
  }, [bill, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        subscriberNo: subscriberNo.trim(),
        category,
        company,
        autoPayment,
        autoPaymentBank: autoPayment ? autoPaymentBank.trim() : '',
        currentAmount: parseFormattedNumber(currentAmount),
        dueDate,
        billStatus,
        notes: notes.trim()
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
      title={bill ? 'Faturayı Düzenle' : 'Yeni Fatura / Kurum Ekle'}
      description="Şirket adına kayıtlı kurum ve abonelik faturası bilgilerini girin."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Fatura / Kurum Adı <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input w-full font-medium"
            placeholder="Örn: İlkadım Elektrik, YEDAŞ, SASKİ..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Abone / Tesisat No
            </label>
            <input
              type="text"
              className="input w-full font-mono text-sm"
              placeholder="Örn: 4003036514"
              value={subscriberNo}
              onChange={(e) => setSubscriberNo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Hizmet Türü
            </label>
            <select
              className="input w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as BillCategory)}
            >
              {Object.entries(billCategoryConfig).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Fatura Tutarı (₺)
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="input w-full font-bold text-gray-900"
              placeholder="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(formatNumberWithDots(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Son Ödeme Tarihi
            </label>
            <input
              type="date"
              className="input w-full font-medium"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Durum
          </label>
          <select
            className="input w-full font-semibold"
            value={billStatus}
            onChange={(e) => setBillStatus(e.target.value as BillStatus)}
          >
            <option value="odenecek">Ödenecek</option>
            <option value="odendi">Ödendi</option>
            <option value="gecikmede">Gecikmede</option>
          </select>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoPayment"
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              checked={autoPayment}
              onChange={(e) => {
                const checked = e.target.checked;
                setAutoPayment(checked);
                if (!checked) setAutoPaymentBank('');
              }}
            />
            <label htmlFor="autoPayment" className="text-xs font-medium text-gray-700 select-none cursor-pointer">
              Otomatik Ödeme Talimatı Var
            </label>
          </div>

          {autoPayment && (
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 space-y-1">
              <label className="block text-xs font-semibold text-blue-900">
                Otomatik Ödeme Talimat Yeri / Banka Bilgisi
              </label>
              <input
                type="text"
                className="input w-full bg-white text-sm"
                placeholder="Örn: Ziraat Bankası, Kuveyt Türk Şirket Kartı..."
                value={autoPaymentBank}
                onChange={(e) => setAutoPaymentBank(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Notlar / Açıklama
          </label>
          <textarea
            className="input w-full text-xs"
            rows={2}
            placeholder="Tesisat bilgisi, sayaç no veya fatura notu..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            İptal
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Kaydediliyor...' : bill ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
