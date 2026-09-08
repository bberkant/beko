import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Pencil, Upload, CreditCard as CreditCardIcon, Wallet, Clock, Gauge,
  FileText, ArrowLeft, Trash2, Filter, Download, FileSpreadsheet, ChevronDown, Search,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Tabs } from '../../../components/ui/Tabs';
import { SectionCard } from '../../../components/ui/SectionCard';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../lib/toast';
import { useStore } from '../data/store';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import {
  formatTRY, formatDate, maskCard, limitUsage, usageLevel,
  cardStatusLabel, cardStatusCls,
  statementStatusLabel, statementStatusCls,
  aiStatusLabel, aiStatusCls,
  paymentStatusLabel, paymentStatusCls,
  cardTypeLabel, currencyLabel,
  paymentTypeLabel, categoryLabel,
} from '../data/labels';
import { DueDateCell } from '../components/DueDateCell';
import { UploadStatementModalBody, UploadProgress, type StatementUploadData } from '../components/UploadStatementModal';
import { PaymentModalBody } from '../components/PaymentModalBody';
import { resolveCardDueDate } from '../lib/billingDateEngine';

export function CreditCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { user } = useAuth();
  const { getCard, getStatementsByCard, getPaymentsByCard, addStatement, addPayment, getTransactionsByCard, refresh, deleteStatement } = useStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['yakit', 'market', 'seyahat', 'konaklama', 'malzeme', 'bakim', 'diger', 'yemek', 'fatura', 'telefon', 'odeme']);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const toggleCategoryFilter = (categoryKey: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryKey)
        ? prev.filter(k => k !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const card = id ? getCard(id) : undefined;

  const handleCategoryChange = async (merchant: string, newCategory: string) => {
    try {
      const orgId = user?.organizationId || (card as any)?.organizationId;
      if (!orgId) throw new Error('Şirket kimliği bulunamadı.');

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category: newCategory })
        .eq('merchant', merchant)
        .eq('organization_id', orgId);

      if (updateError) throw updateError;
      
      await refresh();
      notify(`"${merchant}" isimli tüm işlemlerin kategorisi başarıyla güncellendi.`, 'success');
    } catch (err) {
      console.error(err);
      notify('Kategori güncellenirken bir hata oluştu.', 'error');
    }
  };

  const statements = useMemo(() => id ? getStatementsByCard(id) : [], [id, getStatementsByCard]);
  const payments = useMemo(() => id ? getPaymentsByCard(id) : [], [id, getPaymentsByCard]);
  const transactions = useMemo(() => id ? getTransactionsByCard(id) : [], [id, getTransactionsByCard]);

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      if (t.date) {
        try {
          const d = new Date(t.date);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          monthsSet.add(`${y}-${m}`);
        } catch {}
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [transactions]);

  const getMonthLabel = (yearMonthStr: string) => {
    const [year, month] = yearMonthStr.split('-');
    const monthNames: Record<string, string> = {
      '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan', '05': 'Mayıs', '06': 'Haziran',
      '07': 'Temmuz', '08': 'Ağustos', '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
    };
    return `${monthNames[month] || month} ${year}`;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesCategory = selectedCategories.includes(t.category);
      const matchesMerchant = !merchantSearch || t.merchant.toLocaleLowerCase('tr').includes(merchantSearch.toLocaleLowerCase('tr'));
      
      let matchesMonth = true;
      if (selectedMonth !== 'all') {
        try {
          const d = new Date(t.date);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          matchesMonth = `${y}-${m}` === selectedMonth;
        } catch {
          matchesMonth = false;
        }
      }
      
      return matchesCategory && matchesMerchant && matchesMonth;
    });
  }, [transactions, selectedCategories, merchantSearch, selectedMonth]);
  const totalHarcama = useMemo(() => {
    return filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);
  const totalOdeme = useMemo(() => {
    return filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const handleExportExcel = () => {
    const data = filteredTransactions.map(t => ({
      'Tarih': formatDate(t.date),
      'İşyeri': t.merchant,
      'Açıklama': t.description || '',
      'Kategori': categoryLabel[t.category] || t.category,
      'Harcayan': '',
      'Taksit': t.installments > 1 ? `${t.installments} Taksit` : 'Tek Çekim',
      'Tutar (TL)': t.amount
    }));

    if (totalHarcama > 0 && totalOdeme < 0) {
      data.push({
        'Tarih': '', 'İşyeri': '', 'Açıklama': '', 'Kategori': '', 'Harcayan': '',
        'Taksit': 'Toplam Harcama', 'Tutar (TL)': totalHarcama
      });
      data.push({
        'Tarih': '', 'İşyeri': '', 'Açıklama': '', 'Kategori': '', 'Harcayan': '',
        'Taksit': 'Toplam Ödeme / İade', 'Tutar (TL)': totalOdeme
      });
      data.push({
        'Tarih': '', 'İşyeri': '', 'Açıklama': '', 'Kategori': '', 'Harcayan': '',
        'Taksit': 'Net Fark', 'Tutar (TL)': totalHarcama + totalOdeme
      });
    } else {
      data.push({
        'Tarih': '', 'İşyeri': '', 'Açıklama': '', 'Kategori': '', 'Harcayan': '',
        'Taksit': 'Toplam', 'Tutar (TL)': filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kart Hareketleri');
    XLSX.writeFile(wb, `${card?.cardName || 'Kart'}_Hareketleri_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    setExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notify('Pop-up engelleyiciyi devre dışı bırakın.', 'error');
      return;
    }

    const title = `${card?.bank} - ${card?.cardName} (${card?.last4})`;

    const htmlContent = `
      <html>
        <head>
          <title>${title} - Hareket Raporu</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1f2937; padding: 40px; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-b: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; color: #111827; margin: 0; }
            .meta { font-size: 11px; color: #6b7280; line-height: 1.5; }
            .summary { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 25px; }
            .summary-card { flex: 0 0 calc(50% - 8px); box-sizing: border-box; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px; }
            .summary-label { font-size: 9px; font-weight: 600; text-transform: uppercase; color: #9ca3af; }
            .summary-value { font-size: 14px; font-weight: bold; color: #111827; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f9fafb; border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #4b5563; }
            td { border-bottom: 1px solid #f3f4f6; padding: 8px 10px; font-size: 11px; color: #374151; }
            .text-right { text-align: right; }
            .text-red { color: #dc2626; font-weight: 600; }
            .text-green { color: #0d9488; font-weight: 600; }
            .bold { font-weight: bold; }
            .footer-row { background: #f9fafb; font-weight: bold; }
            @media print {
              @page { size: auto; margin: 0mm; }
              body { padding: 1.5cm 1.2cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">${card?.bank} ${card?.cardName}</h1>
              <p class="meta">Last4: **** ${card?.last4}</p>
            </div>
          </div>

          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">Toplam Harcama</div>
              <div class="summary-value">${formatTRY(totalHarcama)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Toplam Ödeme / İade</div>
              <div class="summary-value text-red">${formatTRY(totalOdeme)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Net Fark</div>
              <div class="summary-value ${totalHarcama + totalOdeme < 0 ? 'text-red' : 'text-green'}">${formatTRY(totalHarcama + totalOdeme)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">İşlem Adedi</div>
              <div class="summary-value">${filteredTransactions.length} Adet</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>İşyeri</th>
                <th>Açıklama</th>
                <th>Kategori</th>
                <th>Taksit</th>
                <th class="text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(t => `
                <tr>
                  <td>${formatDate(t.date)}</td>
                  <td class="${t.amount < 0 ? 'bold text-red' : 'bold'}">${t.merchant}</td>
                  <td>${t.description || '-'}</td>
                  <td>${categoryLabel[t.category] || t.category}</td>
                  <td>${t.installments > 1 ? `${t.installments} Taksit` : 'Tek Çekim'}</td>
                  <td class="text-right ${t.amount < 0 ? 'text-red' : 'bold'}">${formatTRY(t.amount)}</td>
                </tr>
              `).join('')}
              
              <tr class="footer-row">
                <td colspan="5" class="text-right">Toplam Harcama:</td>
                <td class="text-right">${formatTRY(totalHarcama)}</td>
              </tr>
              <tr class="footer-row">
                <td colspan="5" class="text-right">Toplam Ödeme / İade:</td>
                <td class="text-right text-red">${formatTRY(totalOdeme)}</td>
              </tr>
              <tr class="footer-row" style="border-top: 2px solid #e5e7eb;">
                <td colspan="5" class="text-right">Net Fark:</td>
                <td class="text-right ${totalHarcama + totalOdeme < 0 ? 'text-red' : 'text-green'}">${formatTRY(totalHarcama + totalOdeme)}</td>
              </tr>
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setExportMenuOpen(false);
  };

  if (!card) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-gray-500">Kart bulunamadı.</p>
        <button className="btn-secondary mt-3" onClick={() => navigate('/finans/kredi-kartlari')}>
          <ArrowLeft size={16} /> Kart Listesi
        </button>
      </div>
    );
  }

  const usage = limitUsage(card.currentDebt, card.limit);
  const level = usageLevel(usage);
  const available = card.limit - card.currentDebt;

  const handleUploadSubmit = async (data: StatementUploadData) => {
    setProgress({ percent: 0, status: 'Yükleniyor' });
    let p = 0;
    const timer = window.setInterval(() => {
      p += 15;
      if (p >= 90) {
        p = 90;
        window.clearInterval(timer);
        setProgress({ percent: 90, status: 'Dosya işleniyor...' });
      } else {
        setProgress({ percent: p, status: 'Dosya yükleniyor...' });
      }
    }, 100);

    try {
      await addStatement({
        cardId: card.id,
        period: data.period,
        statementDate: data.statementDate,
        dueDate: data.dueDate,
        totalDebt: data.totalDebt,
        minPayment: data.minPayment,
        note: data.note,
        fileName: data.fileName,
        file: data.file,
        transactions: data.transactions,
      });
      window.clearInterval(timer);
      setProgress({ percent: 100, status: 'Tamamlandı' });
      notify(`${card.cardName} •••• ${card.last4} için ${data.period} ekstresi yüklendi.`, 'success');
      window.setTimeout(() => {
        setUploadOpen(false);
        setProgress(null);
      }, 500);
    } catch (err) {
      window.clearInterval(timer);
      setProgress(null);
      console.error(err);
      notify(err instanceof Error ? err.message : 'Ekstre yüklenirken bir hata oluştu.', 'error');
    }
  };

  const handlePaymentSubmit = async (data: { date: string; amount: number; type: string; bankAccount: string; description: string }) => {
    try {
      await addPayment({
        cardId: card.id,
        date: data.date,
        amount: data.amount,
        type: data.type as any,
        bankAccount: data.bankAccount,
        description: data.description,
      });
      await refresh();
      notify('Ödeme kaydı eklendi.', 'success');
      setPaymentOpen(false);
    } catch (err) {
      console.error(err);
      notify(err instanceof Error ? err.message : 'Ödeme eklenirken bir hata oluştu.', 'error');
    }
  };

  const handleDeleteStatement = async (statementId: string) => {
    if (!window.confirm('Bu ekstreyi silmek istediğinize emin misiniz?')) return;
    try {
      await deleteStatement(statementId);
      await refresh();
      notify('Ekstre silindi.', 'success');
    } catch (err) {
      console.error(err);
      notify(err instanceof Error ? err.message : 'Ekstre silinirken bir hata oluştu.', 'error');
    }
  };

  const dueDate = resolveCardDueDate(card, statements);

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
        backTo="/finans/kredi-kartlari"
        backLabel="Kart Listesi"
        actions={
          <div className="flex gap-2">
            {/* Dışa Aktar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="btn-secondary flex items-center gap-1.5 h-full"
              >
                <Download size={16} /> Dışa Aktar
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 mt-1 w-40 rounded-lg bg-white py-1 shadow-lg border border-gray-150 z-50">
                  <button
                    onClick={() => handleExportExcel()}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-500" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExportPDF()}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FileText size={14} className="text-red-500" />
                    PDF (.pdf)
                  </button>
                </div>
              )}
            </div>

            <button className="btn-secondary" onClick={() => setUploadOpen(true)}>
              <Upload size={16} /> Ekstre Yükle
            </button>
            <button className="btn-secondary" onClick={() => setPaymentOpen(true)}>
              <CreditCardIcon size={16} /> Ödeme Ekle
            </button>
            <button className="btn-primary" onClick={() => navigate(`/finans/kredi-kartlari/${card.id}/duzenle`)}>
              <Pencil size={16} /> Düzenle
            </button>
          </div>
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
          <p className="mt-3 text-sm font-semibold tracking-tight text-gray-900">{formatDate(dueDate.date)}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600">Son Ödeme Tarihi</p>
          <div className="mt-1"><DueDateCell dueDate={dueDate.date} statementStatus={card.statementStatus} currentDebt={Number(card.currentDebt) || 0} cardLimit={card.limit} /></div>
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
                    <th className="table-th !text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statements.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/40">
                      <td className="table-td">
                        <button className="font-medium text-brand-600 hover:text-brand-700" onClick={() => navigate(`/finans/kredi-kartlari/${card.id}/ekstreler/${s.id}`)}>
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
                      <td className="table-td !text-right">
                        <button
                          onClick={() => handleDeleteStatement(s.id)}
                          className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                          title="Ekstreyi Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
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
          <div className="card overflow-hidden">
            {transactions.length > 0 ? (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/40 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-800">Kart Hareketleri</h3>
                  
                  <div className="flex items-center gap-2">
                    {availableMonths.length > 0 && (
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 cursor-pointer"
                      >
                        <option value="all">Tüm Aylar</option>
                        {availableMonths.map((ym) => (
                          <option key={ym} value={ym}>
                            {getMonthLabel(ym)}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Dışa Aktar Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setExportMenuOpen(!exportMenuOpen)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <Download size={14} className="text-gray-400" />
                        Dışa Aktar
                        <ChevronDown size={12} className="text-gray-400" />
                      </button>
                      {exportMenuOpen && (
                        <div className="absolute right-0 mt-1 w-40 rounded-lg bg-white py-1 shadow-lg border border-gray-100 z-50">
                          <button
                            onClick={() => handleExportExcel()}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <FileSpreadsheet size={14} className="text-emerald-500" />
                            Excel (.xlsx)
                          </button>
                          <button
                            onClick={() => handleExportPDF()}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <FileText size={14} className="text-red-500" />
                            PDF (.pdf)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto min-h-[420px]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/60">
                    <tr>
                      <th className="table-th">Tarih</th>
                      <th className="table-th select-none w-56 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0">İşyeri</span>
                          <div className="relative flex-1">
                            <input
                              type="text"
                              className="w-full bg-white text-gray-800 border border-gray-250 rounded px-2.5 py-1 text-[11px] font-normal normal-case focus:outline-none focus:border-brand-500 pl-7 pr-10 shadow-sm"
                              placeholder="İşyeri Ara..."
                              value={merchantSearch}
                              onChange={(e) => setMerchantSearch(e.target.value)}
                            />
                            <Search size={11} className="absolute left-2.5 top-2 text-gray-400" />
                            {merchantSearch && (
                              <button
                                onClick={() => setMerchantSearch('')}
                                className="absolute right-2 top-1 text-[9px] font-bold text-gray-400 hover:text-gray-600 bg-gray-50 px-1 py-0.5 rounded border border-gray-250 transition-colors"
                              >
                                Temizle
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                      <th className="table-th">Açıklama</th>
                      <th className="table-th relative select-none">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-gray-900" onClick={() => setFilterOpen(!filterOpen)}>
                          <span>Kategori</span>
                          <Filter size={12} className={selectedCategories.length < 10 ? "text-brand-600 fill-brand-50" : "text-gray-400"} />
                        </div>
                        
                        {filterOpen && (
                          <div className="absolute left-0 mt-2 w-64 rounded-lg bg-white p-3 shadow-xl border border-gray-200 z-50 text-left font-normal normal-case">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                              <span className="text-xs font-bold text-gray-700">Kategori Filtresi</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setFilterOpen(false); }}
                                className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
                              >
                                Kapat
                              </button>
                            </div>
                            <div className="flex gap-2 mb-2 pb-2 border-b border-gray-100">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedCategories(['yakit', 'market', 'seyahat', 'konaklama', 'malzeme', 'bakim', 'diger', 'yemek', 'fatura', 'telefon', 'odeme']); }}
                                className="text-[10px] bg-brand-50 text-brand-700 px-2 py-1 rounded hover:bg-brand-100 font-bold flex-1 text-center transition-colors"
                              >
                                Tümünü Seç
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedCategories([]); }}
                                className="text-[10px] bg-gray-50 text-gray-600 px-2 py-1 rounded hover:bg-gray-100 font-bold flex-1 text-center transition-colors border border-gray-200"
                              >
                                Temizle
                              </button>
                            </div>
                            <div className="space-y-1.5 max-h-80 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                              {[
                                { key: 'yakit', label: '⛽ Yakıt' },
                                { key: 'yemek', label: '🍔 Yemek' },
                                { key: 'market', label: '🛒 Market/Gıda' },
                                { key: 'seyahat', label: '✈️ Seyahat' },
                                { key: 'konaklama', label: '🏨 Konaklama' },
                                { key: 'malzeme', label: '📐 Malzeme' },
                                { key: 'bakim', label: '🔧 Bakım' },
                                { key: 'fatura', label: '🧾 Fatura' },
                                { key: 'telefon', label: '📞 Telefon Faturası' },
                                { key: 'odeme', label: '💳 Kredi Kartı Ödemesi' },
                                { key: 'diger', label: '📦 Diğer' },
                              ].map(cat => (
                                <label key={cat.key} className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 cursor-pointer text-xs text-gray-700 select-none">
                                  <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(cat.key)}
                                    onChange={() => toggleCategoryFilter(cat.key)}
                                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5 cursor-pointer"
                                  />
                                  <span>{cat.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </th>
                      <th className="table-th">Harcayan</th>
                      <th className="table-th">Taksit</th>
                      <th className="table-th !text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50/40">
                          <td className="table-td text-gray-600">{formatDate(t.date)}</td>
                          <td className={`table-td font-semibold ${t.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>{t.merchant}</td>
                          <td className="table-td text-gray-600">{t.description}</td>
                          <td className="table-td">
                            <select
                              value={t.category}
                              onChange={(e) => handleCategoryChange(t.merchant, e.target.value)}
                              className="text-xs font-semibold text-gray-700 border border-gray-200 rounded px-2 py-1 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors cursor-pointer"
                            >
                              <option value="yakit">⛽ Yakıt</option>
                              <option value="yemek">🍔 Yemek</option>
                              <option value="market">🛒 Market/Gıda</option>
                              <option value="seyahat">✈️ Seyahat</option>
                              <option value="konaklama">🏨 Konaklama</option>
                              <option value="malzeme">📐 Malzeme</option>
                              <option value="bakim">🔧 Bakım</option>
                              <option value="fatura">🧾 Fatura</option>
                              <option value="telefon">📞 Telefon Faturası</option>
                              <option value="odeme">💳 Kredi Kartı Ödemesi</option>
                              <option value="diger">📦 Diğer</option>
                            </select>
                          </td>
                          <td className="table-td text-gray-600"></td>
                          <td className="table-td text-gray-600">
                            {t.installments > 1 ? `${t.installments} Taksit` : 'Tek Çekim'}
                          </td>
                          <td className={`table-td font-bold !text-right ${t.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatTRY(t.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                          Seçili filtrelere uygun harcama hareketi bulunmuyor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredTransactions.length > 0 && (
                    <tfoot className="bg-gray-50/80 font-bold text-gray-900 border-t-2 border-gray-200">
                      {totalHarcama > 0 && totalOdeme < 0 ? (
                        <>
                          <tr className="border-b border-gray-100">
                            <td colSpan={6} className="table-td text-right text-gray-500 font-medium py-1.5">Toplam Harcama:</td>
                            <td className="table-td text-right text-gray-900 font-bold py-1.5">{formatTRY(totalHarcama)}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td colSpan={6} className="table-td text-right text-gray-500 font-medium py-1.5">Toplam Ödeme / İade:</td>
                            <td className="table-td text-right text-red-600 font-bold py-1.5">{formatTRY(totalOdeme)}</td>
                          </tr>
                          <tr>
                            <td colSpan={6} className="table-td text-right text-gray-900 py-2">Net Fark:</td>
                            <td className={`table-td text-right font-bold py-2 ${totalHarcama + totalOdeme < 0 ? 'text-red-600' : 'text-brand-600'}`}>
                              {formatTRY(totalHarcama + totalOdeme)}
                            </td>
                          </tr>
                        </>
                      ) : totalOdeme < 0 ? (
                        <tr>
                          <td colSpan={6} className="table-td text-right">Toplam Ödeme / İade:</td>
                          <td className="table-td text-right text-red-600 font-bold">{formatTRY(totalOdeme)}</td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={6} className="table-td text-right">Toplam:</td>
                          <td className="table-td text-right text-brand-600 font-bold">{formatTRY(totalHarcama)}</td>
                        </tr>
                      )}
                    </tfoot>
                  )}
                </table>
              </div>
            </>
            ) : (
              <div className="py-12 text-center text-sm text-gray-400">
                Bu karta ait henüz herhangi bir ekstre hareketi bulunmuyor.
              </div>
            )}
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
                <button className="btn-secondary" onClick={() => navigate(`/finans/kredi-kartlari/${card.id}/duzenle`)}>
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
