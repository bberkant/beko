import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Pencil, Upload, CreditCard as CreditCardIcon, Wallet, Clock, Gauge,
  FileText, ArrowLeft,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Tabs } from '../../../components/ui/Tabs';
import { SectionCard } from '../../../components/ui/SectionCard';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../lib/toast';
import { useStore } from '../data/store';
import {
  formatTRY, formatDate, maskCard, limitUsage, usageLevel,
  cardStatusLabel, cardStatusCls,
  statementStatusLabel, statementStatusCls,
  aiStatusLabel, aiStatusCls,
  paymentStatusLabel, paymentStatusCls,
  cardTypeLabel, currencyLabel,
  paymentTypeLabel,
} from '../data/labels';
import { DueDateCell } from '../components/DueDateCell';
import { UploadStatementModalBody, UploadProgress } from '../components/UploadStatementModal';
import { PaymentModalBody } from '../components/PaymentModalBody';

export function CreditCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { getCard, getStatementsByCard, getPaymentsByCard, addStatement, addPayment } = useStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const card = id ? getCard(id) : undefined;

  const statements = useMemo(() => id ? getStatementsByCard(id) : [], [id, getStatementsByCard]);
  const payments = useMemo(() => id ? getPaymentsByCard(id) : [], [id, getPaymentsByCard]);

  if (!card) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-gray-500">Kart bulunamadı.</p>
        <button className="btn-secondary mt-3" onClick={() => navigate('/finance/credit-cards')}>
          <ArrowLeft size={16} /> Kart Listesi
        </button>
      </div>
    );
  }

  const usage = limitUsage(card.currentDebt, card.limit);
  const level = usageLevel(usage);
  const available = card.limit - card.currentDebt;

  const handleUploadSubmit = (data: { period: string; statementDate: string; dueDate: string; totalDebt: number; minPayment: number; note: string }) => {
    setProgress({ percent: 0, status: 'Yükleniyor' });
    let p = 0;
    const timer = window.setInterval(() => {
      p += 10;
      if (p >= 100) {
        p = 100;
        setProgress({ percent: 100, status: 'Analiz Bekliyor' });
        window.clearInterval(timer);
        addStatement({
          cardId: card.id,
          period: data.period,
          statementDate: data.statementDate,
          dueDate: data.dueDate,
          totalDebt: data.totalDebt,
          minPayment: data.minPayment,
          note: data.note,
        });
        notify(`${card.cardName} •••• ${card.last4} için ${data.period} ekstresi yüklendi.`, 'success');
        window.setTimeout(() => {
          setUploadOpen(false);
          setProgress(null);
        }, 900);
      } else {
        setProgress({ percent: p, status: p < 60 ? 'Yükleniyor' : 'Analiz Bekliyor' });
      }
    }, 250);
  };

  const handlePaymentSubmit = (data: { date: string; amount: number; type: string; bankAccount: string; description: string }) => {
    addPayment({
      cardId: card.id,
      date: data.date,
      amount: data.amount,
      type: data.type as any,
      bankAccount: data.bankAccount,
      description: data.description,
    });
    notify('Ödeme kaydı eklendi.', 'success');
    setPaymentOpen(false);
  };

  const today = new Date();
  const dueDate = new Date(today.getFullYear(), today.getMonth(), card.dueDay).toISOString();

  const tabItems = [
    { key: 'overview', label: 'Genel Bakış' },
    { key: 'statements', label: 'Ekstreler' },
    { key: 'payments', label: 'Ödemeler' },
    { key: 'transactions', label: 'Hareketler' },
    { key: 'limits', label: 'Limit' },
    { key: 'settings', label: 'Ayarlar' },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`${card.bank} ${card.cardName}`}
        description={`${maskCard(card.last4)} · ${card.holder} · ${cardTypeLabel[card.cardType]}`}
        backTo="/finance/credit-cards"
        backLabel="Kart Listesi"
        actions={
          <>
            <button className="btn-secondary" onClick={() => setUploadOpen(true)}>
              <Upload size={16} /> Ekstre Yükle
            </button>
            <button className="btn-secondary" onClick={() => setPaymentOpen(true)}>
              <CreditCardIcon size={16} /> Ödeme Ekle
            </button>
            <button className="btn-primary" onClick={() => navigate(`/finance/credit-cards/${card.id}/edit`)}>
              <Pencil size={16} /> Düzenle
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><Wallet size={15} /></span>
            <Badge className={cardStatusCls[card.status]}>{cardStatusLabel[card.status]}</Badge>
          </div>
          <p className="mt-3 text-lg font-semibold tracking-tight text-gray-900">{formatTRY(card.currentDebt)}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600">Güncel Borç</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><CreditCardIcon size={15} /></span>
          </div>
          <p className="mt-3 text-lg font-semibold tracking-tight text-gray-900">{formatTRY(card.limit)}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600">Kart Limiti ({currencyLabel[card.currency]})</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><Gauge size={15} /></span>
          </div>
          <p className="mt-3 text-lg font-semibold tracking-tight text-gray-900">%{usage}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600">Limit Kullanımı</p>
          <div className="mt-2"><ProgressBar value={usage} level={level} /></div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><Clock size={15} /></span>
          </div>
          <p className="mt-3 text-sm font-semibold tracking-tight text-gray-900">{formatDate(dueDate)}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600">Son Ödeme Tarihi</p>
          <div className="mt-1"><DueDateCell dueDate={dueDate} statementStatus={card.statementStatus} /></div>
        </div>
      </div>

      <Tabs items={tabItems} active={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Kart Bilgileri" icon={<CreditCardIcon size={16} className="text-gray-400" />}>
              <dl className="space-y-3">
                {[
                  ['Banka', card.bank],
                  ['Kart Adı', card.cardName],
                  ['Kart Tipi', cardTypeLabel[card.cardType]],
                  ['Son 4 Hane', maskCard(card.last4)],
                  ['Kartı Kullanan', card.holder],
                  ['Departman', card.department],
                  ['Para Birimi', `${card.currency} (${currencyLabel[card.currency]})`],
                  ['Kesim Günü', `${card.statementDay}. gün`],
                  ['Son Ödeme Günü', `${card.dueDay}. gün`],
                  ['Asgari Ödeme Oranı', `%${Math.round(card.minPaymentRate * 100)}`],
                  ['Başlangıç Tarihi', formatDate(card.startDate)],
                  ['Son Kullanma', `${String(card.expiryMonth).padStart(2, '0')}/${card.expiryYear}`],
                  ['Durum', cardStatusLabel[card.status]],
                  ['Açıklama', card.description || '-'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
            <div className="space-y-6">
              <SectionCard title="Limit Bilgileri" icon={<Gauge size={16} className="text-gray-400" />}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Limit</span>
                    <span className="text-sm font-medium text-gray-900">{formatTRY(card.limit)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Güncel Borç</span>
                    <span className="text-sm font-medium text-gray-900">{formatTRY(card.currentDebt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Kullanılabilir</span>
                    <span className="text-sm font-medium text-gray-900">{formatTRY(available)}</span>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Kullanım Oranı</span>
                      <span className="text-sm font-medium text-gray-900">%{usage}</span>
                    </div>
                    <ProgressBar value={usage} level={level} />
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Son Ekstreler" icon={<FileText size={16} className="text-gray-400" />}>
                {statements.length === 0 ? (
                  <p className="text-sm text-gray-400">Henüz ekstre yok.</p>
                ) : (
                  <div className="space-y-3">
                    {statements.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{s.period}</p>
                          <p className="text-xs text-gray-500">{formatDate(s.statementDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatTRY(s.totalDebt)}</p>
                          <Badge className={paymentStatusCls[s.paymentStatus]}>{paymentStatusLabel[s.paymentStatus]}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        )}

        {activeTab === 'statements' && (
          <div className="card overflow-hidden">
            <div className="mb-4 flex items-center justify-between px-4 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Ekstreler ({statements.length})</h3>
              <button className="btn-primary !py-2 !text-xs" onClick={() => setUploadOpen(true)}>
                <Upload size={14} /> Ekstre Yükle
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="table-th">Dönem</th>
                    <th className="table-th">Ekstre Tarihi</th>
                    <th className="table-th">Son Ödeme</th>
                    <th className="table-th">Toplam Borç</th>
                    <th className="table-th">Asgari Ödeme</th>
                    <th className="table-th">İşlem Sayısı</th>
                    <th className="table-th">AI Analiz</th>
                    <th className="table-th">Ödeme Durumu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statements.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/40">
                      <td className="table-td">
                        <button className="font-medium text-brand-600 hover:text-brand-700" onClick={() => navigate(`/finance/credit-cards/${card.id}/statements/${s.id}`)}>
                          {s.period}
                        </button>
                      </td>
                      <td className="table-td text-gray-600">{formatDate(s.statementDate)}</td>
                      <td className="table-td text-gray-600">{formatDate(s.dueDate)}</td>
                      <td className="table-td font-medium text-gray-900">{formatTRY(s.totalDebt)}</td>
                      <td className="table-td text-gray-600">{formatTRY(s.minPayment)}</td>
                      <td className="table-td text-gray-600">{s.transactionCount}</td>
                      <td className="table-td"><Badge className={aiStatusCls[s.aiStatus]}>{aiStatusLabel[s.aiStatus]}</Badge></td>
                      <td className="table-td"><Badge className={paymentStatusCls[s.paymentStatus]}>{paymentStatusLabel[s.paymentStatus]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {statements.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Henüz ekstre yok.</div>}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="card overflow-hidden">
            <div className="mb-4 flex items-center justify-between px-4 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Ödemeler ({payments.length})</h3>
              <button className="btn-primary !py-2 !text-xs" onClick={() => setPaymentOpen(true)}>
                <CreditCardIcon size={14} /> Ödeme Ekle
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="table-th">Tarih</th>
                    <th className="table-th">Tutar</th>
                    <th className="table-th">Tip</th>
                    <th className="table-th">Banka Hesabı</th>
                    <th className="table-th">Açıklama</th>
                    <th className="table-th">Kaydeden</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/40">
                      <td className="table-td text-gray-600">{formatDate(p.date)}</td>
                      <td className="table-td font-medium text-gray-900">{formatTRY(p.amount)}</td>
                      <td className="table-td text-gray-600">{paymentTypeLabel[p.type]}</td>
                      <td className="table-td text-gray-600">{p.bankAccount}</td>
                      <td className="table-td text-gray-600">{p.description || '-'}</td>
                      <td className="table-td text-gray-600">{p.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payments.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Henüz ödeme kaydı yok.</div>}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="card p-6">
            <p className="text-sm text-gray-400">Hareketler bu ekstre yüklendikten sonra AI analizi ile birlikte görüntülenecektir.</p>
          </div>
        )}

        {activeTab === 'limits' && (
          <SectionCard title="Limit Detayları" icon={<Gauge size={16} className="text-gray-400" />}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Toplam Limit</span>
                <span className="text-sm font-medium text-gray-900">{formatTRY(card.limit)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Güncel Borç</span>
                <span className="text-sm font-medium text-gray-900">{formatTRY(card.currentDebt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Kullanılabilir Limit</span>
                <span className="text-sm font-medium text-gray-900">{formatTRY(available)}</span>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Kullanım Oranı</span>
                  <span className="text-sm font-medium text-gray-900">%{usage}</span>
                </div>
                <ProgressBar value={usage} level={level} showLabel />
              </div>
            </div>
          </SectionCard>
        )}

        {activeTab === 'settings' && (
          <SectionCard title="Kart Ayarları" icon={<Pencil size={16} className="text-gray-400" />}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Kartı Düzenle</p>
                  <p className="text-xs text-gray-500">Kart bilgilerini güncelleyin.</p>
                </div>
                <button className="btn-secondary" onClick={() => navigate(`/finance/credit-cards/${card.id}/edit`)}>
                  <Pencil size={16} /> Düzenle
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Ekstre Durumu</p>
                  <p className="text-xs text-gray-500">{statementStatusLabel[card.statementStatus]}</p>
                </div>
                <Badge className={statementStatusCls[card.statementStatus]}>{statementStatusLabel[card.statementStatus]}</Badge>
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      <Modal
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); setProgress(null); }}
        title="Ekstre Yükle"
        description={`${card.bank} ${card.cardName} •••• ${card.last4}`}
        size="md"
      >
        <UploadStatementModalBody card={card} progress={progress} onSubmit={handleUploadSubmit} />
      </Modal>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Ödeme Kaydı Ekle"
        description={`${card.bank} ${card.cardName} •••• ${card.last4}`}
        size="md"
      >
        <PaymentModalBody onSubmit={handlePaymentSubmit} />
      </Modal>
    </div>
  );
}
