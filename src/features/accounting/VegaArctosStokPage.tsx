import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  RefreshCw, 
  Eye, 
  X,
  TrendingUp,
  TrendingDown,
  Package,
  Layers,
  Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

interface CariMovement {
  id: string;
  cari_code: string;
  date: string;
  invoice_no: string;
  izahat: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_tutar: number;
  product_name: string | null;
  unit_name: string | null;
  borc: number;
  alacak: number;
  vade: string | null;
  type: string;
  amount: number;
  companyName?: string;
}

interface StockSummary {
  productName: string;
  unitName: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  avgPurchasePrice: number;
  avgSalesPrice: number;
  lastMovementDate: string | null;
  movements: CariMovement[];
}

const DEFAULT_ORG_ID = '13b8da90-27d1-440d-a8f4-eb50dadd6391';

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

export const isMeatProduct = (name: string): boolean => {
  if (!name) return false;
  const norm = turkishNormalize(name);

  // 1. Explicit other categories (poultry, grocery, cleaning, packaging etc.)
  const nonMeatPatterns = [
    'tavuk', 'pilic', 'hindi', 'yumurta', 'kanat', 'baget',
    'pilic but', 'tavuk but', 'pilic goğus', 'pilic gogus', 'pilic kanat', 'pilic pirzola',
    'mercimek', 'nohut', 'fasulye', 'pirinc', 'bulgur', 'bakliyat', 'makarna', 'seker', 'tuz',
    'salca', 'zeytin', 'zeytinyagi', 'aycicek', 'aycicegi', 'misirozu', 'margarin',
    'peynir', 'kasar', 'lor', 'yogurt', 'sut', 'ayran', 'tereyagi', 'tereyag', 'kaymak',
    'deterjan', 'sabun', 'camasir', 'bulasik', 'pecete', 'havlu', 'poset', 'koli', 'strec', 'strech', 'ambalaj', 'kutu',
    'baharat', 'karabiber', 'kimyon', 'kekik', 'pul biber', 'isot', 'nane', 'sarimsak', 'sogan', 'patates', 'domates', 'biber', 'salatalik',
    'ekmek', 'lavas', 'pide', 'corek', 'tatli', 'baklava', 'helva', 'recel', 'bal',
    'cay', 'kahve', 'maden suyu', 'kola', 'fanta', 'gazoz', 'mesrubat', 'meyve suyu'
  ];

  for (const nonMeat of nonMeatPatterns) {
    if (norm.includes(nonMeat)) return false;
  }

  // 2. Positive Red Meat / Meat Products patterns
  const meatPatterns = [
    'dana', 'kuzu', 'karkas', 'kiyma', 'kusbasi', 'kus basi', 'bonfile', 'antrikot',
    'biftek', 'pirzola', 'kontrfile', 'tranc', 'trans', 'dos', 'gulas', 'gerdan',
    'incik', 'nuar', 'kontrnuar', 'sakatat', 'ciger', 'yurek', 'bobrek', 'dil',
    'kelle', 'paca', 'iskembe', 'bagirsak', 'sucuk', 'salam', 'sosis', 'pastirma',
    'kavurma', 'jambon', 'kofte', 'doner', 'mumbar', 'sirden', 'kaburga', 'kaski',
    'fleto', 'steak', 'poc', 'haslama', 'kemik', 'ilik', 'kuyruk', 'donyagi', 'ic yagi',
    'tosun', 'duve', 'buyukbas', 'kucukbas', 'ercec', 'oglak', 'koyun', 'koc', 'keci',
    'et ', ' et', 'eti', 'etler', 'kiyma', 'kuzu kol', 'kuzu but', 'dana kol', 'dana but',
    'tas kebap', 'sote', 'kavurmalik', 'cig et', 'haslamalik', 'kiymasi'
  ];

  for (const meat of meatPatterns) {
    if (norm.includes(meat)) return true;
  }

  return false;
};

export function VegaArctosStokPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProductParam = searchParams.get('product');

  const [isLoading, setIsLoading] = useState(true);
  const [movements, setMovements] = useState<CariMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inStock' | 'critical'>('all');
  
  // Category Group Filter (Default: 'meat' as requested)
  const [productCategory, setProductCategory] = useState<'meat' | 'other' | 'all'>('meat');

  const [selectedProduct, setSelectedProduct] = useState<StockSummary | null>(null);

  // Sorting (Varsayılan: Toplam Çıkış çoktan aza)
  const [sortField, setSortField] = useState<'productName' | 'totalIn' | 'totalOut' | 'currentStock' | 'avgPurchasePrice' | 'avgSalesPrice' | 'lastMovementDate'>('totalOut');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Theme & Bulut ERP States
  const [sidebarTheme, setSidebarTheme] = useState<'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp'>(() => {
    try {
      return (localStorage.getItem(`sidebar_theme_${user?.email}`) as any) || 'one_dars_v4';
    } catch {
      return 'one_dars_v4';
    }
  });

  useEffect(() => {
    const handleThemeChange = () => {
      try {
        const theme = (localStorage.getItem(`sidebar_theme_${user?.email}`) as any) || 'one_dars_v4';
        setSidebarTheme(theme);
      } catch (e) {
        setSidebarTheme('one_dars_v4');
      }
    };
    window.addEventListener('sidebar-theme-changed', handleThemeChange);
    return () => window.removeEventListener('sidebar-theme-changed', handleThemeChange);
  }, [user?.email]);

  const [activeErpTab, setActiveErpTab] = useState<'stok' | 'seri' | 'maliyet' | 'enflasyon'>('stok');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const fetchMovements = async () => {
    const orgId = user?.organizationId || DEFAULT_ORG_ID;
    try {
      setIsLoading(true);
      
      // Fetch movements with product_name from Supabase
      const { data: rawMovements, error: movError } = await supabase
        .from('vega_cari_hareketler')
        .select('*')
        .eq('organization_id', orgId)
        .not('product_name', 'is', null)
        .neq('product_name', 'DEVIR')
        .order('date', { ascending: false });

      if (movError) throw movError;

      // Fetch cari names for context
      const { data: cariler, error: cariError } = await supabase
        .from('vega_cariler')
        .select('code, name')
        .eq('organization_id', orgId);

      if (cariError) throw cariError;

      const cariMap = new Map<string, string>();
      if (cariler) {
        cariler.forEach(c => cariMap.set(c.code, c.name));
      }

      const mapped = (rawMovements || []).map((m: any) => ({
        id: m.id,
        cari_code: m.cari_code,
        date: m.date,
        invoice_no: m.invoice_no,
        izahat: m.izahat,
        description: m.description,
        quantity: Number(m.quantity || 0),
        unit_price: Number(m.unit_price || 0),
        line_tutar: Number(m.line_tutar || 0),
        product_name: m.product_name,
        unit_name: m.unit_name,
        borc: Number(m.borc || 0),
        alacak: Number(m.alacak || 0),
        vade: m.vade,
        type: m.type,
        amount: Number(m.amount || 0),
        companyName: cariMap.get(m.cari_code) || m.cari_code
      }));

      setMovements(mapped);
    } catch (err: any) {
      console.error(err);
      notify('Stok verileri yüklenirken hata oluştu: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [user?.organizationId]);

  // Aggregate movements into products
  const stockSummaries = useMemo<StockSummary[]>(() => {
    const productsMap = new Map<string, {
      productName: string;
      unitName: string;
      totalIn: number;
      totalOut: number;
      purchasePrices: number[];
      salesPrices: number[];
      lastMovementDate: string | null;
      movements: CariMovement[];
    }>();

    movements.forEach((m) => {
      const pName = m.product_name || 'Bilinmeyen Ürün';
      const uName = m.unit_name || 'ADET';
      const isPurchase = m.alacak > 0;
      const isSale = m.borc > 0;
      
      // Calculate clean quantity
      let q = m.quantity;
      if (q === 0 && m.unit_price > 0 && m.line_tutar > 0) {
        q = Number((m.line_tutar / m.unit_price).toFixed(4));
      }

      if (!productsMap.has(pName)) {
        productsMap.set(pName, {
          productName: pName,
          unitName: uName,
          totalIn: 0,
          totalOut: 0,
          purchasePrices: [],
          salesPrices: [],
          lastMovementDate: null,
          movements: []
        });
      }

      const entry = productsMap.get(pName)!;
      entry.movements.push(m);

      if (isPurchase) {
        entry.totalIn += q;
        if (m.unit_price > 0) {
          entry.purchasePrices.push(m.unit_price);
        }
      } else if (isSale) {
        entry.totalOut += q;
        if (m.unit_price > 0) {
          entry.salesPrices.push(m.unit_price);
        }
      }

      if (!entry.lastMovementDate || new Date(m.date) > new Date(entry.lastMovementDate)) {
        entry.lastMovementDate = m.date;
      }
    });

    return Array.from(productsMap.values()).map(p => {
      const avgPurchasePrice = p.purchasePrices.length > 0 
        ? p.purchasePrices.reduce((a, b) => a + b, 0) / p.purchasePrices.length 
        : 0;

      const avgSalesPrice = p.salesPrices.length > 0 
        ? p.salesPrices.reduce((a, b) => a + b, 0) / p.salesPrices.length 
        : 0;

      return {
        productName: p.productName,
        unitName: p.unitName,
        totalIn: p.totalIn,
        totalOut: p.totalOut,
        currentStock: p.totalIn - p.totalOut,
        avgPurchasePrice,
        avgSalesPrice,
        lastMovementDate: p.lastMovementDate,
        movements: p.movements
      };
    });
  }, [movements]);

  // Handle selected product param from URL
  useEffect(() => {
    if (selectedProductParam && stockSummaries.length > 0) {
      const matched = stockSummaries.find(p => p.productName === selectedProductParam);
      if (matched) {
        setSelectedProduct(matched);
      }
    }
  }, [selectedProductParam, stockSummaries]);

  // Filters
  const filteredProducts = useMemo(() => {
    return stockSummaries.filter(p => {
      const normQuery = turkishNormalize(searchQuery);
      const matchesSearch = turkishNormalize(p.productName).includes(normQuery);
      if (!matchesSearch) return false;

      // Group Category filter
      const isMeat = isMeatProduct(p.productName);
      if (productCategory === 'meat' && !isMeat) return false;
      if (productCategory === 'other' && isMeat) return false;

      // Stock status filter
      if (filterType === 'inStock') {
        return p.currentStock > 0;
      }
      if (filterType === 'critical') {
        return p.currentStock <= 0;
      }
      return true;
    });
  }, [stockSummaries, searchQuery, filterType, productCategory]);

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'productName') {
        valA = a.productName;
        valB = b.productName;
      } else if (sortField === 'totalIn') {
        valA = a.totalIn;
        valB = b.totalIn;
      } else if (sortField === 'totalOut') {
        valA = a.totalOut;
        valB = b.totalOut;
      } else if (sortField === 'currentStock') {
        valA = a.currentStock;
        valB = b.currentStock;
      } else if (sortField === 'avgPurchasePrice') {
        valA = a.avgPurchasePrice;
        valB = b.avgPurchasePrice;
      } else if (sortField === 'avgSalesPrice') {
        valA = a.avgSalesPrice;
        valB = b.avgSalesPrice;
      } else if (sortField === 'lastMovementDate') {
        valA = a.lastMovementDate || '';
        valB = b.lastMovementDate || '';
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB, 'tr')
          : valB.localeCompare(valA, 'tr');
      }

      const numA = Number(valA || 0);
      const numB = Number(valB || 0);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [filteredProducts, sortField, sortDirection]);

  // Statistics
  const stats = useMemo(() => {
    const activeList = stockSummaries.filter(p => {
      const isMeat = isMeatProduct(p.productName);
      if (productCategory === 'meat') return isMeat;
      if (productCategory === 'other') return !isMeat;
      return true;
    });

    const totalDifferentItems = activeList.length;
    let totalInQty = 0;
    let totalOutQty = 0;
    let totalStockValue = 0;

    activeList.forEach(p => {
      totalInQty += p.totalIn;
      totalOutQty += p.totalOut;
      if (p.currentStock > 0) {
        totalStockValue += p.currentStock * (p.avgPurchasePrice || 0);
      }
    });

    return {
      totalDifferentItems,
      totalInQty,
      totalOutQty,
      totalStockValue
    };
  }, [stockSummaries, productCategory]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'productName' ? 'asc' : 'desc');
    }
  };

  const renderSortHeader = (label: string, field: typeof sortField, align: 'left' | 'right' | 'center' = 'left', customClass = 'px-5') => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`${customClass} py-3 text-[13px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-gray-800 transition-colors select-none group ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        }`}
      >
        <div className={`flex items-center gap-1.5 ${
          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
        }`}>
          <span>{label}</span>
          <span className="text-gray-300 group-hover:text-gray-400 transition-colors text-[10px] ml-0.5">
            {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Full Screen Selected Product Details View
  if (selectedProduct) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header section with back button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => { setSelectedProduct(null); setSearchParams({}); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-600 transition-colors uppercase tracking-wider mb-2"
            >
              <span>&larr; Ürün Listesine Dön</span>
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {selectedProduct.productName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Ürün Fatura ve Hesap Hareketleri Geçmiş Detayı
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setSelectedProduct(null); setSearchParams({}); }}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              Geri Dön
            </button>
          </div>
        </div>

        {/* Detailed Info Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm col-span-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ürün Stok Özeti</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Toplam Çıkış</span>
                <div className="text-sm font-bold text-rose-600 mt-1">
                  {selectedProduct.totalOut.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {selectedProduct.unitName}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Toplam Giriş</span>
                <div className="text-sm font-bold text-emerald-600 mt-1">
                  {selectedProduct.totalIn.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {selectedProduct.unitName}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mevcut Fiili Stok</span>
                <div className="text-sm font-bold text-blue-700 mt-1">
                  {selectedProduct.currentStock.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {selectedProduct.unitName}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ort. Alış Fiyatı</span>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {selectedProduct.avgPurchasePrice > 0 ? `${selectedProduct.avgPurchasePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL` : '-'}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ort. Satış Fiyatı</span>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {selectedProduct.avgSalesPrice > 0 ? `${selectedProduct.avgSalesPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL` : '-'}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Son İşlem Tarihi</span>
                <div className="text-sm font-bold text-gray-900 mt-1">
                  {formatDate(selectedProduct.lastMovementDate)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#004b93] to-[#00366b] text-white p-5 rounded-2xl border border-[#003d7a] shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Fiili Net Stok</span>
              <div className="text-2xl font-black mt-2">
                {selectedProduct.currentStock.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {selectedProduct.unitName}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-xs text-white/70">Stok Durumu</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                selectedProduct.currentStock > 0 ? 'bg-emerald-500/20 text-emerald-300' : selectedProduct.currentStock < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-gray-500/20 text-gray-300'
              }`}>
                {selectedProduct.currentStock > 0 ? 'Stokta Var' : selectedProduct.currentStock < 0 ? 'Açık / Eksi Stok' : 'Tükendi'}
              </span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
          <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 leading-normal">
            Aşağıdaki detay dökümü, bulutta yedeklenen cari hesap hareketleri (fatura detayları) havuzundan çekilmektedir.
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm p-6">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Ürün Hareket Ekstresi Detaylı</h2>
              <div className="text-xs font-semibold text-gray-600 mt-0.5">
                {selectedProduct.productName}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-left text-xs text-gray-700">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center">Tarih</th>
                  <th className="border-r border-gray-200 px-3 py-2.5">Cari Ünvan / Şube</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center">Tür</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center">Fatura No</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-right">Miktar</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-right">Birim Fiyat</th>
                  <th className="px-3 py-2.5 text-right">Toplam Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {selectedProduct.movements.length > 0 ? (
                  selectedProduct.movements.map((mov, idx) => {
                    const isPurchase = mov.alacak > 0;
                    
                    let q = mov.quantity;
                    if (q === 0 && mov.unit_price > 0 && mov.line_tutar > 0) {
                      q = Number((mov.line_tutar / mov.unit_price).toFixed(4));
                    }
                    const isBlueRow = idx % 2 === 1;

                    return (
                      <tr key={mov.id || idx} className={`${isBlueRow ? 'bg-[#f0f7ff]' : 'bg-white'} hover:bg-gray-50/30 transition-colors`}>
                        <td className="border-r border-gray-200 px-3 py-2 text-center whitespace-nowrap text-gray-500">
                          {formatDate(mov.date)}
                        </td>
                        <td className="border-r border-gray-200 px-3 py-2 font-semibold text-gray-900 max-w-[150px] truncate" title={mov.companyName}>
                          {mov.companyName}
                        </td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            isPurchase ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {isPurchase ? 'Alış' : 'Satış'}
                          </span>
                        </td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center font-bold text-gray-500">
                          {mov.invoice_no || '-'}
                        </td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right font-semibold">
                          {q.toLocaleString('tr-TR')} {selectedProduct.unitName}
                        </td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right font-semibold">
                          {mov.unit_price > 0 ? `${mov.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-black text-slate-950">
                          {mov.line_tutar > 0 ? `${mov.line_tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL` : '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-400 font-medium">
                      Bu ürüne ait hareket dökümü bulunmamaktadır.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner / Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vega Stok Yönetimi (Hesap Hareketleri)</h1>
          <p className="text-sm text-gray-500">
            Cari hesap hareketlerinden derlenmiş, canlı fatura verilerine dayanan stok giriş/çıkış modülü.
          </p>
        </div>
        <button
          onClick={fetchMovements}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>Verileri Yenile</span>
        </button>
      </div>

      {/* Bulut ERP Tab Navigation */}
      {sidebarTheme === 'bulut_erp' && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveErpTab('stok')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'stok' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Stok Kart Listesi
          </button>
          <button
            onClick={() => setActiveErpTab('seri')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'seri' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Seri No / Lot Takibi
          </button>
          <button
            onClick={() => setActiveErpTab('maliyet')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'maliyet' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Stok Maliyetlendirme (FIFO)
          </button>
          <button
            onClick={() => setActiveErpTab('enflasyon')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'enflasyon' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Enflasyon Düzeltmesi
          </button>
        </div>
      )}

      {activeErpTab === 'seri' && (
        <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Seri No ve Lot Takip Paneli</h2>
          <p className="text-xs text-gray-500 mb-6">Malzeme giriş-çıkış hareketlerinde izlenebilirlik sağlayan barkod, lot ve parti takip ekranı.</p>
          
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Ürün Adı</th>
                  <th className="px-4 py-3">Seri / Lot No</th>
                  <th className="px-4 py-3 text-center">Parti Kodu</th>
                  <th className="px-4 py-3 text-center">Durum</th>
                  <th className="px-4 py-3 text-center">Giriş Tarihi</th>
                  <th className="px-4 py-3 text-center">Son Kullanma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {[
                  { name: 'KARKAS DANA ETİ', lot: 'LOT-2026-A19', batch: 'PRT-9884', status: 'Depoda', date: '01.08.2026', exp: '15.08.2026' },
                  { name: 'DANA KOL KEMİKSİZ', lot: 'LOT-2026-B02', batch: 'PRT-9812', status: 'Sevk Edildi', date: '03.08.2026', exp: '20.08.2026' },
                  { name: 'KUZU KARKAS ERÇEÇ', lot: 'LOT-2026-C89', batch: 'PRT-9943', status: 'Depoda', date: '05.08.2026', exp: '18.08.2026' },
                  { name: 'KARKAS DANA ETİ', lot: 'LOT-2026-A20', batch: 'PRT-9885', status: 'Kalite Kontrolde', date: '10.08.2026', exp: '25.08.2026' },
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-semibold">{item.name}</td>
                    <td className="px-4 py-3 text-brand-600 font-bold">{item.lot}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.batch}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Depoda' ? 'bg-emerald-50 text-emerald-600' : item.status === 'Sevk Edildi' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.date}</td>
                    <td className="px-4 py-3 text-center text-rose-600 font-semibold">{item.exp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeErpTab === 'maliyet' && (
        <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">FIFO Stok Maliyet Tablosu</h2>
          <p className="text-xs text-gray-500 mb-6">İlk Giren İlk Çıkar (FIFO) yöntemine göre güncel stok maliyetlendirmesi ve envanter değeri analizi.</p>
          
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Parti/Giriş Tarihi</th>
                  <th className="px-4 py-3">Ürün Adı</th>
                  <th className="px-4 py-3 text-right">Kalan Miktar</th>
                  <th className="px-4 py-3 text-right">Alış Fiyatı</th>
                  <th className="px-4 py-3 text-right">Toplam Değer</th>
                  <th className="px-4 py-3 text-center">Maliyet Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {[
                  { date: '15.07.2026', name: 'KARKAS DANA ETİ', qty: '450 Kg', price: '220,00 ₺', total: '99.000,00 ₺', status: 'Kısmen Tüketildi' },
                  { date: '22.07.2026', name: 'DANA KOL KEMİKSİZ', qty: '800 Kg', price: '240,00 ₺', total: '192.000,00 ₺', status: 'Tüketilmedi' },
                  { date: '01.08.2026', name: 'KUZU KARKAS ERÇEÇ', qty: '350 Kg', price: '265,00 ₺', total: '92.750,00 ₺', status: 'Tüketilmedi' },
                  { date: '10.08.2026', name: 'KARKAS DANA ETİ', qty: '1.200 Kg', price: '215,00 ₺', total: '258.000,00 ₺', status: 'Yeni Parti' },
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{item.date}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">{item.name}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-bold">{item.qty}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{item.price}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-extrabold">{item.total}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Tüketilmedi' || item.status === 'Yeni Parti' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeErpTab === 'enflasyon' && (
        <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Stok Enflasyon Muhasebesi Düzeltmesi</h2>
          <p className="text-xs text-gray-500 mb-6">Enflasyon düzeltme katsayılarına göre güncellenmiş stok değer tespiti ve envanter analiz modülü.</p>
          
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-150">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tarihsel Maliyet</span>
              <div className="text-lg font-black text-gray-700 mt-1">641.750,00 ₺</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Enflasyon Düzeltilmiş Tutar</span>
              <div className="text-lg font-black text-amber-700 mt-1">821.440,00 ₺</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Enflasyon Fark Tutarı</span>
              <div className="text-lg font-black text-emerald-700 mt-1">+ 179.690,00 ₺</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Giriş Ayı</th>
                  <th className="px-4 py-3">Ürün Adı</th>
                  <th className="px-4 py-3 text-right">Tarihsel Değer</th>
                  <th className="px-4 py-3 text-center">Düzeltme Katsayısı</th>
                  <th className="px-4 py-3 text-right">Düzeltilmiş Değer</th>
                  <th className="px-4 py-3 text-right">Fark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {[
                  { month: 'Ocak 2026', name: 'KARKAS DANA ETİ', historical: '99.000,00 ₺', factor: '1.284', adjusted: '127.116,00 ₺', diff: '28.116,00 ₺' },
                  { month: 'Şubat 2026', name: 'DANA KOL KEMİKSİZ', historical: '192.000,00 ₺', factor: '1.242', adjusted: '238.464,00 ₺', diff: '46.464,00 ₺' },
                  { month: 'Mart 2026', name: 'KUZU KARKAS ERÇEÇ', historical: '92.750,00 ₺', factor: '1.198', adjusted: '111.114,50 ₺', diff: '18.364,50 ₺' },
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{item.month}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">{item.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{item.historical}</td>
                    <td className="px-4 py-3 text-center text-brand-600 font-bold">{item.factor}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-bold">{item.adjusted}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-extrabold">{item.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeErpTab === 'stok' && (
        <>

      {/* Info Warning */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-800 leading-normal">
          <strong>Önemli Bilgi:</strong> Bu modüldeki veriler doğrudan Vega üzerindeki stok kartlarındaki depodan değil; buluttaki cari hesap hareketleri (fatura detayları) havuzundan derlenmiştir. Bu sayede Vega'da stok takibi yapılmasa dahi, kesilen faturalardan gerçek giriş/çıkış miktarları hesaplanmaktadır.
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Farklı Ürün Sayısı</span>
            <div className="text-xl font-extrabold text-gray-900 mt-1">{stats.totalDifferentItems} Çeşit</div>
          </div>
          <div className="p-3 bg-brand-50 rounded-lg text-brand-600">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-medium">Toplam Çıkış Hareketi</span>
            <div className="text-xl font-extrabold text-rose-600 mt-1">
              {stats.totalOutQty.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} Miktar
            </div>
          </div>
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
            <TrendingDown size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-medium">Toplam Giriş Hareketi</span>
            <div className="text-xl font-extrabold text-emerald-600 mt-1">
              {stats.totalInQty.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} Miktar
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-medium">Öngörülen Stok Maliyet Değeri</span>
            <div className="text-xl font-extrabold text-blue-600 mt-1">
              {stats.totalStockValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search bar & Category Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-64 sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ürün Adı Ara..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-9 pr-10 py-2 w-full text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setLocalSearch('')}
              disabled={!localSearch}
              className="px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-300 rounded-lg bg-white transition-all shrink-0 shadow-sm disabled:opacity-50"
            >
              Temizle
            </button>

            {/* Clean, Plain Category Buttons: Et Ürünleri vs Diğer vs Tümü */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={() => setProductCategory('meat')}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  productCategory === 'meat'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Et
              </button>

              <button
                type="button"
                onClick={() => setProductCategory('other')}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  productCategory === 'other'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Diğer
              </button>

              <button
                type="button"
                onClick={() => setProductCategory('all')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  productCategory === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Tümü
              </button>
            </div>
          </div>

          {/* Filter badges */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-150'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilterType('inStock')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === 'inStock' ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-150'
              }`}
            >
              Stokta Olanlar
            </button>
            <button
              onClick={() => setFilterType('critical')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === 'critical' ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-150'
              }`}
            >
              Tükenenler / Kritik
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-gray-700">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200 text-[13px] font-bold text-gray-500 uppercase tracking-wider">
                {renderSortHeader('Ürün Adı', 'productName', 'left', 'pl-5 pr-2')}
                {renderSortHeader('Toplam Çıkış', 'totalOut', 'center')}
                {renderSortHeader('Toplam Giriş', 'totalIn', 'center')}
                {renderSortHeader('Mevcut Stok', 'currentStock', 'center')}
                {renderSortHeader('Birim', 'productName', 'center', 'px-3')}
                {renderSortHeader('Ort. Alış Fiyatı', 'avgPurchasePrice', 'center')}
                {renderSortHeader('Ort. Satış Fiyatı', 'avgSalesPrice', 'center')}
                {renderSortHeader('Son İşlem Tarihi', 'lastMovementDate', 'center')}
                <th className="px-5 py-3 text-center text-[13px] font-bold text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent"></div>
                      <span>Veriler derleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedProducts.length > 0 ? (
                sortedProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="pl-5 pr-2 py-2.5 text-sm font-bold text-gray-900 max-w-[280px] truncate">
                      <span
                        onClick={() => { setSelectedProduct(p); setSearchParams({ product: p.productName }); }}
                        className="cursor-pointer hover:text-brand-600 hover:underline transition-colors"
                        title={p.productName}
                      >
                        {p.productName}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-center text-[13.5px] text-rose-600 font-bold">
                      {p.totalOut.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-2.5 text-center text-[13.5px] text-emerald-600 font-bold">
                      {p.totalIn.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-5 py-2.5 text-center text-[13.5px] font-bold ${
                      p.currentStock > 0 ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {p.currentStock.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-center text-[12px] text-gray-600 font-semibold">
                      <span className="bg-gray-100 px-2.5 py-0.5 rounded text-[12px] font-bold">
                        {p.unitName}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-center text-[13.5px] font-semibold text-gray-900">
                      {p.avgPurchasePrice > 0 ? `${p.avgPurchasePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL` : '-'}
                    </td>
                    <td className="px-5 py-2.5 text-center text-[13.5px] font-semibold text-gray-900">
                      {p.avgSalesPrice > 0 ? `${p.avgSalesPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL` : '-'}
                    </td>
                    <td className="px-5 py-2.5 text-center text-[13px] text-gray-500 font-semibold">
                      {formatDate(p.lastMovementDate)}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <button
                        onClick={() => { setSelectedProduct(p); setSearchParams({ product: p.productName }); }}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Hareket Detayları"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-400 font-medium">
                    Arama kriterlerinize uygun stok kaydı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}
    </div>
  );
}
