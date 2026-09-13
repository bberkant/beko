import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import type { BillInvoice, InvoiceFormInput, InvoiceStatus } from '../types';

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: InvoiceFormInput) => Promise<void>;
  billId: string;
  billName: string;
  invoice?: BillInvoice | null;
}

export function InvoiceModal({
  open,
  onClose,
  onSubmit,
  billId,
  billName,
  invoice
}: InvoiceModalProps) {
  const [period, setPeriod] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState<string>('0');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [status, setStatus] = useState<InvoiceStatus>('odenecek');
  const [paidAt, setPaidAt] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (invoice) {
      setPeriod(invoice.period);
      setInvoiceNo(invoice.invoiceNo || '');
      setInvoiceDate(invoice.invoiceDate || '');
      setDueDate(invoice.dueDate);
      setAmount(String(invoice.amount));
      setPaidAmount(String(invoice.paidAmount));
      setStatus(invoice.status);
      setPaidAt(invoice.paidAt || '');
      setPaymentMethod(invoice.paymentMethod || '');
      setNotes(invoice.notes || '');
    } else {
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setPeriod(currentYearMonth);
      setInvoiceNo('');
      setInvoiceDate(now.toISOString().slice(0, 10));
      setDueDate(now.toISOString().slice(0, 10));
      setAmount('0');
      setPaidAmount('0');
      setStatus('odenecek');
      setPaidAt('');
      setPaymentMethod('Banka Transferi');
      setNotes('');
    }
  }, [invoice, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) return;

    setSubmitting(true);
    try {
      const numAmount = parseFloat(amount) || 0;
      const numPaid = status === 'odendi' ? numAmount : (parseFloat(paidAmount) || 0);

      await onSubmit({
        billId,
        period: period.trim() || new Date().toISOString().slice(0, 7),
        invoiceNo: invoiceNo.trim(),
        invoiceDate: invoiceDate || undefined,
        dueDate,
        amount: numAmount,
        paidAmount: numPaid,
        status,
        paidAt: status === 'odendi' ? (paidAt || new Date().toISOString().slice(0, 10)) : undefined,
        paymentMethod: paymentMethod.trim(),
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
      title={invoice ? 'Fatura Hareketini Düzenle' : `Yeni Fatura Ekle (${billName})`}
      description="Bu kuruma ait dönem faturası ve ödeme hareketini kaydedin."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Dönem (Ay/Yıl) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="input w-full font-medium"
              placeholder="Örn: 2026-08 veya Ağustos 2026"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Fatura Numarası
            </label>
            <input
              type="text"
              className="input w-full font-mono text-sm"
              placeholder="Örn: ELE202600084920"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Fatura Kesim Tarihi
            </label>
            <input
              type="date"
              className="input w-full font-medium"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Son Ödeme Tarihi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              className="input w-full font-medium"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Fatura Tutarı (₺) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="input w-full font-bold text-gray-900"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ödeme Durumu
            </label>
            <select
              className="input w-full font-semibold"
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
            >
              <option value="odenecek">Ödenecek</option>
              <option value="odendi">Ödendi</option>
              <option value="kismi">Kısmi Ödendi</option>
              <option value="gecikmede">Gecikmede</option>
            </select>
          </div>
        </div>

        {status === 'odendi' && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div>
              <label className="block text-xs font-semibold text-emerald-900 mb-1">
                Ödeme Tarihi
              </label>
              <input
                type="date"
                className="input w-full bg-white"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-900 mb-1">
                Ödeme Yöntemi / Kanalı
              </label>
              <input
                type="text"
                className="input w-full bg-white"
                placeholder="Örn: Ziraat Bankası, Nakit Kasa..."
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Açıklama / Notlar
          </label>
          <textarea
            className="input w-full text-xs"
            rows={2}
            placeholder="Fatura notları veya ödeme detayı..."
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
            {submitting ? 'Kaydediliyor...' : invoice ? 'Güncelle' : 'Fatura Ekle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
