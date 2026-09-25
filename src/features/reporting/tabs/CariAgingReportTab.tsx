import { useState, useMemo } from 'react';
import { 
  Search, 
  Printer, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Calendar,
  MessageSquare,
  Copy,
  TrendingUp,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CariAgingRow, AgingBucket } from '../types';
import { exportCariAgingToExcel, generateCariWhatsAppMessage } from '../services/reportingService';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../lib/toast';

interface Props {
  rows: CariAgingRow[];
  loading: boolean;
}

export function CariAgingReportTab({ rows, loading }: Props) {
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<AgingBucket | 'all'>('all');
  const [onlyDebtors, setOnlyDebtors] = useState(true);
  const [sortField, setSortField] = useState<'balance' | 'overdueDays' | 'daysSinceLastActivity'>('balance');
  const [sortAsc, setSortAsc] = useState(false);

  // WhatsApp Modal
  const [activeMessageRow, setActiveMessageRow] = useState<CariAgingRow | null>(null);
  const [copied, setCopied] = useState(false);

  // Filtered and sorted rows
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (onlyDebtors && r.balance <= 0) return false;
      if (selectedBucket !== 'all' && r.bucket !== selectedBucket) return false;
      if (search) {
        const q = search.toLocaleLowerCase('tr-TR');
        const hit = r.cariName.toLocaleLowerCase('tr-TR').includes(q) ||
                    r.cariCode.toLocaleLowerCase('tr-TR').includes(q) ||
                    (r.city && r.city.toLocaleLowerCase('tr-TR').includes(q));
        if (!hit) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortField] || 0;
      let valB = b[sortField] || 0;
      return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [rows, search, selectedBucket, onlyDebtors, sortField, sortAsc]);

  // Statistics
  const totalReceivable = useMemo(() => {
    return rows.filter(r => r.balance > 0).reduce((sum, r) => sum + r.balance, 0);
  }, [rows]);

  const overdueReceivable = useMemo(() => {
    return rows.filter(r => r.balance > 0 && r.overdueDays > 0).reduce((sum, r) => sum + r.balance, 0);
  }, [rows]);

  const criticalReceivable = useMemo(() => {
    return rows.filter(r => r.balance > 0 && (r.bucket === '61-90' || r.bucket === '90+')).reduce((sum, r) => sum + r.balance, 0);
  }, [rows]);

  const avgOverdueDays = useMemo(() => {
    const overdueList = rows.filter(r => r.balance > 0 && r.overdueDays > 0);
    if (overdueList.length === 0) return 0;
    const sumDays = overdueList.reduce((sum, r) => sum + r.overdueDays, 0);
    return Math.round(sumDays / overdueList.length);
  }, [rows]);

  // Bucket distribution
  const bucketCounts = useMemo(() => {
    const counts = { 'current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const sums = { 'current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    rows.filter(r => r.balance > 0).forEach(r => {
      counts[r.bucket]++;
      sums[r.bucket] += r.balance;
    });
    return { counts, sums };
  }, [rows]);

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    notify('Hatırlatma metni panoya kopyalandı.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-r-transparent" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Cari hareketleri ve vade analizleri hesaplanıyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Toplam Alacak</span>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {totalReceivable.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </h3>
            <p className="mt-1 text-xs text-gray-500">Tüm carilerdeki toplam borç bakiyesi</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vadesi Geçen Alacak</span>
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-900">
              {overdueReceivable.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </h3>
            <p className="mt-1 text-xs text-amber-700 font-medium">
              Toplam alacağın %{totalReceivable > 0 ? Math.round((overdueReceivable / totalReceivable) * 100) : 0}'i gecikmede
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">60+ Gün Riskli Tutar</span>
            <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-rose-700">
              {criticalReceivable.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </h3>
            <p className="mt-1 text-xs text-rose-600">60 günden fazla vadesi aşılmış alacaklar</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ortalama Gecikme</span>
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <Calendar size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{avgOverdueDays} Gün</h3>
            <p className="mt-1 text-xs text-gray-500">Vadesi geçen carilerin ortalama süresi</p>
          </div>
        </div>
      </div>

      {/* Vade Yaşlandırma Piramidi (Aging Pyramid) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900">Vade Yaşlandırma Dağılımı (Filtrelemek İçin Tıklayın)</h4>
          <span className="text-xs text-gray-500">
            {rows.length} Cari Analiz Edildi
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <button
            onClick={() => setSelectedBucket(selectedBucket === 'current' ? 'all' : 'current')}
            className={`rounded-lg border p-3 text-left transition-all ${
              selectedBucket === 'current'
                ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Vadesi Gelmemiş</span>
              <span className="text-xs font-semibold text-emerald-600">{bucketCounts.counts['current']}</span>
            </div>
            <div className="mt-2 text-sm font-bold text-gray-900">
              {bucketCounts.sums['current'].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </div>
          </button>

          <button
            onClick={() => setSelectedBucket(selectedBucket === '1-30' ? 'all' : '1-30')}
            className={`rounded-lg border p-3 text-left transition-all ${
              selectedBucket === '1-30'
                ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-500/20'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-800">1 - 30 Gün</span>
              <span className="text-xs font-semibold text-sky-600">{bucketCounts.counts['1-30']}</span>
            </div>
            <div className="mt-2 text-sm font-bold text-gray-900">
              {bucketCounts.sums['1-30'].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </div>
          </button>

          <button
            onClick={() => setSelectedBucket(selectedBucket === '31-60' ? 'all' : '31-60')}
            className={`rounded-lg border p-3 text-left transition-all ${
              selectedBucket === '31-60'
                ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">31 - 60 Gün</span>
              <span className="text-xs font-semibold text-amber-600">{bucketCounts.counts['31-60']}</span>
            </div>
            <div className="mt-2 text-sm font-bold text-gray-900">
              {bucketCounts.sums['31-60'].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </div>
          </button>

          <button
            onClick={() => setSelectedBucket(selectedBucket === '61-90' ? 'all' : '61-90')}
            className={`rounded-lg border p-3 text-left transition-all ${
              selectedBucket === '61-90'
                ? 'border-orange-600 bg-orange-50/70 ring-2 ring-orange-500/20'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-800">61 - 90 Gün</span>
              <span className="text-xs font-semibold text-orange-600">{bucketCounts.counts['61-90']}</span>
            </div>
            <div className="mt-2 text-sm font-bold text-gray-900">
              {bucketCounts.sums['61-90'].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </div>
          </button>

          <button
            onClick={() => setSelectedBucket(selectedBucket === '90+' ? 'all' : '90+')}
            className={`rounded-lg border p-3 text-left transition-all ${
              selectedBucket === '90+'
                ? 'border-rose-600 bg-rose-50/70 ring-2 ring-rose-500/20'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">90+ Gün</span>
              <span className="text-xs font-semibold text-rose-600">{bucketCounts.counts['90+']}</span>
            </div>
            <div className="mt-2 text-sm font-bold text-rose-900">
              {bucketCounts.sums['90+'].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </div>
          </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              className="input pl-9 text-xs w-full"
              placeholder="Cari adı, kodu veya şehir ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyDebtors}
              onChange={e => setOnlyDebtors(e.target.checked)}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
            />
            <span>Sadece Borçlu Cariler</span>
          </label>

          {selectedBucket !== 'all' && (
            <button
              onClick={() => setSelectedBucket('all')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded"
            >
              Filtreyi Temizle ({selectedBucket})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCariAgingToExcel(filtered)}
            className="btn btn-secondary flex items-center gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Excel'e Aktar
          </button>

          <button
            onClick={() => window.print()}
            className="btn btn-secondary flex items-center gap-1.5 text-xs text-gray-700"
          >
            <Printer size={14} />
            Yazdır
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase text-gray-700">
              <tr>
                <th className="px-4 py-3">Cari Kodu & Ünvanı</th>
                <th 
                  onClick={() => handleSort('balance')}
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Güncel Bakiye</span>
                    {sortField === 'balance' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('overdueDays')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Vade Gecikmesi</span>
                    {sortField === 'overdueDays' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th className="px-4 py-3">En Son Mal Alışı / Fatura</th>
                <th className="px-4 py-3">En Son Tahsilat / Ödeme</th>
                <th 
                  onClick={() => handleSort('daysSinceLastActivity')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Pasiflik</span>
                    {sortField === 'daysSinceLastActivity' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Risk</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Kriterlere uygun cari kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.cariCode} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{row.cariName}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{row.cariCode}</span>
                        {row.city && <span>• {row.city}</span>}
                        <span>• {row.type}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-xs">
                      <span className={`font-bold ${
                        row.balance > 0 ? 'text-gray-900' : row.balance < 0 ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
                        {row.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {row.overdueDays > 0 ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          row.bucket === '90+' ? 'bg-rose-100 text-rose-800' :
                          row.bucket === '61-90' ? 'bg-orange-100 text-orange-800' :
                          row.bucket === '31-60' ? 'bg-amber-100 text-amber-800' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          <Clock size={11} />
                          {row.overdueDays} Gün
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 size={10} />
                          Vadesinde
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.lastInvoiceDate ? (
                        <div>
                          <div className="text-gray-900 font-medium">
                            {new Date(row.lastInvoiceDate).toLocaleDateString('tr-TR')}
                            {row.lastInvoiceAmount && (
                              <span className="text-gray-500 font-mono text-[11px] ml-1.5">
                                ({row.lastInvoiceAmount.toLocaleString('tr-TR')} TL)
                              </span>
                            )}
                          </div>
                          {row.lastInvoiceNo && (
                            <div className="text-[10px] text-gray-400 font-mono truncate max-w-xs">
                              Fatura: {row.lastInvoiceNo}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.lastPaymentDate ? (
                        <div>
                          <div className="text-emerald-700 font-medium">
                            {new Date(row.lastPaymentDate).toLocaleDateString('tr-TR')}
                            {row.lastPaymentAmount && (
                              <span className="text-emerald-600 font-mono text-[11px] ml-1.5">
                                ({row.lastPaymentAmount.toLocaleString('tr-TR')} TL)
                              </span>
                            )}
                          </div>
                          {row.lastPaymentType && (
                            <div className="text-[10px] text-gray-400 truncate max-w-xs">
                              {row.lastPaymentType}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap text-[11px]">
                      {row.daysSinceLastActivity > 0 ? (
                        <span className={`font-mono ${row.daysSinceLastActivity > 60 ? 'text-rose-600 font-bold' : 'text-gray-500'}`}>
                          {row.daysSinceLastActivity} gün
                        </span>
                      ) : (
                        <span className="text-gray-400">Yeni</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                        row.riskLevel === 'kritik' ? 'bg-rose-500' :
                        row.riskLevel === 'yuksek' ? 'bg-orange-500' :
                        row.riskLevel === 'orta' ? 'bg-amber-400' :
                        'bg-emerald-500'
                      }`} title={`Risk Durumu: ${row.riskLevel === 'kritik' || row.riskLevel === 'yuksek' ? 'Yüksek' : row.riskLevel === 'orta' ? 'Orta' : 'Düşük'}`} />
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActiveMessageRow(row)}
                        title="WhatsApp Hatırlatma Metni Oluştur"
                        className="btn btn-secondary px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50 border-emerald-200 inline-flex items-center gap-1"
                      >
                        <MessageSquare size={12} />
                        Hatırlatma
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Message Modal */}
      {activeMessageRow && (
        <Modal
          open={!!activeMessageRow}
          onClose={() => setActiveMessageRow(null)}
          title={`Cari Bakiye & Vade Hatırlatma: ${activeMessageRow.cariName}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Aşağıdaki hazır mutabakat ve hatırlatma metnini tek tıkla kopyalayıp WhatsApp veya e-posta üzerinden müşterinize iletebilirsiniz.
            </p>

            <div className="relative bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
              {generateCariWhatsAppMessage(activeMessageRow)}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setActiveMessageRow(null)}
                className="btn btn-secondary text-xs"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => handleCopyMessage(generateCariWhatsAppMessage(activeMessageRow))}
                className="btn btn-primary text-xs flex items-center gap-1.5 font-bold"
              >
                {copied ? (
                  <>
                    <CheckCircle2 size={14} />
                    Kopyalandı!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Metni Kopyala
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
