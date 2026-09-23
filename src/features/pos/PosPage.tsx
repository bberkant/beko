import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { 
  HandCoins, 
  Calendar, 
  RefreshCw, 
  FileSpreadsheet, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Printer,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import * as XLSX from 'xlsx';
import { CashboxDateFilterBar, SearchResultItem, getYesterdayStr } from '../main-cashbox/components/CashboxDateFilterBar';

interface LeftRow {
  bank: string;
  colB: string;
  banka_gecen: string;
  kesinti: string;
  komisyon: string;
}

interface RightRow {
  name: string;
  amount: string;
}

const DEFAULT_LEFT_ROWS: LeftRow[] = [
  { bank: 'ZİRAAT', colB: '', banka_gecen: '186.279,65', kesinti: '', komisyon: '' },
  { bank: 'GARANTİ', colB: '', banka_gecen: '58.713,11', kesinti: '', komisyon: '' },
  { bank: 'DENİZBANK', colB: '', banka_gecen: '43.125,38', kesinti: '', komisyon: '' },
  { bank: 'KUVEYT', colB: '', banka_gecen: '16.866,57', kesinti: '', komisyon: '' },
  { bank: 'ALBARAKA', colB: '', banka_gecen: '18.565,45', kesinti: '', komisyon: '' },
  { bank: 'Ö. ZİRAAT', colB: '389.173,00', banka_gecen: '1.180,61', kesinti: '', komisyon: '' },
  { bank: 'AKBANK', colB: '', banka_gecen: '505,00', kesinti: '', komisyon: '' },
];

const DEFAULT_RIGHT_ROWS: RightRow[] = [
  { name: 'MERKEZ', amount: '0,00' },
  { name: 'ÇIKIŞ', amount: '50.770,00' },
  { name: 'Ö.ZİRAAT', amount: '389.173,00' },
  { name: 'MERZİFON', amount: '29.850,00' },
  { name: 'GARANTİ', amount: '19.115,00' },
  { name: 'ZİRAAT', amount: '49.336,00' },
  { name: 'AKBANK', amount: '850,00' },
  { name: 'ATAKUM', amount: '0,00' },
  { name: 'KUVEYT', amount: '1.635,00' },
  { name: 'HALK', amount: '0,00' },
  { name: 'GARANTİ', amount: '0,00' },
  { name: 'ALBARAKA', amount: '2.875,00' },
  { name: 'ZİRAAT', amount: '105.639,00' },
  { name: 'İLKADIM', amount: '67.000,00' },
  { name: 'ZİRAAT', amount: '171.432,00' },
  { name: 'DENİZ', amount: '29.952,00' },
  { name: 'KUVEYT', amount: '0,00' },
  { name: 'DEPO', amount: '0,00' },
  { name: 'KUVEYT', amount: '0,00' },
  { name: 'DENİZ', amount: '0,00' },
];

// Clean templates with empty string values for new days
const TEMPLATE_LEFT_ROWS: LeftRow[] = DEFAULT_LEFT_ROWS.map(row => ({
  ...row,
  colB: '',
  banka_gecen: '',
  kesinti: '',
  komisyon: ''
}));

const TEMPLATE_RIGHT_ROWS: RightRow[] = DEFAULT_RIGHT_ROWS.map(row => ({
  ...row,
  amount: ''
}));

// Helper to format date as DD.MM.YYYY
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
};

// Parse Turkish format numbers (e.g. 186.279,65) to Float
const parseFormattedNumber = (val: string | number | null): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const clean = val.replace(/\./g, '').replace(/,/g, '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

// Helper to format numbers in TR format (e.g. 186.279,65)
const formatTRNum = (val: number | null) => {
  if (val === null || val === undefined || isNaN(val)) return '0,00';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

// Match Left Table bank/POS names to Right Table şube/amount names (including Denizbank vs Deniz mapping)
const matchPOSName = (leftBank: string, rightName: string): boolean => {
  const normLeft = leftBank.replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
  const normRight = rightName.replace(/\s+/g, '').toLocaleUpperCase('tr-TR');

  if (normLeft === '' || normRight === '') return false;

  // Specific mapping for Denizbank vs Deniz
  if (normLeft === 'DENİZBANK' && normRight === 'DENİZ') return true;
  if (normLeft === 'DENİZ' && normRight === 'DENİZBANK') return true;

  // Explicit check to prevent Ö.Ziraat matching Ziraat
  if (normLeft === 'ZİRAAT' && normRight === 'Ö.ZİRAAT') return false;
  if (normLeft === 'Ö.ZİRAAT' && normRight === 'ZİRAAT') return false;

  return normLeft === normRight;
};



export function PosPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // State variables (Varsayılan olarak her zaman dünün tarihi açılır)
  const [selectedDate, setSelectedDate] = useState<string>(() => getYesterdayStr());

  // Eski localStorage önbelleğini temizle (sabit geçmiş tarihe takılmayı önlemek için)
  useEffect(() => {
    localStorage.removeItem('pos_selected_date');
  }, []);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [leftRows, setLeftRows] = useState<LeftRow[]>([]);
  const [rightRows, setRightRows] = useState<RightRow[]>([]);

  // Search & Range States for CashboxDateFilterBar
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRange, setIsRange] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(() => getYesterdayStr());
  const [endDate, setEndDate] = useState<string>(() => getYesterdayStr());
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Live Multi-Date Search across POS Reports
  useEffect(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        let qb = supabase
          .from('pos_reports')
          .select('date, left_table, right_table')
          .order('date', { ascending: false });

        if (isRange && startDate && endDate) {
          qb = qb.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await qb;
        if (isCancelled || error || !data) {
          if (!isCancelled) setIsSearching(false);
          return;
        }

        const res: SearchResultItem[] = [];
        for (const row of data) {
          const rDate = row.date;
          for (const l of row.left_table || []) {
            const bName = String(l.bank || '').trim();
            if (bName.toLocaleLowerCase('tr-TR').includes(q)) {
              res.push({
                date: rDate,
                category: 'POS BANKA',
                description: bName,
                bankOrType: l.komisyon ? `%${l.komisyon}` : 'Banka Hesaba Geçen',
                amount: l.banka_gecen || l.colB || ''
              });
            }
          }
          for (const r of row.right_table || []) {
            const sName = String(r.name || '').trim();
            if (sName.toLocaleLowerCase('tr-TR').includes(q)) {
              res.push({
                date: rDate,
                category: 'ŞUBE CİRO',
                description: sName,
                bankOrType: 'Şube POS',
                amount: r.amount || ''
              });
            }
          }
        }

        if (!isCancelled) {
          setSearchResults(res);
          setIsSearching(false);
        }
      } catch {
        if (!isCancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isRange, startDate, endDate]);
  
  // Undo/redo history stack for Excel-like control
  const [, setHistory] = useState<{ left: LeftRow[], right: RightRow[] }[]>([]);
  const [stateBeforeEdit, setStateBeforeEdit] = useState<{ left: LeftRow[], right: RightRow[] } | null>(null);

  // Snapshot current state to temp before editing
  const handleFocus = () => {
    setStateBeforeEdit({
      left: JSON.parse(JSON.stringify(leftRows)),
      right: JSON.parse(JSON.stringify(rightRows))
    });
  };

  const pushToHistory = () => {
    if (stateBeforeEdit) {
      setHistory(prev => [...prev.slice(-49), stateBeforeEdit]);
      setStateBeforeEdit(null);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    handleFocus();
  };
  
  // Pad arrays to 22 rows each to match the Excel sheet layout
   // Pad arrays to match the Excel sheet layout and keep all templates visible
  const padLeftRows = (rows: LeftRow[]): LeftRow[] => {
    const active = rows.filter(r => r.bank.trim() !== '');
    const valueMap = new Map<string, LeftRow>();
    active.forEach(r => {
      valueMap.set(r.bank.trim().toUpperCase(), r);
    });

    return TEMPLATE_LEFT_ROWS.map(templateRow => {
      const bankKey = templateRow.bank.trim().toUpperCase();
      if (valueMap.has(bankKey)) {
        const match = valueMap.get(bankKey)!;
        return {
          ...templateRow,
          colB: match.colB || '',
          banka_gecen: match.banka_gecen || '',
          kesinti: match.kesinti || '',
          komisyon: match.komisyon || ''
        };
      }
      return templateRow;
    });
  };

  const isRedBranchName = (name: string) => {
    const redNames = ['MERKEZ', 'MERZİFON', 'ATAKUM', 'İLKADIM', 'DEPO', 'MERZIFON', 'ILKADIM'];
    return redNames.includes(name.trim().toUpperCase());
  };

  const padRightRows = (rows: RightRow[]): RightRow[] => {
    const dbRowsByName: { [key: string]: string[] } = {};
    rows.forEach(r => {
      const nameKey = r.name.trim().toUpperCase();
      if (!dbRowsByName[nameKey]) {
        dbRowsByName[nameKey] = [];
      }
      dbRowsByName[nameKey].push(r.amount);
    });

    const usedCounts: { [key: string]: number } = {};
    const result = TEMPLATE_RIGHT_ROWS.map(templateRow => {
      const nameKey = templateRow.name.trim().toUpperCase();
      if (usedCounts[nameKey] === undefined) {
        usedCounts[nameKey] = 0;
      }
      const idx = usedCounts[nameKey];
      const list = dbRowsByName[nameKey] || [];
      const amount = list[idx] !== undefined ? list[idx] : '';
      usedCounts[nameKey]++;
      return {
        ...templateRow,
        amount
      };
    });

    const extraRows: RightRow[] = [];
    Object.keys(dbRowsByName).forEach(nameKey => {
      const list = dbRowsByName[nameKey];
      const used = usedCounts[nameKey] || 0;
      if (list.length > used) {
        for (let i = used; i < list.length; i++) {
          const originalRow = rows.find(r => r.name.trim().toUpperCase() === nameKey);
          extraRows.push({
            name: originalRow ? originalRow.name : nameKey,
            amount: list[i]
          });
        }
      }
    });

    const combined = [...result, ...extraRows];

    // Filter out rows below DEPO if they are 0 or empty
    const depoIdx = combined.findIndex(r => r.name.trim().toUpperCase() === 'DEPO');
    if (depoIdx !== -1) {
      return combined.filter((row, idx) => {
        if (idx > depoIdx) {
          const val = parseFormattedNumber(row.amount);
          return val !== 0;
        }
        return true;
      });
    }

    return combined;
  };





  // Fetch report data from Supabase
  const loadReport = useCallback(async () => {
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pos_reports')
        .select('*')
        .eq('organization_id', orgId)
        .eq('date', selectedDate)
        .single();


      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Safe mapping support for backward schema compatibility
        const mappedLeft = (data.left_table || []).map((row: any) => ({
          bank: row.bank || '',
          colB: row.colB || (row.calculated_val !== undefined ? String(row.calculated_val) : ''),
          banka_gecen: row.banka_gecen !== undefined ? String(row.banka_gecen) : '',
          kesinti: row.kesinti || row.colC || '',
          komisyon: row.komisyon || row.colD || ''
        }));
        
        let mappedRight = (data.right_table || []).map((row: any) => ({
          name: row.name || '',
          amount: row.amount !== undefined ? String(row.amount) : ''
        }));

        // Schema upgrade: Find all indices of 'DENİZ' (or 'DENIZ') in mappedRight
        const denizIndices: number[] = [];
        mappedRight.forEach((row: any, idx: number) => {
          if (row.name.trim().toUpperCase().replace(/İ/g, 'I') === 'DENIZ') {
            denizIndices.push(idx);
          }
        });

        // 1. Clean up any GARANTİ row incorrectly added under the FIRST DENİZ row
        if (denizIndices.length >= 1) {
          const firstDenizIdx = denizIndices[0];
          const nextRow = mappedRight[firstDenizIdx + 1];
          const nextName = nextRow ? nextRow.name.trim().toUpperCase().replace(/İ/g, 'I') : '';
          if (nextName === 'GARANTI') {
            mappedRight.splice(firstDenizIdx + 1, 1);
            // Re-index DENİZ positions after removal
            denizIndices.length = 0;
            mappedRight.forEach((row: any, idx: number) => {
              if (row.name.trim().toUpperCase().replace(/İ/g, 'I') === 'DENIZ') {
                denizIndices.push(idx);
              }
            });
          }
        }

        // 2. Clean up any GARANTİ row under DEPO if its amount is empty or 0,00
        const depoIdx = mappedRight.findIndex((row: any) => row.name.trim().toUpperCase() === 'DEPO');
        if (depoIdx !== -1) {
          mappedRight = mappedRight.filter((row: any, idx: number) => {
            if (idx > depoIdx && row.name.trim().toUpperCase().replace(/İ/g, 'I') === 'GARANTI') {
              const val = parseFormattedNumber(row.amount);
              return val !== 0;
            }
            return true;
          });
        }

        setLeftRows(padLeftRows(mappedLeft));
        setRightRows(padRightRows(mappedRight));
      } else {
        // If no report exists, initialize with clean templates (0 values)
        setLeftRows(padLeftRows(TEMPLATE_LEFT_ROWS));
        setRightRows(padRightRows(TEMPLATE_RIGHT_ROWS));
      }
    } catch (error: any) {
      console.error('POS verileri yüklenirken hata oluştu:', error);
      notify('POS verileri yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, selectedDate, notify]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  // Listen for Ctrl+Z (undo) key combination
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {

      
      // We check for Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setHistory(prevHistory => {
          if (prevHistory.length === 0) return prevHistory;
          
          const nextHistory = [...prevHistory];
          const previousState = nextHistory.pop(); // Get last state
          
          if (previousState) {
            setLeftRows(previousState.left);
            setRightRows(previousState.right);
            void saveReport(previousState.left, previousState.right);
            notify('İşlem geri alındı');
          }
          
          return nextHistory;
        });
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [leftRows, rightRows]);

  // Automatically calculate left table's colB, kesinti, and komisyon values
  useEffect(() => {
    setLeftRows(prevLeft => {
      let changed = false;
      const nextLeft = prevLeft.map(row => {
        // 1. Calculate colB (sum of rightRows tutar)
        let sumB = 0;
        rightRows.forEach((r) => {
          if (matchPOSName(row.bank, r.name)) {
            sumB += parseFormattedNumber(r.amount);
          }
        });
        const formattedB = sumB > 0 ? formatTRNum(sumB) : '';

        // 2. Calculate kesinti = colB - banka_gecen
        const valB = sumB;
        const valC = parseFormattedNumber(row.banka_gecen);
        
        let valD = 0;
        let formattedD = row.kesinti;
        let formattedE = row.komisyon;

        const hasBankaGecen = row.banka_gecen.trim() !== '';

        if (valB > 0 && hasBankaGecen) {
          valD = valB - valC;
          formattedD = formatTRNum(valD);

          // 3. Calculate komisyon = (kesinti / colB) * 100
          const valE = Math.abs((valD / valB) * 100);
          formattedE = formatTRNum(valE);
        }

        if (row.colB !== formattedB || row.kesinti !== formattedD || row.komisyon !== formattedE) {
          changed = true;
          return {
            ...row,
            colB: formattedB,
            kesinti: formattedD,
            komisyon: formattedE
          };
        }
        return row;
      });
      return changed ? nextLeft : prevLeft;
    });
  }, [rightRows, leftRows]);

  // Save report data to Supabase
  const saveReport = async (updatedLeft: LeftRow[], updatedRight: RightRow[]) => {
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
    setSaving(true);
    try {
      // Clean empty rows before saving
      const cleanLeft = updatedLeft.filter(r => r.bank || r.colB || r.banka_gecen || r.kesinti || r.komisyon);
      const cleanRight = updatedRight.filter(r => r.name || r.amount);

      const { error } = await supabase
        .from('pos_reports')
        .upsert(
          {
            organization_id: orgId,
            date: selectedDate,
            left_table: cleanLeft,
            right_table: cleanRight,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'organization_id,date' }
        );


      if (error) throw error;
    } catch (error: any) {
      console.error('POS verileri kaydedilirken hata oluştu:', error);
      notify('POS verileri kaydedilirken hata oluştu', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Excel style arrow & Enter keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    table: 'left' | 'right',
    col: string,
    rowIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(
        `[data-table="${table}"][data-col="${col}"][data-row="${rowIndex + 1}"]`
      ) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(
        `[data-table="${table}"][data-col="${col}"][data-row="${rowIndex - 1}"]`
      ) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  };

  // Excel style column copy-paste support (clipboard to column values downwards & sideways)
  const handlePasteColumn = (
    e: React.ClipboardEvent<HTMLInputElement>,
    table: 'left' | 'right',
    field: string,
    startRowIndex: number
  ) => {
    e.preventDefault();
    
    // Save current state before pasting
    setHistory(prev => [...prev.slice(-49), {
      left: JSON.parse(JSON.stringify(leftRows)),
      right: JSON.parse(JSON.stringify(rightRows))
    }]);

    const clipboardData = e.clipboardData.getData('text');
    
    // Split by newlines to get rows, then split by tab to get columns
    const rows = clipboardData.split(/\r?\n/).map(line => line.split('\t'));
    
    if (table === 'left') {
      const updated = [...leftRows];
      const fieldsOrder: (keyof LeftRow)[] = ['bank', 'colB', 'banka_gecen', 'komisyon', 'kesinti'];
      const startColIndex = fieldsOrder.indexOf(field as keyof LeftRow);
      
      let rowOffset = 0;
      while (rowOffset < rows.length) {
        const columns = rows[rowOffset];
        // Skip last empty line from Excel copy paste
        if (rowOffset === rows.length - 1 && columns.length === 1 && columns[0].trim() === '') break;
        
        const targetIndex = startRowIndex + rowOffset;
        if (targetIndex >= updated.length) {
          updated.push({ bank: '', colB: '', banka_gecen: '', kesinti: '', komisyon: '' });
        }
        
        let rowData = { ...updated[targetIndex] };
        for (let j = 0; j < columns.length; j++) {
          const colIndex = startColIndex + j;
          if (colIndex < fieldsOrder.length) {
            const targetField = fieldsOrder[colIndex];
            rowData[targetField] = columns[j].trim();
          }
        }
        updated[targetIndex] = rowData;
        rowOffset++;
      }
      setLeftRows(updated);
      void saveReport(updated, rightRows);
    } else {
      const updated = [...rightRows];
      const fieldsOrder: (keyof RightRow)[] = ['name', 'amount'];
      const startColIndex = fieldsOrder.indexOf(field as keyof RightRow);
      
      let rowOffset = 0;
      while (rowOffset < rows.length) {
        const columns = rows[rowOffset];
        // Skip last empty line from Excel copy paste
        if (rowOffset === rows.length - 1 && columns.length === 1 && columns[0].trim() === '') break;
        
        const targetIndex = startRowIndex + rowOffset;
        if (targetIndex >= updated.length) {
          updated.push({ name: '', amount: '' });
        }
        
        let rowData = { ...updated[targetIndex] };
        for (let j = 0; j < columns.length; j++) {
          const colIndex = startColIndex + j;
          if (colIndex < fieldsOrder.length) {
            const targetField = fieldsOrder[colIndex];
            rowData[targetField] = columns[j].trim();
          }
        }
        updated[targetIndex] = rowData;
        rowOffset++;
      }
      setRightRows(updated);
      void saveReport(leftRows, updated);
    }
  };

  // Format cell value to Turkish currency format on blur
  const handleAmountBlur = (
    table: 'left' | 'right',
    index: number,
    field: string,
    value: string
  ) => {
      const trimmed = value.trim();
      if (trimmed === '') return;
      
      const num = parseFormattedNumber(trimmed);
      const formatted = formatTRNum(num);
      
      if (table === 'left') {
        const updated = [...leftRows];
        updated[index] = {
          ...updated[index],
          [field]: formatted
        };
        setLeftRows(updated);
        void saveReport(updated, rightRows);
      } else {
        const updated = [...rightRows];
        updated[index] = {
          ...updated[index],
          [field]: formatted
        };
        setRightRows(updated);
        void saveReport(leftRows, updated);
      }
  };

  // Calculated values sums
  const totals = useMemo(() => {
    let totalColB = 0;
    let totalBankaGecen = 0;
    let totalKesinti = 0;
    
    let colECount = 0;
    let colESum = 0;

    leftRows.forEach(row => {
      totalColB += parseFormattedNumber(row.colB);
      totalBankaGecen += parseFormattedNumber(row.banka_gecen);
      totalKesinti += parseFormattedNumber(row.kesinti);
      
      const eVal = parseFormattedNumber(row.komisyon);
      if (row.komisyon) {
        colESum += eVal;
        colECount++;
      }
    });

    const avgKomisyon = colECount > 0 ? colESum / colECount : 0;

    let totalPosTutar = 0;
    rightRows.forEach(row => {
      totalPosTutar += parseFormattedNumber(row.amount);
    });

    const difference = totalBankaGecen - totalPosTutar;

    return {
      totalColB,
      totalBankaGecen,
      totalKesinti,
      avgKomisyon,
      totalPosTutar,
      difference
    };
  }, [leftRows, rightRows]);

  // Handle value change on left table cell edit
  const handleLeftCellChange = (rowIndex: number, field: keyof LeftRow, val: string) => {
    pushToHistory();
    const updated = [...leftRows];
    updated[rowIndex] = {
      ...updated[rowIndex],
      [field]: val
    };
    setLeftRows(updated);
    void saveReport(updated, rightRows);
  };

  // Handle value change on right table cell edit
  const handleRightCellChange = (rowIndex: number, field: keyof RightRow, val: string) => {
    pushToHistory();
    const updated = [...rightRows];
    updated[rowIndex] = {
      ...updated[rowIndex],
      [field]: val
    };
    setRightRows(updated);
    void saveReport(leftRows, updated);
  };


  // Export spreadsheet as Excel Workbook
  const handleExportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const excelLeft = leftRows.filter(r => r.bank).map(row => ({
      'POS': row.bank,
      'KOLON B': parseFormattedNumber(row.colB),
      'HESABA GEÇEN': parseFormattedNumber(row.banka_gecen),
      'KOMİSYON': parseFormattedNumber(row.komisyon),
      'KESİNTİ': parseFormattedNumber(row.kesinti)
    }));

    const excelRight = rightRows.filter(r => r.name).map(row => ({
      'ŞUBE': row.name,
      'TUTAR': parseFormattedNumber(row.amount)
    }));

    excelLeft.push({
      'POS': 'TOPLAM',
      'KOLON B': totals.totalColB,
      'HESABA GEÇEN': totals.totalBankaGecen,
      'KOMİSYON': totals.avgKomisyon,
      'KESİNTİ': totals.totalKesinti
    });

    excelRight.push({
      'ŞUBE': 'TOPLAM',
      'TUTAR': totals.totalPosTutar
    });

    const leftSheet = XLSX.utils.json_to_sheet(excelLeft);
    const rightSheet = XLSX.utils.json_to_sheet(excelRight);

    XLSX.utils.book_append_sheet(workbook, leftSheet, 'POS Özet');
    XLSX.utils.book_append_sheet(workbook, rightSheet, 'Şubeler');

    XLSX.writeFile(workbook, `POS_Raporu_${formatDate(selectedDate)}.xlsx`);
    notify('Excel dosyası başarıyla indirildi.');
  };



  return (
    <div className="space-y-6 pb-12 main-layout-container">
      {/* Dynamic CSS styles for Landscape A4 printing and table input text enlargement */}
      <style>{`
        .main-layout-container table,
        .main-layout-container th,
        .main-layout-container td,
        .main-layout-container input,
        .main-layout-container span {
          font-family: 'Calibri', 'Arial', sans-serif !important;
          font-size: 13pt !important;
          font-weight: bold !important;
          user-drag: none !important;
          -webkit-user-drag: none !important;
        }
        
        .main-layout-container th {
          color: #dc2626 !important;
        }
        
        .main-layout-container tfoot td,
        .main-layout-container tfoot td input {
          color: #dc2626 !important;
        }

        .pos-header-red,
        .red-branch-input {
          color: #dc2626 !important;
        }
        
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
          }
          body {
            background: white !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide non-print layouts completely */
          .print\\:hidden,
          aside,
          header,
          nav,
          .topbar,
          .sidebar,
          button,
          .action-buttons,
          .sync-status,
          .kpi-cards,
          .quick-instructions {
            display: none !important;
          }
          /* Unpad layout for full page usage */
          .main-layout-container {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .excel-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          .split-print-layout {
            display: flex !important;
            flex-direction: row !important;
            gap: 16px !important;
            width: 100% !important;
          }
          .left-print-table {
            flex: 1 1 0% !important;
            overflow: visible !important;
          }
          .right-print-table {
            width: 320px !important;
            flex-shrink: 0 !important;
            overflow: visible !important;
          }
          table, th, td, input, span {
            font-family: Calibri, Arial, sans-serif !important;
            font-size: 11pt !important;
            font-weight: bold !important;
          }
          tr {
            height: 26px !important;
          }
          td, th {
            padding: 2px !important;
          }
          input {
            padding-top: 1px !important;
            padding-bottom: 1px !important;
            padding-left: 2px !important;
            padding-right: 2px !important;
            height: 22px !important;
          }
          tfoot td, tfoot td input {
            color: #dc2626 !important;
          }
          .pos-header-red,
          .red-branch-input {
            color: #dc2626 !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <HandCoins className="text-brand-600" size={26} />
            Günlük POS Takip
          </h1>
          <p className="text-sm text-gray-500">
            Günlük POS ciro dökümü ve banka netleşme takibi
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors shadow-sm"
            title="Yazdır (A4 Yatay)"
          >
            <Printer size={15} />
            <span>Yazdır</span>
          </button>


          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors shadow-sm"
            title="Excel Dışa Aktar"
          >
            <FileSpreadsheet size={15} />
            <span>Excel</span>
          </button>

          <button
            onClick={() => void loadReport()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
            title="Yenile"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Yenile</span>
          </button>


        </div>
      </div>

      {/* Universal Top Filter Bar matching GirisCikisPage */}
      <CashboxDateFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isRange={isRange}
        setIsRange={setIsRange}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        searchResults={searchResults}
        isSearching={isSearching}
        onSelectResult={(d) => {
          setSelectedDate(d);
          setIsRange(false);
        }}
        extraActions={
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
            <span className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></span>
            {saving ? 'Kaydediliyor...' : 'Bulutla Eşitlendi'}
          </span>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 print:hidden">
        <div className="card bg-white p-5 flex items-center justify-between border-l-4 border-emerald-500">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">TOPLAM CİRO (Şubeler)</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{formatTRNum(totals.totalColB)} <span className="text-sm font-bold text-gray-500">TRY</span></h3>
          </div>
          <TrendingUp className="text-emerald-500" size={32} />
        </div>

        <div className="card bg-white p-5 flex items-center justify-between border-l-4 border-brand-500">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">HESABA GEÇEN TOPLAM</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{formatTRNum(totals.totalBankaGecen)} <span className="text-sm font-bold text-gray-500">TRY</span></h3>
          </div>
          <HandCoins className="text-brand-500" size={32} />
        </div>

        <div className="card bg-white p-5 flex items-center justify-between border-l-4 border-red-500">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">TOPLAM KESİNTİ</p>
            <h3 className="text-2xl font-black text-red-600 mt-1">
              {formatTRNum(totals.totalKesinti)} <span className="text-sm font-bold text-gray-500">TRY</span>
            </h3>
          </div>
          <div className="rounded-full p-2 bg-red-50 text-red-500">
            <AlertCircle size={28} />
          </div>
        </div>
      </div>

      {/* Excel Dashboard Grid Container */}
      <div className="bg-white border border-gray-300 rounded-xl shadow-md overflow-x-auto p-6 font-sans excel-container">
        
        {/* Table Title block */}
        <div className="flex flex-wrap items-center gap-4 mb-4 border-b border-gray-200 pb-2">
          <div className="text-[17px] font-bold text-brand-800 uppercase tracking-wider shrink-0">
            GÜNLÜK POS TAKİP
          </div>
          <div className="flex items-center gap-3">
            {/* Tarih Seçici Kontrolleri (Daha büyük ve belirgin) */}
            <div className="flex items-center gap-2 bg-red-50/30 border border-red-200 px-3 py-1 rounded-lg shadow-sm text-sm print:hidden">
              <button
                onClick={handlePrevDay}
                className="p-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700 transition-colors"
                title="Önceki Gün"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => dateInputRef.current?.showPicker()}
                  className="p-0.5 hover:bg-red-50 rounded transition-colors text-red-500 hover:text-red-700 shrink-0"
                  title="Takvimi Aç"
                >
                  <Calendar size={15} />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  className="border-none p-0 text-[15px] font-black text-red-600 focus:ring-0 outline-none w-[125px] cursor-pointer bg-transparent"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ fontFamily: 'Calibri, sans-serif' }}
                />
              </div>

              <button
                onClick={handleNextDay}
                className="p-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700 transition-colors"
                title="Sonraki Gün"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Yazdırma Esnasında Gösterilecek Statik Kırmızı Tarih */}
            <div className="hidden print:block text-[18px] font-black text-red-600 ml-2" style={{ fontFamily: 'Calibri, sans-serif' }}>
              {formatDate(selectedDate)}
            </div>
          </div>
        </div>

        {/* Outer Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6 split-print-layout">
          
          {/* LEFT TABLE: POS BANKS */}
          <div className="flex-1 overflow-x-auto left-print-table">
            <table className="w-full text-sm border-collapse border border-gray-300 table-fixed excel-table-font">
              <thead>
                <tr className="bg-gray-50 font-bold border-b border-gray-300">
                  <th className="w-28 border border-gray-300 px-2 py-2.5 text-center text-red-650 font-black uppercase text-[13.5px] pos-header-red">POS</th>
                  <th className="w-24 border border-gray-300 px-2 py-2.5 text-center text-gray-700 font-extrabold uppercase text-[12.5px]">ŞUBELER</th>
                  <th className="w-32 border border-gray-300 px-2 py-2.5 text-center text-red-650 font-black uppercase text-[13.5px]">HESABA GEÇEN</th>
                  <th className="w-24 border border-gray-300 px-2 py-2.5 text-center text-gray-700 font-extrabold uppercase text-[12.5px]">KOMİSYON (%)</th>
                  <th className="w-24 border border-gray-300 px-2 py-2.5 text-center text-gray-700 font-extrabold uppercase text-[12.5px]">KESİNTİ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leftRows.map((row, index) => (
                  <tr key={`left-${index}`} className="hover:bg-gray-50/50 transition-colors h-[34px]">
                    
                    {/* Column A: Bank Name */}
                    <td className="border border-gray-300 p-0 text-center font-bold text-gray-800 uppercase bg-gray-50/20">
                      <input
                        type="text"
                        className={`w-full text-center py-1.5 px-1 border-none focus:ring-0 focus:outline-none bg-transparent font-extrabold text-gray-850 uppercase text-[13px] ${
                          isRedBranchName(row.bank) ? 'red-branch-input text-red-600' : ''
                        }`}
                        value={row.bank}
                        onChange={(e) => handleLeftCellChange(index, 'bank', e.target.value)}
                        placeholder="BANKA..."
                        data-table="left"
                        data-col="bank"
                        data-row={index}
                        onKeyDown={(e) => handleKeyDown(e, 'left', 'bank', index)}
                        onFocus={handleInputFocus}
                        onPaste={(e) => handlePasteColumn(e, 'left', 'bank', index)}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                      />
                    </td>

                    {/* Column B: Manual Spacing / Custom column */}
                    <td className="border border-gray-300 p-0 bg-yellow-50/5">
                      <input
                        type="text"
                        className="w-full text-center py-1.5 px-2 border-none focus:ring-0 focus:outline-none bg-gray-100/50 font-bold text-gray-700 text-[13px] cursor-not-allowed"
                        value={row.colB}
                        readOnly
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                      />
                    </td>

                    {/* Column C: Banka Gecen */}
                    <td className="border border-gray-300 p-0 bg-yellow-50/10">
                      <input
                        type="text"
                        className="w-full text-center py-1.5 px-2 border-none focus:ring-0 focus:outline-none bg-transparent font-black text-gray-900 text-[13.5px]"
                        value={row.banka_gecen}
                        onChange={(e) => handleLeftCellChange(index, 'banka_gecen', e.target.value)}
                        placeholder="0,00"
                        data-table="left"
                        data-col="banka_gecen"
                        data-row={index}
                        onKeyDown={(e) => handleKeyDown(e, 'left', 'banka_gecen', index)}
                        onFocus={handleInputFocus}
                        onPaste={(e) => handlePasteColumn(e, 'left', 'banka_gecen', index)}
                        onBlur={(e) => handleAmountBlur('left', index, 'banka_gecen', e.target.value)}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                      />
                    </td>

                    {/* Column D: Komisyon */}
                    <td className="border border-gray-300 p-0 bg-gray-50/5">
                      <input
                        type="text"
                        className="w-full text-center py-1.5 px-2 border-none focus:ring-0 focus:outline-none bg-gray-100/50 font-bold text-gray-700 text-[13px] cursor-not-allowed"
                        value={row.komisyon}
                        readOnly
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                      />
                    </td>

                    {/* Column E: Kesinti */}
                    <td className="border border-gray-300 p-0 bg-gray-50/5">
                      <input
                        type="text"
                        className="w-full text-center py-1.5 px-2 border-none focus:ring-0 focus:outline-none bg-gray-100/50 font-bold text-gray-700 text-[13px] cursor-not-allowed"
                        value={row.kesinti}
                        readOnly
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                      />
                    </td>

                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-extrabold border-t-2 border-gray-350 text-gray-900 h-[36px]">
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-700 text-[13px] uppercase">TOPLAM</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-800 text-[13px]">{totals.totalColB > 0 ? formatTRNum(totals.totalColB) : ''}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-brand-850 text-[14px]">{formatTRNum(totals.totalBankaGecen)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-emerald-800 text-[13px]">{totals.avgKomisyon > 0 ? formatTRNum(totals.avgKomisyon) : ''}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-800 text-[13px]">{totals.totalKesinti > 0 ? formatTRNum(totals.totalKesinti) : ''}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* RIGHT TABLE: TERMINALS / BRANCHES */}
          <div className="w-full lg:w-[320px] overflow-x-auto right-print-table">
            <div className="flex items-center justify-between mb-2 print:hidden">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ŞUBE DAĞILIMI</span>
            </div>

            <table className="w-full text-sm border-collapse border border-gray-300 table-fixed excel-table-font">
              <thead>
                <tr className="bg-gray-50 font-bold border-b border-gray-300">
                  <th className="w-1/2 border border-gray-300 px-2 py-2.5 text-center text-gray-800 font-extrabold uppercase text-[13px]">ŞUBE</th>
                  <th className="w-1/2 border border-gray-300 px-2 py-2.5 text-center text-gray-850 font-extrabold uppercase text-[13px]">TUTAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rightRows.map((row, index) => (
                  <tr key={`right-${index}`} className="hover:bg-gray-50/50 transition-colors h-[34px]">
                    
                    {/* Column H: Terminal Name */}
                    <td className="border border-gray-300 p-0 font-bold text-gray-700 bg-gray-50/10">
                      <input
                        type="text"
                        className={`w-full text-left py-1.5 px-2.5 border-none focus:ring-0 focus:outline-none bg-transparent font-extrabold text-gray-850 uppercase text-[12px] ${
                          isRedBranchName(row.name) ? 'red-branch-input text-red-600' : ''
                        }`}
                        value={row.name}
                        onChange={(e) => handleRightCellChange(index, 'name', e.target.value)}
                        placeholder="ŞUBE..."
                        data-table="right"
                        data-col="name"
                        data-row={index}
                        onKeyDown={(e) => handleKeyDown(e, 'right', 'name', index)}
                        onFocus={handleInputFocus}
                        onPaste={(e) => handlePasteColumn(e, 'right', 'name', index)}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                      />
                    </td>

                    {/* Column I: POS Amount */}
                    <td className="border border-gray-300 p-0 bg-yellow-50/10">
                      <input
                        type="text"
                        className="w-full text-right py-1.5 px-2.5 border-none focus:ring-0 focus:outline-none bg-transparent font-black text-gray-900 text-[13.5px]"
                        value={row.amount}
                        onChange={(e) => handleRightCellChange(index, 'amount', e.target.value)}
                        placeholder="0,00"
                        data-table="right"
                        data-col="amount"
                        data-row={index}
                        onKeyDown={(e) => handleKeyDown(e, 'right', 'amount', index)}
                        onFocus={handleInputFocus}
                        onPaste={(e) => handlePasteColumn(e, 'right', 'amount', index)}
                        onBlur={(e) => handleAmountBlur('right', index, 'amount', e.target.value)}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                      />
                    </td>

                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-extrabold border-t-2 border-gray-350 text-gray-900 h-[36px]">
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-700 text-[13px] uppercase">TOPLAM</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right text-brand-800 text-[14px]">{formatTRNum(totals.totalPosTutar)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        {/* Quick Instructions Alert */}
        <div className="mt-8 bg-sky-50 border border-sky-150 p-4 rounded-xl text-sky-850 text-xs flex gap-3 leading-relaxed print:hidden">
          <HelpCircle size={18} className="text-sky-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[13px]">Excel Tipi Hızlı Veri Giriş Özellikleri:</span>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><span className="font-bold">Enter</span> veya <span className="font-bold">Aşağı Ok</span> tuşuna basarak bir alt satıra geçebilirsiniz.</li>
              <li><span className="font-bold">Yukarı Ok</span> tuşuna basarak bir üst satıra geçebilirsiniz.</li>
              <li>Herhangi bir hücreye odaklandığınızda (klavyeyle geçtiğinizde) tüm içerik otomatik seçilir, doğrudan yeni veriyi yazmaya başlayabilirsiniz.</li>
              <li>Tüm veriler anında kaydedilir. Kolon E (<span className="font-semibold">Komisyon</span>) altındaki Toplam satırı, Excel'deki gibi girilen komisyon oranlarının ortalamasını gösterir.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
