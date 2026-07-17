import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Download, CreditCard as CreditCardIcon, Clock, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { Tabs } from '../../../components/ui/Tabs';
import { SectionCard } from '../../../components/ui/SectionCard';
import { useToast } from '../../../lib/toast';
import { useStore } from '../data/store';
import {
  formatTRY, formatDate,
  aiStatusLabel, aiStatusCls,
  paymentStatusLabel, paymentStatusCls,
} from '../data/labels';

export function StatementDetailPage() {
  const { id, statementId } = useParams<{ id: string; statementId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { getCard, getStatement, getTransactionsByStatement } = useStore();

  const [activeTab, setActiveTab] = useState('summary');

  const card = id ? getCard(id) : undefined;
  const statement = statementId ? getStatement(statementId) : undefined;
  const transactions = useMemo(() => statementId ? getTransactionsByStatement(statementId) : [], [statementId, getTransactionsByStatement]);

  if (!card || !statement) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-gray-500">Ekstre bulunamadı.</p>
        <button className="btn-secondary mt-3" onClick={() => navigate('/finance/credit-cards')}>
          <ArrowLeft size={16} /> Kart Listesi
        </button>
      </div>
    );
  }

  const tabItems = [
    { key: 'summary', label: 'Özet' },
    { key: 'transactions', label: 'Hareketler' },
    { key: 'ai', label: 'AI Analiz' },
    { key: 'payment', label: 'Ödeme' },
    { key: 'file', label: 'Dosya' },
    { key: 'notes', label: 'Notlar' },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`${statement.period} Ekstresi`}
        description={`${card.bank} ${card.cardName} •••• ${card.last4}`}
        backTo={`/finance/credit-cards/${card.id}`}
        backLabel="Kart Detayı"
        actions={
          <button className="btn-secondary" onClick={() => notify('Ekstre indiriliyor (mock).', 'info')}>
            <Download size={16} /> İndir
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><Wallet size={15} /></span>
          </div>
          <p className="mt-3 text-lg font-semibold tracking-tight text-gray-900">{formatTRY(statement.totalDebt)}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600">Toplam Borç</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><CreditCardIcon size={15} /></span>
          </div>
          <p className="mt-3 text-lg font-semibold tracking-tight text-gray-900">{formatTRY(statement.minPayment)}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600">Asgari Ödeme</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><FileText size={15} /></span>
          </div>
          <p className="mt-3 text-lg font-semibold tracking-tight text-gray-900">{statement.transactionCount}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600">İşlem Sayısı</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><Clock size={15} /></span>
          </div>
          <p className="mt-3 text-sm font-semibold tracking-tight text-gray-900">{formatDate(statement.dueDate)}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600">Son Ödeme Tarihi</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className={aiStatusCls[statement.aiStatus]}>{aiStatusLabel[statement.aiStatus]}</Badge>
        <Badge className={paymentStatusCls[statement.paymentStatus]}>{paymentStatusLabel[statement.paymentStatus]}</Badge>
      </div>

      <Tabs items={tabItems} active={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Ekstre Bilgileri" icon={<FileText size={16} className="text-gray-400" />}>
              <dl className="space-y-3">
                {[
                  ['Dönem', statement.period],
                  ['Ekstre Tarihi', formatDate(statement.statementDate)],
                  ['Son Ödeme Tarihi', formatDate(statement.dueDate)],
                  ['Toplam Borç', formatTRY(statement.totalDebt)],
                  ['Asgari Ödeme', formatTRY(statement.minPayment)],
                  ['İşlem Sayısı', String(statement.transactionCount)],
                  ['AI Analiz', aiStatusLabel[statement.aiStatus]],
                  ['Ödeme Durumu', paymentStatusLabel[statement.paymentStatus]],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
            <SectionCard title="Kart Bilgileri" icon={<CreditCardIcon size={16} className="text-gray-400" />}>
              <dl className="space-y-3">
                {[
                  ['Banka', card.bank],
                  ['Kart Adı', card.cardName],
                  ['Son 4 Hane', `•••• ${card.last4}`],
                  ['Kartı Kullanan', card.holder],
                  ['Departman', card.department],
                  ['Limit', formatTRY(card.limit)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="table-th">Tarih</th>
                    <th className="table-th">İşyeri</th>
                    <th className="table-th">Açıklama</th>
                    <th className="table-th">Tutar</th>
                    <th className="table-th">Taksit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/40">
                      <td className="table-td text-gray-600">{formatDate(t.date)}</td>
                      <td className="table-td font-medium text-gray-900">{t.merchant}</td>
                      <td className="table-td text-gray-600">{t.description}</td>
                      <td className="table-td font-medium text-gray-900">{formatTRY(t.amount)}</td>
                      <td className="table-td text-gray-600">{t.installments > 1 ? `${t.installments} taksit` : 'Tek çekim'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactions.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Bu ekstrede hareket bulunamadı.</div>}
          </div>
        )}

        {activeTab === 'ai' && (
          <SectionCard title="AI Analizi" icon={<FileText size={16} className="text-gray-400" />}>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={aiStatusCls[statement.aiStatus]}>{aiStatusLabel[statement.aiStatus]}</Badge>
              </div>
              <p className="text-sm text-gray-600">
                {statement.aiStatus === 'tamamlandi'
                  ? 'AI analizi tamamlandı. Hareketler kategorilere ayrıldı ve anormallikler tespit edildi.'
                  : statement.aiStatus === 'analiz-bekliyor'
                  ? 'Ekstre analiz için sıraya alındı. AI analizi kısa süre içinde başlayacaktır.'
                  : statement.aiStatus === 'isleniyor'
                  ? 'AI analizi devam ediyor. Hareketler işleniyor.'
                  : statement.aiStatus === 'manuel-kontrol'
                  ? 'Bazı hareketler manuel kontrol gerektiriyor. Lütfen hareketleri inceleyin.'
                  : 'AI analizinde hata oluştu. Lütfen tekrar deneyin.'}
              </p>
            </div>
          </SectionCard>
        )}

        {activeTab === 'payment' && (
          <SectionCard title="Ödeme Bilgileri" icon={<Wallet size={16} className="text-gray-400" />}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Ödeme Durumu</span>
                <Badge className={paymentStatusCls[statement.paymentStatus]}>{paymentStatusLabel[statement.paymentStatus]}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Toplam Borç</span>
                <span className="text-sm font-medium text-gray-900">{formatTRY(statement.totalDebt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Asgari Ödeme</span>
                <span className="text-sm font-medium text-gray-900">{formatTRY(statement.minPayment)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Son Ödeme Tarihi</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(statement.dueDate)}</span>
              </div>
            </div>
          </SectionCard>
        )}

        {activeTab === 'file' && (
          <SectionCard title="Ekstre Dosyası" icon={<FileText size={16} className="text-gray-400" />}>
            {statement.hasFile ? (
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <FileText size={20} className="text-brand-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{statement.period}_ekstre.pdf</p>
                  <p className="text-xs text-gray-500">Yüklendi · {formatDate(statement.statementDate)}</p>
                </div>
                <button className="btn-secondary !py-1.5 !text-xs" onClick={() => notify('Dosya indiriliyor (mock).', 'info')}>
                  <Download size={14} /> İndir
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Dosya bulunamadı.</p>
            )}
          </SectionCard>
        )}

        {activeTab === 'notes' && (
          <SectionCard title="Notlar" icon={<FileText size={16} className="text-gray-400" />}>
            <p className="text-sm text-gray-600">{statement.note || 'Bu ekstre için not bulunmuyor.'}</p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
