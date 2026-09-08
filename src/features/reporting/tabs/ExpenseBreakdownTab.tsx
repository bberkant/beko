import { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  TrendingDown, 
  FileSpreadsheet, 
  Layers, 
  Coins 
} from 'lucide-react';
import { ExpenseCategoryRow } from '../types';
import { fetchExpenseBreakdownData } from '../services/reportingService';
import * as XLSX from 'xlsx';

export function ExpenseBreakdownTab() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ExpenseCategoryRow[]>([]);

  useEffect(() => {
    fetchExpenseBreakdownData().then(data => {
      setRows(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const totalExpense = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [rows]);

  const totalTransactions = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.transactionCount, 0);
  }, [rows]);

  const topCategory = rows[0];

  const exportExcel = () => {
    const exportData = rows.map((r, idx) => ({
      'Sıra': idx + 1,
      'Gider Kategorisi': r.category,
      'Toplam Tutar (TL)': r.totalAmount,
      'İşlem Adedi': r.transactionCount,
      'Pay (%)': `%${r.percentage}`,
      'Veri Kaynağı': r.source,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gider_Kategorileri');
    XLSX.writeFile(wb, `Gider_Dagilim_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-r-transparent" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Kasa ve banka gider dağılımları taranıyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Toplam Gider Hacmi</span>
            <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {totalExpense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </h3>
            <p className="mt-1 text-xs text-gray-500">Tüm kasa ve banka çıkışları</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">En Büyük Gider Kalemi</span>
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <Layers size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-gray-900 truncate">
              {topCategory ? topCategory.category : '-'}
            </h3>
            <p className="mt-1 text-xs text-amber-700 font-medium truncate">
              {topCategory ? `${topCategory.totalAmount.toLocaleString('tr-TR')} TL (%${topCategory.percentage})` : '-'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem Sayısı</span>
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <Receipt size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{totalTransactions} Fiş</h3>
            <p className="mt-1 text-xs text-gray-500">Analiz edilen toplam çıkış hareketi</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori Sayısı</span>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <Coins size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{rows.length} Grup</h3>
            <p className="mt-1 text-xs text-gray-500">Otomatik sınıflandırılan kalem</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase">Kategorik Harcama Dağılımı ve Yüzdeler</h4>
          <p className="text-[11px] text-gray-500">Harcamaların hangi operasyonel alanlara gittiğinin detaylı dökümü</p>
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
                <th className="px-4 py-3">Gider Kategorisi</th>
                <th className="px-4 py-3 text-right">Toplam Harcama (TL)</th>
                <th className="px-4 py-3 text-center">İşlem Adedi</th>
                <th className="px-4 py-3 text-center">Payı (%)</th>
                <th className="px-4 py-3">Bütçe Dağılım Çubuğu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {rows.map(r => (
                <tr key={r.category} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {r.category}
                  </td>

                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                    {r.totalAmount.toLocaleString('tr-TR')} TL
                  </td>

                  <td className="px-4 py-3 text-center font-mono">
                    {r.transactionCount} Adet
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded font-mono font-bold bg-indigo-50 text-indigo-700">
                      %{r.percentage}
                    </span>
                  </td>

                  <td className="px-4 py-3 w-64">
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-brand-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, r.percentage))}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
