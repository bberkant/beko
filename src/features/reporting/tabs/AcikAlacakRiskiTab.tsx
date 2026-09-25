import { useState, useMemo } from 'react';
import { 
  Search, 
  Printer, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  Copy, 
  TrendingUp, 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp,
  ShieldAlert
} from 'lucide-react';
import { CariAgingRow, AgingBucket } from '../types';
import { exportAcikAlacakRiskiToExcel, generateCariWhatsAppMessage } from '../services/reportingService';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../lib/toast';

interface Props {
  rows: CariAgingRow[];
  loading: boolean;
}

type SortField = 'balance' | 'monthlyAvgKg' | 'safeLimit' | 'riskAmount' | 'overdueDays' | 'daysSinceLastActivity';

export function AcikAlacakRiskiTab({ rows, loading }: Props) {
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<AgingBucket | 'all'>('all');
  const [onlyDebtors, setOnlyDebtors] = useState(true);
  const [sortField, setSortField] = useState<SortField>('balance');
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
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [rows, search, selectedBucket, onlyDebtors, sortField, sortAsc]);

  // Statistics (Açık Alacak & Kapasite Odaklı KPI Kartları)
  const totalReceivable = useMemo(() => {
    return rows.filter(r => r.balance > 0).reduce((sum, r) => sum + r.balance, 0);
  }, [rows]);

  const realRiskReceivable = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.riskAmount || 0), 0);
  }, [rows]);

  const safeReceivable = useMemo(() => {
    return Math.max(0, totalReceivable - realRiskReceivable);
  }, [totalReceivable, realRiskReceivable]);

  const shrunkAccountsCount = useMemo(() => {
    return rows.filter(r => Boolean(r.isVolumeShrunk || r.hasVolumeDrop)).length;
  }, [rows]);

  // Aging distribution pyramid (Overhauled - R5)
  const bucketCounts = useMemo(() => {
    const counts = { 'current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const sums = { 'current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    rows.forEach(r => {
      const risk = r.riskAmount || 0;
      if (risk === 0) {
        counts['current']++;
        if (r.balance > 0) {
          sums['current'] += Math.min(r.balance, r.safeLimit || r.balance);
        }
      } else {
        const b = r.bucket;
        if (counts[b] !== undefined) {
          counts[b]++;
          sums[b] += risk;
        }
      }
    });

    return { counts, sums };
  }, [rows]);

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    notify('Hatırlatma metni panoya kopyalandı.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const renderStatusBadge = (row: CariAgingRow) => {
    const isDrop = Boolean(row.isVolumeShrunk || row.hasVolumeDrop);
    const isExceeded = (row.riskAmount || 0) > 0;
    const dropRate = Math.round(row.volumeDropRate ?? row.volumeDropPercent ?? 0);

    if (isDrop && isExceeded) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
          🔴 Limit Aşımı & Hacim Düşüşte (%{dropRate})
        </span>
      );
    }

    if (isDrop) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
          🟡 Alım Hacmi Düşüşte (%{dropRate})
        </span>
      );
    }

    if (isExceeded) {
      const isCritical = row.bucket === '61-90' || row.bucket === '90+' || (row.overdueDays || 0) > 60;
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
          🔴 {isCritical ? 'Limit Aşımı - Kritik' : 'Limit Aşımı'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
        Normal Akış
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-r-transparent" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Cari hareketleri ve dinamik risk analizleri hesaplanıyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards (Açık Alacak & Kapasite) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Toplam Borç Bakiyesi */}
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

        {/* KPI 2: Güvenli Rotasyonel Bakiye */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Güvenli Vadeli Bakiye (1x)</span>
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-indigo-900">
              {safeReceivable.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </h3>
            <p className="mt-1 text-xs text-indigo-700 font-medium">
              1.0x aylık et tüketim kapasitesi içi doğal vadeli bakiye
            </p>
          </div>
        </div>

        {/* KPI 3: Gerçek Riskli / Aşan Alacak */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gerçek Riskli / Aşan Tutar</span>
            <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-rose-700">
              {realRiskReceivable.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </h3>
            <p className="mt-1 text-xs text-rose-600 font-medium">
              {totalReceivable > 0 
                ? `Toplam alacağın %${Math.round((realRiskReceivable / totalReceivable) * 100)}'i güvenli kapasiteyi aşıyor`
                : 'Güvenli limitin üzerindeki riskli borç'}
            </p>
          </div>
        </div>

        {/* KPI 4: Hacmi Daralan Cariler */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hacmi Daralan Cariler</span>
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-900">{shrunkAccountsCount} Cari</h3>
            <p className="mt-1 text-xs text-amber-700">Son 2 ayda alımı %40+ daralan müşteriler</p>
          </div>
        </div>
      </div>

      {/* Vade Yaşlandırma Piramidi (Overhauled - R5) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900">Vade Yaşlandırma Dağılımı (Filtrelemek İçin Tıklayın)</h4>
          <span className="text-xs text-gray-500">
            {rows.length} Cari Analiz Edildi
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <button
            type="button"
            onClick={() => setSelectedBucket(selectedBucket === 'current' ? 'all' : 'current')}
            className={`rounded-lg border p-3 text-left transition-all ${
              selectedBucket === 'current'
                ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Vadesinde / Güvenli Bakiye</span>
              <span className="text-xs font-semibold text-emerald-600">{bucketCounts.counts['current']}</span>
            </div>
            <div className="mt-2 text-sm font-bold text-gray-900">
              {bucketCounts.sums['current'].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </div>
          </button>

          <button
            type="button"
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
            type="button"
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
            type="button"
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
            type="button"
            onClick={() => setSelectedBucket(selectedBucket === '90+' ? 'all' : '90+')}
            className={`rounded-lg border p-3 text-left transition-all ${
              selectedBucket === '90+'
                ? 'border-rose-600 bg-rose-50/70 ring-2 ring-rose-500/20'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">90+ Gün (Kritik)</span>
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
              type="button"
              onClick={() => setSelectedBucket('all')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded"
            >
              Filtreyi Temizle ({selectedBucket})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportAcikAlacakRiskiToExcel(filtered)}
            className="btn btn-secondary flex items-center gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Excel'e Aktar
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-secondary flex items-center gap-1.5 text-xs text-gray-700"
          >
            <Printer size={14} />
            Yazdır
          </button>
        </div>
      </div>

      {/* Table (Overhauled - 9 R5 Columns) */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase text-gray-700">
              <tr>
                {/* 1. Cari Kodu & Ünvanı */}
                <th className="px-4 py-3">Cari Kodu & Ünvanı</th>

                {/* 2. Güncel Net Bakiye (TL) */}
                <th 
                  onClick={() => handleSort('balance')}
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Güncel Net Bakiye</span>
                    {sortField === 'balance' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                {/* 3. Aylık Ort. Tüketim (Kg) */}
                <th 
                  onClick={() => handleSort('monthlyAvgKg')}
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Aylık Ort. Tüketim (Kg)</span>
                    {sortField === 'monthlyAvgKg' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                {/* 4. Güvenli Vadeli Limit (1x) (TL) */}
                <th 
                  onClick={() => handleSort('safeLimit')}
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Güvenli Vadeli Limit (1x)</span>
                    {sortField === 'safeLimit' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                {/* 5. Gerçek Riskli / Aşan Tutar (TL) */}
                <th 
                  onClick={() => handleSort('riskAmount')}
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Gerçek Riskli / Aşan Tutar</span>
                    {sortField === 'riskAmount' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                {/* 6. Vade Gecikmesi (Gün) */}
                <th 
                  onClick={() => handleSort('overdueDays')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Vade Gecikmesi</span>
                    {sortField === 'overdueDays' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                {/* 7. Durum Göstergesi */}
                <th className="px-4 py-3 text-center">Durum Göstergesi</th>

                {/* 8. En Son Hareketler */}
                <th className="px-4 py-3">En Son Hareketler</th>

                {/* 9. İşlemler */}
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    Kriterlere uygun cari kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.cariCode} className="hover:bg-gray-50/70 transition-colors">
                    {/* 1. Cari Kodu & Ünvanı */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{row.cariName}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{row.cariCode}</span>
                        {row.city && <span>• {row.city}</span>}
                        <span>• {row.type}</span>
                      </div>
                    </td>

                    {/* 2. Güncel Net Bakiye (TL) */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-xs">
                      <span className={`font-bold ${
                        row.balance > 0 ? 'text-gray-900' : row.balance < 0 ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
                        {row.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                      </span>
                    </td>

                    {/* 3. Aylık Ort. Tüketim (Kg) */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-xs font-medium text-gray-700">
                      {(row.monthlyAvgKg ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} KG
                    </td>

                    {/* 4. Güvenli Vadeli Limit (1x) (TL) */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-xs font-medium text-indigo-700">
                      {(row.safeLimit ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                    </td>

                    {/* 5. Gerçek Riskli / Aşan Tutar (TL) */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-xs">
                      {(row.riskAmount || 0) > 0 ? (
                        <span className="text-rose-600 font-bold">
                          {row.riskAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">
                          0,00 TL
                        </span>
                      )}
                    </td>

                    {/* 6. Vade Gecikmesi (Gün) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {(row.riskAmount || 0) === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          Vadesinde
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          row.bucket === '90+' ? 'bg-rose-100 text-rose-800' :
                          row.bucket === '61-90' ? 'bg-orange-100 text-orange-800' :
                          row.bucket === '31-60' ? 'bg-amber-100 text-amber-800' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          <Clock size={11} />
                          {row.overdueDays} Gün
                        </span>
                      )}
                    </td>

                    {/* 7. Durum Göstergesi */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {renderStatusBadge(row)}
                    </td>

                    {/* 8. En Son Hareketler */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase w-12">Fatura:</span>
                          {row.lastInvoiceDate ? (
                            <span className="font-medium text-gray-900">
                              {new Date(row.lastInvoiceDate).toLocaleDateString('tr-TR')}
                              {row.lastInvoiceAmount ? ` (${row.lastInvoiceAmount.toLocaleString('tr-TR')} TL)` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <span className="text-[10px] font-semibold text-emerald-600 uppercase w-12">Tahsilat:</span>
                          {row.lastPaymentDate ? (
                            <span className="font-medium text-emerald-700">
                              {new Date(row.lastPaymentDate).toLocaleDateString('tr-TR')}
                              {row.lastPaymentAmount ? ` (${row.lastPaymentAmount.toLocaleString('tr-TR')} TL)` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 9. İşlemler */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActiveMessageRow(row)}
                        title="WhatsApp Hatırlatma Metni Oluştur"
                        className="btn btn-secondary px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200 inline-flex items-center gap-1.5 font-medium"
                      >
                        <MessageSquare size={13} />
                        <span>Hatırlatma</span>
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
