import { useState, useEffect } from 'react';
import { 
  Wallet, 
  Landmark, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { fetchCashFlowData } from '../services/reportingService';
import * as XLSX from 'xlsx';

export function CashFlowReportTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    liquidCash: number;
    bankTotal: number;
    totalLiquid: number;
    checksReceivable: { total: number; count: number; items: any[] };
    checksPayable: { total: number; count: number; items: any[] };
    creditCardsDebt: number;
    net30DaysProjection: number;
  } | null>(null);

  useEffect(() => {
    fetchCashFlowData().then(res => {
      setData(res);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-r-transparent" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Nakit akışı ve çek vadeleri hesaplanıyor...</p>
      </div>
    );
  }

  const exportCashFlowExcel = () => {
    const receivableData = data.checksReceivable.items.map((c, i) => ({
      'Tip': 'Alınan Çek (Tahsilat)',
      'Sıra': i + 1,
      'Portföy No': c.portfoy_no || '-',
      'Çek No': c.cek_no || '-',
      'Keşideci / Müşteri': c.kesideci || c.borclu || '-',
      'Tutar (TL)': Number(c.tutar) || 0,
      'Vade Tarihi': c.vade_tarihi || '-',
      'Durum': c.durum || '-',
    }));

    const payableData = data.checksPayable.items.map((c, i) => ({
      'Tip': 'Verilen Çek (Ödeme)',
      'Sıra': i + 1,
      'Portföy No': c.portfoy_no || '-',
      'Çek No': c.cek_no || '-',
      'Lehtar': c.borclu || c.kesideci || '-',
      'Tutar (TL)': Number(c.tutar) || 0,
      'Vade Tarihi': c.vade_tarihi || '-',
      'Durum': c.durum || '-',
    }));

    const ws = XLSX.utils.json_to_sheet([...receivableData, ...payableData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cek_Projeksiyonu');
    XLSX.writeFile(wb, `Nakit_Akisi_Projeksiyon_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Liquidity Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mevcut Nakit & Banka</span>
            <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
              <Landmark size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {data.totalLiquid.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span>Banka: {data.bankTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</span>
              <span>•</span>
              <span>Kasa: {data.liquidCash.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Beklenen Çek Tahsilatı</span>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-700">
              +{data.checksReceivable.total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </h3>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              Portföyde {data.checksReceivable.count} adet tahsil edilecek çek
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ödenecek Çeklerimiz</span>
            <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-rose-700">
              -{data.checksPayable.total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </h3>
            <p className="mt-1 text-xs text-rose-600 font-medium">
              {data.checksPayable.count} adet verilen çek ödeme yükü
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net 30 Günlük Projeksiyon</span>
            <div className={`rounded-lg p-2.5 ${data.net30DaysProjection >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-bold ${data.net30DaysProjection >= 0 ? 'text-indigo-900' : 'text-rose-900'}`}>
              {data.net30DaysProjection.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Nakit + Çek Girişleri - Çek & Kart Ödemeleri
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-brand-600" />
          <span className="text-xs font-bold text-gray-900">Gelecek Vadeli Çek ve Likidite Dengesi</span>
        </div>
        <button
          onClick={exportCashFlowExcel}
          className="btn btn-secondary flex items-center gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
        >
          <FileSpreadsheet size={14} className="text-emerald-600" />
          Çekleri Excel'e Aktar
        </button>
      </div>

      {/* Two columns: Inflow vs Outflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Müşteri Çekleri (Tahsilatlar) */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-emerald-50/60 px-5 py-3.5 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Portföydeki Müşteri Çekleri (Giriş)</h4>
              <p className="text-[11px] text-emerald-700">Tahsil edilecek vadeli çekler</p>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded">
              +{data.checksReceivable.total.toLocaleString('tr-TR')} TL
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 text-xs">
            {data.checksReceivable.items.length === 0 ? (
              <div className="py-8 text-center text-gray-400">Tahsilat bekleyen çek kaydı yok.</div>
            ) : (
              data.checksReceivable.items.map((c: any) => (
                <div key={c.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{c.kesideci || c.borclu || 'Bilinmeyen Keşideci'}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Çek No: {c.cek_no || '-'} • Portföy: {c.portfoy_no || '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-700">
                      +{Number(c.tutar || 0).toLocaleString('tr-TR')} TL
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      Vade: {c.vade_tarihi ? new Date(c.vade_tarihi).toLocaleDateString('tr-TR') : '-'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Verilen Çeklerimiz & Kart Borçları (Ödemeler) */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-rose-50/60 px-5 py-3.5 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider">Verilen Çeklerimiz & Kartlar (Çıkış)</h4>
              <p className="text-[11px] text-rose-700">Ödenecek vadeli çekler ve kredi kartları</p>
            </div>
            <span className="font-mono text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded">
              -{(data.checksPayable.total + data.creditCardsDebt).toLocaleString('tr-TR')} TL
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 text-xs">
            {/* Kredi Kartı Borç Özeti Satırı */}
            {data.creditCardsDebt > 0 && (
              <div className="p-3 bg-amber-50/40 hover:bg-amber-50 flex items-center justify-between border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-amber-600" />
                  <div>
                    <div className="font-bold text-gray-900">Kredi Kartları Toplam Güncel Borcu</div>
                    <div className="text-[10px] text-gray-500">Tüm şirket kredi kartları ekstre yükü</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-rose-700">
                  -{data.creditCardsDebt.toLocaleString('tr-TR')} TL
                </div>
              </div>
            )}

            {data.checksPayable.items.length === 0 ? (
              <div className="py-8 text-center text-gray-400">Ödeme bekleyen çek kaydı yok.</div>
            ) : (
              data.checksPayable.items.map((c: any) => (
                <div key={c.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{c.borclu || c.kesideci || 'Verilen Çek'}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Çek No: {c.cek_no || '-'} • Portföy: {c.portfoy_no || '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-rose-700">
                      -{Number(c.tutar || 0).toLocaleString('tr-TR')} TL
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      Vade: {c.vade_tarihi ? new Date(c.vade_tarihi).toLocaleDateString('tr-TR') : '-'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
