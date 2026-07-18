import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Upload, Download, SlidersHorizontal, Search,
  AlertTriangle, CreditCard as CreditCardIcon, Wallet, Clock, Gauge, AlertOctagon, Eye, ReceiptText,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../lib/toast';
import { useStore } from '../data/store';
import type { CreditCard as CreditCardType, StatementStatus } from '../types';
import {
  formatTRY, maskCard, limitUsage, usageLevel,
  cardStatusLabel, cardStatusCls,
  statementStatusLabel, statementStatusCls,
} from '../data/labels';
import { CardRowMenu } from '../components/CardRowMenu';
import { DueDateCell } from '../components/DueDateCell';
import { UploadStatementModalBody, UploadProgress, type StatementUploadData } from '../components/UploadStatementModal';
import { BulkPaymentModalBody, type BulkPaymentData } from '../components/BulkPaymentModalBody';
import { PaymentModalBody } from '../components/PaymentModalBody';
import type { Payment } from '../types';
import { resolveCardDueDate } from '../lib/billingDateEngine';

interface Filters {
  bank: string;
  status: string;
  dueRange: string;
  holder: string;
  usageRange: string;
  statementStatus: string;
}

const emptyFilters: Filters = {
  bank: '', status: '', dueRange: '', holder: '', usageRange: '', statementStatus: '',
};

export function CreditCardListPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { cards, statements, addStatement, addPayment } = useStore();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [uploadCard, setUploadCard] = useState<CreditCardType | null>(null);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [bulkPaymentOpen, setBulkPaymentOpen] = useState(false);
  const [bulkPaymentSubmitting, setBulkPaymentSubmitting] = useState(false);
  const [paymentCard, setPaymentCard] = useState<CreditCardType | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const banks = useMemo(() => Array.from(new Set(cards.map((c) => c.bank))), [cards]);
  const holders = useMemo(() => Array.from(new Set(cards.map((c) => c.holder).filter(Boolean))), [cards]);

  const filtered = useMemo(() => {
    const dueDates = new Map(
      cards.map((card) => [card.id, resolveCardDueDate(card, statements).date]),
    );

    return cards.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const hit =
          c.bank.toLowerCase().includes(q) ||
          c.cardName.toLowerCase().includes(q) ||
          c.last4.includes(q) ||
          c.holder.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (filters.bank && c.bank !== filters.bank) return false;
      if (filters.status && c.status !== filters.status) return false;
      if (filters.holder && c.holder !== filters.holder) return false;
      if (filters.statementStatus && c.statementStatus !== filters.statementStatus) return false;
      const usage = limitUsage(c.currentDebt, c.limit);
      if (filters.usageRange === 'normal' && usage >= 70) return false;
      if (filters.usageRange === 'dikkat' && (usage < 70 || usage >= 90)) return false;
      if (filters.usageRange === 'kritik' && usage < 90) return false;
      if (filters.dueRange) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(today.getFullYear(), today.getMonth(), c.dueDay);
        const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
        if (filters.dueRange === 'overdue' && diff >= 0) return false;
        if (filters.dueRange === '7days' && (diff < 0 || diff > 7)) return false;
        if (filters.dueRange === '30days' && (diff < 0 || diff > 30)) return false;
      }
      return true;
    }).sort((a, b) => {
      const dueDateComparison = (dueDates.get(a.id) ?? '').localeCompare(dueDates.get(b.id) ?? '');
      if (dueDateComparison !== 0) return dueDateComparison;
      return a.bank.localeCompare(b.bank, 'tr');
    });
  }, [cards, statements, search, filters]);

  const kpis = useMemo(() => {
    const totalLimit = cards.reduce((s, c) => s + c.limit, 0);
    const totalDebt = cards.reduce((s, c) => s + c.currentDebt, 0);
    const today = new Date();
    const in7 = cards
      .filter((c) => {
        const due = new Date(today.getFullYear(), today.getMonth(), c.dueDay);
        const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
        return diff >= 0 && diff <= 7 && c.currentDebt > 0;
      })
      .reduce((s, c) => s + c.currentDebt, 0);
    const avgUsage = cards.length > 0
      ? Math.round(cards.reduce((s, c) => s + limitUsage(c.currentDebt, c.limit), 0) / cards.length)
      : 0;
    const critical = cards.filter(
      (c) => usageLevel(limitUsage(c.currentDebt, c.limit)) === 'kritik' || c.status === 'bloke',
    ).length;
    return { total: cards.length, totalLimit, totalDebt, in7, avgUsage, critical };
  }, [cards]);

  const handleUploadSubmit = (data: StatementUploadData) => {
    if (!uploadCard) return;
    setProgress({ percent: 0, status: 'Yükleniyor' });
    let p = 0;
    const timer = window.setInterval(() => {
      p += 10;
      if (p >= 100) {
        p = 100;
        setProgress({ percent: 100, status: 'Analiz Bekliyor' });
        window.clearInterval(timer);
        addStatement({
          cardId: uploadCard.id,
          period: data.period,
          statementDate: data.statementDate,
          dueDate: data.dueDate,
          totalDebt: data.totalDebt,
          minPayment: data.minPayment,
          note: data.note,
          fileName: data.fileName,
          transactions: data.transactions,
        });
        notify(`${uploadCard.cardName} •••• ${uploadCard.last4} için ${data.period} ekstresi yüklendi.`, 'success');
        window.setTimeout(() => {
          setUploadCard(null);
          setProgress(null);
        }, 900);
      } else {
        setProgress({ percent: p, status: p < 60 ? 'Yükleniyor' : 'Analiz Bekliyor' });
      }
    }, 250);
  };

  const handleBulkPaymentSubmit = async (data: BulkPaymentData) => {
    if (data.payments.length === 0) {
      notify('En az bir kart seçin ve sıfırdan büyük ödeme tutarı girin.', 'error');
      return;
    }
    setBulkPaymentSubmitting(true);
    try {
      await Promise.all(data.payments.map((payment) => addPayment({
        cardId: payment.cardId,
        date: data.date,
        amount: payment.amount,
        type: data.type,
        bankAccount: data.bankAccount,
        description: data.description,
      })));
      notify(`${data.payments.length} kart için ödeme kaydı eklendi.`, 'success');
      setBulkPaymentOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ödeme kayıtları eklenemedi.';
      notify(`Toplu ödeme kaydedilemedi: ${message}`, 'error');
    } finally {
      setBulkPaymentSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (data: { date: string; amount: number; type: Payment['type']; bankAccount: string; description: string }) => {
    if (!paymentCard) return;
    if (data.amount <= 0) {
      notify('Ödeme tutarı sıfırdan büyük olmalıdır.', 'error');
      return;
    }
    setPaymentSubmitting(true);
    try {
      await addPayment({ cardId: paymentCard.id, ...data });
      notify(`${paymentCard.bank} •••• ${paymentCard.last4} için ödeme kaydı eklendi.`, 'success');
      setPaymentCard(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ödeme kaydı eklenemedi.';
      notify(`Ödeme kaydı eklenemedi: ${message}`, 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const kpiList = [
    { id: 'total', label: 'Toplam Kart Sayısı', value: String(kpis.total), icon: CreditCardIcon, hint: 'tüm kartlar' },
    { id: 'limit', label: 'Toplam Kart Limiti', value: formatTRY(kpis.totalLimit), icon: Wallet, hint: 'birleşik limit' },
    { id: 'debt', label: 'Toplam Güncel Borç', value: formatTRY(kpis.totalDebt), icon: CreditCardIcon, hint: 'tüm kartlar' },
    { id: 'in7', label: '7 Gün İçinde Ödenecek', value: formatTRY(kpis.in7), icon: Clock, hint: 'yaklaşan' },
    { id: 'avg', label: 'Ortalama Limit Kullanımı', value: `%${kpis.avgUsage}`, icon: Gauge, hint: 'tüm kartlar' },
    { id: 'crit', label: 'Kritik Durumdaki Kartlar', value: String(kpis.critical), icon: AlertOctagon, hint: 'kritik' },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Kredi Kartları"
        description="Şirket kredi kartlarını, borçlarını, limitlerini ve son ödeme tarihlerini yönetin."
        actions={
          <>
            <button className="btn-secondary" onClick={() => setBulkPaymentOpen(true)}>
              <ReceiptText size={16} /> Toplu Ödeme Gir
            </button>
            <button className="btn-secondary" onClick={() => setCardPickerOpen(true)}>
              <Upload size={16} /> Ekstre Yükle
            </button>
            <button className="btn-secondary" onClick={() => notify('Kart listesi dışa aktarıldı (mock).', 'success')}>
              <Download size={16} /> Dışa Aktar
            </button>
            <button className="btn-primary" onClick={() => navigate('/finance/credit-cards/new')}>
              <Plus size={16} /> Yeni Kart Ekle
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpiList.map((k) => {
          const Icon = k.icon;
          const isCritical = k.id === 'crit' && kpis.critical > 0;
          return (
            <div key={k.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                  <Icon size={15} />
                </span>
                {isCritical && <span className="h-2 w-2 rounded-full bg-red-500" />}
              </div>
              <p className="mt-3 text-lg font-semibold tracking-tight text-gray-900">{k.value}</p>
              <p className="mt-0.5 text-xs font-medium text-gray-600">{k.label}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">{k.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Banka, kart adı, son 4 hane veya personel ara..."
            className="input pl-9" />
        </div>
        <button className="btn-secondary" onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal size={16} /> Filtrele
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 card p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Banka</label>
              <select className="input" value={filters.bank} onChange={(e) => setFilters((f) => ({ ...f, bank: e.target.value }))}>
                <option value="">Tüm bankalar</option>
                {banks.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Durum</label>
              <select className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                <option value="">Tüm durumlar</option>
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
                <option value="bloke">Bloke</option>
                <option value="yenileme-bekliyor">Yenileme Bekliyor</option>
              </select>
            </div>
            <div>
              <label className="label">Son ödeme aralığı</label>
              <select className="input" value={filters.dueRange} onChange={(e) => setFilters((f) => ({ ...f, dueRange: e.target.value }))}>
                <option value="">Tümü</option>
                <option value="overdue">Gecikmiş</option>
                <option value="7days">7 gün içinde</option>
                <option value="30days">30 gün içinde</option>
              </select>
            </div>
            <div>
              <label className="label">Kartı kullanan personel</label>
              <select className="input" value={filters.holder} onChange={(e) => setFilters((f) => ({ ...f, holder: e.target.value }))}>
                <option value="">Tüm personel</option>
                {holders.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Limit kullanım oranı</label>
              <select className="input" value={filters.usageRange} onChange={(e) => setFilters((f) => ({ ...f, usageRange: e.target.value }))}>
                <option value="">Tümü</option>
                <option value="normal">Normal (%0–69)</option>
                <option value="dikkat">Dikkat (%70–89)</option>
                <option value="kritik">Kritik (%90+)</option>
              </select>
            </div>
            <div>
              <label className="label">Ekstre durumu</label>
              <select className="input" value={filters.statementStatus} onChange={(e) => setFilters((f) => ({ ...f, statementStatus: e.target.value }))}>
                <option value="">Tümü</option>
                <option value="yuklendi">Yüklendi</option>
                <option value="bekleniyor">Bekleniyor</option>
                <option value="isleniyor">İşleniyor</option>
                <option value="hata">Hata</option>
                <option value="bu-ay-eksik">Bu ay eksik</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn-ghost" onClick={() => setFilters(emptyFilters)}>Filtreleri Temizle</button>
          </div>
        </div>
      )}

      {/* Desktop table — hidden below lg */}
      <div className="hidden lg:block card overflow-visible">
        <div>
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="table-th w-[16%] !px-2">Kart</th>
                <th className="table-th w-[8%] !px-2">Son 4</th>
                <th className="table-th w-[10%] !px-2">Hesap Kesim Tarihi</th>
                <th className="table-th w-[16%] !px-2">Son Ödeme</th>
                <th className="table-th w-[9%] !px-2">Limit</th>
                <th className="table-th w-[9%] !px-2">Borç</th>
                <th className="table-th w-[10%] !px-2">Kullanan</th>
                <th className="table-th w-[8%] !px-2">Ekstre</th>
                <th className="table-th w-[7%] !px-2">Durum</th>
                <th className="table-th w-[5%] !px-1 text-center" aria-label="İşlemler"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => {
                const dueDate = resolveCardDueDate(c, statements);
                return (
                  <tr key={c.id} className="hover:bg-gray-50/40">
                    <td className="table-td !px-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-[10px] font-semibold text-gray-600">{c.bankShort}</span>
                        <div className="min-w-0"><button className="block max-w-full truncate font-medium text-brand-600 hover:text-brand-700" onClick={() => navigate(`/finance/credit-cards/${c.id}`)}>{c.bank}</button><span className="block truncate text-[11px] text-gray-400">{c.cardName}</span></div>
                      </div>
                    </td>
                    <td className="table-td !px-2 !text-sm font-mono text-gray-700">{maskCard(c.last4)}</td>
                    <td className="table-td !px-2 !text-sm font-semibold text-gray-900">{c.statementDay}. gün</td>
                    <td className="table-td !px-2 !text-xs"><DueDateCell dueDate={dueDate.date} statementStatus={c.statementStatus} /></td>
                    <td className="table-td !px-2 !text-xs text-gray-700">{formatTRY(c.limit)}</td>
                    <td className="table-td !px-2 !text-xs font-normal text-gray-900">{formatTRY(c.currentDebt)}</td>
                    <td className="table-td truncate !px-2 !text-xs text-gray-700">{c.holder || '—'}</td>
                    <td className="table-td !px-2">
                      <div className="flex items-center gap-1.5">
                        {(c.statementStatus === 'bu-ay-eksik' || c.statementStatus === 'bekleniyor') && <AlertTriangle size={13} className="text-amber-400" />}
                        <Badge className={statementStatusCls[c.statementStatus as StatementStatus]}>{statementStatusLabel[c.statementStatus as StatementStatus]}</Badge>
                      </div>
                    </td>
                    <td className="table-td !px-2"><Badge className={cardStatusCls[c.status]}>{cardStatusLabel[c.status]}</Badge></td>
                    <td className="table-td !px-1 text-center">
                      <CardRowMenu card={c} onUploadStatement={() => { setUploadCard(c); setProgress(null); }} onAddPayment={() => setPaymentCard(c)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Filtrelere uyan kart bulunamadı.</div>}
      </div>

      {/* Mobile/tablet cards — shown below lg */}
      <div className="space-y-3 lg:hidden">
        {filtered.map((c) => {
          const usage = limitUsage(c.currentDebt, c.limit);
          const level = usageLevel(usage);
          const available = c.limit - c.currentDebt;
          const dueDate = resolveCardDueDate(c, statements);
          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-600">{c.bankShort}</span>
                  <div>
                    <button className="text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={() => navigate(`/finance/credit-cards/${c.id}`)}>
                      {c.bank}
                    </button>
                    <p className="text-xs text-gray-500">{c.cardName} · <span className="font-mono">{maskCard(c.last4)}</span></p>
                  </div>
                </div>
                <Badge className={cardStatusCls[c.status]}>{cardStatusLabel[c.status]}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-400">Kartı Kullanan</p>
                  <p className="font-medium text-gray-700">{c.holder || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Güncel Borç</p>
                  <p className="font-medium text-gray-700">{formatTRY(c.currentDebt)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Kart Limiti</p>
                  <p className="font-medium text-gray-700">{formatTRY(c.limit)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Kullanılabilir</p>
                  <p className="font-medium text-gray-700">{formatTRY(available)}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Limit Kullanımı</span>
                </div>
                <ProgressBar value={usage} level={level} showLabel />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-400">Son Ödeme</p>
                  <DueDateCell dueDate={dueDate.date} statementStatus={c.statementStatus} />
                </div>
                <div>
                  <p className="text-gray-400">Ekstre Durumu</p>
                  <div className="flex items-center gap-1.5">
                    {(c.statementStatus === 'bu-ay-eksik' || c.statementStatus === 'bekleniyor') && <AlertTriangle size={13} className="text-amber-400" />}
                    <Badge className={statementStatusCls[c.statementStatus as StatementStatus]}>{statementStatusLabel[c.statementStatus as StatementStatus]}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => navigate(`/finance/credit-cards/${c.id}`)}>
                  <Eye size={14} /> Görüntüle
                </button>
                <CardRowMenu card={c} onUploadStatement={() => { setUploadCard(c); setProgress(null); }} onAddPayment={() => setPaymentCard(c)} />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Filtrelere uyan kart bulunamadı.</div>}
      </div>

      {/* Upload statement modal */}
      <Modal
        open={cardPickerOpen}
        onClose={() => setCardPickerOpen(false)}
        title="Ekstre Yüklenecek Kartı Seçin"
        description="Ekstreyi ilişkilendirmek istediğiniz kredi kartını seçin."
        size="md"
      >
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {cards.map((card) => (
            <button
              key={card.id}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-brand-300 hover:bg-brand-50/40"
              onClick={() => { setCardPickerOpen(false); setUploadCard(card); setProgress(null); }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-600">{card.bankShort}</span>
              <span>
                <span className="block text-sm font-medium text-gray-900">{card.bank} {card.cardName}</span>
                <span className="block text-xs text-gray-500">•••• {card.last4}{card.holder ? ` · ${card.holder}` : ''}</span>
              </span>
            </button>
          ))}
          {cards.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Önce bir kredi kartı eklemelisiniz.</p>}
        </div>
      </Modal>

      <Modal
        open={Boolean(uploadCard)}
        onClose={() => { setUploadCard(null); setProgress(null); }}
        title="Ekstre Yükle"
        description={uploadCard ? `${uploadCard.bank} ${uploadCard.cardName} •••• ${uploadCard.last4}` : ''}
        size="md"
      >
        {uploadCard && (
          <UploadStatementModalBody card={uploadCard} progress={progress} onSubmit={handleUploadSubmit} />
        )}
      </Modal>

      <Modal
        open={bulkPaymentOpen}
        onClose={() => { if (!bulkPaymentSubmitting) setBulkPaymentOpen(false); }}
        title="Toplu Ödeme Gir"
        description="Birden fazla kredi kartı için tek işlemde ödeme kaydı oluşturun."
        size="lg"
      >
        <BulkPaymentModalBody
          cards={cards.filter((card) => card.status !== 'pasif')}
          statements={statements}
          submitting={bulkPaymentSubmitting}
          onSubmit={(data) => void handleBulkPaymentSubmit(data)}
        />
      </Modal>

      <Modal
        open={Boolean(paymentCard)}
        onClose={() => { if (!paymentSubmitting) setPaymentCard(null); }}
        title="Ödeme Kaydı Ekle"
        description={paymentCard ? `${paymentCard.bank} ${paymentCard.cardName} •••• ${paymentCard.last4}` : ''}
        size="md"
      >
        {paymentCard && <PaymentModalBody onSubmit={(data) => void handlePaymentSubmit(data)} />}
      </Modal>
    </div>
  );
}
