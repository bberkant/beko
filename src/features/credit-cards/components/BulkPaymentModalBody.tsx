import { useMemo, useState } from 'react';
import type { CreditCard, Payment } from '../types';
import { formatTRY } from '../data/labels';

export interface BulkPaymentData {
  date: string;
  type: Payment['type'];
  bankAccount: string;
  description: string;
  payments: Array<{ cardId: string; amount: number }>;
}

interface BulkPaymentModalBodyProps {
  cards: CreditCard[];
  submitting: boolean;
  onSubmit: (data: BulkPaymentData) => void;
}

export function BulkPaymentModalBody({ cards, submitting, onSubmit }: BulkPaymentModalBodyProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<Payment['type']>('tam-odeme');
  const [bankAccount, setBankAccount] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const toggleCard = (card: CreditCard) => {
    setSelected((current) => ({ ...current, [card.id]: !current[card.id] }));
    setAmounts((current) => ({
      ...current,
      [card.id]: current[card.id] ?? (card.currentDebt > 0 ? String(card.currentDebt) : ''),
    }));
  };

  const submit = () => {
    const payments = cards
      .filter((card) => selected[card.id])
      .map((card) => ({ cardId: card.id, amount: Number(amounts[card.id]) || 0 }))
      .filter((payment) => payment.amount > 0);
    onSubmit({ date, type, bankAccount, description, payments });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Ödeme Tarihi</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Ödeme Tipi</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as Payment['type'])}>
            <option value="tam-odeme">Tam Ödeme</option>
            <option value="asgari-odeme">Asgari Ödeme</option>
            <option value="kismi-odeme">Kısmi Ödeme</option>
            <option value="duzeltme">Düzeltme</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Ödeme Yapılan Banka Hesabı</label>
        <input className="input" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Banka ve hesap bilgisi (opsiyonel)" />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="label !mb-0">Kartlar ve Ödeme Tutarları</label>
          <span className="text-xs text-gray-500">{selectedCount} kart seçildi</span>
        </div>
        <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200">
          {cards.map((card) => (
            <div key={card.id} className="grid grid-cols-[auto_1fr_140px] items-center gap-3 border-b border-gray-100 p-3 last:border-b-0">
              <input type="checkbox" checked={Boolean(selected[card.id])} onChange={() => toggleCard(card)} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
              <button type="button" className="min-w-0 text-left" onClick={() => toggleCard(card)}>
                <span className="block truncate text-sm font-medium text-gray-900">{card.bank} · •••• {card.last4}</span>
                <span className="block text-xs text-gray-500">Güncel borç: {formatTRY(card.currentDebt)}</span>
              </button>
              <input
                type="number"
                min="0"
                className="input !py-2 text-right"
                value={amounts[card.id] ?? ''}
                onChange={(e) => setAmounts((current) => ({ ...current, [card.id]: e.target.value }))}
                disabled={!selected[card.id]}
                placeholder="Tutar"
              />
            </div>
          ))}
          {cards.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Ödeme kaydı eklenebilecek kart bulunamadı.</p>}
        </div>
      </div>

      <div>
        <label className="label">Açıklama</label>
        <textarea className="input min-h-[64px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Açıklama (opsiyonel)" />
      </div>

      <button className="btn-primary w-full" onClick={submit} disabled={submitting || selectedCount === 0}>
        {submitting ? 'Ödemeler Kaydediliyor...' : `${selectedCount || ''} Toplu Ödeme Kaydını Ekle`}
      </button>
    </div>
  );
}
