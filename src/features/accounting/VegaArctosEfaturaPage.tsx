import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  Eye, 
  FileText, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Database, 
  CheckCircle2, 
  HardDrive,
  Calendar,
  X,
  Printer,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../../lib/toast';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { 
  getLocalCache, 
  setLocalCache, 
  getSupabaseCache, 
  saveSupabaseCache 
} from './efaturaCache';

interface VegaEfatura {
  id: number;
  invoiceNo: string;
  date: string;
  cariCode: number;
  cariName: string;
  vkn?: string;
  matrah: number;
  kdv: number;
  amount: number;
  direction: 'gelen' | 'giden';
  type?: string;
  status?: string;
  profile?: string;
  ettn?: string;
  notes?: string;
  items?: VegaEfaturaDetay[];
}

interface VegaEfaturaDetay {
  id: number;
  productCode?: string;
  productName: string;
  quantity?: string;
  lineTutar: number;
  kdvTutar: number;
  discount?: number;
  tevkifatTutar?: number;
  otv?: number;
  oiv?: number;
}

const TUNNEL_URL = 'https://vega-api.amasyaetas.com';

const LOCAL_PDF_INVOICES = [
  'ETS2026000003684',
  'EVF2026000002274',
  'EVF2026000001967',
  'EVF2026000001721'
];

function getInvoicePdfUrl(company: string, invoice: VegaEfatura): string {
  const invoiceNo = (invoice.invoiceNo || '').trim();
  if (LOCAL_PDF_INVOICES.includes(invoiceNo)) {
    return `/invoices/${invoiceNo}.pdf`;
  }
  if (company === 'marif') {
    const uuid = invoice.id || '';
    const direction = invoice.direction || 'gelen';
    const date = invoice.date || '';
    return `/api/marif/efaturalar/${invoiceNo}/pdf?uuid=${encodeURIComponent(uuid)}&direction=${encodeURIComponent(direction)}&date=${encodeURIComponent(date)}`;
  }
  return `${TUNNEL_URL}/api/${company}/efaturalar/${invoiceNo}/pdf`;
}



interface VegaArctosEfaturaPageProps {
  company?: 'etik' | 'marif';
}

export function VegaArctosEfaturaPage({ company = 'etik' }: VegaArctosEfaturaPageProps) {
  const { notify } = useToast();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<VegaEfatura[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'gelen' | 'giden'>('gelen');
  const [gidenBoxFilter, setGidenBoxFilter] = useState<'all' | 'outbox' | 'sent'>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cariVknMap, setCariVknMap] = useState<Map<string, string>>(new Map());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [cacheSource, setCacheSource] = useState<'Önbellek' | 'Supabase' | 'Canlı' | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  
  // Pagination States (50 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 50;

  // Detail Modal States & Tabs
  const [selectedInvoice, setSelectedInvoice] = useState<VegaEfatura | null>(null);
  const [details, setDetails] = useState<VegaEfaturaDetay[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [modalTab, setModalTab] = useState<'pdf' | 'table'>('pdf');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Load VKN mapping from vega_cariler
  useEffect(() => {
    const loadCariVkn = async () => {
      try {
        const { data, error } = await supabase
          .from('vega_cariler')
          .select('code, tax_no')
          .not('tax_no', 'is', null);
        if (!error && data) {
          const map = new Map<string, string>();
          data.forEach((c: any) => {
            if (c.code && c.tax_no) {
              map.set(String(c.code).trim(), String(c.tax_no).trim());
            }
          });
          setCariVknMap(map);
        }
      } catch (err) {
        console.warn('Cari VKN map load error:', err);
      }
    };
    void loadCariVkn();
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Reset pagination on search, date filter, tab or company change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, activeTab, company]);


  // Cooldown countdown timer (peş peşe istekleri engellemek için)
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Live fetch from Vega/Mikrokom API & sync to Supabase + Local Cache
  const fetchLiveInvoices = async (showNotification = false) => {
    if (cooldownSeconds > 0 && showNotification) {
      const waitMsg = cooldownSeconds > 60
        ? `Mikrokom entegratör kotasını korumak için yeni sorgu en erken ${Math.ceil(cooldownSeconds / 60)} dakika sonra yapılabilir.`
        : `Veriler günceldir. Yeni sorgu için lütfen ${cooldownSeconds} saniye bekleyin.`;
      notify(waitMsg, 'info');
      return;
    }
    setIsSyncing(true);
    try {
      const response = await fetch(`${TUNNEL_URL}/api/${company}/efaturalar?force=true`);
      if (!response.ok) throw new Error(`${company === 'etik' ? 'Vega' : 'Mikrokom'} API sunucusuna ulaşılamadı (${response.status}).`);
      const data = await response.json();
      if (data && data.success === false) {
        let msg = data.details || data.error || 'Fatura kayıtları sunucudan alınamadı.';
        if (typeof msg === 'string' && msg.includes('ENOTFOUND hasan')) {
          msg = "Marif faturalarının kayıtlı olduğu mezbahadaki 'HASAN' bilgisayarına şu an ağ üzerinden ulaşılamıyor.";
        }
        throw new Error(msg);
      }
      if (Array.isArray(data) && data.length > 0) {
        setInvoices(data);
        const hasIncoming = data.some((i: any) => (i.direction || 'gelen') === 'gelen');
        const hasOutgoing = data.some((i: any) => (i.direction || 'gelen') === 'giden');
        if (!hasIncoming && hasOutgoing) {
          setActiveTab('giden');
        }
        const now = new Date();
        const nowIso = now.toISOString();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLastSyncTime(timeStr);
        setCacheSource('Canlı');
        setCooldownSeconds(company === 'marif' ? 3600 : 60);

        // Save immediately to local IndexedDB
        void setLocalCache(company, data, nowIso);
        // Backup to Supabase
        void saveSupabaseCache(company, data, user?.email);

        if (showNotification) {
          notify(`${company === 'etik' ? 'Etik' : 'Marif'} e-Fatura kayıtları güncellendi. (${data.length} kayıt)`, 'success');
        }
      }
    } catch (err: any) {
      console.warn('e-Faturalar canlı çekilemedi (önbellek devrede):', err);
      if (showNotification) {
        notify('Vega yerel sunucu servisine şu an ulaşılamıyor. Önbellekteki veriler gösterilmeye devam ediyor.', 'info');
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // Initial load: First check local cache (0ms), then Supabase, only fetch live if empty
  useEffect(() => {
    let isMounted = true;
    setInvoices([]);
    setLocalSearch('');
    setSearchQuery('');
    setLastSyncTime(null);
    setSelectedInvoice(null);
    setCacheSource(null);

    const loadData = async () => {
      setIsLoading(true);

      // 1. Try local IndexedDB cache (instant)
      let localData = null;
      try {
        localData = await getLocalCache(company);
        if (isMounted && localData && Array.isArray(localData.invoices) && localData.invoices.length > 0) {
          setInvoices(localData.invoices);
          const hasIncoming = localData.invoices.some((i: any) => (i.direction || 'gelen') === 'gelen');
          const hasOutgoing = localData.invoices.some((i: any) => (i.direction || 'gelen') === 'giden');
          if (!hasIncoming && hasOutgoing) {
            setActiveTab('giden');
          }
          setCacheSource('Önbellek');
          if (localData.updatedAt) {
            const d = new Date(localData.updatedAt);
            setLastSyncTime(
              `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} (${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')})`
            );
          }
          setIsLoading(false); // Render UI immediately without waiting!
        }
      } catch (err) {
        console.warn('Local cache read failed:', err);
      }

      // 2. Check Supabase cache
      try {
        const supaData = await getSupabaseCache(company);
        if (isMounted && supaData && Array.isArray(supaData.invoices) && supaData.invoices.length > 0) {
          const localTime = localData?.updatedAt ? new Date(localData.updatedAt).getTime() : 0;
          const supaTime = supaData.updatedAt ? new Date(supaData.updatedAt).getTime() : 0;

          // If local had no data or Supabase has newer data, update state & local cache
          if (!localData || supaTime > localTime) {
            setInvoices(supaData.invoices);
            const hasIncoming = supaData.invoices.some((i: any) => (i.direction || 'gelen') === 'gelen');
            const hasOutgoing = supaData.invoices.some((i: any) => (i.direction || 'gelen') === 'giden');
            if (!hasIncoming && hasOutgoing) {
              setActiveTab('giden');
            }
            setCacheSource('Supabase');
            const d = new Date(supaData.updatedAt);
            setLastSyncTime(
              `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} (${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')})`
            );
            // Save to IndexedDB for next instant load
            void setLocalCache(company, supaData.invoices, supaData.updatedAt);

            // Marif için saatlik limit kontrolü: son güncelleme 1 saatten yeniyse cooldown başlat
            if (company === 'marif' && supaTime > 0) {
              const diffSec = Math.floor((Date.now() - supaTime) / 1000);
              if (diffSec < 3600) {
                setCooldownSeconds(3600 - diffSec);
              }
            }
          } else if (localData && company === 'marif') {
            const lTime = localData.updatedAt ? new Date(localData.updatedAt).getTime() : 0;
            if (lTime > 0) {
              const diffSec = Math.floor((Date.now() - lTime) / 1000);
              if (diffSec < 3600) {
                setCooldownSeconds(3600 - diffSec);
              }
            }
          }
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase cache check failed:', err);
      }

      // 3. Fallback: Cold start on empty database -> fetch live from Vega
      if (isMounted && (!localData || localData.invoices.length === 0)) {
        await fetchLiveInvoices(false);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [company]);

  const handleCloseModal = () => {
    setSelectedInvoice(null);
    setDetails([]);
    setPdfBlobUrl(null);
    setIsPdfGenerating(false);
  };

  // Directly load official PDF with resilient error handling
  useEffect(() => {
    if (!selectedInvoice) {
      setPdfBlobUrl(null);
      setPdfError(null);
      setIsPdfGenerating(false);
      return;
    }

    const invNo = selectedInvoice.invoiceNo.trim();

    let isMounted = true;
    const loadPdf = async () => {
      setIsPdfGenerating(true);
      setPdfError(null);
      setPdfBlobUrl(null);

      const officialUrl = getInvoicePdfUrl(company, selectedInvoice);
      try {
        const res = await fetch(officialUrl);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.details || errData.error || `Resmi PDF dosyası entegratörde bulunamadı (${invNo}).`;
          if (isMounted) {
            setPdfError(errMsg);
          }
          return;
        }

        const blob = await res.blob();
        if (blob.type.includes('json')) {
          const text = await blob.text();
          if (text.includes('error')) {
            if (isMounted) {
              setPdfError(`Fatura görseli alınamadı: ${invNo}`);
            }
            return;
          }
        }

        if (isMounted) {
          const blobUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(blobUrl);
        }
      } catch (err: any) {
        if (isMounted) {
          setPdfError(`PDF yüklenirken bağlantı hatası oluştu: ${err.message || 'Bilinmeyen hata'}`);
        }
      } finally {
        if (isMounted) {
          setIsPdfGenerating(false);
        }
      }
    };

    void loadPdf();

    return () => {
      isMounted = false;
    };
  }, [selectedInvoice?.invoiceNo, selectedInvoice?.id, company]);

  const viewDetails = async (invoice: VegaEfatura) => {
    setSelectedInvoice(invoice);
    setModalTab('pdf');
    // If invoice already has embedded items (like portal incoming invoices)
    if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
      setDetails(invoice.items);
      return;
    }
    setDetailsLoading(true);
    try {
      const response = await fetch(`${TUNNEL_URL}/api/${company}/efaturalar/${invoice.id}/detay`);
      if (!response.ok) throw new Error('Detaylar alınamadı.');
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setDetails(data);
      } else if (company === 'marif') {
        setDetails([{
          id: 1,
          productCode: invoice.vkn || String(invoice.cariCode),
          productName: invoice.cariName || 'Fatura Bedeli',
          lineTutar: invoice.matrah || invoice.amount || 0,
          kdvTutar: invoice.kdv || 0,
        }]);
      }
    } catch (err) {
      console.warn('Fatura detayları canlı çekilemedi, özet gösteriliyor:', err);
      setDetails([{
        id: 1,
        productCode: invoice.vkn || String(invoice.cariCode),
        productName: invoice.cariName || 'Fatura Bedeli',
        lineTutar: invoice.matrah || invoice.amount || 0,
        kdvTutar: invoice.kdv || 0,
      }]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
  };

  // Helper for resilient Turkish search (e.g. handles 'evülce' typo, case-insensitivity, and accents)
  const normalizeSearch = (str: string) => {
    if (!str) return '';
    return str
      .toLocaleLowerCase('tr-TR')
      .replace(/evülce/g, 'evlüce')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Filtered invoices list with Search (Fatura No, Cari Adı, Cari Kod, VKN) & Date Range
  const filteredInvoices = useMemo(() => {
    const rawQ = searchQuery.trim();
    const qNorm = normalizeSearch(rawQ);

    return invoices.filter(inv => {
      const matchTab = (inv.direction || 'gelen') === activeTab;
      if (!matchTab) return false;

      // Date range filtering
      if (startDate || endDate) {
        const invDate = inv.date ? inv.date.slice(0, 10) : '';
        if (startDate && invDate < startDate) return false;
        if (endDate && invDate > endDate) return false;
      }

      // Sub-filter for Giden Kutusu vs Gönderilmiş Kutusu
      if (activeTab === 'giden' && gidenBoxFilter !== 'all') {
        const invDate = inv.date ? inv.date.slice(0, 10) : '';
        const todayStr = new Date().toISOString().slice(0, 10);
        const isToday = invDate === todayStr;
        if (gidenBoxFilter === 'outbox' && !isToday) return false;
        if (gidenBoxFilter === 'sent' && isToday) return false;
      }

      // Search query filtering (Fatura No, Cari Adı, Cari Kod, VKN / TCKN)
      if (!qNorm) return true;
      const vkn = inv.vkn || (inv.cariCode ? cariVknMap.get(String(inv.cariCode)) : '');
      const normInvoiceNo = normalizeSearch(inv.invoiceNo || '');
      const normCariName = normalizeSearch(inv.cariName || '');
      const normCariCode = normalizeSearch(String(inv.cariCode || ''));
      const normVkn = normalizeSearch(String(vkn || ''));

      return normInvoiceNo.includes(qNorm) || 
             normCariName.includes(qNorm) || 
             normCariCode.includes(qNorm) || 
             normVkn.includes(qNorm);
    });
  }, [invoices, searchQuery, startDate, endDate, activeTab, cariVknMap, gidenBoxFilter]);

  // Date range quick presets helper
  const applyDatePreset = (preset: 'thisMonth' | 'thisYear' | 'last30' | 'clear') => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');

    if (preset === 'thisYear') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    } else if (preset === 'thisMonth') {
      const lastDay = new Date(y, today.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last30') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      const py = past.getFullYear();
      const pm = String(past.getMonth() + 1).padStart(2, '0');
      const pd = String(past.getDate()).padStart(2, '0');
      setStartDate(`${py}-${pm}-${pd}`);
      setEndDate(`${y}-${m}-${d}`);
    } else if (preset === 'clear') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Total pages and paginated slice (50 items per page)
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Dynamic pagination numbers with smart ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  // Totals calculations based on entire filtered list
  const totals = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, inv) => {
        acc.count += 1;
        acc.matrah += inv.matrah || 0;
        acc.kdv += inv.kdv || 0;
        acc.amount += inv.amount || 0;
        return acc;
      },
      { count: 0, matrah: 0, kdv: 0, amount: 0 }
    );
  }, [filteredInvoices]);

  return (
    <div className="space-y-6">
      {/* Top Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {company === 'etik' ? 'Etik e-Faturalar' : 'Marif e-Faturalar'}
          </h1>
          <p className="mt-1 text-sm text-gray-555">
            {company === 'etik' ? 'Etik' : 'Marif'} (Vega Arctos) veritabanındaki tüm e-Fatura ve e-Arşiv belgelerini listeler.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Cache Status Badge */}
          {cacheSource === 'Supabase' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 shadow-xs">
              <Database size={13} className="text-blue-600" />
              Supabase Yedekli
            </span>
          )}
          {cacheSource === 'Önbellek' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 shadow-xs">
              <HardDrive size={13} className="text-emerald-600" />
              Hızlı Önbellek
            </span>
          )}
          {cacheSource === 'Canlı' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 border border-green-200 shadow-xs">
              <CheckCircle2 size={13} className="text-green-600" />
              {company === 'etik' ? 'Canlı Vega' : 'Canlı Mikrokom'}
            </span>
          )}

          {lastSyncTime && (
            <span className="text-xs text-gray-500 font-medium">Son Güncelleme: {lastSyncTime}</span>
          )}
          <button
            onClick={() => void fetchLiveInvoices(true)}
            disabled={isSyncing || isLoading || cooldownSeconds > 0}
            className={`btn-primary flex h-[38px] items-center gap-1.5 px-4 ${
              cooldownSeconds > 0 ? 'opacity-70 cursor-not-allowed bg-gray-500 border-gray-500' : ''
            }`}
            title={
              cooldownSeconds > 0 
                ? (cooldownSeconds > 60 ? `Lütfen ${Math.ceil(cooldownSeconds / 60)} dakika bekleyin` : `Lütfen ${cooldownSeconds} saniye bekleyin`) 
                : `${company === 'etik' ? 'Vega' : 'Mikrokom'} canlı faturaları güncelle ve Supabase'e yedekle`
            }
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing 
              ? 'Güncelleniyor...' 
              : cooldownSeconds > 0 
                ? (cooldownSeconds > 60 ? `Bekleyin (${Math.ceil(cooldownSeconds / 60)} dk)` : `Bekleyin (${cooldownSeconds}s)`) 
                : 'Güncelle'}
          </button>
        </div>
      </div>

      {/* Gelen/Giden Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('gelen')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'gelen'
              ? 'border-[#f37021] text-[#f37021]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span>Gelen Faturalar</span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${
            activeTab === 'gelen' ? 'bg-orange-100 text-[#f37021]' : 'bg-gray-100 text-gray-600'
          }`}>
            {invoices.filter(i => (i.direction || 'gelen') === 'gelen').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('giden')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'giden'
              ? 'border-[#f37021] text-[#f37021]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span>Giden Faturalar</span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${
            activeTab === 'giden' ? 'bg-orange-100 text-[#f37021]' : 'bg-gray-100 text-gray-600'
          }`}>
            {invoices.filter(i => (i.direction || 'gelen') === 'giden').length}
          </span>
        </button>
      </div>

      {/* Vega Arctos Giden Kutusu / Gönderilmiş Kutusu Seçenekleri */}
      {activeTab === 'giden' && (
        <div className="flex flex-wrap items-center gap-2 bg-gray-100/80 p-1.5 rounded-xl border border-gray-200 w-fit">
          <span className="text-xs font-bold text-gray-500 px-2 uppercase tracking-wider">Vega Kutusu:</span>
          <button
            type="button"
            onClick={() => setGidenBoxFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              gidenBoxFilter === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tüm Gidenler
          </button>
          <button
            type="button"
            onClick={() => setGidenBoxFilter('outbox')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              gidenBoxFilter === 'outbox'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-300"></span>
            Giden Kutusu (Gönderim Bekleyen)
          </button>
          <button
            type="button"
            onClick={() => setGidenBoxFilter('sent')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              gidenBoxFilter === 'sent'
                ? 'bg-[#1f4e79] text-white shadow-xs'
                : 'text-[#1f4e79] hover:bg-blue-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-300"></span>
            Gönderilmiş Kutusu (GİB'e İletilenler)
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-gray-400 font-semibold uppercase">Toplam Adet</span>
          <div className="mt-1 text-2xl font-bold text-gray-900">{totals.count} Adet</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-gray-400 font-semibold uppercase">Toplam Matrah</span>
          <div className="mt-1 text-2xl font-bold text-gray-800">{formatCurrency(totals.matrah)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-gray-400 font-semibold uppercase">Toplam KDV</span>
          <div className="mt-1 text-2xl font-bold text-gray-700">{formatCurrency(totals.kdv)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-gray-400 font-semibold uppercase">Genel Toplam (Ödenecek)</span>
          <div className="mt-1 text-2xl font-bold text-[#e30613]">{formatCurrency(totals.amount)}</div>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Search & Date Range Header */}
        <div className="border-b border-gray-200 p-4 bg-white flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Fatura no, cari adı veya VKN / TCKN ile ara..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5"
                title="Aramayı temizle"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Date Range Filter (Sağına Eklendi) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50/70 px-3 py-1.5 text-xs text-gray-700 shadow-2xs">
              <Calendar size={15} className="text-gray-500" />
              <span className="font-semibold text-gray-600">Tarih:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:border-brand-500 focus:outline-none"
                title="Başlangıç Tarihi"
              />
              <span className="text-gray-400 font-medium">—</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:border-brand-500 focus:outline-none"
                title="Bitiş Tarihi"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => applyDatePreset('clear')}
                  className="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-600 transition-colors"
                  title="Tarih aralığını temizle"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyDatePreset('thisYear')}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  startDate.startsWith(String(new Date().getFullYear())) && endDate.startsWith(String(new Date().getFullYear()))
                    ? 'border-[#f37021] bg-orange-50 text-[#f37021] font-semibold'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Bu Yıl
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('thisMonth')}
                className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Bu Ay
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('last30')}
                className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Son 30 Gün
              </button>
              {(startDate || endDate || localSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    applyDatePreset('clear');
                    setLocalSearch('');
                    setSearchQuery('');
                  }}
                  className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                  title="Tüm filtreleri sıfırla"
                >
                  Filtreleri Sıfırla
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          {isLoading && invoices.length === 0 ? (
            <div className="py-20 text-center text-gray-555 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-[#f37021]" size={32} />
              <span>Vega veritabanından faturalar çekiliyor...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              Bu sekmede uyuşan fatura kaydı bulunamadı.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-700">
                  <th className="px-6 py-4">Tarih</th>
                  <th className="px-6 py-4">Fatura No</th>
                  <th className="px-6 py-4">Cari Hesap</th>
                  <th className="px-6 py-4 text-right">Matrah (Net)</th>
                  <th className="px-6 py-4 text-right">KDV</th>
                  <th className="px-6 py-4 text-right text-sm font-extrabold uppercase text-gray-900 tracking-wide">
                    Genel Toplam
                  </th>
                  <th className="px-6 py-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-900">
                {paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-500">
                      {formatDate(inv.date)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-[#e30613]">
                      <div className="flex items-center gap-1.5">
                        <span>{inv.invoiceNo}</span>
                        {(() => {
                          const no = inv.invoiceNo.trim().toUpperCase();
                          const isToday = inv.date?.slice(0, 10) === new Date().toISOString().slice(0, 10);
                          if (no.startsWith('ETS')) {
                            return (
                              <>
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">e-Fatura</span>
                                {activeTab === 'giden' && (
                                  isToday ? (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">Giden Kutusu</span>
                                  ) : (
                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">Gönderilmiş</span>
                                  )
                                )}
                              </>
                            );
                          }
                          if (no.startsWith('EAS') || no.startsWith('EAR')) {
                            return (
                              <>
                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">e-Arşiv</span>
                                {activeTab === 'giden' && (
                                  isToday ? (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">Giden Kutusu</span>
                                  ) : (
                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">Gönderilmiş</span>
                                  )
                                )}
                              </>
                            );
                          }
                          if (no.startsWith('EVF')) {
                            return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">Gelen</span>;
                          }
                          if (no.startsWith('EIS')) {
                            return <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200">e-İrsaliye</span>;
                          }
                          if (no.startsWith('A') || no.startsWith('H')) {
                            return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 border border-gray-200" title="Matbuu / Kağıt Fatura">Matbuu</span>;
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{inv.cariName}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span>Kod: {inv.cariCode}</span>
                        {(() => {
                          const vkn = inv.vkn || (inv.cariCode ? cariVknMap.get(String(inv.cariCode)) : '');
                          if (!vkn) return null;
                          return (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-medium border border-gray-200">
                                VKN: {vkn}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-gray-600">
                      {formatCurrency(inv.matrah)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-gray-500">
                      {formatCurrency(inv.kdv)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-base font-bold text-gray-950">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => void viewDetails(inv)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline"
                        >
                          <Eye size={14} />
                          Detay
                        </button>
                        <a
                          href={getInvoicePdfUrl(company, inv)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#1f4e79] hover:text-[#163a5c] hover:underline"
                        >
                          <FileText size={13} />
                          PDF
                        </a>
                        <a
                          href={`${TUNNEL_URL}/api/${company}/efaturalar/${inv.invoiceNo}/xml`}
                          download
                          className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
                        >
                          <Download size={13} />
                          XML
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {filteredInvoices.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 px-6 py-3.5 bg-gray-50/70">
            <div className="text-sm text-gray-600">
              Toplam <span className="font-semibold text-gray-900">{filteredInvoices.length}</span> faturadan{' '}
              <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> -{' '}
              <span className="font-semibold text-gray-900">
                {Math.min(currentPage * pageSize, filteredInvoices.length)}
              </span>{' '}
              arası gösteriliyor{' '}
              <span className="text-gray-400 font-normal">
                (Sayfa {currentPage} / {totalPages})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                title="İlk Sayfa"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
                Önceki
              </button>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1">
                {pageNumbers.map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400 font-medium">
                        ...
                      </span>
                    );
                  }
                  const pageNum = p as number;
                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-[#f37021] text-white shadow-xs'
                          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                title="Son Sayfa"
              >
                <ChevronsRight size={16} />
              </button>

              {/* Quick Jump Input */}
              {totalPages > 5 && (
                <div className="ml-2 flex items-center gap-1 text-xs text-gray-500">
                  <span>Git:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpPage}
                    onChange={e => setJumpPage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const target = parseInt(jumpPage, 10);
                        if (!isNaN(target) && target >= 1 && target <= totalPages) {
                          setCurrentPage(target);
                          setJumpPage('');
                        }
                      }
                    }}
                    placeholder={String(currentPage)}
                    className="h-8 w-14 rounded-lg border border-gray-300 px-1 text-center text-xs text-gray-800 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Details Modal with Full PDF / A4 Visual Preview */}
      <Modal
        open={selectedInvoice !== null}
        onClose={handleCloseModal}
        title={selectedInvoice ? `${selectedInvoice.invoiceNo} - Fatura Detayı ve Önizleme` : 'Fatura Detayı'}
        size="4xl"
      >
        {selectedInvoice && (
          <div className="space-y-4">
              {/* Modal Top Action & Navigation Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                {/* View Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setModalTab('pdf')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      modalTab === 'pdf'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Eye size={14} className="text-[#1f4e79]" />
                    InvoiceViewer (Resmi Belge)
                  </button>
                  <button
                    onClick={() => setModalTab('table')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      modalTab === 'table'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Database size={14} className="text-emerald-600" />
                    Kalem Tablosu
                  </button>
                </div>

                {/* Print & Download Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                    title="Faturayı Yazdır"
                  >
                    <Printer size={14} />
                    Yazdır
                  </button>
                  {pdfBlobUrl ? (
                    <a
                      href={pdfBlobUrl}
                      download={`${selectedInvoice.invoiceNo}.pdf`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f4e79] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#163a5c] transition-colors"
                    >
                      <Download size={14} />
                      PDF İndir
                    </a>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
                    >
                      <RefreshCw size={14} className="animate-spin" />
                      PDF Hazırlanıyor
                    </button>
                  )}
                  <a
                    href={
                      company === 'marif'
                        ? `/api/marif/efaturalar/${selectedInvoice.invoiceNo}/html?uuid=${encodeURIComponent(selectedInvoice.id || '')}&direction=${encodeURIComponent(selectedInvoice.direction || 'gelen')}&date=${encodeURIComponent(selectedInvoice.date || '')}`
                        : `${TUNNEL_URL}/api/${company}/efaturalar/${selectedInvoice.invoiceNo}/xml`
                    }
                    download={company === 'marif' ? `${selectedInvoice.invoiceNo}.html` : `${selectedInvoice.invoiceNo}.xml`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <Download size={14} />
                    {company === 'marif' ? 'HTML İndir' : 'XML İndir'}
                  </a>
                </div>
              </div>



              {/* TAB 1: Official Vega PDF Document Viewer */}
              {modalTab === 'pdf' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 size={12} />
                        Resmi Vega e-Fatura / InvoiceViewer Görünümü (Orijinal Belge)
                      </span>
                    </div>
                    {pdfBlobUrl && (
                      <a
                        href={pdfBlobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#1f4e79] hover:underline"
                      >
                        <ExternalLink size={12} />
                        Yeni Pencerede Tam Boyut Aç
                      </a>
                    )}
                  </div>

                  {isPdfGenerating ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center flex flex-col items-center justify-center gap-3 h-[75vh]">
                      <RefreshCw className="animate-spin text-[#1f4e79]" size={36} />
                      <div className="text-sm font-bold text-gray-800">
                        Resmi Vega e-Fatura Belgesi Hazırlanıyor...
                      </div>
                      <p className="text-xs text-gray-500 font-mono">
                        {selectedInvoice.invoiceNo}
                      </p>
                    </div>
                  ) : pdfError ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-8 text-center flex flex-col items-center justify-center gap-4 min-h-[50vh]">
                      <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                        <AlertCircle size={28} />
                      </div>
                      <div className="max-w-md space-y-1.5">
                        <h4 className="text-base font-bold text-amber-900">
                          Resmi Elektronik PDF Bulunamadı
                        </h4>
                        <p className="text-xs text-amber-800/90 leading-relaxed">
                          {pdfError}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalTab('table')}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#f37021] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#d95d13] transition-colors"
                      >
                        <FileText size={15} />
                        Kalem Tablosu ve Detaylarını Aç
                      </button>
                    </div>
                  ) : pdfBlobUrl ? (
                    <div className="rounded-xl border border-gray-300 overflow-hidden bg-gray-100 h-[75vh]">
                      <iframe
                        src={pdfBlobUrl}
                        title={`${selectedInvoice.invoiceNo} PDF`}
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center flex flex-col items-center justify-center gap-3 h-[75vh]">
                      <RefreshCw className="animate-spin text-[#1f4e79]" size={36} />
                      <span className="text-sm font-medium text-gray-600">PDF yükleniyor...</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Structured Data Items Table */}
              {modalTab === 'table' && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <span className="text-xs text-gray-400">Cari Ünvan</span>
                      <div className="mt-0.5 text-sm font-semibold text-gray-900">{selectedInvoice.cariName}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <span className="text-xs text-gray-400">Fatura Tarihi</span>
                      <div className="mt-0.5 text-sm font-semibold text-gray-900">{formatDate(selectedInvoice.date)}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <span className="text-xs text-gray-400">Genel Toplam</span>
                      <div className="mt-0.5 text-sm font-bold text-[#e30613]">{formatCurrency(selectedInvoice.amount)}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto max-h-[45vh]">
                      {detailsLoading ? (
                        <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="animate-spin text-[#f37021]" size={28} />
                          <span>Fatura satırları yükleniyor...</span>
                        </div>
                      ) : details.length === 0 ? (
                        <div className="py-20 text-center text-gray-400">
                          Fatura hareket satırı bulunamadı.
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                              <th className="px-4 py-3">Malın Cinsi / Hizmet</th>
                              <th className="px-4 py-3 text-right">Net Tutar</th>
                              <th className="px-4 py-3 text-right">KDV Tutarı</th>
                              <th className="px-4 py-3 text-right">Tevkifat</th>
                              <th className="px-4 py-3 text-right">ÖTV</th>
                              <th className="px-4 py-3 text-right">Toplam</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 text-xs text-gray-800">
                            {details.map((line, idx) => (
                              <tr key={line.id || idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {line.productName || '—'}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">
                                  {formatCurrency(line.lineTutar)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-500">
                                  {formatCurrency(line.kdvTutar)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-400">
                                  {(line.tevkifatTutar ?? 0) > 0 ? formatCurrency(line.tevkifatTutar!) : '—'}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-400">
                                  {(line.otv ?? 0) > 0 ? formatCurrency(line.otv!) : '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                  {formatCurrency(line.lineTutar + line.kdvTutar)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Total Footer Summary */}
                  <div className="flex flex-col items-end gap-1.5 border-t border-gray-150 pt-4 text-sm">
                    <div className="flex gap-10">
                      <span className="text-gray-500">Matrah (KDV Matrahı):</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(selectedInvoice.matrah)}</span>
                    </div>
                    <div className="flex gap-10">
                      <span className="text-gray-500">Hesaplanan KDV:</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(selectedInvoice.kdv)}</span>
                    </div>
                    <div className="flex gap-10 border-t border-gray-200 pt-1.5 text-base font-bold">
                      <span className="text-gray-900">Ödenecek Tutar:</span>
                      <span className="text-[#e30613]">{formatCurrency(selectedInvoice.amount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
        )}
      </Modal>
    </div>
  );
}
