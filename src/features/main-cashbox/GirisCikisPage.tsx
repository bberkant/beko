import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  RefreshCw, 
  Download, 
  Printer,
  X,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { formatDateTr } from './components/CashboxDateFilterBar';

// Interfaces
export interface SearchResultItem {
  date: string;
  category: 'GİRİŞ' | 'ÇIKIŞ' | 'ANA KASA' | 'POS';
  description: string;
  bankOrType: string;
  amount: string | number;
}

export interface GirisItem {
  posCari?: string;
  description: string;
  bankOrType?: string;
  amount: number | string | '';
}

export interface CikisItem {
  description: string;
  bankOrType: string;
  amount: number | string | '';
}

export interface AnaKasaItem {
  name: string;
  devir: number | string | '';
  movement: number | string | '';
  pos: number | string | '';
  duzeltme?: number | string | '';
  gunSonu?: number | string | '';
}

export interface PosItem {
  bank: string;
  amount: number | string | '';
}

const DEFAULT_POS_BANKS = [
  'AKBANK', 'ZİRAAT', 'HALK', 'GARANTİ', 'VAKIF', 'YAPI', 
  'ŞEKER', 'KUVEYT', 'DENİZ', 'Ö.ZİRAAT', 'TEB', 'ALBARAKA'
];

const DEFAULT_ANA_KASA_ACCOUNTS = [
  'CEM', 'KASA', 'DEPO', 'AKBANK', 'ZİRAAT', 'HALK', 'GARANTİ', 'VAKIF', 
  'YAPI', 'ŞEKER', 'ALBARAKA', 'KUVEYT', 'DENİZ', 'Ö.ZİRAAT', 'ÖNDER BCH', 
  'BURAK', 'HASAN', 'VADELİ', 'NECO', 'FİBA + -', 'AKBANK + -', 'İŞBANK + -', 
  'ORDU MARKET AKTA', 'ESKİŞEHİR', 'CEM-KUVEYT', 'CELO', 'FAZİLET 10+10+10+10', 
  'FAZİLET 10 GR', 'BURAK BESİ-SSK', 'AKBANK SİGORTA', 'NEJDET SÖYLEMZ', 
  'DURSUN AYDIN', 'HALİL İBRAHİM BAŞ', 'TEB'
];

const ANA_KASA_ROWS = 42; // Ana Kasa sabit 42 satır
const DEFAULT_GIRIS_ROWS = 65; // Giriş 65 satır
const DEFAULT_CIKIS_ROWS = 65; // Çıkış 65 satır (Giriş ile tam eşit hizada)

// Check if description is a special red branch / transfer label
const isRedLabel = (desc: string) => {
  const upper = (desc || '').trim().toLocaleUpperCase('tr-TR');
  if (!upper) return false;

  const exact = [
    'DEVİR BAKİYE',
    'DEVIR BAKIYE',
    'MERKEZ',
    'MERZİFON',
    'MERZIFON',
    'ATAKUM',
    'İLKADIM',
    'ILKADIM',
    'DEPO',
    'SUCUKHANE',
    'TOPLAM',
    'POSLAR'
  ];
  if (exact.includes(upper)) return true;

  if (upper.includes('MERKEZ ÇIKIŞ') || upper.includes('MERKEZ CIKIS')) return true;
  if (upper.includes('DEPO ÇIKIŞ') || upper.includes('DEPO CIKIS')) return true;
  if (upper.includes('DEPO DEVİR') || upper.includes('DEPO DEVIR')) return true;
  if (upper.includes('DEVİR DEPO') || upper.includes('DEVIR DEPO')) return true;
  if (upper.includes('DEVİR BAKİYE') || upper.includes('DEVIR BAKIYE')) return true;
  if (upper.startsWith('DEVİR') || upper.startsWith('DEVIR')) return true;
  if (upper.includes('ATAKUM DEVİR') || upper.includes('ATAKUM DEVIR')) return true;

  return false;
};

const normalizeGirisList = (list: any[]): GirisItem[] => {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    let description = item.description || '';
    let bankOrType = item.bankOrType || '';
    
    // If an older record had posCari set, ensure description reflects the actual cari name
    if (item.posCari) {
      if (!description || description === item.bankOrType) {
        description = item.posCari;
      }
    }

    return {
      description,
      bankOrType,
      amount: item.amount !== undefined && item.amount !== null ? item.amount : ''
    };
  });
};

const fitGirisRows = (raw: any[]): GirisItem[] => {
  const list = normalizeGirisList(raw);
  let lastNonEmpty = -1;
  list.forEach((it, i) => {
    if (it.amount !== '' || (it.description && !isRedLabel(it.description)) || it.bankOrType) {
      lastNonEmpty = i;
    }
  });
  const targetLen = Math.max(DEFAULT_GIRIS_ROWS, lastNonEmpty + 1);
  const result = list.slice(0, targetLen);
  while (result.length < DEFAULT_GIRIS_ROWS) {
    result.push({ description: '', bankOrType: '', amount: '' });
  }
  return result;
};

const fitCikisRows = (raw: any[]): CikisItem[] => {
  if (!Array.isArray(raw)) return [];
  let lastNonEmpty = -1;
  raw.forEach((it, i) => {
    if (it && (it.amount !== '' || it.description || it.bankOrType)) {
      lastNonEmpty = i;
    }
  });
  const targetLen = Math.max(DEFAULT_CIKIS_ROWS, lastNonEmpty + 1);
  const result: CikisItem[] = raw.slice(0, targetLen).map(it => ({
    description: it.description || '',
    bankOrType: it.bankOrType || '',
    amount: it.amount !== undefined && it.amount !== null ? it.amount : ''
  }));
  while (result.length < DEFAULT_CIKIS_ROWS) {
    result.push({ description: '', bankOrType: '', amount: '' });
  }
  return result;
};

// Numbers & Currency Format Helpers
const parseNum = (val: number | string | '' | undefined | null): number => {
  if (val === '' || val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let s = String(val).trim();
  if (!s) return 0;
  
  // Check negative
  const isNegative = s.startsWith('-') || s.endsWith('-');
  s = s.replace(/-/g, '');

  // If string has dots and commas, determine format
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/\./g, '');
    }
  }

  const clean = s.replace(/[^0-9.]/g, '');
  const res = parseFloat(clean);
  if (isNaN(res)) return 0;
  return isNegative ? -res : res;
};

const formatAnaKasaNumber = (val: number | string | '' | undefined | null): string => {
  if (val === '' || val === undefined || val === null) return '';
  const num = typeof val === 'number' ? val : parseNum(val);
  if (num === 0 && val === '') return '';
  const hasDecimals = num % 1 !== 0;
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  }).format(num);
};

const calcRowGunSonu = (name: any, devir: any, movement: any, pos: any, duzeltme: any): string => {
  const upper = String(name || '').trim().toLocaleUpperCase('tr-TR');
  const isKasa = upper === 'KASA';
  const devirNum = parseNum(devir);
  const moveNum = parseNum(movement);
  const posNum = parseNum(pos);
  const duzNum = parseNum(duzeltme);
  const hasInput = (devir !== '' && devir !== undefined && devir !== null) ||
                   (movement !== '' && movement !== undefined && movement !== null) ||
                   (pos !== '' && pos !== undefined && pos !== null) ||
                   (duzeltme !== '' && duzeltme !== undefined && duzeltme !== null);
  if (!hasInput && !name) return '';
  const computed = isKasa ? (moveNum + posNum + duzNum) : (devirNum + moveNum + posNum + duzNum);
  if (computed === 0 && !hasInput) return '';
  return formatAnaKasaNumber(computed);
};

const fitAnaKasaRows = (raw: any[]): AnaKasaItem[] => {
  if (!Array.isArray(raw)) return [];
  const sanitized = raw.map((item) => {
    if (!item) {
      return {
        name: '',
        devir: '',
        movement: '',
        pos: '',
        duzeltme: '',
        gunSonu: ''
      };
    }
    const rawName = String(item.name || '').trim();
    const upper = rawName.toLocaleUpperCase('tr-TR');
    const isSummary = upper.includes('TOPLAM') || 
                      upper.includes('KALAN') || 
                      upper.startsWith('KASA:') || 
                      upper.startsWith('GİRİŞ') || 
                      upper.startsWith('GIRIS') || 
                      upper.startsWith('ÇIKIŞ') || 
                      upper.startsWith('CIKIS') ||
                      upper.includes('FAZLA VERMİŞ') ||
                      upper.includes('EKSİK VERMİŞ');

    // If it has no valid account name or is a summary label, keep name empty and numerical fields empty
    if (!rawName || isSummary) {
      return {
        name: '',
        devir: '',
        movement: '',
        pos: '',
        duzeltme: '',
        gunSonu: ''
      };
    }

    const isKasa = upper === 'KASA';
    const devirNum = parseNum(item.devir);
    const moveNum = parseNum(item.movement);
    const posNum = parseNum(item.pos);
    const duzNum = parseNum(item.duzeltme);

    let gunSonu = item.gunSonu !== undefined && item.gunSonu !== null && String(item.gunSonu).trim() !== ''
      ? String(item.gunSonu).trim()
      : '';

    // If gunSonu is empty, calculate it automatically from devir, movement, pos, duzeltme!
    if (!gunSonu && (item.devir !== '' || item.movement !== '' || item.pos !== '' || item.duzeltme !== '')) {
      const computed = isKasa ? (moveNum + posNum + duzNum) : (devirNum + moveNum + posNum + duzNum);
      if (computed !== 0 || item.movement !== '' || item.pos !== '' || item.duzeltme !== '') {
        gunSonu = formatAnaKasaNumber(computed);
      }
    }

    return {
      name: rawName,
      devir: item.devir !== undefined && item.devir !== null ? item.devir : '',
      movement: item.movement !== undefined && item.movement !== null ? item.movement : '',
      pos: item.pos !== undefined && item.pos !== null ? item.pos : '',
      duzeltme: item.duzeltme !== undefined && item.duzeltme !== null ? item.duzeltme : '',
      gunSonu
    };
  });

  while (sanitized.length < ANA_KASA_ROWS) {
    sanitized.push({
      name: '',
      devir: '',
      movement: '',
      pos: '',
      duzeltme: '',
      gunSonu: ''
    });
  }

  return sanitized.slice(0, ANA_KASA_ROWS);
};

const getYesterdayStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function GirisCikisPage() {
  const { notify } = useToast();

  // Selected date & Range (Varsayılan olarak dünün tarihi açılır)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getYesterdayStr();
  });

  const [startDate, setStartDate] = useState<string>(() => {
    return getYesterdayStr();
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return getYesterdayStr();
  });
  const [isRange, setIsRange] = useState(false);

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const prevStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(prevStr);
    setIsRange(false);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const nextStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextStr);
    setIsRange(false);
  };

  const handleToday = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setSelectedDate(todayStr);
    setIsRange(false);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  // Positioned Data Arrays (Giriş 65 satır, Çıkış 64 satır, Ana Kasa 42 satır)
  const [girisList, setGirisList] = useState<GirisItem[]>(() => {
    const list: GirisItem[] = Array.from({ length: DEFAULT_GIRIS_ROWS }, () => ({ description: '', bankOrType: '', amount: '' }));
    list[0] = { description: 'DEVİR BAKİYE', bankOrType: '', amount: '' };
    list[1] = { description: 'MERKEZ', bankOrType: '', amount: '' };
    list[2] = { description: 'ÇIKIŞ', bankOrType: 'Ö.ZİRAAT', amount: '' };
    list[3] = { description: 'MERZİFON', bankOrType: '', amount: '' };
    list[4] = { description: 'GARANTİ', bankOrType: '', amount: '' };
    list[5] = { description: 'ZİRAAT', bankOrType: '', amount: '' };
    list[6] = { description: 'AKBANK', bankOrType: '', amount: '' };
    list[7] = { description: 'ATAKUM', bankOrType: '', amount: '' };
    list[8] = { description: 'KUVEYT', bankOrType: '', amount: '' };
    list[9] = { description: 'HALK', bankOrType: '', amount: '' };
    list[10] = { description: 'GARANTİ', bankOrType: '', amount: '' };
    list[11] = { description: 'ALBARAKA', bankOrType: '', amount: '' };
    list[12] = { description: 'ZİRAAT', bankOrType: '', amount: '' };
    list[13] = { description: 'İLKADIM', bankOrType: '', amount: '' };
    list[14] = { description: 'ZİRAAT', bankOrType: '', amount: '' };
    list[15] = { description: 'DENİZ', bankOrType: '', amount: '' };
    list[16] = { description: 'KUVEYT', bankOrType: '', amount: '' };
    list[17] = { description: 'DEPO', bankOrType: '', amount: '' };
    return list;
  });

  const [cikisList, setCikisList] = useState<CikisItem[]>(() => {
    const list: CikisItem[] = Array.from({ length: DEFAULT_CIKIS_ROWS }, () => ({ description: '', bankOrType: '', amount: '' }));
    list[0] = { description: 'MERKEZ ÇIKIŞ', bankOrType: '', amount: '' };
    list[1] = { description: 'DEPO ÇIKIŞ', bankOrType: '', amount: '' };
    list[2] = { description: 'DEPO DEVİR - MERZİFON', bankOrType: '', amount: '' };
    return list;
  });

  const [anaKasaList, setAnaKasaList] = useState<AnaKasaItem[]>(() => {
    const list: AnaKasaItem[] = Array.from({ length: ANA_KASA_ROWS }, (_, i) => ({
      name: DEFAULT_ANA_KASA_ACCOUNTS[i] || '',
      devir: '',
      movement: '',
      pos: ''
    }));
    return list;
  });

  const [posList, setPosList] = useState<PosItem[]>(() => {
    return DEFAULT_POS_BANKS.map(bank => ({ bank, amount: '' }));
  });

  const storageKey = `giris_cikis_v4_${selectedDate}`;
  const [lastSyncSource, setLastSyncSource] = useState<string>('');
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const lastGirisCikisUpdatedAtRef = useRef<string>('');

  // Load from Supabase (with continuous background polling & fallback to localStorage / template)
  useEffect(() => {
    let isCancelled = false;

    async function loadData(isSilent = false) {
      if (!isSilent) setIsLoadingDb(true);
      try {
        // 1. Try Supabase first
        const { data, error } = await supabase
          .from('cashbox_giris_cikis_reports')
          .select('*')
          .eq('report_date', selectedDate)
          .maybeSingle();

        if (!isCancelled) {
          if (data && !error) {
            if (isSilent && data.updated_at && data.updated_at === lastGirisCikisUpdatedAtRef.current) {
              return;
            }
            lastGirisCikisUpdatedAtRef.current = data.updated_at || '';

            if (Array.isArray(data.giris_list) && data.giris_list.length > 0) {
              setGirisList(fitGirisRows(data.giris_list));
            }
            if (Array.isArray(data.cikis_list) && data.cikis_list.length > 0) {
              setCikisList(fitCikisRows(data.cikis_list));
            }
            if (Array.isArray(data.ana_kasa_list || data.anaKasa_list) && (data.ana_kasa_list || data.anaKasa_list).length > 0) {
              setAnaKasaList(fitAnaKasaRows(data.ana_kasa_list || data.anaKasa_list));
            }
            if (Array.isArray(data.pos_list) && data.pos_list.length > 0) {
              setPosList(data.pos_list);
            }

            setLastSyncSource(data.source || 'office_pc_sync');
            setIsSaved(true);
            if (!isSilent) setIsLoadingDb(false);
            return;
          } else if (!isSilent) {
            lastGirisCikisUpdatedAtRef.current = '';
            // Supabase'de veri yok: Bu gün kesinlikle boştur, eski localStorage çöpünü temizle!
            localStorage.removeItem(storageKey);

            const gList: GirisItem[] = Array.from({ length: DEFAULT_GIRIS_ROWS }, () => ({ description: '', bankOrType: '', amount: '' }));
            gList[0] = { description: 'DEVİR BAKİYE', bankOrType: '', amount: '' };
            gList[1] = { description: 'MERKEZ', bankOrType: '', amount: '' };
            gList[2] = { description: 'ÇIKIŞ', bankOrType: 'Ö.ZİRAAT', amount: '' };
            gList[3] = { description: 'MERZİFON', bankOrType: '', amount: '' };
            gList[4] = { description: 'GARANTİ', bankOrType: '', amount: '' };
            gList[5] = { description: 'ZİRAAT', bankOrType: '', amount: '' };
            gList[6] = { description: 'AKBANK', bankOrType: '', amount: '' };
            gList[7] = { description: 'ATAKUM', bankOrType: '', amount: '' };
            gList[8] = { description: 'KUVEYT', bankOrType: '', amount: '' };
            gList[9] = { description: 'HALK', bankOrType: '', amount: '' };
            gList[10] = { description: 'GARANTİ', bankOrType: '', amount: '' };
            gList[11] = { description: 'ALBARAKA', bankOrType: '', amount: '' };
            gList[12] = { description: 'ZİRAAT', bankOrType: '', amount: '' };
            gList[13] = { description: 'İLKADIM', bankOrType: '', amount: '' };
            gList[14] = { description: 'ZİRAAT', bankOrType: '', amount: '' };
            gList[15] = { description: 'DENİZ', bankOrType: '', amount: '' };
            gList[16] = { description: 'KUVEYT', bankOrType: '', amount: '' };
            gList[17] = { description: 'DEPO', bankOrType: '', amount: '' };
            setGirisList(gList);

            const cList: CikisItem[] = Array.from({ length: DEFAULT_CIKIS_ROWS }, () => ({ description: '', bankOrType: '', amount: '' }));
            cList[0] = { description: 'MERKEZ ÇIKIŞ', bankOrType: '', amount: '' };
            cList[1] = { description: 'DEPO ÇIKIŞ', bankOrType: '', amount: '' };
            cList[2] = { description: 'DEPO DEVİR - MERZİFON', bankOrType: '', amount: '' };
            setCikisList(cList);

            setAnaKasaList(Array.from({ length: ANA_KASA_ROWS }, (_, i) => ({
              name: DEFAULT_ANA_KASA_ACCOUNTS[i] || '',
              devir: '',
              movement: '',
              pos: ''
            })));

            setPosList(DEFAULT_POS_BANKS.map(bank => ({ bank, amount: '' })));
            setLastSyncSource('');
            setIsSaved(true);
            setIsLoadingDb(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Supabase fetch error:', err);
      } finally {
        if (!isCancelled && !isSilent) {
          setIsSaved(true);
          setIsLoadingDb(false);
        }
      }
    }

    void loadData(false);

    // Her 5 saniyede bir ofisten yeni gelen verileri otomatik ve sessizce çeker
    const pollTimer = setInterval(() => {
      void loadData(true);
    }, 5000);

    // Supabase Realtime Subscription for this date
    const channel = supabase
      .channel(`cashbox_sync_${selectedDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cashbox_giris_cikis_reports',
          filter: `report_date=eq.${selectedDate}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            void loadData(true);
          }
        }
      )
      .subscribe();

    return () => {
      isCancelled = true;
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [selectedDate, storageKey, refreshKey]);

  // Live Multi-Date Search Engine across Supabase
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
        let queryBuilder = supabase
          .from('cashbox_giris_cikis_reports')
          .select('report_date, pos_list, giris_list, cikis_list, ana_kasa_list')
          .order('report_date', { ascending: false });

        if (isRange && startDate && endDate) {
          queryBuilder = queryBuilder.gte('report_date', startDate).lte('report_date', endDate);
        }

        const { data, error } = await queryBuilder;
        if (isCancelled || error || !data) {
          if (!isCancelled) setIsSearching(false);
          return;
        }

        const results: SearchResultItem[] = [];
        for (const row of data) {
          // 1. Check Giriş
          for (const g of row.giris_list || []) {
            const hasPosMatch = g.posCari && g.posCari.toLocaleLowerCase('tr-TR').includes(q);
            const hasDescMatch = g.description && g.description.toLocaleLowerCase('tr-TR').includes(q);
            const hasBankMatch = g.bankOrType && g.bankOrType.toLocaleLowerCase('tr-TR').includes(q);

            if (hasPosMatch || hasDescMatch || hasBankMatch) {
              const displayDesc = g.posCari
                ? `${g.posCari} (${g.description})`
                : (g.description || '');

              results.push({
                date: row.report_date,
                category: 'GİRİŞ',
                description: displayDesc,
                bankOrType: g.bankOrType || (g.posCari ? g.description : ''),
                amount: g.amount || ''
              });
            }
          }

          // 2. Check Çıkış
          for (const c of row.cikis_list || []) {
            if (
              (c.description && c.description.toLocaleLowerCase('tr-TR').includes(q)) ||
              (c.bankOrType && c.bankOrType.toLocaleLowerCase('tr-TR').includes(q))
            ) {
              results.push({
                date: row.report_date,
                category: 'ÇIKIŞ',
                description: c.description || '',
                bankOrType: c.bankOrType || '',
                amount: c.amount || ''
              });
            }
          }

          // 3. Check Ana Kasa
          for (const a of row.ana_kasa_list || []) {
            if (a.name && a.name.toLocaleLowerCase('tr-TR').includes(q)) {
              results.push({
                date: row.report_date,
                category: 'ANA KASA',
                description: a.name,
                bankOrType: `Devir: ${a.devir || '0'}`,
                amount: a.movement || a.pos || ''
              });
            }
          }

          // 4. Check POS
          for (const p of row.pos_list || []) {
            if (p.bank && p.bank.toLocaleLowerCase('tr-TR').includes(q)) {
              results.push({
                date: row.report_date,
                category: 'POS',
                description: p.bank,
                bankOrType: 'POS',
                amount: p.amount || ''
              });
            }
          }
        }

        if (!isCancelled) {
          setSearchResults(results);
          setIsSearching(false);
        }
      } catch (err) {
        if (!isCancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isRange, startDate, endDate]);

  // Numbers & Currency Format
  const parseNum = (val: any): number => {
    if (val === '' || val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let s = String(val).trim();
    if (!s) return 0;
    
    // Check negative
    const isNegative = s.startsWith('-');
    s = s.replace(/-/g, '');

    // If string has dots and commas, determine format
    if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    } else if (s.includes('.')) {
      const parts = s.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        s = s.replace(/\./g, '');
      }
    }

    const clean = s.replace(/[^0-9.]/g, '');
    const res = parseFloat(clean);
    if (isNaN(res)) return 0;
    return isNegative ? -res : res;
  };

  const formatExcel = (val: number | string | ''): string => {
    if (val === '' || val === undefined || val === null) return '';
    const num = typeof val === 'number' ? val : parseNum(val);
    if (num === 0 && val === '') return '';
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Ana Kasa integer/tam sayı formatı (,00 olmadan 1.000.000)
  const formatAnaKasa = (val: number | string | ''): string => {
    if (val === '' || val === undefined || val === null) return '';
    const num = typeof val === 'number' ? val : parseNum(val);
    if (num === 0 && val === '') return '';
    const hasDecimals = num % 1 !== 0;
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatMoney = (num: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Calculated totals: DEVİR BAKİYE dahil tüm satırlar toplanır
  const calcGirisTotal = useMemo(() => {
    return girisList.reduce((sum, item) => sum + parseNum(item.amount), 0);
  }, [girisList]);

  const calcCikisTotal = useMemo(() => {
    return cikisList.reduce((sum, item) => sum + parseNum(item.amount), 0);
  }, [cikisList]);

  const calcPosTotal = useMemo(() => {
    return posList.reduce((sum, item) => sum + parseNum(item.amount), 0);
  }, [posList]);

  // TOPLAM KASA BAKİYESİ: ANA KASA'daki SONU (R) sütununun toplamıdır
  const calcAnaKasaTotal = useMemo(() => {
    return anaKasaList.reduce((sum, item) => {
      if (item.gunSonu !== undefined && item.gunSonu !== '' && item.gunSonu !== null) {
        return sum + parseNum(item.gunSonu);
      }
      if (item.name || item.devir || item.movement || item.pos || item.duzeltme) {
        const upper = String(item.name || '').trim().toLocaleUpperCase('tr-TR');
        const isKasa = upper === 'KASA';
        const devirNum = parseNum(item.devir);
        const moveNum = parseNum(item.movement);
        const posNum = parseNum(item.pos);
        const duzNum = parseNum(item.duzeltme);
        const computed = isKasa ? (moveNum + posNum + duzNum) : (devirNum + moveNum + posNum + duzNum);
        return sum + computed;
      }
      return sum;
    }, 0);
  }, [anaKasaList]);

  // TÜM TOPLAMLAR TABLOLARDAN DİNAMİK VE DOĞRUDAN HESAPLANIR
  const posTotal = calcPosTotal;
  const girisTotal = calcGirisTotal; // Devir bakiye dahil tüm girişler
  const cikisTotal = calcCikisTotal; // Tüm çıkışlar
  const netKalan = girisTotal - cikisTotal; // Devir dahil Giriş-Çıkış Kalanı
  const anaKasaTotal = calcAnaKasaTotal; // Ana Kasa Sonu sütununun toplamı
  const bakiyeFarki = anaKasaTotal - netKalan;

  // Auto Save to localStorage and Supabase (Only when user explicitly edits)
  const isUserDirtyRef = useRef(false);

  useEffect(() => {
    if (!isUserDirtyRef.current) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const payload = {
          date: selectedDate,
          girisList,
          cikisList,
          anaKasaList,
          posList,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));

        // Save to Supabase
        await supabase
          .from('cashbox_giris_cikis_reports')
          .upsert({
            report_date: selectedDate,
            pos_list: posList,
            giris_list: girisList,
            cikis_list: cikisList,
            ana_kasa_list: anaKasaList,
            pos_total: posTotal,
            giris_total: girisTotal,
            cikis_total: cikisTotal,
            net_kalan: netKalan,
            ana_kasa_total: anaKasaTotal,
            bakiye_farki: bakiyeFarki,
            source: 'web_app',
            updated_at: new Date().toISOString()
          }, { onConflict: 'report_date' });

        setIsSaved(true);
        isUserDirtyRef.current = false;
      } catch (err) {
        console.error('Supabase auto-save error:', err);
      }
    }, 600);

    setIsSaved(false);
    return () => clearTimeout(timer);
  }, [girisList, cikisList, anaKasaList, posList, storageKey, selectedDate, posTotal, girisTotal, cikisTotal, netKalan, anaKasaTotal, bakiyeFarki]);

  // Keyboard navigation across cells
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: string,
    rowIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = document.querySelector(`input[data-col="${type}"][data-row="${rowIndex + 1}"]`) as HTMLInputElement | null;
      if (next) { next.focus(); next.select(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = document.querySelector(`input[data-col="${type}"][data-row="${rowIndex - 1}"]`) as HTMLInputElement | null;
      if (prev) { prev.focus(); prev.select(); }
    }
  };

  // Her zaman Giriş'i N, Çıkış'ı N - 1 hizada tutarak satır ekler
  const addTenRows = () => {
    setGirisList(prev => [...prev, ...Array.from({ length: 10 }, () => ({ description: '', bankOrType: '', amount: '' }))]);
    setCikisList(prev => [...prev, ...Array.from({ length: 10 }, () => ({ description: '', bankOrType: '', amount: '' }))]);
  };

  // Excel Export
  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const data: (string | number)[][] = [];

      data.push(['AĞUSTOS-2026 GİRİŞ ÇIKIŞ & ANA KASA GÜNLÜK RAPORU - TARİH: ' + selectedDate]);
      data.push([]);
      data.push([
        'ÇIKIŞ (Açıklama / Cari)', 'Banka / Tür', 'ÇIKIŞ Tutar',
        'POS Bankası', 'POS Tutarı',
        'GİRİŞ (Açıklama / Cari)', 'GİRİŞ Banka / Tür', 'GİRİŞ Tutar',
        'ANA KASA (Hesap / Kişi)', 'Devir (L)', 'Hareket (N)', 'POS (O)', 'Banka Düzeltmeleri (P)', 'Gün Sonu (R)'
      ]);

      const maxRows = Math.max(cikisList.length, posList.length, girisList.length, anaKasaList.length);
      for (let i = 0; i < maxRows; i++) {
        const c = cikisList[i] || { description: '', bankOrType: '', amount: '' };
        const p = posList[i] || { bank: '', amount: '' };
        const g = girisList[i] || { description: '', bankOrType: '', amount: '' };
        const ak = anaKasaList[i] || { name: '', devir: '', movement: '', pos: '', duzeltme: '', gunSonu: '' };
        const gunSonu = ak.gunSonu !== undefined && ak.gunSonu !== '' ? parseNum(ak.gunSonu) : '';

        data.push([
          c.description, c.bankOrType, c.amount !== '' ? parseNum(c.amount) : '',
          p.bank, p.amount !== '' ? parseNum(p.amount) : '',
          g.description, g.bankOrType || '', g.amount !== '' ? parseNum(g.amount) : '',
          ak.name, ak.devir !== '' ? parseNum(ak.devir) : '', ak.movement !== '' ? parseNum(ak.movement) : '', ak.pos !== '' ? parseNum(ak.pos) : '',
          ak.duzeltme !== undefined && ak.duzeltme !== '' ? parseNum(ak.duzeltme) : '',
          gunSonu !== '' ? Number(gunSonu) : ''
        ]);
      }

      data.push([]);
      data.push(['ÇIKIŞ TOPLAMI:', '', cikisTotal, 'POS TOPLAMI:', posTotal, 'GİRİŞ TOPLAMI:', '', girisTotal, 'TOPLAM KASA BAKİYESİ:', '', '', '', '', anaKasaTotal]);
      data.push(['', '', '', '', '', 'NET KALAN:', '', netKalan, 'GİRİŞ-ÇIKIŞ KALANI:', '', '', '', '', netKalan]);
      data.push(['', '', '', '', '', '', '', '', 'BAKİYE FARKI:', '', '', '', '', bakiyeFarki]);

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, `GIRIS_CIKIS_${selectedDate}`);
      XLSX.writeFile(wb, `Giris_Cikis_Raporu_${selectedDate}.xlsx`);
      notify('Excel dosyası başarıyla indirildi.', 'success');
    } catch (e) {
      notify('Excel dışa aktarım hatası.', 'error');
    }
  };

  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  }, [selectedDate]);

  return (
    <div className="w-full max-w-full space-y-4 pb-12 overflow-x-hidden" style={{ fontFamily: 'Calibri, "Segoe UI", sans-serif' }}>
      
      {/* Top Standard Header & Filter Bar (Matching Ana Kasa Günlük Rapor) */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm no-print">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Ana Kasa ve Banka Yönetimi
            </h1>
            <p className="text-xs text-gray-500">
              Şirket kasalarını ve günlük banka hesap hareketlerini tek ekranda yönetin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshKey(k => k + 1);
                notify('Veriler yenileniyor...', 'info');
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm"
            >
              <RefreshCw size={13} />
              Yenile
            </button>
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm"
            >
              <Download size={13} />
              Dışa Aktar
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm"
            >
              <Printer size={13} />
              Yazdır
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Arama Input */}
            <div className="relative flex-1 min-w-[280px] max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Açıklama, cari veya banka ara... (örn: tarım, akbank, celo)"
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Arama Çubuğu ile Aralık Tarihi Arasındaki Hızlı Tarih Seçici / Navigasyon */}
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg p-0.5 shadow-xs">
              <button
                type="button"
                onClick={handlePrevDay}
                title="Önceki Gün"
                className="p-1.5 text-gray-600 hover:text-black hover:bg-white rounded transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-gray-800 shadow-2xs">
                <Calendar size={14} className="text-blue-600 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setIsRange(false);
                  }}
                  className="bg-transparent border-0 font-bold text-gray-900 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                title="Sonraki Gün"
                className="p-1.5 text-gray-600 hover:text-black hover:bg-white rounded transition-colors"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="ml-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
              >
                Bugün
              </button>
            </div>

            {/* Tarih Aralığı Filtresi */}
            <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600">
              <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold uppercase tracking-wider text-[11px]">
                <input
                  type="checkbox"
                  checked={isRange}
                  onChange={(e) => setIsRange(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                ARALIK:
              </label>
              <div className={`flex items-center gap-1 transition-opacity duration-200 ${isRange ? 'opacity-100' : 'opacity-40'}`}>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setIsRange(true);
                  }}
                  className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-800"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setIsRange(true);
                  }}
                  className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-800"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arama Sonuçları Paneli (Arama Yapıldığında Açılır) */}
      {searchQuery.trim().length >= 2 && (
        <div className="bg-white border-2 border-brand-500/80 rounded-xl shadow-md p-4 space-y-3 no-print transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                <Search size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-gray-900">
                    Arama Sonuçları:
                  </h3>
                  <span className="text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full text-xs font-bold">
                    "{searchQuery}"
                  </span>
                  {isSearching && (
                    <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-bold animate-pulse">
                      <RefreshCw size={12} className="animate-spin" /> Arıyor...
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  {isRange ? `${formatDateTr(startDate)} ile ${formatDateTr(endDate)} tarihleri arasında` : 'Tüm geçmiş kasalarda'}{' '}
                  toplam <span className="font-bold text-gray-900">{searchResults.length}</span> eşleşen hareket bulundu.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-gray-400">Bulunan Toplam Tutar</div>
                <div className="text-sm font-black font-mono text-emerald-600">
                  {formatMoney(
                    searchResults.reduce((sum, item) => sum + parseNum(item.amount), 0)
                  )} ₺
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                title="Aramayı Kapat"
              >
                <X size={14} />
                <span>Kapat</span>
              </button>
            </div>
          </div>

          {/* Sonuç Tablosu */}
          {searchResults.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-xs font-semibold">
              {isSearching ? 'Kayıtlar aranıyor...' : `"${searchQuery}" ile eşleşen herhangi bir hareket bulunamadı.`}
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-[11px] font-black uppercase text-gray-600 sticky top-0 border-b border-gray-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Tarih</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Açıklama / Cari</th>
                    <th className="py-2.5 px-3">Banka / Tür</th>
                    <th className="py-2.5 px-3 text-right">Tutar</th>
                    <th className="py-2.5 px-3 text-center w-24">Kasa Günü</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {searchResults.map((item, idx) => {
                    const badgeColor = 
                      item.category === 'GİRİŞ' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      item.category === 'ÇIKIŞ' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      item.category === 'POS' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-blue-50 text-blue-700 border-blue-200';

                    return (
                      <tr 
                        key={idx} 
                        className="hover:bg-amber-50/60 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedDate(item.date);
                          setIsRange(false);
                        }}
                      >
                        <td className="py-2.5 px-3 font-bold text-gray-900 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 font-mono">
                            <Calendar size={13} className="text-gray-400 group-hover:text-brand-600" />
                            {formatDateTr(item.date)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeColor}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-black text-gray-900 uppercase">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 font-bold uppercase">
                          {item.bankOrType || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black font-mono text-gray-950">
                          {item.amount !== '' ? `${formatMoney(parseNum(item.amount))} ₺` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(item.date);
                              setIsRange(false);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 group-hover:bg-brand-600 group-hover:text-white text-gray-700 text-[11px] font-bold rounded shadow-xs transition-colors"
                          >
                            <span>Gör</span>
                            <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main Printable & Authentic Excel Sheet Area */}
      <div id="printable-report-area" className="w-full space-y-4 px-2 sm:px-4">
        
        {/* Print Styles */}
        <style>{`
          @media print {
            aside, header, nav, [class*="Sidebar"], [class*="Topbar"], .no-print, button {
              display: none !important;
            }
            body, main {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            #printable-report-area {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            @page {
              size: A3 landscape !important;
              margin: 6mm !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        {/* Centered Large Title Banner */}
        <div className="text-center space-y-1 py-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-gray-900 uppercase">
            GİRİŞ ÇIKIŞ & ANA KASA GÜNLÜK RAPOR
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-gray-800">
            <button
              type="button"
              onClick={handlePrevDay}
              title="Önceki Gün"
              className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors no-print cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-base font-black tracking-wide text-gray-950 px-1">{formattedDate}</span>
            <button
              type="button"
              onClick={handleNextDay}
              title="Sonraki Gün"
              className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors no-print cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-sm no-print ml-1">
              <span className={`w-2 h-2 rounded-full ${isLoadingDb ? 'bg-blue-500 animate-spin' : (isSaved ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping')}`}></span>
              {isLoadingDb ? 'Veriler Yükleniyor...' : (isSaved ? (lastSyncSource === 'office_pc_sync' ? 'Ofis Senkronu: Güncel' : 'Bulutla Eşitlendi') : 'Kaydediliyor...')}
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------------------------------------------
            3 SEPARATED EXCEL LEDGER TABLES: 1) GİRİŞ [POS + GİRİŞLER] | 2) ÇIKIŞ | 3) ANA KASA
            ---------------------------------------------------------------------------------------- */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-[36fr_26fr_33fr] gap-3 xl:gap-4 items-start">
          
          {/* ========================================================================= */}
          {/* 1) GİRİŞ KARTI (GREY HEADER 'GİRİŞ', SOLDA POSLAR + ÖZET, SAĞDA GİRİŞLER) */}
          {/* ========================================================================= */}
          <div className="flex flex-col min-w-0">
            {/* Main Grey Header matching the Excel screenshot */}
            <div className="border-2 border-black bg-[#cfd5dd] h-[40px] flex items-center justify-center font-black text-[20px] tracking-widest text-black uppercase mb-[-2px] z-10">
              GİRİŞ
            </div>

            {/* Body: Split into Sol (POSLAR + Özet) and Sağ (GİRİŞ HAREKETLERİ) with subtle gap */}
            <div className="grid grid-cols-[38%_calc(62%-8px)] gap-2 items-start">
              
              {/* --- SOL ALT SÜTUN: POSLAR TABLOSU VE GİRİŞ/ÇIKIŞ ÖZETLERİ --- */}
              <div className="border-2 border-black bg-white shadow-sm flex flex-col min-w-0">
                
                {/* POSLAR Header (Height 34px matching all subheaders across the page) */}
                <div className="border-b-2 border-black text-center h-[34px] flex items-center justify-center text-xs font-bold text-gray-900 tracking-wider uppercase bg-gray-50">
                  POSLAR
                </div>

                {/* POSLAR 12 Banka Satırı (32px each) */}
                {posList.map((p, pIdx) => (
                  <div key={p.bank} className="flex divide-x divide-black h-[32px] items-center text-xs border-b border-black">
                    <div className="w-[50%] pl-2 font-bold text-gray-900 text-[11px] text-left truncate">
                      {p.bank}
                    </div>
                    <div className="w-[50%] h-full flex items-center justify-end pr-1">
                      <input
                        type="text"
                        placeholder="0,00"
                        value={p.amount}
                        onChange={(e) => {
                          isUserDirtyRef.current = true;
                          const val = e.target.value;
                          setPosList(prev => prev.map((item, i) => i === pIdx ? { ...item, amount: val } : item));
                        }}
                        onBlur={() => {
                          if (p.amount !== '') {
                            const n = parseNum(p.amount);
                            setPosList(prev => prev.map((item, i) => i === pIdx ? { ...item, amount: n !== 0 ? formatExcel(n) : '' } : item));
                          }
                        }}
                        className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-right pr-1 text-xs font-bold text-gray-900"
                      />
                    </div>
                  </div>
                ))}

                {/* 13) TOPLAM ÜSTÜNE BOŞLUK SATIRI 1 */}
                <div className="h-[32px] border-b border-black bg-white"></div>

                {/* 14) TOPLAM ÜSTÜNE BOŞLUK SATIRI 2 */}
                <div className="h-[32px] border-b border-black bg-white"></div>

                {/* 15) POS TOPLAM */}
                <div className="flex items-center justify-between px-2.5 h-[32px] border-b border-black text-xs font-bold text-gray-900 bg-gray-50">
                  <span className="uppercase">TOPLAM</span>
                  <span className="text-xs font-bold">{formatExcel(posTotal)}</span>
                </div>

                {/* 16) BOŞLUK SATIRI 3 */}
                <div className="h-[32px] border-b border-black bg-white"></div>

                {/* 17) GİRİŞ TOPLAMI */}
                <div className="flex items-center justify-between px-2.5 h-[32px] border-b border-black text-xs font-bold text-gray-900 bg-white">
                  <span className="uppercase text-[11px]">GİRİŞ TOPLAMI</span>
                  <span className="text-xs font-bold text-gray-950">{formatExcel(girisTotal)}</span>
                </div>

                {/* 18) ÇIKIŞ TOPLAMI */}
                <div className="flex items-center justify-between px-2.5 h-[32px] border-b border-black text-xs font-bold text-gray-900 bg-white">
                  <span className="uppercase text-[11px]">ÇIKIŞ TOPLAMI</span>
                  <span className="text-xs font-bold text-gray-950">{formatExcel(cikisTotal)}</span>
                </div>

                {/* 19) GİRİŞ-ÇIKIŞ KALANI (Tam DEPO hizasında, index 18) */}
                <div className="flex items-center justify-between px-2.5 h-[32px] text-xs font-bold bg-white">
                  <span className="uppercase text-[11px] text-gray-900">GİRİŞ-ÇIKIŞ KALANI</span>
                  <span 
                    className="text-xs font-bold text-gray-950"
                    style={{ color: netKalan < 0 ? '#FF0000' : undefined }}
                  >
                    {formatExcel(netKalan)}
                  </span>
                </div>

              </div>

              {/* --- SAĞ ALT SÜTUN: GİRİŞ HAREKETLERİ LİSTESİ --- */}
              <div className="border-2 border-black bg-white shadow-sm flex flex-col">
                
                {/* GİRİŞ HAREKETLERİ Subheaders (Exact 34px to align with POSLAR, ÇIKIŞ and ANA KASA) */}
                <div className="flex divide-x divide-black border-b-2 border-black bg-gray-50 h-[34px] items-center text-xs font-bold uppercase text-gray-800 tracking-wider">
                  <div className="w-[48%] pl-2 text-left">AÇIKLAMA / CARİ</div>
                  <div className="w-[24%] pl-2 text-left">BANKA / TÜR</div>
                  <div className="w-[28%] pr-2 text-right">TUTAR</div>
                </div>

                {/* Data Rows */}
                {girisList.map((g, index) => {
                  const isRed = isRedLabel(g.description);
                  const isDevir = index === 0;

                  return (
                    <div key={index} className="flex divide-x divide-black h-[32px] items-center text-xs border-b border-black last:border-b-0">
                      {/* Açıklama / Şube / Cari */}
                      <div className="w-[48%] h-full flex items-center">
                        <input
                          type="text"
                          className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 pl-2 text-xs uppercase font-bold text-gray-900"
                          style={{ color: isRed ? '#FF0000' : undefined }}
                          value={g.description}
                          onChange={(e) => {
                            isUserDirtyRef.current = true;
                            const val = e.target.value;
                            setGirisList(prev => prev.map((item, i) => i === index ? { ...item, description: val } : item));
                          }}
                          onKeyDown={(e) => handleKeyDown(e, 'giris-desc', index)}
                          data-col="giris-desc"
                          data-row={index}
                        />
                      </div>

                      {/* Banka / Tür */}
                      <div className="w-[24%] h-full flex items-center">
                        <input
                          type="text"
                          className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 pl-2 text-xs uppercase font-bold text-gray-800"
                          value={g.bankOrType || ''}
                          onChange={(e) => {
                            isUserDirtyRef.current = true;
                            const val = e.target.value;
                            setGirisList(prev => prev.map((item, i) => i === index ? { ...item, bankOrType: val } : item));
                          }}
                          onKeyDown={(e) => handleKeyDown(e, 'giris-bank', index)}
                          data-col="giris-bank"
                          data-row={index}
                        />
                      </div>

                      {/* Tutar */}
                      <div className="w-[28%] h-full flex items-center justify-end pr-1">
                        <input
                          type="text"
                          className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-right pr-1 text-xs font-bold text-gray-950"
                          style={{ color: isDevir ? '#FF0000' : undefined }}
                          value={g.amount}
                          onChange={(e) => {
                            isUserDirtyRef.current = true;
                            const val = e.target.value;
                            setGirisList(prev => prev.map((item, i) => i === index ? { ...item, amount: val } : item));
                          }}
                          onBlur={() => {
                            if (g.amount !== '') {
                              const n = parseNum(g.amount);
                              setGirisList(prev => prev.map((item, i) => i === index ? { ...item, amount: n !== 0 ? formatExcel(n) : '' } : item));
                            }
                          }}
                          onKeyDown={(e) => handleKeyDown(e, 'giris-amt', index)}
                          data-col="giris-amt"
                          data-row={index}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Footer Total & Add Row */}
                <div className="border-t-2 border-black bg-emerald-50/80 p-2.5 flex items-center justify-between text-emerald-950 font-bold text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">GİRİŞ TOPLAMI:</span>
                    <button
                      type="button"
                      onClick={addTenRows}
                      className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded shadow-xs no-print transition-colors"
                      title="10 yeni boş satır ekle"
                    >
                      + 10 Satır Ekle
                    </button>
                  </div>
                  <span className="text-sm font-bold text-emerald-900">{formatMoney(girisTotal)} ₺</span>
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================= */}
          {/* 2) ÇIKIŞ KARTI (MIDDLE COLUMN, MATCHING EXCEL)            */}
          {/* ========================================================= */}
          <div className="border-2 border-black bg-white shadow-sm overflow-hidden flex flex-col min-w-0">
            {/* Header */}
            <div className="border-b-2 border-black bg-[#cfd5dd] h-[40px] flex items-center justify-center font-bold text-[20px] tracking-widest text-black uppercase">
              ÇIKIŞ
            </div>

            {/* Subheaders */}
            <div className="flex divide-x divide-black border-b-2 border-black bg-gray-50 h-[34px] items-center text-xs font-bold uppercase text-gray-800 tracking-wider">
              <div className="w-[48%] pl-2 text-left">AÇIKLAMA / CARİ</div>
              <div className="w-[24%] pl-2 text-left">BANKA / TÜR</div>
              <div className="w-[28%] pr-2 text-right">TUTAR</div>
            </div>

            {/* Data Rows */}
            <div className="bg-white">
              {cikisList.map((c, index) => {
                return (
                  <div key={index} className="flex divide-x divide-black h-[32px] items-center text-xs border-b border-black">
                    {/* Açıklama */}
                    <div className="w-[48%] h-full flex items-center">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 pl-2 text-xs uppercase font-bold text-gray-900"
                        style={{ color: isRedLabel(c.description) ? '#FF0000' : undefined }}
                        value={c.description}
                        onChange={(e) => {
                          isUserDirtyRef.current = true;
                          const val = e.target.value;
                          setCikisList(prev => prev.map((item, i) => i === index ? { ...item, description: val } : item));
                        }}
                        onKeyDown={(e) => handleKeyDown(e, 'cikis-desc', index)}
                        data-col="cikis-desc"
                        data-row={index}
                      />
                    </div>
                    {/* Banka / Tür */}
                    <div className="w-[24%] h-full flex items-center">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 pl-2 text-xs font-bold uppercase"
                        style={{ color: '#FF0000' }}
                        value={c.bankOrType}
                        onChange={(e) => {
                          isUserDirtyRef.current = true;
                          const val = e.target.value;
                          setCikisList(prev => prev.map((item, i) => i === index ? { ...item, bankOrType: val } : item));
                        }}
                        onKeyDown={(e) => handleKeyDown(e, 'cikis-bank', index)}
                        data-col="cikis-bank"
                        data-row={index}
                      />
                    </div>
                    {/* Tutar */}
                    <div className="w-[28%] h-full flex items-center justify-end pr-1">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-right pr-1 text-xs font-bold text-gray-950"
                        value={c.amount}
                        onChange={(e) => {
                          isUserDirtyRef.current = true;
                          const val = e.target.value;
                          setCikisList(prev => prev.map((item, i) => i === index ? { ...item, amount: val } : item));
                        }}
                        onBlur={() => {
                          if (c.amount !== '') {
                            const n = parseNum(c.amount);
                            setCikisList(prev => prev.map((item, i) => i === index ? { ...item, amount: n !== 0 ? formatExcel(n) : '' } : item));
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, 'cikis-amt', index)}
                        data-col="cikis-amt"
                        data-row={index}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Total & Add Row */}
            <div className="border-t-2 border-black bg-rose-50/80 p-2.5 flex items-center justify-between text-rose-950 font-bold text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold">ÇIKIŞ TOPLAMI (J66):</span>
                <button
                  type="button"
                  onClick={addTenRows}
                  className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded shadow-xs no-print transition-colors"
                  title="10 yeni boş satır ekle"
                >
                  + 10 Satır Ekle
                </button>
              </div>
              <span className="text-sm font-bold text-rose-900">{formatMoney(cikisTotal)} ₺</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3) ANA KASA WRAPPER (TABLE + SUMMARY BOX)                 */}
          {/* ========================================================= */}
          <div className="flex flex-col min-w-0">
            <div className="border-2 border-black bg-white shadow-sm overflow-hidden flex flex-col min-w-0">
              {/* Header */}
              <div className="border-b-2 border-black bg-white h-[40px] flex items-center justify-center font-bold text-[19px] tracking-widest text-[#1f4e79] uppercase">
                ANA KASA
              </div>

            {/* Subheaders */}
            <div className="flex divide-x divide-black border-b-2 border-black bg-gray-50 h-[34px] items-center text-[10px] xl:text-[11px] font-bold uppercase text-gray-800 tracking-wider">
              <div className="w-[25%] pl-2 text-left truncate">HESAP ADI (M)</div>
              <div className="w-[15%] pr-1 text-right truncate">DEVİR (L)</div>
              <div className="w-[15%] pr-1 text-right truncate">HAREKET (N)</div>
              <div className="w-[15%] pr-1 text-right truncate">POS (O)</div>
              <div className="w-[15%] pr-1 text-right text-indigo-900 bg-indigo-50/60 font-bold truncate" title="Banka Düzeltmeleri (P)">BANKA DÜZ. (P)</div>
              <div className="w-[15%] pr-1.5 text-right bg-blue-50 text-blue-950 font-bold truncate">SONU (R)</div>
            </div>

            {/* Data Rows */}
            <div className="bg-white">
              {anaKasaList.map((ak, index) => {
                return (
                  <div key={index} className="flex divide-x divide-black h-[32px] items-center text-xs border-b border-black">
                    {/* Hesap Adı (M) */}
                    <div className="w-[25%] h-full flex items-center min-w-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 pl-2 text-[11px] xl:text-xs font-bold uppercase text-gray-900 truncate"
                        value={ak.name}
                        onChange={(e) => {
                          isUserDirtyRef.current = true;
                          const val = e.target.value;
                          setAnaKasaList(prev => prev.map((item, i) => {
                            if (i !== index) return item;
                            const nextItem = { ...item, name: val };
                            return { ...nextItem, gunSonu: calcRowGunSonu(nextItem.name, nextItem.devir, nextItem.movement, nextItem.pos, nextItem.duzeltme) };
                          }));
                        }}
                        onKeyDown={(e) => handleKeyDown(e, 'ak-name', index)}
                        data-col="ak-name"
                        data-row={index}
                      />
                    </div>
                    {/* Devir (L) */}
                    <div className="w-[15%] h-full flex items-center justify-end pr-0.5 min-w-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-right pr-1 text-[11px] xl:text-xs font-bold text-gray-900"
                        style={{ color: parseNum(ak.devir) < 0 ? '#FF0000' : undefined }}
                        value={ak.devir}
                        onChange={(e) => {
                          isUserDirtyRef.current = true;
                          const val = e.target.value;
                          setAnaKasaList(prev => prev.map((item, i) => {
                            if (i !== index) return item;
                            const nextItem = { ...item, devir: val };
                            return { ...nextItem, gunSonu: calcRowGunSonu(nextItem.name, nextItem.devir, nextItem.movement, nextItem.pos, nextItem.duzeltme) };
                          }));
                        }}
                        onBlur={() => {
                          if (ak.devir !== '') {
                            const n = parseNum(ak.devir);
                            const formatted = n !== 0 ? formatAnaKasa(n) : '';
                            setAnaKasaList(prev => prev.map((item, i) => {
                              if (i !== index) return item;
                              const nextItem = { ...item, devir: formatted };
                              return { ...nextItem, gunSonu: calcRowGunSonu(nextItem.name, nextItem.devir, nextItem.movement, nextItem.pos, nextItem.duzeltme) };
                            }));
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, 'ak-devir', index)}
                        data-col="ak-devir"
                        data-row={index}
                      />
                    </div>
                    {/* Hareket (N) */}
                    <div className="w-[15%] h-full flex items-center justify-end pr-0.5 min-w-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-right pr-1 text-[11px] xl:text-xs font-bold text-gray-900"
                        style={{ color: parseNum(ak.movement) < 0 ? '#FF0000' : (parseNum(ak.movement) > 0 ? '#047857' : undefined) }}
                        value={ak.movement}
                        onChange={(e) => {
                          isUserDirtyRef.current = true;
                          const val = e.target.value;
                          setAnaKasaList(prev => prev.map((item, i) => {
                            if (i !== index) return item;
                            const nextItem = { ...item, movement: val };
                            return { ...nextItem, gunSonu: calcRowGunSonu(nextItem.name, nextItem.devir, nextItem.movement, nextItem.pos, nextItem.duzeltme) };
                          }));
                        }}
                        onBlur={() => {
                          if (ak.movement !== '') {
                            const n = parseNum(ak.movement);
                            const formatted = n !== 0 ? formatAnaKasa(n) : '';
                            setAnaKasaList(prev => prev.map((item, i) => {
                              if (i !== index) return item;
                              const nextItem = { ...item, movement: formatted };
                              return { ...nextItem, gunSonu: calcRowGunSonu(nextItem.name, nextItem.devir, nextItem.movement, nextItem.pos, nextItem.duzeltme) };
                            }));
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, 'ak-move', index)}
                        data-col="ak-move"
                        data-row={index}
                      />
                    </div>
                    {/* POS (O) */}
                    <div className="w-[15%] h-full flex items-center justify-end pr-0.5 min-w-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-right pr-1 text-[11px] xl:text-xs font-bold text-blue-700"
                        value={ak.pos}
                        onChange={(e) => {
                          isUserDirtyRef.current = true;
                          const val = e.target.value;
                          setAnaKasaList(prev => prev.map((item, i) => {
                            if (i !== index) return item;
                            const nextItem = { ...item, pos: val };
                            return { ...nextItem, gunSonu: calcRowGunSonu(nextItem.name, nextItem.devir, nextItem.movement, nextItem.pos, nextItem.duzeltme) };
                          }));
                        }}
                        onBlur={() => {
                          if (ak.pos !== '') {
                            const n = parseNum(ak.pos);
                            const formatted = n !== 0 ? formatAnaKasa(n) : '';
                            setAnaKasaList(prev => prev.map((item, i) => {
                              if (i !== index) return item;
                              const nextItem = { ...item, pos: formatted };
                              return { ...nextItem, gunSonu: calcRowGunSonu(nextItem.name, nextItem.devir, nextItem.movement, nextItem.pos, nextItem.duzeltme) };
                            }));
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, 'ak-pos', index)}
                        data-col="ak-pos"
                        data-row={index}
                      />
                    </div>
                    {/* Banka Düzeltmeleri (P) */}
                    <div className="w-[15%] h-full flex items-center justify-end pr-0.5 bg-indigo-50/30 min-w-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-right pr-1 text-[11px] xl:text-xs font-bold text-indigo-900"
                        style={{ color: parseNum(ak.duzeltme || '') < 0 ? '#FF0000' : undefined }}
                        value={ak.duzeltme !== undefined && ak.duzeltme !== null ? ak.duzeltme : ''}
                        onChange={(e) => {
                          isUserDirtyRef.current = true;
                          const val = e.target.value;
                          setAnaKasaList(prev => prev.map((item, i) => {
                            if (i !== index) return item;
                            const nextItem = { ...item, duzeltme: val };
                            return { ...nextItem, gunSonu: calcRowGunSonu(nextItem.name, nextItem.devir, nextItem.movement, nextItem.pos, nextItem.duzeltme) };
                          }));
                        }}
                        onBlur={() => {
                          if (ak.duzeltme !== '' && ak.duzeltme !== undefined && ak.duzeltme !== null) {
                            const n = parseNum(ak.duzeltme);
                            const formatted = n !== 0 ? formatAnaKasa(n) : '';
                            setAnaKasaList(prev => prev.map((item, i) => {
                              if (i !== index) return item;
                              const nextItem = { ...item, duzeltme: formatted };
                              return { ...nextItem, gunSonu: calcRowGunSonu(nextItem.name, nextItem.devir, nextItem.movement, nextItem.pos, nextItem.duzeltme) };
                            }));
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, 'ak-duzeltme', index)}
                        data-col="ak-duzeltme"
                        data-row={index}
                        title="Banka Düzeltmeleri (P Sütunu)"
                      />
                    </div>
                    {/* Gün Sonu (R) */}
                    <div className="w-[15%] h-full flex items-center justify-end pr-1 bg-blue-50/40 min-w-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-right pr-1 text-[11px] xl:text-xs font-bold text-gray-950"
                        style={{ color: parseNum(ak.gunSonu || '') < 0 ? '#FF0000' : undefined }}
                        value={ak.gunSonu !== undefined && ak.gunSonu !== null ? ak.gunSonu : ''}
                        onChange={(e) => {
                          isUserDirtyRef.current = true;
                          const val = e.target.value;
                          setAnaKasaList(prev => prev.map((item, i) => i === index ? { ...item, gunSonu: val } : item));
                        }}
                        onBlur={() => {
                          if (ak.gunSonu !== '' && ak.gunSonu !== undefined && ak.gunSonu !== null) {
                            const n = parseNum(ak.gunSonu);
                            setAnaKasaList(prev => prev.map((item, i) => i === index ? { ...item, gunSonu: n !== 0 ? formatAnaKasa(n) : '' } : item));
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, 'ak-sonu', index)}
                        data-col="ak-sonu"
                        data-row={index}
                        title="Excel Gün Sonu (R Sütunu)"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Excel Exact Bottom 3-Row Summary as Separate Box Below */}
          <div className="mt-3 border-2 border-black bg-white shadow-sm overflow-hidden flex flex-col min-w-0">
            {/* Row 1: Toplam Kasa Bakiyesi */}
            <div className="flex divide-x divide-black h-[32px] items-center text-xs border-b border-black">
              <div className="w-[85%] pl-2 text-right pr-2 font-bold text-gray-700 uppercase">
                TOPLAM KASA BAKİYESİ:
              </div>
              <div 
                className="w-[15%] h-full flex items-center justify-end pr-2 font-bold text-gray-950"
                style={{ color: anaKasaTotal < 0 ? '#FF0000' : undefined }}
              >
                {formatAnaKasa(anaKasaTotal)}
              </div>
            </div>

            {/* Row 2: Giriş Çıkış Net Kalanı */}
            <div className="flex divide-x divide-black h-[32px] items-center text-xs border-b border-black">
              <div className="w-[85%] pl-2 text-right pr-2 font-bold text-gray-700 uppercase">
                GİRİŞ-ÇIKIŞ KALANI:
              </div>
              <div 
                className="w-[15%] h-full flex items-center justify-end pr-2 font-bold text-gray-950"
                style={{ color: netKalan < 0 ? '#FF0000' : undefined }}
              >
                {formatAnaKasa(netKalan)}
              </div>
            </div>

            {/* Row 3: Kasa */}
            <div className="flex divide-x divide-black h-[32px] items-center text-xs">
              <div className="w-[85%] pl-2 text-right pr-2 font-bold text-gray-700 uppercase">
                KASA:
              </div>
              <div 
                className="w-[15%] h-full flex items-center justify-end pr-2 font-bold text-gray-950"
                style={{ color: bakiyeFarki < 0 ? '#FF0000' : undefined }}
              >
                {bakiyeFarki === 0 ? '0' : formatAnaKasa(bakiyeFarki)}
              </div>
            </div>
          </div>
        </div>

        </div>

      </div>
    </div>
  );
}
