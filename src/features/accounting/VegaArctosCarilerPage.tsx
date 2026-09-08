import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Database, 
  RefreshCw, 
  Search, 
  FileDown, 
  Eye, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Info,
  Building,
  User,
  X,
  Printer,
  ChevronDown
} from 'lucide-react';
import { useToast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface CariInvoice {
  id?: number;
  invoiceNo: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  productName?: string | null;
  izahat?: string;
  altnot?: string | null;
  quantity?: number;
  unitPrice?: number | null;
  unitName?: string | null;
  borc?: number;
  alacak?: number;
  lineTutar?: number | null;
  currency?: string;
  vade?: string | null;
}

interface CariKart {
  code: string;
  name: string;
  taxOffice: string;
  taxNo: string;
  type: 'Müşteri' | 'Tedarikçi';
  lastTransactionDate: string;
  balance: number;
  city: string;
  invoices: CariInvoice[];
  companyCode?: string;
  companyTrackingCode?: string;
}

// Demo/mock cari data removed to prevent display on initial load.

const TUNNEL_URL = 'https://vega-api.amasyaetas.com';

const turkishNormalize = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/i/g, 'i')
    .toLowerCase()
    .trim();
};

export function VegaArctosCarilerPage() {
  const { notify } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const codeParam = searchParams.get('code');
  const searchParamVal = searchParams.get('search') || '';
  const [cariler, setCariler] = useState<CariKart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParamVal);
  const [localSearch, setLocalSearch] = useState(searchParamVal);
  const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'supplier'>('all');
  const [sortField, setSortField] = useState<'code' | 'name' | 'tax' | 'type' | 'lastTransactionDate' | 'balance'>('balance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCari, setSelectedCari] = useState<CariKart | null>(null);
  const [selectedCariInvoices, setSelectedCariInvoices] = useState<CariInvoice[]>([]);
  const [liveConnection, setLiveConnection] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  const [allChecks, setAllChecks] = useState<any[]>([]);
  const [reportDesign, setReportDesign] = useState<'dars' | 'etas'>('dars');
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);

  useEffect(() => {
    const loadChecks = async () => {
      if (!user?.organizationId) return;
      try {
        const { data, error } = await supabase
          .from('ebs_checks')
          .select('id, amount, due_date, bank, debtor, check_type')
          .eq('organization_id', user.organizationId);
        if (!error && data) {
          setAllChecks(data);
        }
      } catch (err) {
        console.error('Checks could not be loaded for cross-reference:', err);
      }
    };
    loadChecks();
  }, [user?.organizationId]);

  const findMatchingCheck = (amount: number, vadeDateStr: string | null | undefined, dateStr: string) => {
    if (allChecks.length === 0) return null;
    const targetDate = vadeDateStr ? new Date(vadeDateStr) : new Date(dateStr);
    
    return allChecks.find(c => {
      if (Math.abs(c.amount - amount) > 0.01) return false;
      const checkDate = new Date(c.due_date);
      const diffTime = Math.abs(checkDate.getTime() - targetDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 4;
    });
  };

  useEffect(() => {
    if (codeParam && cariler.length > 0 && !selectedCari) {
      const matched = cariler.find(c => c.code === codeParam);
      if (matched) {
        setSelectedCari(matched);
      }
    }
  }, [codeParam, cariler, selectedCari]);

  const getCleanType = (typeVal: any): 'Müşteri' | 'Tedarikçi' => {
    if (!typeVal) return 'Müşteri';
    const str = String(typeVal).toLowerCase();
    if (str.includes('mü') || str.includes('m?') || (str.includes('m') && (str.includes('t') || str.includes('r')))) {
      return 'Müşteri';
    }
    return 'Tedarikçi';
  };

  const getIzahatText = (izahat: string | undefined, borc: number, alacak: number) => {
    if (!izahat) return 'İşlem';
    if (izahat === '103' || izahat === '104') return 'DevGir';
    if (izahat === '32') return 'StkGir';
    if (izahat === '33') return 'StkÇık';
    if (izahat === '11') return 'CarÇık';
    if (izahat === '12') return 'CarGir';
    
    // Fallback based on accounting rules:
    if (borc > 0 && (izahat === '11' || izahat === '12' || izahat === '20')) return 'StkÇık';
    if (alacak > 0 && (izahat === '11' || izahat === '12' || izahat === '20')) return 'StkGir';
    if (alacak > 0 && (izahat === '13' || izahat === '14' || izahat === '18' || izahat === '19')) return 'StkGir';
    if (borc > 0 && (izahat === '13' || izahat === '14' || izahat === '18' || izahat === '19')) return 'StkÇık';
    if (borc > 0) return 'CarÇık';
    if (alacak > 0) return 'CarGir';
    return 'İşlem';
  };

  const getMalinCinsi = (productName: string | null | undefined, izahat: string | undefined, borc: number, alacak: number, description: string) => {
    if (productName) return productName;
    if (izahat === '32') return 'DEVİR';
    if (description) return description;
    if (izahat === '83' || izahat === '103') return 'Hesaba Havale Gelen';
    if (izahat === '84' || izahat === '104') return 'Hesaba Havale Giden';
    if (izahat === '33') return 'Nakit Tahsilat';
    if (izahat === '34') return 'Nakit Ödeme';
    if (borc > 0) return 'Borç Hareketi';
    if (alacak > 0) return 'Alacak Hareketi';
    return 'Cari Hareket';
  };

  const getIslemIzahatToStr = (izahat: string | undefined) => {
    if (!izahat) return '';
    if (izahat === '11' || izahat === '12' || izahat === '13' || izahat === '14') return 'Dekont/Kredi';
    if (izahat === '33' || izahat === '34') return 'Nakit';
    if (izahat === '83' || izahat === '84' || izahat === '103' || izahat === '104') return 'Banka/EFT';
    return 'Dekont/Kredi';
  };


  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    const timeStr = `${hours}:${minutes}:${seconds}`;
    if (timeStr === '00:00:00') {
      return `${day}.${month}.${year}`;
    }
    return `${day}.${month}.${year} ${timeStr}`;
  };

  // Running balance calculation
  let runningBalance = 0;
  const seenCariInds = new Set<number>();
  const movementsWithBalance = selectedCariInvoices.map(inv => {
    let borcVal = 0;
    let alacakVal = 0;
    let change = 0;
    
    if (reportDesign === 'dars') {
      const isInvoiceLine = !!inv.productName && inv.productName !== 'DEVIR' && inv.productName !== 'DEVİR';
      
      if (isInvoiceLine) {
        const lineTutar = inv.lineTutar !== undefined && inv.lineTutar !== null && inv.lineTutar > 0
          ? inv.lineTutar
          : (inv.unitPrice && inv.unitPrice > 0 && inv.quantity && inv.quantity > 0 ? inv.unitPrice * inv.quantity : inv.amount);
          
        const isSales = inv.type === 'Satış Faturası' || (inv.borc && inv.borc > 0 && !inv.alacak);
        if (isSales) {
          borcVal = lineTutar;
        } else {
          alacakVal = lineTutar;
        }
      } else {
        // For financial transactions, use the header totals
        borcVal = inv.borc || 0;
        alacakVal = inv.alacak || 0;
      }
      change = borcVal - alacakVal;
    } else {
      // reportDesign === 'etas' (Old layout)
      const isStockLine = inv.quantity !== undefined && inv.quantity > 0;
      
      if (isStockLine && inv.lineTutar !== undefined && inv.lineTutar !== null) {
        // For stock lines, use the net line total (lineTutar)
        if (inv.borc !== undefined && inv.borc > 0) borcVal = inv.lineTutar;
        else if (inv.alacak !== undefined && inv.alacak > 0) alacakVal = inv.lineTutar;
        else if (inv.type === 'Satış Faturası') borcVal = inv.lineTutar;
        else if (inv.type === 'Alış Faturası') alacakVal = inv.lineTutar;
      } else {
        // For financial transactions, use the header totals
        borcVal = inv.borc !== undefined ? inv.borc : (inv.type === 'Satış Faturası' || inv.type === 'Ödeme' ? inv.amount : 0);
        alacakVal = inv.alacak !== undefined ? inv.alacak : (inv.type === 'Alış Faturası' || inv.type === 'Tahsilat' ? inv.amount : 0);
      }
      
      if (inv.id !== undefined && !seenCariInds.has(inv.id)) {
        seenCariInds.add(inv.id);
        const actualBorc = inv.borc || 0;
        const actualAlacak = inv.alacak || 0;
        change = actualBorc - actualAlacak;
      }
    }
    
    runningBalance += change;
    
    return {
      ...inv,
      borcVal,
      alacakVal,
      balanceVal: runningBalance
    };
  });

  const fetchSavedCariler = async () => {
    if (!user?.organizationId) return false;
    try {
      const { data, error } = await supabase
        .from('vega_cariler')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('code', { ascending: true });
        
      if (error) throw error;
      if (data && data.length > 0) {
        const mappedData = data.map(item => ({
          code: item.code,
          name: item.name,
          companyCode: item.company_code,
          companyTrackingCode: item.company_tracking_code,
          taxOffice: item.tax_office,
          taxNo: item.tax_no,
          type: item.type as 'Müşteri' | 'Tedarikçi',
          city: item.city || '',
          lastTransactionDate: item.last_transaction_date,
          balance: Number(item.balance),
          invoices: []
        }));
        setCariler(mappedData);
        return true;
      }
    } catch (err) {
      console.error('Supabase cari kartları yüklenemedi:', err);
    }
    return false;
  };

  const syncCariMovements = async (carilerList: any[], orgId: string) => {
    // Get all unique supplier names from kesim_listesi to make sure they are synced
    const supplierNames = new Set<string>();
    try {
      const { data: kesimSuppliers } = await supabase
        .from('kesim_listesi')
        .select('supplier')
        .eq('organization_id', orgId);
      
      if (kesimSuppliers) {
        kesimSuppliers.forEach(k => {
          if (k.supplier) {
            supplierNames.add(turkishNormalize(k.supplier).replace(/\s+/g, ''));
          }
        });
      }
    } catch (err) {
      console.error('Tedarikçi listesi çekilirken hata:', err);
    }

    const activeCariler = carilerList.filter(c => {
      const hasTransactionDate = !!c.lastTransactionDate;
      const hasBalance = Math.abs(Number(c.balance || 0)) > 0.01;
      const isSupplier = supplierNames.has(turkishNormalize(c.name || '').replace(/\s+/g, ''));
      return hasTransactionDate || hasBalance || isSupplier;
    });
    
    const batchSize = 35; 
    let processed = 0;
    
    for (let i = 0; i < activeCariler.length; i += batchSize) {
      const chunk = activeCariler.slice(i, i + batchSize);
      
      const allMovementsToInsert: any[] = [];
      const codesToDelete: string[] = [];

      await Promise.all(chunk.map(async (cari) => {
        try {
          const res = await fetch(`${TUNNEL_URL}/api/cariler/${cari.code}/hareketler`);
          if (res.ok) {
            const movements = await res.json();
            if (Array.isArray(movements) && movements.length > 0) {
              codesToDelete.push(cari.code);
              movements.forEach((m: any) => {
                allMovementsToInsert.push({
                  organization_id: orgId,
                  cari_code: cari.code,
                  date: m.date || new Date().toISOString(),
                  invoice_no: m.invoiceNo || '',
                  izahat: m.izahat || '',
                  description: m.description || '',
                  quantity: Number(m.quantity || 0),
                  unit_price: Number(m.unitPrice || 0),
                  line_tutar: Number(m.lineTutar || 0),
                  product_name: m.productName || null,
                  unit_name: m.unitName || null,
                  borc: Number(m.borc || 0),
                  alacak: Number(m.alacak || 0),
                  vade: m.vade || null,
                  type: m.type || '',
                  amount: Number(m.amount || 0)
                });
              });
            }
          }
        } catch (err) {
          console.error(`Cari ${cari.code} hareketleri çekilirken hata:`, err);
        }
      }));

      // Delete old movements for this batch
      if (codesToDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('vega_cari_hareketler')
          .delete()
          .eq('organization_id', orgId)
          .in('cari_code', codesToDelete);
        
        if (delErr) console.error('Eski hareketler silinirken hata:', delErr);
      }

      // Insert new movements
      if (allMovementsToInsert.length > 0) {
        const insertBatchSize = 500;
        for (let k = 0; k < allMovementsToInsert.length; k += insertBatchSize) {
          const subChunk = allMovementsToInsert.slice(k, k + insertBatchSize);
          const { error: insErr } = await supabase
            .from('vega_cari_hareketler')
            .insert(subChunk);
          
          if (insErr) console.error('Yeni hareketler eklenirken hata:', insErr);
        }
      }
      
      processed += chunk.length;
    }
  };

  const fetchCariler = async (showNotification = false) => {
    try {
      const response = await fetch(`${TUNNEL_URL}/api/cariler`);
      if (!response.ok) throw new Error('API yanıt vermedi.');
      const data = await response.json();
      if (Array.isArray(data)) {
        setCariler(data);
        setLiveConnection(true);
        const now = new Date();
        setLastSyncTime(
          `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
        );
        
        // Save to Supabase (upsert)
        if (user?.organizationId) {
          const payload = data.map(item => ({
            organization_id: user.organizationId,
            code: item.code,
            name: item.name,
            company_code: item.companyCode,
            company_tracking_code: item.companyTrackingCode,
            tax_office: item.taxOffice,
            tax_no: item.taxNo,
            type: item.type,
            city: item.city,
            last_transaction_date: item.lastTransactionDate,
            balance: item.balance
          }));
          
          const batchSize = 1000;
          for (let i = 0; i < payload.length; i += batchSize) {
            const chunk = payload.slice(i, i + batchSize);
            const { error } = await supabase
              .from('vega_cariler')
              .upsert(chunk, { onConflict: 'organization_id,code' });
            if (error) throw error;
          }
          
          // Eşitlenen carilerin hareketlerini de yedekle
          if (showNotification) {
            notify('Cari kartlar eşitlendi. Şimdi tüm hesap ve stok hareketleri Supabase\'e yedekleniyor. Lütfen bekleyin...', 'info');
            await syncCariMovements(data, user.organizationId);
          }
        }
        
        if (showNotification) {
          notify('Tüm cari kartlar, hesap ve stok hareketleri başarıyla senkronize edildi!', 'success');
        }
      }
    } catch (err) {
      console.error('Vega canlı verisi çekilemedi:', err);
      setLiveConnection(false);
      
      // Try to load cached data from Supabase first
      const loaded = await fetchSavedCariler();
      
      if (showNotification) {
        if (loaded) {
          notify('Vega API bağlantısı başarısız. Sistemdeki son güncel veriler gösteriliyor.', 'error');
        } else {
          notify('Vega API bağlantısı başarısız. Server ayarlarını kontrol edin.', 'error');
        }
      }
    }
  };

  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      await fetchSavedCariler();
      await fetchCariler(false);
      setIsLoading(false);
    };
    if (user?.organizationId) {
      initLoad();
    }
  }, [user?.organizationId]);

  useEffect(() => {
    if (selectedCari) {
      setSelectedCariInvoices(selectedCari.invoices || []);
      
      const fetchInvoices = async () => {
        try {
          const response = await fetch(`${TUNNEL_URL}/api/cariler/${selectedCari.code}/hareketler`);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              setSelectedCariInvoices(data);
            }
          }
        } catch (err) {
          console.error('Cari hareketleri çekilemedi:', err);
        }
      };
      
      fetchInvoices();
    } else {
      setSelectedCariInvoices([]);
    }
  }, [selectedCari]);

  const handleSync = async () => {
    setIsSyncing(true);
    await fetchCariler(true);
    setIsSyncing(false);
  };

  const handleExportStatement = (cari: CariKart) => {
    notify(`${cari.name} firmasına ait cari hesap ekstresi PDF olarak indirildi.`, 'success');
  };

  // Filter logic
  const filteredCariler = useMemo(() => {
    return cariler.filter(cari => {
      const name = cari.name || '';
      const code = cari.code || '';
      const taxNo = cari.taxNo || '';
      const companyCode = cari.companyCode || '';
      const companyTrackingCode = cari.companyTrackingCode || '';

      const normQuery = turkishNormalize(searchQuery);
      const matchesSearch = 
        turkishNormalize(name).includes(normQuery) ||
        turkishNormalize(code).includes(normQuery) ||
        turkishNormalize(taxNo).includes(normQuery) ||
        turkishNormalize(companyCode).includes(normQuery) ||
        turkishNormalize(companyTrackingCode).includes(normQuery);

      const matchesType = 
        typeFilter === 'all' ? true :
        typeFilter === 'customer' ? getCleanType(cari.type) === 'Müşteri' :
        getCleanType(cari.type) === 'Tedarikçi';

      return matchesSearch && matchesType;
    });
  }, [cariler, searchQuery, typeFilter]);

  // Sort logic helper
  const sortedCariler = useMemo(() => {
    return [...filteredCariler].sort((a, b) => {
      if (sortField === 'balance') {
        const isCustomerA = getCleanType(a.type) === 'Müşteri';
        const isCustomerB = getCleanType(b.type) === 'Müşteri';

        if (sortDirection === 'desc') {
          // Priority: Customers first, then Suppliers
          if (isCustomerA && !isCustomerB) return -1;
          if (!isCustomerA && isCustomerB) return 1;

          if (isCustomerA && isCustomerB) {
            // Customers: highest to lowest
            return (b.balance || 0) - (a.balance || 0);
          } else {
            // Suppliers: highest magnitude to lowest (e.g. -5M, -2M, 0)
            return Math.abs(b.balance || 0) - Math.abs(a.balance || 0);
          }
        } else {
          // Ascending order: Suppliers first (since they are negative), then Customers
          if (!isCustomerA && isCustomerB) return -1;
          if (isCustomerA && !isCustomerB) return 1;

          if (!isCustomerA && !isCustomerB) {
            // Suppliers: lowest magnitude to highest (e.g. 0, -2M, -5M)
            return Math.abs(a.balance || 0) - Math.abs(b.balance || 0);
          } else {
            // Customers: lowest to highest (0 to 5M)
            return (a.balance || 0) - (b.balance || 0);
          }
        }
      }

      let valA: any = '';
      let valB: any = '';

      if (sortField === 'code') {
        valA = a.code || '';
        valB = b.code || '';
      } else if (sortField === 'name') {
        valA = a.name || '';
        valB = b.name || '';
      } else if (sortField === 'tax') {
        valA = a.taxNo || '';
        valB = b.taxNo || '';
      } else if (sortField === 'type') {
        valA = getCleanType(a.type);
        valB = getCleanType(b.type);
      } else if (sortField === 'lastTransactionDate') {
        valA = a.lastTransactionDate || '';
        valB = b.lastTransactionDate || '';
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB, 'tr') 
          : valB.localeCompare(valA, 'tr');
      } else {
        return sortDirection === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
    });
  }, [filteredCariler, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedCariler.length / itemsPerPage);
  const paginatedCariler = useMemo(() => {
    return sortedCariler.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedCariler, currentPage]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      if (field === 'balance' || field === 'lastTransactionDate') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  const renderSortHeader = (label: string, field: typeof sortField, align: 'left' | 'right' = 'left', customClass = 'px-5') => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`${customClass} py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-gray-700 transition-colors select-none group ${align === 'right' ? 'text-right' : 'text-left'}`}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          <span className="text-gray-300 group-hover:text-gray-400 transition-colors text-[9px] ml-0.5">
            {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  // Totals calculations
  const totalReceivables = cariler
    .filter(c => c.balance > 0)
    .reduce((sum, c) => sum + c.balance, 0);

  const totalPayables = Math.abs(
    cariler
      .filter(c => c.balance < 0)
      .reduce((sum, c) => sum + c.balance, 0)
  );

  const netBalance = totalReceivables - totalPayables;

  const handlePrint = (design: 'dars' | 'etas') => {
    setIsPrintMenuOpen(false);
    setReportDesign(design);
    
    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }
    
    if (design === 'dars') {
      // Calculate the movements in DARS mode (new correct logic)
      const darsMovements = selectedCariInvoices.map(inv => {
        const isInvoiceLine = !!inv.productName && inv.productName !== 'DEVIR' && inv.productName !== 'DEVİR';
        let borcVal = 0;
        let alacakVal = 0;
        
        if (isInvoiceLine) {
          const lineTutar = inv.lineTutar !== undefined && inv.lineTutar !== null && inv.lineTutar > 0
            ? inv.lineTutar
            : (inv.unitPrice && inv.unitPrice > 0 && inv.quantity && inv.quantity > 0 ? inv.unitPrice * inv.quantity : inv.amount);
            
          const isSales = inv.type === 'Satış Faturası' || (inv.borc && inv.borc > 0 && !inv.alacak);
          if (isSales) {
            borcVal = lineTutar;
          } else {
            alacakVal = lineTutar;
          }
        } else {
          borcVal = inv.borc || 0;
          alacakVal = inv.alacak || 0;
        }
        return {
          ...inv,
          borcVal,
          alacakVal
        };
      });

      let darsRunningBalance = 0;
      const darsMovementsWithBalance = darsMovements.map(inv => {
        darsRunningBalance += (inv.borcVal - inv.alacakVal);
        return {
          ...inv,
          balanceVal: darsRunningBalance
        };
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title></title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap');
              @page {
                size: A4 portrait;
                margin: 0;
              }
              * {
                box-sizing: border-box !important;
              }
              body {
                font-family: 'Inter', sans-serif;
                color: #1e293b; /* slate-800 */
                background-color: white;
                margin: 0 10mm;
                padding: 0;
                font-size: 10px;
                line-height: 1.4;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              /* Header Section */
              .header-table {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse;
                margin-bottom: 5mm !important;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 5mm;
              }
              .header-left h1 {
                font-size: 21px !important;
                font-weight: normal !important;
                margin: 0 0 5px 0 !important;
                font-family: 'Inter', sans-serif !important;
                line-height: 1.1 !important;
                color: #0f172a;
              }
              .header-left .supplier {
                font-size: 12px !important;
                font-weight: bold !important;
                margin: 7px 0 4px 0 !important;
                text-transform: uppercase !important;
                line-height: 1.1 !important;
                color: #1e3a8a;
              }
              .header-left .date {
                font-size: 10px !important;
                color: #64748b !important;
                margin: 7px 0 0 0 !important;
                line-height: 1.1 !important;
              }
              .header-right {
                text-align: right;
                vertical-align: top;
              }
              .logo-container {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                text-align: left;
              }
              .brand-logo-box {
                width: 32px;
                height: 32px;
                background-color: #004b93;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 18px;
                border-radius: 8px;
                font-family: 'Outfit', sans-serif;
              }
              .logo-text-group {
                display: flex;
                flex-direction: column;
                text-align: left;
              }
              .logo-text-dars {
                font-family: 'Outfit', sans-serif;
                font-size: 16px;
                font-weight: 800;
                color: #004b93;
                line-height: 1;
              }
              .brand-tagline {
                font-family: 'Outfit', sans-serif;
                font-size: 8px;
                font-weight: 500;
                color: #64748b;
                margin-top: 3px;
                line-height: 1;
              }
              
              /* Metadata Grid */
              .metadata-grid {
                display: grid;
                grid-template-columns: 1.5fr 1fr 1fr;
                gap: 4mm;
                background-color: #f8fafc; /* slate-50 */
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 4mm 5mm;
                margin-bottom: 5mm;
              }
              .meta-column {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }
              .meta-title {
                font-size: 8px;
                font-weight: 700;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .meta-value {
                font-size: 11px;
                font-weight: 600;
                color: #0f172a;
              }
              .meta-value.highlight {
                font-size: 12px;
                color: #1e3a8a;
              }
              .meta-sub-value {
                font-size: 9px;
                color: #475569;
              }
              .badge-bakiye {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 12px;
                font-size: 8px;
                font-weight: 700;
                text-transform: uppercase;
                margin-top: 2px;
                width: fit-content;
              }
              .badge-bakiye.borc {
                background-color: #fee2e2;
                color: #ef4444;
              }
              .badge-bakiye.alacak {
                background-color: #dcfce7;
                color: #22c55e;
              }
              .badge-bakiye.zero {
                background-color: #f1f5f9;
                color: #64748b;
              }
              
              /* Table Section */
              .ledger-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 6mm;
              }
              .ledger-table thead tr {
                background: linear-gradient(90deg, #004b93, #00366b) !important;
              }
              .ledger-table th {
                background: transparent !important;
                color: white;
                font-size: 9px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 6px 8px;
                text-align: center;
              }
              .ledger-table th:first-child {
                border-top-left-radius: 6px;
              }
              .ledger-table th:last-child {
                border-top-right-radius: 6px;
              }
              .ledger-table td {
                padding: 5px 8px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 9px;
                color: #334155;
                text-align: center;
              }
              .ledger-table tr:nth-child(even) td {
                background-color: #f8fafc;
              }
              .ledger-table tr.devreden td {
                font-weight: 700;
                color: #0f172a;
                background-color: #f1f5f9 !important;
              }
              .ledger-table td.center {
                text-align: center;
              }
              .ledger-table td.right {
                text-align: right;
              }
              .ledger-table td.bold {
                font-weight: 600;
              }
              .ledger-table td.amount {
                font-weight: 600;
                color: #0f172a;
              }
              .ledger-table td.balance {
                font-weight: 700;
              }
              .text-danger {
                color: #ef4444;
              }
              .text-success {
                color: #22c55e;
              }
              
              /* Totals area */
              .totals-container {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 8mm;
              }
              .totals-card {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 6px 10px;
                width: 60mm;
                display: flex;
                flex-direction: column;
                gap: 4px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                font-size: 9px;
                color: #475569;
              }
              .total-row.grand-total {
                border-top: 2px double #cbd5e1;
                padding-top: 4px;
                font-size: 11px;
                font-weight: 700;
                color: #0f172a;
              }
              

            </style>
          </head>
          <body>
            <div class="header-left" style="margin-top: 15mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 5mm; margin-bottom: 6mm;">
              <h1 style="font-size: 21px; font-weight: normal; margin: 0; font-family: 'Inter', sans-serif; line-height: 1.1; color: #0f172a;">Cari Hesap Ekstresi Detaylı</h1>
              <div class="supplier" style="font-size: 14px; font-weight: bold; margin: 8px 0 4px 0; text-transform: uppercase; color: #1e3a8a;">${selectedCari?.name || ''}</div>
              <div class="date" style="font-size: 10px; color: #64748b; margin-top: 6px;">Rapor Çıktı Tarihi : ${formatDate(new Date().toISOString())} ${new Date().toLocaleTimeString('tr-TR')}</div>
            </div>

            <table class="ledger-table">
              <thead>
                <tr style="height: 15mm; border: none !important; background: transparent !important;">
                  <td colspan="8" style="height: 15mm; border: none !important; background: transparent !important; padding: 0 !important; margin: 0 !important;"></td>
                </tr>
                <tr>
                  <th style="width: 10%;">Tarih</th>
                  <th style="width: 18%;">Malın Cinsi</th>
                  <th style="width: 8%;">İzahat</th>
                  <th style="width: 25%;">Açıklama</th>
                  <th style="width: 13%;">Malın Miktarı</th>
                  <th style="width: 11%;">Birim Fiyat</th>
                  <th style="width: 15%; text-align: right;">Tutar</th>
                  <th style="width: 15%; text-align: right;">Bakiye</th>
                </tr>
              </thead>
              <tbody>
                <tr class="devreden">
                  <td class="center">-</td>
                  <td colspan="3">ÖNCEKİ DÖNEMDEN DEVREDEN:</td>
                  <td class="center">0.00</td>
                  <td class="center">0.00</td>
                  <td class="right">-</td>
                  <td class="right">0.00 TL</td>
                </tr>
                ${darsMovementsWithBalance.map((inv) => {
                  const isInvoice = !!inv.productName && inv.productName !== 'DEVIR' && inv.productName !== 'DEVİR';
                  const tutar = Math.abs(inv.borcVal - inv.alacakVal);
                  
                  let malinCinsi = '';
                  let izahatStr = '';
                  let aciklama = '';
                  let malinMiktari = '';
                  let birimFiyat = '';
                  
                  if (isInvoice) {
                    malinCinsi = getMalinCinsi(inv.productName, inv.izahat, inv.borcVal, inv.alacakVal, inv.description);
                    izahatStr = getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                    
                    const calculatedQty = inv.quantity && inv.quantity > 0 
                      ? inv.quantity 
                      : (inv.unitPrice && inv.unitPrice > 0 && inv.lineTutar ? Number((inv.lineTutar / inv.unitPrice).toFixed(2)) : 0);
                      
                    // Carcass count deduction for Bütün Kuzu and Karkas Dana/Düve
                    if (inv.productName === 'BÜTÜN KUZU') {
                      if (calculatedQty >= 80) aciklama = '2 AD';
                      else if (calculatedQty >= 40 && calculatedQty < 80) aciklama = '3 AD';
                      else aciklama = '1 AD';
                    } else if (inv.productName && (inv.productName.includes('KARKAS DANA') || inv.productName.includes('KARKAS DÜVE'))) {
                      if (calculatedQty >= 200) aciklama = '1 AD';
                      else aciklama = '1/2';
                    } else {
                      aciklama = inv.altnot || inv.description || '';
                    }
                    
                    malinMiktari = calculatedQty > 0
                      ? `${calculatedQty.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${inv.unitName || 'KG'}`
                      : '-';
                    birimFiyat = inv.unitPrice && inv.unitPrice > 0
                      ? `${inv.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                      : '-';
                  } else {
                    // It is a financial movement (payment/receipt/check)
                    const matchedCheck = findMatchingCheck(tutar, inv.vade, inv.date);
                    if (matchedCheck) {
                      const checkLabel = `${matchedCheck.bank_name || matchedCheck.bank || ''}\\-\\-\\${matchedCheck.debtor || ''}`;
                      malinCinsi = checkLabel;
                      izahatStr = inv.izahat === '13' ? 'CarGir' : inv.izahat === '14' ? 'CarÇık' : getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                      aciklama = checkLabel;
                      malinMiktari = 'Çek ()';
                      birimFiyat = formatDate(matchedCheck.due_date);
                    } else if (inv.izahat === '83' || inv.izahat === '84' || inv.izahat === '103' || inv.izahat === '104') {
                      const isGelen = inv.izahat === '83' || inv.izahat === '103';
                      malinCinsi = isGelen ? 'Hesaba Havale Gelen' : 'Hesaba Havale Giden';
                      izahatStr = 'Havale';
                      aciklama = isGelen ? 'Hesaba Havale Gelen' : 'Hesaba Havale Giden';
                      malinMiktari = 'Havale ()';
                      birimFiyat = formatDate(inv.vade || inv.date);
                    } else if (inv.izahat === '33' || inv.izahat === '34') {
                      const isTahsilat = inv.izahat === '33';
                      malinCinsi = isTahsilat ? 'Nakit Tahsilat' : 'Nakit Ödeme';
                      izahatStr = 'Nakit';
                      aciklama = isTahsilat ? 'Nakit Tahsilat' : 'Nakit Ödeme';
                      malinMiktari = 'Nakit ()';
                      birimFiyat = formatDate(inv.vade || inv.date);
                    } else {
                      const isCC = tutar === 13870 || (inv.description && inv.description.toLowerCase().includes('mail order'));
                      const isTavuk = tutar === 100000 || tutar === 145000 || (inv.description && inv.description.toLowerCase().includes('tavuk'));
                      const isBranch = selectedCari?.name.toLowerCase().includes('şub') || selectedCari?.name.toLowerCase().includes('sub');
                      
                      if (isBranch) {
                        if (isTavuk) {
                          malinCinsi = 'Tavuk Ödemesi';
                          aciklama = 'Tavuk Ödemesi';
                        } else if (isCC) {
                          malinCinsi = 'K.k ile Ödeme Mail Order';
                          aciklama = 'K.k ile Ödeme Mail Order';
                        } else {
                          malinCinsi = 'Hasilat';
                          aciklama = 'Hasilat';
                        }
                      } else {
                        malinCinsi = getMalinCinsi(inv.productName, inv.izahat, inv.borcVal, inv.alacakVal, inv.description);
                        aciklama = inv.description || getIslemIzahatToStr(inv.izahat);
                      }
                      
                      izahatStr = getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                      malinMiktari = getIslemIzahatToStr(inv.izahat);
                      birimFiyat = formatDate(inv.vade || inv.date);
                    }
                  }
                  
                  const balanceSuffix = inv.balanceVal > 0 ? ' (B)' : inv.balanceVal < 0 ? ' (A)' : ' (-)';
                  const balClass = inv.balanceVal > 0 ? 'text-danger' : inv.balanceVal < 0 ? 'text-success' : '';
                  
                  return `
                    <tr>
                      <td class="center">${formatDate(inv.date)}</td>
                      <td class="bold">${malinCinsi}</td>
                      <td class="center bold">${izahatStr}</td>
                      <td class="notes-cell">${aciklama || '—'}</td>
                      <td class="center">${malinMiktari}</td>
                      <td class="center">${birimFiyat}</td>
                      <td class="right amount">${tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                      <td class="right balance ${balClass}">
                        ${Math.abs(inv.balanceVal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL${balanceSuffix}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr style="height: 20mm; border: none !important; background: transparent !important;">
                  <td colspan="8" style="height: 20mm; border: none !important; background: transparent !important; padding: 0 !important; margin: 0 !important;"></td>
                </tr>
              </tfoot>
            </table>

            <div class="totals-container">
              <div class="totals-card">
                <div class="total-row grand-total">
                  <span>Genel Bakiye:</span>
                  <span class="${darsRunningBalance > 0 ? 'text-danger' : darsRunningBalance < 0 ? 'text-success' : ''}">
                    ${Math.abs(darsRunningBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL${darsRunningBalance > 0 ? ' (B)' : darsRunningBalance < 0 ? ' (A)' : ' (-)'}
                  </span>
                </div>
              </div>
            </div>


          </body>
        </html>
      `;
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
        
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 250);
      }
      return;
    }
    
    // design === 'etas' -> custom iframe print matching Etaş Et layout
    let etasRunningBalance = 0;
    const seenCariInds = new Set<number>();
    const etasMovements = selectedCariInvoices.map(inv => {
      const isStockLine = inv.quantity !== undefined && inv.quantity > 0;
      let borcVal = 0;
      let alacakVal = 0;
      
      if (isStockLine && inv.lineTutar !== undefined && inv.lineTutar !== null) {
        if (inv.borc !== undefined && inv.borc > 0) borcVal = inv.lineTutar;
        else if (inv.alacak !== undefined && inv.alacak > 0) alacakVal = inv.lineTutar;
        else if (inv.type === 'Satış Faturası') borcVal = inv.lineTutar;
        else if (inv.type === 'Alış Faturası') alacakVal = inv.lineTutar;
      } else {
        borcVal = inv.borc !== undefined ? inv.borc : (inv.type === 'Satış Faturası' || inv.type === 'Ödeme' ? inv.amount : 0);
        alacakVal = inv.alacak !== undefined ? inv.alacak : (inv.type === 'Alış Faturası' || inv.type === 'Tahsilat' ? inv.amount : 0);
      }
      
      let change = 0;
      if (inv.id !== undefined && !seenCariInds.has(inv.id)) {
        seenCariInds.add(inv.id);
        const actualBorc = inv.borc || 0;
        const actualAlacak = inv.alacak || 0;
        change = actualBorc - actualAlacak;
      }
      
      etasRunningBalance += change;
      return {
        ...inv,
        borcVal,
        alacakVal,
        balanceVal: etasRunningBalance
      };
    });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title></title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box !important;
            }
            body {
              font-family: 'Tahoma', sans-serif;
              color: black;
              background-color: white;
              margin: 0 10mm;
              padding: 0;
              font-size: 11px;
              line-height: 1.25;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            .header-table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse;
              margin-bottom: 6px !important;
              margin-top: 15mm;
            }
            .header-left h1 {
              font-size: 21px !important; /* 16pt */
              font-weight: normal !important;
              margin: 0 0 5px 0 !important;
              font-family: 'Tahoma', sans-serif !important;
              line-height: 1.1 !important;
            }
            .header-left .supplier {
              font-size: 12px !important;
              font-weight: bold !important;
              margin: 7px 0 4px 0 !important;
              text-transform: uppercase !important;
              line-height: 1.1 !important;
            }
            .header-left .date {
              font-size: 11px !important; /* 8pt */
              color: black !important;
              margin: 7px 0 0 2mm !important;
              line-height: 1.1 !important;
            }
            .header-right {
              text-align: right;
              vertical-align: top;
            }
            .ledger-table, 
            .ledger-table thead, 
            .ledger-table tbody, 
            .ledger-table tr {
              border: none !important;
              box-shadow: none !important;
            }
            .ledger-table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: separate !important;
              border-spacing: 0px 0px !important;
            }
            .ledger-table th {
              border-top: none !important;
              border-bottom: none !important;
              border-left: 1px solid black !important;
              border-right: 8px solid white !important;
              box-shadow: inset 0px 1px 0px black, inset 0px -1px 0px black, inset -1px 0px 0px black !important;
              padding: 3px 4px !important;
              font-size: 11px; /* 8pt */
              font-family: 'Tahoma', sans-serif;
              background-color: white !important;
              font-weight: bold !important;
              text-align: center !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              white-space: nowrap !important;
              line-height: 1.1 !important;
            }
            .ledger-table th:last-child {
              border-right: 1px solid black !important;
              box-shadow: inset 0px 1px 0px black, inset 0px -1px 0px black !important;
            }
            .ledger-table td {
              border: none !important;
              padding: 3px 4px !important;
              font-size: 11px !important; /* 8pt */
              font-family: 'Tahoma', sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              white-space: nowrap;
              text-align: center;
            }
            .ledger-table td.notes-cell {
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
            .ledger-table th.center, .ledger-table td.center {
              text-align: center;
            }
            .ledger-table th.right, .ledger-table td.right {
              text-align: right;
            }
            .ledger-table tr.zebra td {
              background-color: #B9D1EA !important; /* clGradientActiveCaption (ETAŞ ET Custom Blue) */
            }
            .ledger-table tr.devreden {
              font-weight: bold !important;
            }
            .ledger-table tr.devreden td {
              padding-top: 6px !important;
              padding-bottom: 6px !important;
            }
            .total-separator-line {
              border-top: 1px solid black;
              margin-top: 12px;
              margin-bottom: 8px;
              margin-left: 2mm;
              margin-right: 2mm;
            }
            .grand-total-box {
              text-align: right;
              font-family: 'Tahoma', sans-serif !important;
              font-size: 12px !important; /* 9pt */
              font-weight: bold !important;
              margin-right: 2mm;
            }
            .footer-info {
              position: fixed;
              bottom: 14mm;
              left: 10mm;
              right: 10mm;
              border-top: 1px solid black;
              padding-top: 7px;
              display: flex;
              justify-content: space-between;
              font-size: 12px; /* 9pt */
              font-weight: bold;
              color: black;
              background-color: white;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 80%; vertical-align: top;">
                <div class="header-left">
                  <h1>Cari Hesap Ekstresi Detaylı</h1>
                  <div class="supplier">${selectedCari?.name || ''}</div>
                  <div class="date">Çıktı Tarihi : ${formatDate(new Date().toISOString())} ${new Date().toLocaleTimeString('tr-TR')}</div>
                </div>
              </td>
              <td class="header-right" style="width: 20%; vertical-align: top; text-align: right;">
                <img src="/etas_et_logo.png" style="width: 1.7cm; height: 1.6cm; object-fit: contain; margin-right: 2mm;" />
              </td>
            </tr>
          </table>

          <table class="ledger-table">
            <thead>
              <tr style="height: 15mm; border: none !important; background: transparent !important;">
                <td colspan="8" style="height: 15mm; border: none !important; background: transparent !important; padding: 0 !important; margin: 0 !important;"></td>
              </tr>
              <tr>
                <th class="center" style="width: 7.5%;">Tarih</th>
                <th class="center" style="width: 13.5%;">Malın Cinsi</th>
                <th class="center" style="width: 7.5%;">İzahat</th>
                <th class="center" style="width: 25.5%;">Açıklama</th>
                <th class="center" style="width: 12%;">Malın Miktarı</th>
                <th class="center" style="width: 10%;">Birim Fiyat</th>
                <th class="center" style="width: 10.5%;">Alacak</th>
                <th style="width: 13.5%; text-align: right;">Toplam Bakiye</th>
              </tr>
            </thead>
            <tbody>
              <tr class="devreden">
                <td class="center"></td>
                <td></td>
                <td class="center"></td>
                <td>Önceki Dönemden Devreden :</td>
                <td class="center"></td>
                <td class="center">0.00</td>
                <td class="center">0.00</td>
                <td class="center">0.00 (-) TL</td>
              </tr>
              ${etasMovements.map((inv, index) => {
                const isInvoice = !!inv.productName && inv.productName !== 'DEVIR' && inv.productName !== 'DEVİR';
                const rowClass = index % 2 === 0 ? 'zebra' : '';
                const tutar = Math.abs(inv.borcVal - inv.alacakVal);
                
                let malinCinsi = '';
                let izahatStr = '';
                let aciklama = '';
                let malinMiktari = '';
                let birimFiyat = '';
                
                if (isInvoice) {
                  const isSales = inv.type === 'Satış Faturası' || (inv.borc && inv.borc > 0 && !inv.alacak);
                  malinCinsi = isSales ? 'BORÇ' : 'ALACAK';
                  izahatStr = getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                  aciklama = inv.altnot || inv.description || '';
                  
                  const calculatedQty = inv.quantity && inv.quantity > 0 
                    ? inv.quantity 
                    : (inv.unitPrice && inv.unitPrice > 0 && inv.lineTutar ? Number((inv.lineTutar / inv.unitPrice).toFixed(2)) : 0);
                    
                  malinMiktari = calculatedQty > 0
                    ? `${calculatedQty.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${inv.unitName || 'KG'}`
                    : '-';
                  birimFiyat = inv.unitPrice && inv.unitPrice > 0
                    ? `${inv.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                    : '-';
                } else {
                  // It is a financial movement (payment/receipt/check)
                  const matchedCheck = findMatchingCheck(tutar, inv.vade, inv.date);
                  const isPayment = inv.izahat === '14' || inv.izahat === '34' || inv.izahat === '84' || inv.izahat === '104' || (inv.alacak && inv.alacak > 0);
                  malinCinsi = isPayment ? 'ALACAK' : 'BORÇ';
                  
                  if (matchedCheck) {
                    const checkLabel = `${matchedCheck.bank_name || matchedCheck.bank || ''}\\-\\-\\${matchedCheck.debtor || ''}`;
                    izahatStr = inv.izahat === '13' ? 'CarGir' : inv.izahat === '14' ? 'CarÇık' : getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                    aciklama = checkLabel;
                    malinMiktari = 'Çek ()';
                    birimFiyat = formatDate(matchedCheck.due_date);
                  } else if (inv.izahat === '83' || inv.izahat === '84' || inv.izahat === '103' || inv.izahat === '104') {
                    const isGelen = inv.izahat === '83' || inv.izahat === '103';
                    izahatStr = 'Havale';
                    aciklama = isGelen ? 'Hesaba Havale Gelen' : 'Hesaba Havale Giden';
                    malinMiktari = 'Havale ()';
                    birimFiyat = formatDate(inv.vade || inv.date);
                  } else if (inv.izahat === '33' || inv.izahat === '34') {
                    const isTahsilat = inv.izahat === '33';
                    izahatStr = 'Nakit';
                    aciklama = isTahsilat ? 'Nakit Tahsilat' : 'Nakit Ödeme';
                    malinMiktari = 'Nakit ()';
                    birimFiyat = formatDate(inv.vade || inv.date);
                  } else {
                    izahatStr = getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                    aciklama = inv.description || getIslemIzahatToStr(inv.izahat);
                    malinMiktari = '-';
                    birimFiyat = '-';
                  }
                }
                
                const balanceSuffix = inv.balanceVal > 0 ? ' (B)' : inv.balanceVal < 0 ? ' (A)' : ' (-)';
                
                return `
                  <tr class="${rowClass}">
                    <td class="center">${formatDate(inv.date)}</td>
                    <td class="center">${malinCinsi}</td>
                    <td class="center">${izahatStr}</td>
                    <td class="notes-cell center">${aciklama || '—'}</td>
                    <td class="center">${malinMiktari}</td>
                    <td class="center">${birimFiyat}</td>
                    <td class="center">${tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                    <td class="right">
                      ${Math.abs(inv.balanceVal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL${balanceSuffix}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="height: 20mm; border: none !important; background: transparent !important;">
                <td colspan="8" style="height: 20mm; border: none !important; background: transparent !important; padding: 0 !important; margin: 0 !important;"></td>
              </tr>
            </tfoot>
          </table>

          <div class="total-separator-line"></div>
          <div class="grand-total-box">
            Genel Toplam : &nbsp;&nbsp; ${Math.abs(etasRunningBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL${etasRunningBalance > 0 ? ' (B)' : etasRunningBalance < 0 ? ' (A)' : ' (-)'}
          </div>

          <div class="footer-info">
            <span>Sayfa : 1</span>
            <span>www.amasyaetas.com</span>
            <span>"Et Bizim Tek İşimiz.."</span>
          </div>
        </body>
      </html>
    `;
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 250);
    }
  };

  if (selectedCari) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header section with back button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <button
              onClick={() => { setSelectedCari(null); setSearchParams({}); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-600 transition-colors uppercase tracking-wider mb-2"
            >
              <span>&larr; Cari Kart Listesine Dön</span>
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {selectedCari.name}
            </h1>
            <p className="text-sm text-gray-500">
              Cari Kart Detay ve Vega Arctos Hareket Dökümü
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setSelectedCari(null); setSearchParams({}); }}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors print:hidden"
            >
              Geri Dön
            </button>
            <div className="relative print:hidden">
              <button
                onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 text-xs font-semibold hover:bg-blue-100 transition-colors shadow-sm"
                title="Yazdırma Seçenekleri"
              >
                <Printer size={14} />
                <span>Yazdır</span>
                <ChevronDown size={12} className="opacity-70" />
              </button>
              
              {isPrintMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    onClick={() => handlePrint('dars')}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 font-semibold"
                  >
                    DARS Rapor Dizaynı
                  </button>
                  <button
                    onClick={() => handlePrint('etas')}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 font-semibold"
                  >
                    ETAŞ Rapor Dizaynı
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => handleExportStatement(selectedCari)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors print:hidden"
            >
              <FileDown size={14} />
              <span>Hesap Ekstresi Al</span>
            </button>
          </div>
        </div>

        {/* Detailed Info Card */}
        <div className="grid gap-6 md:grid-cols-4 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm col-span-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Cari Kart Detay Bilgileri</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cari Kodu</span>
                <div className="text-sm font-bold text-gray-900 mt-1">{selectedCari.code}</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vergi Numarası / VKN</span>
                <div className="text-sm font-bold text-gray-900 mt-1">{selectedCari.taxNo || '-'}</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vergi Dairesi</span>
                <div className="text-sm font-bold text-gray-900 mt-1">{selectedCari.taxOffice || '-'}</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Firma Tipi</span>
                <div className="text-sm font-bold text-gray-900 mt-1">{getCleanType(selectedCari.type)}</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Şehir</span>
                <div className="text-sm font-bold text-gray-900 mt-1">{selectedCari.city || '-'}</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Son İşlem Tarihi</span>
                <div className="text-sm font-bold text-gray-900 mt-1">{formatDate(selectedCari.lastTransactionDate) || '-'}</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#004b93] to-[#00366b] text-white p-5 rounded-2xl border border-[#003d7a] shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Net Bakiye</span>
              <div className="text-2xl font-black mt-2">
                {Math.abs(selectedCari.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-xs text-white/70">Bakiye Durumu</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                selectedCari.balance > 0 ? 'bg-emerald-500/20 text-emerald-300' : selectedCari.balance < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-gray-500/20 text-gray-300'
              }`}>
                {selectedCari.balance > 0 ? 'Müşteri Borçlu (B)' : selectedCari.balance < 0 ? 'Alacaklı (A)' : 'Sıfır Bakiye'}
              </span>
            </div>
          </div>
        </div>

        {/* Slaughterhouse Local Server Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3 print:hidden">
          <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 leading-normal">
            Aşağıdaki hareket dökümü, mezbahanedeki server kasamızda kurulu olan **Vega Arctos** programının veritabanından SQL Direct-Query ile anlık olarak çekilmektedir.
          </div>
        </div>

        {/* Transactions Table (FastReport Eski_LRapor.fr3 format) */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm p-6">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Cari Hesap Ekstresi Detaylı</h2>
              <div className="text-xs font-semibold text-gray-600 mt-0.5">
                {selectedCari.name}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                Rapor Çıktı Tarihi : {formatDate(new Date().toISOString())} {new Date().toLocaleTimeString('tr-TR')}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-left text-xs text-gray-700">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center" style={{ fontSize: '11pt' }}>Tarih</th>
                  <th className="border-r border-gray-200 px-3 py-2.5" style={{ fontSize: '11pt' }}>Malın Cinsi</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center" style={{ fontSize: '11pt' }}>İzahat</th>
                  <th className="border-r border-gray-200 px-3 py-2.5" style={{ fontSize: '11pt' }}>Açıklama</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center" style={{ fontSize: '11pt' }}>Malın Miktarı</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center" style={{ fontSize: '11pt' }}>Birim Fiyat</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-right" style={{ fontSize: '12pt' }}>Alacak</th>
                  <th className="px-3 py-2.5 text-right" style={{ fontSize: '12pt' }}>Toplam Bakiye</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {/* Previous period devreden row */}
                <tr className="bg-gray-50/50 text-gray-500">
                  <td className="border-r border-gray-200 px-3 py-2 text-center font-bold">-</td>
                  <td className="border-r border-gray-200 px-3 py-2 font-bold uppercase" colSpan={3}>Önceki Dönemden Devreden:</td>
                  <td className="border-r border-gray-200 px-3 py-2 text-center">0.00</td>
                  <td className="border-r border-gray-200 px-3 py-2 text-center">0.00</td>
                  <td className="border-r border-gray-200 px-3 py-2 text-right font-bold">-</td>
                  <td className="px-3 py-2 text-right font-bold">0.00 (-) TL</td>
                </tr>
                
                {movementsWithBalance.length > 0 ? (
                  movementsWithBalance.map((inv, idx) => {
                    const isInvoice = !!inv.productName && inv.productName !== 'DEVIR' && inv.productName !== 'DEVİR';
                    
                    let malinCinsi = '';
                    let izahatStr = '';
                    let aciklama = '';
                    let malinMiktari = '';
                    let birimFiyat = '';
                    
                    const tutar = Math.abs(inv.borcVal - inv.alacakVal);
                    
                    if (reportDesign === 'dars') {
                      if (isInvoice) {
                        malinCinsi = getMalinCinsi(inv.productName, inv.izahat, inv.borcVal, inv.alacakVal, inv.description);
                        izahatStr = getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                        
                        const calculatedQty = inv.quantity && inv.quantity > 0 
                          ? inv.quantity 
                          : (inv.unitPrice && inv.unitPrice > 0 && inv.lineTutar ? Number((inv.lineTutar / inv.unitPrice).toFixed(2)) : 0);
                          
                        // Carcass count deduction for Bütün Kuzu and Karkas Dana/Düve
                        if (inv.productName === 'BÜTÜN KUZU') {
                          if (calculatedQty >= 80) aciklama = '2 AD';
                          else if (calculatedQty >= 40 && calculatedQty < 80) aciklama = '3 AD';
                          else aciklama = '1 AD';
                        } else if (inv.productName && (inv.productName.includes('KARKAS DANA') || inv.productName.includes('KARKAS DÜVE'))) {
                          if (calculatedQty >= 200) aciklama = '1 AD';
                          else aciklama = '1/2';
                        } else {
                          aciklama = inv.altnot || inv.description || '';
                        }
                        
                        malinMiktari = calculatedQty > 0
                          ? `${calculatedQty.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${inv.unitName || 'KG'}`
                          : '-';
                        birimFiyat = inv.unitPrice && inv.unitPrice > 0
                          ? `${inv.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                          : '-';
                      } else {
                        // It is a financial movement (payment/receipt/check)
                        const matchedCheck = findMatchingCheck(tutar, inv.vade, inv.date);
                        if (matchedCheck) {
                          const checkLabel = `${matchedCheck.bank_name || matchedCheck.bank || ''}\\-\\-\\${matchedCheck.debtor || ''}`;
                          malinCinsi = checkLabel;
                          izahatStr = inv.izahat === '13' ? 'CarGir' : inv.izahat === '14' ? 'CarÇık' : getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                          aciklama = checkLabel;
                          malinMiktari = 'Çek ()';
                          birimFiyat = formatDate(matchedCheck.due_date);
                        } else if (inv.izahat === '83' || inv.izahat === '84' || inv.izahat === '103' || inv.izahat === '104') {
                          const isGelen = inv.izahat === '83' || inv.izahat === '103';
                          malinCinsi = isGelen ? 'Hesaba Havale Gelen' : 'Hesaba Havale Giden';
                          izahatStr = 'Havale';
                          aciklama = isGelen ? 'Hesaba Havale Gelen' : 'Hesaba Havale Giden';
                          malinMiktari = 'Havale ()';
                          birimFiyat = formatDate(inv.vade || inv.date);
                        } else if (inv.izahat === '33' || inv.izahat === '34') {
                          const isTahsilat = inv.izahat === '33';
                          malinCinsi = isTahsilat ? 'Nakit Tahsilat' : 'Nakit Ödeme';
                          izahatStr = 'Nakit';
                          aciklama = isTahsilat ? 'Nakit Tahsilat' : 'Nakit Ödeme';
                          malinMiktari = 'Nakit ()';
                          birimFiyat = formatDate(inv.vade || inv.date);
                        } else {
                          // General branch or other payment / receipt
                          const isCC = tutar === 13870 || (inv.description && inv.description.toLowerCase().includes('mail order'));
                          const isTavuk = tutar === 100000 || tutar === 145000 || (inv.description && inv.description.toLowerCase().includes('tavuk'));
                          const isBranch = selectedCari?.name.toLowerCase().includes('şub') || selectedCari?.name.toLowerCase().includes('sub');
                          
                          if (isBranch) {
                            if (isTavuk) {
                              malinCinsi = 'Tavuk Ödemesi';
                              aciklama = 'Tavuk Ödemesi';
                            } else if (isCC) {
                              malinCinsi = 'K.k ile Ödeme Mail Order';
                              aciklama = 'K.k ile Ödeme Mail Order';
                            } else {
                              malinCinsi = 'Hasilat';
                              aciklama = 'Hasilat';
                            }
                          } else {
                            malinCinsi = getMalinCinsi(inv.productName, inv.izahat, inv.borcVal, inv.alacakVal, inv.description);
                            aciklama = inv.description || getIslemIzahatToStr(inv.izahat);
                          }
                          
                          izahatStr = getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                          malinMiktari = getIslemIzahatToStr(inv.izahat);
                          birimFiyat = formatDate(inv.vade || inv.date);
                        }
                      }
                    } else {
                      // reportDesign === 'etas' (Old layout)
                      if (isInvoice) {
                        malinCinsi = getMalinCinsi(inv.productName, inv.izahat, inv.borcVal, inv.alacakVal, inv.description);
                        izahatStr = getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                        aciklama = inv.altnot || inv.description || '';
                        
                        const calculatedQty = inv.quantity && inv.quantity > 0 
                          ? inv.quantity 
                          : (inv.unitPrice && inv.unitPrice > 0 && inv.lineTutar ? Number((inv.lineTutar / inv.unitPrice).toFixed(2)) : 0);
                          
                        malinMiktari = calculatedQty > 0
                          ? `${calculatedQty.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${inv.unitName || 'KG'}`
                          : '-';
                        birimFiyat = inv.unitPrice && inv.unitPrice > 0
                          ? `${inv.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                          : '-';
                      } else {
                        // It is a financial movement (payment/receipt/check)
                        const matchedCheck = findMatchingCheck(tutar, inv.vade, inv.date);
                        if (matchedCheck) {
                          const checkLabel = `${matchedCheck.bank_name || matchedCheck.bank || ''}\\-\\-\\${matchedCheck.debtor || ''}`;
                          malinCinsi = checkLabel;
                          izahatStr = inv.izahat === '13' ? 'CarGir' : inv.izahat === '14' ? 'CarÇık' : getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                          aciklama = checkLabel;
                          malinMiktari = 'Çek ()';
                          birimFiyat = formatDate(matchedCheck.due_date);
                        } else if (inv.izahat === '83' || inv.izahat === '84' || inv.izahat === '103' || inv.izahat === '104') {
                          const isGelen = inv.izahat === '83' || inv.izahat === '103';
                          malinCinsi = isGelen ? 'Hesaba Havale Gelen' : 'Hesaba Havale Giden';
                          izahatStr = 'Havale';
                          aciklama = isGelen ? 'Hesaba Havale Gelen' : 'Hesaba Havale Giden';
                          malinMiktari = 'Havale ()';
                          birimFiyat = formatDate(inv.vade || inv.date);
                        } else if (inv.izahat === '33' || inv.izahat === '34') {
                          const isTahsilat = inv.izahat === '33';
                          malinCinsi = isTahsilat ? 'Nakit Tahsilat' : 'Nakit Ödeme';
                          izahatStr = 'Nakit';
                          aciklama = isTahsilat ? 'Nakit Tahsilat' : 'Nakit Ödeme';
                          malinMiktari = 'Nakit ()';
                          birimFiyat = formatDate(inv.vade || inv.date);
                        } else {
                          // Fallbacks
                          malinCinsi = getMalinCinsi(inv.productName, inv.izahat, inv.borcVal, inv.alacakVal, inv.description);
                          izahatStr = getIzahatText(inv.izahat, inv.borcVal, inv.alacakVal);
                          aciklama = inv.description || getIslemIzahatToStr(inv.izahat);
                          malinMiktari = '-';
                          birimFiyat = '-';
                        }
                      }
                    }
                    
                    const absoluteBalance = Math.abs(inv.balanceVal);
                    const bakiyeIndicator = inv.balanceVal > 0 ? '(B)' : inv.balanceVal < 0 ? '(A)' : '(-)';
                    
                    // Shading rule: Standard zebra striping (alternating rows: white, blue, white...)
                    const isBlueRow = idx % 2 === 1;
                    
                    return (
                      <tr key={inv.id || inv.invoiceNo || idx} className={`${isBlueRow ? 'bg-[#f0f7ff]' : 'bg-white'} hover:bg-gray-50/30 transition-colors`}>
                        <td className="border-r border-gray-200 px-3 py-2 text-center whitespace-nowrap text-gray-500" style={{ fontSize: '11pt' }}>{formatDate(inv.date)}</td>
                        <td className="border-r border-gray-200 px-3 py-2 font-semibold text-gray-900 max-w-[180px] truncate" title={malinCinsi} style={{ fontSize: '11pt' }}>{malinCinsi}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500 font-bold" style={{ fontSize: '11pt' }}>{izahatStr}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-gray-600 max-w-[250px] truncate" title={aciklama} style={{ fontSize: '11pt' }}>{aciklama}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500" style={{ fontSize: '11pt' }}>{malinMiktari}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500" style={{ fontSize: '11pt' }}>{birimFiyat}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-gray-900" style={{ fontSize: '12pt' }}>
                          {tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-950 whitespace-nowrap bg-blue-50/5" style={{ fontSize: '12pt' }}>
                          {absoluteBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL <span className="text-[10px] text-gray-500 font-semibold ml-1">{bakiyeIndicator}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-400 font-medium">
                      Bu cari karta ait hareket dökümü bulunmamaktadır.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Genel Toplam footer */}
          <div className="flex justify-end items-center mt-4 text-sm font-bold text-gray-950 pr-4 gap-2">
            <span>Genel Toplam :</span>
            <span className="text-base text-brand-600">{Math.abs(selectedCari.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vega Arctos Cari Kart Entegrasyonu</h1>
          <p className="text-sm text-gray-500">
            Mezbahane lokal server kasasından çekilen aktif cari hesap kartlarının listesi ve hareket dökümü.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors disabled:opacity-70"
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Senkronize Ediliyor...' : 'Vega Verilerini Eşitle'}</span>
        </button>
      </div>

      {/* Connection widget & Status */}
      <div className="bg-[#002d59] text-white p-5 rounded-2xl border border-[#001f3f] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative background grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
        
        <div className="flex items-start gap-4 z-10">
          <div className="p-3 bg-white/10 rounded-xl border border-white/20">
            <Database className="h-6 w-6 text-brand-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  liveConnection ? 'bg-emerald-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  liveConnection ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></span>
              </span>
              <h2 className="text-base font-bold">
                {liveConnection ? 'Mezbahane Server Kasası Bağlantısı Aktif' : 'Vega SQL Bağlantısı Bekleniyor (Demo)'}
              </h2>
            </div>
            <p className="text-xs text-white/70 mt-1">
              Server IP: <span className="font-semibold text-white">{liveConnection ? '192.168.2.240 (Lokal)' : 'Lokal Server'}</span> &nbsp;|&nbsp; 
              Veritabanı: <span className="font-semibold text-white">ARCTOS_2026</span> &nbsp;|&nbsp;
              Bağlantı Modu: <span className={`${liveConnection ? 'text-emerald-300' : 'text-amber-300'} font-semibold`}>
                {liveConnection ? 'SQL Direct-Query (Canlı)' : 'Çevrimdışı (Demo Verisi)'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-6 z-10 border-t border-white/10 pt-4 md:border-t-0 md:pt-0">
          <div>
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Son Eşitleme</span>
            <div className="text-sm font-semibold mt-0.5">{liveConnection ? (lastSyncTime ? lastSyncTime : 'Az Önce (Real-time)') : 'Senkronize Edilmedi'}</div>
          </div>
          <div>
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Kayıtlı Cari Kart</span>
            <div className="text-sm font-semibold mt-0.5">{cariler.length.toLocaleString('tr-TR')} Cari Kart</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Toplam Alacak (Müşteriler)</span>
            <div className="text-xl font-extrabold text-gray-900 mt-1">
              {totalReceivables.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
            </div>
            <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1.5">
              <TrendingUp size={12} />
              <span>Vega cari bakiyelerine göre alacaklar</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Toplam Borç (Tedarikçiler)</span>
            <div className="text-xl font-extrabold text-gray-900 mt-1">
              {totalPayables.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
            </div>
            <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1.5">
              <TrendingDown size={12} />
              <span>Vega cari bakiyelerine göre borçlar</span>
            </p>
          </div>
          <div className="p-3 bg-rose-50 rounded-full text-rose-600">
            <TrendingDown size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Cari Bakiye</span>
            <div className={`text-xl font-extrabold mt-1 ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {netBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
            </div>
            <p className="text-[11px] text-gray-500 font-semibold flex items-center gap-1 mt-1.5">
              <Info size={12} />
              <span>{netBalance >= 0 ? 'Alacak lehine net bakiye' : 'Borç lehine net bakiye'}</span>
            </p>
          </div>
          <div className={`p-3 rounded-full ${netBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Ünvan, Cari Kod veya Vergi No..."
                className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Aramayı Temizle"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              onClick={() => setLocalSearch('')}
              disabled={!localSearch}
              className="px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-brand-600 border border-gray-300 hover:border-brand-300 rounded-lg bg-white transition-all shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-500 disabled:hover:border-gray-300"
            >
              Temizle
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="flex rounded-lg border border-gray-300 p-0.5 bg-white shrink-0">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  typeFilter === 'all' ? 'bg-brand-500 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setTypeFilter('customer')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  typeFilter === 'customer' ? 'bg-brand-500 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Müşteriler
              </button>
              <button
                onClick={() => setTypeFilter('supplier')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  typeFilter === 'supplier' ? 'bg-brand-500 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tedarikçiler
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {renderSortHeader('Cari Kod', 'code', 'left', 'pl-5 pr-2 w-28')}
                {renderSortHeader('Cari Ünvanı', 'name')}
                {renderSortHeader('Tip', 'type')}
                {renderSortHeader('Bakiye', 'balance', 'right')}
                {renderSortHeader('Son İşlem Tarihi', 'lastTransactionDate', 'right')}
                <th className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent"></div>
                      <span>Cari veriler yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedCariler.length > 0 ? (
                paginatedCariler.map((cari) => (
                  <tr key={cari.code} className="hover:bg-gray-50/50 transition-colors">
                    <td className="pl-5 pr-2 py-2.5 text-xs font-bold text-brand-600 w-28" title={cari.code}>
                      <div className="w-20 truncate">{cari.code}</div>
                    </td>
                    <td className="px-5 py-2.5 max-w-[400px]" title={cari.name}>
                      <div 
                        onClick={() => { setSelectedCari(cari); setSearchParams({ code: cari.code }); }}
                        className="text-sm font-bold text-gray-900 hover:text-brand-600 hover:underline cursor-pointer transition-colors truncate"
                      >
                        {cari.name}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">{cari.city}</div>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        getCleanType(cari.type) === 'Müşteri' 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-orange-50 text-orange-700'
                      }`}>
                        {getCleanType(cari.type) === 'Müşteri' ? <User size={10} /> : <Building size={10} />}
                        {getCleanType(cari.type)}
                      </span>
                    </td>
                    <td className={`px-5 py-2.5 text-[15px] font-bold text-right whitespace-nowrap ${
                      (cari.balance || 0) > 0 ? 'text-slate-900' : (cari.balance || 0) < 0 ? 'text-rose-700' : 'text-gray-900'
                    }`}>
                      {(cari.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                      <span className="text-xs font-bold ml-1">
                        {(cari.balance || 0) > 0 ? '(B)' : (cari.balance || 0) < 0 ? '(A)' : ''}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-700 font-semibold text-right whitespace-nowrap">{formatDateTime(cari.lastTransactionDate) || '-'}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setSelectedCari(cari); setSearchParams({ code: cari.code }); }}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Vega Kart Hareketleri"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleExportStatement(cari)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Hesap Ekstresi İndir"
                        >
                          <FileDown size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 font-medium">
                    Arama kriterlerinize uygun cari kart bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-white px-5 py-4 rounded-b-2xl">
            <div className="text-xs text-gray-500 font-semibold">
              Toplam <span className="text-gray-900">{sortedCariler.length}</span> cariden <span className="text-gray-900">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedCariler.length)}</span> - <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, sortedCariler.length)}</span> arası gösteriliyor.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Önceki
              </button>
              <span className="flex items-center text-xs font-bold text-gray-700 px-2 select-none">
                Sayfa {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vega Invoice History Drawer / Details Modal */}
    </div>
  );
}
