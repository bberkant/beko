import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Download, CreditCard as CreditCardIcon, Clock, Wallet, Filter, ChevronDown, FileSpreadsheet, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { Tabs } from '../../../components/ui/Tabs';
import { SectionCard } from '../../../components/ui/SectionCard';
import { useToast } from '../../../lib/toast';
import { useStore } from '../data/store';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import {
  formatTRY, formatDate,
  aiStatusLabel, aiStatusCls,
  paymentStatusLabel, paymentStatusCls, categoryLabel,
} from '../data/labels';

export function StatementDetailPage() {
  const { id, statementId } = useParams<{ id: string; statementId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { user } = useAuth();
  const { getCard, getStatement, getTransactionsByStatement, refresh } = useStore();

  const [activeTab, setActiveTab] = useState('summary');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['yakit', 'market', 'seyahat', 'konaklama', 'malzeme', 'bakim', 'diger', 'yemek', 'fatura', 'telefon', 'odeme']);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState('');

  const toggleCategoryFilter = (categoryKey: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryKey)
        ? prev.filter(k => k !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const card = id ? getCard(id) : undefined;
  const statement = statementId ? getStatement(statementId) : undefined;

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

  const transactions = useMemo(() => statementId ? getTransactionsByStatement(statementId) : [], [statementId, getTransactionsByStatement]);
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesCategory = selectedCategories.includes(t.category);
      const matchesMerchant = !merchantSearch || t.merchant.toLocaleLowerCase('tr').includes(merchantSearch.toLocaleLowerCase('tr'));
      return matchesCategory && matchesMerchant;
    });
  }, [transactions, selectedCategories, merchantSearch]);
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
    XLSX.utils.book_append_sheet(wb, ws, 'Ekstre Hareketleri');
    XLSX.writeFile(wb, `${card?.cardName || 'Kart'}_Ekstresi_${statement?.period || 'Dönem'}.xlsx`);
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
          <title>${title} - Ekstre Raporu (${statement?.period})</title>
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
            <div class="text-right meta">
              <p>Ekstre Dönemi: ${statement?.period}</p>
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

  if (!card || !statement) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-gray-500">Ekstre bulunamadı.</p>
        <button className="btn-secondary mt-3" onClick={() => navigate('/finans/kredi-kartlari')}>
          <ArrowLeft size={16} /> Kart Listesi
        </button>
      </div>
    );
  }

  const handleDownload = async () => {
    if (!statement.filePath) return;
    try {
      const { data, error } = await supabase.storage.from('credit-card-statements').createSignedUrl(statement.filePath, 60);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error(err);
      notify('Dosya indirilemedi.', 'error');
    }
  };

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
        backTo={`/finans/kredi-kartlari/${card.id}`}
        backLabel="Kart Detayı"
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

            {statement.hasFile && (
              <button className="btn-secondary" onClick={handleDownload}>
                <Download size={16} /> Orijinal Ekstre
              </button>
            )}
          </div>
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
            {transactions.length > 0 ? (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/40 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-800">Ekstre Hareketleri</h3>
                  
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
                {filteredTransactions.length > 0 || transactions.length > 0 ? (
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
                ) : null}
              </>
            ) : (
              <div className="py-12 text-center text-sm text-gray-400">
                Bu ekstrede henüz herhangi bir harcama hareketi bulunmuyor.
              </div>
            )}
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
            {statement.hasFile && statement.filePath ? (
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <FileText size={20} className="text-brand-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{statement.fileName ?? `${statement.period}_ekstre.pdf`}</p>
                  <p className="text-xs text-gray-500">Yüklendi · {formatDate(statement.statementDate)}</p>
                </div>
                <button className="btn-secondary !py-1.5 !text-xs" onClick={handleDownload}>
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
