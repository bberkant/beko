import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { 
  Beef, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  Calendar, 
  Scale, 
  TrendingUp, 
  Coins,
  Upload,
  PlusCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import * as XLSX from 'xlsx';

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

const formatDateForDB = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`; // yyyy-mm-dd to dd.mm.yyyy
  }
  return dateStr;
};

const formatDateForInput = (dateStr: string) => {
  if (!dateStr || dateStr === 'CARİ') {
    return new Date().toISOString().split('T')[0];
  }
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // dd.mm.yyyy to yyyy-mm-dd
  }
  return dateStr;
};

interface InlinePaymentDateProps {
  value: string;
  onSave: (val: string) => void;
  disabled?: boolean;
}

function InlinePaymentDate({ value, onSave, disabled }: InlinePaymentDateProps) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState('');

  useEffect(() => {
    if (editing) {
      setTempVal(formatDateForInput(value));
    }
  }, [value, editing]);

  const handleSave = (val: string) => {
    if (!val) {
      onSave('CARİ');
    } else {
      onSave(formatDateForDB(val));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[130px] justify-center">
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
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-full gap-1 group/item select-none">
      <span className="font-semibold text-gray-700">{value || 'CARİ'}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={disabled}
        className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity absolute -right-5 top-1/2 -translate-y-1/2"
        title="Düzenle"
      >
        <Pencil size={16} />
      </button>
    </div>
  );
}

const CARI_ALIASES: Record<string, string[]> = {
  'cemalerdogan': ['metinerdogan'],
  'fevziozuzma': ['cebrailogluticaret'],
  'zekikaraca': ['muratkaraca', 'karacaet', 'ozyaylakaracaet', 'karacakasapsarkuteri', 'karacaetmerkezkasabisedat'],
  'etasetgross': ['etaseturunleri', 'etaset'],
  'etaskros': ['etaseturunleri', 'etaset'],
  'fimaras': ['fimar', 'fimarmerbermadenas', 'fimarmerberas', 'fimarmerbermaden', 'fimarmerbermadencilikinsaat'],
  'kenanhoca': ['kenanhocakesim', 'suluovakenancolak', 'altinsatireturunlerisuluovakenancolak', 'kenanerkoç', 'kenanpala'],
};

interface KesimRecord {
  id: string;
  organization_id: string;
  slaughter_date: string;
  supplier: string;
  ear_tag_no: string | null;
  animal_type: string;
  live_weight: number | null;
  carcass_weight: number;
  yield_rate: number | null;
  price_per_kg: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  // New columns corresponding to the Excel template
  head_count: number;
  pesinat: number;
  kalan_tutar: number;
  payment_date: string | null;
  is_acik_mal?: boolean;
}

interface FormState {
  slaughter_date: string;
  supplier: string;
  ear_tag_no: string;
  animal_type: string;
  live_weight: string;
  carcass_weight: string;
  price_per_kg: string;
  notes: string;
  head_count: string;
  pesinat: string;
  payment_date: string;
}

const emptyForm = (): FormState => ({
  slaughter_date: new Date().toISOString().split('T')[0],
  supplier: '',
  ear_tag_no: '',
  animal_type: 'Dana',
  live_weight: '',
  carcass_weight: '',
  price_per_kg: '',
  notes: '',
  head_count: '1',
  pesinat: '0',
  payment_date: '-'
});

const animalTypes = ['DANA', 'DÜVE', 'İNEK', 'KUZU', 'KOYUN', 'MANDA', 'OGLAK', 'MAL', 'KOC', 'TOSUN', 'DİĞER'];

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
};

const parseDateString = (str: string): number => {
  if (!str) return 0;
  const datePart = str.slice(0, 10);
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatNumber = (num: number, unit = '') => {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 2
  }).format(num) + (unit ? ` ${unit}` : '');
};

const formatExcelPaymentDate = (val: any): string => {
  if (val === undefined || val === null) return 'CARİ';
  const str = String(val).trim();
  if (!str) return 'CARİ';
  
  // Check if it's a number (Excel serial date)
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

const parseExcelDate = (val: any, selectedYear?: string, selectedMonth?: string): string | null => {
  if (val === undefined || val === null) return null;
  
  const clean = String(val).trim();
  if (!clean) return null;

  // 1. Check for standard formats using separators
  if (clean.includes('.') || clean.includes('-')) {
    const parts = clean.includes('.') ? clean.split('.') : clean.split('-');
    if (parts.length === 3) {
      let year = parts[2].trim();
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${year}-${parts[1].trim().padStart(2, '0')}-${parts[0].trim().padStart(2, '0')}`;
    }
    if (parts.length === 2 && selectedYear) {
      return `${selectedYear}-${parts[1].trim().padStart(2, '0')}-${parts[0].trim().padStart(2, '0')}`;
    }
  }

  // 2. Check if it's a number (either Excel Serial or day-of-month)
  const num = Number(clean);
  if (!isNaN(num)) {
    // Excel Date Serial number (usually > 30000 and < 60000 for years 1982-2064)
    if (num > 30000 && num < 60000) {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    
    // Day of month (integer between 1 and 31)
    if (Number.isInteger(num) && num >= 1 && num <= 31 && selectedYear && selectedMonth && selectedMonth !== 'all' && selectedMonth !== 'custom' && selectedMonth !== 'year') {
      const y = selectedYear;
      const m = selectedMonth.padStart(2, '0');
      const d = String(num).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  
  return null;
};

const formatNumberString = (str: string) => {
  const clean = str.replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('tr-TR');
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
    setTempVal(isNumeric ? formatNumberString(value) : value);
    setEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const finalVal = isNumeric ? tempVal.replace(/\./g, '') : tempVal;
      onSave(finalVal);
      setEditing(false);
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleBlur = () => {
    const finalVal = isNumeric ? tempVal.replace(/\./g, '') : tempVal;
    onSave(finalVal);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type={type}
        className={`input !py-0.5 !px-1.5 !text-inherit w-full ${inputClassName}`}
        value={tempVal}
        onChange={(e) => setTempVal(isNumeric ? formatNumberString(e.target.value) : e.target.value)}
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
        className="p-0.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity absolute -right-5 top-1/2 -translate-y-1/2"
        title="Düzenle"
      >
        <Pencil size={16} />
      </button>
    </div>
  );
}

function InlineSelect({
  value,
  options,
  onSave,
  className = "",
  badgeClass = ""
}: {
  value: string;
  options: { [key: string]: string };
  onSave: (val: string) => void;
  className?: string;
  badgeClass?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        className="input !py-0.5 !px-1.5 !text-xs w-full"
        value={value}
        onChange={(e) => {
          onSave(e.target.value);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        autoFocus
      >
        {Object.entries(options).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-1 group/item ${className}`}>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeClass}`}>
        {options[value] || value}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="p-0.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0"
        title="Düzenle"
      >
        <Pencil size={11} />
      </button>
    </div>
  );
}

export function KesimListesiPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [records, setRecords] = useState<KesimRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [animalTypeFilter, setAnimalTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, '0');
    return `${y}-${mm}-${String(lastDay).padStart(2, '0')}`;
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    return String(new Date().getMonth() + 1).padStart(2, '0');
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    return String(new Date().getFullYear());
  });

  const handleMonthSelect = (monthVal: string, yearVal = selectedYear) => {
    setSelectedMonth(monthVal);
    if (monthVal === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (monthVal === 'year') {
      const yr = parseInt(yearVal, 10);
      setStartDate(`${yr}-01-01`);
      setEndDate(`${yr}-12-31`);
    } else if (monthVal !== 'custom') {
      const yr = parseInt(yearVal, 10);
      const monthNum = parseInt(monthVal, 10);
      const lastDay = new Date(yr, monthNum, 0).getDate();
      const padM = monthVal.padStart(2, '0');
      setStartDate(`${yr}-${padM}-01`);
      setEndDate(`${yr}-${padM}-${String(lastDay).padStart(2, '0')}`);
    }
  };

  const handleYearSelect = (yearVal: string) => {
    setSelectedYear(yearVal);
    if (selectedMonth === 'year') {
      const yr = parseInt(yearVal, 10);
      setStartDate(`${yr}-01-01`);
      setEndDate(`${yr}-12-31`);
    } else if (selectedMonth !== 'all' && selectedMonth !== 'custom') {
      handleMonthSelect(selectedMonth, yearVal);
    } else if (selectedMonth === 'all') {
      // Remain empty for all time
    }
  };

  // Column Filters
  const [columnFilters, setColumnFilters] = useState({
    slaughter_date: '',
    supplier: '',
    notes: '',
    payment_date: ''
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<KesimRecord | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyForm());

  // Fetch records
  const fetchRecords = useCallback(async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('kesim_listesi')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('slaughter_date', { ascending: true })
        .limit(5000);

      if (startDate) {
        query = query.gte('slaughter_date', startDate);
      }
      if (endDate) {
        query = query.lte('slaughter_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      notify('Kesim kayıtları yüklenirken bir hata oluştu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, startDate, endDate, notify]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const handleSyncVegaPrices = async () => {
    setActionLoading(true);
    try {
      const { data: zeroRecords, error: fetchErr } = await supabase
        .from('kesim_listesi')
        .select('*')
        .eq('organization_id', user?.organizationId)
        .or('price_per_kg.eq.0,price_per_kg.is.null');

      if (fetchErr) throw fetchErr;

      if (!zeroRecords || zeroRecords.length === 0) {
        notify('Sıfır fiyatlı herhangi bir kesim kaydı bulunamadı.', 'info');
        setActionLoading(false);
        return;
      }

      const { data: cariler, error: carilerErr } = await supabase
        .from('vega_cariler')
        .select('code, name')
        .eq('organization_id', user?.organizationId);

      if (carilerErr) throw carilerErr;

      const cleanName = (n: string) => turkishNormalize(n).replace(/\s+/g, '');

      const cariMap = new Map<string, string>();
      if (cariler) {
        cariler.forEach(c => {
          cariMap.set(cleanName(c.name), c.code);
        });
      }

      let updatedCount = 0;

      for (const rec of zeroRecords) {
        const normalizedSupplier = cleanName(rec.supplier);
        let cariCode = cariMap.get(normalizedSupplier);

        if (!cariCode) {
          // 1. Try aliases
          const aliases = CARI_ALIASES[normalizedSupplier] || [];
          for (const alias of aliases) {
            const cleanAlias = cleanName(alias);
            cariCode = cariMap.get(cleanAlias);
            if (cariCode) break;
          }
        }

        if (!cariCode) {
          // 2. Try fuzzy check (word substring match)
          for (const [name, code] of cariMap.entries()) {
            if (name.includes(normalizedSupplier) || normalizedSupplier.includes(name)) {
              cariCode = code;
              break;
            }
          }
        }

        if (!cariCode) continue;

        // Use UTC date parsing and math to completely prevent local browser timezone offset shifting
        const sDate = new Date(rec.slaughter_date + 'T00:00:00Z');
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const dateStart = new Date(sDate.getTime() - threeDaysMs);
        const dateEnd = new Date(sDate.getTime() + threeDaysMs);

        const startStr = dateStart.toISOString().split('T')[0];
        const endStr = dateEnd.toISOString().split('T')[0];

        const { data: movements, error: movErr } = await supabase
          .from('vega_cari_hareketler')
          .select('*')
          .eq('organization_id', user?.organizationId)
          .eq('cari_code', cariCode)
          .gte('date', startStr)
          .lte('date', endStr + 'T23:59:59Z')
          .gt('unit_price', 0);

        if (movErr || !movements || movements.length === 0) continue;

        const recType = turkishNormalize(rec.animal_type || '');
        const matchedMovements = movements.filter(m => {
          const mProduct = turkishNormalize(m.product_name || '');
          return mProduct.includes(recType) || recType.includes(mProduct);
        });

        if (matchedMovements.length === 0) continue;

        let chosenPrice = 0;

        // Helper to get actual quantity (calculates line_tutar / unit_price if API returned 0)
        const getQty = (m: any) => {
          const qty = Number(m.quantity || 0);
          if (qty > 0.001) return qty;
          const price = Number(m.unit_price || 0);
          if (price > 0) return Number(m.line_tutar || 0) / price;
          return 0;
        };

        const exactQtyMatch = matchedMovements.find(m => Math.abs(getQty(m) - rec.carcass_weight) < 0.1);
        if (exactQtyMatch) {
          chosenPrice = Number(exactQtyMatch.unit_price);
        } else {
          const groups = new Map<string, { sumQty: number, weightedSum: number }>();
          matchedMovements.forEach(m => {
            const key = `${m.invoice_no || 'no-inv'}_${m.date.split('T')[0]}`;
            if (!groups.has(key)) {
              groups.set(key, { sumQty: 0, weightedSum: 0 });
            }
            const g = groups.get(key)!;
            const q = getQty(m);
            const price = Number(m.unit_price || 0);
            g.sumQty += q;
            g.weightedSum += q * price;
          });

          let bestGroupKey = '';
          for (const [key, g] of groups.entries()) {
            if (Math.abs(g.sumQty - rec.carcass_weight) < 1.0) {
              bestGroupKey = key;
              break;
            }
          }

          if (bestGroupKey) {
            const g = groups.get(bestGroupKey)!;
            chosenPrice = g.weightedSum / g.sumQty;
          } else {
            const totalP = matchedMovements.reduce((sum, m) => sum + Number(m.unit_price), 0);
            chosenPrice = totalP / matchedMovements.length;
          }
        }

        if (chosenPrice > 0) {
          chosenPrice = Number(chosenPrice.toFixed(2));
          const totalAmount = rec.carcass_weight * chosenPrice;
          const kalanTutar = totalAmount - (rec.pesinat || 0);

          const { error: updateErr } = await supabase
            .from('kesim_listesi')
            .update({
              price_per_kg: chosenPrice,
              total_amount: totalAmount,
              kalan_tutar: kalanTutar
            })
            .eq('id', rec.id);

          if (!updateErr) {
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        notify(`${updatedCount} adet sıfır fiyatlı kesim kaydı Vega fatura verileriyle eşleştirilerek başarıyla güncellendi!`, 'success');
        void fetchRecords();
      } else {
        notify('Sıfır fiyatlı kayıtlar için Vega hareketlerinde eşleşen fatura fiyatı bulunamadı.', 'info');
      }
    } catch (err: any) {
      console.error(err);
      notify('Fiyat eşitlemesi yapılırken hata oluştu: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveField = async (recordId: string, field: string, value: any) => {
    setActionLoading(true);
    try {
      const record = records.find(r => r.id === recordId);
      if (!record) return;

      const updatedRecord = { ...record, [field]: value };
      
      const carcassWeightNum = Number(updatedRecord.carcass_weight) || 0;
      const pricePerKgNum = Number(updatedRecord.price_per_kg) || 0;
      const pesinatNum = Number(updatedRecord.pesinat) || 0;
      const totalAmount = carcassWeightNum * pricePerKgNum;
      const kalanTutar = totalAmount - pesinatNum;
      
      const payload: Record<string, any> = {
        [field]: value
      };
      
      if (['carcass_weight', 'price_per_kg', 'pesinat'].includes(field)) {
        payload.total_amount = totalAmount;
        payload.kalan_tutar = kalanTutar;
      } else if (field === 'total_amount') {
        const newTotal = Number(value) || 0;
        payload.kalan_tutar = newTotal - (Number(record.pesinat) || 0);
      } else if (field === 'kalan_tutar') {
        const newKalan = Number(value) || 0;
        const currentTotal = Number(record.total_amount) || 0;
        payload.pesinat = currentTotal - newKalan;
      }

      const { error } = await supabase
          .from('kesim_listesi')
          .update(payload)
          .eq('id', recordId);

      if (error) throw error;
      
      setRecords(prev => prev.map(r => r.id === recordId ? { 
        ...r, 
        ...payload
      } : r));
      
      notify('Kayıt güncellendi.', 'success');
    } catch (error: any) {
      notify('Güncelleme sırasında bir hata oluştu: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAcikMal = async (item: KesimRecord, statusValue: string) => {
    const isAcik = statusValue === 'ACIK_LISTE';
    setActionLoading(true);
    try {
      if (isAcik) {
        // 1. Send/Insert to acik_mal_odemeleri
        const { error: insErr } = await supabase
          .from('acik_mal_odemeleri')
          .insert({
            organization_id: item.organization_id,
            date: item.slaughter_date,
            supplier: item.supplier,
            animal_type: item.animal_type || 'Dana',
            carcass_weight: item.carcass_weight || 0,
            price_per_kg: item.price_per_kg || 0,
            total_amount: item.total_amount || 0,
            paid_amount: item.pesinat || 0,
            remaining_amount: item.kalan_tutar || 0,
            notes: null,
            payment_date: item.payment_date || 'CARİ'
          });

        if (insErr) throw insErr;

        // 2. Update is_acik_mal in kesim_listesi
        const { error: updErr } = await supabase
          .from('kesim_listesi')
          .update({ is_acik_mal: true })
          .eq('id', item.id);

        if (updErr) throw updErr;
        
        notify('Açık mal ödeme kaydı başarıyla oluşturuldu.', 'success');
      } else {
        // 1. Delete from acik_mal_odemeleri (matching by supplier, date and total_amount)
        const { error: delErr } = await supabase
          .from('acik_mal_odemeleri')
          .delete()
          .eq('supplier', item.supplier)
          .eq('date', item.slaughter_date)
          .eq('total_amount', item.total_amount);

        if (delErr) throw delErr;

        // 2. Update is_acik_mal in kesim_listesi
        const { error: updErr } = await supabase
          .from('kesim_listesi')
          .update({ is_acik_mal: false })
          .eq('id', item.id);

        if (updErr) throw updErr;

        notify('Açık mal ödemelerinden kaldırıldı.', 'info');
      }
      
      // Reload slaughter list
      void fetchRecords();
    } catch (err: any) {
      notify('Hata: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCari = async (item: KesimRecord) => {
    const isCari = item.payment_date === 'CARİ';
    const nextVal = isCari ? '-' : 'CARİ';
    await handleSaveField(item.id, 'payment_date', nextVal);
  };

  // Form helpers
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormState(emptyForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: KesimRecord) => {
    setEditingRecord(record);
    setFormState({
      slaughter_date: record.slaughter_date,
      supplier: record.supplier,
      ear_tag_no: record.ear_tag_no || '',
      animal_type: record.animal_type,
      live_weight: record.live_weight !== null ? record.live_weight.toString() : '',
      carcass_weight: record.carcass_weight.toString(),
      price_per_kg: record.price_per_kg.toString(),
      notes: record.notes || '',
      head_count: record.head_count.toString(),
      pesinat: record.pesinat.toString(),
      payment_date: record.payment_date || 'CARİ'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kesim kaydını silmek istediğinize emin misiniz?')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('kesim_listesi')
        .delete()
        .eq('id', id);

      if (error) throw error;
      notify('Kesim kaydı silindi.', 'success');
      void fetchRecords();
    } catch (error: any) {
      notify('Kayıt silinirken bir hata oluştu: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;

    const carcassWeightNum = parseFloat(formState.carcass_weight);
    const pricePerKgNum = parseFloat(formState.price_per_kg);
    const liveWeightNum = formState.live_weight ? parseFloat(formState.live_weight) : null;
    const headCountNum = parseInt(formState.head_count) || 1;
    const pesinatNum = parseFloat(formState.pesinat) || 0;

    if (isNaN(carcassWeightNum) || carcassWeightNum <= 0) {
      notify('Lütfen geçerli bir karkas kilo girin.', 'error');
      return;
    }
    if (isNaN(pricePerKgNum) || pricePerKgNum <= 0) {
      notify('Lütfen geçerli bir kg fiyatı girin.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        organization_id: user.organizationId,
        slaughter_date: formState.slaughter_date,
        supplier: formState.supplier.trim(),
        ear_tag_no: formState.ear_tag_no.trim() || null,
        animal_type: formState.animal_type,
        live_weight: liveWeightNum,
        carcass_weight: carcassWeightNum,
        price_per_kg: pricePerKgNum,
        notes: formState.notes.trim() || null,
        // yield_rate and total_amount are auto-calculated by the database trigger
        yield_rate: liveWeightNum && liveWeightNum > 0 ? (carcassWeightNum / liveWeightNum) * 100 : null,
        total_amount: carcassWeightNum * pricePerKgNum,
        // New fields matching the Excel template
        head_count: headCountNum,
        pesinat: pesinatNum,
        kalan_tutar: (carcassWeightNum * pricePerKgNum) - pesinatNum,
        payment_date: formState.payment_date.trim() || null
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('kesim_listesi')
          .update(payload)
          .eq('id', editingRecord.id);

        if (error) throw error;
        notify('Kesim kaydı güncellendi.', 'success');
      } else {
        const { error } = await supabase
          .from('kesim_listesi')
          .insert([payload]);

        if (error) throw error;
        notify('Yeni kesim kaydı eklendi.', 'success');
      }

      setIsModalOpen(false);
      void fetchRecords();
    } catch (error: any) {
      notify('Kayıt kaydedilirken bir hata oluştu: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Logic
  const filteredItems = useMemo(() => {
    return records.filter((item) => {
      // General Search (Supplier)
      if (search) {
        const query = search.toLocaleLowerCase('tr-TR');
        const matchesSupplier = item.supplier.toLocaleLowerCase('tr-TR').includes(query);
        const matchesNotes = (item.notes || '').toLocaleLowerCase('tr-TR').includes(query);
        if (!matchesSupplier && !matchesNotes) return false;
      }

      // Animal Type Filter
      if (animalTypeFilter !== 'all' && item.animal_type !== animalTypeFilter) return false;

      // Date Filters
      if (startDate) {
        const itemTime = parseDateString(item.slaughter_date);
        const startTime = parseDateString(startDate);
        if (itemTime < startTime) return false;
      }
      if (endDate) {
        const itemTime = parseDateString(item.slaughter_date);
        const endTime = parseDateString(endDate);
        if (itemTime > endTime) return false;
      }

      // Column Filters
      if (columnFilters.slaughter_date && !formatDate(item.slaughter_date).toLocaleLowerCase('tr-TR').includes(columnFilters.slaughter_date.toLocaleLowerCase('tr-TR'))) return false;
      if (columnFilters.supplier && !item.supplier.toLocaleLowerCase('tr-TR').includes(columnFilters.supplier.toLocaleLowerCase('tr-TR'))) return false;
      if (columnFilters.notes && !(item.notes || '').toLocaleLowerCase('tr-TR').includes(columnFilters.notes.toLocaleLowerCase('tr-TR'))) return false;
      if (columnFilters.payment_date && !(item.payment_date || '').toLocaleLowerCase('tr-TR').includes(columnFilters.payment_date.toLocaleLowerCase('tr-TR'))) return false;

      return true;
    });
  }, [records, search, animalTypeFilter, startDate, endDate, columnFilters]);

  // Excel Export matching KESİM LİSTESİ 2026 columns
  const handleExport = () => {
    if (filteredItems.length === 0) {
      notify('Dışa aktarılacak veri bulunamadı.', 'error');
      return;
    }

    const dataToExport = filteredItems.map((item) => ({
      'TARİH': formatDate(item.slaughter_date),
      'EL': item.supplier,
      'AD.': item.head_count,
      'CİNSİ': item.animal_type,
      'KG': item.carcass_weight,
      'FİYAT': item.price_per_kg,
      'TOPLAM': item.total_amount,
      'PEŞİNAT': item.pesinat,
      'AÇIKLAMA': item.notes || '',
      'KALAN TUTAR': item.kalan_tutar,
      'ÖDEME TARİHİ': item.payment_date || 'CARİ'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '2023'); // Sheet name matching original 2023

    XLSX.writeFile(workbook, `kesim_listesi_2026_${new Date().toISOString().split('T')[0]}.xlsx`);
    notify('Excel raporu indirildi.', 'success');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (actionLoading) return;
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
          
          // Match selected month sheet dynamically (e.g. "08 AĞUSTOS" for selectedMonth "08")
          const monthNamesTr = [
            'OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
            'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'
          ];
          
          let sheetName = '';
          if (selectedMonth !== 'all' && selectedMonth !== 'custom') {
            const monthIdx = parseInt(selectedMonth, 10) - 1;
            const trMonthName = monthNamesTr[monthIdx];
            if (trMonthName) {
              // First try to match both month name and selectedYear
              let foundSheet = workbook.SheetNames.find(s => {
                const upperName = s.toUpperCase().toLocaleUpperCase('tr-TR');
                return upperName.includes(trMonthName) && upperName.includes(selectedYear);
              });
              
              // Fallback to only month name
              if (!foundSheet) {
                foundSheet = workbook.SheetNames.find(s => 
                  s.toUpperCase().toLocaleUpperCase('tr-TR').includes(trMonthName)
                );
              }
              
              if (foundSheet) {
                sheetName = foundSheet;
              }
            }
          }
          
          if (!sheetName) {
            sheetName = workbook.SheetNames[0];
          }

          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) {
            throw new Error(`Belirtilen "${sheetName}" isimli sekme bulunamadı.`);
          }
          
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          if (rows.length < 2) {
            throw new Error('Dosyada yeterli satır bulunmuyor.');
          }

          let headerIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 5); i++) {
            const r = rows[i];
            if (r && r.some(cell => typeof cell === 'string' && (cell.toUpperCase().includes('TARİH') || cell.toUpperCase().includes('CİNSİ') || cell.toUpperCase().includes('CİNS')))) {
              headerIdx = i;
              break;
            }
          }

          if (headerIdx === -1) {
            throw new Error('Geçerli bir kesim listesi başlığı (TARİH, EL, CİNSİ vb.) bulunamadı.');
          }

          const headers = rows[headerIdx].map(h => String(h || '').trim().toUpperCase().replace(/[\r\n\s]+/g, ' '));
          
          const colMap = {
            tarih: headers.findIndex(h => h.includes('TARİH')),
            el: headers.findIndex(h => h === 'EL' || h.includes('CARİ') || h.includes('TEDARİKÇİ') || h.includes('ALICI') || h.includes('SATICI') || h.includes('ADI SOYADI') || h.includes('AD SOYAD')),
            adet: headers.findIndex(h => h === 'AD.' || h === 'ADET' || h === 'AD'),
            cinsi: headers.findIndex(h => h.includes('CİNSİ') || h.includes('CİNS')),
            kg: headers.findIndex(h => h === 'KG' || h.includes('KARKAS') || h.includes('KİLO')),
            fiyat: headers.findIndex(h => h.includes('FİYAT')),
            pesinat: headers.findIndex(h => h.includes('PEŞİNAT') || h.includes('KESİNTİ') || h === 'TUTAR' || h.includes('ÖDENEN')),
            aciklama: headers.findIndex(h => h.includes('AÇIKLAMA') || h.includes('NOT')),
            odeme: headers.findIndex(h => h.includes('ÖDEME') || h.includes('TARİHİ'))
          };

          if (colMap.tarih === -1 || colMap.el === -1 || colMap.kg === -1) {
            throw new Error('Zorunlu sütunlar (TARİH, EL, KG) bulunamadı.');
          }

          // Fetch all existing records from DB to ensure reliable duplicate detection
          const { data: dbAllList, error: dbAllErr } = await supabase
            .from('kesim_listesi')
            .select('slaughter_date, supplier, carcass_weight, animal_type')
            .eq('organization_id', user.organizationId);

          if (dbAllErr) throw dbAllErr;
          const allDbRecords = dbAllList || [];

          const newRecordsPayload: any[] = [];
          let duplicateCount = 0;
          let lastParsedDate: string | null = null;

          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const rawTarih = row[colMap.tarih];
            const rawEl = row[colMap.el];
            const rawKg = row[colMap.kg];

            if (!rawEl || !rawKg) continue;

            let parsedDate = parseExcelDate(rawTarih, selectedYear, selectedMonth);
            if (parsedDate) {
              lastParsedDate = parsedDate;
            } else {
              parsedDate = lastParsedDate;
            }

            if (!parsedDate) {
              const defMonth = (selectedMonth && selectedMonth !== 'all' && selectedMonth !== 'custom') ? selectedMonth : '01';
              const defYear = selectedYear || new Date().getFullYear().toString();
              parsedDate = `${defYear}-${defMonth.padStart(2, '0')}-01`;
            }

            const parsedSupplier = String(rawEl).trim();
            
            // Skip summary/total/header helper rows
            const supplierUpper = parsedSupplier.toUpperCase().toLocaleUpperCase('tr-TR');
            if (supplierUpper.includes('TOPLAM') || supplierUpper.includes('GENEL') || supplierUpper === 'EL') {
              continue;
            }

            const parsedCarcassWeight = parseFloat(String(rawKg).replace(',', '.')) || 0;
            if (parsedCarcassWeight <= 0) continue;

            const parsedPricePerKg = colMap.fiyat !== -1 ? (parseFloat(String(row[colMap.fiyat]).replace(',', '.')) || 0) : 0;
            const parsedAnimalType = colMap.cinsi !== -1 ? String(row[colMap.cinsi] || 'Dana').trim() : 'Dana';
            const parsedHeadCount = colMap.adet !== -1 ? (parseInt(String(row[colMap.adet])) || 1) : 1;
            const parsedPesinat = colMap.pesinat !== -1 ? (parseFloat(String(row[colMap.pesinat]).replace(',', '.')) || 0) : 0;
            const parsedNotes = colMap.aciklama !== -1 ? String(row[colMap.aciklama] || '').trim() : '';
            const parsedPayment = colMap.odeme !== -1 ? formatExcelPaymentDate(row[colMap.odeme]) : 'CARİ';

            const isDuplicate = allDbRecords.some(r => 
              r.slaughter_date === parsedDate &&
              r.supplier.trim().toLocaleLowerCase('tr-TR') === parsedSupplier.toLocaleLowerCase('tr-TR') &&
              Math.abs(Number(r.carcass_weight) - parsedCarcassWeight) < 0.01 &&
              r.animal_type.trim().toLocaleLowerCase('tr-TR') === parsedAnimalType.toLocaleLowerCase('tr-TR')
            );

            if (isDuplicate) {
              duplicateCount++;
            } else {
              newRecordsPayload.push({
                organization_id: user.organizationId,
                slaughter_date: parsedDate,
                supplier: parsedSupplier,
                head_count: parsedHeadCount,
                animal_type: parsedAnimalType,
                carcass_weight: parsedCarcassWeight,
                price_per_kg: parsedPricePerKg,
                total_amount: parsedCarcassWeight * parsedPricePerKg,
                pesinat: parsedPesinat,
                kalan_tutar: (parsedCarcassWeight * parsedPricePerKg) - parsedPesinat,
                notes: parsedNotes || null,
                payment_date: parsedPayment || null
              });
            }
          }

          if (newRecordsPayload.length === 0) {
            notify(`Yüklenecek yeni kayıt bulunamadı. (${duplicateCount} mükerrer kayıt atlandı)`, 'info');
            return;
          }

          const { error: insertError } = await supabase
            .from('kesim_listesi')
            .insert(newRecordsPayload);

          if (insertError) throw insertError;

          notify(`${newRecordsPayload.length} yeni kesim kaydı başarıyla yüklendi. (${duplicateCount} mükerrer kayıt atlandı)`, 'success');
          void fetchRecords();
        } catch (err: any) {
          notify('Dosya işlenirken hata oluştu: ' + err.message, 'error');
        }
      };

      reader.readAsBinaryString(file);
    } catch (err: any) {
      notify('Dosya okunamadı: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
      e.target.value = '';
    }
  };

  // Calculations for stats
  const stats = useMemo(() => {
    const totalCount = filteredItems.reduce((sum, item) => sum + item.head_count, 0);
    const totalCarcassWeight = filteredItems.reduce((sum, item) => sum + item.carcass_weight, 0);
    const totalAmount = filteredItems.reduce((sum, item) => sum + item.total_amount, 0);
    const totalRemaining = filteredItems.reduce((sum, item) => sum + item.kalan_tutar, 0);

    return {
      totalCount,
      totalCarcassWeight,
      totalAmount,
      totalRemaining
    };
  }, [filteredItems]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kesim Listesi"
        description="Hayvan kesim, karkas ağırlığı ve ödemeleri takip edin."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncVegaPrices}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 hover:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              disabled={actionLoading}
              title="Sıfır fiyatlı kesim kayıtlarını Vega hareketlerindeki fatura fiyatlarıyla eşleştirip günceller."
            >
              <RefreshCw size={16} className={actionLoading ? 'animate-spin' : ''} />
              Vega Fiyatlarını Eşitle
            </button>
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
              disabled={actionLoading}
            >
              <Upload size={16} />
              Excel Yükle
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <FileSpreadsheet size={16} />
              Excel'e Aktar
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <Plus size={16} />
              Yeni Kesim Ekle
            </button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Toplam Adet */}
        <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider">Toplam Adet</span>
            <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
              <Beef size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900">{stats.totalCount}</span>
            <span className="text-sm font-semibold text-gray-500">baş</span>
          </div>
        </div>

        {/* Toplam KG */}
        <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider">Toplam KG</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Scale size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900">{formatNumber(stats.totalCarcassWeight)}</span>
            <span className="text-sm font-semibold text-gray-500">kg</span>
          </div>
        </div>

        {/* Toplam Tutar */}
        <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider">Toplam Tutar</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Coins size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xl font-extrabold tracking-tight text-gray-900 block truncate">{formatCurrency(stats.totalAmount)}</span>
          </div>
        </div>

        {/* Kalan Tutar */}
        <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider">Kalan Tutar</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xl font-extrabold tracking-tight text-gray-900 block truncate">{formatCurrency(stats.totalRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Main Filter Section */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari / Tedarikçi veya Açıklama ile ara..."
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Animal Type */}
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
              value={animalTypeFilter}
              onChange={(e) => setAnimalTypeFilter(e.target.value)}
            >
              <option value="all">Tüm Cinsler</option>
              {animalTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Yıl Seçici */}
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
              value={selectedYear}
              onChange={(e) => handleYearSelect(e.target.value)}
            >
              <option value="2027">2027 Yılı</option>
              <option value="2026">2026 Yılı</option>
              <option value="2025">2025 Yılı</option>
              <option value="2024">2024 Yılı</option>
              <option value="2023">2023 Yılı</option>
              <option value="2022">2022 Yılı</option>
            </select>

            {/* Ay Seçici */}
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
              value={selectedMonth}
              onChange={(e) => handleMonthSelect(e.target.value)}
            >
              <option value="custom">Özel Tarih Aralığı</option>
              <option value="year">Bu Yıl ({selectedYear})</option>
              <option value="all">Tüm Zamanlar</option>
              <option value="01">Ocak Ayı</option>
              <option value="02">Şubat Ayı</option>
              <option value="03">Mart Ayı</option>
              <option value="04">Nisan Ayı</option>
              <option value="05">Mayıs Ayı</option>
              <option value="06">Haziran Ayı</option>
              <option value="07">Temmuz Ayı</option>
              <option value="08">Ağustos Ayı</option>
              <option value="09">Eylül Ayı</option>
              <option value="10">Ekim Ayı</option>
              <option value="11">Kasım Ayı</option>
              <option value="12">Aralık Ayı</option>
            </select>

            {/* Date range picker */}
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5">
              <Calendar size={15} className="text-gray-400" />
              <input
                type="date"
                className="border-0 bg-transparent p-0 text-sm font-medium text-gray-700 focus:outline-none focus:ring-0 max-w-[120px]"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedMonth('custom');
                }}
              />
              <span className="text-xs text-gray-400">—</span>
              <input
                type="date"
                className="border-0 bg-transparent p-0 text-sm font-medium text-gray-700 focus:outline-none focus:ring-0 max-w-[120px]"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedMonth('custom');
                }}
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setSelectedMonth('all');
                  }}
                  className="rounded-full p-0.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>

            <button
              onClick={fetchRecords}
              className="rounded-lg p-2 text-gray-400 border border-gray-300 hover:text-gray-700 hover:bg-gray-50 focus:outline-none"
              title="Yenile"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-gray-150 bg-white shadow-sm overflow-visible">
        <div className="min-h-[400px] overflow-visible">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="text-[11.5px] uppercase tracking-wider text-gray-500">
              <tr className="bg-gray-50 sticky top-16 z-20 shadow-[0_1px_0_0_rgba(229,231,235,0.1)]">
                <th className="px-3 py-3 font-semibold text-center w-[110px]">Tarih</th>
                <th className="px-3 py-3 font-semibold text-left min-w-[180px]">El (Cari/Tedarikçi)</th>
                <th className="px-3 py-3 font-semibold text-center w-[80px]">Ad. (Adet)</th>
                <th className="px-3 py-3 font-semibold text-center w-[100px]">Cinsi</th>
                <th className="px-3 py-3 font-semibold text-right pr-8 w-[110px]">Kg (Karkas Kilo)</th>
                <th className="px-3 py-3 font-semibold text-right pr-8 w-[110px]">Fiyat</th>
                <th className="px-3 py-3 font-semibold text-right pr-8 w-[130px]">Toplam</th>
                <th className="px-3 py-3 font-semibold text-right pr-8 w-[110px]">Peşinat</th>
                <th className="px-3 py-3 font-semibold text-left">Açıklama</th>
                <th className="px-3 py-3 font-semibold text-center w-[125px]">Açık Mal Parası</th>
                <th className="px-3 py-3 font-semibold text-right pr-8 w-[130px]">Kalan Tutar</th>
                <th className="px-3 py-3 font-semibold text-center w-[120px]">Ödeme Tarihi</th>
                <th className="px-3 py-3 font-semibold text-center w-[80px]">İşlemler</th>
              </tr>
              {/* Column Level Filter Row */}
              <tr className="bg-gray-50/95 border-b border-gray-150 sticky top-[105px] z-20 backdrop-blur-sm shadow-[0_1px_0_0_rgba(229,231,235,1)]">
                <th className="p-1.5 text-center">
                  <input
                    type="text"
                    className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                    placeholder="Ara..."
                    value={columnFilters.slaughter_date}
                    onChange={(e) => setColumnFilters({ ...columnFilters, slaughter_date: e.target.value })}
                  />
                </th>
                <th className="p-1.5 text-left">
                  <input
                    type="text"
                    className="w-full text-[11px] px-1.5 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-left font-normal"
                    placeholder="Ara..."
                    value={columnFilters.supplier}
                    onChange={(e) => setColumnFilters({ ...columnFilters, supplier: e.target.value })}
                  />
                </th>
                <th className="p-1.5"></th>
                <th className="p-1.5"></th>
                <th className="p-1.5"></th>
                <th className="p-1.5"></th>
                <th className="p-1.5"></th>
                <th className="p-1.5"></th>
                <th className="p-1.5 text-left">
                  <input
                    type="text"
                    className="w-full text-[11px] px-1.5 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-left font-normal"
                    placeholder="Ara..."
                    value={columnFilters.notes}
                    onChange={(e) => setColumnFilters({ ...columnFilters, notes: e.target.value })}
                  />
                </th>
                <th className="p-1.5"></th>
                <th className="p-1.5"></th>
                <th className="p-1.5 text-center">
                  <input
                    type="text"
                    className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                    placeholder="Ara..."
                    value={columnFilters.payment_date}
                    onChange={(e) => setColumnFilters({ ...columnFilters, payment_date: e.target.value })}
                  />
                </th>
                <th className="p-1.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-500" />
                    Veriler yükleniyor...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-gray-400">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors text-[13px]">
                    <td className="px-3 py-1.5 text-center font-medium text-gray-700">
                      <InlineEdit
                        value={item.slaughter_date}
                        displayValue={formatDate(item.slaughter_date)}
                        onSave={(val) => void handleSaveField(item.id, 'slaughter_date', val)}
                        type="date"
                        align="center"
                        className="justify-center"
                        inputClassName="!text-center"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-left font-semibold text-gray-900">
                      <InlineEdit
                        value={item.supplier}
                        displayValue={item.supplier}
                        onSave={(val) => void handleSaveField(item.id, 'supplier', val)}
                        className="font-semibold text-gray-900"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center font-bold text-gray-800">
                      <InlineEdit
                        value={String(item.head_count || 1)}
                        displayValue={item.head_count}
                        onSave={(val) => void handleSaveField(item.id, 'head_count', parseInt(val, 10) || 1)}
                        isNumeric={true}
                        align="center"
                        className="justify-center font-bold text-gray-800"
                        inputClassName="!text-center font-bold"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <InlineSelect
                        value={item.animal_type}
                        options={Object.fromEntries(animalTypes.map(t => [t, t]))}
                        onSave={(val) => void handleSaveField(item.id, 'animal_type', val)}
                        className="justify-center"
                        badgeClass="bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 border border-gray-200"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right pr-8 font-bold text-gray-800">
                      <InlineEdit
                        value={String(item.carcass_weight)}
                        displayValue={formatNumber(item.carcass_weight, 'kg')}
                        onSave={(val) => void handleSaveField(item.id, 'carcass_weight', parseFloat(val) || 0)}
                        isNumeric={true}
                        align="right"
                        className="justify-end font-bold text-gray-800"
                        inputClassName="!text-right font-bold"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right pr-8 font-medium text-gray-700">
                      <InlineEdit
                        value={String(item.price_per_kg)}
                        displayValue={formatCurrency(item.price_per_kg)}
                        onSave={(val) => void handleSaveField(item.id, 'price_per_kg', parseFloat(val) || 0)}
                        isNumeric={true}
                        align="right"
                        className="justify-end font-medium text-gray-700"
                        inputClassName="!text-right font-medium"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right pr-8 font-bold text-gray-950 text-[14px]">
                      <InlineEdit
                        value={String(item.total_amount || 0)}
                        displayValue={formatCurrency(item.total_amount)}
                        onSave={(val) => void handleSaveField(item.id, 'total_amount', parseFloat(val) || 0)}
                        isNumeric={true}
                        align="right"
                        className="justify-end font-bold text-gray-950 text-[14px]"
                        inputClassName="!text-right font-bold text-gray-950 text-[14px]"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right pr-8 font-semibold text-amber-700">
                      <InlineEdit
                        value={String(item.pesinat || 0)}
                        displayValue={item.pesinat > 0 ? formatCurrency(item.pesinat) : '—'}
                        onSave={(val) => void handleSaveField(item.id, 'pesinat', parseFloat(val) || 0)}
                        isNumeric={true}
                        align="right"
                        className="justify-end font-semibold text-amber-700"
                        inputClassName="!text-right font-semibold text-amber-700"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-left text-gray-500 max-w-[200px]" title={item.notes || ''}>
                      <InlineEdit
                        value={item.notes || ''}
                        displayValue={item.notes || '—'}
                        onSave={(val) => void handleSaveField(item.id, 'notes', val || null)}
                        className="text-gray-500 max-w-[200px]"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex flex-col gap-1 items-center justify-center min-w-[110px]">
                        {/* Açık Liste button */}
                        {item.is_acik_mal ? (
                          <button
                            type="button"
                            onClick={() => void handleToggleAcikMal(item, 'NORMAL')}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600 hover:bg-rose-50 hover:text-rose-600 group/btn transition-colors w-full"
                            title="Açık Mal Ödemelerinden Kaldır"
                          >
                            <span className="group-hover/btn:hidden inline-flex items-center gap-1">
                              <CheckCircle size={14} />
                              Açık Mal Parası
                            </span>
                            <span className="hidden group-hover/btn:inline-flex items-center gap-1">
                              <XCircle size={14} />
                              Kaldır
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleToggleAcikMal(item, 'ACIK_LISTE')}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-600 hover:bg-brand-100 transition-colors w-full"
                            title="Açık Mal Ödemeleri Manuel Listesine Ekle"
                          >
                            <PlusCircle size={14} />
                            Açık Mal Parası
                          </button>
                        )}

                        {/* Cari button */}
                        <button
                          type="button"
                          onClick={() => void handleToggleCari(item)}
                          disabled={actionLoading}
                          className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-bold transition-all w-full ${
                            item.payment_date !== 'CARİ'
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          }`}
                          title={item.payment_date === 'CARİ' ? "Cari işaretini kaldır" : "Ödeme durumunu CARİ yap"}
                        >
                          <Coins size={14} className={item.payment_date !== 'CARİ' ? 'text-rose-600' : 'text-slate-400'} />
                          Cari
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right pr-8 font-bold text-red-600 text-[14px]">
                      <InlineEdit
                        value={String(item.kalan_tutar || 0)}
                        displayValue={formatCurrency(item.kalan_tutar)}
                        onSave={(val) => void handleSaveField(item.id, 'kalan_tutar', parseFloat(val) || 0)}
                        isNumeric={true}
                        align="right"
                        className="justify-end font-bold text-red-600 text-[14px]"
                        inputClassName="!text-right font-bold text-red-600 text-[14px]"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center font-semibold text-gray-700">
                      <InlinePaymentDate
                        value={item.payment_date || 'CARİ'}
                        onSave={(val) => void handleSaveField(item.id, 'payment_date', val || null)}
                        disabled={actionLoading}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600 focus:outline-none"
                          title="Tümünü Düzenle"
                          disabled={actionLoading}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 focus:outline-none"
                          title="Sil"
                          disabled={actionLoading}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-gray-900">
                <tr>
                  <td colSpan={2} className="px-3 py-3 text-right text-gray-500 uppercase tracking-wider text-[11px] font-bold">Toplamlar:</td>
                  <td className="px-3 py-3 text-center text-gray-900">{stats.totalCount} baş</td>
                  <td className="px-3 py-3 text-right"></td>
                  <td className="px-3 py-3 text-right text-gray-800">{formatNumber(stats.totalCarcassWeight, 'kg')}</td>
                  <td className="px-3 py-3 text-right"></td>
                  <td className="px-3 py-3 text-right text-gray-950">{formatCurrency(stats.totalAmount)}</td>
                  <td className="px-3 py-3 text-right text-amber-700">
                    {filteredItems.reduce((sum, item) => sum + item.pesinat, 0) > 0 
                      ? formatCurrency(filteredItems.reduce((sum, item) => sum + item.pesinat, 0)) 
                      : '—'}
                  </td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right text-brand-700 text-[13px]">{formatCurrency(stats.totalRemaining)}</td>
                  <td colSpan={2} className="px-3 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecord ? 'Kesim Kaydını Düzenle' : 'Yeni Kesim Kaydı Ekle'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Kesim Tarihi */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Kesim Tarihi (TARİH)</label>
              <input
                type="date"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={formState.slaughter_date}
                onChange={(e) => setFormState({ ...formState, slaughter_date: e.target.value })}
              />
            </div>

            {/* Hayvan Cinsi */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hayvan Cinsi (CİNSİ)</label>
              <select
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={formState.animal_type}
                onChange={(e) => setFormState({ ...formState, animal_type: e.target.value })}
              >
                {animalTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Cari / Tedarikçi */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cari / Tedarikçi Adı (EL)</label>
              <input
                type="text"
                required
                placeholder="Örn: ABDULLAH ÖZTÜRK"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={formState.supplier}
                onChange={(e) => setFormState({ ...formState, supplier: e.target.value })}
              />
            </div>

            {/* Adet */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Adet (AD.)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="Örn: 2"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={formState.head_count}
                onChange={(e) => setFormState({ ...formState, head_count: e.target.value })}
              />
            </div>

            {/* Toplam Karkas Kilo */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Toplam Karkas Kilo (KG)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Örn: 584"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={formState.carcass_weight}
                onChange={(e) => setFormState({ ...formState, carcass_weight: e.target.value })}
              />
            </div>

            {/* Kg Fiyatı */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Kg Fiyatı (FİYAT)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Örn: 525"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={formState.price_per_kg}
                onChange={(e) => setFormState({ ...formState, price_per_kg: e.target.value })}
              />
            </div>

            {/* Peşinat / Kesinti */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Peşinat / Kesinti (PEŞİNAT)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Örn: 1897"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={formState.pesinat}
                onChange={(e) => setFormState({ ...formState, pesinat: e.target.value })}
              />
            </div>

            {/* Ödeme Tarihi / Durumu */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ödeme Tarihi / Durumu</label>
              <input
                type="text"
                placeholder="Örn: CARİ veya Tarih girin"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={formState.payment_date}
                onChange={(e) => setFormState({ ...formState, payment_date: e.target.value })}
              />
            </div>

            {/* Dynamic calculations display */}
            {formState.carcass_weight && formState.price_per_kg && (
              <div className="sm:col-span-2 rounded-lg bg-gray-50 border border-gray-150 p-3 text-xs font-semibold text-gray-600 space-y-1">
                <div>
                  Toplam Tutar (Hesaplanan): <span className="text-gray-950 font-bold">{formatCurrency(parseFloat(formState.carcass_weight) * parseFloat(formState.price_per_kg))}</span>
                </div>
                <div>
                  Kalan Tutar (Hesaplanan): <span className="text-brand-700 font-extrabold">{formatCurrency( (parseFloat(formState.carcass_weight) * parseFloat(formState.price_per_kg)) - (parseFloat(formState.pesinat) || 0) )}</span>
                </div>
              </div>
            )}

            {/* Açıklama */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Açıklama (AÇIKLAMA)</label>
              <textarea
                placeholder="Kesinti açıklaması veya diğer detaylar..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={formState.notes}
                onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              disabled={actionLoading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              disabled={actionLoading}
            >
              {actionLoading ? 'Kaydediliyor...' : editingRecord ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
