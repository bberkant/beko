import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Info, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';

interface VegaSonIslem {
  id: number;
  date: string;
  companyName: string;
  izahat: string;
  evrakNo: string;
  amount: number;
  currency: string;
  createdAt: string;
  branch: string;
  cashbox: string;
  documentNevi: string;
}

const TUNNEL_URL = 'https://vega-api.amasyaetas.com';

export function VegaArctosSonIslemlerPage() {
  const { notify } = useToast();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<VegaSonIslem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sales' | 'payments' | 'stocks'>('all');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [personnelMap, setPersonnelMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchPersonnelMap = async () => {
      if (!user?.organizationId) return;
      try {
        const { data, error } = await supabase
          .from('vega_personel')
          .select('code, name')
          .eq('organization_id', user.organizationId);
        if (!error && data) {
          const mapping: Record<string, string> = {};
          data.forEach(p => {
            mapping[p.code.trim()] = p.name;
          });
          setPersonnelMap(mapping);
        }
      } catch (err) {
        console.error('Failed to load personnel mapping:', err);
      }
    };
    void fetchPersonnelMap();
  }, [user?.organizationId]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const fetchTransactions = async (showNotification = false) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${TUNNEL_URL}/api/son-islemler`);
      if (!response.ok) throw new Error('API yanıt vermedi.');
      const data = await response.json();
      if (Array.isArray(data)) {
        setTransactions(data);
        const now = new Date();
        setLastSyncTime(
          `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
        );
        if (showNotification) {
          notify('Vega son işlem kayıtları başarıyla güncellendi.', 'success');
        }
      }
    } catch (err: any) {
      console.error('Son işlemler çekilemedi:', err);
      if (showNotification) {
        notify('Vega API sunucusuna bağlanılamadı. Tünel açık mı?', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(false);
  }, []);

  const getBelgeTipiText = (izahat: string) => {
    const str = String(izahat).trim();
    if (str === '11') return 'CarÇık';
    if (str === '12' || str === '13') return 'CarGir';
    if (str === '21') return 'SatFat';
    if (str === '33') return 'StkÇık';
    if (str === '32') return 'StkGir';
    if (str === '103' || str === '104') return 'DevGir';
    return `Diğer (${str})`;
  };

  const getBelgeTipiColor = (izahat: string) => {
    const text = getBelgeTipiText(izahat);
    if (text === 'SatFat') return 'bg-blue-50 text-blue-700 border border-blue-100';
    if (text === 'StkÇık') return 'bg-amber-50 text-amber-700 border border-amber-100';
    if (text === 'StkGir') return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    if (text === 'CarÇık') return 'bg-purple-50 text-purple-700 border border-purple-100';
    if (text === 'CarGir') return 'bg-rose-50 text-rose-700 border border-rose-100';
    return 'bg-gray-50 text-gray-700 border border-gray-150';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  };

  const getDisplayName = (tx: VegaSonIslem) => {
    if (tx.documentNevi === 'PERSONELCARI') {
      const code = String(tx.companyName || '').trim();
      return personnelMap[code] || code;
    }
    return tx.companyName || '-';
  };

  // Auth filter
  if (!['Admin', 'Süper Admin', 'Developer', 'Yönetici', 'Süper Yönetici'].includes(user?.role || '')) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-red-50 p-3 text-red-600 border border-red-100">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Erişim Engellendi</h2>
          <p className="text-sm text-gray-500 max-w-sm mt-1">
            Bu modüle yalnızca şirket yöneticileri erişebilir. Lütfen sistem yöneticiniz ile görüşün.
          </p>
        </div>
      </div>
    );
  }

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const displayName = getDisplayName(tx);
      const evrakNo = tx.evrakNo || '';
      const documentNevi = tx.documentNevi || '';
      const branch = tx.branch || '';

      const matchesSearch =
        displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evrakNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        documentNevi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.toLowerCase().includes(searchQuery.toLowerCase());

      const docText = getBelgeTipiText(tx.izahat);
      const matchesType =
        typeFilter === 'all' ? true :
        typeFilter === 'sales' ? docText === 'SatFat' :
        typeFilter === 'payments' ? (docText === 'CarÇık' || docText === 'CarGir') :
        (docText === 'StkÇık' || docText === 'StkGir' || docText === 'DevGir');

      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, typeFilter, personnelMap]);

  // Statistics
  const totalVolume = filteredTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vega Son İşlemler</h1>
          <p className="text-sm text-gray-500">
            Mezbahadaki yerel server kasasından çekilen canlı hareket ve işlem geçmişi
          </p>
        </div>
        <div>
          <button
            onClick={() => fetchTransactions(true)}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Verileri Eşitle</span>
          </button>
        </div>
      </div>

      {/* Connection and Sync Banner */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="bg-gradient-to-br from-[#004b93] to-[#00366b] text-white p-5 rounded-2xl border border-[#003d7a] shadow-sm col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/70 uppercase font-bold tracking-wider">
                Mezbahane Server Kasası Bağlantısı Aktif
              </span>
            </div>
            <div className="text-sm text-white mt-2 font-medium">
              Sistem canlı olarak bağlanmaktadır.
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-white/60">
            <span>Son Başarılı Eşitleme</span>
            <span className="font-semibold text-white">{lastSyncTime ? `${lastSyncTime}` : 'Senkronize Edilmedi'}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Listelenen İşlem</span>
            <div className="text-3xl font-black text-gray-900 mt-2">
              {filteredTransactions.length} <span className="text-xs text-gray-500 font-normal">Kayıt</span>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-2 border-t border-gray-100 pt-2">
            Toplam 200 işlemden listelenen
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">İşlem Hacmi (Filtrelenmiş)</span>
            <div className="text-2xl font-black text-gray-900 mt-2">
              {totalVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </div>
          </div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-2 border-t border-gray-100 pt-2">
            Seçili filtrelerdeki tutarların toplamı
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
        <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-800 leading-normal">
          Aşağıdaki liste mezbahada kesilen fatura, kesim fişi, nakit ödeme/tahsilat ve cari borçlandırma işlemlerinin tamamını canlı olarak listeler. Bu modüldeki veriler anlık izleme amaçlıdır, bulut tabanlı kalıcı veritabanına kaydedilmez.
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4">
        {/* Filter controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search bar */}
          <div className="relative flex items-center rounded-lg px-3 py-2 bg-gray-50 border border-gray-300 w-full sm:max-w-xs transition-all focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
            <input
              type="text"
              placeholder="Ünvan, evrak no, nevi ara..."
              className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 focus:outline-none placeholder-gray-400 text-gray-700"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            <Search size={14} className="text-gray-400 shrink-0" />
          </div>

          {/* Type filter buttons */}
          <div className="flex rounded-lg bg-gray-50 border border-gray-200 p-0.5 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                typeFilter === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setTypeFilter('sales')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                typeFilter === 'sales'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Satış Faturası
            </button>
            <button
              onClick={() => setTypeFilter('payments')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                typeFilter === 'payments'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Cari Ödeme / Tahsilat
            </button>
            <button
              onClick={() => setTypeFilter('stocks')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                typeFilter === 'stocks'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Kasa / Stok / Diğer
            </button>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto rounded-xl border border-gray-150">
          <table className="min-w-full divide-y divide-gray-150">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tarih</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Firma Ünvanı</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Belge Tipi</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Evrak No</th>
                <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tutar</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Oluşturma Tarihi</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Şube</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Kasa</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Belge Nevi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-150">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-xs font-semibold text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-brand-500" />
                      <span>Vega verileri anlık sorgulanıyor...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-xs font-semibold text-gray-400">
                    Aranan kriterlere uygun son işlem kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-gray-700">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-gray-900 max-w-xs truncate">
                      {getDisplayName(tx)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider ${getBelgeTipiColor(tx.izahat)}`}>
                        {getBelgeTipiText(tx.izahat)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-gray-600">
                      {tx.evrakNo || '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-extrabold text-gray-900 text-right">
                      {tx.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {tx.currency || 'TL'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-medium text-gray-500">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-gray-600">
                      {tx.branch || '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-gray-600">
                      {tx.cashbox || '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-gray-500">
                      {tx.documentNevi || '-'}
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
