import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  TrendingUp, 
  Beef, 
  Receipt, 
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../lib/toast';
import { CariAgingRow } from './types';
import { fetchCariAgingData } from './services/reportingService';
import { CariAgingReportTab } from './tabs/CariAgingReportTab';
import { AcikAlacakRiskiTab } from './tabs/AcikAlacakRiskiTab';
import { CashFlowReportTab } from './tabs/CashFlowReportTab';
import { SlaughterEfficiencyTab } from './tabs/SlaughterEfficiencyTab';
import { ExpenseBreakdownTab } from './tabs/ExpenseBreakdownTab';

const CARI_AGING_CACHE_KEY = 'dars_cari_aging_cache_v2';

export function ReportingPage() {
  const { notify } = useToast();
  const [activeTab, setActiveTab] = useState<'aging' | 'acik-alacak' | 'cashflow' | 'slaughter' | 'expenses'>('aging');
  
  // Instant Cache Initialization - 0ms page load on refresh
  const [cariRows, setCariRows] = useState<CariAgingRow[]>(() => {
    try {
      const cached = localStorage.getItem(CARI_AGING_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.rows) && parsed.rows.length > 0) {
          return parsed.rows;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem(CARI_AGING_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.rows) && parsed.rows.length > 0) {
          return false;
        }
      }
    } catch {}
    return true;
  });

  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else if (cariRows.length === 0) {
      setLoading(true);
    }

    try {
      const data = await fetchCariAgingData();
      setCariRows(data);
      try {
        localStorage.setItem(CARI_AGING_CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          rows: data
        }));
      } catch (storageErr) {
        console.warn('Cache write warning:', storageErr);
      }
      if (isManual) {
        notify('Cari verileri başarıyla güncellendi.', 'success');
      }
    } catch (err: any) {
      console.error(err);
      if (isManual || cariRows.length === 0) {
        notify('Cari verileri çekilirken bir sorun oluştu.', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cariRows.length, notify]);

  useEffect(() => {
    void loadData(false);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlama & Analiz Merkezi"
        description="Cari yaşlandırma ve risk analizi, nakit akışı ve çek projeksiyonu, kesimhane randımanları ve gider dökümlerini tek ekrandan yönetin."
        actions={
          <button
            onClick={() => void loadData(true)}
            disabled={loading || refreshing}
            className="btn btn-secondary flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <RefreshCw size={14} className={loading || refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Güncelleniyor...' : 'Verileri Yenile'}
          </button>
        }
      />

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 bg-white px-3 rounded-xl shadow-sm">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('aging')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'aging'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Users size={16} />
            Cari Yaşlandırma & Risk Analizi
            <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] text-brand-700 font-mono">
              {cariRows.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('acik-alacak')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'acik-alacak'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <ShieldAlert size={16} />
            Açık Alacak Riski
            <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-mono ${
              cariRows.filter(r => (r.riskAmount || 0) > 0).length > 0
                ? 'bg-rose-50 text-rose-700 font-bold'
                : 'bg-emerald-50 text-emerald-700 font-medium'
            }`}>
              {cariRows.filter(r => (r.riskAmount || 0) > 0).length} Riskli
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cashflow')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'cashflow'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <TrendingUp size={16} />
            Nakit Akışı & Çek Projeksiyonu
          </button>

          <button
            onClick={() => setActiveTab('slaughter')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'slaughter'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Beef size={16} />
            Kesimhane & Randıman Analizi
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'expenses'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Receipt size={16} />
            Gider & Masraf Dağılımı
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      {activeTab === 'aging' && <CariAgingReportTab rows={cariRows} loading={loading} />}
      {activeTab === 'acik-alacak' && <AcikAlacakRiskiTab rows={cariRows} loading={loading} />}
      {activeTab === 'cashflow' && <CashFlowReportTab />}
      {activeTab === 'slaughter' && <SlaughterEfficiencyTab />}
      {activeTab === 'expenses' && <ExpenseBreakdownTab />}
    </div>
  );
}
