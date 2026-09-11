import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  FileText, 
  Trash2, 
  Pencil, 
  RefreshCw, 
  Building,
  ArrowDownToLine,
  Eye,
  EyeOff,
  Briefcase,
  Download,
  ChevronDown,
  Printer,
  Scale
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import * as XLSX from 'xlsx';
import { RaporArkaSayfaCard } from './components/RaporArkaSayfaCard';
import type { ArkaSayfaData } from './types/arkaSayfa';
import { defaultArkaSayfaData } from './types/arkaSayfa';
import type { GunlukHesapBanks, BankAccountData } from './types/gunlukHesap';
import { DEFAULT_BANK_ORDER, emptyBankData } from './types/gunlukHesap';
import { CashboxDateFilterBar, SearchResultItem } from './components/CashboxDateFilterBar';

export interface AnaKasaCikisItem {
  description: string;
  bankOrType: string;
  amount: string | number;
}

export interface AnaKasaGirisItem {
  description: string;
  amount: string | number;
}

// Interfaces for Cashbox
interface CashboxTransaction {
  id: string;
  transaction_date: string;
  transaction_type: 'gelir' | 'gider';
  amount: number;
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  category: string;
  recipient_payer: string;
  description: string;
  bank_account_id: string | null;
  file_path: string | null;
  company: 'Etik Et' | 'Marif Et' | null;
  exclude_from_report: boolean;
  created_at: string;
  bank_accounts?: {
    bank: string;
    account_name: string;
    currency: string;
  } | null;
}

// Interfaces for Bank
interface BankAccount {
  id: string;
  bank: string;
  account_name: string;
  currency: string;
}



interface CashboxFormState {
  transaction_date: string;
  transaction_type: 'gelir' | 'gider';
  amount: string;
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  category: string;
  recipient_payer: string;
  description: string;
  bank_account_id: string;
  company: 'Etik Et' | 'Marif Et' | '';
  exclude_from_report: boolean;
}

const emptyCashboxForm = (): CashboxFormState => ({
  transaction_date: new Date().toISOString().split('T')[0],
  transaction_type: 'gelir',
  amount: '',
  currency: 'TRY',
  category: 'Tahsilat',
  recipient_payer: '',
  description: '',
  bank_account_id: '',
  company: 'Etik Et',
  exclude_from_report: false
});

const defaultCategories = {
  gelir: ['Tahsilat', 'Bankadan Çekilen Nakit', 'Ortak Katkısı', 'Kira Geliri', 'Diğer Gelir'],
  gider: ['Ödeme', 'Yol / Yemek', 'Personel Avans/Maaş', 'Ofis Gideri', 'Mal / Hizmet Alımı', 'Bankaya Yatırılan Nakit', 'Vergi / Harç', 'Kargo / Posta', 'Diğer Gider']
};

export function MainCashboxPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const isSuper = user?.role === 'Süper Admin' || user?.role === 'Developer' || user?.role === 'Süper Yönetici' || user?.rawRole === 'super_admin' || user?.rawRole === 'developer';
  const isAuthorized = isSuper || user?.email === 'admin@dars.local' || user?.email === 'admin@ets360.local';

  if (user && !isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  const location = useLocation();
  let activeSection = 'rapor';
  if (location.pathname.includes('/gunluk-hesap')) {
    activeSection = 'gunluk_hesap';
  } else if (location.pathname.includes('/rapor')) {
    activeSection = 'rapor_yeni';
  }
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isRange, setIsRange] = useState(false);
  const [isAllDates] = useState(false);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Data States
  const [transactions, setTransactions] = useState<CashboxTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals & Forms (Cashbox)
  const [cashboxOpen, setCashboxOpen] = useState(false);
  const [editingCashbox, setEditingCashbox] = useState<CashboxTransaction | null>(null);
  const [cashboxForm, setCashboxForm] = useState<CashboxFormState>(emptyCashboxForm());
  const [savingCashbox, setSavingCashbox] = useState(false);
  const [manualFile, setManualFile] = useState<File | undefined>(undefined);

  const [exportOpen, setExportOpen] = useState(false);

  // Filters for Cash Report & Universal Search
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('TRY'); 
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showExcluded, setShowExcluded] = useState<boolean>(false);

  // Ana Kasa Günlük Rapor (Excel Senkronu) States
  const [cikisList, setCikisList] = useState<AnaKasaCikisItem[]>(() => Array.from({ length: 42 }, () => ({ description: '', bankOrType: '', amount: '' })));
  const [girisList, setGirisList] = useState<AnaKasaGirisItem[]>(() => Array.from({ length: 42 }, () => ({ description: '', amount: '' })));
  const [reportTotalOut, setReportTotalOut] = useState<number>(0);
  const [reportTotalIn, setReportTotalIn] = useState<number>(0);
  const [reportDiff, setReportDiff] = useState<number>(0);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [hasReportData, setHasReportData] = useState<boolean>(false);
  const [isReportSaved, setIsReportSaved] = useState<boolean>(true);
  const [lastSyncSource, setLastSyncSource] = useState<string>('office_pc_sync');
  const [arkaSayfaData, setArkaSayfaData] = useState<ArkaSayfaData>(defaultArkaSayfaData());

  // Günlük Hesap (Bank Defterleri Excel Senkronu) States
  const [gunlukHesapBanks, setGunlukHesapBanks] = useState<GunlukHesapBanks | null>(null);
  const [isLoadingGunlukHesap, setIsLoadingGunlukHesap] = useState<boolean>(false);
  const [hasGunlukHesapData, setHasGunlukHesapData] = useState<boolean>(false);
  const [isGunlukHesapSaved, setIsGunlukHesapSaved] = useState<boolean>(true);
  const lastGunlukHesapUpdatedAtRef = useRef<string>('');

  const parseSheet1Rows = (rows: any[]) => {
    if (!rows || !Array.isArray(rows) || rows.length < 3) {
      return { cikis: [], giris: [], totalOut: 0, totalIn: 0, diff: 0 };
    }

    const cikis: AnaKasaCikisItem[] = [];
    const giris: AnaKasaGirisItem[] = [];
    let totalOut = 0;
    let totalIn = 0;
    let diff = 0;
    let foundTotals = false;

    for (let i = 3; i < rows.length; i++) {
      const r = rows[i] || [];

      const c1Str = String(r[1] || '').trim().toUpperCase();
      const c4Str = String(r[4] || '').trim().toUpperCase();
      if (c1Str === 'TOPLAM' || c4Str === 'TOPLAM') {
        totalOut = parseFloat(r[2]) || 0;
        totalIn = parseFloat(r[5]) || 0;
        diff = r[7] !== undefined && r[7] !== null && r[7] !== '' ? (parseFloat(r[7]) || 0) : (totalIn - totalOut);
        foundTotals = true;
        continue;
      }

      const outDesc = r[0] !== undefined && r[0] !== null ? String(r[0]).trim() : '';
      const outBank = r[1] !== undefined && r[1] !== null ? String(r[1]).trim() : '';
      const outAmt = r[2] !== undefined && r[2] !== null && r[2] !== '' ? (parseFloat(r[2]) || '') : '';

      const inDesc = r[4] !== undefined && r[4] !== null ? String(r[4]).trim() : '';
      const inAmt = r[5] !== undefined && r[5] !== null && r[5] !== '' ? (parseFloat(r[5]) || '') : '';

      cikis.push({ description: outDesc, bankOrType: outBank, amount: outAmt });
      giris.push({ description: inDesc, amount: inAmt });
    }

    if (!foundTotals) {
      totalOut = cikis.reduce((s, c) => s + (typeof c.amount === 'number' ? c.amount : 0), 0);
      totalIn = giris.reduce((s, g) => s + (typeof g.amount === 'number' ? g.amount : 0), 0);
      diff = totalIn - totalOut;
    }

    return { cikis, giris, totalOut, totalIn, diff };
  };

  const lastRecordUpdatedAtRef = useRef<string>('');

  const loadAnaKasaReport = useCallback(async (date: string, isSilent = false) => {
    if (!isSilent) setIsLoadingReport(true);
    try {
      const { data: record, error } = await supabase
        .from('cashbox_ana_kasa_reports')
        .select('*')
        .eq('report_date', date)
        .maybeSingle();

      if (!error && record?.data) {
        if (isSilent && record.updated_at && record.updated_at === lastRecordUpdatedAtRef.current) {
          // Değişiklik yok, tekrar render etme
          return;
        }
        lastRecordUpdatedAtRef.current = record.updated_at || '';
        setHasReportData(true);
        setLastSyncSource(record.source || 'office_pc_sync');

        // 1. Sheet 1
        const parsed = parseSheet1Rows(record.data.rows);
        const targetLen = Math.max(42, parsed.cikis.length, parsed.giris.length);
        const fullCikis = [...parsed.cikis];
        while (fullCikis.length < targetLen) {
          fullCikis.push({ description: '', bankOrType: '', amount: '' });
        }
        const fullGiris = [...parsed.giris];
        while (fullGiris.length < targetLen) {
          fullGiris.push({ description: '', amount: '' });
        }

        setCikisList(fullCikis);
        setGirisList(fullGiris);
        setReportTotalOut(parsed.totalOut);
        setReportTotalIn(parsed.totalIn);
        setReportDiff(parsed.diff);

        // 2. Sheet 2
        if (record.data.arka_sayfa) {
          setArkaSayfaData(record.data.arka_sayfa);
        } else {
          setArkaSayfaData(defaultArkaSayfaData());
        }
        setIsReportSaved(true);
      } else if (!isSilent) {
        setHasReportData(false);
        lastRecordUpdatedAtRef.current = '';
        setCikisList(Array.from({ length: 42 }, () => ({ description: '', bankOrType: '', amount: '' })));
        setGirisList(Array.from({ length: 42 }, () => ({ description: '', amount: '' })));
        setReportTotalOut(0);
        setReportTotalIn(0);
        setReportDiff(0);
        setArkaSayfaData(defaultArkaSayfaData());
        setIsReportSaved(true);
      }
    } catch (err) {
      console.error('Ana kasa raporu yüklenemedi:', err);
    } finally {
      if (!isSilent) setIsLoadingReport(false);
    }
  }, []);

  // Realtime subscription, initial load & continuous auto-poll for rapor_yeni
  useEffect(() => {
    if (activeSection !== 'rapor_yeni') return;

    void loadAnaKasaReport(selectedDate, false);

    // Her 5 saniyede bir Supabase'den en güncel ofis verilerini otomatik ve kesintisiz çeker
    const pollTimer = setInterval(() => {
      void loadAnaKasaReport(selectedDate, true);
    }, 5000);

    const channel = supabase
      .channel(`ana_kasa_sync_${selectedDate}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cashbox_ana_kasa_reports',
        filter: `report_date=eq.${selectedDate}`
      }, (payload: any) => {
        if (payload.new) {
          void loadAnaKasaReport(selectedDate, true);
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [selectedDate, activeSection, loadAnaKasaReport]);

  const saveAnaKasaReport = async (newCikis: AnaKasaCikisItem[], newGiris: AnaKasaGirisItem[], newArka?: ArkaSayfaData) => {
    setIsReportSaved(false);
    try {
      const { data: existing } = await supabase
        .from('cashbox_ana_kasa_reports')
        .select('data, raw_file_name')
        .eq('report_date', selectedDate)
        .maybeSingle();

      const rows: any[] = [
        ['ANA KASA RAPORU'],
        [],
        ['ÇIKIŞ', null, null, null, 'GİRİŞ']
      ];

      const maxLen = Math.max(newCikis.length, newGiris.length);
      let calcOut = 0;
      let calcIn = 0;

      for (let i = 0; i < maxLen; i++) {
        const c = newCikis[i];
        const g = newGiris[i];
        const cAmt = typeof c?.amount === 'number' ? c.amount : (parseFloat(String(c?.amount || '')) || null);
        const gAmt = typeof g?.amount === 'number' ? g.amount : (parseFloat(String(g?.amount || '')) || null);
        if (cAmt) calcOut += cAmt;
        if (gAmt) calcIn += gAmt;

        rows.push([
          c?.description || null,
          c?.bankOrType || null,
          cAmt,
          null,
          g?.description || null,
          gAmt
        ]);
      }

      rows.push([
        null,
        'TOPLAM',
        calcOut,
        null,
        'TOPLAM',
        calcIn,
        null,
        calcIn - calcOut
      ]);

      const updatedData = {
        ...(existing?.data || {}),
        rows,
        arka_sayfa: newArka !== undefined ? newArka : arkaSayfaData
      };

      await supabase
        .from('cashbox_ana_kasa_reports')
        .upsert({
          report_date: selectedDate,
          data: updatedData,
          raw_file_name: existing?.raw_file_name || `${selectedDate}-ANA KASA RAPORU.xlsx`,
          source: 'web_editor',
          updated_at: new Date().toISOString()
        }, { onConflict: 'report_date' });

      setReportTotalOut(calcOut);
      setReportTotalIn(calcIn);
      setReportDiff(calcIn - calcOut);
      setIsReportSaved(true);
    } catch (err) {
      console.error('Rapor kaydedilemedi:', err);
    }
  };

  const loadGunlukHesapReport = useCallback(async (date: string, isSilent = false) => {
    if (!isSilent) setIsLoadingGunlukHesap(true);
    try {
      const { data: record, error } = await supabase
        .from('cashbox_gunluk_hesap_reports')
        .select('*')
        .eq('report_date', date)
        .maybeSingle();

      if (!error && record?.data) {
        if (isSilent && record.updated_at && record.updated_at === lastGunlukHesapUpdatedAtRef.current) {
          return;
        }
        lastGunlukHesapUpdatedAtRef.current = record.updated_at || '';
        setHasGunlukHesapData(true);
        if (record.data.banks) {
          setGunlukHesapBanks(record.data.banks);
        } else {
          const fallback: GunlukHesapBanks = {};
          DEFAULT_BANK_ORDER.forEach(b => { fallback[b] = emptyBankData(b); });
          setGunlukHesapBanks(fallback);
        }
      } else {
        lastGunlukHesapUpdatedAtRef.current = '';
        setHasGunlukHesapData(false);
        const fallback: GunlukHesapBanks = {};
        DEFAULT_BANK_ORDER.forEach(b => { fallback[b] = emptyBankData(b); });
        setGunlukHesapBanks(fallback);
      }
    } catch (err) {
      console.error('Günlük hesap raporu yüklenemedi:', err);
    } finally {
      if (!isSilent) setIsLoadingGunlukHesap(false);
    }
  }, []);

  // Realtime subscription, initial load & continuous auto-poll for gunluk_hesap
  useEffect(() => {
    if (activeSection !== 'gunluk_hesap') return;

    void loadGunlukHesapReport(selectedDate, false);

    const pollTimer = setInterval(() => {
      void loadGunlukHesapReport(selectedDate, true);
    }, 5000);

    const channel = supabase
      .channel(`gunluk_hesap_sync_${selectedDate}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cashbox_gunluk_hesap_reports',
        filter: `report_date=eq.${selectedDate}`
      }, (payload: any) => {
        if (payload.new) {
          void loadGunlukHesapReport(selectedDate, true);
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [selectedDate, activeSection, loadGunlukHesapReport]);

  const saveGunlukHesapReport = async (newBanks: GunlukHesapBanks) => {
    setIsGunlukHesapSaved(false);
    try {
      const { data: existing } = await supabase
        .from('cashbox_gunluk_hesap_reports')
        .select('data, raw_file_name')
        .eq('report_date', selectedDate)
        .maybeSingle();

      const updatedData = {
        ...(existing?.data || {}),
        banks: newBanks
      };

      await supabase
        .from('cashbox_gunluk_hesap_reports')
        .upsert({
          report_date: selectedDate,
          data: updatedData,
          raw_file_name: existing?.raw_file_name || `${selectedDate}-GUNLUK HESAP.xlsx`,
          source: 'web_editor',
          updated_at: new Date().toISOString()
        }, { onConflict: 'report_date' });

      setGunlukHesapBanks(newBanks);
      setIsGunlukHesapSaved(true);
    } catch (err) {
      console.error('Günlük hesap kaydedilemedi:', err);
    }
  };

  const handleGunlukHesapCellBlur = (
    bankName: string,
    field: 'out-amt' | 'out-desc' | 'in-amt' | 'in-desc',
    value: string,
    rowIndex: number
  ) => {
    if (!isStaff) return;
    const currentBanks = { ...(gunlukHesapBanks || {}) };
    const currentBank = currentBanks[bankName] || emptyBankData(bankName);
    const outflows = { ...currentBank.outflows };
    const inflows = { ...currentBank.inflows };

    const parsedVal = value.trim();
    const cleanStr = parsedVal.replace(/\./g, '').replace(',', '.');
    const numVal = parseFloat(cleanStr);
    const validNum = !isNaN(numVal) && numVal !== 0 ? numVal : null;

    if (field === 'out-amt') {
      outflows[rowIndex] = { ...outflows[rowIndex], amount: validNum, description: outflows[rowIndex]?.description || '' };
    } else if (field === 'out-desc') {
      outflows[rowIndex] = { ...outflows[rowIndex], amount: outflows[rowIndex]?.amount ?? null, description: parsedVal };
    } else if (field === 'in-amt') {
      inflows[rowIndex] = { ...inflows[rowIndex], amount: validNum, description: inflows[rowIndex]?.description || '' };
    } else if (field === 'in-desc') {
      inflows[rowIndex] = { ...inflows[rowIndex], amount: inflows[rowIndex]?.amount ?? null, description: parsedVal };
    }

    const totalOut = Object.values(outflows).reduce((s, x) => s + (x.amount || 0), 0);
    const totalIn = Object.values(inflows).reduce((s, x) => s + (x.amount || 0), 0);
    const diff = totalIn - totalOut;
    const diffType: 'ALDIK' | 'YATAN' = diff > 0 ? 'YATAN' : 'ALDIK';
    const maxRowIndex = Math.max(
      currentBank.maxRowIndex ?? -1,
      ...Object.keys(outflows).map(Number),
      ...Object.keys(inflows).map(Number)
    );

    const updatedBank: BankAccountData = {
      ...currentBank,
      outflows,
      inflows,
      totalOut,
      totalIn,
      diff,
      diffType,
      maxRowIndex
    };

    const updatedBanks: GunlukHesapBanks = {
      ...currentBanks,
      [bankName]: updatedBank
    };

    setGunlukHesapBanks(updatedBanks);
    void saveGunlukHesapReport(updatedBanks);
  };

  const removeGunlukHesapRow = (bankName: string, type: 'cikis' | 'giris', rowIndex: number) => {
    if (!isStaff) return;
    const currentBanks = { ...(gunlukHesapBanks || {}) };
    const currentBank = currentBanks[bankName] || emptyBankData(bankName);
    const outflows = { ...currentBank.outflows };
    const inflows = { ...currentBank.inflows };

    if (type === 'cikis') {
      delete outflows[rowIndex];
    } else {
      delete inflows[rowIndex];
    }

    const totalOut = Object.values(outflows).reduce((s, x) => s + (x.amount || 0), 0);
    const totalIn = Object.values(inflows).reduce((s, x) => s + (x.amount || 0), 0);
    const diff = totalIn - totalOut;
    const diffType: 'ALDIK' | 'YATAN' = diff > 0 ? 'YATAN' : 'ALDIK';

    const updatedBank: BankAccountData = {
      ...currentBank,
      outflows,
      inflows,
      totalOut,
      totalIn,
      diff,
      diffType
    };

    const updatedBanks: GunlukHesapBanks = {
      ...currentBanks,
      [bankName]: updatedBank
    };

    setGunlukHesapBanks(updatedBanks);
    void saveGunlukHesapReport(updatedBanks);
  };

  const handleAddBankRow = (bankName: string) => {
    const currentBanks = { ...(gunlukHesapBanks || {}) };
    const currentBank = currentBanks[bankName] || emptyBankData(bankName);
    const nextIdx = (currentBank.maxRowIndex ?? -1) + 1;
    const updatedBank = {
      ...currentBank,
      maxRowIndex: nextIdx + 2
    };
    setGunlukHesapBanks({
      ...currentBanks,
      [bankName]: updatedBank
    });
    setTimeout(() => {
      const el = document.querySelector(`input[data-bank-name="${bankName}"][data-type="cikis-amount"][data-row-index="${nextIdx}"]`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }, 50);
  };

  const handleGunlukHesapKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    bankName: string,
    type: 'cikis-amount' | 'cikis-desc' | 'giris-amount' | 'giris-desc',
    rowIndex: number
  ) => {
    const cols = ['cikis-amount', 'cikis-desc', 'giris-amount', 'giris-desc'] as const;
    const colIndex = cols.indexOf(type);

    let targetRow = rowIndex;
    let targetColIndex = colIndex;
    let shouldNavigate = false;

    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
      targetRow = rowIndex + 1;
      shouldNavigate = true;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.currentTarget.blur();
      targetRow = rowIndex - 1;
      shouldNavigate = true;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.currentTarget.blur();
      targetRow = rowIndex + 1;
      shouldNavigate = true;
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        if (colIndex > 0) {
          e.preventDefault();
          e.currentTarget.blur();
          targetColIndex = colIndex - 1;
          shouldNavigate = true;
        }
      }
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      const len = input.value.length;
      if (input.selectionStart === len && input.selectionEnd === len) {
        if (colIndex < cols.length - 1) {
          e.preventDefault();
          e.currentTarget.blur();
          targetColIndex = colIndex + 1;
          shouldNavigate = true;
        }
      }
    }

    if (shouldNavigate) {
      const targetType = cols[targetColIndex];
      const nextInput = document.querySelector(
        `input[data-bank-name="${bankName}"][data-type="${targetType}"][data-row-index="${targetRow}"]`
      ) as HTMLInputElement | null;
      
      if (nextInput) {
        setTimeout(() => {
          nextInput.focus();
          nextInput.select();
        }, 100);
      }
    }
  };

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const prevStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(prevStr);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const nextStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextStr);
  };

  const handleToday = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setSelectedDate(todayStr);
  };


  // Fetch all transactions and bank accounts
  const refresh = useCallback(async () => {
    if (!user?.organizationId) return;
    setLoading(true);

    try {
      // 1. Fetch cashbox transactions
      const { data: txData, error: txError } = await supabase
        .from('main_cashbox_transactions')
        .select(`
          *,
          bank_accounts (
            bank,
            account_name,
            currency
          )
        `)
        .eq('organization_id', user.organizationId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (txError) throw txError;
      setTransactions((txData || []) as CashboxTransaction[]);

      // 2. Fetch bank accounts
      const { data: bankData, error: bankError } = await supabase
        .from('bank_accounts')
        .select('id, bank, account_name, currency')
        .eq('organization_id', user.organizationId)
        .eq('status', 'aktif');

      if (bankError) throw bankError;
      setBankAccounts((bankData || []) as BankAccount[]);

      if (activeSection === 'gunluk_hesap') {
        void loadGunlukHesapReport(selectedDate);
      }
    } catch (err: any) {
      notify(err.message || 'Veriler çekilirken hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, selectedDate, activeSection, loadGunlukHesapReport, notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live Search scoped strictly to currently active module/section
  useEffect(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results: SearchResultItem[] = [];

        // 1. Ana Kasa Günlük Rapor sayfasındaysak: SADECE cashbox_ana_kasa_reports içinde ara
        if (activeSection === 'rapor_yeni' || activeSection === 'rapor') {
          let anaKasaQuery = supabase
            .from('cashbox_ana_kasa_reports')
            .select('report_date, data')
            .order('report_date', { ascending: false });

          if (isRange && startDate && endDate) {
            anaKasaQuery = anaKasaQuery.gte('report_date', startDate).lte('report_date', endDate);
          }

          const { data: anaKasaData } = await anaKasaQuery;
          if (anaKasaData && !isCancelled) {
            for (const row of anaKasaData) {
              const rDate = row.report_date;
              const sheetRows = row.data?.rows || [];
              for (let i = 3; i < sheetRows.length; i++) {
                const r = sheetRows[i] || [];
                const c0 = String(r[0] || '').trim();
                const c1 = String(r[1] || '').trim();
                const c2 = r[2];
                const c4 = String(r[4] || '').trim();
                const c5 = r[5];

                if (c0.toLocaleLowerCase('tr-TR').includes(q) || c1.toLocaleLowerCase('tr-TR').includes(q)) {
                  results.push({
                    date: rDate,
                    category: 'ÇIKIŞ',
                    description: c0,
                    bankOrType: c1,
                    amount: c2 || ''
                  });
                }
                if (c4.toLocaleLowerCase('tr-TR').includes(q)) {
                  results.push({
                    date: rDate,
                    category: 'GİRİŞ',
                    description: c4,
                    bankOrType: 'GİRİŞ',
                    amount: c5 || ''
                  });
                }
              }

              // Arka sayfa cariler
              const cariler = row.data?.arka_sayfa?.cariler || [];
              for (const c of cariler) {
                const name = String(c.name || '').trim();
                if (name.toLocaleLowerCase('tr-TR').includes(q)) {
                  results.push({
                    date: rDate,
                    category: 'CARİ TAH.',
                    description: name,
                    bankOrType: 'RAPOR ARKA SAYFA',
                    amount: c.amount || ''
                  });
                }
              }
            }
          }
        }

        // 2. Günlük Hesap (Banka Defterleri) sayfasındaysak: SADECE cashbox_gunluk_hesap_reports içinde ara
        if (activeSection === 'gunluk_hesap') {
          let gHesapQuery = supabase
            .from('cashbox_gunluk_hesap_reports')
            .select('report_date, data')
            .order('report_date', { ascending: false });

          if (isRange && startDate && endDate) {
            gHesapQuery = gHesapQuery.gte('report_date', startDate).lte('report_date', endDate);
          }

          const { data: gHesapData } = await gHesapQuery;
          if (gHesapData && !isCancelled) {
            for (const row of gHesapData) {
              const rDate = row.report_date;
              const banks = row.data?.banks || {};
              for (const [bName, bData] of Object.entries<any>(banks)) {
                for (const outTx of Object.values<any>(bData.outflows || {})) {
                  const desc = String(outTx.description || '').trim();
                  if (desc.toLocaleLowerCase('tr-TR').includes(q)) {
                    results.push({
                      date: rDate,
                      category: 'BANKA ÇIKIŞ',
                      description: desc,
                      bankOrType: bName,
                      amount: outTx.amount || ''
                    });
                  }
                }
                for (const inTx of Object.values<any>(bData.inflows || {})) {
                  const desc = String(inTx.description || '').trim();
                  if (desc.toLocaleLowerCase('tr-TR').includes(q)) {
                    results.push({
                      date: rDate,
                      category: 'BANKA GİRİŞ',
                      description: desc,
                      bankOrType: bName,
                      amount: inTx.amount || ''
                    });
                  }
                }
              }
            }
          }
        }

        if (!isCancelled) {
          setSearchResults(results);
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
  }, [query, isRange, startDate, endDate, activeSection, user?.organizationId]);



  // Adjust categories list when type changes in form
  useEffect(() => {
    const list = defaultCategories[cashboxForm.transaction_type];
    if (!list.includes(cashboxForm.category)) {
      setFormCategory(list[0]);
    }
  }, [cashboxForm.transaction_type]);

  const setFormCategory = (cat: string) => {
    setCashboxForm(prev => ({ ...prev, category: cat }));
  };

  // -------------------------------------------------------------
  // MATH & FILTERING FOR CONSOLIDATED REPORT
  // -------------------------------------------------------------
  
  // Calculate cashbox balances (TRY, USD, EUR, GBP)
  const balances = useMemo(() => {
    const totals = { TRY: 0, USD: 0, EUR: 0, GBP: 0 };
    transactions.forEach(t => {
      if (t.exclude_from_report && !showExcluded) return;
      const amt = Number(t.amount) || 0;
      if (t.transaction_type === 'gelir') {
        totals[t.currency] += amt;
      } else {
        totals[t.currency] -= amt;
      }
    });
    return totals;
  }, [transactions, showExcluded]);

  // Filters for consolidated report
  const filteredCashbox = useMemo(() => {
    return transactions.filter(t => {
      // Exclude transfers unless specifically checked
      if (t.exclude_from_report && !showExcluded) return false;

      // Filter by selected date, range, or all
      if (isAllDates) {
        // No date filters
      } else if (isRange) {
        if (t.transaction_date < startDate || t.transaction_date > endDate) return false;
      } else {
        if (t.transaction_date !== selectedDate) return false;
      }

      // Company filter
      if (companyFilter !== 'all' && t.company !== companyFilter) return false;

      // Currency filter
      if (currencyFilter !== 'all' && t.currency !== currencyFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Search term
      const searchStr = `${t.category} ${t.recipient_payer || ''} ${t.description || ''} ${t.bank_accounts?.bank || ''}`.toLowerCase();
      if (query && !searchStr.includes(query.toLowerCase())) return false;

      return true;
    });
  }, [transactions, selectedDate, isRange, startDate, endDate, isAllDates, query, companyFilter, currencyFilter, categoryFilter, showExcluded]);

  const cashboxOutflows = useMemo(() => filteredCashbox.filter(t => t.transaction_type === 'gider'), [filteredCashbox]);
  const cashboxInflows = useMemo(() => filteredCashbox.filter(t => t.transaction_type === 'gelir'), [filteredCashbox]);

  const totalCashboxOutflow = useMemo(() => cashboxOutflows.reduce((sum, t) => sum + (t.amount === 0.01 ? 0 : Number(t.amount || 0)), 0), [cashboxOutflows]);
  const totalCashboxInflow = useMemo(() => cashboxInflows.reduce((sum, t) => sum + (t.amount === 0.01 ? 0 : Number(t.amount || 0)), 0), [cashboxInflows]);
  const netCashboxFlow = useMemo(() => totalCashboxInflow - totalCashboxOutflow, [totalCashboxInflow, totalCashboxOutflow]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => cats.add(t.category));
    return Array.from(cats);
  }, [transactions]);

  // -------------------------------------------------------------
  // MATH & FILTERING FOR DAILY BANK ACCOUNT SHEETS
  // -------------------------------------------------------------
  


  // -------------------------------------------------------------
  // CASHBOX CRUD ACTIONS
  // -------------------------------------------------------------
  
  const openCashboxForm = (item?: CashboxTransaction) => {
    setEditingCashbox(item || null);
    setManualFile(undefined);
    if (item) {
      setCashboxForm({
        transaction_date: item.transaction_date,
        transaction_type: item.transaction_type,
        amount: String(item.amount),
        currency: item.currency,
        category: item.category,
        recipient_payer: item.recipient_payer,
        description: item.description,
        bank_account_id: item.bank_account_id || '',
        company: item.company || '',
        exclude_from_report: item.exclude_from_report
      });
    } else {
      setCashboxForm({
        ...emptyCashboxForm(),
        transaction_date: selectedDate
      });
    }
    setCashboxOpen(true);
  };

  const saveCashbox = async () => {
    if (!user?.organizationId) return;
    if (!cashboxForm.amount || Number(cashboxForm.amount) <= 0) {
      notify('Geçerli bir tutar giriniz.', 'error');
      return;
    }

    setSavingCashbox(true);
    const payload = {
      organization_id: user.organizationId,
      transaction_date: cashboxForm.transaction_date,
      transaction_type: cashboxForm.transaction_type,
      amount: Number(cashboxForm.amount),
      currency: cashboxForm.currency,
      category: cashboxForm.category,
      recipient_payer: cashboxForm.recipient_payer.trim(),
      description: cashboxForm.description.trim(),
      bank_account_id: cashboxForm.bank_account_id || null,
      company: cashboxForm.company || null,
      exclude_from_report: cashboxForm.exclude_from_report,
      updated_at: new Date().toISOString()
    };

    try {
      const q = editingCashbox 
        ? supabase.from('main_cashbox_transactions').update(payload).eq('id', editingCashbox.id).eq('organization_id', user.organizationId).select().single()
        : supabase.from('main_cashbox_transactions').insert(payload).select().single();

      const { data: savedRecord, error } = await q;
      if (error) throw error;

      if (manualFile && savedRecord) {
        const fileExt = manualFile.name.split('.').pop();
        const path = `${user.organizationId}/modules/main_cashbox/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('operations-documents')
          .upload(path, manualFile, { contentType: manualFile.type });
        
        if (uploadError) throw uploadError;

        await supabase.from('main_cashbox_transactions').update({ file_path: path }).eq('id', savedRecord.id);
        await supabase.from('module_documents').insert({
          organization_id: user.organizationId,
          module: 'main_cashbox',
          file_name: manualFile.name,
          file_path: path,
          note: `${savedRecord.category} makbuzu - ${savedRecord.recipient_payer || 'Kasadan'}`
        });
      }

      notify(editingCashbox ? 'Kasa hareketi güncellendi.' : 'Kasa hareketi eklendi.', 'success');
      setCashboxOpen(false);
      setManualFile(undefined);
      await refresh();
    } catch (err: any) {
      notify(err.message || 'Kasa hareketi kaydedilemedi.', 'error');
    } finally {
      setSavingCashbox(false);
    }
  };

  const removeCashbox = async (item: CashboxTransaction) => {
    if (!confirm('Bu kasa hareketini silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase
        .from('main_cashbox_transactions')
        .delete()
        .eq('id', item.id)
        .eq('organization_id', user?.organizationId);

      if (error) throw error;
      notify('Kasa hareketi silindi.', 'success');
      await refresh();
    } catch (err: any) {
      notify(err.message || 'Kasa hareketi silinemedi.', 'error');
    }
  };




  // -------------------------------------------------------------
  // SHARED UTILS
  // -------------------------------------------------------------
  
  const openDocument = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('operations-documents')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      notify(err.message || 'Dosya açılamadı.', 'error');
    }
  };

  const formatExcelNumber = (num: number) => {
    if (num === 0 || num === 0.01) return '';
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(num);
  };

  const formatValue = (val: number, curr: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2
    }).format(val);
  };

  const isStaff = ['Süper Admin', 'Admin', 'Developer', 'Süper Yönetici', 'Yönetici', 'Muhasebe', 'Finans', 'Personel'].includes(user?.role || '');

  // Excel Export for Consolidated report
  const exportCashboxExcel = () => {
    const outflows = filteredCashbox.filter(t => t.transaction_type === 'gider');
    const inflows = filteredCashbox.filter(t => t.transaction_type === 'gelir');

    const positionedOutflows: Record<number, any> = {};
    const positionedInflows: Record<number, any> = {};
    let maxCashboxIndex = 0;

    const isSearchOrRange = isRange || isAllDates || !!query.trim();

    if (isSearchOrRange) {
      outflows.forEach((t, i) => {
        positionedOutflows[i] = t;
        maxCashboxIndex = Math.max(maxCashboxIndex, i);
      });

      inflows.forEach((t, i) => {
        positionedInflows[i] = t;
        maxCashboxIndex = Math.max(maxCashboxIndex, i);
      });
    } else {
      maxCashboxIndex = 43; // minimum 45 rows

      outflows.forEach(t => {
        const idx = parseInt(t.description, 10);
        if (!isNaN(idx)) {
          positionedOutflows[idx] = t;
          maxCashboxIndex = Math.max(maxCashboxIndex, idx);
        } else {
          let fallbackIdx = 0;
          while (positionedOutflows[fallbackIdx]) fallbackIdx++;
          positionedOutflows[fallbackIdx] = t;
          maxCashboxIndex = Math.max(maxCashboxIndex, fallbackIdx);
        }
      });

      inflows.forEach(t => {
        const idx = parseInt(t.description, 10);
        if (!isNaN(idx)) {
          positionedInflows[idx] = t;
          maxCashboxIndex = Math.max(maxCashboxIndex, idx);
        } else {
          let fallbackIdx = 0;
          while (positionedInflows[fallbackIdx]) fallbackIdx++;
          positionedInflows[fallbackIdx] = t;
          maxCashboxIndex = Math.max(maxCashboxIndex, fallbackIdx);
        }
      });
    }

    const maxRows = maxCashboxIndex + 1;
    const sheetData: any[] = [];

    // Header rows
    sheetData.push({
      'Açıklama (Çıkış)': 'ÇIKIŞLAR',
      'Banka / Tür (Çıkış)': '',
      'Tutar (Çıkış)': '',
      'Açıklama (Giriş)': 'GİRİŞLER',
      'Tutar (Giriş)': ''
    });

    sheetData.push({
      'Açıklama (Çıkış)': 'Açıklama / Cari',
      'Banka / Tür (Çıkış)': 'Banka / Tür',
      'Tutar (Çıkış)': 'Tutar',
      'Açıklama (Giriş)': 'Açıklama / Cari / Banka',
      'Tutar (Giriş)': 'Tutar'
    });

    for (let i = 0; i < maxRows; i++) {
      const outTx = positionedOutflows[i];
      const inTx = positionedInflows[i];
      sheetData.push({
        'Açıklama (Çıkış)': outTx ? outTx.recipient_payer : '',
        'Banka / Tür (Çıkış)': outTx ? outTx.category : '',
        'Tutar (Çıkış)': outTx ? (outTx.amount === 0.01 ? '' : outTx.amount) : '',
        'Açıklama (Giriş)': inTx ? inTx.recipient_payer : '',
        'Tutar (Giriş)': inTx ? (inTx.amount === 0.01 ? '' : inTx.amount) : ''
      });
    }

    // Totals row
    const totalOut = Object.values(positionedOutflows).reduce((s, t) => s + (t.amount === 0.01 ? 0 : t.amount), 0);
    const totalIn = Object.values(positionedInflows).reduce((s, t) => s + (t.amount === 0.01 ? 0 : t.amount), 0);
    sheetData.push({
      'Açıklama (Çıkış)': 'TOPLAM',
      'Banka / Tür (Çıkış)': '',
      'Tutar (Çıkış)': totalOut,
      'Açıklama (Giriş)': 'TOPLAM',
      'Tutar (Giriş)': totalIn
    });

    const ws = XLSX.utils.json_to_sheet(sheetData, { skipHeader: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kasa Raporu');
    const fileName = isRange 
      ? `Ana_Kasa_Raporu_${startDate}_${endDate}.xlsx`
      : `Ana_Kasa_Raporu_${selectedDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    notify('Kasa Raporu Excel başarıyla indirildi.', 'success');
  };

  const exportBankExcel = () => {
    const wb = XLSX.utils.book_new();
    
    DEFAULT_BANK_ORDER.forEach(bankName => {
      const stats = gunlukHesapBanks?.[bankName] || emptyBankData(bankName);
      const minRows = bankName === 'KUVEYT' ? 10 : 5;
      const maxRows = Math.max(minRows, (stats.maxRowIndex ?? -1) + 1);
      
      const sheetData: any[] = [];
      sheetData.push({ 'Tutar (Çıkış)': '', 'Açıklama (Çıkış)': bankName, 'Tutar (Giriş)': '', 'Açıklama (Giriş)': selectedDate });
      sheetData.push({ 'Tutar (Çıkış)': 'ÇIKIŞLAR TOPLAMI:', 'Açıklama (Çıkış)': stats.totalOut, 'Tutar (Giriş)': 'GİRİŞLER TOPLAMI:', 'Açıklama (Giriş)': stats.totalIn });
      sheetData.push({ 'Tutar (Çıkış)': 'MUTABAKAT FARKI:', 'Açıklama (Çıkış)': `${stats.diff} ${stats.diffType}`, 'Tutar (Giriş)': '', 'Açıklama (Giriş)': '' });
      sheetData.push({});
      sheetData.push({
        'Tutar (Çıkış)': 'Tutar (Çıkış)',
        'Açıklama (Çıkış)': 'Açıklama (Çıkış)',
        'Tutar (Giriş)': 'Tutar (Giriş)',
        'Açıklama (Giriş)': 'Açıklama (Giriş)'
      });
      
      for (let i = 0; i < maxRows; i++) {
        const outTx = stats.outflows[i];
        const inTx = stats.inflows[i];
        sheetData.push({
          'Tutar (Çıkış)': outTx?.amount ? outTx.amount : '',
          'Açıklama (Çıkış)': outTx ? outTx.description : '',
          'Tutar (Giriş)': inTx?.amount ? inTx.amount : '',
          'Açıklama (Giriş)': inTx ? inTx.description : ''
        });
      }
      
      const ws = XLSX.utils.json_to_sheet(sheetData, { skipHeader: true });
      XLSX.utils.book_append_sheet(wb, ws, bankName.substring(0, 31));
    });
    
    XLSX.writeFile(wb, `Banka_Defterleri_${selectedDate}.xlsx`);
    notify('Banka Defterleri Excel başarıyla indirildi.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Ana Kasa ve Banka Yönetimi" 
        description="Şirket kasalarını ve günlük banka hesap hareketlerini tek ekranda yönetin."
        actions={
          <div className="flex items-center gap-2 relative">
            <button onClick={() => void refresh()} className="btn btn-secondary flex items-center gap-1.5" disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Yenile
            </button>
            
            {/* Export Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setExportOpen(!exportOpen)} 
                className="btn btn-secondary flex items-center gap-1.5 font-bold"
              >
                <Download size={16} />
                Dışa Aktar
                <ChevronDown size={14} />
              </button>
              
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg z-20">
                    <button
                      onClick={() => {
                        setExportOpen(false);
                        window.print();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 font-semibold"
                    >
                      <FileText size={16} className="text-red-500" />
                      PDF Aktar
                    </button>
                    <button
                      onClick={() => {
                        setExportOpen(false);
                        if (activeSection === 'rapor' || activeSection === 'rapor_yeni') {
                          exportCashboxExcel();
                        } else {
                          exportBankExcel();
                        }
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 font-semibold"
                    >
                      <FileSpreadsheet size={16} className="text-emerald-600" />
                      Excel Aktar
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Print Button */}
            <button 
              onClick={() => window.print()} 
              className="btn btn-secondary flex items-center gap-1.5 font-bold"
            >
              <Printer size={16} />
              Yazdır
            </button>

            {activeSection === 'rapor' && isStaff && (
              <button onClick={() => openCashboxForm()} className="btn btn-primary flex items-center gap-1.5">
                <Plus size={16} />
                İşlem Ekle
              </button>
            )}
          </div>
        }
      />

      {/* Universal Top Filter Bar matching GirisCikisPage */}
      <CashboxDateFilterBar
        searchQuery={query}
        setSearchQuery={setQuery}
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
        onToday={handleToday}
        searchResults={searchResults}
        isSearching={isSearching}
        onSelectResult={(d) => {
          setSelectedDate(d);
          setIsRange(false);
        }}
        extraActions={
          activeSection === 'rapor_yeni' ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
                <span className={`w-2 h-2 rounded-full ${isLoadingReport ? 'bg-blue-500 animate-spin' : (isReportSaved ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping')}`}></span>
                {isLoadingReport 
                  ? 'Rapor Yükleniyor...' 
                  : (hasReportData 
                      ? (lastSyncSource === 'office_pc_sync' ? 'Ofis Senkronu: Güncel' : 'Bulutla Eşitlendi') 
                      : 'Veri Bulunamadı (Boş Şablon)')
                }
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 cursor-pointer"
                title="Yazdır"
              >
                <Printer size={15} />
                <span>Yazdır</span>
              </button>
              <button
                type="button"
                onClick={exportCashboxExcel}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
                title="Excel İndir"
              >
                <FileSpreadsheet size={15} />
                <span>Excel</span>
              </button>
            </>
          ) : activeSection === 'gunluk_hesap' ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
                <span className={`w-2 h-2 rounded-full ${isLoadingGunlukHesap ? 'bg-blue-500 animate-spin' : (isGunlukHesapSaved ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping')}`}></span>
                {isLoadingGunlukHesap 
                  ? 'Rapor Yükleniyor...' 
                  : (hasGunlukHesapData 
                      ? 'Ofis Senkronu: Güncel' 
                      : 'Veri Bulunamadı (Boş Şablon)')
                }
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 cursor-pointer"
                title="Yazdır"
              >
                <Printer size={15} />
                <span>Yazdır</span>
              </button>
              <button
                type="button"
                onClick={exportBankExcel}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
                title="Excel İndir"
              >
                <FileSpreadsheet size={15} />
                <span>Excel</span>
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
                <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
                {loading ? 'Yükleniyor...' : 'Otomatik Kaydedildi'}
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 cursor-pointer"
                title="Yazdır"
              >
                <Printer size={15} />
                <span>Yazdır</span>
              </button>
            </>
          )
        }
      />

      {/* -------------------------------------------------------------
          TAB 1: ANA KASA RAPORU (CONSOLIDATED LEDGER)
          ------------------------------------------------------------- */}
      {activeSection === 'rapor' && (
        <div className="space-y-6">
          {/* Günlük Kasa Akışı Dengesi (TRY) */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { 
                label: 'Toplam Kasa Bakiyesi', 
                subtitle: 'Genel Net Kasa Mevcudu',
                value: balances.TRY, 
                currency: 'TRY', 
                bg: 'from-blue-600 to-indigo-700', 
                text: 'text-blue-100', 
                iconColor: 'bg-blue-500/20',
                icon: Wallet
              },
              { 
                label: isAllDates ? 'Toplam Girişler' : 'Bugünkü Girişler', 
                subtitle: isAllDates ? 'Tüm Tahsilatlar' : 'Seçilen Günlük Tahsilat',
                value: totalCashboxInflow, 
                currency: 'TRY', 
                bg: 'from-emerald-600 to-teal-700', 
                text: 'text-emerald-100', 
                iconColor: 'bg-emerald-500/20',
                icon: ArrowDownLeft
              },
              { 
                label: isAllDates ? 'Toplam Çıkışlar' : 'Bugünkü Çıkışlar', 
                subtitle: isAllDates ? 'Tüm Ödemeler' : 'Seçilen Günlük Ödeme',
                value: totalCashboxOutflow, 
                currency: 'TRY', 
                bg: 'from-rose-600 to-red-700', 
                text: 'text-rose-100', 
                iconColor: 'bg-rose-500/20',
                icon: ArrowUpRight
              },
              { 
                label: isAllDates ? 'Genel Net Akış' : 'Günlük Net Değişim', 
                subtitle: 'Girişler - Çıkışlar Farkı',
                value: netCashboxFlow, 
                currency: 'TRY', 
                bg: netCashboxFlow >= 0 ? 'from-amber-600 to-orange-700' : 'from-slate-700 to-slate-900', 
                text: 'text-amber-100', 
                iconColor: 'bg-amber-500/20',
                icon: Scale
              }
            ].map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div 
                  key={idx} 
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.bg} p-6 shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${card.text}`}>
                        {card.label}
                      </span>
                      <h3 className="text-2xl font-bold text-white tracking-tight">
                        {card.value < 0 ? '-' : card.value > 0 && card.label.includes('Değişim') ? '+' : ''}
                        {formatValue(Math.abs(card.value), card.currency)}
                      </h3>
                      <p className={`text-[11px] font-medium opacity-80 ${card.text}`}>
                        {card.subtitle}
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 text-white ${card.iconColor}`}>
                      <IconComp size={24} />
                    </div>
                  </div>
                  <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-white/5" />
                </div>
              );
            })}
          </div>

          {/* Filters card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="input w-full pl-10"
                  placeholder="Alıcı, ödeyen, açıklama ara..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>

              <div>
                <select className="input w-full font-semibold" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
                  <option value="all">Tüm Şirketler (Etik + Marif)</option>
                  <option value="Etik Et">Etik Et ve Et Ürünleri</option>
                  <option value="Marif Et">Marif Et ve Et Ürünleri</option>
                </select>
              </div>

              <div>
                <select className="input w-full font-semibold text-gray-700" value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)}>
                  <option value="TRY">TRY (Türk Lirası - ₺)</option>
                  <option value="all">Tüm Kayıtlar</option>
                </select>
              </div>

              <div>
                <select className="input w-full" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="all">Tüm Kategoriler</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="text-xs text-gray-500 font-medium italic">
                * Şirketler arası (Etik-Marif) para transferleri rapordan varsayılan olarak **hariç tutulur**.
              </div>
              <button
                onClick={() => setShowExcluded(!showExcluded)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                  showExcluded 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {showExcluded ? <Eye size={14} /> : <EyeOff size={14} />}
                {showExcluded ? 'Şirketler Arası Transferleri Gizle' : 'Şirketler Arası Transferleri Göster'}
              </button>
            </div>
          </div>

          {/* Double Column Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Outflows */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-gray-100 bg-rose-50/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-rose-500 p-1.5 text-white">
                    <ArrowUpRight size={16} />
                  </span>
                  <h3 className="font-bold text-gray-800 tracking-tight">ÇIKIŞLAR (Ödemeler)</h3>
                </div>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                  {cashboxOutflows.length} İşlem
                </span>
              </div>

              <div className="flex-1 overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3 w-28">Tarih</th>
                      <th className="px-4 py-3 w-20">Şirket</th>
                      <th className="px-4 py-3">Açıklama / Cari / Banka</th>
                      <th className="px-4 py-3 w-32 text-right">Tutar</th>
                      <th className="px-4 py-3 w-16 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {cashboxOutflows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center text-gray-400 font-medium">
                          Çıkış hareketi bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      cashboxOutflows.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(t.transaction_date).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-4 py-3">
                            {t.company ? (
                              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                t.company === 'Etik Et' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {t.company === 'Etik Et' ? 'Etik' : 'Marif'}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 space-y-0.5">
                            <div className="font-semibold text-gray-800">{t.recipient_payer || 'Kasadan'}</div>
                            <div className="text-gray-500 text-[10px] flex items-center gap-1.5 flex-wrap">
                              <span className="bg-gray-100 px-1 py-0.2 rounded text-gray-600 font-medium">{t.category}</span>
                              {t.bank_accounts && (
                                <span className="text-gray-400 flex items-center gap-0.5">
                                  <Building size={10} /> {t.bank_accounts.bank}
                                </span>
                              )}
                              {t.description && isNaN(Number(t.description)) && <span className="text-gray-400 italic">"{t.description}"</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-600 whitespace-nowrap text-sm">
                            {formatValue(t.amount, t.currency)}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-0.5">
                              {t.file_path && (
                                <button onClick={() => openDocument(t.file_path!)} className="p-0.5 text-gray-400 hover:text-brand-600" title="Belge">
                                  <FileText size={13} />
                                </button>
                              )}
                              {isStaff && (
                                <>
                                  <button onClick={() => openCashboxForm(t)} className="p-0.5 text-gray-400 hover:text-blue-600" title="Düzenle">
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => removeCashbox(t)} className="p-0.5 text-gray-400 hover:text-rose-600" title="Sil">
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Output */}
              <div className="border-t border-gray-100 bg-rose-50/30 px-5 py-4 flex items-center justify-between font-bold text-rose-700">
                <span>ÇIKIŞLAR TOPLAMI:</span>
                <span className="text-base">{formatValue(totalCashboxOutflow, currencyFilter === 'all' ? 'TRY' : currencyFilter)}</span>
              </div>
            </div>

            {/* Inflows */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-gray-100 bg-emerald-50/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-emerald-500 p-1.5 text-white">
                    <ArrowDownLeft size={16} />
                  </span>
                  <h3 className="font-bold text-gray-800 tracking-tight">GİRİŞLER (Tahsilatlar)</h3>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  {cashboxInflows.length} İşlem
                </span>
              </div>

              <div className="flex-1 overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3 w-28">Tarih</th>
                      <th className="px-4 py-3 w-20">Şirket</th>
                      <th className="px-4 py-3">Açıklama / Cari / Banka</th>
                      <th className="px-4 py-3 w-32 text-right">Tutar</th>
                      <th className="px-4 py-3 w-16 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {cashboxInflows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center text-gray-400 font-medium">
                          Giriş hareketi bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      cashboxInflows.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(t.transaction_date).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-4 py-3">
                            {t.company ? (
                              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                t.company === 'Etik Et' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {t.company === 'Etik Et' ? 'Etik' : 'Marif'}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 space-y-0.5">
                            <div className="font-semibold text-gray-800">{t.recipient_payer || 'Kasa Girişi'}</div>
                            <div className="text-gray-500 text-[10px] flex items-center gap-1.5 flex-wrap">
                              <span className="bg-gray-100 px-1 py-0.2 rounded text-gray-600 font-medium">{t.category}</span>
                              {t.bank_accounts && (
                                <span className="text-gray-400 flex items-center gap-0.5">
                                  <Building size={10} /> {t.bank_accounts.bank}
                                </span>
                              )}
                              {t.description && isNaN(Number(t.description)) && <span className="text-gray-400 italic">"{t.description}"</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap text-sm">
                            {formatValue(t.amount, t.currency)}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-0.5">
                              {t.file_path && (
                                <button onClick={() => openDocument(t.file_path!)} className="p-0.5 text-gray-400 hover:text-brand-600" title="Belge">
                                  <FileText size={13} />
                                </button>
                              )}
                              {isStaff && (
                                <>
                                  <button onClick={() => openCashboxForm(t)} className="p-0.5 text-gray-400 hover:text-blue-600" title="Düzenle">
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => removeCashbox(t)} className="p-0.5 text-gray-400 hover:text-rose-600" title="Sil">
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Input */}
              <div className="border-t border-gray-100 bg-emerald-50/30 px-5 py-4 flex items-center justify-between font-bold text-emerald-700">
                <span>GİRİŞLER TOPLAMI:</span>
                <span className="text-base">{formatValue(totalCashboxInflow, currencyFilter === 'all' ? 'TRY' : currencyFilter)}</span>
              </div>
            </div>
          </div>

          {/* NET FLOW SUMMARY */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h4 className="font-bold text-gray-800">Günlük Kasa Net Değişimi</h4>
              <p className="text-xs text-gray-500">Seçili tarihte ({new Date(selectedDate).toLocaleDateString('tr-TR')}) kasaya giren ve çıkan para farkı.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm font-semibold">NET FARK BAKİYE:</span>
              <span className={`text-xl font-black rounded-lg px-4 py-2 border ${
                netCashboxFlow >= 0 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {netCashboxFlow >= 0 ? '+' : ''}{formatValue(netCashboxFlow, currencyFilter === 'all' ? 'TRY' : currencyFilter)}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={exportCashboxExcel}
                className="btn btn-secondary flex items-center gap-1.5"
                disabled={filteredCashbox.length === 0}
              >
                <FileSpreadsheet size={16} className="text-emerald-600" />
                Raporu Excel'e Aktar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 3: ANA KASA GÜNLÜK RAPOR (EXCEL SENKRONU & YAN YANA 2 SAYFA)
          ------------------------------------------------------------- */}
      {activeSection === 'rapor_yeni' && (() => {
        const handleCellBlur = (type: 'cikis' | 'giris', field: string, index: number, value: string) => {
          if (type === 'cikis') {
            const updated = [...cikisList];
            let val: any = value;
            if (field === 'amount') {
              if (!value || value.trim() === '') {
                val = '';
              } else {
                const clean = value.replace(/\./g, '').replace(/,/g, '.').trim();
                const n = parseFloat(clean);
                val = isNaN(n) ? '' : n;
              }
            }
            updated[index] = { ...updated[index], [field]: val };
            setCikisList(updated);
            void saveAnaKasaReport(updated, girisList);
          } else {
            const updated = [...girisList];
            let val: any = value;
            if (field === 'amount') {
              if (!value || value.trim() === '') {
                val = '';
              } else {
                const clean = value.replace(/\./g, '').replace(/,/g, '.').trim();
                const n = parseFloat(clean);
                val = isNaN(n) ? '' : n;
              }
            }
            updated[index] = { ...updated[index], [field]: val };
            setGirisList(updated);
            void saveAnaKasaReport(cikisList, updated);
          }
        };

        const maxRows = Math.max(42, cikisList.length, girisList.length);
        const rows = Array.from({ length: maxRows });

        return (
          <div className="space-y-4">


            {/* Printable & Screen Area: 2 Cards Side-by-Side */}
            <div id="printable-report-area" className="w-full max-w-[1720px] mx-auto space-y-4">
              <style>{`
                @media print {
                  html, body, #root, #root > div, main, [class*="lg:pl-"], .min-h-screen {
                    height: auto !important;
                    min-height: auto !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    background: white !important;
                    display: block !important;
                    position: static !important;
                  }
                  aside, header, nav, [class*="Sidebar"], [class*="Topbar"], .no-print, button, select, input[type="date"] {
                    display: none !important;
                  }
                  #printable-report-area ~ *, * ~ #printable-report-area {
                    display: none !important;
                  }
                  #printable-report-area {
                    display: block !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    position: static !important;
                  }
                  @page {
                    size: A4 portrait !important;
                    margin: 8mm 12mm !important;
                  }
                  .print-page-1 {
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                  .print-page-2 {
                    page-break-before: always !important;
                    break-before: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                  .print-card {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: 2px solid #000 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                  }
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
              `}</style>

              {/* Side-by-Side: Page 1 and Page 2 */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 items-start">
                
                {/* ========================================================= */}
                {/* 1. SAYFA (ÖN YÜZ - ÇIKIŞ / GİRİŞ)                         */}
                {/* ========================================================= */}
                <div className="print-page-1 w-full">
                  <div className="flex flex-col text-gray-955 print-card animate-fadeIn" style={{ fontFamily: 'Calibri, sans-serif' }}>
                    <div className="border-2 border-black bg-white shadow-sm overflow-hidden flex flex-col">
                      
                      {/* Grey Header Banner matching GirisCikisPage */}
                      <div className="border-b-2 border-black bg-[#cfd5dd] h-[40px] flex items-center justify-between px-3 text-black font-black text-[18px] tracking-widest uppercase mb-[-2px] z-10">
                        <span>ANA KASA GÜNLÜK RAPOR (ÖN YÜZ)</span>
                        <span className="text-[11px] font-bold text-gray-800 bg-white/70 border border-black/30 px-2 py-0.5 rounded">
                          1. SAYFA
                        </span>
                      </div>

                      {/* Main Headers (ÇIKIŞ | GİRİŞ) */}
                      <div className="grid grid-cols-[57%_14px_41%] border-b-2 border-black bg-white h-[44px] items-center text-center font-bold text-[20px] tracking-widest uppercase">
                        <div className="text-black py-1">ÇIKIŞ</div>
                        <div className="border-l border-black border-r border-black h-full bg-white"></div>
                        <div className="text-black py-1">GİRİŞ</div>
                      </div>

                      {/* Column Headers Row */}
                      <div className="grid grid-cols-[57%_14px_41%] border-b-2 border-black bg-gray-100 h-[34px] items-center text-xs font-bold uppercase text-gray-800 tracking-wider">
                        {/* Outflow Headers */}
                        <div className="flex divide-x divide-black h-full items-center">
                          <div className="w-[55%] pl-3 text-left">Açıklama / Cari</div>
                          <div className="w-[20%] text-left pl-3">Banka / Tür</div>
                          <div className="w-[25%] pr-3 text-right">Tutar</div>
                        </div>
                        {/* Divider */}
                        <div className="border-l border-black border-r border-black h-full bg-gray-100"></div>
                        {/* Inflow Headers */}
                        <div className="flex divide-x divide-black h-full items-center">
                          <div className="w-[70%] pr-3 text-right">Açıklama / Cari / Banka</div>
                          <div className="w-[30%] pr-3 text-right">Tutar</div>
                        </div>
                      </div>

                      {/* Data Rows */}
                      <div className="bg-white">
                        {rows.map((_, index) => {
                          const cRow = cikisList[index] || { description: '', bankOrType: '', amount: '' };
                          const gRow = girisList[index] || { description: '', amount: '' };
                          const isInflowKasa = (gRow.description || '').trim().toUpperCase() === 'KASA';

                          return (
                            <div key={index} className="grid grid-cols-[57%_14px_41%] h-[32px] items-center text-xs">
                              {/* Outflow (Left Side) */}
                              <div className="flex divide-x divide-black h-full items-center border-b border-black">
                                {/* Description */}
                                <div className="w-[55%] h-full flex items-center">
                                  <input
                                    type="text"
                                    className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 text-left pl-3 text-[14px] truncate uppercase font-bold text-gray-900"
                                    defaultValue={cRow.description}
                                    onBlur={e => handleCellBlur('cikis', 'description', index, e.target.value)}
                                    disabled={!isStaff}
                                    placeholder=""
                                  />
                                </div>
                                {/* Bank / Type */}
                                <div className="w-[20%] h-full flex items-center">
                                  <input
                                    type="text"
                                    className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 text-left pl-3 text-[14px] truncate uppercase font-bold"
                                    style={{ color: '#FF0000' }}
                                    defaultValue={cRow.bankOrType}
                                    onBlur={e => handleCellBlur('cikis', 'bankOrType', index, e.target.value)}
                                    disabled={!isStaff}
                                    placeholder=""
                                  />
                                </div>
                                {/* Amount */}
                                <div className="w-[25%] h-full flex items-center justify-end pr-2">
                                  <input
                                    key={`cikis-amt-${index}-${cRow.amount}`}
                                    type="text"
                                    className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right pr-1 text-[14px] font-bold text-gray-950"
                                    defaultValue={cRow.amount !== '' ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Number(cRow.amount)) : ''}
                                    onBlur={e => handleCellBlur('cikis', 'amount', index, e.target.value)}
                                    disabled={!isStaff}
                                    placeholder=""
                                  />
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="border-l border-black border-r border-black h-full bg-white"></div>

                              {/* Inflow (Right Side) */}
                              <div className="flex divide-x divide-black h-full items-center border-b border-black">
                                {/* Description */}
                                <div className="w-[70%] h-full flex items-center">
                                  <input
                                    type="text"
                                    className={`w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right pr-3 text-[14px] truncate uppercase font-bold ${
                                      isInflowKasa ? 'font-bold' : 'text-gray-900'
                                    }`}
                                    style={{ color: isInflowKasa ? '#FF0000' : undefined }}
                                    defaultValue={gRow.description}
                                    onBlur={e => handleCellBlur('giris', 'description', index, e.target.value)}
                                    disabled={!isStaff}
                                    placeholder=""
                                  />
                                </div>
                                {/* Amount */}
                                <div className="w-[30%] h-full flex items-center justify-end pr-2">
                                  <input
                                    key={`giris-amt-${index}-${gRow.amount}`}
                                    type="text"
                                    className={`w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right pr-1 text-[14px] font-bold ${
                                      isInflowKasa ? 'font-bold' : 'text-gray-950'
                                    }`}
                                    style={{ color: isInflowKasa ? '#FF0000' : undefined }}
                                    defaultValue={gRow.amount !== '' ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Number(gRow.amount)) : ''}
                                    onBlur={e => handleCellBlur('giris', 'amount', index, e.target.value)}
                                    disabled={!isStaff}
                                    placeholder=""
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Sum Footer Row */}
                      <div className="grid grid-cols-[57%_14px_41%] border-t-2 border-black text-[15px] font-bold bg-gray-50 h-[34px] items-center">
                        <div className="flex justify-between items-center h-full px-3">
                          <span className="font-bold" style={{ color: '#FF0000' }}>TOPLAM</span>
                          <span className="font-bold text-gray-950">{new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(reportTotalOut)}</span>
                        </div>
                        {/* Divider */}
                        <div className="border-l border-black border-r border-black h-full bg-gray-50"></div>
                        <div className="flex justify-between items-center h-full px-3">
                          <span className="font-bold" style={{ color: '#FF0000' }}>TOPLAM</span>
                          <span className="font-bold text-gray-950">{new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(reportTotalIn)}</span>
                        </div>
                      </div>

                    </div>

                    {/* Kasa Farkı Display */}
                    <div className="flex justify-end mt-2">
                      <div className="px-5 py-2 border-2 border-black bg-white font-bold text-[17px] text-right min-w-[160px]" style={{ fontFamily: 'Calibri, sans-serif' }}>
                        <span className={reportDiff >= 0 ? 'text-blue-600' : ''} style={{ color: reportDiff < 0 ? '#FF0000' : undefined }}>
                          {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(reportDiff)}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ========================================================= */}
                {/* 2. SAYFA (ARKA YÜZ - ŞUBELER / DAĞILIM / CARİLER)          */}
                {/* ========================================================= */}
                <div className="print-page-2 w-full">
                  <RaporArkaSayfaCard
                    key={`${selectedDate}_${JSON.stringify(arkaSayfaData)}`}
                    data={arkaSayfaData}
                    onChange={(newArka) => {
                      setArkaSayfaData(newArka);
                      void saveAnaKasaReport(cikisList, girisList, newArka);
                    }}
                    isStaff={isStaff}
                    selectedDate={selectedDate}
                    isSaving={!isReportSaved}
                  />
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          TAB 2: GÜNLÜK HESAP (BANK DEFTERLERİ GRID OF CARDS)
          ------------------------------------------------------------- */}
      {activeSection === 'gunluk_hesap' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 flex-1 flex items-center gap-2">
              <Briefcase size={16} className="shrink-0" />
              <span>
                Bu alanda banka hesaplarınıza ait günlük hareketleri teker teker girerek mutabakat yapabilirsiniz.
                Banka kartlarının altında hesaplanan <strong>ALDIK / YATAN</strong> bakiye farkları, ofis bilgisayarının Excel hesap özetleriyle birebir senkronizedir.
              </span>
            </div>
            <div className="shrink-0 flex items-center no-print">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl shadow-sm">
                <span className={`w-2 h-2 rounded-full ${isLoadingGunlukHesap ? 'bg-blue-500 animate-spin' : (isGunlukHesapSaved ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping')}`}></span>
                {isLoadingGunlukHesap 
                  ? 'Veriler Yükleniyor...' 
                  : (isGunlukHesapSaved 
                      ? (hasGunlukHesapData ? 'Ofis Senkronu: Otomatik Kaydedildi' : 'Otomatik Kaydedildi') 
                      : 'Değişiklikler Kaydediliyor...')}
              </span>
            </div>
          </div>

          {/* Print-only Date Header */}
          <div className="hidden print:flex justify-between items-center w-full mb-6 border-b-2 border-black pb-2">
            <div className="text-2xl font-bold text-gray-900 uppercase">GÜNLÜK BANKA HAREKETLERİ</div>
            <div className="text-3xl font-bold" style={{ color: '#FF0000' }}>{new Date(selectedDate).toLocaleDateString('tr-TR')}</div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 print-grid">
            {DEFAULT_BANK_ORDER.map((bankName, idx) => {
              const stats = gunlukHesapBanks?.[bankName] || emptyBankData(bankName);
              
              // Determine row count (minimum 5 rows, Kuveyt minimum 10 rows, plus 2 empty rows at the bottom)
              const minRows = bankName === 'KUVEYT' ? 10 : 5;
              const maxRows = Math.max(minRows, (stats.maxRowIndex ?? -1) + 2);
              const rows = Array.from({ length: maxRows });

              return (
                <Fragment key={`${selectedDate}_${bankName}`}>
                  <div className="flex flex-col text-gray-955 print-card animate-fadeIn" style={{ fontFamily: 'Calibri, sans-serif' }}>
                    {/* Excel Table Wrapper with thick black border */}
                    <div className="border-2 border-black bg-white shadow-sm overflow-hidden flex flex-col">
                      
                      {/* Centered Bank Header with border at the bottom */}
                      <div className="relative border-b-2 border-black bg-white py-3 text-center flex items-center justify-center">
                        <h4 className="font-bold text-gray-955 tracking-widest text-lg sm:text-xl uppercase" style={{ fontFamily: 'Calibri, sans-serif' }}>{bankName}</h4>
                        {isStaff && (
                          <button 
                            onClick={() => handleAddBankRow(bankName)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded border border-brand-200"
                            title="Satır Ekle"
                          >
                            + Ekle
                          </button>
                        )}
                      </div>

                      {/* 4-Column Grid Table Headers */}
                      <div className="grid grid-cols-10 divide-x divide-black text-[13px] font-extrabold text-gray-955 border-b border-gray-300">
                        {/* Outflow Table Header (Columns 1-5: w-[50%]) */}
                        <div className="col-span-5 grid grid-cols-5 divide-x divide-gray-300">
                          <div className="col-span-2 px-1 py-1.5 text-center bg-gray-150">Tutar</div>
                          <div className="col-span-3 px-1 py-1.5 text-center bg-gray-150">Açıklama</div>
                        </div>

                        {/* Inflow Table Header (Columns 6-10: w-[50%]) */}
                        <div className="col-span-5 grid grid-cols-5 divide-x divide-gray-300">
                          <div className="col-span-2 px-1 py-1.5 text-center bg-gray-150">Tutar</div>
                          <div className="col-span-3 px-1 py-1.5 text-center bg-gray-150">Açıklama</div>
                        </div>
                      </div>

                      {/* Rows Grid */}
                      <div className="divide-y divide-gray-300">
                        {rows.map((_, index) => {
                          const outTx = stats.outflows[index];
                          const inTx = stats.inflows[index];

                          return (
                            <div key={index} className="grid grid-cols-10 divide-x divide-black h-[34px] items-center">
                              
                              {/* Outflow Half */}
                              <div className="col-span-5 grid grid-cols-5 divide-x divide-gray-300 h-full items-center">
                                <div className="col-span-2 h-full flex items-center justify-end">
                                  <input
                                    key={`out-amt-${selectedDate}-${bankName}-${index}-${outTx?.amount ?? ''}`}
                                    type="text"
                                    className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 text-right pr-2 font-bold text-gray-955 text-[15px] sm:text-[16px]"
                                    style={{ fontFamily: 'Calibri, sans-serif' }}
                                    defaultValue={outTx?.amount ? formatExcelNumber(outTx.amount) : ''}
                                    onKeyDown={e => handleGunlukHesapKeyDown(e, bankName, 'cikis-amount', index)}
                                    onBlur={e => handleGunlukHesapCellBlur(bankName, 'out-amt', e.target.value, index)}
                                    placeholder=""
                                    disabled={!isStaff}
                                    data-bank-name={bankName}
                                    data-type="cikis-amount"
                                    data-row-index={index}
                                  />
                                </div>
                                <div className="col-span-3 h-full flex items-center justify-between group/tx">
                                  <input
                                    key={`out-desc-${selectedDate}-${bankName}-${index}-${outTx?.description ?? ''}`}
                                    type="text"
                                    className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 text-left pl-2 text-gray-955 text-[15px] sm:text-[16px] truncate uppercase font-bold"
                                    style={{ fontFamily: 'Calibri, sans-serif', textTransform: 'uppercase' }}
                                    defaultValue={outTx?.description || ''}
                                    onKeyDown={e => handleGunlukHesapKeyDown(e, bankName, 'cikis-desc', index)}
                                    onBlur={e => handleGunlukHesapCellBlur(bankName, 'out-desc', e.target.value, index)}
                                    placeholder=""
                                    disabled={!isStaff}
                                    data-bank-name={bankName}
                                    data-type="cikis-desc"
                                    data-row-index={index}
                                  />
                                  {outTx && (outTx.amount || outTx.description) && isStaff && (
                                    <button 
                                      onClick={() => removeGunlukHesapRow(bankName, 'cikis', index)} 
                                      className="opacity-0 group-hover/tx:opacity-100 text-rose-500 hover:text-rose-700 shrink-0 p-0.5 mr-1"
                                      title="Satırı Temizle"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Inflow Half */}
                              <div className="col-span-5 grid grid-cols-5 divide-x divide-gray-300 h-full items-center">
                                <div className="col-span-2 h-full flex items-center justify-end">
                                  <input
                                    key={`in-amt-${selectedDate}-${bankName}-${index}-${inTx?.amount ?? ''}`}
                                    type="text"
                                    className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 text-right pr-2 font-bold text-gray-955 text-[15px] sm:text-[16px]"
                                    style={{ fontFamily: 'Calibri, sans-serif' }}
                                    defaultValue={inTx?.amount ? formatExcelNumber(inTx.amount) : ''}
                                    onKeyDown={e => handleGunlukHesapKeyDown(e, bankName, 'giris-amount', index)}
                                    onBlur={e => handleGunlukHesapCellBlur(bankName, 'in-amt', e.target.value, index)}
                                    placeholder=""
                                    disabled={!isStaff}
                                    data-bank-name={bankName}
                                    data-type="giris-amount"
                                    data-row-index={index}
                                  />
                                </div>
                                <div className="col-span-3 h-full flex items-center justify-between group/tx">
                                  <input
                                    key={`in-desc-${selectedDate}-${bankName}-${index}-${inTx?.description ?? ''}`}
                                    type="text"
                                    className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 text-left pl-2 text-gray-955 text-[15px] sm:text-[16px] truncate uppercase font-bold"
                                    style={{ fontFamily: 'Calibri, sans-serif', textTransform: 'uppercase' }}
                                    defaultValue={inTx?.description || ''}
                                    onKeyDown={e => handleGunlukHesapKeyDown(e, bankName, 'giris-desc', index)}
                                    onBlur={e => handleGunlukHesapCellBlur(bankName, 'in-desc', e.target.value, index)}
                                    placeholder=""
                                    disabled={!isStaff}
                                    data-bank-name={bankName}
                                    data-type="giris-desc"
                                    data-row-index={index}
                                  />
                                  {inTx && (inTx.amount || inTx.description) && isStaff && (
                                    <button 
                                      onClick={() => removeGunlukHesapRow(bankName, 'giris', index)} 
                                      className="opacity-0 group-hover/tx:opacity-100 text-rose-500 hover:text-rose-700 shrink-0 p-0.5 mr-1"
                                      title="Satırı Temizle"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                      {/* Sum Footer Row */}
                      <div className="grid grid-cols-10 divide-x divide-black border-t-2 border-black text-base font-bold text-gray-955 bg-white h-[34px] items-center">
                        <div className="col-span-5 grid grid-cols-5 divide-x divide-gray-300 h-full items-center">
                          <div className="col-span-2 px-3 text-right flex items-center justify-end h-full">
                            {formatExcelNumber(stats.totalOut) || '0'}
                          </div>
                          <div className="col-span-3 h-full bg-gray-50/50"></div>
                        </div>
                        <div className="col-span-5 grid grid-cols-5 divide-x divide-gray-300 h-full items-center">
                          <div className="col-span-2 px-3 text-right flex items-center justify-end h-full">
                            {formatExcelNumber(stats.totalIn) || '0'}
                          </div>
                          <div className="col-span-3 h-full bg-gray-50/50"></div>
                        </div>
                      </div>

                    </div>

                    {/* Centered difference badge under the black card box */}
                    <div className="mt-2 text-center">
                      <span 
                        className={`inline-block px-8 py-2 text-lg font-bold tracking-tight border-2 rounded-lg shadow-sm ${
                          stats.diff < 0 
                            ? 'bg-red-50 border-red-200' 
                            : stats.diff > 0 
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                        style={{ color: stats.diff <= 0 ? '#FF0000' : undefined }}
                      >
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(stats.diff)} {stats.diffType}
                      </span>
                    </div>
                  </div>
                  {(idx === 3 || idx === 9) && (
                    <div className="hidden print:block page-break col-span-2" />
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CASHBOX MODAL
          ------------------------------------------------------------- */}
      <Modal
        open={cashboxOpen}
        onClose={() => setCashboxOpen(false)}
        title={editingCashbox ? 'Kasa Hareketini Düzenle' : 'Yeni Kasa Hareketi Ekle'}
      >
        <form onSubmit={e => { e.preventDefault(); void saveCashbox(); }} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">İşlem Tipi</label>
              <select
                className="input w-full"
                value={cashboxForm.transaction_type}
                onChange={e => setCashboxForm(prev => ({ ...prev, transaction_type: e.target.value as 'gelir' | 'gider' }))}
              >
                <option value="gelir">Kasa Girişi (Giriş)</option>
                <option value="gider">Kasa Çıkışı (Çıkış)</option>
              </select>
            </div>

            <div>
              <label className="label">Şirket</label>
              <select
                className="input w-full font-medium"
                value={cashboxForm.company}
                onChange={e => setCashboxForm(prev => ({ ...prev, company: e.target.value as any }))}
              >
                <option value="">Genel / Şirket Dışı</option>
                <option value="Etik Et">Etik Et ve Et Ürünleri</option>
                <option value="Marif Et">Marif Et ve Et Ürünleri</option>
              </select>
            </div>

            <div>
              <label className="label">Tutar</label>
              <input
                type="number"
                step="0.01"
                required
                className="input w-full font-bold text-sm"
                placeholder="0.00"
                value={cashboxForm.amount}
                onChange={e => setCashboxForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Döviz</label>
              <select
                className="input w-full"
                value={cashboxForm.currency}
                onChange={e => setCashboxForm(prev => ({ ...prev, currency: e.target.value as any }))}
              >
                <option value="TRY">TRY (TL)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="label">Tarih</label>
              <input
                type="date"
                required
                className="input w-full"
                value={cashboxForm.transaction_date}
                onChange={e => setCashboxForm(prev => ({ ...prev, transaction_date: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Kategori</label>
              <select
                className="input w-full"
                value={cashboxForm.category}
                onChange={e => setCashboxForm(prev => ({ ...prev, category: e.target.value }))}
              >
                {defaultCategories[cashboxForm.transaction_type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">
              {cashboxForm.transaction_type === 'gelir' ? 'Ödeyen Şahıs / Firma / Banka' : 'Alıcı Şahıs / Firma / Banka'}
            </label>
            <input
              type="text"
              required
              className="input w-full"
              placeholder={cashboxForm.transaction_type === 'gelir' ? 'Örn: ALİ ACAR veya ZİRAAT' : 'Örn: MUSTAFA KARAERKEK veya AKBANK'}
              value={cashboxForm.recipient_payer}
              onChange={e => setCashboxForm(prev => ({ ...prev, recipient_payer: e.target.value }))}
            />
          </div>

          {/* Conditional Bank Account Selector */}
          {(cashboxForm.category.includes('Banka') || cashboxForm.category.includes('Bankaya')) && (
            <div>
              <label className="label">İlişkili Banka Hesabı</label>
              <select
                className="input w-full"
                value={cashboxForm.bank_account_id}
                onChange={e => setCashboxForm(prev => ({ ...prev, bank_account_id: e.target.value }))}
              >
                <option value="">Hesap Seçin (Opsiyonel)</option>
                {bankAccounts
                  .filter(acc => acc.currency === cashboxForm.currency)
                  .map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bank} - {acc.account_name} ({acc.currency})
                    </option>
                  ))
                }
              </select>
            </div>
          )}

          <div>
            <label className="label">Açıklama</label>
            <textarea
              className="input w-full h-16 resize-none"
              placeholder="Açıklama..."
              value={cashboxForm.description}
              onChange={e => setCashboxForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Exclude inter-company transfers checkbox */}
          <div className="flex items-center gap-2 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
            <input
              type="checkbox"
              id="exclude_from_report"
              className="h-4.5 w-4.5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              checked={cashboxForm.exclude_from_report}
              onChange={e => setCashboxForm(prev => ({ ...prev, exclude_from_report: e.target.checked }))}
            />
            <div>
              <label htmlFor="exclude_from_report" className="text-xs font-bold text-amber-900 cursor-pointer">
                Şirketler Arası Transfer mi? (Ana Kasa Raporundan Hariç Tut)
              </label>
              <p className="text-[10px] text-amber-700">
                Bu seçeneği işaretlerseniz, işlem veritabanında saklanır fakat ana bakiye raporundan gizlenir.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Fatura / Makbuz Belgesi</label>
            <div className="flex items-center gap-2 border border-dashed border-gray-200 rounded-lg p-2 bg-gray-50/50">
              <ArrowDownToLine size={16} className="text-gray-400 shrink-0" />
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                onChange={e => setManualFile(e.target.files?.[0])}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button type="button" className="btn btn-secondary" onClick={() => setCashboxOpen(false)} disabled={savingCashbox}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingCashbox}>
              {savingCashbox ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>


    </div>
  );
}
