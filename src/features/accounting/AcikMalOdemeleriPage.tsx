import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Database, 
  RefreshCw, 
  Search, 
  FileSpreadsheet, 
  Info,
  X,
  Plus,
  Trash2,
  Edit2,
  Pencil,
  AlertTriangle,
  Upload,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { PageHeader } from '../../components/ui/PageHeader';
import * as XLSX from 'xlsx';

// Supplier alias mapping from KesimListesiPage to make name matching robust
const CARI_ALIASES: Record<string, string[]> = {
  'CEMAL ERDOĞAN': ['METİN ERDOĞAN'],
  'FEVZİ ÖZUZMA': ['CEBRAİLOĞLU TİCARET'],
  'FİMAR AŞ': ['FİMAR MERMER MADEN A.Ş.'],
  'KENAN HOCA': ['KENAN HOCA KESİM', 'SULUOVA KENAN ÇOLAK', 'ALTINSATIR ET ÜRÜNLERİ SULUOVA KENAN ÇOLAK'],
  'ZEKİ KARACA': ['MURAT KARACA', 'KARACA ET', 'ÖZ YAYLA KARACA ET']
};

interface OpenPaymentRecord {
  id: string;
  organization_id: string;
  date: string;
  supplier: string;
  animal_type: string;
  carcass_weight: number;
  price_per_kg: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const formatExcelPaymentDate = (val: any): string => {
  if (val === undefined || val === null) return 'CARİ';
  const str = String(val).trim();
  if (!str) return 'CARİ';
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${d}.${m}.${y}`;
  }
  return str;
};

interface AutoDetectedOpenMeat {
  id: string;
  slaughter_date: string;
  supplier: string;
  animal_type: string;
  carcass_weight: number;
  price_per_kg: number;
  total_amount: number;
  pesinat: number;
  kalan_tutar: number;
  reason: 'Cari Kart Bulunamadı' | 'Vega Hareketi Eksik';
  matchedCariCode?: string;
  matchedCariName?: string;
}

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

const formatNumberString = (str: string) => {
  if (!str) return '';
  // Replace dot with comma (decimal separator)
  let val = str.replace(/\./g, ',');
  
  // Only keep the first comma, remove all other characters that are not digits or comma
  let cleanVal = '';
  let hasComma = false;
  for (let i = 0; i < val.length; i++) {
    const char = val[i];
    if (char >= '0' && char <= '9') {
      cleanVal += char;
    } else if (char === ',' && !hasComma) {
      cleanVal += char;
      hasComma = true;
    }
  }
  
  const parts = cleanVal.split(',');
  let integerPart = parts[0];
  let decimalPart = parts[1];
  
  if (integerPart) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  
  if (hasComma) {
    return `${integerPart},${decimalPart !== undefined ? decimalPart : ''}`;
  }
  return integerPart;
};

const parseFormattedNumber = (str: string): number => {
  if (!str) return 0;
  const clean = str.replace(/\./g, '').replace(/,/g, '.');
  return parseFloat(clean) || 0;
};

const formatDateForDB = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`; // yyyy-mm-dd to dd.mm.yyyy
  }
  return dateStr;
};

const cleanNumericInput = (val: string): string => {
  let clean = '';
  let hasDecimal = false;
  for (let i = 0; i < val.length; i++) {
    const char = val[i];
    if (char >= '0' && char <= '9') {
      clean += char;
    } else if ((char === ',' || char === '.') && !hasDecimal) {
      clean += char;
      hasDecimal = true;
    }
  }
  return clean;
};

function InlineEdit({
  value,
  displayValue,
  onSave,
  className = "",
  inputClassName = "",
  placeholder = "—",
  isNumeric = false,
  type = "text",
  align = "left"
}: {
  value: string;
  displayValue: React.ReactNode;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  isNumeric?: boolean;
  type?: string;
  align?: 'left' | 'center' | 'right';
}) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);

  const startEdit = () => {
    setTempVal(isNumeric ? value.replace(/\./g, '') : value);
    setEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const finalVal = isNumeric ? String(parseFormattedNumber(tempVal)) : tempVal;
      onSave(finalVal);
      setEditing(false);
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleBlur = () => {
    const finalVal = isNumeric ? String(parseFormattedNumber(tempVal)) : tempVal;
    onSave(finalVal);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type={type}
        className={`input !py-0.5 !px-1.5 !text-xs w-full ${inputClassName}`}
        value={tempVal}
        onChange={(e) => setTempVal(isNumeric ? cleanNumericInput(e.target.value) : e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        autoFocus
      />
    );
  }

  const justifyClass = 
    align === 'right' ? 'justify-end' :
    align === 'center' ? 'justify-center' :
    'justify-between';

  return (
    <div className={`relative flex items-center ${justifyClass} w-full gap-1 group/item ${className}`}>
      <span className="truncate">{displayValue || <span className="text-gray-400 font-medium">{placeholder}</span>}</span>
      <button
        onClick={startEdit}
        className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity absolute -right-7 top-1/2 -translate-y-1/2"
        title="Düzenle"
      >
        <Pencil size={16} />
      </button>
    </div>
  );
}

function InlinePaymentDate({
  value,
  onSave
}: {
  value: string;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  
  // Convert standard Turkish DD.MM.YYYY to YYYY-MM-DD for native input
  const getInitialDate = () => {
    if (!value || value === 'CARİ') return '';
    const parts = value.split('.');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return value; // fallback
  };

  const [tempVal, setTempVal] = useState(getInitialDate());

  // Convert YYYY-MM-DD back to DD.MM.YYYY
  const formatDateForDB = (val: string) => {
    if (!val) return 'CARİ';
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return val;
  };

  const handleSave = (dateVal: string) => {
    onSave(formatDateForDB(dateVal));
    setEditing(false);
  };

  const handleSetCari = () => {
    onSave('CARİ');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[150px] justify-center">
        <input
          type="date"
          className="input !py-0.5 !px-1.5 !text-xs w-full text-center"
          value={tempVal}
          onChange={(e) => {
            const val = e.target.value;
            setTempVal(val);
            if (!val) {
              handleSave('');
              return;
            }
            const parts = val.split('-');
            if (parts.length === 3) {
              const year = parseInt(parts[0]) || 0;
              if (year >= 1000) {
                handleSave(val);
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave(tempVal);
            } else if (e.key === 'Escape') {
              setEditing(false);
            }
          }}
          onBlur={() => {
            // Delay blur slightly to check if CARİ button is clicked
            setTimeout(() => {
              if (tempVal) {
                const parts = tempVal.split('-');
                if (parts.length === 3) {
                  const year = parseInt(parts[0]) || 0;
                  if (year >= 1000) {
                    onSave(formatDateForDB(tempVal));
                  }
                }
              }
              setEditing(false);
            }, 200);
          }}
          autoFocus
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent blur
            handleSetCari();
          }}
          className="px-2 py-1 text-[10px] font-bold bg-gray-100 hover:bg-brand-50 hover:text-brand-600 rounded border border-gray-300"
        >
          CARİ
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-full gap-1 group/item select-none">
      <span className="font-semibold text-gray-700">{value || 'CARİ'}</span>
      <button
        onClick={() => {
          setTempVal(getInitialDate());
          setEditing(true);
        }}
        className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity absolute -right-7 top-1/2 -translate-y-1/2"
        title="Düzenle"
      >
        <Pencil size={16} />
      </button>
    </div>
  );
}


export function AcikMalOdemeleriPage() {
  const { notify } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'manual' | 'auto_detect'>('manual');
  // View mode for manual tab: 'summary' (grouped by supplier) or 'list' (raw list of entries)
  const [viewMode, setViewMode] = useState<'summary' | 'list'>('summary');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Core data states
  const [manualRecords, setManualRecords] = useState<OpenPaymentRecord[]>([]);
  const [autoDetected, setAutoDetected] = useState<AutoDetectedOpenMeat[]>([]);
  const [hasScannedAuto, setHasScannedAuto] = useState(false);

  // Search and Filters
  const [localSearch, setLocalSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [animalTypeFilter, setAnimalTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, viewMode, searchQuery, animalTypeFilter, startDate, endDate]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<OpenPaymentRecord | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSupplierDetail = searchParams.get('supplier');
  const setSelectedSupplierDetail = (supplierName: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (supplierName) {
      nextParams.set('supplier', supplierName);
    } else {
      nextParams.delete('supplier');
    }
    setSearchParams(nextParams);
  };

  // Manual Payment Form Fields
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormDate, setPaymentFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentFormAmount, setPaymentFormAmount] = useState('');
  const [paymentFormNotes, setPaymentFormNotes] = useState('');
  const [paymentFormType, setPaymentFormType] = useState('Banka/EFT');

  // Form Fields
  const [formDate, setFormDate] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState('');
  const [formRemainingAmount, setFormRemainingAmount] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPaymentDate, setFormPaymentDate] = useState('CARİ');

  // Sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortHeader = (label: string, field: string, align: 'left' | 'right' | 'center' = 'left') => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-6 py-4 cursor-pointer select-none hover:bg-gray-100 transition-colors uppercase tracking-wider text-[11px] font-bold text-gray-400 ${align === 'right' ? 'text-right pr-10' : align === 'center' ? 'text-center' : 'text-left'}`}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <span>{label}</span>
          {isSorted ? (
            <span className="text-brand-600 font-bold">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
          ) : (
            <span className="text-gray-300 font-normal"> ↕</span>
          )}
        </div>
      </th>
    );
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Load manual records
  const fetchManualRecords = async () => {
    if (!user?.organizationId) return;
    try {
      const { data, error } = await supabase
        .from('acik_mal_odemeleri')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('date', { ascending: true });

      if (error) throw error;
      setManualRecords(data || []);
    } catch (err: any) {
      notify('Manuel açık mal ödemeleri yüklenemedi: ' + err.message, 'error');
    }
  };

  const handleCariClick = (supplierName: string) => {
    setSelectedSupplierDetail(supplierName);
  };

  // Run the smart scanning logic
  const scanAutoOpenPayments = async () => {
    if (!user?.organizationId) return;
    try {
      // 1. Fetch slaughter list
      const { data: slaughters, error: sErr } = await supabase
        .from('kesim_listesi')
        .select('*')
        .eq('organization_id', user.organizationId)
        .gt('price_per_kg', 0)
        .order('slaughter_date', { ascending: false });

      if (sErr) throw sErr;
      if (!slaughters || slaughters.length === 0) {
        setAutoDetected([]);
        return;
      }

      // 2. Fetch all vega cariler
      const { data: cariler, error: cErr } = await supabase
        .from('vega_cariler')
        .select('*')
        .eq('organization_id', user.organizationId);

      if (cErr) throw cErr;

      // 3. Find matched cariler and date ranges to optimize query performance
      let minDateStr = '2026-01-01';
      let maxDateStr = '2026-12-31';
      const dates = slaughters.map(s => s.slaughter_date).filter(Boolean);
      if (dates.length > 0) {
        dates.sort();
        const minDateObj = new Date(dates[0]);
        const maxDateObj = new Date(dates[dates.length - 1]);
        const minTime = minDateObj.getTime() - 5 * 24 * 60 * 60 * 1000;
        const maxTime = maxDateObj.getTime() + 5 * 24 * 60 * 60 * 1000;
        minDateStr = new Date(minTime).toISOString().split('T')[0];
        maxDateStr = new Date(maxTime).toISOString().split('T')[0];
      }

      // Filter function to match suppliers using CARI_ALIASES
      const findMatchedCari = (supplierName: string) => {
        const normName = turkishNormalize(supplierName);
        for (const c of cariler || []) {
          if (turkishNormalize(c.name) === normName) return c;
        }
        for (const [key, aliases] of Object.entries(CARI_ALIASES)) {
          if (turkishNormalize(key) === normName) {
            for (const alias of aliases) {
              const normAlias = turkishNormalize(alias);
              for (const c of cariler || []) {
                if (turkishNormalize(c.name) === normAlias) return c;
              }
            }
          }
        }
        return null;
      };

      const matchedCariCodes = new Set<string>();
      for (const s of slaughters) {
        const c = findMatchedCari(s.supplier);
        if (c) matchedCariCodes.add(c.code);
      }

      let movements: any[] = [];
      if (matchedCariCodes.size > 0) {
        const { data: movData, error: mErr } = await supabase
          .from('vega_cari_hareketler')
          .select('*')
          .eq('organization_id', user.organizationId)
          .in('cari_code', Array.from(matchedCariCodes))
          .gte('date', minDateStr)
          .lte('date', maxDateStr + 'T23:59:59Z')
          .gt('unit_price', 0);
          
        if (mErr) throw mErr;
        movements = movData || [];
      }

      const detectedList: AutoDetectedOpenMeat[] = [];

      // Loop through slaughters
      for (const s of slaughters) {
        const matchedCari = findMatchedCari(s.supplier);

        if (!matchedCari) {
          // Case 1: Cari account card does not exist in Vega
          detectedList.push({
            id: s.id,
            slaughter_date: s.slaughter_date,
            supplier: s.supplier,
            animal_type: s.animal_type,
            carcass_weight: Number(s.carcass_weight),
            price_per_kg: Number(s.price_per_kg),
            total_amount: Number(s.total_amount),
            pesinat: Number(s.pesinat || 0),
            kalan_tutar: Number(s.kalan_tutar || 0),
            reason: 'Cari Kart Bulunamadı'
          });
          continue;
        }

        // Case 2: Cari card exists, check if invoice exists in movements
        const sDate = new Date(s.slaughter_date + 'T00:00:00Z');
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const dateStart = sDate.getTime() - threeDaysMs;
        const dateEnd = sDate.getTime() + threeDaysMs;

        // Filter movements for this cari within ±3 days
        const cariMovs = (movements || []).filter(m => {
          if (m.cari_code !== matchedCari.code) return false;
          const mDate = new Date(m.date);
          return mDate.getTime() >= dateStart && mDate.getTime() <= dateEnd;
        });

        const recType = turkishNormalize(s.animal_type || '');
        const matchedMovs = cariMovs.filter(m => {
          const mProduct = turkishNormalize(m.product_name || '');
          return mProduct.includes(recType) || recType.includes(mProduct);
        });

        // Helper to compute exact/calculated quantity
        const getQty = (m: any) => {
          const qty = Number(m.quantity || 0);
          if (qty > 0.001) return qty;
          const price = Number(m.unit_price || 0);
          if (price > 0) return Number(m.line_tutar || 0) / price;
          return 0;
        };

        // Try to match the carcass weight
        const hasMatch = matchedMovs.some(m => {
          const mQty = getQty(m);
          return Math.abs(mQty - Number(s.carcass_weight)) < 0.1;
        });

        if (!hasMatch) {
          detectedList.push({
            id: s.id,
            slaughter_date: s.slaughter_date,
            supplier: s.supplier,
            animal_type: s.animal_type,
            carcass_weight: Number(s.carcass_weight),
            price_per_kg: Number(s.price_per_kg),
            total_amount: Number(s.total_amount),
            pesinat: Number(s.pesinat || 0),
            kalan_tutar: Number(s.kalan_tutar || 0),
            reason: 'Vega Hareketi Eksik',
            matchedCariCode: matchedCari.code,
            matchedCariName: matchedCari.name
          });
        }
      }

      setAutoDetected(detectedList);
    } catch (err: any) {
      notify('Otomatik tarama yapılırken hata: ' + err.message, 'error');
    }
  };

  const loadData = async (forceAutoScan = false) => {
    setLoading(true);
    try {
      if (activeTab === 'manual') {
        await fetchManualRecords();
        if (forceAutoScan || hasScannedAuto) {
          await scanAutoOpenPayments();
        }
      } else {
        await Promise.all([
          fetchManualRecords(),
          scanAutoOpenPayments()
        ]);
        setHasScannedAuto(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (tab: 'manual' | 'auto_detect') => {
    setActiveTab(tab);
    if (tab === 'auto_detect' && !hasScannedAuto) {
      setLoading(true);
      await scanAutoOpenPayments();
      setHasScannedAuto(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchManualRecords();
      setHasScannedAuto(false);
      setAutoDetected([]);
      setLoading(false);
    };
    void init();
  }, [user?.organizationId]);

  const supplierRecords = useMemo(() => {
    if (!selectedSupplierDetail) return [];
    return manualRecords.filter(r => 
      turkishNormalize(r.supplier) === turkishNormalize(selectedSupplierDetail)
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedSupplierDetail, manualRecords]);

  const supplierStats = useMemo(() => {
    let total = 0;
    let remaining = 0;
    supplierRecords.forEach(r => {
      total += Number(r.total_amount || 0);
      remaining += Number(r.remaining_amount || 0);
    });
    return { total, remaining };
  }, [supplierRecords]);

  // Filtering Logic for Manual Records
  const filteredManualRecords = useMemo(() => {
    return manualRecords.filter(r => {
      // 1. Search text
      if (searchQuery) {
        const query = turkishNormalize(searchQuery);
        const name = turkishNormalize(r.supplier);
        const notes = turkishNormalize(r.notes || '');
        if (!name.includes(query) && !notes.includes(query)) return false;
      }

      // 2. Animal type
      if (animalTypeFilter !== 'all' && r.animal_type !== animalTypeFilter) {
        return false;
      }

      // 3. Start date
      if (startDate && r.date < startDate) return false;

      // 4. End date
      if (endDate && r.date > endDate) return false;

      return true;
    });
  }, [manualRecords, searchQuery, animalTypeFilter, startDate, endDate]);

  // Filtering Logic for Auto-Detected Records
  const filteredAutoDetected = useMemo(() => {
    const list = autoDetected.filter(r => {
      if (searchQuery) {
        const query = turkishNormalize(searchQuery);
        const name = turkishNormalize(r.supplier);
        if (!name.includes(query)) return false;
      }

      if (animalTypeFilter !== 'all' && r.animal_type !== animalTypeFilter) {
        return false;
      }

      if (startDate && r.slaughter_date < startDate) return false;
      if (endDate && r.slaughter_date > endDate) return false;

      return true;
    });

    // Sort by slaughter_date descending (newest first)
    return [...list].sort((a, b) => b.slaughter_date.localeCompare(a.slaughter_date));
  }, [autoDetected, searchQuery, animalTypeFilter, startDate, endDate]);

  // Statistics Summary Cards
  const stats = useMemo(() => {
    let totalQty = 0;
    let totalKg = 0;
    let totalVal = 0;
    let totalPaid = 0;
    let totalRem = 0;

    if (activeTab === 'manual') {
      filteredManualRecords.forEach(r => {
        totalQty += 1;
        totalKg += Number(r.carcass_weight);
        totalVal += Number(r.total_amount);
        totalPaid += Number(r.paid_amount);
        totalRem += Number(r.remaining_amount);
      });
    } else {
      filteredAutoDetected.forEach(r => {
        totalQty += 1;
        totalKg += Number(r.carcass_weight);
        totalVal += Number(r.total_amount);
        totalPaid += Number(r.pesinat);
        totalRem += Number(r.kalan_tutar);
      });
    }

    return { totalQty, totalKg, totalVal, totalPaid, totalRem };
  }, [activeTab, filteredManualRecords, filteredAutoDetected]);

  // Sorted & Filtered manual records
  const sortedManualRecords = useMemo(() => {
    const list = [...filteredManualRecords];
    list.sort((a, b) => {
      let aVal: any = a[sortField as keyof OpenPaymentRecord];
      let bVal: any = b[sortField as keyof OpenPaymentRecord];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc' 
          ? aVal - bVal 
          : bVal - aVal;
      }
    });
    return list;
  }, [filteredManualRecords, sortField, sortDirection]);

  // Sorted & Filtered auto records
  const sortedAutoDetected = useMemo(() => {
    const list = [...filteredAutoDetected];
    list.sort((a, b) => {
      let aVal: any = a[sortField as keyof AutoDetectedOpenMeat];
      let bVal: any = b[sortField as keyof AutoDetectedOpenMeat];

      if (sortField === 'date') {
        aVal = a.slaughter_date;
        bVal = b.slaughter_date;
      } else if (sortField === 'total_amount') {
        aVal = a.total_amount;
        bVal = b.total_amount;
      } else if (sortField === 'paid_amount') {
        aVal = a.pesinat;
        bVal = b.pesinat;
      } else if (sortField === 'remaining_amount') {
        aVal = a.kalan_tutar;
        bVal = b.kalan_tutar;
      }

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc' 
          ? aVal - bVal 
          : bVal - aVal;
      }
    });
    return list;
  }, [filteredAutoDetected, sortField, sortDirection]);

  // Grouped manual records by supplier
  const groupedManualRecords = useMemo(() => {
    const groups: Record<string, {
      supplier: string;
      latest_date: string;
      total_amount: number;
      paid_amount: number;
      remaining_amount: number;
    }> = {};

    filteredManualRecords.forEach(r => {
      const key = r.supplier.trim().toUpperCase();
      if (!groups[key]) {
        groups[key] = {
          supplier: r.supplier,
          latest_date: r.date,
          total_amount: 0,
          paid_amount: 0,
          remaining_amount: 0
        };
      }
      groups[key].total_amount += Number(r.total_amount || 0);
      groups[key].paid_amount += Number(r.paid_amount || 0);
      groups[key].remaining_amount += Number(r.remaining_amount || 0);
      if (r.date > groups[key].latest_date) {
        groups[key].latest_date = r.date;
      }
    });

    const list = Object.values(groups);

    // Sort grouped list based on sortField/sortDirection
    list.sort((a, b) => {
      let aVal: any = a[sortField as keyof typeof a];
      let bVal: any = b[sortField as keyof typeof b];

      // Fallbacks for fields not directly present on group object
      if (aVal === undefined) {
        if (sortField === 'date') {
          aVal = a.latest_date;
          bVal = b.latest_date;
        } else {
          aVal = a.supplier;
          bVal = b.supplier;
        }
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'tr')
          : bVal.localeCompare(aVal, 'tr');
      } else {
        return sortDirection === 'asc'
          ? aVal - bVal
          : bVal - aVal;
      }
    });

    return list;
  }, [filteredManualRecords, sortField, sortDirection]);

  // Paginated grouped manual records
  const paginatedGrouped = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groupedManualRecords.slice(start, start + itemsPerPage);
  }, [groupedManualRecords, currentPage]);

  // Paginated manual records
  const paginatedManual = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedManualRecords.slice(start, start + itemsPerPage);
  }, [sortedManualRecords, currentPage]);

  // Paginated auto records
  const paginatedAuto = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAutoDetected.slice(start, start + itemsPerPage);
  }, [sortedAutoDetected, currentPage]);

  // Pagination stats
  const totalItems = activeTab === 'manual' 
    ? (viewMode === 'summary' ? groupedManualRecords.length : filteredManualRecords.length) 
    : filteredAutoDetected.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Handle Form Open (New/Edit)
  const handleOpenAdd = () => {
    setSelectedRecord(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormSupplier('');
    setFormTotalAmount('');
    setFormRemainingAmount('');
    setFormNotes('');
    setFormPaymentDate('CARİ');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: OpenPaymentRecord) => {
    setSelectedRecord(rec);
    setFormDate(rec.date);
    setFormSupplier(rec.supplier);
    setFormTotalAmount(formatNumberString(String(rec.total_amount)));
    setFormRemainingAmount(formatNumberString(String(rec.remaining_amount)));
    setFormNotes(rec.notes || '');
    setFormPaymentDate(rec.payment_date || 'CARİ');
    setIsModalOpen(true);
  };

  // Convert auto detected entry to manual payment input
  const handleTransferToManual = (rec: AutoDetectedOpenMeat) => {
    setSelectedRecord(null);
    setFormDate(rec.slaughter_date);
    setFormSupplier(rec.supplier);
    setFormTotalAmount(formatNumberString(String(rec.total_amount)));
    setFormRemainingAmount(formatNumberString(String(rec.kalan_tutar)));
    setFormNotes('');
    setFormPaymentDate('CARİ');
    setIsModalOpen(true);
  };

  // Create Cari account shortcut (redirects to Cari list or triggers warning)
  const handleCreateCariWarning = (supplier: string) => {
    notify(`'${supplier}' cari kartını Vega ERP üzerinden açmanız ve ardından 'Vega Verilerini Eşitle' yapmanız gerekmektedir.`, 'info');
  };

  // Save manual record to DB
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;

    const total = parseFormattedNumber(formTotalAmount);
    const remaining = parseFormattedNumber(formRemainingAmount);

    if (!formSupplier.trim()) {
      notify('Lütfen tedarikçi ismi giriniz.', 'error');
      return;
    }
    if (total < 0) {
      notify('Toplam tutar sıfırdan küçük olamaz.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        organization_id: user.organizationId,
        date: formDate,
        supplier: formSupplier.trim(),
        animal_type: 'Dana',
        carcass_weight: 0,
        price_per_kg: 0,
        total_amount: total,
        paid_amount: 0,
        remaining_amount: remaining,
        notes: formNotes.trim() || null,
        payment_date: formPaymentDate.trim() || 'CARİ'
      };

      if (selectedRecord) {
        // Edit Mode
        const { error } = await supabase
          .from('acik_mal_odemeleri')
          .update(payload)
          .eq('id', selectedRecord.id);

        if (error) throw error;
        notify('Açık mal ödemesi başarıyla güncellendi.', 'success');
      } else {
        // New Mode
        const { error } = await supabase
          .from('acik_mal_odemeleri')
          .insert(payload);

        if (error) throw error;
        notify('Açık mal ödemesi başarıyla oluşturuldu.', 'success');
      }

      setIsModalOpen(false);
      void fetchManualRecords();
    } catch (err: any) {
      notify('Kaydedilirken hata oluştu: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Inline Quick Save Field
  const handleSaveField = async (id: string, field: keyof OpenPaymentRecord, val: any) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('acik_mal_odemeleri')
        .update({
          [field]: val
        })
        .eq('id', id);

      if (error) throw error;
      notify('Alan başarıyla güncellendi.', 'success');
      void fetchManualRecords();
    } catch (err: any) {
      notify('Hata: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId || !selectedSupplierDetail) return;
    
    const amount = parseFormattedNumber(paymentFormAmount);
    if (amount <= 0) {
      notify('Lütfen geçerli bir tutar girin.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('acik_mal_odemeleri')
        .insert({
          organization_id: user.organizationId,
          date: paymentFormDate,
          supplier: selectedSupplierDetail,
          animal_type: 'Ödeme',
          carcass_weight: 0,
          price_per_kg: 0,
          total_amount: 0,
          paid_amount: amount,
          remaining_amount: -amount,
          notes: `${paymentFormType}${paymentFormNotes ? ' - ' + paymentFormNotes : ''}`,
          payment_date: formatDateForDB(paymentFormDate)
        });

      if (error) throw error;
      notify('Ödeme kaydı başarıyla eklendi.', 'success');
      setIsPaymentModalOpen(false);
      setPaymentFormAmount('');
      setPaymentFormNotes('');
      await fetchManualRecords();
    } catch (err: any) {
      notify('Ödeme kaydedilirken hata oluştu: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const renderSupplierDetailPage = () => {
    let balance = 0;
    const ledger = supplierRecords.map(r => {
      balance += Number(r.remaining_amount || 0);
      return {
        ...r,
        runningBalance: balance
      };
    });

    const latestTx = supplierRecords.length > 0 ? supplierRecords[supplierRecords.length - 1].date : '—';
    const latestTxFormatted = latestTx !== '—' ? new Date(latestTx).toLocaleDateString('tr-TR') : '—';

    return (
      <div className="space-y-6">
        <PageHeader
          title={selectedSupplierDetail || 'Cari Detay'}
          description="Cari Kart Detay ve Açık Mal Hareket Dökümü"
          onBack={() => setSelectedSupplierDetail(null)}
          backLabel="Açık Mal Ödemeleri'ne Dön"
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSupplierDetail(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                Geri Dön
              </button>
              <button
                onClick={() => {
                  setPaymentFormDate(new Date().toISOString().split('T')[0]);
                  setPaymentFormAmount('');
                  setPaymentFormNotes('');
                  setPaymentFormType('Banka/EFT');
                  setIsPaymentModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none"
              >
                <Plus size={16} />
                Ödeme Gir
              </button>
            </div>
          }
        />

        {/* Cari Kart Detay Bilgileri and Net Bakiye Row */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Cari Kart Detay Bilgileri</h3>
            <div className="mt-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Cari Kodu</span>
                <span className="font-semibold text-gray-700">AÇIK-MAL-{turkishNormalize(selectedSupplierDetail || '').toUpperCase().substring(0, 10)}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Firma Tipi</span>
                <span className="font-semibold text-gray-700">Tedarikçi (Açık Mal)</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Vergi No / T.C.</span>
                <span className="font-semibold text-gray-700">—</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Son İşlem Tarihi</span>
                <span className="font-semibold text-gray-700">{latestTxFormatted}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-brand-900 text-white p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
            <div>
              <span className="text-xs font-bold text-brand-300 uppercase tracking-wider">Net Bakiye</span>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {supplierStats.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </div>
            </div>
            <div className="mt-4 border-t border-brand-800 pt-3 flex items-center justify-between text-xs text-brand-200 font-semibold">
              <span>Bakiye Durumu:</span>
              <span className={supplierStats.remaining > 0 ? "text-rose-300 font-bold" : "text-emerald-300 font-bold"}>
                {supplierStats.remaining > 0 ? "Tedarikçi Alacaklı" : "Ödeme Tamamlandı"}
              </span>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-700 flex items-center gap-2">
          <Info size={16} className="text-blue-500 shrink-0" />
          <span>Aşağıdaki hareket dökümü, Açık Mal Ödemeleri modülüne girilen işlem ve elden/banka ödeme kayıtlarını göstermektedir. Bilgileri satır içi hızlı düzenleyebilirsiniz.</span>
        </div>

        {/* Ledger Table Box */}
        <div className="overflow-hidden border border-gray-200 bg-white rounded-xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs font-semibold">
              <thead className="bg-gray-50 uppercase tracking-wider text-[11px] font-bold text-gray-400">
                <tr>
                  <th className="px-6 py-4 text-center">Tarih</th>
                  <th className="px-6 py-4">Malın Cinsi / İşlem</th>
                  <th className="px-6 py-4">Açıklama / İzahat</th>
                  <th className="px-6 py-4 text-right pr-10">Borç (Kesim Tutarı)</th>
                  <th className="px-6 py-4 text-right pr-10">PEŞİNAT</th>
                  <th className="px-6 py-4 text-right pr-10">Toplam Bakiye</th>
                  <th className="px-6 py-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-900 font-semibold">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-medium">
                       Bu firmaya ait kayıtlı açık mal hareketi bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  ledger.map((r) => {
                    const isPayment = r.total_amount === 0;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 text-center text-gray-500 font-medium">
                          <InlineEdit
                            value={r.date}
                            displayValue={new Date(r.date).toLocaleDateString('tr-TR')}
                            onSave={(val) => void handleSaveField(r.id, 'date', val)}
                            type="date"
                            align="center"
                            className="justify-center"
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                            isPayment ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                          }`}>
                            {isPayment ? 'ÖDEME' : `${r.animal_type} KESİMİ`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium max-w-xs truncate" title={r.notes || ''}>
                          <InlineEdit
                            value={r.notes || ''}
                            displayValue={r.notes || '—'}
                            onSave={(val) => void handleSaveField(r.id, 'notes', val)}
                            className="text-xs text-gray-500 font-medium"
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[15px] font-semibold text-gray-900">
                          {!isPayment ? (
                            <InlineEdit
                              value={String(r.total_amount)}
                              displayValue={`${Number(r.total_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                              onSave={(val) => void handleSaveField(r.id, 'total_amount', parseFloat(val) || 0)}
                              isNumeric={true}
                              align="right"
                              className="justify-end font-semibold text-gray-900"
                              inputClassName="!text-right font-semibold text-gray-900"
                            />
                          ) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[15px] font-semibold text-emerald-600">
                          {isPayment || r.paid_amount > 0 ? (
                            <InlineEdit
                              value={String(r.paid_amount)}
                              displayValue={`${Number(r.paid_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                              onSave={(val) => void handleSaveField(r.id, 'paid_amount', parseFloat(val) || 0)}
                              isNumeric={true}
                              align="right"
                              className="justify-end font-semibold text-emerald-600"
                              inputClassName="!text-right font-semibold text-emerald-600"
                            />
                          ) : '—'}
                        </td>
                        <td className={`whitespace-nowrap px-6 py-4 text-right pr-10 text-[15px] font-semibold ${r.runningBalance > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                          {r.runningBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Hareketi Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manual Payment Input Modal */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <h2 className="text-lg font-bold text-gray-900">Yeni Ödeme Girişi</h2>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSavePayment} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ödeme Tarihi</label>
                  <input
                    type="date"
                    required
                    value={paymentFormDate}
                    onChange={(e) => setPaymentFormDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ödeme Türü / İzahat</label>
                  <select
                    value={paymentFormType}
                    onChange={(e) => setPaymentFormType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  >
                    <option value="Banka/EFT">Banka/EFT</option>
                    <option value="Elden Ödeme">Elden Ödeme</option>
                    <option value="Çek">Çek</option>
                    <option value="Senet">Senet</option>
                    <option value="Devir">Devir</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ödenen Tutar (TL)</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 15.000,00"
                    value={paymentFormAmount}
                    onChange={(e) => setPaymentFormAmount(formatNumberString(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Notlar / Açıklama</label>
                  <textarea
                    rows={2}
                    placeholder="Banka şube adı, dekont numarası vb."
                    value={paymentFormNotes}
                    onChange={(e) => setPaymentFormNotes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    disabled={actionLoading}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Delete manual record from DB
  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu açık mal ödemesini silmek istediğinize emin misiniz?')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('acik_mal_odemeleri')
        .delete()
        .eq('id', id);

      if (error) throw error;
      notify('Açık mal ödemesi başarıyla silindi.', 'success');
      void fetchManualRecords();
    } catch (err: any) {
      notify('Silinirken hata oluştu: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete a slaughter record from kesim_listesi
  const handleDeleteSlaughter = async (id: string) => {
    if (!window.confirm('Bu kesim kaydını kesim listesinden kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('kesim_listesi')
        .delete()
        .eq('id', id);

      if (error) throw error;
      notify('Kesim kaydı başarıyla silindi.', 'success');
      void scanAutoOpenPayments();
    } catch (err: any) {
      notify('Kesim kaydı silinirken hata: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete all records of the active tab
  const handleDeleteAll = async () => {
    if (!user?.organizationId) return;
    if (activeTab === 'manual') {
      if (filteredManualRecords.length === 0) {
        notify('Silinecek kayıt bulunmuyor.', 'info');
        return;
      }
      if (!window.confirm('Tüm filtreye uyan manuel açık mal ödemesi kayıtlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
      setActionLoading(true);
      try {
        const ids = filteredManualRecords.map(r => r.id);
        const { error } = await supabase
          .from('acik_mal_odemeleri')
          .delete()
          .in('id', ids);

        if (error) throw error;
        notify('Seçili tüm manuel ödemeler silindi.', 'success');
        void fetchManualRecords();
      } catch (err: any) {
        notify('Temizlenirken hata oluştu: ' + err.message, 'error');
      } finally {
        setActionLoading(false);
      }
    } else {
      if (filteredAutoDetected.length === 0) {
        notify('Silinecek kesim kaydı bulunmuyor.', 'info');
        return;
      }
      if (!window.confirm('UYARI: Filtreye uyan tüm kesim kayıtlarını kesim listesinden kalıcı olarak silmek istediğinize emin misiniz? Bu işlem kesim listenizi etkileyecektir!')) return;
      setActionLoading(true);
      try {
        const ids = filteredAutoDetected.map((r: AutoDetectedOpenMeat) => r.id);
        const { error } = await supabase
          .from('kesim_listesi')
          .delete()
          .in('id', ids);

        if (error) throw error;
        notify('Seçili tüm kesim kayıtları silindi.', 'success');
        void scanAutoOpenPayments();
      } catch (err: any) {
        notify('Temizlenirken hata oluştu: ' + err.message, 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Excel Export
  const handleExport = () => {
    const list = activeTab === 'manual' ? filteredManualRecords : filteredAutoDetected;
    if (list.length === 0) {
      notify('Dışa aktarılacak kayıt bulunmuyor.', 'info');
      return;
    }

    const header = [
      'Tarih',
      'Tedarikçi / Cari',
      'Cins',
      'Ağırlık (kg)',
      'KG Fiyatı (TL)',
      'Toplam Tutar (TL)',
      'Peşinat / Ödenen (TL)',
      'Kalan Bakiye (TL)',
      activeTab === 'manual' ? 'Ödeme Tarihi' : 'Durum',
      activeTab === 'manual' ? 'Açıklama' : 'Neden Eşleşmedi?'
    ];

    const dataRows = list.map((r: OpenPaymentRecord | AutoDetectedOpenMeat) => {
      if (activeTab === 'manual') {
        const m = r as OpenPaymentRecord;
        return [
          m.date,
          m.supplier,
          m.animal_type,
          m.carcass_weight,
          m.price_per_kg,
          m.total_amount,
          m.paid_amount,
          m.remaining_amount,
          m.payment_date || 'CARİ',
          m.notes || ''
        ];
      } else {
        const a = r as AutoDetectedOpenMeat;
        return [
          a.slaughter_date,
          a.supplier,
          a.animal_type,
          a.carcass_weight,
          a.price_per_kg,
          a.total_amount,
          a.pesinat,
          a.kalan_tutar,
          'OTOMATİK',
          a.reason
        ];
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Açık Mal Ödemeleri');
    XLSX.writeFile(workbook, `acik_mal_odemeleri_${new Date().toISOString().split('T')[0]}.xlsx`);
    notify('Excel başarıyla dışa aktarıldı.', 'success');
  };

  // Excel Import for Manual Records
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.organizationId) return;

    setActionLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target?.result;
          if (!data) throw new Error('Dosya okunamadı.');

          const workbook = XLSX.read(data, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          
          if (rows.length < 2) {
            throw new Error('Dosyada yeterli satır bulunmuyor.');
          }

          // Headers mapping
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 5); i++) {
            const r = rows[i];
            if (r && r.some(cell => typeof cell === 'string' && (cell.toUpperCase().includes('TARİH') || cell.toUpperCase().includes('KG') || cell.toUpperCase().includes('TEDARİKÇİ')))) {
              headerIdx = i;
              break;
            }
          }

          if (headerIdx === -1) {
            throw new Error('Başlık satırı bulunamadı. Lütfen "TARİH", "TEDARİKÇİ" ve "KG" başlıklarının olduğundan emin olun.');
          }

          const headers = rows[headerIdx].map(h => String(h || '').trim().toUpperCase());
          const colMap = {
            tarih: headers.findIndex(h => h.includes('TARİH')),
            supplier: headers.findIndex(h => h.includes('TEDARİKÇİ') || h.includes('CARİ') || h.includes('EL')),
            kg: headers.findIndex(h => h.includes('KG') || h.includes('KARKAS') || h.includes('AĞIRLIK')),
            fiyat: headers.findIndex(h => h.includes('FİYAT') || h.includes('BİRİM')),
            odenen: headers.findIndex(h => h.includes('ÖDENEN') || h.includes('PEŞİNAT')),
            cins: headers.findIndex(h => h.includes('CİNS')),
            not: headers.findIndex(h => h.includes('NOT') || h.includes('AÇIKLAMA')),
            paymentDate: headers.findIndex(h => h.includes('ÖDEME') || h.includes('VADE'))
          };

          if (colMap.tarih === -1 || colMap.supplier === -1 || colMap.kg === -1) {
            throw new Error('"TARİH", "TEDARİKÇİ" ve "AĞIRLIK (KG)" sütunları zorunludur.');
          }

          const newPayloads: any[] = [];
          let duplicateCount = 0;

          // Parsing dates helper
          const parseDate = (val: any): string => {
            if (!val) return new Date().toISOString().split('T')[0];
            if (typeof val === 'number') {
              // Excel date serial
              const date = new Date((val - 25569) * 86400 * 1000);
              return date.toISOString().split('T')[0];
            }
            const s = String(val).trim();
            const parts = s.split(/[-./]/);
            if (parts.length === 3) {
              // Try DD.MM.YYYY
              if (parts[0].length === 2 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
              // Try YYYY-MM-DD
              if (parts[0].length === 4) {
                return `${parts[0]}-${parts[1]}-${parts[2]}`;
              }
            }
            return new Date(s).toISOString().split('T')[0];
          };

          for (let i = headerIdx + 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.length === 0) continue;

            const date = parseDate(r[colMap.tarih]);
            const supplier = String(r[colMap.supplier] || '').trim();
            const kg = parseFloat(String(r[colMap.kg]).replace(',', '.')) || 0;
            
            if (!supplier || kg <= 0) continue;

            const price = colMap.fiyat !== -1 ? (parseFloat(String(r[colMap.fiyat]).replace(',', '.')) || 0) : 0;
            const odenen = colMap.odenen !== -1 ? (parseFloat(String(r[colMap.odenen]).replace(',', '.')) || 0) : 0;
            const cins = colMap.cins !== -1 ? String(r[colMap.cins] || 'Dana').trim() : 'Dana';
            const not = colMap.not !== -1 ? String(r[colMap.not] || '').trim() : '';
            const paymentDateVal = colMap.paymentDate !== -1 ? formatExcelPaymentDate(r[colMap.paymentDate]) : 'CARİ';

            const total = kg * price;
            const remaining = total - odenen;

            // Strict duplicate check (ignores price difference updates)
            const isDup = manualRecords.some(m => 
              m.date === date &&
              m.supplier.trim().toLowerCase() === supplier.toLowerCase() &&
              Math.abs(m.carcass_weight - kg) < 0.01 &&
              m.animal_type.toLowerCase() === cins.toLowerCase()
            );

            if (isDup) {
              duplicateCount++;
            } else {
              newPayloads.push({
                organization_id: user.organizationId,
                date,
                supplier,
                animal_type: cins,
                carcass_weight: kg,
                price_per_kg: price,
                total_amount: total,
                paid_amount: odenen,
                remaining_amount: remaining,
                notes: not || null,
                payment_date: paymentDateVal
              });
            }
          }

          if (newPayloads.length === 0) {
            notify(`Yüklenecek yeni kayıt bulunamadı. (${duplicateCount} mükerrer kayıt atlandı)`, 'info');
            return;
          }

          const { error } = await supabase
            .from('acik_mal_odemeleri')
            .insert(newPayloads);

          if (error) throw error;
          notify(`${newPayloads.length} yeni açık mal ödemesi başarıyla yüklendi. (${duplicateCount} mükerrer kayıt atlandı)`, 'success');
          void fetchManualRecords();
        } catch (err: any) {
          notify('Dosya işlenirken hata oluştu: ' + err.message, 'error');
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      notify('Dosya okunamadı: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (selectedSupplierDetail) {
    return renderSupplierDetailPage();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Açık Mal Ödemeleri"
        description="Kesim listesinde olup cari kartı olmayan veya hareketleri Vega'ya henüz işlenmemiş açık mal ödemelerini izleyin ve yönetin."
        actions={
          <div className="flex items-center gap-3">
            {activeTab === 'auto_detect' && (
              <button
                onClick={handleDeleteAll}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <Trash2 size={16} />
                Tümünü Sil
              </button>
            )}

            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Yenile
            </button>
            
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <FileSpreadsheet size={16} />
              Excel'e Aktar
            </button>

            {activeTab === 'manual' && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <Upload size={16} />
                  Excel Yükle
                </button>

                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <Plus size={16} />
                  Açık Mal Parası Gir
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Tabs Menu */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('manual')}
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'manual'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Açık Mal Ödeme Kayıtları (Manuel)
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'manual' ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {filteredManualRecords.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('auto_detect')}
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'auto_detect'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Akıllı Tespit Edilen Açık Mallar (Otomatik)
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'auto_detect' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {filteredAutoDetected.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm hover:shadow-md transition-all">
          <span className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider">Kayıt Adedi</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900">{stats.totalQty} Adet</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm hover:shadow-md transition-all">
          <span className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider">Toplam Kilo</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900">
              {stats.totalKg.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm hover:shadow-md transition-all">
          <span className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider">Toplam Tutar</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900">
              {stats.totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm hover:shadow-md transition-all">
          <span className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider">Toplam Ödenen</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">
              {stats.totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm hover:shadow-md transition-all">
          <span className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider">Kalan Açık Bakiye</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600">
              {stats.totalRem.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
            </span>
          </div>
        </div>
      </div>

      {/* Info Warning banner for Auto tab */}
      {activeTab === 'auto_detect' && (
        <div className="flex gap-3 rounded-lg bg-amber-50 p-4 border border-amber-200 text-amber-800 text-sm">
          <Info size={20} className="shrink-0 text-amber-500" />
          <div>
            <span className="font-bold">Nasıl Çalışır?</span> Bu liste, kesim listesinde fiyatı sıfırdan büyük olan hayvanların, Vega ERP cari kartlarında veya cari hesap hareketlerinde eşleşen bir faturasının bulunamaması durumunda otomatik olarak listelenir. Bu kayıtlar üzerindeki işlemleri takip etmek veya geçici ödeme girmek için yanlarındaki <strong>"Açık Mal Parası"</strong> butonuna tıklayarak ödeme tablosuna aktarabilirsiniz.
          </div>
        </div>
      )}

      {/* Filters Area */}
      <div className="flex flex-wrap gap-4 items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center shrink-0 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tedarikçi adı veya notlarda ara..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Clear Filters Button */}
          <button
            onClick={() => {
              setLocalSearch('');
              setAnimalTypeFilter('all');
              setStartDate('');
              setEndDate('');
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
          >
            Temizle
          </button>

          {/* Animal Type Filter */}
          <select
            value={animalTypeFilter}
            onChange={(e) => setAnimalTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Tüm Cinsler</option>
            <option value="Dana">Dana</option>
            <option value="İnek">İnek</option>
            <option value="Düve">Düve</option>
            <option value="Manda">Manda</option>
            <option value="Kuzu">Kuzu</option>
          </select>
        </div>

        {/* Date Ranges */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
          <span className="text-sm font-semibold text-gray-500">Tarih:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* View Mode Selector (Summary / List) */}
      {activeTab === 'manual' && (
        <div className="flex items-center gap-2 my-4">
          <button
            onClick={() => setViewMode('summary')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
              viewMode === 'summary'
                ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Açık Mal Ödemeleri
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
              viewMode === 'list'
                ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Açık Mal Ödemeleri Liste
          </button>
        </div>
      )}

      {/* Main Records Table Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
            <RefreshCw size={36} className="animate-spin text-brand-600" />
            <span className="text-sm font-medium">Veriler yükleniyor ve karşılaştırılıyor...</span>
          </div>
        ) : activeTab === 'manual' ? (
          filteredManualRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Database size={48} className="text-gray-300 mb-3" />
              <span className="text-sm font-medium">Açık mal ödemesi kaydı bulunamadı.</span>
            </div>
          ) : (
            viewMode === 'summary' ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-gray-500">
                  <thead className="bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <tr>
                      {renderSortHeader('Son İşlem Tarihi', 'date', 'center')}
                      {renderSortHeader('Tedarikçi / Cari Hesap', 'supplier')}
                      {renderSortHeader('Toplam Tutar', 'total_amount', 'right')}
                      {renderSortHeader('Toplam Ödenen', 'paid_amount', 'right')}
                      {renderSortHeader('Kalan Bakiye', 'remaining_amount', 'right')}
                      <th className="px-6 py-4 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-900 font-semibold">
                    {paginatedGrouped.map((g) => (
                      <tr key={g.supplier} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 text-center text-gray-500 font-medium">
                          {new Date(g.latest_date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <span
                            onClick={() => handleCariClick(g.supplier)}
                            className="cursor-pointer hover:underline text-brand-600 hover:text-brand-700 font-bold"
                            title="Vega Cari Hareketlerine Git"
                          >
                            {g.supplier}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[15px] font-semibold text-gray-900">
                          {g.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[15px] font-semibold text-emerald-600">
                          {g.paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </td>
                        <td className={`whitespace-nowrap px-6 py-4 text-right pr-10 text-[15px] font-bold ${g.remaining_amount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {g.remaining_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <button
                            onClick={() => handleCariClick(g.supplier)}
                            className="text-brand-600 hover:text-brand-900 font-bold text-xs bg-brand-50 px-2.5 py-1 rounded border border-brand-100 hover:bg-brand-100 transition-colors"
                          >
                            Detay Göster
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200">
                      <td colSpan={2} className="px-6 py-4 text-left">TOPLAM</td>
                      <td className="px-6 py-4 text-right">
                        {stats.totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600">
                        {stats.totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-6 py-4 text-right text-rose-600">
                        {stats.totalRem.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-gray-500">
                  <thead className="bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <tr>
                      {renderSortHeader('Kesim Tarihi', 'date', 'center')}
                      {renderSortHeader('Tedarikçi / Cari Hesap', 'supplier')}
                      {renderSortHeader('Toplam Tutar', 'total_amount', 'right')}
                      {renderSortHeader('Kalan Bakiye', 'remaining_amount', 'right')}
                      {renderSortHeader('Ödeme Tarihi', 'payment_date', 'center')}
                      {renderSortHeader('Açıklama', 'notes')}
                      <th className="px-6 py-4 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-900 font-semibold">
                    {paginatedManual.map((r: OpenPaymentRecord) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 text-center text-gray-500 font-medium">
                          <InlineEdit
                            value={r.date}
                            displayValue={new Date(r.date).toLocaleDateString('tr-TR')}
                            onSave={(val) => void handleSaveField(r.id, 'date', val)}
                            type="date"
                            align="center"
                            className="justify-center"
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <InlineEdit
                            value={r.supplier}
                            displayValue={
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCariClick(r.supplier);
                                }}
                                className="cursor-pointer hover:underline text-brand-600 hover:text-brand-700 font-bold"
                                title="Vega Cari Hareketlerine Git"
                              >
                                {r.supplier}
                              </span>
                            }
                            onSave={(val) => void handleSaveField(r.id, 'supplier', val)}
                            className="font-bold text-gray-900"
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[15px] font-semibold text-gray-900">
                          <InlineEdit
                            value={String(r.total_amount)}
                            displayValue={`${Number(r.total_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                            onSave={(val) => void handleSaveField(r.id, 'total_amount', parseFloat(val) || 0)}
                            isNumeric={true}
                            align="right"
                            className="justify-end font-semibold text-gray-900"
                            inputClassName="!text-right font-semibold text-gray-900"
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[15px] font-semibold text-rose-600">
                          <InlineEdit
                            value={String(r.remaining_amount)}
                            displayValue={`${Number(r.remaining_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                            onSave={(val) => void handleSaveField(r.id, 'remaining_amount', parseFloat(val) || 0)}
                            isNumeric={true}
                            align="right"
                            className="justify-end font-semibold text-rose-600"
                            inputClassName="!text-right font-semibold text-rose-600"
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <InlinePaymentDate
                            value={r.payment_date || 'CARİ'}
                            onSave={(val) => void handleSaveField(r.id, 'payment_date', val)}
                          />
                        </td>
                        <td className="px-6 py-4 text-xs max-w-xs truncate text-gray-500 font-medium" title={r.notes || ''}>
                          <InlineEdit
                            value={r.notes || ''}
                            displayValue={r.notes || '-'}
                            onSave={(val) => void handleSaveField(r.id, 'notes', val)}
                            className="text-xs text-gray-500 font-medium"
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="text-gray-400 hover:text-brand-600"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="text-gray-400 hover:text-rose-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200">
                      <td colSpan={2} className="px-6 py-4 text-left">TOPLAM</td>
                      <td className="px-6 py-4 text-right">
                        {stats.totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-6 py-4 text-right text-rose-600">
                        {stats.totalRem.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td colSpan={3} className="px-6 py-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          )
        ) : (
          filteredAutoDetected.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <CheckCircle2 size={48} className="text-emerald-500 mb-3" />
              <span className="text-sm font-medium text-emerald-600">Harika! Eşleşmeyen veya açıkta kalan hiçbir kesim kaydı tespit edilmedi.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <tr>
                    {renderSortHeader('Kesim Tarihi', 'date')}
                    {renderSortHeader('Kesim Tedarikçisi', 'supplier')}
                    {renderSortHeader('Cins', 'animal_type')}
                    {renderSortHeader('Kilo (kg)', 'carcass_weight', 'right')}
                    {renderSortHeader('Birim Fiyat', 'price_per_kg', 'right')}
                    {renderSortHeader('Toplam Kesim', 'total_amount', 'right')}
                    {renderSortHeader('Peşinat / Kalan', 'remaining_amount', 'right')}
                    {renderSortHeader('Neden Eşleşmedi?', 'reason')}
                    <th className="px-6 py-4 text-center">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-900 font-semibold">
                  {paginatedAuto.map((r: AutoDetectedOpenMeat) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 font-medium">
                        {new Date(r.slaughter_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        <div
                          onClick={() => {
                            handleCariClick(r.supplier);
                          }}
                          className="cursor-pointer hover:underline text-brand-600 hover:text-brand-700 font-bold"
                          title="Açık Mal Cari Hareketlerini Göster"
                        >
                          {r.supplier}
                        </div>
                        {r.matchedCariName && (
                          <div className="text-[10.5px] font-semibold text-gray-400">
                            Vega Cari: {r.matchedCariName} ({r.matchedCariCode})
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                          r.animal_type === 'Kuzu' ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                        }`}>
                          {r.animal_type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {r.carcass_weight.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} kg
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-gray-500 font-medium">
                        {r.price_per_kg.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-bold">
                        {r.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-xs">
                        <div className="text-emerald-600">Öd: {r.pesinat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
                        <div className="text-rose-600 font-bold">Kal: {r.kalan_tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                          r.reason === 'Cari Kart Bulunamadı'
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                            : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                        }`}>
                          <AlertTriangle size={12} />
                          {r.reason}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleTransferToManual(r)}
                            title="Açık Mal Ödemeleri Manuel Listesine Ekle"
                            className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-600 hover:bg-brand-100"
                          >
                            <PlusCircle size={14} />
                            Açık Mal Parası
                          </button>

                          <button
                            onClick={() => handleDeleteSlaughter(r.id)}
                            title="Bu kesim kaydını kesim listesinden sil"
                            className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                          >
                            <Trash2 size={14} />
                            Sil
                          </button>

                          {r.reason === 'Cari Kart Bulunamadı' && (
                            <button
                              onClick={() => handleCreateCariWarning(r.supplier)}
                              title="Vega'da Cari Kart Oluşturma Bilgisi"
                              className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                            >
                              <HelpCircle size={14} />
                              Cari Kart
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200">
                    <td colSpan={3} className="px-6 py-4 text-left">TOPLAM</td>
                    <td className="px-6 py-4 text-right">
                      {stats.totalKg.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} kg
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 font-normal">-</td>
                    <td className="px-6 py-4 text-right">
                      {stats.totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="px-6 py-4 text-right text-xs">
                      <div className="text-emerald-600">Öd: {stats.totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
                      <div className="text-rose-600 font-bold">Kal: {stats.totalRem.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
                    </td>
                    <td colSpan={2} className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-xl shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 font-medium">
                Toplam <span className="font-bold">{totalItems}</span> kayıttan{' '}
                <span className="font-bold">{startItem}</span> -{' '}
                <span className="font-bold">{endItem}</span> arası gösteriliyor.
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 disabled:opacity-50"
                >
                  <span className="sr-only">Önceki</span>
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum = currentPage;
                  if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  if (pageNum <= 0 || pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 ${
                        currentPage === pageNum
                          ? 'z-10 bg-brand-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 disabled:opacity-50"
                >
                  <span className="sr-only">Sonraki</span>
                  <ChevronRight size={16} />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Open Payment Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedRecord ? 'Açık Mal Ödemesini Düzenle' : 'Yeni Açık Mal Ödemesi'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              </div>



              {/* Supplier / Recipient */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Tedarikçi / Cari Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Volkan Güler"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Total Amount */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam Tutar (TL)</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 202.020,00"
                    value={formTotalAmount}
                    onChange={(e) => {
                      const formatted = formatNumberString(e.target.value);
                      setFormTotalAmount(formatted);
                      if (!formRemainingAmount || formRemainingAmount === formTotalAmount) {
                        setFormRemainingAmount(formatted);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>

                {/* Remaining Amount */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Kalan Bakiye (TL)</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 202.020,00"
                    value={formRemainingAmount}
                    onChange={(e) => setFormRemainingAmount(formatNumberString(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ödeme Tarihi / Durumu</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="date"
                      value={
                        formPaymentDate && formPaymentDate !== 'CARİ'
                          ? (formPaymentDate.includes('.') ? formPaymentDate.split('.').reverse().join('-') : formPaymentDate)
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setFormPaymentDate('CARİ');
                        } else {
                          const parts = val.split('-');
                          setFormPaymentDate(`${parts[2]}.${parts[1]}.${parts[0]}`);
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormPaymentDate('CARİ')}
                      className={`px-3 py-2 text-xs font-bold border rounded-lg transition-colors ${
                        formPaymentDate === 'CARİ'
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      CARİ
                    </button>
                  </div>
                </div>
              </div>



              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Açıklama</label>
                <textarea
                  rows={2}
                  placeholder="İmha stopajı, açık mal senedi vb."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={actionLoading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
