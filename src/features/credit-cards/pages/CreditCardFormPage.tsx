import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useToast } from '../../../lib/toast';
import { useStore } from '../data/store';
import type { CardType, CardStatus, Currency } from '../types';
import { cardTypeLabel, currencyLabel } from '../data/labels';

export function CreditCardFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { notify } = useToast();
  const { getCard, addCard, updateCard } = useStore();

  const existing = id ? getCard(id) : undefined;

  const [bank, setBank] = useState(existing?.bank ?? '');
  const [cardName, setCardName] = useState(existing?.cardName ?? '');
  const [cardType, setCardType] = useState<CardType>(existing?.cardType ?? 'business');
  const [last4, setLast4] = useState(existing?.last4 ?? '');
  const [holder, setHolder] = useState(existing?.holder ?? '');
  const [department, setDepartment] = useState(existing?.department ?? '');
  const [limit, setLimit] = useState(String(existing?.limit ?? ''));
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? 'TRY');
  const [statementDay, setStatementDay] = useState(String(existing?.statementDay ?? '15'));
  const [dueDay, setDueDay] = useState(String(existing?.dueDay ?? '5'));
  const [minPaymentPercent, setMinPaymentPercent] = useState(String(existing ? Math.round(existing.minPaymentRate * 100) : 40));
  const [startDate, setStartDate] = useState(existing?.startDate ?? '2026-01-01');
  const [expiryMonth, setExpiryMonth] = useState(String(existing?.expiryMonth ?? '12'));
  const [expiryYear, setExpiryYear] = useState(String(existing?.expiryYear ?? '2028'));
  const [status, setStatus] = useState<CardStatus>(existing?.status ?? 'aktif');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!bank || !last4) {
      notify('Lütfen zorunlu alanları doldurun.', 'error');
      return;
    }
    if (!/^[0-9]{4}$/.test(last4)) {
      notify('Son 4 hane tam olarak 4 rakam olmalıdır.', 'error');
      return;
    }
    const parsedMinPaymentPercent = Number(minPaymentPercent);
    if (!Number.isFinite(parsedMinPaymentPercent) || parsedMinPaymentPercent < 0 || parsedMinPaymentPercent > 100) {
      notify('Asgari ödeme oranı %0 ile %100 arasında olmalıdır.', 'error');
      return;
    }
    const input = {
      bank, cardName: cardName.trim() || 'Kredi Kartı', cardType, last4, holder, department,
      limit: Number(limit) || 0, currency,
      statementDay: Number(statementDay) || 1,
      dueDay: Number(dueDay) || 1,
      minPaymentRate: parsedMinPaymentPercent / 100,
      startDate,
      expiryMonth: Number(expiryMonth) || 1,
      expiryYear: Number(expiryYear) || 2028,
      status, description,
    };
    setSaving(true);
    try {
      if (existing) {
        await updateCard(existing.id, input);
        notify('Kart güncellendi.', 'success');
      } else {
        await addCard(input);
        notify('Yeni kart eklendi.', 'success');
      }
      navigate('/finance/credit-cards');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kart kaydedilemedi.';
      notify(`Kart kaydedilemedi: ${message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={existing ? 'Kart Düzenle' : 'Yeni Kart Ekle'}
        description={existing ? `${existing.bank} ${existing.cardName} •••• ${existing.last4}` : 'Şirket kredi kartı bilgilerini girin.'}
        backTo="/finance/credit-cards"
        backLabel="Kart Listesi"
      />
      <div className="card p-6">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Banka *</label>
              <input className="input" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Garanti BBVA" />
            </div>
            <div>
              <label className="label">Kart Adı</label>
              <input className="input" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Kredi Kartı (opsiyonel)" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Kart Tipi</label>
              <select className="input" value={cardType} onChange={(e) => setCardType(e.target.value as CardType)}>
                {Object.entries(cardTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Son 4 Hane *</label>
              <input className="input" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value)} placeholder="4821" />
            </div>
            <div>
              <label className="label">Para Birimi</label>
              <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                {Object.entries(currencyLabel).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Kartı Kullanan</label>
              <input className="input" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Ahmet Yılmaz" />
            </div>
            <div>
              <label className="label">Departman</label>
              <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Satın Alma" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Kart Limiti (₺)</label>
              <input type="number" className="input" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="850000" />
            </div>
            <div>
              <label className="label">Kesim Günü</label>
              <input type="number" className="input" value={statementDay} onChange={(e) => setStatementDay(e.target.value)} min={1} max={31} />
            </div>
            <div>
              <label className="label">Son Ödeme Günü</label>
              <input type="number" className="input" value={dueDay} onChange={(e) => setDueDay(e.target.value)} min={1} max={31} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Asgari Ödeme Oranı (%)</label>
              <div className="relative">
                <input type="number" min="0" max="100" step="1" className="input pr-9" value={minPaymentPercent} onChange={(e) => setMinPaymentPercent(e.target.value)} placeholder="40" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="label">Başlangıç Tarihi</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Durum</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as CardStatus)}>
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
                <option value="bloke">Bloke</option>
                <option value="yenileme-bekliyor">Yenileme Bekliyor</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Son Kullanma Ayı</label>
              <input type="number" className="input" value={expiryMonth} onChange={(e) => setExpiryMonth(e.target.value)} min={1} max={12} />
            </div>
            <div>
              <label className="label">Son Kullanma Yılı</label>
              <input type="number" className="input" value={expiryYear} onChange={(e) => setExpiryYear(e.target.value)} placeholder="2028" />
            </div>
          </div>
          <div>
            <label className="label">Açıklama</label>
            <textarea className="input min-h-[72px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Açıklama (opsiyonel)" />
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <button className="btn-ghost" onClick={() => navigate('/finance/credit-cards')}>İptal</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Kaydediliyor...' : existing ? 'Güncelle' : 'Kaydet'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
