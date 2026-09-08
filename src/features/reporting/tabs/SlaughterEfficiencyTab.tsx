import { useState, useEffect, useMemo } from 'react';
import { 
  Beef, 
  Search, 
  FileSpreadsheet, 
  Award, 
  Scale, 
  DollarSign
} from 'lucide-react';
import { SlaughterEfficiencyRow } from '../types';
import { fetchSlaughterEfficiencyData } from '../services/reportingService';
import * as XLSX from 'xlsx';

export function SlaughterEfficiencyTab() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SlaughterEfficiencyRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSlaughterEfficiencyData().then(data => {
      setRows(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLocaleLowerCase('tr-TR');
    return rows.filter(r => r.producer.toLocaleLowerCase('tr-TR').includes(q));
  }, [rows, search]);

  const stats = useMemo(() => {
    let totalHeads = 0;
    let totalLive = 0;
    let totalCarcass = 0;
    let totalCost = 0;

    rows.forEach(r => {
      totalHeads += r.slaughterCount;
      totalLive += r.totalLiveWeight;
      totalCarcass += r.totalCarcassWeight;
      totalCost += r.totalAmount;
    });

    const avgYield = totalLive > 0 ? (totalCarcass / totalLive) * 100 : 0;
    const avgCostPerKg = totalCarcass > 0 ? totalCost / totalCarcass : 0;

    return {
      totalHeads,
      totalLive,
      totalCarcass,
      totalCost,
      avgYield: Math.round(avgYield * 10) / 10,
      avgCostPerKg: Math.round(avgCostPerKg * 10) / 10,
    };
  }, [rows]);

  const exportExcel = () => {
    const exportData = filtered.map((r, idx) => ({
      'Sıra': idx + 1,
      'Üretici / Tedarikçi': r.producer,
      'Kesim Adedi': r.slaughterCount,
      'Canlı Ağırlık (Kg)': r.totalLiveWeight,
      'Karkas Ağırlık (Kg)': r.totalCarcassWeight,
      'Ortalama Randıman (%)': r.avgYieldPercent,
      'Toplam Tutar (TL)': r.totalAmount,
      'Kg Maliyeti (TL/Kg)': r.avgCostPerKg,
      'Son Kesim Tarihi': r.lastDate ? new Date(r.lastDate).toLocaleDateString('tr-TR') : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Uretici_Randiman');
    XLSX.writeFile(wb, `Kesim_Randiman_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-r-transparent" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Kesim listesi randıman analizleri hesaplanıyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Toplam Kesim</span>
            <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
              <Beef size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalHeads} Baş</h3>
            <p className="mt-1 text-xs text-gray-500">Tüm üreticilerden yapılan toplam kesim</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Toplam Karkas Et</span>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <Scale size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.totalCarcass.toLocaleString('tr-TR')} Kg
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Canlı: {stats.totalLive.toLocaleString('tr-TR')} Kg
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ortalama Randıman</span>
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <Award size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-indigo-700">%{stats.avgYield}</h3>
            <p className="mt-1 text-xs text-indigo-600 font-medium">
              Genel canlı/karkas verimlilik oranı
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ortalama Kg Maliyeti</span>
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{stats.avgCostPerKg} TL / Kg</h3>
            <p className="mt-1 text-xs text-gray-500">
              Toplam: {stats.totalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            className="input pl-9 text-xs w-full"
            placeholder="Üretici / tedarikçi ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={exportExcel}
          className="btn btn-secondary flex items-center gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
        >
          <FileSpreadsheet size={14} className="text-emerald-600" />
          Excel'e Aktar
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase text-gray-700">
              <tr>
                <th className="px-4 py-3">Üretici / Tedarikçi</th>
                <th className="px-4 py-3 text-center">Kesim Adedi</th>
                <th className="px-4 py-3 text-right">Canlı Ağırlık</th>
                <th className="px-4 py-3 text-right">Karkas Ağırlık</th>
                <th className="px-4 py-3 text-center">Ort. Randıman</th>
                <th className="px-4 py-3 text-right">Toplam Tutar</th>
                <th className="px-4 py-3 text-right">Maliyet (TL/Kg)</th>
                <th className="px-4 py-3 text-center">Son Kesim Tarihi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Kriterlere uygun üretici bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.producer} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {r.producer}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded font-mono">
                        {r.slaughterCount} Baş
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono">
                      {r.totalLiveWeight.toLocaleString('tr-TR')} kg
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                      {r.totalCarcassWeight.toLocaleString('tr-TR')} kg
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold font-mono">
                        <span className={`px-2 py-0.5 rounded ${
                          r.avgYieldPercent >= 58 ? 'bg-emerald-100 text-emerald-800' :
                          r.avgYieldPercent >= 54 ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          %{r.avgYieldPercent}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                      {r.totalAmount.toLocaleString('tr-TR')} TL
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-brand-700">
                      {r.avgCostPerKg > 0 ? `${r.avgCostPerKg} TL` : '-'}
                    </td>

                    <td className="px-4 py-3 text-center font-mono text-gray-500">
                      {r.lastDate ? new Date(r.lastDate).toLocaleDateString('tr-TR') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
