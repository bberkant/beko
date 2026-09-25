import { useState, useMemo, useEffect, Fragment, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  Coins,
  Search,
  RefreshCw,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  FileText,
  Building,
  Plus,
  ChevronDown,
  Printer,
  FolderOpen,
  Calendar,
  Filter,
  X,
  ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from '../../components/ui/Modal';
import { fixCorruptedTurkishText } from '../../lib/turkishTextFixer';

const statusCache = new Map<string, string>();
const cleanStatus = (status: string | null | undefined): string => {
  if (!status) return '';
  const cached = statusCache.get(status);
  if (cached !== undefined) return cached;
  
  let cleaned = status;
  
  // Upper case garbled characters (must do before lowercasing)
  cleaned = cleaned
    .replace(/Ã–/g, 'Ö')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ä°/g, 'İ')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Ãž/g, 'Ş')
    .replace(/Äž/g, 'Ğ')
    .replace(/Ä±/g, 'ı');
    
  // Lower case / mixed garbled characters
  cleaned = cleaned
    .replace(/Ã¶/g, 'ö')
    .replace(/ã¶/g, 'ö')
    .replace(/ã–/g, 'ö')
    .replace(/ãœ/g, 'ü')
    .replace(/ã¼/g, 'ü')
    .replace(/ä°/g, 'i')
    .replace(/ä±/g, 'ı')
    .replace(/ã§/g, 'ç')
    .replace(/ãŸ/g, 'ş')
    .replace(/äÿ/g, 'ğ')
    .replace(/ã°/g, 'ı');
    
  cleaned = cleaned
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/\u0307/g, '');
    
  statusCache.set(status, cleaned);
  return cleaned;
};

const normalizeCache = new Map<string, string>();
export const normalizeString = (str: string | null | undefined): string => {
  if (!str) return '';
  const cached = normalizeCache.get(str);
  if (cached !== undefined) return cached;

  const res = str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/ı/g, 'i')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .toLowerCase()
    .trim();

  normalizeCache.set(str, res);
  return res;
};

export const isHatirAlinan = (c: any): boolean => {
  if (!c || c.check_type !== 'alinan') return false;
  const debtor = normalizeString(c.debtor);
  const creditor = normalizeString(c.creditor);
  const kesideci = normalizeString(c.kesideci);
  const note = normalizeString(c.ozel_alan || c.notlar || '');
  return debtor.includes('hatir') ||
         creditor.includes('hatir') ||
         kesideci.includes('hatir') ||
         note.includes('hatir');
};


export const getCleanBankName = (debtor: string | null, bankName: string | null): string | null => {
  if (!debtor && !bankName) return null;
  let d = (debtor || '').toUpperCase().trim();
  let b = (bankName || '').toUpperCase().trim();
  
  // Filter out generic placeholder names
  const genericWords = ['ÇEKLER', 'CEKLER', 'ıEKLER', 'IEKLER', 'ÇEK', 'CEK', 'ıEK', 'IEK', 'SENET', 'SENETLER', 'BELİRSİZ', 'BILINMIYOR'];
  if (genericWords.includes(d)) d = '';
  if (genericWords.includes(b)) b = '';
  if (!d && !b) return null;
  
  // Determine prefix (E. or M.)
  let prefix = 'E.';
  if (d.startsWith('M.') || d.includes('MARİF') || d.includes('MARIF')) {
    prefix = 'M.';
  } else if (b.startsWith('M.') || b.includes('MARİF') || b.includes('MARIF')) {
    prefix = 'M.';
  } else if (d.startsWith('E.') || d.includes('ETİK') || d.includes('ETIK')) {
    prefix = 'E.';
  } else if (b.startsWith('E.') || b.includes('ETİK') || b.includes('ETIK')) {
    prefix = 'E.';
  }
  
  // Match base bank name
  if (d.includes('AKBANK') || b.includes('AKBANK')) return `${prefix}AKBANK`;
  if (d.includes('DENİZ') || d.includes('DENIZ') || b.includes('DENİZ') || b.includes('DENIZ')) return `${prefix}DENİZ`;
  if (d.includes('ZİRAAT') || d.includes('ZIRAAT') || b.includes('ZİRAAT') || b.includes('ZIRAAT')) return `${prefix}ZİRAAT`;
  if (d.includes('ALBARAKA') || b.includes('ALBARAKA')) return 'ALBARAKA';
  if (d.includes('İŞ') || d.includes('IS') || d.includes('İŞBANK') || d.includes('ISBANK') || b.includes('İŞ') || b.includes('IS') || b.includes('İŞBANK') || b.includes('ISBANK')) return `${prefix}İŞBANK`;
  if (d.includes('GARANTİ') || d.includes('GARANTI') || b.includes('GARANTİ') || b.includes('GARANTI')) return `${prefix}GARANTİ`;
  if (d.includes('YAPI') || b.includes('YAPI')) return `${prefix}YAPI`;

  if (d.startsWith('E.') || d.startsWith('M.') || d.startsWith('Ö.')) {
    return d;
  }
  if (d.includes('HALK')) return 'HALKBANK';
  if (d.includes('VAKIF')) return 'VAKIFBANK';
  if (d.includes('TEB')) return 'TEB';
  if (d.includes('QNB') || d.includes('FİNANS') || d.includes('FINANS')) return 'QNB FİNANS';
  if (d.includes('KUVEYT') || d.includes('KUVEYTTÜRK')) return 'KUVEYT';
  if (d.includes('GARANTİ') || d.includes('GARANTI')) return 'GARANTİ';
  
  if (d && (d.includes('BANK') || d.includes('KATILIM'))) return d;
  if (b && (b.includes('BANK') || b.includes('KATILIM') || b.includes('DENİZ') || b.includes('AKBANK') || b.includes('ZİRAAT') || b.includes('GARANTİ') || b.includes('HALK') || b.includes('VAKIF') || b.includes('KUVEYT') || b.includes('ALBARAKA') || b.includes('İŞ') || b.includes('YAPI'))) {
    if (b.includes('AKBANK')) return `${prefix}AKBANK`;
    if (b.includes('DENİZ') || b.includes('DENIZ')) return `${prefix}DENİZ`;
    if (b.includes('ZİRAAT') || b.includes('ZIRAAT')) return `${prefix}ZİRAAT`;
    if (b.includes('ALBARAKA')) return 'ALBARAKA';
    if (b.includes('İŞ') || b.includes('IS') || b.includes('İŞBANK') || b.includes('ISBANK')) return `${prefix}İŞBANK`;
    if (b.includes('GARANTİ') || b.includes('GARANTI')) return `${prefix}GARANTİ`;
    if (b.includes('YAPI')) return `${prefix}YAPI`;
    if (b.includes('HALK')) return 'HALKBANK';
    if (b.includes('VAKIF')) return 'VAKIFBANK';
    if (b.includes('KUVEYT')) return 'KUVEYT';
    return b;
  }
  
  return null;
};

const displayStatus = (status: string | null | undefined, checkType: 'alinan' | 'kesilen'): string => {
  if (!status) return 'Bilinmiyor';
  const clean = cleanStatus(status);
  if (checkType === 'kesilen' && (clean.includes('beklemede') || clean.includes('ödenmedi'))) {
    return 'Tahsilde';
  }
  if (clean.includes('portföyde')) return 'Portföyde';
  if (clean.includes('iptal/iade') || clean.includes('iptal')) return 'İptal/İade';
  if (clean.includes('tahsilde')) return 'Tahsilde';
  if (clean.includes('teminata')) return 'Teminata Verildi';
  if (clean.includes('karşılıksız') || clean.includes('yazıldı')) return 'Karşılıksız/Yazıldı';
  if (clean.includes('tahsil edildi')) return 'Tahsil Edildi';
  if (clean.includes('ödendi') || clean.includes('ödenen')) return 'Ödendi';
  if (clean.includes('geri alındı')) return 'Geri Alındı';
  if (clean.includes('kayıp')) return 'Kayıp';
  
  // Fallback but with clean replacements
  return status
    .replace(/Ã–/g, 'Ö')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ä°/g, 'İ')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Ãž/g, 'Ş')
    .replace(/Äž/g, 'Ğ')
    .replace(/Ä±/g, 'ı')
    .replace(/Ã¶/g, 'ö')
    .replace(/ã¶/g, 'ö')
    .replace(/ã–/g, 'ö')
    .replace(/ãœ/g, 'ü')
    .replace(/ã¼/g, 'ü')
    .replace(/ä°/g, 'i')
    .replace(/ä±/g, 'ı')
    .replace(/ã§/g, 'ç')
    .replace(/ãŸ/g, 'ş')
    .replace(/äÿ/g, 'ğ')
    .replace(/ã°/g, 'ı');
};

interface EbsCheck {
  id: string;
  local_id: number;
  check_type: 'alinan' | 'kesilen';
  document_type?: 'cek' | 'senet' | null;
  issue_date: string | null;
  due_date: string | null;
  amount: number;
  para_birimi: string | null;
  check_no: string | null;
  debtor: string | null;
  creditor: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  status: string | null;
  ozel_alan: string | null;
  kesideci: string | null;
  keside_yeri: string | null;
  tahsildar_banka: string | null;
  ciro_edilen: string | null;
  created_at: string;
}

const FIXED_KAYIP_CHECKS = [
  { creditor: 'MUHARREM DEMİR', bank_name: 'E.ZİRAAT', amountText: '-', due_dateText: '12.06.2023' },
  { creditor: 'MUSTAFA GENÇELİOĞLU', bank_name: 'E.DENİZ', amountText: '-', due_dateText: '26.08.2023' },
  { creditor: 'ASLAN KIRIKTAŞ', bank_name: 'E.DENİZ', amountText: '1.478.540', due_dateText: '09.09.2024' },
  { creditor: 'ŞENOL', bank_name: 'E.ZİRAAT', amountText: '1.523.884', due_dateText: '19.03.2025' },
  { creditor: 'MUSTAFA UYUMAZ', bank_name: 'M.ZİRAAT', amountText: '346.398', due_dateText: '30.09.2025' },
];

export const fixCorruptedText = fixCorruptedTurkishText;

const formatTaksitDesc = (desc: string | null | undefined): string => {
  if (!desc) return '';
  const clean = fixCorruptedText(desc.trim());
  const idx = clean.indexOf('-');
  if (idx !== -1) {
    const left = clean.substring(0, idx).trim();
    const leftUpper = left.toUpperCase();
    const isSystem = leftUpper.includes('ALBARAKA') || 
                     leftUpper.includes('KUVEYT') || 
                     leftUpper.includes('TAKSİT') || 
                     leftUpper.includes('VAKIF') || 
                     leftUpper.includes('MARİF') || 
                     leftUpper.includes('MARIF');
    if (isSystem) {
      return left;
    }
  }
  return clean;
};

export function ChecksPage() {
  const { user } = useAuth();
  const pendingInserts = useRef<Record<string, boolean>>({});
  const insertPromises = useRef<Record<string, Promise<any>>>({});
  const [selectedCells, setSelectedCells] = useState<Record<string, { amount: number; label: string }>>({});

  const handleCellClick = (
    e: React.MouseEvent<HTMLInputElement>,
    check: EbsCheck | undefined,
    amount: number,
    key: string
  ) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      setSelectedCells(prev => {
        const next = { ...prev };
        if (next[key]) {
          delete next[key];
        } else {
          next[key] = { amount, label: check?.creditor || '' };
        }
        return next;
      });
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCells({});
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);
  const location = useLocation();
  const isTakasRoute = location.pathname === '/cekler/takas';
  
  // Changed default tab to 'kesilen' and renamed Kendi Çeklerimiz to Kesilen Çekler as requested
  const [activeTab, setActiveTab] = useState<'alinan' | 'kesilen'>(isTakasRoute ? 'alinan' : 'kesilen');
  const [checks, setChecks] = useState<EbsCheck[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({
    due_date: '',
    remaining_days: '',
    debtor: '',
    kesideci: '',
    creditor: '',
    check_no: '',
    bank_name: '',
    bank_branch: '',
    keside_yeri: '',
    issue_date: '',
    tahsildar_banka: '',
    status: '',
    amount: '',
    ciro_edilen: '',
    ozel_alan: ''
  });
  
  // Sol Menü Durum Filtresi
  const [selectedSidebarFilter, setSelectedSidebarFilter] = useState<string>(isTakasRoute ? 'takasa_verildi' : 'all');
  const [detailSortConfig, setDetailSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'bank_name', direction: 'asc' });

  const handleRequestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (detailSortConfig && detailSortConfig.key === key && detailSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setDetailSortConfig({ key, direction });
  };

  useEffect(() => {
    if (isTakasRoute) {
      setActiveTab('alinan');
      setSelectedSidebarFilter('takasa_verildi');
    } else {
      setActiveTab('kesilen');
      setSelectedSidebarFilter('all');
    }
  }, [isTakasRoute]);

  const [openDropdown, setOpenDropdown] = useState<{ section: 'takas' | 'nontakas'; rowIndex: number; colName?: string } | null>(null);
  const [openHeaderDropdown, setOpenHeaderDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      if (openHeaderDropdown) {
        setOpenHeaderDropdown(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [openHeaderDropdown]);

  useEffect(() => {
    const handleOutsideClick = () => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [openDropdown]);

  // Keşide Tarihi (Vade Tarihi) Filtreleme Durumları
  const [dateFilterType, setDateFilterType] = useState<string>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  useEffect(() => {
    setTempStartDate(startDate);
  }, [startDate]);

  useEffect(() => {
    setTempEndDate(endDate);
  }, [endDate]);

  const [documentTypeFilter, setDocumentTypeFilter] = useState<'all' | 'cek' | 'senet'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  
  const [sortField, setSortField] = useState<string>('due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (dateFilterType === 'today' || dateFilterType === 'tomorrow') {
      setSortField('debtor');
    } else {
      setSortField('due_date');
    }
  }, [dateFilterType]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortableHeader = (label: string, field: string, align: 'left' | 'center' | 'right' = 'left', extraClass: string = '') => {
    const isSorted = sortField === field;
    const alignClass = align === 'center' ? 'text-center justify-center' : align === 'right' ? 'text-right justify-end' : 'text-left justify-start';
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-1.5 py-2 text-[12.5px] font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors ${extraClass}`}
      >
        <div className={`flex items-center gap-1 ${alignClass}`}>
          <span>{label}</span>
          <span className="text-gray-400 text-[10px]">
            {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  const [saving, setSaving] = useState(false);
  const [newCheckType, setNewCheckType] = useState<'alinan' | 'kesilen'>('kesilen');
  const [newCheckNo, setNewCheckNo] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newBankBranch, setNewBankBranch] = useState('');
  const [newDebtor, setNewDebtor] = useState('');
  const [newCreditor, setNewCreditor] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newParaBirimi, setNewParaBirimi] = useState('TRY');
  const [newStatus, setNewStatus] = useState('Tahsilde');
  const [newOzelAlan, setNewOzelAlan] = useState('ÇEK');

  const [modalMode, setModalMode] = useState<'select' | 'create'>('select');
  const [selectedCheckId, setSelectedCheckId] = useState<string>('');
  const [targetColumn, setTargetColumn] = useState<string>('TAKSİT');
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  const resetForm = () => {
    setNewCheckNo('');
    setNewBankName('');
    setNewBankBranch('');
    setNewDebtor('');
    setNewCreditor('');
    setNewDueDate('');
    setNewAmount('');
    setNewParaBirimi('TRY');
    setNewStatus(activeTab === 'kesilen' ? 'Tahsilde' : 'Portföyde');
    setNewOzelAlan('ÇEK');
    setModalMode('select');
    setSelectedCheckId('');
    setTargetColumn('TAKSİT');
    setModalSearchTerm('');
  };

  useEffect(() => {
    if (modalOpen) {
      setNewCheckType(activeTab);
      if (isTakasRoute) {
        setNewStatus('Takasa Verildi');
      } else {
        setNewStatus(activeTab === 'kesilen' ? 'Tahsilde' : 'Portföyde');
      }
    }
  }, [modalOpen, activeTab, isTakasRoute]);

  const handleCheckTypeChange = (type: 'alinan' | 'kesilen') => {
    setNewCheckType(type);
    setNewStatus(type === 'kesilen' ? 'Tahsilde' : 'Portföyde');
  };

  const selectableChecks = useMemo(() => {
    if (!modalOpen) return [];
    return checks.filter(c => {
      const status = (c.status || '').toLowerCase();
      return !status.includes('ödendi') && 
             !(status.includes('tahsil') && !status.includes('tahsilde')) && 
             !status.includes('ödenen') && 
             !status.includes('kayıp') &&
             !status.includes('iptal');
    });
  }, [checks, modalOpen]);

  const filteredSelectableChecks = useMemo(() => {
    const s = modalSearchTerm.toLowerCase().trim();
    if (!s) return selectableChecks;
    return selectableChecks.filter(c => {
      const num = (c.check_no || '').toLowerCase();
      const cred = (c.creditor || '').toLowerCase();
      const debt = (c.debtor || '').toLowerCase();
      const amt = String(c.amount || '').toLowerCase();
      const date = (c.due_date || '').toLowerCase();
      return num.includes(s) || cred.includes(s) || debt.includes(s) || amt.includes(s) || date.includes(s);
    });
  }, [selectableChecks, modalSearchTerm]);

  const handleAddCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
    setSaving(true);
    try {
      if (modalMode === 'select') {
        if (!selectedCheckId) {
          alert('Lütfen listeden bir çek seçin.');
          setSaving(false);
          return;
        }

        const targetCheck = checks.find(c => c.id === selectedCheckId);
        if (!targetCheck) throw new Error('Seçilen çek sistemde bulunamadı.');

        let updatedOzelAlan = '';
        let updatedDebtor = targetCheck.debtor;
        
        if (targetColumn === 'TAKASTA OLMAYAN') {
          const isCurrentlyIcTakas = (targetCheck.ozel_alan || '').toUpperCase().includes('İÇ TAKAS');
          updatedOzelAlan = isCurrentlyIcTakas ? 'TAKASTA OLMAYAN - İÇ TAKAS' : 'TAKASTA OLMAYAN';
        } else {
          const isCurrentlyIcTakas = (targetCheck.ozel_alan || '').toUpperCase().includes('İÇ TAKAS');
          updatedOzelAlan = isCurrentlyIcTakas ? 'TAKASTA - İÇ TAKAS' : 'TAKASTA';
          updatedDebtor = targetColumn;
        }

        const { error } = await supabase
          .from('ebs_checks')
          .update({
            ozel_alan: updatedOzelAlan,
            debtor: updatedDebtor
          })
          .eq('id', targetCheck.id);

        if (error) throw error;
      } else {
        const localId = Math.floor(Date.now() % 10000000);
        
        let finalOzelAlan = newOzelAlan;
        let finalDebtor = newDebtor;
        let finalKesideci = '';

        if (targetColumn === 'TAKASTA OLMAYAN') {
          finalOzelAlan = newOzelAlan.trim() ? `TAKASTA OLMAYAN - ${newOzelAlan.trim()}` : 'TAKASTA OLMAYAN';
        } else if (targetColumn) {
          finalOzelAlan = newOzelAlan.trim() ? `TAKASTA - ${newOzelAlan.trim()}` : 'TAKASTA';
          finalDebtor = targetColumn;
          finalKesideci = newDebtor; // Store custom debtor in kesideci field
        }

        const newCheckData = {
          organization_id: orgId,
          check_type: newCheckType,
          local_id: localId,
          check_no: newCheckNo,
          bank_name: newBankName,
          bank_branch: newCheckType === 'kesilen' ? '' : newBankBranch,
          debtor: finalDebtor,
          creditor: newCreditor,
          kesideci: finalKesideci || null,
          due_date: newDueDate || null,
          amount: parseFloat(newAmount) || 0,
          para_birimi: newParaBirimi,
          status: newStatus,
          ozel_alan: finalOzelAlan,
          issue_date: new Date().toISOString().split('T')[0]
        };

        const { error } = await supabase
          .from('ebs_checks')
          .insert([newCheckData]);

        if (error) throw error;
      }

      setModalOpen(false);
      resetForm();
      void fetchChecks();
    } catch (err: any) {
      console.error('Çek kaydedilirken hata oluştu:', err);
      alert('Çek kaydedilemedi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchChecks = async () => {
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');

      // 1. Takas Rotasındaysak SADECE güncel takas için gerekli kayıtları tek sorguda çek
      if (isTakasRoute) {
        const [accountsResult, initialChecksResult, todayChecksResult] = await Promise.all([
          supabase
            .from('bank_accounts')
            .select('*')
            .eq('organization_id', orgId)
            .eq('status', 'aktif')
            .order('bank', { ascending: true }),
          supabase
            .from('ebs_checks')
            .select('*')
            .eq('organization_id', orgId)
            .neq('status', 'Ödendi')
            .neq('status', 'Tahsil Edildi')
            .neq('status', 'İptal')
            .or(`due_date.eq.${todayStr},debtor.eq.TAKSİT,debtor.ilike.%taksit%,status.ilike.%kayıp%,ozel_alan.ilike.%takas%,debtor.ilike.%hatir%,debtor.ilike.%hatır%,creditor.ilike.%hatir%,creditor.ilike.%hatır%,kesideci.ilike.%hatir%,kesideci.ilike.%hatır%,ozel_alan.ilike.%hatir%,ozel_alan.ilike.%hatır%,check_no.is.null,check_no.eq.`)
            .order('due_date', { ascending: true }),
          supabase
            .from('ebs_checks')
            .select('*')
            .eq('organization_id', orgId)
            .eq('due_date', todayStr)
        ]);

        if (accountsResult.error) throw accountsResult.error;
        if (initialChecksResult.error) throw initialChecksResult.error;

        const combinedChecks = [...(initialChecksResult.data || [])];
        const existingIds = new Set(combinedChecks.map(c => c.id));
        if (todayChecksResult.data) {
          todayChecksResult.data.forEach(c => {
            if (!existingIds.has(c.id)) {
              combinedChecks.push(c);
              existingIds.add(c.id);
            }
          });
        }

        setBankAccounts(accountsResult.data || []);
        setChecks(combinedChecks);
        setLoading(false);
        return;
      }

      // 2. Standart Çek Yönetimi Sayfasındaysak (Tüm Çekler/Raporlar)
      const [countResult, accountsResult] = await Promise.all([
        supabase
          .from('ebs_checks')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabase
          .from('bank_accounts')
          .select('*')
          .eq('organization_id', orgId)
          .eq('status', 'aktif')
          .order('bank', { ascending: true })
      ]);

      if (countResult.error) throw countResult.error;
      if (accountsResult.error) throw accountsResult.error;

      const totalCount = countResult.count || 0;
      const accounts = accountsResult.data || [];
      setBankAccounts(accounts);

      let allData: EbsCheck[] = [];
      const pageSize = 1000;
      const numPages = Math.ceil(totalCount / pageSize);

      if (numPages > 0) {
        const fetchPages = Array.from({ length: numPages }).map((_, index) => {
          const from = index * pageSize;
          return supabase
            .from('ebs_checks')
            .select('*')
            .eq('organization_id', orgId)
            .order('due_date', { ascending: true })
            .range(from, from + pageSize - 1);
        });

        const pagesResults = await Promise.all(fetchPages);
        for (const res of pagesResults) {
          if (res.error) throw res.error;
          if (res.data) {
            allData = [...allData, ...res.data];
          }
        }
      }

      setChecks(allData);

      // Seed default kayip checks if they haven't been seeded yet
      const hasSeededKayip = localStorage.getItem(`seeded_kayip_${orgId}`);
      const dbKayipCount = allData.filter(c => cleanStatus(c.status).includes('kayıp')).length;
      if (!hasSeededKayip && dbKayipCount === 0) {
        const defaultKayipChecks = [
          { organization_id: orgId, check_type: 'alinan', status: 'Kayıp', creditor: 'MUHARREM DEMİR', bank_name: 'E.ZİRAAT', amount: 0, due_date: '2023-06-12', para_birimi: 'TRY', created_by: user?.id || 'system' },
          { organization_id: orgId, check_type: 'alinan', status: 'Kayıp', creditor: 'MUSTAFA GENÇELİOĞLU', bank_name: 'E.DENİZ', amount: 0, due_date: '2023-08-26', para_birimi: 'TRY', created_by: user?.id || 'system' },
          { organization_id: orgId, check_type: 'alinan', status: 'Kayıp', creditor: 'ASLAN KIRIKTAŞ', bank_name: 'E.DENİZ', amount: 1478540, due_date: '2024-09-09', para_birimi: 'TRY', created_by: user?.id || 'system' },
          { organization_id: orgId, check_type: 'alinan', status: 'Kayıp', creditor: 'ŞENOL', bank_name: 'E.ZİRAAT', amount: 1523884, due_date: '2025-03-19', para_birimi: 'TRY', created_by: user?.id || 'system' },
          { organization_id: orgId, check_type: 'alinan', status: 'Kayıp', creditor: 'MUSTAFA UYUMAZ', bank_name: 'M.ZİRAAT', amount: 346398, due_date: '2025-09-30', para_birimi: 'TRY', created_by: user?.id || 'system' }
        ];
        const { error: seedError } = await supabase.from('ebs_checks').insert(defaultKayipChecks);
        if (!seedError) {
          localStorage.setItem(`seeded_kayip_${orgId}`, 'true');
          const { data: refetchedData } = await supabase
            .from('ebs_checks')
            .select('*')
            .eq('organization_id', orgId)
            .order('due_date', { ascending: true });
          if (refetchedData) {
            setChecks(refetchedData);
          }
        }
      }

    } catch (err: any) {
      console.error('Çek verileri yüklenirken hata oluştu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchChecks();
  }, [user?.organizationId, isTakasRoute]);

  // Kalan gün hesaplama
  const calculateRemainingDays = (dueDateStr: string | null) => {
    if (!dueDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Alınan Çek Sol Menü Durumları (EBS Birebir Uyumlu)
  const alinanSidebarFilters = useMemo(() => {
    if (isTakasRoute) return [];
    const activeAlinan = checks.filter(c => c.check_type === 'alinan');
    
    const counts = {
      all: activeAlinan.length,
      portfoyde: activeAlinan.filter(c => cleanStatus(c.status).includes('portföyde')).length,
      elimizde: activeAlinan.filter(c => cleanStatus(c.status).includes('portföyde') && cleanStatus(c.ciro_edilen).includes('elimizde')).length,
      ciro: activeAlinan.filter(c => cleanStatus(c.status).includes('ciro')).length,
      teminata_verildi: activeAlinan.filter(c => cleanStatus(c.status).includes('teminata')).length,
      takasa_verildi: activeAlinan.filter(c => cleanStatus(c.status).includes('takasa')).length,
      icraya_verildi: activeAlinan.filter(c => cleanStatus(c.status).includes('icra')).length,
      faktoringe_verildi: activeAlinan.filter(c => cleanStatus(c.status).includes('faktoring')).length,
      borcluya_iade: activeAlinan.filter(c => cleanStatus(c.status).includes('iade')).length,
      portfoyden_tahsil: activeAlinan.filter(c => cleanStatus(c.status).includes('portföyden tahsil')).length,
      bankadan_tahsil: activeAlinan.filter(c => cleanStatus(c.status).includes('bankadan tahsil') || cleanStatus(c.status).includes('tahsil edildi') || cleanStatus(c.status).includes('tahsilde')).length,
      icradan_tahsil: activeAlinan.filter(c => cleanStatus(c.status).includes('icradan tahsil')).length,
      portfoyde_karsiliksiz: activeAlinan.filter(c => cleanStatus(c.status).includes('portföyde karşılıksız') || cleanStatus(c.status).includes('portföy karşılıksız')).length,
      bankada_karsiliksiz: activeAlinan.filter(c => cleanStatus(c.status).includes('bankada karşılıksız') || cleanStatus(c.status).includes('banka karşılıksız') || cleanStatus(c.status).includes('yazıldı') || cleanStatus(c.status).includes('karşılıksız')).length
    };

    return [
      { id: 'all', label: 'Alınan Tüm Çekler', count: counts.all },
      { id: 'portfoyde', label: 'Portföyde', count: counts.portfoyde },
      { id: 'elimizde', label: 'Elimizde', count: counts.elimizde },
      { id: 'ciro', label: 'Ciro Edildi', count: counts.ciro },
      { id: 'teminata_verildi', label: 'Teminata Verildi', count: counts.teminata_verildi },
      { id: 'takasa_verildi', label: 'Takasa Verildi', count: counts.takasa_verildi },
      { id: 'icraya_verildi', label: 'İcraya Verildi', count: counts.icraya_verildi },
      { id: 'faktoringe_verildi', label: 'Faktoringe Verildi', count: counts.faktoringe_verildi },
      { id: 'borcluya_iade', label: 'Borçluya İade Edildi', count: counts.borcluya_iade },
      { id: 'portfoyden_tahsil', label: 'Portföyden Tahsil', count: counts.portfoyden_tahsil },
      { id: 'bankadan_tahsil', label: 'Bankadan Tahsil', count: counts.bankadan_tahsil },
      { id: 'icradan_tahsil', label: 'İcradan Tahsil', count: counts.icradan_tahsil },
      { id: 'portfoyde_karsiliksiz', label: 'Portföyde Karşılıksız', count: counts.portfoyde_karsiliksiz },
      { id: 'bankada_karsiliksiz', label: 'Bankada Karşılıksız', count: counts.bankada_karsiliksiz }
    ];
  }, [checks, isTakasRoute]);

  // Kesilen Çek Sol Menü Durumları (EBS Birebir Uyumlu)
  const kesilenSidebarFilters = useMemo(() => {
    if (isTakasRoute) return [];
    const activeKesilen = checks.filter(c => c.check_type === 'kesilen');
    
    const counts = {
      all: activeKesilen.length,
      tahsilde: activeKesilen.filter(c => {
        const st = cleanStatus(c.status);
        return st.includes('tahsilde') || st.includes('beklemede') || st.includes('ödenmedi');
      }).length,
      odenen: activeKesilen.filter(c => {
        const st = cleanStatus(c.status);
        return st.includes('ödendi') || st.includes('ödenen') || (st.includes('tahsil') && !st.includes('tahsilde'));
      }).length,
      geri_alinan: activeKesilen.filter(c => cleanStatus(c.status).includes('geri alındı')).length,
      iptal: activeKesilen.filter(c => cleanStatus(c.status).includes('iptal')).length,
      yasakli: activeKesilen.filter(c => cleanStatus(c.status).includes('yasaklı')).length,
      kayip: activeKesilen.filter(c => cleanStatus(c.status).includes('kayıp')).length
    };

    return [
      { id: 'all', label: 'Kesilen Tüm Çekler', count: counts.all },
      { id: 'tahsilde', label: 'Tahsildeki Çekler', count: counts.tahsilde },
      { id: 'odenen', label: 'Ödenen Çekler', count: counts.odenen },
      { id: 'geri_alinan', label: 'Geri Alınan Çekler', count: counts.geri_alinan },
      { id: 'iptal', label: 'İptal Edilen Çekler', count: counts.iptal },
      { id: 'yasakli', label: 'Yasaklı Çekler', count: counts.yasakli },
      { id: 'kayip', label: 'Kayıp Çekler', count: counts.kayip }
    ];
  }, [checks, isTakasRoute]);

  const handleTabChange = (tab: 'alinan' | 'kesilen') => {
    setActiveTab(tab);
    setSelectedSidebarFilter('all');
  };

  // Vade (Keşide) tarihine göre filtreleme fonksiyonu (Timezone-agnostic string-based)
  const isWithinDateFilter = (checkDateStr: string | null) => {
    if (!checkDateStr) return false;
    
    // checkDateStr is format YYYY-MM-DD (e.g. "2026-07-22")
    const cleanDateStr = checkDateStr.substring(0, 10);
    
    const getLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayObj = new Date();
    const todayStr = getLocalDateString(todayObj);

    switch (dateFilterType) {
      case 'all':
        return true;
      case 'yesterday': {
        const yesterdayObj = new Date();
        yesterdayObj.setDate(todayObj.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterdayObj);
        return cleanDateStr === yesterdayStr;
      }
      case 'today':
        return cleanDateStr === todayStr;
      case 'tomorrow': {
        const tomorrowObj = new Date();
        tomorrowObj.setDate(todayObj.getDate() + 1);
        const tomorrowStr = getLocalDateString(tomorrowObj);
        return cleanDateStr === tomorrowStr;
      }
      case 'thisWeek': {
        const checkDate = new Date(cleanDateStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const day = today.getDay();
        const subtractDays = day === 6 ? 0 : day + 1;
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - subtractDays);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        return checkDate >= startOfWeek && checkDate <= endOfWeek;
      }
      case 'nextWeek': {
        const checkDate = new Date(cleanDateStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const day = today.getDay();
        const subtractDays = day === 6 ? 0 : day + 1;
        const currentStartOfWeek = new Date(today);
        currentStartOfWeek.setDate(today.getDate() - subtractDays);
        
        const startOfWeek = new Date(currentStartOfWeek);
        startOfWeek.setDate(currentStartOfWeek.getDate() + 7);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        return checkDate >= startOfWeek && checkDate <= endOfWeek;
      }
      case 'thisMonth': {
        const thisMonthStr = todayStr.substring(0, 7); // "YYYY-MM"
        return cleanDateStr.substring(0, 7) === thisMonthStr;
      }
      case 'nextMonth': {
        const nextMonthObj = new Date();
        nextMonthObj.setMonth(todayObj.getMonth() + 1);
        const nextMonthStr = getLocalDateString(nextMonthObj).substring(0, 7);
        return cleanDateStr.substring(0, 7) === nextMonthStr;
      }
      case 'thisYear': {
        const thisYearStr = todayStr.substring(0, 4); // "YYYY"
        return cleanDateStr.substring(0, 4) === thisYearStr;
      }
      case 'nextYear': {
        const nextYearStr = String(todayObj.getFullYear() + 1);
        return cleanDateStr.substring(0, 4) === nextYearStr;
      }
      case 'custom': {
        if (!startDate && !endDate) return true;
        const start = startDate || '0000-00-00';
        const end = endDate || '9999-99-99';
        return cleanDateStr >= start && cleanDateStr <= end;
      }
      default:
        return true;
    }
  };

  // Filtreleme mantığı
  const filteredChecks = useMemo(() => {
    if (isTakasRoute) return [];
    return checks.filter(c => {
      if (c.check_type !== activeTab) return false;
      const isSenet = 
        c.document_type === 'senet' || 
        (c.tahsildar_banka || '').toUpperCase() === 'SENET' || 
        (c.bank_name || '').toUpperCase() === 'SENET';
      
      if (documentTypeFilter !== 'all') {
        const currentDocType = isSenet ? 'senet' : 'cek';
        if (currentDocType !== documentTypeFilter) return false;
      }

      // Kullanıcı özellikle "Ödenen" veya "Tahsil Edilen/Ciro" filtresini seçmediyse, ödenmiş çekleri listelerden temizle (Tüm Çekler dahil)
      const checkStatus = cleanStatus(c.status);
      const isPaid = checkStatus.includes('ödendi') || 
                     checkStatus.includes('ödenen') || 
                     checkStatus.includes('tahsil edildi') || 
                     checkStatus.includes('tahsilat') || 
                     checkStatus.includes('ciro');
                     
      const isPaidFilterSelected = 
        selectedSidebarFilter === 'all' ||
        selectedSidebarFilter === 'odenen' || 
        selectedSidebarFilter === 'portfoyden_tahsil' || 
        selectedSidebarFilter === 'bankadan_tahsil' || 
        selectedSidebarFilter === 'icradan_tahsil' ||
        selectedSidebarFilter === 'ciro';
        
      if (isPaid && !isPaidFilterSelected) {
        return false;
      }

      // Sol Menü Durum Filtresi
      if (selectedSidebarFilter !== 'all') {
        const checkStatus = cleanStatus(c.status);
        if (activeTab === 'alinan') {
          if (selectedSidebarFilter === 'portfoyde' && !checkStatus.includes('portföyde')) return false;
          if (selectedSidebarFilter === 'elimizde' && !(checkStatus.includes('portföyde') && cleanStatus(c.ciro_edilen).includes('elimizde'))) return false;
          if (selectedSidebarFilter === 'ciro' && !checkStatus.includes('ciro')) return false;
          if (selectedSidebarFilter === 'teminata_verildi' && !checkStatus.includes('teminata')) return false;
          if (selectedSidebarFilter === 'takasa_verildi' && !checkStatus.includes('takasa')) return false;
          if (selectedSidebarFilter === 'icraya_verildi' && !checkStatus.includes('icra')) return false;
          if (selectedSidebarFilter === 'faktoringe_verildi' && !checkStatus.includes('faktoring')) return false;
          if (selectedSidebarFilter === 'borcluya_iade' && !checkStatus.includes('iade')) return false;
          if (selectedSidebarFilter === 'portfoyden_tahsil' && !checkStatus.includes('portföyden tahsil')) return false;
          if (selectedSidebarFilter === 'bankadan_tahsil' && !checkStatus.includes('bankadan tahsil') && !checkStatus.includes('tahsil edildi') && !checkStatus.includes('tahsilde')) return false;
          if (selectedSidebarFilter === 'icradan_tahsil' && !checkStatus.includes('icradan tahsil')) return false;
          if (selectedSidebarFilter === 'portfoyde_karsiliksiz' && !checkStatus.includes('portföyde karşılıksız') && !checkStatus.includes('portföy karşılıksız')) return false;
          if (selectedSidebarFilter === 'bankada_karsiliksiz' && !checkStatus.includes('bankada karşılıksız') && !checkStatus.includes('banka karşılıksız') && !checkStatus.includes('yazıldı') && !checkStatus.includes('karşılıksız')) return false;
        } else {
          if (selectedSidebarFilter === 'tahsilde' && !checkStatus.includes('tahsilde') && !checkStatus.includes('beklemede') && !checkStatus.includes('ödenmedi')) return false;
          if (selectedSidebarFilter === 'odenen' && !checkStatus.includes('ödendi') && !checkStatus.includes('ödenen') && !(checkStatus.includes('tahsil') && !checkStatus.includes('tahsilde'))) return false;
          if (selectedSidebarFilter === 'geri_alinan' && !checkStatus.includes('geri alındı')) return false;
          if (selectedSidebarFilter === 'iptal' && !checkStatus.includes('iptal')) return false;
          if (selectedSidebarFilter === 'yasakli' && !checkStatus.includes('yasaklı')) return false;
          if (selectedSidebarFilter === 'kayip' && !checkStatus.includes('kayıp')) return false;
        }
      }

      // Tarih Filtresi
      if (!isWithinDateFilter(c.due_date)) return false;

      // Arama Metni
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const checkNo = (c.check_no || '').toLowerCase();
        const debtor = fixCorruptedText(c.debtor || '').toLowerCase();
        const creditor = fixCorruptedText(c.creditor || '').toLowerCase();
        const bank = fixCorruptedText(c.bank_name || '').toLowerCase();
        if (!(checkNo.includes(query) || debtor.includes(query) || creditor.includes(query) || bank.includes(query))) {
          return false;
        }
      }

      // Kolon Bazlı Filtreleme
      if (columnFilters.due_date) {
        const checkVal = formatDate(c.due_date).toLowerCase();
        if (!checkVal.includes(columnFilters.due_date.toLowerCase())) return false;
      }
      if (columnFilters.remaining_days) {
        const days = calculateRemainingDays(c.due_date);
        const checkVal = days !== null ? String(days) : '';
        if (!checkVal.includes(columnFilters.remaining_days)) return false;
      }
      if (columnFilters.debtor) {
        const checkVal = fixCorruptedText(c.debtor || '').toLowerCase();
        if (!checkVal.includes(columnFilters.debtor.toLowerCase())) return false;
      }
      if (columnFilters.kesideci) {
        const checkVal = fixCorruptedText(c.kesideci || '').toLowerCase();
        if (!checkVal.includes(columnFilters.kesideci.toLowerCase())) return false;
      }
      if (columnFilters.creditor) {
        const checkVal = fixCorruptedText(c.creditor || '').toLowerCase();
        if (!checkVal.includes(columnFilters.creditor.toLowerCase())) return false;
      }
      if (columnFilters.check_no) {
        const checkVal = (c.check_no || '').toLowerCase();
        if (!checkVal.includes(columnFilters.check_no.toLowerCase())) return false;
      }
      if (columnFilters.bank_name) {
        const checkVal = (c.bank_name || '').toLowerCase();
        if (!checkVal.includes(columnFilters.bank_name.toLowerCase())) return false;
      }
      if (columnFilters.bank_branch) {
        const checkVal = (c.bank_branch || '').toLowerCase();
        if (!checkVal.includes(columnFilters.bank_branch.toLowerCase())) return false;
      }
      if (columnFilters.keside_yeri) {
        const checkVal = (c.keside_yeri || '').toLowerCase();
        if (!checkVal.includes(columnFilters.keside_yeri.toLowerCase())) return false;
      }
      if (columnFilters.issue_date) {
        const checkVal = formatDate(c.issue_date).toLowerCase();
        if (!checkVal.includes(columnFilters.issue_date.toLowerCase())) return false;
      }
      if (columnFilters.tahsildar_banka) {
        const checkVal = (c.tahsildar_banka || '').toLowerCase();
        if (!checkVal.includes(columnFilters.tahsildar_banka.toLowerCase())) return false;
      }
      if (columnFilters.status) {
        const checkVal = (c.status || '').toLowerCase();
        if (!checkVal.includes(columnFilters.status.toLowerCase())) return false;
      }
      if (columnFilters.amount) {
        const checkVal = String(c.amount || '').toLowerCase();
        if (!checkVal.includes(columnFilters.amount.toLowerCase())) return false;
      }
      if (columnFilters.ciro_edilen) {
        const checkVal = (c.ciro_edilen || '').toLowerCase();
        if (!checkVal.includes(columnFilters.ciro_edilen.toLowerCase())) return false;
      }
      if (columnFilters.ozel_alan) {
        const checkVal = (c.ozel_alan || '').toLowerCase();
        if (!checkVal.includes(columnFilters.ozel_alan.toLowerCase())) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'due_date') {
        valA = a.due_date ? new Date(a.due_date).getTime() : 0;
        valB = b.due_date ? new Date(b.due_date).getTime() : 0;
      } else if (sortField === 'remaining_days') {
        const daysA = calculateRemainingDays(a.due_date);
        const daysB = calculateRemainingDays(b.due_date);
        valA = daysA !== null ? daysA : 999999;
        valB = daysB !== null ? daysB : 999999;
      } else if (sortField === 'amount') {
        valA = Number(a.amount || 0);
        valB = Number(b.amount || 0);
      } else if (sortField === 'created_at' || sortField === 'issue_date') {
        const fieldKey = sortField as keyof typeof a;
        valA = a[fieldKey] ? new Date(a[fieldKey] as string).getTime() : 0;
        valB = b[fieldKey] ? new Date(b[fieldKey] as string).getTime() : 0;
      } else {
        const fieldKey = sortField as keyof typeof a;
        valA = String(a[fieldKey] || '').toLowerCase();
        valB = String(b[fieldKey] || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [checks, activeTab, selectedSidebarFilter, dateFilterType, startDate, endDate, searchTerm, columnFilters, sortField, sortDirection, documentTypeFilter, isTakasRoute]);

  // Finansal özet istatistikleri
  const stats = useMemo(() => {
    if (isTakasRoute) return { count: 0, todayAmount: 0, tomorrowAmount: 0, thisWeekAmount: 0 };
    let activeChecks = checks.filter(c => c.check_type === activeTab);
    const count = activeChecks.length;

    const getLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayObj = new Date();
    const todayStr = getLocalDateString(todayObj);
    
    const tomorrowObj = new Date();
    tomorrowObj.setDate(todayObj.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrowObj);

    // This week (Monday to Sunday)
    const todayForWeek = new Date();
    todayForWeek.setHours(0, 0, 0, 0);
    const day = todayForWeek.getDay();
    const subtractDays = day === 6 ? 0 : day + 1;
    const startOfWeek = new Date(todayForWeek);
    startOfWeek.setDate(todayForWeek.getDate() - subtractDays);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const isPending = (c: any) => {
      const st = cleanStatus(c.status || '').toLowerCase();
      if (st.includes('ödendi') || st.includes('ödenen')) return false;
      if (st.includes('ciro')) return false;
      if (st.includes('tahsil') && (st.includes('portföyden') || st.includes('bankadan') || st.includes('icradan'))) return false;
      if (st.includes('iade')) return false;
      return true;
    };

    const todayAmount = activeChecks
      .filter(c => c.due_date && c.due_date.substring(0, 10) === todayStr && isPending(c))
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const tomorrowAmount = activeChecks
      .filter(c => c.due_date && c.due_date.substring(0, 10) === tomorrowStr && isPending(c))
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const thisWeekAmount = activeChecks
      .filter(c => {
        if (!c.due_date || !isPending(c)) return false;
        const checkDate = new Date(c.due_date.substring(0, 10) + 'T00:00:00');
        return checkDate >= startOfWeek && checkDate <= endOfWeek;
      })
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    return {
      count,
      todayAmount,
      tomorrowAmount,
      thisWeekAmount
    };
  }, [checks, activeTab, isTakasRoute]);

  const filteredTotal = useMemo(() => {
    return filteredChecks.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  }, [filteredChecks]);

  const formatCurrency = (val: number, currency: string | null) => {
    const formatted = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    return `${formatted} ${currency || 'TRY'}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Excel Dışa Aktarma
  const handleExportExcel = () => {
    const dataToExport = filteredChecks.map(c => {
      const remainingDays = calculateRemainingDays(c.due_date);
      if (activeTab === 'alinan') {
        return {
          'EBS ID': c.local_id,
          'Çek No': c.check_no || '',
          'Banka': c.bank_name || '',
          'Şube': c.bank_branch || '',
          'Veren / Asıl Borçlu': c.debtor || '',
          'Ciro Eden': c.creditor || '',
          'Vade Tarihi': c.due_date || '',
          'Kalan Gün': remainingDays !== null ? remainingDays : '',
          'Tutar': c.amount,
          'Para Birimi': c.para_birimi || 'TRY',
          'Durum': c.status || ''
        };
      } else {
        return {
          'EBS ID': c.local_id,
          'Çek No': c.check_no || '',
          'Kendi Banka Hesabımız': c.bank_name || '',
          'Alacaklı / Verilen Firma': c.creditor || '',
          'Vade Tarihi': c.due_date || '',
          'Kalan Gün': remainingDays !== null ? remainingDays : '',
          'Tutar': c.amount,
          'Para Birimi': c.para_birimi || 'TRY',
          'Durum': c.status || ''
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'alinan' ? 'Alınan Çekler' : 'Kesilen Çekler');
    XLSX.writeFile(workbook, activeTab === 'alinan' ? 'Alinan_Cekler.xlsx' : 'Kesilen_Cekler.xlsx');
  };

  const handleExportPdf = () => {
    window.print();
  };

  const currentSidebarFilters = activeTab === 'alinan' ? alinanSidebarFilters : kesilenSidebarFilters;

  const dateOptions = [
    { id: 'all', label: 'Keşide Tarihi : Tümü' },
    { id: 'yesterday', label: 'Keşide Tarihi : Dün' },
    { id: 'today', label: 'Keşide Tarihi : Bugün' },
    { id: 'tomorrow', label: 'Keşide Tarihi : Yarın' },
    { id: 'thisWeek', label: 'Keşide Tarihi : Bu hafta içinde' },
    { id: 'nextWeek', label: 'Keşide Tarihi : Bir sonraki hafta' },
    { id: 'thisMonth', label: 'Keşide Tarihi : Bu ay içinde' },
    { id: 'nextMonth', label: 'Keşide Tarihi : Bir sonraki ay' },
    { id: 'thisYear', label: 'Keşide Tarihi : Bu yıl içinde' },
    { id: 'nextYear', label: 'Keşide Tarihi : Bir sonraki yıl' },
    { id: 'custom', label: 'Keşide Tarihi : Özel Tarih Aralığı' }
  ];

  const getBankColumn = (debtor: string | null, bankName: string | null) => {
    const d = (debtor || '').toUpperCase().trim();
    const b = (bankName || '').toUpperCase().trim();
    
    if (d.includes('TAKSİT') || b.includes('TAKSİT')) return 'TAKSİT';
    
    // Determine prefix (E. or M.)
    let prefix = 'E.';
    if (d.startsWith('M.') || d.includes('MARİF') || d.includes('MARIF')) {
      prefix = 'M.';
    } else if (b.startsWith('M.') || b.includes('MARİF') || b.includes('MARIF')) {
      prefix = 'M.';
    } else if (d.startsWith('E.') || d.includes('ETİK') || d.includes('ETIK')) {
      prefix = 'E.';
    } else if (b.startsWith('E.') || b.includes('ETİK') || b.includes('ETIK')) {
      prefix = 'E.';
    }
    
    // Match base bank name
    if (d.includes('AKBANK') || b.includes('AKBANK')) return `${prefix}AKBANK`;
    if (d.includes('DENİZ') || d.includes('DENIZ') || b.includes('DENİZ') || b.includes('DENIZ')) return `${prefix}DENİZ`;
    if (d.includes('ZİRAAT') || d.includes('ZIRAAT') || b.includes('ZİRAAT') || b.includes('ZIRAAT')) return `${prefix}ZİRAAT`;
    if (d.includes('ALBARAKA') || b.includes('ALBARAKA')) return 'ALBARAKA';
    if (d.includes('İŞ') || d.includes('IS') || d.includes('İŞBANK') || d.includes('ISBANK') || b.includes('İŞ') || b.includes('IS') || b.includes('İŞBANK') || b.includes('ISBANK')) return `${prefix}İŞBANK`;
    if (d.includes('GARANTİ') || d.includes('GARANTI') || b.includes('GARANTİ') || b.includes('GARANTI')) return `${prefix}GARANTİ`;
    if (d.includes('YAPI') || b.includes('YAPI')) return `${prefix}YAPI`;
    
    return null;
  };

  // Takas Dashboard Sınıflandırması
  const dashboardData = useMemo(() => {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');

    const isCheckPaid = (status: string | null | undefined): boolean => {
      const clean = cleanStatus(status);
      return clean.includes('ödendi') || 
             clean.includes('ödenen') || 
             clean.includes('tahsil edildi') || 
             clean.includes('tahsilat') || 
             clean.includes('ciro') ||
             clean.includes('iade') || 
             clean.includes('iptal');
    };

    // 1. Durumu 'Tahsilde', 'beklemede', 'ödenmedi' olan (yani Ödendi/İptal OLMAYAN), kesilen tipte:
    // - Vadesi bugün olanlar
    // - VEYA özel alanı 'TAKASTA' ile başlayanlar
    // - VEYA taksit / manuel girilmiş olup henüz 'Ödendi' yapılmamış geçmiş kayıtlar (debtor === 'TAKSİT' veya !check_no)
    const activeUnpaidKesilen = checks.filter(c => {
      if (c.check_type !== 'kesilen') return false;
      const status = cleanStatus(c.status);
      if (isCheckPaid(c.status) || !['tahsilde', 'beklemede', 'ödenmedi'].includes(status)) {
        return false;
      }
      if (!c.due_date) return false;
      const due = c.due_date.substring(0, 10);
      const isForced = (c.ozel_alan || '').trim().toUpperCase().startsWith('TAKASTA');
      const isManualOrTaksit = c.debtor === 'TAKSİT' || !c.check_no;
      
      return due === todayStr || isForced || (isManualOrTaksit && due <= todayStr);
    });

    // 2. Alınan çeklerde asıl alacaklı kısmında 'HATIR BİZİM BORCUMUZ' veya 'HATIR BİZİM BORÇ' yazanlar (Veya özel alanı 'TAKASTA' ile başlayanlar)
    const hatirAlinan = checks.filter(c => {
      if (c.check_type !== 'alinan') return false;
      if (isCheckPaid(c.status)) return false;
      
      const isForced = (c.ozel_alan || '').trim().toUpperCase().startsWith('TAKASTA');
      if (!isForced) {
        if (!c.due_date) return false;
        const due = c.due_date.substring(0, 10);
        if (due !== todayStr) return false;
      }

      return isForced || isHatirAlinan(c);
    });

    const activeUnpaid = [...activeUnpaidKesilen, ...hatirAlinan];

    // 2. Durumu 'Kayıp' olan tüm çekler (Kayıp Çekler)
    const kayipChecks = checks.filter(c => cleanStatus(c.status).includes('kayıp'));

    const nonTakasKeywords = ['HATIR', 'KRŞ', 'KARŞILIK', 'TAZMİNAT', 'BORÇ', 'ÖMER DEMİR', 'BURAK BESİCİLİK', 'ALİ ARAN', 'TAKASTA OLMAYAN'];



    const isNonTakasCheck = (c: EbsCheck) => {
      const note = (c.ozel_alan || '').toUpperCase();
      if (note.includes('TAKASTA OLMAYAN')) {
        return true;
      }

      if (isHatirAlinan(c)) return false;
      
      const creditor = (c.creditor || '').toUpperCase();
      const debtor = (c.debtor || '').toUpperCase();

      if (note.includes('TAKASTA') && !note.includes('TAKASTA OLMAYAN')) {
        return false;
      }
      
      const column = getBankColumn(c.debtor, c.bank_name) || getCleanBankName(c.debtor, c.bank_name);

      if (c.check_type === 'kesilen' && column !== null) {
        return false;
      }
      
      const matchesKeyword = nonTakasKeywords.some(keyword => 
        creditor.includes(keyword) || debtor.includes(keyword) || note.includes(keyword)
      );
      
      return matchesKeyword || !column;
    };

    const takasCandidates: EbsCheck[] = [];
    const nonTakasChecksList: EbsCheck[] = [];
    
    activeUnpaid.forEach(c => {
      if (isNonTakasCheck(c)) {
        nonTakasChecksList.push(c);
      } else {
        takasCandidates.push(c);
      }
    });
    
    const candidateBanks: Record<string, EbsCheck[]> = {};
    const taksitChecks: EbsCheck[] = [];
    
    takasCandidates.forEach(c => {
      const bankName = getBankColumn(c.debtor, c.bank_name) || getCleanBankName(c.debtor, c.bank_name);
      const note = (c.ozel_alan || '').toUpperCase();
      const isExplicitTakasta = note.includes('TAKASTA') && !note.includes('TAKASTA OLMAYAN');
      const shouldGoToTaksit = isHatirAlinan(c) || bankName === 'TAKSİT' || (!bankName && isExplicitTakasta);

      if (shouldGoToTaksit) {
        taksitChecks.push(c);
      } else {
        if (bankName) {
          if (!candidateBanks[bankName]) candidateBanks[bankName] = [];
          candidateBanks[bankName].push(c);
        } else {
          nonTakasChecksList.push(c);
        }
      }
    });
    
    const possibleBanksPredefined = [
      'ALBARAKA',
      'E.DENİZ',
      'E.ZİRAAT',
      'M.ZİRAAT',
      'M.DENİZ',
      'M.GARANTİ',
      'M.AKBANK',
      'M.YAPI'
    ];
    const activeSet = Object.keys(candidateBanks).filter(bank => candidateBanks[bank] && candidateBanks[bank].length > 0);
    const inactiveSet = possibleBanksPredefined.filter(bank => !activeSet.includes(bank));
    
    const combined = [...activeSet, ...inactiveSet];
    const sliced = combined.slice(0, 8);
    
    sliced.sort((a, b) => {
      const getSortWeight = (bank: string) => {
        const bothDeniz = sliced.includes('E.DENİZ') && sliced.includes('M.DENİZ');
        const order = [
          'ALBARAKA',
          'E.DENİZ',
          'E.ZİRAAT',
          'M.ZİRAAT',
          'M.DENİZ',
          'E.GARANTİ', 'M.GARANTİ',
          'E.AKBANK', 'M.AKBANK',
          'E.İŞBANK', 'M.İŞBANK',
          'E.YAPI', 'M.YAPI'
        ];
        if (bank === 'M.DENİZ' && !bothDeniz) {
          return order.indexOf('E.DENİZ');
        }
        return order.indexOf(bank);
      };
      
      const idxA = getSortWeight(a);
      const idxB = getSortWeight(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    
    const activeBankCols = sliced;
    
    const columns: Record<string, EbsCheck[]> = {};
    activeBankCols.forEach(col => {
      columns[col] = [];
    });
    columns['TAKSİT'] = taksitChecks;
    
    const nonTakasChecks = [...nonTakasChecksList];
    
    takasCandidates.forEach(c => {
      const bankName = getBankColumn(c.debtor, c.bank_name) || getCleanBankName(c.debtor, c.bank_name);
      const note = (c.ozel_alan || '').toUpperCase();
      const isExplicitTakasta = note.includes('TAKASTA') && !note.includes('TAKASTA OLMAYAN');
      const shouldGoToTaksit = isHatirAlinan(c) || bankName === 'TAKSİT' || (!bankName && isExplicitTakasta);

      if (shouldGoToTaksit) {
        // already handled
      } else {
        if (bankName && columns[bankName]) {
          columns[bankName].push(c);
        } else {
          nonTakasChecks.push(c);
        }
      }
    });

    // Helper to determine if a check is İç Takas
    const isIcTakasCheck = (c: EbsCheck) => {
      return (c.ozel_alan || '').trim().toUpperCase().includes('İÇ TAKAS');
    };

    // Sort each column's checks. For TAKSİT, place manual entries at the bottom. For banks, place İç Takas at the bottom.
    Object.keys(columns).forEach(colName => {
      if (colName === 'TAKSİT') {
        const getDesc = (c: EbsCheck) => {
          const val = isHatirAlinan(c) ? (c.kesideci || '') : (c.creditor || '');
          return val.trim().toUpperCase();
        };
        const isToggledNonTakas = (c: EbsCheck) => {
          const note = (c.ozel_alan || '').toUpperCase();
          return note.includes('TAKASTA') && !note.includes('TAKASTA OLMAYAN');
        };
        const isCard = (c: EbsCheck) => {
          const desc = getDesc(c);
          return desc.includes('KART');
        };
        const isSystem = (c: EbsCheck) => {
          if (isCard(c) || isToggledNonTakas(c)) return false;
          const desc = getDesc(c);
          return desc.includes('ALBARAKA') || 
                 desc.includes('KUVEYT') || 
                 desc.includes('TAKSİT') || 
                 desc.includes('VAKIF') || 
                 desc.includes('MARİF') || 
                 desc.includes('MARIF');
        };
        
        const systemChecks = columns[colName].filter(c => isSystem(c));
        const cardChecks = columns[colName].filter(c => isCard(c) && !isToggledNonTakas(c));
        const regularManualChecks = columns[colName].filter(c => !isSystem(c) && !isCard(c) && !isToggledNonTakas(c));
        const toggledNonTakasChecks = columns[colName].filter(c => isToggledNonTakas(c));
        
        // Sort lists: system checks alphabetically, card checks alphabetically, manual checks chronologically by creation date to prevent jumping while editing
        systemChecks.sort((a, b) => getDesc(a).localeCompare(getDesc(b), 'tr'));
        cardChecks.sort((a, b) => getDesc(a).localeCompare(getDesc(b), 'tr'));
        regularManualChecks.sort((a, b) => {
          const timeDiff = (a.created_at || '').localeCompare(b.created_at || '');
          if (timeDiff !== 0) return timeDiff;
          return (a.id || '').localeCompare(b.id || '');
        });
        toggledNonTakasChecks.sort((a, b) => {
          const timeDiff = (a.created_at || '').localeCompare(b.created_at || '');
          if (timeDiff !== 0) return timeDiff;
          return (a.id || '').localeCompare(b.id || '');
        });
        
        // Sıralama: 1. Banka Taksitleri -> 2. Kart Girişleri -> 3. Diğer Elle Girilenler (örn. ANKARA SEMİH) -> 4. Takasa Taşınanlar
        columns[colName] = [...systemChecks, ...cardChecks, ...regularManualChecks, ...toggledNonTakasChecks];
      } else {
        columns[colName].sort((a, b) => {
          const aIc = isIcTakasCheck(a);
          const bIc = isIcTakasCheck(b);
          if (aIc !== bIc) {
            return aIc ? 1 : -1;
          }
          return Number(a.amount || 0) - Number(b.amount || 0);
        });
      }
    });

    // Sort non-takas checks to match Excel template (empty bank name first, then alphabetical by bank, then alphabetical by creditor)
    nonTakasChecks.sort((a, b) => {
      const bankA = (a.bank_name || a.debtor || '').trim().toUpperCase();
      const bankB = (b.bank_name || b.debtor || '').trim().toUpperCase();
      
      const hasBankA = bankA && bankA !== 'TAKSİT';
      const hasBankB = bankB && bankB !== 'TAKSİT';
      
      if (!hasBankA && hasBankB) return 1;
      if (hasBankA && !hasBankB) return -1;
      if (hasBankA && hasBankB && bankA !== bankB) {
        return bankA.localeCompare(bankB, 'tr');
      }
      
      const nameA = (a.creditor || a.kesideci || '').trim().toUpperCase();
      const nameB = (b.creditor || b.kesideci || '').trim().toUpperCase();
      return nameA.localeCompare(nameB, 'tr');
    });

    const columnTotals: Record<string, number> = {};
    let takasGrandTotal = 0;
    Object.keys(columns).forEach(k => {
      const sum = columns[k].reduce((acc, c) => acc + Number(c.amount || 0), 0);
      columnTotals[k] = sum;
      takasGrandTotal += sum;
    });

    const nonTakasTotal = nonTakasChecks.reduce((acc, c) => acc + Number(c.amount || 0), 0);
    const kayipTotal = kayipChecks.reduce((acc, c) => acc + Number(c.amount || 0), 0);

    const bankBalances: Record<string, number> = {};
    let totalBankBalance = 0;
    bankAccounts.forEach(acc => {
      const bal = Number(acc.balance || 0);
      const bName = (acc.bank || '').toUpperCase().trim();
      
      if (!bankBalances[bName]) bankBalances[bName] = 0;
      bankBalances[bName] += bal;
      totalBankBalance += bal;
    });

    return {
      activeBankCols,
      columns,
      columnTotals,
      takasGrandTotal,
      nonTakasChecks,
      nonTakasTotal,
      kayipChecks,
      kayipTotal,
      bankBalances,
      totalBankBalance
    };
  }, [checks, bankAccounts]);

  const formatExcelNumber = (num: number) => {
    if (!num || num === 0 || num === 0.01) return '';
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(num);
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = input.value;
    const selectionStart = input.selectionStart;

    const digitsBeforeCursor = selectionStart !== null
      ? value.substring(0, selectionStart).replace(/\D/g, '').length
      : 0;

    const cleanValue = value.replace(/\D/g, '');

    if (!cleanValue) {
      input.value = '';
      return;
    }

    const formatted = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Number(cleanValue));
    input.value = formatted;

    if (selectionStart !== null) {
      let newCursorPos = 0;
      let digitCount = 0;
      while (newCursorPos < formatted.length && digitCount < digitsBeforeCursor) {
        if (/\d/.test(formatted[newCursorPos])) {
          digitCount++;
        }
        newCursorPos++;
      }
      input.setSelectionRange(newCursorPos, newCursorPos);
    }
  };



  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    section: 'takas' | 'nontakas' | 'kayip' | 'balances',
    colKey: string,
    rowIndex: number
  ) => {
    const activeBankCols = dashboardData?.activeBankCols || ['ALBARAKA', 'E.DENİZ', 'E.ZİRAAT', 'M.ZİRAAT', 'M.AKBANK', 'M.GARANTİ', 'E.İŞBANK', 'M.YAPI'];
    const sections = {
      takas: [...activeBankCols, 'TAKSİT-Tutar', 'TAKSİT-Desc'],
      nontakas: ['creditor', 'debtor', 'amount'],
      kayip: ['creditor', 'bank_name', 'amount', 'due_date'],
      balances: ['balance']
    };

    const cols = sections[section];
    const colIndex = cols.indexOf(colKey);

    let targetRow = rowIndex;
    let targetColIndex = colIndex;
    let shouldNavigate = false;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.currentTarget.value = e.currentTarget.defaultValue;
      e.currentTarget.blur();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
      
      if (section === 'takas') {
        if (colKey === 'TAKSİT-Tutar') {
          targetColIndex = colIndex + 1; // Move to TAKSİT-Desc
          targetRow = rowIndex;
        } else if (colKey === 'TAKSİT-Desc') {
          targetColIndex = colIndex - 1; // Move to TAKSİT-Tutar
          targetRow = rowIndex + 1;
        } else {
          targetRow = rowIndex + 1; // Other bank columns move down
        }
      } else {
        // Horizontal navigation for nontakas, kayip, and balances
        if (colIndex < cols.length - 1) {
          targetColIndex = colIndex + 1;
          targetRow = rowIndex;
        } else {
          targetColIndex = 0;
          targetRow = rowIndex + 1;
        }
      }
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
      const targetCol = cols[targetColIndex];
      requestAnimationFrame(() => {
        const nextInput = document.querySelector(
          `input[data-section="${section}"][data-col="${targetCol}"][data-row-index="${targetRow}"]`
        ) as HTMLInputElement | null;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      });
    }
  };

  const handleCellBlur = (
    check: EbsCheck | undefined,
    field: 'amount' | 'creditor' | 'debtor' | 'bank_name' | 'due_date',
    newValue: string,
    context: {
      type: 'takas' | 'nontakas' | 'kayip';
      colName?: string;
      rowIndex: number;
    }
  ) => {
    if (!user?.organizationId) return;

    let parsedValue: any = newValue.trim();
    if (field === 'amount') {
      parsedValue = Number(newValue.replace(/\./g, '').replace(/,/g, '.')) || 0;
    } else if (field === 'due_date' && parsedValue) {
      const parts = parsedValue.split('.');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        parsedValue = `${year}-${month}-${day}`;
      }
    }

    if (field === 'creditor' || field === 'debtor' || field === 'bank_name') {
      parsedValue = formatTaksitDesc(parsedValue);
    }

    if (check) {
      let originalValue = check[field];
      if (field === 'creditor' || field === 'debtor' || field === 'bank_name') {
        originalValue = formatTaksitDesc(originalValue as string);
      }
      if (parsedValue === originalValue) return;

      let shouldDelete = false;
      if (context.colName === 'TAKSİT' || check.debtor === 'TAKSİT') {
        const finalAmount = field === 'amount' ? parsedValue : (check.amount || 0);
        const finalDesc = field === 'creditor' ? parsedValue : (check.creditor || '');
        if ((finalAmount === 0 || !finalAmount) && !finalDesc.trim()) {
          shouldDelete = true;
        }
      } else {
        shouldDelete = field === 'amount' ? (parsedValue === 0 || !parsedValue) : !parsedValue;
      }

      // Optimistic update of local state
      if (shouldDelete) {
        setChecks(prev => prev.filter(c => c.id !== check.id));
      } else {
        setChecks(prev => prev.map(c => c.id === check.id ? { ...c, [field]: parsedValue } : c));
      }

      // Perform update asynchronously in background
      if (check.id.startsWith('temp-')) {
        const insertPromise = insertPromises.current[check.id] || Promise.resolve();
        insertPromise.then(() => {
          setChecks(prev => {
            const latest = prev.find(c => c.local_id === check.local_id);
            if (latest && !latest.id.startsWith('temp-')) {
              if (shouldDelete) {
                supabase.from('ebs_checks').delete().eq('id', latest.id).then(({ error }) => {
                  if (error) console.error(error);
                });
              } else {
                supabase
                  .from('ebs_checks')
                  .update({ [field]: parsedValue })
                  .eq('id', latest.id)
                  .then(({ error }) => {
                    if (error) console.error(error);
                  });
              }
            }
            return prev;
          });
        });
      } else {
        if (shouldDelete) {
          supabase.from('ebs_checks').delete().eq('id', check.id).then(({ error }) => {
            if (error) {
              console.error(error);
              void fetchChecks(); // Revert/sync on error
            }
          });
        } else {
          supabase
            .from('ebs_checks')
            .update({ [field]: parsedValue })
            .eq('id', check.id)
            .then(({ error }) => {
              if (error) {
                console.error(error);
                void fetchChecks(); // Revert/sync on error
              }
            });
        }
      }
    } else {
      if (!parsedValue || (field === 'amount' && parsedValue === 0)) return;

      const cellKey = `${context.type}-${context.colName || ''}-${context.rowIndex}`;
      if (pendingInserts.current[cellKey]) return;
      pendingInserts.current[cellKey] = true;

      const todayStr = new Date().toISOString().split('T')[0];
      const localId = Math.floor(Date.now() % 10000000);
      const tempId = `temp-${localId}`;

      const insertData: any = {
        organization_id: user.organizationId,
        check_type: context.type === 'kayip' ? 'alinan' : 'kesilen',
        status: context.type === 'kayip' ? 'Kayıp' : 'Tahsilde',
        due_date: todayStr,
        issue_date: todayStr,
        local_id: localId,
        para_birimi: 'TRY',
        amount: 0
      };

      if (context.type === 'takas') {
        insertData.debtor = context.colName;
        insertData.ozel_alan = 'TAKASTA';
        if (field === 'amount') insertData.amount = parsedValue;
        if (field === 'creditor') insertData.creditor = parsedValue;
      } else if (context.type === 'nontakas') {
        insertData.ozel_alan = 'TAKASTA OLMAYAN';
        if (field === 'amount') insertData.amount = parsedValue;
        if (field === 'creditor') insertData.creditor = parsedValue;
        if (field === 'debtor') insertData.debtor = parsedValue;
      } else if (context.type === 'kayip') {
        if (field === 'amount') insertData.amount = parsedValue;
        if (field === 'creditor') insertData.creditor = parsedValue;
        if (field === 'bank_name') insertData.bank_name = parsedValue;
        if (field === 'due_date') insertData.due_date = parsedValue;
      }

      // Create optimistic check in state
      const optimisticCheck: EbsCheck = {
        id: tempId,
        created_at: new Date().toISOString(),
        ...insertData
      };

      setChecks(prev => [...prev, optimisticCheck]);

      // Insert into Supabase in background
      const insertPromise = supabase
        .from('ebs_checks')
        .insert(insertData)
        .select() as any;

      insertPromises.current[tempId] = insertPromise;

      insertPromise.then(({ data, error }: { data: any[] | null; error: any }) => {
        delete pendingInserts.current[cellKey];
        delete insertPromises.current[tempId];
        if (error) {
          console.error('Supabase insert error:', error);
          setChecks(prev => prev.filter(c => c.id !== tempId));
        } else if (data && data[0]) {
          // Replace optimistic check with real check from DB, keeping any changes made in the meantime
          setChecks(prev => prev.map(c => c.id === tempId ? { ...data[0], amount: c.amount, creditor: c.creditor, debtor: c.debtor } : c));
        }
      });
    }
  };

  const handleToggleTakasStatus = async (
    check: EbsCheck | undefined,
    statusOption: 'takasta' | 'nontakas' | 'odendi' | 'ictakas' | 'sil',
    targetBank?: string
  ) => {
    setOpenDropdown(null);
    if (!check || !user?.organizationId) return;

    if (statusOption === 'odendi') {
      const checkDesc = check.creditor || check.check_no ? ` (${check.creditor || ''} ${check.check_no ? 'No: ' + check.check_no : ''})` : '';
      if (!confirm(`Bu çeki/ödemeyi${checkDesc} "Ödendi" olarak işaretlemek istediğinize emin misiniz?`)) {
        return;
      }
    }

    // 1. Calculate new values optimistically
    let updatedOzelAlan = check.ozel_alan || '';
    let updatedStatus = check.status || '';
    let updatedDebtor = check.debtor || '';
    let shouldDelete = false;

    if (statusOption === 'sil') {
      shouldDelete = true;
    } else if (statusOption === 'odendi') {
      updatedStatus = 'Ödendi';
    } else if (statusOption === 'ictakas') {
      const isCurrentlyIcTakas = (check.ozel_alan || '').toUpperCase().includes('İÇ TAKAS');
      updatedOzelAlan = isCurrentlyIcTakas ? 'TAKASTA' : 'TAKASTA - İÇ TAKAS';
    } else {
      const isCurrentlyIcTakas = (check.ozel_alan || '').toUpperCase().includes('İÇ TAKAS');
      if (statusOption === 'nontakas') {
        updatedOzelAlan = isCurrentlyIcTakas ? 'TAKASTA OLMAYAN - İÇ TAKAS' : 'TAKASTA OLMAYAN';
      } else {
        updatedOzelAlan = isCurrentlyIcTakas ? 'TAKASTA - İÇ TAKAS' : 'TAKASTA';
      }
      if (statusOption === 'takasta' && targetBank) {
        updatedDebtor = targetBank;
      }
    }

    // 2. Apply updates to local state immediately
    if (shouldDelete) {
      setChecks(prev => prev.filter(c => c.id !== check.id));
    } else {
      setChecks(prev => prev.map(c => c.id === check.id ? { 
        ...c, 
        ozel_alan: updatedOzelAlan, 
        status: updatedStatus,
        debtor: updatedDebtor
      } : c));
    }

    // 3. Perform database update in the background
    try {
      if (statusOption === 'sil') {
        await supabase
          .from('ebs_checks')
          .delete()
          .eq('id', check.id);
      } else if (statusOption === 'odendi') {
        await supabase
          .from('ebs_checks')
          .update({ status: 'Ödendi' })
          .eq('id', check.id);
      } else if (statusOption === 'ictakas') {
        await supabase
          .from('ebs_checks')
          .update({ ozel_alan: updatedOzelAlan })
          .eq('id', check.id);
      } else {
        const updateData: any = { ozel_alan: updatedOzelAlan };
        if (statusOption === 'takasta' && targetBank) {
          updateData.debtor = targetBank;
        }
        
        await supabase
          .from('ebs_checks')
          .update(updateData)
          .eq('id', check.id);
      }
    } catch (error) {
      console.error('Failed to update check status in background:', error);
      void fetchChecks(); // Revert/sync on error
    }
  };

  const handleMarkColumnAsPaid = async (colName: string) => {
    setOpenHeaderDropdown(null);
    if (!user?.organizationId) return;

    const checksInCol = dashboardData.columns[colName] || [];
    const targets = checksInCol.filter(c => c.id && !(c.status || '').toLowerCase().includes('ödendi'));
    if (targets.length === 0) return;

    if (!confirm(`${colName} sütunundaki tüm çekleri (${targets.length} adet) "Ödendi" olarak işaretlemek istediğinize emin misiniz?`)) {
      return;
    }

    const targetIds = targets.map(t => t.id);

    setChecks(prev => prev.map(c => targetIds.includes(c.id) ? { ...c, status: 'Ödendi' } : c));

    try {
      const { error } = await supabase
        .from('ebs_checks')
        .update({ status: 'Ödendi' })
        .in('id', targetIds);
      if (error) {
        console.error('Supabase batch update status error:', error);
        alert('Çekler güncellenemedi: ' + error.message);
        void fetchChecks();
      }
    } catch (e: any) {
      console.error(e);
      void fetchChecks();
    }
  };

  const handleBalanceBlur = async (
    accountId: string,
    newValue: string
  ) => {
    if (!user?.organizationId) return;

    const parsedValue = Number(newValue.replace(/\./g, '').replace(/,/g, '.')) || 0;
    
    // Optimistic update of local bank accounts state
    setBankAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, balance: parsedValue } : acc));

    try {
      await supabase
        .from('bank_accounts')
        .update({ balance: parsedValue })
        .eq('id', accountId);
    } catch (error) {
      console.error('Failed to update bank balance in background:', error);
      void fetchChecks(); // Sync on error
    }
  };

  const renderTakasDashboard = () => {
    const selectedValues = Object.values(selectedCells);
    const selectedCount = selectedValues.length;
    const selectedTotal = selectedValues.reduce((sum, item) => sum + item.amount, 0);
    const selectedAverage = selectedCount > 0 ? selectedTotal / selectedCount : 0;

    const maxTakasColsLength = Math.max(
      0,
      ...Object.keys(dashboardData.columns).map(k => dashboardData.columns[k]?.length || 0)
    );

    const screenTakasRows = Math.max(
      12,
      maxTakasColsLength + 2
    );

    const printTakasRows = Math.max(
      15,
      maxTakasColsLength + 2
    );

    const screenNonTakasRows = Math.max(7, dashboardData.nonTakasChecks.length + 2);
    const printNonTakasRows = Math.max(11, dashboardData.nonTakasChecks.length + 2);

    return (
      <div className="space-y-6">
        {/* Upper Bank Columns Table with thick Excel border */}
        <div className="overflow-x-auto w-full border-2 border-black bg-white rounded-lg shadow-sm print:border-none">
          <div className="bg-gray-50 border-b border-black px-4 py-3 flex items-center justify-center print:hidden">
            <h3 className="text-sm text-red-600 uppercase tracking-wider text-center takas-cekleri-title">
              TAKAS ÇEKLERİ
            </h3>
          </div>

          {/* Screen-only Table View (Interactive) */}
          <div className="print:hidden">
            <table className="w-full border-collapse" style={{ fontFamily: 'Calibri, Arial, sans-serif' }}>
              <thead>
                <tr className="bg-gray-50 border-b-2 border-black divide-x divide-gray-300 text-center" style={{ fontFamily: 'Calibri, sans-serif' }}>
                  {dashboardData.activeBankCols.map((colName, colIdx) => (
                    <Fragment key={colName}>
                      {colIdx > 0 && <th className="w-[15px] bg-gray-100 p-0 takas-spacer-col"></th>}
                      <th className="py-1.5 w-[100px] min-w-[100px] takas-bank-col text-center takas-header-th relative group" style={{ fontFamily: 'Calibri, sans-serif' }}>
                        <div className="flex items-center justify-center gap-0.5">
                           <span>{colName === 'E.ALBARAKA' || colName === 'M.ALBARAKA' ? 'ALBARAKA' : colName === 'E.İŞBANK' ? 'İŞBANK' : colName}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenHeaderDropdown(openHeaderDropdown === colName ? null : colName);
                            }}
                            className={`p-0.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 focus:outline-none transition-opacity print:hidden ${openHeaderDropdown === colName ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                          >
                            <ChevronDown size={11} className="stroke-[3]" />
                          </button>
                        </div>
                        {openHeaderDropdown === colName && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-28 bg-white border border-gray-300 rounded shadow-lg z-50 py-1 text-left font-sans font-bold">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleMarkColumnAsPaid(colName);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold text-left"
                            >
                              Ödendi
                            </button>
                          </div>
                        )}
                      </th>
                    </Fragment>
                  ))}
                  <th className="w-[15px] bg-gray-100 p-0 takas-spacer-col"></th>
                  <th colSpan={2} className="w-[250px] min-w-[250px] takas-taksit-col text-center takas-header-th relative group" style={{ fontFamily: 'Calibri, sans-serif' }}>
                    <div className="flex items-center justify-center gap-0.5">
                      <span>TAKSİT</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenHeaderDropdown(openHeaderDropdown === 'TAKSİT' ? null : 'TAKSİT');
                        }}
                        className={`p-0.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 focus:outline-none transition-opacity print:hidden ${openHeaderDropdown === 'TAKSİT' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      >
                        <ChevronDown size={11} className="stroke-[3]" />
                      </button>
                    </div>
                    {openHeaderDropdown === 'TAKSİT' && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-28 bg-white border border-gray-300 rounded shadow-lg z-50 py-1 text-left font-sans font-bold">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleMarkColumnAsPaid('TAKSİT');
                          }}
                          className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold text-left"
                        >
                          Ödendi
                        </button>
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Array.from({ length: screenTakasRows }).map((_, rowIndex) => {
                  const taksitList = dashboardData.columns['TAKSİT'] || [];
                  const taksitCheck = taksitList[rowIndex];

                  return (
                    <tr key={rowIndex} className="h-[34px] divide-x divide-gray-300 hover:bg-gray-50/20">
                      {dashboardData.activeBankCols.map(colName => {
                        const list = dashboardData.columns[colName] || [];
                        const check = list[rowIndex];
                        const isIcTakas = check && (colName === 'E.ZİRAAT' || colName === 'M.ZİRAAT') && check.ozel_alan?.includes('İÇ TAKAS');
                        
                        return (
                          <Fragment key={colName}>
                            <td className={`p-0 h-full border border-gray-300 relative group ${isIcTakas ? 'bg-red-600 takas-ictakas-cell' : ''}`}>
                              <div className="relative flex items-center w-full h-full">
                                <input
                                 key={check ? (check.local_id ? `temp-${check.local_id}` : check.id) : `empty-${colName}-${rowIndex}`}
                                 type="text"
                                 className={`w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 text-center text-[17px] pr-5 text-black font-normal ${selectedCells[check?.id || `takas-${colName}-${rowIndex}`] ? 'ring-2 ring-green-600 bg-green-50/50' : ''}`}
                                 onClick={e => handleCellClick(e, check, check ? check.amount : 0, check?.id || `takas-${colName}-${rowIndex}`)}
                                 style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px' }}
                                 defaultValue={check ? formatExcelNumber(check.amount) : ''}
                                 onChange={handleNumberInput}
                                 onFocus={e => e.target.select()}
                                 onKeyDown={e => handleKeyDown(e, 'takas', colName, rowIndex)}
                                 onBlur={e => handleCellBlur(check, 'amount', e.target.value, { type: 'takas', colName, rowIndex })}
                                 data-section="takas"
                                 data-col={colName}
                                 data-row-index={rowIndex}
                                />
                                {check && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (openDropdown?.section === 'takas' && openDropdown?.rowIndex === rowIndex && openDropdown?.colName === colName) {
                                        setOpenDropdown(null);
                                      } else {
                                        setOpenDropdown({ section: 'takas', rowIndex, colName });
                                      }
                                    }}
                                    className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-red-650 rounded bg-white/80 md:opacity-0 md:group-hover:opacity-100 transition-opacity focus:outline-none z-10"
                                  >
                                    <ChevronDown size={14} className="stroke-[3]" />
                                  </button>
                                )}
                                {openDropdown?.section === 'takas' && openDropdown?.rowIndex === rowIndex && openDropdown?.colName === colName && (
                                  <div className="absolute top-full right-0 mt-0.5 w-32 bg-white border border-gray-300 rounded shadow-lg z-50 py-1 text-left">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTakasStatus(check, 'takasta')}
                                      className={`w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold flex items-center justify-between ${!check.ozel_alan?.includes('TAKASTA OLMAYAN') ? 'bg-red-50 text-red-700 font-black' : ''}`}
                                    >
                                      Takasta
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTakasStatus(check, 'nontakas')}
                                      className={`w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold flex items-center justify-between ${check.ozel_alan?.includes('TAKASTA OLMAYAN') ? 'bg-red-50 text-red-700 font-black' : ''}`}
                                    >
                                      Takasta Değil
                                    </button>
                                    {(colName === 'E.ZİRAAT' || colName === 'M.ZİRAAT') && (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTakasStatus(check, 'ictakas')}
                                        className={`w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold text-left border-t border-gray-100 ${check?.ozel_alan?.includes('İÇ TAKAS') ? 'bg-red-50 text-red-700 font-black' : ''}`}
                                      >
                                        İç Takas
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTakasStatus(check, 'odendi')}
                                      className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold text-left border-t border-gray-100"
                                    >
                                      Ödendi
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTakasStatus(check, 'sil')}
                                      className="w-full px-3 py-1.5 text-xs text-red-650 hover:bg-red-50 font-bold text-left border-t border-gray-100"
                                    >
                                      Kaldır
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="bg-gray-100 p-0 takas-spacer-col"></td>
                          </Fragment>
                        );
                      })}
                      {/* Taksit Tutar */}
                      <td className="p-0 h-full border border-gray-300 w-[100px] relative group taksit-tutar-col">
                        <div className="relative flex items-center w-full h-full">
                          <input
                            key={taksitCheck ? (taksitCheck.local_id ? `temp-${taksitCheck.local_id}` : taksitCheck.id) : `empty-taksit-tutar-${rowIndex}`}
                            type="text"
                            className={`w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 text-center text-[17px] font-normal text-gray-900 pr-5 ${selectedCells[taksitCheck?.id || `taksit-tutar-${rowIndex}`] ? 'ring-2 ring-green-600 bg-green-50/50' : ''}`}
                            onClick={e => handleCellClick(e, taksitCheck, taksitCheck ? taksitCheck.amount : 0, taksitCheck?.id || `taksit-tutar-${rowIndex}`)}
                            style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px' }}
                            defaultValue={taksitCheck ? formatExcelNumber(taksitCheck.amount) : ''}
                            onChange={handleNumberInput}
                            onKeyDown={e => handleKeyDown(e, 'takas', 'TAKSİT-Tutar', rowIndex)}
                            onFocus={e => e.target.select()}
                            onBlur={e => handleCellBlur(taksitCheck, 'amount', e.target.value, { type: 'takas', colName: 'TAKSİT', rowIndex })}
                            data-section="takas"
                            data-col="TAKSİT-Tutar"
                            data-row-index={rowIndex}
                          />
                          {taksitCheck && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openDropdown?.section === 'takas' && openDropdown?.rowIndex === rowIndex && openDropdown?.colName === 'TAKSİT') {
                                  setOpenDropdown(null);
                                } else {
                                  setOpenDropdown({ section: 'takas', rowIndex, colName: 'TAKSİT' });
                                }
                              }}
                              className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-red-650 rounded bg-white/80 md:opacity-0 md:group-hover:opacity-100 transition-opacity focus:outline-none z-10"
                            >
                              <ChevronDown size={14} className="stroke-[3]" />
                            </button>
                          )}
                          {openDropdown?.section === 'takas' && openDropdown?.rowIndex === rowIndex && openDropdown?.colName === 'TAKSİT' && (
                            <div className="absolute top-full right-0 mt-0.5 w-32 bg-white border border-gray-300 rounded shadow-lg z-50 py-1 text-left">
                              <button
                                type="button"
                                onClick={() => handleToggleTakasStatus(taksitCheck, 'takasta')}
                                className={`w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold flex items-center justify-between ${!taksitCheck.ozel_alan?.includes('TAKASTA OLMAYAN') ? 'bg-red-50 text-red-700 font-bold' : ''}`}
                              >
                                Takasta
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleTakasStatus(taksitCheck, 'nontakas')}
                                className={`w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold flex items-center justify-between ${taksitCheck.ozel_alan?.includes('TAKASTA OLMAYAN') ? 'bg-red-50 text-red-700 font-bold' : ''}`}
                              >
                                Takasta Değil
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleTakasStatus(taksitCheck, 'odendi')}
                                className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold text-left border-t border-gray-100"
                              >
                                Ödendi
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleTakasStatus(taksitCheck, 'sil')}
                                className="w-full px-3 py-1.5 text-xs text-red-650 hover:bg-red-50 font-bold text-left border-t border-gray-100"
                              >
                                Kaldır
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Taksit Açıklama */}
                      <td className="p-0 h-full border border-gray-300 w-[150px] taksit-desc-col">
                        <input
                          key={taksitCheck ? (taksitCheck.local_id ? `temp-${taksitCheck.local_id}` : taksitCheck.id) : `empty-taksit-desc-${rowIndex}`}
                          type="text"
                          className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 text-left pl-2 text-[17px] font-bold text-gray-700 uppercase"
                          style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px' }}
                          defaultValue={taksitCheck ? (isHatirAlinan(taksitCheck) ? formatTaksitDesc(taksitCheck.kesideci) : formatTaksitDesc(taksitCheck.creditor)) : ''}
                          onKeyDown={e => handleKeyDown(e, 'takas', 'TAKSİT-Desc', rowIndex)}
                          onFocus={e => e.target.select()}
                          onBlur={e => handleCellBlur(taksitCheck, 'creditor', e.target.value, { type: 'takas', colName: 'TAKSİT', rowIndex })}
                          data-section="takas"
                          data-col="TAKSİT-Desc"
                          data-row-index={rowIndex}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-brand-50/50 font-bold text-black border-t-2 border-black divide-x divide-gray-300 h-[36px] text-right" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px' }}>
                  {dashboardData.activeBankCols.map(colName => (
                    <Fragment key={colName}>
                      <td className="text-center text-[17px] font-bold text-black" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px', fontWeight: 'bold' }}>
                        {formatExcelNumber(dashboardData.columnTotals[colName])}
                      </td>
                      <td className="bg-gray-100 p-0 takas-spacer-col"></td>
                    </Fragment>
                  ))}
                  <td colSpan={2} className="text-center text-[17px] font-bold text-black" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px', fontWeight: 'bold' }}>
                    {formatExcelNumber(dashboardData.columnTotals['TAXTIT'] || dashboardData.columnTotals['TAKSİT'])}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Print-only Table View (Side-by-Side individual columns matching PDF) */}
          <div className="hidden print:block w-full print-top-tables pl-[12px]" style={{ paddingLeft: '12px' }}>
            {/* Print-only Merged Header Div matching Excel template */}
            <div className="text-center py-1 text-[24pt] font-bold text-black uppercase tracking-wider border-2 border-black bg-white mb-1.5 print-header-title" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '24pt', lineHeight: '1.2' }}>
              TAKAS ÇEKLERİ
            </div>
            {/* Flex row containing separate vertical table for each column */}
            <div className="flex flex-row gap-[16px] w-full justify-start">
              {dashboardData.activeBankCols.map(colName => {
                const checksList = dashboardData.columns[colName] || [];
                const colTotal = dashboardData.columnTotals[colName] || 0;
                return (
                  <table key={colName} className="border-collapse print-bank-table" style={{ width: '92px', minWidth: '92px', tableLayout: 'fixed' }}>
                    <thead>
                      <tr className="bg-white text-center">
                        <th className="py-1.5 text-center takas-header-th select-none font-bold text-[16pt] text-red-650" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '16pt', fontWeight: 'bold' }}>
                          {colName === 'E.ALBARAKA' || colName === 'M.ALBARAKA' ? 'ALBARAKA' : colName === 'E.İŞBANK' ? 'İŞBANK' : colName}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: printTakasRows }).map((_, rowIndex) => {
                        const check = checksList[rowIndex];
                        const isIcTakas = check && (colName === 'E.ZİRAAT' || colName === 'M.ZİRAAT') && check.ozel_alan?.includes('İÇ TAKAS');
                        return (
                          <tr key={rowIndex} className="h-28_5">
                            <td className={`p-0 border border-gray-300 relative text-center text-[16pt] ${isIcTakas ? 'bg-red-500 font-bold text-black print-ictakas-cell' : 'font-normal'} ${rowIndex === 0 ? 'print-first-row' : ''}`}>
                              <span style={{ fontFamily: 'Calibri, sans-serif', fontSize: '16pt', fontWeight: isIcTakas ? 'bold' : 'normal' }}>
                                {check ? formatExcelNumber(check.amount) : '\u00A0'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="h-28_5">
                        <td className="text-center text-[16pt] font-bold text-black border border-black bg-white" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '16pt', fontWeight: 'bold' }}>
                          {colTotal > 0 ? formatExcelNumber(colTotal) : '0'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                );
              })}

              {/* TAKSİT Tutar Column - exact same component/class as bank tables */}
              <table className="border-collapse print-bank-table print-taksit-tutar-table" style={{ width: '92px', minWidth: '92px', tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-white text-center">
                    <th className="py-1.5 text-center takas-header-th select-none font-bold text-[16pt] text-red-650" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '16pt', fontWeight: 'bold' }}>
                      TAKSİT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: printTakasRows }).map((_, rowIndex) => {
                    const taksitList = dashboardData.columns['TAKSİT'] || [];
                    const taksitCheck = taksitList[rowIndex];
                    return (
                      <tr key={rowIndex} className="h-28_5" style={{ height: '28.5px' }}>
                        <td className={`p-0 border border-gray-300 text-center text-[16pt] font-normal ${rowIndex === 0 ? 'print-first-row' : ''} ${rowIndex === printTakasRows - 1 ? 'print-last-row' : ''}`} style={{ height: '28.5px', width: '92px', boxSizing: 'border-box' }}>
                          <span style={{ fontFamily: 'Calibri, sans-serif', fontSize: '16pt', fontWeight: 'normal' }}>
                            {taksitCheck ? formatExcelNumber(taksitCheck.amount) : '\u00A0'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="h-28_5" style={{ height: '28.5px' }}>
                    <td className="text-center text-[16pt] font-bold text-black border border-black bg-white" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '16pt', fontWeight: 'bold', height: '28.5px', width: '92px', boxSizing: 'border-box' }}>
                      {formatExcelNumber(dashboardData.columnTotals['TAXTIT'] || dashboardData.columnTotals['TAKSİT'] || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* TAKSİT Açıklama Column */}
              <table className="border-collapse print-taksit-desc-table" style={{ width: '130px', minWidth: '130px', tableLayout: 'fixed', marginLeft: '-4px' }}>
                <thead>
                  <tr className="bg-white text-center">
                    <th className="py-1.5 text-left" style={{ border: 'none', background: 'transparent', height: '26px' }}>&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: printTakasRows }).map((_, rowIndex) => {
                    const taksitList = dashboardData.columns['TAKSİT'] || [];
                    const taksitCheck = taksitList[rowIndex];
                    const descText = taksitCheck ? (isHatirAlinan(taksitCheck) ? formatTaksitDesc(taksitCheck.kesideci) : formatTaksitDesc(taksitCheck.creditor)) : '';
                    let customFontSize = '15pt';
                    if (descText.length > 25) {
                      customFontSize = '8pt';
                    } else if (descText.length > 18) {
                      customFontSize = '9.5pt';
                    } else if (descText.length > 12) {
                      customFontSize = '11.5pt';
                    } else if (descText.length > 8) {
                      customFontSize = '13.5pt';
                    }
                    return (
                      <tr key={rowIndex} className="h-28_5" style={{ height: '28.5px' }}>
                        <td 
                          className="p-0 border-0 text-left pl-1.5 font-bold text-black uppercase" 
                          style={{ height: '28.5px', border: 'none', background: 'transparent', width: '130px', boxSizing: 'border-box' }}
                        >
                          <span style={{ fontFamily: 'Calibri, sans-serif', fontWeight: 'bold', fontSize: customFontSize, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%', lineHeight: '28.5px', color: '#000000' }}>
                            {descText || '\u00A0'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="h-28_5" style={{ height: '28.5px' }}>
                    <td style={{ border: 'none', background: 'transparent', height: '28.5px', width: '130px' }}>&nbsp;</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Print-only Takas Toplamı matching PDF */}
            <div className="hidden print:flex my-2.5 border-2 border-black font-bold text-center h-[38px] items-center print-takas-toplami-box" style={{ width: '380px' }}>
              <div className="bg-gray-100 border-r-2 border-black h-full flex items-center justify-center uppercase text-black font-black px-3 print-takas-toplami-label" style={{ fontSize: '18pt', fontWeight: 'bold' }}>
                TAKAS TOPLAMI
              </div>
              <div className="bg-white h-full flex items-center justify-center font-black text-black px-3 print-takas-toplami-value" style={{ fontSize: '22pt', fontWeight: 'bold' }}>
                {formatExcelNumber(dashboardData.takasGrandTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Takas Toplamı */}
        <div className="flex justify-center print:hidden">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4 min-w-[280px]">
            <div className="rounded-lg bg-brand-50 p-3 text-brand-600">
              <Coins size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">TAKAS TOPLAMI</p>
              <p className="text-2xl font-bold text-brand-700 mt-0.5" style={{ fontFamily: 'Calibri, sans-serif' }}>
                {formatCurrency(dashboardData.takasGrandTotal, 'TRY')}
              </p>
            </div>
          </div>
        </div>

        {/* Lower Tables Grid */}
        <div className="grid gap-6 lg:grid-cols-3 mt-6 print-lower-grid">
          {/* Takasta Olmayan Çekler */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col print:border-none print:shadow-none">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between print:hidden">
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                <Coins size={16} className="text-red-500" />
                TAKASTA OLMAYAN ÇEKLER
              </h3>
              <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {dashboardData.nonTakasChecks.length} Adet
              </span>
            </div>
            <div className="overflow-x-auto w-full">
              {/* Print-only Merged Header Div matching Excel template */}
              <div 
                className="hidden print:block text-center py-1.5 text-[16pt] font-bold text-red-650 uppercase tracking-wider border border-black border-b-0 bg-white print-takasta-olmayan-header"
                style={{ fontSize: '16pt', color: '#dc2626', fontWeight: 'bold' }}
              >
                TAKASTA OLMAYAN ÇEKLER
              </div>
              <table className="w-full text-left border-collapse print-bottom-table" style={{ fontFamily: 'Calibri, Arial, sans-serif', fontSize: '17px' }}>
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200 print:hidden" style={{ fontFamily: 'Calibri, sans-serif' }}>
                    <th className="px-3 py-2 w-[45%] text-left takas-header-th">Alacaklı / Açıklama</th>
                    <th className="px-3 py-2 w-[25%] text-left takas-header-th">Banka</th>
                    <th className="px-3 py-2 w-[30%] text-right pr-3 takas-header-th">Tutar</th>
                  </tr>
                </thead>
                <tbody className="print:divide-y-0">
                  {Array.from({ length: printNonTakasRows }).map((_, rowIndex) => {
                    const check = dashboardData.nonTakasChecks[rowIndex];
                    const isExtraPrintRow = rowIndex >= screenNonTakasRows;
                    return (
                      <tr key={rowIndex} className={`h-[34px] hover:bg-gray-50/30 print:divide-x-0 ${isExtraPrintRow ? 'hidden print:table-row' : ''}`}>
                        <td className="p-0 border border-gray-200 print:border-0">
                          <input
                            key={check ? (check.local_id ? `local-nontakas-cred-${check.local_id}` : `nontakas-cred-${check.id}`) : `empty-nontakas-cred-${rowIndex}`}
                            type="text"
                            className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 pl-2 text-[17px] font-normal text-gray-700 uppercase"
                            style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px' }}
                            defaultValue={check ? formatTaksitDesc(check.creditor) : ''}
                            onKeyDown={e => handleKeyDown(e, 'nontakas', 'creditor', rowIndex)}
                            onFocus={e => e.target.select()}
                            onBlur={e => handleCellBlur(check, 'creditor', e.target.value, { type: 'nontakas', rowIndex })}
                            data-section="nontakas"
                            data-col="creditor"
                            data-row-index={rowIndex}
                          />
                        </td>
                        <td className="p-0 border border-gray-200 print:border-0">
                          <input
                            key={check ? (check.local_id ? `local-nontakas-debt-${check.local_id}` : `nontakas-debt-${check.id}`) : `empty-nontakas-debt-${rowIndex}`}
                            type="text"
                            className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 pl-2 text-[17px] font-normal text-gray-700 uppercase"
                            style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px' }}
                            defaultValue={check ? formatTaksitDesc(check.debtor) : ''}
                            onKeyDown={e => handleKeyDown(e, 'nontakas', 'debtor', rowIndex)}
                            onFocus={e => e.target.select()}
                            onBlur={e => handleCellBlur(check, 'debtor', e.target.value, { type: 'nontakas', rowIndex })}
                            data-section="nontakas"
                            data-col="debtor"
                            data-row-index={rowIndex}
                          />
                        </td>
                        <td className="p-0 border border-gray-200 print:border-0 relative group">
                          <div className="relative flex items-center w-full h-full">
                            <input
                              key={check ? (check.local_id ? `local-nontakas-amt-${check.local_id}` : `nontakas-amt-${check.id}`) : `empty-nontakas-amt-${rowIndex}`}
                              type="text"
                              className={`w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 text-center text-[17px] font-normal text-gray-900 pr-5 ${selectedCells[check?.id || `nontakas-${rowIndex}`] ? 'ring-2 ring-green-600 bg-green-50/50' : ''}`}
                              onClick={e => handleCellClick(e, check, check ? check.amount : 0, check?.id || `nontakas-${rowIndex}`)}
                              style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px' }}
                              defaultValue={check ? formatExcelNumber(check.amount) : ''}
                              onChange={handleNumberInput}
                              onKeyDown={e => handleKeyDown(e, 'nontakas', 'amount', rowIndex)}
                              onBlur={e => handleCellBlur(check, 'amount', e.target.value, { type: 'nontakas', rowIndex })}
                              data-section="nontakas"
                              data-col="amount"
                              data-row-index={rowIndex}
                            />
                            {check && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (openDropdown?.section === 'nontakas' && openDropdown?.rowIndex === rowIndex) {
                                    setOpenDropdown(null);
                                  } else {
                                    setOpenDropdown({ section: 'nontakas', rowIndex });
                                  }
                                }}
                                className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-red-650 rounded bg-white/80 md:opacity-0 md:group-hover:opacity-100 transition-opacity focus:outline-none z-10"
                              >
                                <ChevronDown size={14} className="stroke-[3]" />
                              </button>
                            )}
                            {openDropdown?.section === 'nontakas' && openDropdown?.rowIndex === rowIndex && (
                              <div className="absolute top-full right-0 mt-0.5 w-44 bg-white border border-gray-300 rounded shadow-xl z-50 py-1 text-left">
                                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                  Takas Durumu
                                </div>
                                <div className="py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTakasStatus(check, 'takasta')}
                                    className={`w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold text-left flex items-center justify-between ${!check.ozel_alan?.includes('TAKASTA OLMAYAN') ? 'bg-red-50 text-red-700 font-black' : ''}`}
                                  >
                                    <span>Takasa Taşı</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTakasStatus(check, 'nontakas')}
                                    className={`w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-bold text-left border-t border-gray-100 ${check.ozel_alan?.includes('TAKASTA OLMAYAN') ? 'bg-red-50 text-red-700 font-black' : ''}`}
                                  >
                                    <span>Takasta Değil</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm('Bu çeki listeden silmek istediğinize emin misiniz?')) {
                                        void handleToggleTakasStatus(check, 'sil');
                                      }
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 font-bold text-left border-t border-gray-100 mt-0.5"
                                  >
                                    <span>Kaldır</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold border-t border-gray-300 text-right" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px' }}>
                    <td colSpan={2} className="px-3 py-2 text-[17px] text-gray-600 font-bold" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px', fontWeight: 'bold' }}>Toplam</td>
                    <td className="text-center py-2 text-[17px] font-bold text-black" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '17px', fontWeight: 'bold' }}>
                      {formatExcelNumber(dashboardData.nonTakasTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Kayıp Çekler ve Genel Toplam Sütunu */}
          <div className="flex flex-col gap-4">
            <div 
              className="flex border-2 border-black font-bold font-sans text-center h-[38px] items-center print-genel-toplam-box"
              style={{ border: '2px solid #000000', boxSizing: 'border-box' }}
            >
              <div 
                className="flex-1 bg-gray-150 border-r-2 border-black h-full flex items-center justify-center text-[18px] uppercase text-black font-black print-genel-toplam-label"
                style={{ backgroundColor: '#f3f4f6', borderRight: '2px solid #000000', fontSize: '18pt', fontWeight: 'bold' }}
              >
                GENEL TOPLAM
              </div>
              <div 
                className="flex-1 bg-white h-full flex items-center justify-center text-[22px] font-black text-black print-genel-toplam-value"
                style={{ backgroundColor: '#ffffff', fontSize: '22pt', fontWeight: 'bold' }}
              >
                {formatExcelNumber(dashboardData.takasGrandTotal + dashboardData.nonTakasTotal)}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gray-50 border-b border-black px-4 py-3 flex items-center justify-between print:hidden">
              <h3 className="text-sm font-bold text-red-650 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={16} className="text-red-500" />
                KAYIP ÇEKLER
              </h3>
              <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                5 Adet
              </span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse print-bottom-table" style={{ fontFamily: 'Calibri, Arial, sans-serif' }}>
                <thead>
                  <tr className="hidden print:table-row border border-black bg-[#FFFF00]" style={{ fontFamily: 'Calibri, sans-serif' }}>
                    <th colSpan={3} className="bg-[#FFFF00] text-[#FF0000] font-black text-center py-1.5 text-[13px] border border-black uppercase">
                      KAYIP ÇEKLER
                    </th>
                    <th className="bg-[#FFFF00] text-[#FF0000] font-black text-center py-1.5 text-[13px] border border-black uppercase">
                      VADE TARİHİ
                    </th>
                  </tr>
                  <tr className="border border-black bg-[#FFFF00] print:hidden" style={{ fontFamily: 'Calibri, sans-serif' }}>
                    <th className="bg-[#FFFF00] text-[#FF0000] font-black text-center py-1.5 text-[13px] border border-black uppercase w-[40%]">
                      Alacaklı / Açıklama
                    </th>
                    <th className="bg-[#FFFF00] text-[#FF0000] font-black text-center py-1.5 text-[13px] border border-black uppercase w-[20%]">
                      Banka
                    </th>
                    <th className="bg-[#FFFF00] text-[#FF0000] font-black text-center py-1.5 text-[13px] border border-black uppercase w-[20%]">
                      Tutar
                    </th>
                    <th className="bg-[#FFFF00] text-[#FF0000] font-black text-center py-1.5 text-[13px] border border-black uppercase w-[20%]">
                      Vade Tarihi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-[13px] print:divide-y-0" style={{ fontFamily: 'Calibri, sans-serif' }}>
                  {FIXED_KAYIP_CHECKS.map((check, rowIndex) => {
                    return (
                      <tr key={rowIndex} className="h-[28px] divide-x divide-black hover:bg-gray-50/30 print:divide-x-0">
                        <td className="px-3 py-1 border border-black print:border-0 font-normal text-gray-700 uppercase">
                          {check.creditor}
                        </td>
                        <td className="px-3 py-1 border border-black print:border-0 text-center font-normal text-gray-700 uppercase">
                          {check.bank_name}
                        </td>
                        <td className="px-3 py-1 border border-black print:border-0 text-center font-normal text-gray-700">
                          {check.amountText}
                        </td>
                        <td className="px-3 py-1 border border-black print:border-0 text-center font-normal text-gray-650">
                          {check.due_dateText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-yellow-50 font-black border-t-2 border-black text-center divide-x divide-black print:divide-x-0" style={{ fontFamily: 'Calibri, sans-serif' }}>
                    <td colSpan={2} className="px-3 py-1.5 text-[13px] text-red-650 uppercase border border-black print:border-0 text-left pl-3">TOPLAM</td>
                    <td className="text-center py-1.5 text-[13px] font-black text-red-650 border border-black print:border-0">
                      3.348.822
                    </td>
                    <td className="px-3 py-1.5 border border-black print:border-0 bg-yellow-50"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          </div>

          {/* Hesapta Olan Para & Genel Özet */}
          <div className="space-y-6 flex flex-col">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 print:hidden">
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark size={16} className="text-red-500" />
                  HESAPTA OLAN PARA
                </h3>
              </div>
              <div className="w-full">
                {/* Print-only Merged Header Div matching Excel template */}
                <div className="hidden print:block text-center py-1.5 text-[11pt] font-black text-black uppercase tracking-wider border border-black border-b-0 bg-white">
                  HESAPTA OLAN PARA
                </div>
                <table className="w-full text-left border-collapse print-bottom-table" style={{ fontFamily: 'Calibri, Arial, sans-serif' }}>
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200 text-[13px] font-bold text-gray-600 print:hidden" style={{ fontFamily: 'Calibri, sans-serif' }}>
                      <th className="px-3 py-1.5">Banka Hesabı</th>
                      <th className="px-3 py-1.5 text-right pr-3">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody className="print:divide-y-0">
                    {(() => {
                      const allowedBankNames = ['KUVEYT', 'ZİRAAT', 'ALBARAKA', 'AKBANK', 'DENİZ', 'HALKBANK', 'MARİF'];
                      
                      return allowedBankNames.map((bankKey, rowIndex) => {
                        const acc = bankAccounts.find(a => {
                          const name = (a.account_name || a.bank || '').toUpperCase();
                          return name.includes(bankKey);
                        }) || {
                          id: `mock-${bankKey}`,
                          account_name: `${bankKey} Hesabı`,
                          bank: bankKey,
                          balance: 0
                        };

                        const displayName = bankKey === 'KUVEYT' ? 'KUVEYT TÜRK' : bankKey;

                        return (
                          <tr key={acc.id} className="h-[28px] hover:bg-gray-50/30 print:divide-x-0">
                            <td className="pl-3 py-1 text-[13px] font-normal text-gray-700 bg-gray-50/20 border border-gray-200 print:border-0" style={{ fontFamily: 'Calibri, sans-serif' }}>
                              {displayName}
                            </td>
                            <td className="p-0 border border-gray-200 print:border-0">
                              <input
                                type="text"
                                className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 text-center text-[13px] font-normal text-gray-700"
                                style={{ fontFamily: 'Calibri, sans-serif' }}
                                defaultValue={formatExcelNumber(Number(acc.balance || 0))}
                                onChange={handleNumberInput}
                                onKeyDown={e => handleKeyDown(e, 'balances', 'balance', rowIndex)}
                                onBlur={e => {
                                  if (acc.id.startsWith('mock-')) return;
                                  void handleBalanceBlur(acc.id, e.target.value);
                                }}
                                data-section="balances"
                                data-col="balance"
                                data-row-index={rowIndex}
                                disabled={acc.id.startsWith('mock-')}
                              />
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const allowedBankNames = ['KUVEYT', 'ZİRAAT', 'ALBARAKA', 'AKBANK', 'DENİZ', 'HALKBANK', 'MARİF'];
                      const localBalances = allowedBankNames.map(bankKey => {
                        const acc = bankAccounts.find(a => {
                          const name = (a.account_name || a.bank || '').toUpperCase();
                          return name.includes(bankKey);
                        });
                        return acc ? Number(acc.balance || 0) : 0;
                      });
                      const totalListedBalance = localBalances.reduce((sum, b) => sum + b, 0);
                      const gelecekPara = 0;
                      const odenecekTutar = dashboardData.takasGrandTotal + dashboardData.nonTakasTotal;
                      const acikFazla = totalListedBalance + gelecekPara - odenecekTutar;

                      return (
                        <>
                          <tr className="bg-gray-50 font-bold border-t border-gray-300 text-right print:hidden" style={{ fontFamily: 'Calibri, sans-serif' }}>
                            <td className="px-3 py-1.5 text-[13px] text-gray-600">Toplam Bakiye</td>
                            <td className="text-center py-1.5 text-[13px] font-black text-gray-800">
                              {formatExcelNumber(totalListedBalance)}
                            </td>
                          </tr>
                          <tr className="bg-white font-bold border-t border-gray-300 text-right print-gelecek-odenecek-row" style={{ fontFamily: 'Calibri, sans-serif' }}>
                            <td className="px-3 py-1.5 text-[13px] text-gray-600">GELECEK PARA</td>
                            <td className="text-center py-1.5 text-[13px] font-black text-gray-800">0</td>
                          </tr>
                          <tr className="bg-white font-bold border-t border-gray-300 text-right print-gelecek-odenecek-row" style={{ fontFamily: 'Calibri, sans-serif' }}>
                            <td className="px-3 py-1.5 text-[13px] text-gray-600">ÖDENECEK TUTAR</td>
                            <td className="text-center py-1.5 text-[13px] font-black text-gray-800">
                              {formatExcelNumber(odenecekTutar)}
                            </td>
                          </tr>
                          {/* Spacer row ONLY in print */}
                          <tr className="hidden print:table-row print-spacer-row">
                            <td colSpan={2}>&nbsp;</td>
                          </tr>
                          <tr className="bg-white font-bold border-t border-gray-300 text-right print-acik-fazla-row" style={{ fontFamily: 'Calibri, sans-serif' }}>
                            <td className="px-3 py-1.5 text-[13px] text-gray-600">AÇIK-FAZLA</td>
                            <td className={`text-center py-1.5 text-[13px] font-black ${acikFazla < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                              {formatExcelNumber(acikFazla)}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            </div>


          </div>
        </div>

        {/* Floating Excel Selection Status Bar */}
        {/* Daily Detailed Check List (screen view only) */}
        {(() => {
          const dashboardDetailChecks = [
            ...Object.values(dashboardData.columns).flat(),
            ...dashboardData.nonTakasChecks
          ].filter((c, idx, self) => c.id && self.findIndex(x => x.id === c.id) === idx);

          if (detailSortConfig) {
            dashboardDetailChecks.sort((a, b) => {
              let valA: any = '';
              let valB: any = '';

              if (detailSortConfig.key === 'bank_name') {
                const bankA = getBankColumn(a.debtor, a.bank_name) || getCleanBankName(a.debtor, a.bank_name) || '-';
                const bankB = getBankColumn(b.debtor, b.bank_name) || getCleanBankName(b.debtor, b.bank_name) || '-';
                const isAEmpty = bankA === '-' || bankA === '';
                const isBEmpty = bankB === '-' || bankB === '';

                if (isAEmpty && isBEmpty) return 0;
                if (isAEmpty) return 1;
                if (isBEmpty) return -1;

                const comparison = bankA.localeCompare(bankB, 'tr', { sensitivity: 'base' });
                return detailSortConfig.direction === 'asc' ? comparison : -comparison;
              } else if (detailSortConfig.key === 'issue_date') {
                valA = a.issue_date || a.created_at || '';
                valB = b.issue_date || b.created_at || '';
              } else if (detailSortConfig.key === 'debtor') {
                valA = a.debtor || '';
                valB = b.debtor || '';
              } else if (detailSortConfig.key === 'amount') {
                valA = Number(a.amount) || 0;
                valB = Number(b.amount) || 0;
              } else if (detailSortConfig.key === 'due_date') {
                valA = a.due_date || '';
                valB = b.due_date || '';
              } else if (detailSortConfig.key === 'status') {
                valA = a.status || '';
                valB = b.status || '';
              }

              let comparison = 0;
              if (typeof valA === 'string') {
                comparison = valA.localeCompare(valB, 'tr', { sensitivity: 'base' });
              } else {
                comparison = valA - valB;
              }

              return detailSortConfig.direction === 'asc' ? comparison : -comparison;
            });
          } else {
            dashboardDetailChecks.sort((a, b) => {
              const timeDiff = (a.created_at || '').localeCompare(b.created_at || '');
              if (timeDiff !== 0) return timeDiff;
              return (a.id || '').localeCompare(b.id || '');
            });
          }

          if (dashboardDetailChecks.length === 0) return null;

          return (
            <div className="print:hidden mt-8 bg-white rounded-xl border border-gray-250 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-250 px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Building size={16} className="text-gray-500" />
                  GÜNLÜK DETAYLI ÇEK LİSTESİ (TAKAS VE DİĞERLERİ)
                </h3>
                <span className="bg-gray-100 text-gray-805 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {dashboardDetailChecks.length} Adet
                </span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse" style={{ fontFamily: 'Calibri, Arial, sans-serif' }}>
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200 text-[13px] font-bold text-gray-700 select-none">
                      <th 
                        className="px-3 py-2 text-center w-28 cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => handleRequestSort('issue_date')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Kayıt Tarihi</span>
                          <ArrowUpDown size={12} className={detailSortConfig?.key === 'issue_date' ? 'text-blue-600 font-black' : 'text-gray-400 opacity-40'} />
                        </div>
                      </th>
                      <th className="px-3 py-2 text-center w-20">Kalan</th>
                      <th 
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => handleRequestSort('debtor')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Keşideci</span>
                          <ArrowUpDown size={12} className={detailSortConfig?.key === 'debtor' ? 'text-blue-600 font-black' : 'text-gray-400 opacity-40'} />
                        </div>
                      </th>
                      <th className="px-3 py-2 text-center w-20">Evrak Türü</th>
                      <th className="px-3 py-2 w-28">Evrak No</th>
                      <th 
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => handleRequestSort('bank_name')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Banka</span>
                          <ArrowUpDown size={12} className={detailSortConfig?.key === 'bank_name' ? 'text-blue-600 font-black' : 'text-gray-400 opacity-40'} />
                        </div>
                      </th>
                      <th 
                        className="px-3 py-2 text-right w-36 pr-6 cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => handleRequestSort('amount')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Tutar</span>
                          <ArrowUpDown size={12} className={detailSortConfig?.key === 'amount' ? 'text-blue-600 font-black' : 'text-gray-400 opacity-40'} />
                        </div>
                      </th>
                      <th 
                        className="px-3 py-2 text-center w-28 cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => handleRequestSort('due_date')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Vade Tarihi</span>
                          <ArrowUpDown size={12} className={detailSortConfig?.key === 'due_date' ? 'text-blue-600 font-black' : 'text-gray-400 opacity-40'} />
                        </div>
                      </th>
                      <th 
                        className="px-3 py-2 text-center w-28 cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => handleRequestSort('status')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Durum</span>
                          <ArrowUpDown size={12} className={detailSortConfig?.key === 'status' ? 'text-blue-600 font-black' : 'text-gray-400 opacity-40'} />
                        </div>
                      </th>
                      <th className="px-3 py-2">Açıklama / Özel Alan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-[13px]">
                    {dashboardDetailChecks.map(check => {
                      const isPaid = (check.status || '').toLowerCase().includes('ödendi') || (check.status || '').toLowerCase().includes('tahsil edildi') || (check.status || '').toLowerCase().includes('ödenen') || ((check.status || '').toLowerCase().includes('tahsil') && !(check.status || '').toLowerCase().includes('tahsilde'));
                      const remainingDays = calculateRemainingDays(check.due_date);
                      const isRecordSenet = 
                        check.document_type === 'senet' || 
                        (check.tahsildar_banka || '').toUpperCase() === 'SENET' || 
                        (check.bank_name || '').toUpperCase() === 'SENET';

                      return (
                        <tr key={check.id} className="hover:bg-gray-50/50 transition-colors h-[36px]">
                          {/* Kayıt Tarihi */}
                          <td className="px-3 py-1.5 text-center text-gray-500 font-medium whitespace-nowrap">
                            {formatDate(check.issue_date || check.created_at)}
                          </td>
                          {/* Kalan Gün */}
                          <td className="px-3 py-1.5 text-center font-bold">
                            {remainingDays !== null ? (
                              <span className={isPaid ? 'text-gray-400 font-normal' : remainingDays < 0 ? 'text-red-650 font-bold' : remainingDays <= 10 ? 'text-amber-600 font-bold' : 'text-gray-650'}>
                                {remainingDays}
                              </span>
                            ) : '-'}
                          </td>
                          {/* Keşideci */}
                          <td className="px-3 py-1.5 text-gray-700 font-semibold uppercase whitespace-nowrap truncate max-w-[200px]" title={fixCorruptedText(check.kesideci) || fixCorruptedText(check.creditor) || ''}>
                            {fixCorruptedText(check.kesideci) || fixCorruptedText(check.creditor) || '-'}
                          </td>
                          {/* Evrak Türü */}
                          <td className="px-3 py-1.5 text-center whitespace-nowrap">
                            {isRecordSenet ? (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wide">SENET</span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">ÇEK</span>
                            )}
                          </td>
                          {/* Evrak No */}
                          <td className="px-3 py-1.5 font-bold text-gray-800 whitespace-nowrap">
                            {check.check_no || '-'}
                          </td>
                          {/* Banka */}
                          <td className="px-3 py-1.5 text-gray-600 font-semibold uppercase whitespace-nowrap truncate max-w-[150px]" title={getBankColumn(check.debtor, check.bank_name) || getCleanBankName(check.debtor, check.bank_name) || ''}>
                            {getBankColumn(check.debtor, check.bank_name) || getCleanBankName(check.debtor, check.bank_name) || '-'}
                          </td>
                          {/* Tutar */}
                          <td className="px-3 py-1.5 text-right font-bold text-gray-900 whitespace-nowrap pr-6">
                            {formatCurrency(check.amount, check.para_birimi)}
                          </td>
                          {/* Vade Tarihi */}
                          <td className="px-3 py-1.5 text-center text-gray-500 font-semibold whitespace-nowrap">
                            {formatDate(check.due_date)}
                          </td>
                          {/* Durum */}
                          <td className="px-3 py-1.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${isPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                              {isPaid ? 'Ödendi' : 'Tahside'}
                            </span>
                          </td>
                          {/* Açıklama / Özel Alan */}
                          <td className="px-3 py-1.5 text-gray-500 font-medium text-xs uppercase whitespace-nowrap truncate max-w-[250px]" title={fixCorruptedText(check.ozel_alan) || ''}>
                            {fixCorruptedText(check.ozel_alan) || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {selectedCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3.5 rounded-full shadow-2xl z-50 flex items-center gap-6 backdrop-blur-md border border-gray-800 transition-all duration-350 select-none animate-bounce-short">
            <div className="flex items-center gap-4 text-xs font-bold tracking-wider text-gray-400">
              <span className="bg-green-600 text-white rounded-full p-1"><Landmark size={14} /></span>
              SEÇİLEN HÜCRELER:
            </div>
            <div className="flex items-center gap-5 text-sm font-semibold divide-x divide-gray-800">
              <div className="flex items-center gap-1.5 pl-3">
                <span className="text-gray-400 font-medium">ORTALAMA:</span>
                <span className="text-green-400 font-bold">{formatExcelNumber(selectedAverage) || '0'} TRY</span>
              </div>
              <div className="flex items-center gap-1.5 pl-5">
                <span className="text-gray-400 font-medium">SAY:</span>
                <span className="text-blue-400 font-bold">{selectedCount}</span>
              </div>
              <div className="flex items-center gap-1.5 pl-5">
                <span className="text-gray-400 font-medium">TOPLAM:</span>
                <span className="text-yellow-400 font-bold">{formatExcelNumber(selectedTotal) || '0'} TRY</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCells({})}
              className="text-gray-400 hover:text-white transition-colors duration-150 pl-3 focus:outline-none"
              title="Seçimi Temizle (Esc)"
            >
              <X size={16} className="stroke-[3]" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-4 print:pl-[12px] print:pr-0 print:py-0 main-checks-layout">
      <style>{`
        @keyframes bounceShort {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -4px); }
        }
        .animate-bounce-short {
          animation: bounceShort 2s infinite ease-in-out;
        }
        .takas-cekleri-title {
          font-weight: 900 !important;
        }

        /* Force Calibri font on all table elements in screen view */
        div.main-checks-layout table,
        div.main-checks-layout table th,
        div.main-checks-layout table td,
        div.main-checks-layout table input,
        div.main-checks-layout table span {
          font-family: 'Calibri', 'Arial', sans-serif !important;
        }

        div.main-checks-layout table thead tr th.takas-header-th {
          color: #dc2626 !important;
          font-weight: bold !important;
          font-size: 17px !important;
        }

        /* Prevent İç Takas cells from changing color on hover */
        div.main-checks-layout table tbody tr:hover td.takas-ictakas-cell,
        div.main-checks-layout table tbody tr td.takas-ictakas-cell {
          background-color: #dc2626 !important;
        }
        div.main-checks-layout table tbody tr td.takas-ictakas-cell input {
          font-weight: normal !important;
        }

        @media print {
          @page {
            size: A4 landscape !important;
            margin: 5mm 6mm !important;
          }
          body, html, #root, div.min-h-screen, main, div.flex-1, .main-checks-layout {
            background-color: #ffffff !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            zoom: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @media (orientation: portrait) {
            body {
              zoom: 70% !important;
            }
          }
          .print\:hidden,
          aside,
          header,
          nav,
          .topbar,
          .sidebar,
          button,
          .action-buttons,
          .export-button,
          .tab-buttons,
          .page-header-container,
          [data-testid="page-header"] {
            display: none !important;
          }
          .main-checks-layout {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            gap: 2px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .space-y-6 {
            margin: 0 !important;
            padding: 0 !important;
            gap: 2px !important;
          }
          .space-y-6 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 2px !important;
            margin-bottom: 0 !important;
          }
          .overflow-x-auto,
          .overflow-y-auto {
            overflow: visible !important;
          }
          .mt-6 {
            margin-top: 4px !important;
          }
          /* Strip card borders, shadows, rounded corners for outer wrappers */
          .overflow-x-auto.w-full.border-2.border-black,
          .bg-white.rounded-xl.border.border-gray-200,
          .bg-white.rounded-xl.border.border-black,
          .bg-white.rounded-xl.border.border-gray-250,
          .rounded-lg,
          .rounded-xl,
          .shadow-sm,
          .shadow-md {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-lower-grid {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            gap: 10px !important;
            margin-top: 6px !important;
            align-items: stretch !important;
          }
          .print-lower-grid > div {
            display: flex !important;
            flex-direction: column !important;
          }
          .print-lower-grid > div:nth-child(1) {
            flex: 1.15 1.15 0% !important;
            min-width: 0 !important;
          }
          .print-lower-grid > div:nth-child(2) {
            flex: 1.3 1.3 0% !important;
            min-width: 0 !important;
          }
          .print-lower-grid > div:nth-child(3) {
            flex: 1 1 0% !important;
            min-width: 0 !important;
          }
          .print-header-title {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            border: 2px solid #000000 !important;
            font-size: 24pt !important;
            padding: 2px 0 !important;
            margin-bottom: 4px !important;
          }
          .print-lower-grid > div > div:not(.print-genel-toplam-box) {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-lower-grid .print-genel-toplam-box,
          .print-lower-grid > div > div.print-genel-toplam-box,
          div.print-genel-toplam-box {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            height: 38px !important;
            border: 2px solid #000000 !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            margin-bottom: 10px !important;
          }
          .print-lower-grid .print-genel-toplam-label,
          div.print-genel-toplam-label {
            flex: 1.1 1.1 0% !important;
            min-width: 0 !important;
            height: 100% !important;
            background-color: #f3f4f6 !important;
            border-right: 2px solid #000000 !important;
            font-size: 18pt !important;
            font-weight: bold !important;
            color: #000000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            white-space: nowrap !important;
            padding: 0 8px !important;
            line-height: 1 !important;
          }
          .print-lower-grid .print-genel-toplam-value,
          div.print-genel-toplam-value {
            flex: 1 1 0% !important;
            min-width: 0 !important;
            height: 100% !important;
            background-color: #ffffff !important;
            font-size: 22pt !important;
            font-weight: bold !important;
            color: #000000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            white-space: nowrap !important;
            padding: 0 8px !important;
            line-height: 1 !important;
          }
          .print-takasta-olmayan-header {
            font-size: 16pt !important;
            color: #dc2626 !important;
            font-weight: bold !important;
            border: 2px solid #000000 !important;
            border-bottom: none !important;
            padding: 3px 0 !important;
            background-color: #ffffff !important;
          }
          .hidden.print\:block:not(.print-takasta-olmayan-header) {
            border: 2px solid #000000 !important;
            border-bottom: none !important;
            margin-bottom: 0 !important;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
            font-size: 10pt !important;
            font-weight: bold !important;
            background-color: #ffffff !important;
          }

          .print-top-tables {
            width: 100% !important;
            padding-left: 0 !important;
            margin-left: 0 !important;
          }
          .print-top-tables .flex.flex-row,
          .print-top-tables .flex-row {
            gap: 10px !important;
            width: 100% !important;
          }
          .print-top-tables table {
            border-collapse: collapse !important;
            border: 1px solid #000000 !important;
            border-radius: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .print-top-tables .print-bank-table {
            width: auto !important;
            min-width: 0 !important;
            flex: 1 1 0% !important;
            table-layout: fixed !important;
          }
          .print-top-tables .print-taksit-desc-table {
            width: auto !important;
            min-width: 0 !important;
            flex: 1.3 1.3 0% !important;
            table-layout: fixed !important;
          }
          .print-top-tables .print-taksit-desc-table th,
          .print-top-tables .print-taksit-desc-table td {
            border: none !important;
            background: transparent !important;
            padding-left: 2px !important;
            padding-right: 2px !important;
          }
          .print-top-tables th, .print-top-tables td {
            font-family: Calibri, Arial, sans-serif !important;
            padding: 1px 2px !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-top-tables .print-bank-table th {
            border: 1px solid #000000 !important;
            border-bottom: 1px solid #000000 !important;
            height: 26px !important;
            font-size: 16pt !important;
            font-weight: bold !important;
          }
          .print-top-tables .print-bank-table tr,
          .print-top-tables .print-taksit-desc-table tr {
            height: 25px !important;
            max-height: 25px !important;
          }
          .print-top-tables .print-bank-table tbody td {
            border: 1px solid #000000 !important;
            height: 25px !important;
            max-height: 25px !important;
            line-height: 25px !important;
            box-sizing: border-box !important;
            font-size: 15pt !important;
            font-weight: normal !important;
            padding: 0 2px !important;
          }
          .print-top-tables .print-bank-table tbody td span {
            font-size: 15pt !important;
            font-weight: normal !important;
          }
          .print-top-tables td.bg-red-600,
          .print-top-tables td.bg-red-500,
          .print-top-tables td.print-ictakas-cell {
            background-color: #ef4444 !important;
            color: #000000 !important;
            font-weight: bold !important;
          }
          .print-top-tables td.bg-red-600 span,
          .print-top-tables td.bg-red-500 span,
          .print-top-tables td.print-ictakas-cell span {
            font-weight: bold !important;
          }
          .print-top-tables .print-taksit-tutar {
            width: 50% !important;
            border: 1px solid #000000 !important;
            font-size: 15pt !important;
            font-weight: normal !important;
            height: 25px !important;
            box-sizing: border-box !important;
          }
          .print-top-tables .print-taksit-desc,
          .print-top-tables .print-taksit-desc-table td {
            border: none !important;
            padding-left: 4px !important;
            font-weight: bold !important;
            color: #000000 !important;
            text-align: left !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .print-top-tables .print-taksit-desc span,
          .print-top-tables .print-taksit-desc-table td span {
            white-space: nowrap !important;
            font-weight: bold !important;
            color: #000000 !important;
          }
          th.takas-header-th {
            font-weight: bold !important;
            color: #dc2626 !important;
            font-size: 15pt !important;
            padding: 2px !important;
            background-color: #ffffff !important;
          }
          th:not(.takas-header-th) {
            font-weight: bold !important;
            color: #000000 !important;
            font-size: 15pt !important;
            padding: 2px !important;
            background-color: #ffffff !important;
          }
          th.bg-\\[\\#FFFF00\\] {
            background-color: #FFFF00 !important;
            color: #FF0000 !important;
            font-weight: bold !important;
          }
          .print-top-tables tfoot tr {
            border-top: 1px solid #000000 !important;
          }
          .print-top-tables .print-bank-table tfoot td,
          .print-top-tables tfoot td {
            border: 1px solid #000000 !important;
            font-weight: bold !important;
            color: #000000 !important;
            background-color: #ffffff !important;
            font-size: 15pt !important;
            height: 25px !important;
            line-height: 25px !important;
            box-sizing: border-box !important;
            padding: 0 2px !important;
          }

          /* Takas Toplamı - 18pt Text / 22pt Amount */
          .print-takas-toplami-box {
            display: flex !important;
            flex-direction: row !important;
            width: 380px !important;
            height: 38px !important;
            border: 2px solid #000000 !important;
            box-sizing: border-box !important;
            margin-top: 10px !important;
            margin-bottom: 10px !important;
            background: #ffffff !important;
          }
          .print-takas-toplami-label {
            flex: 1.1 1.1 0% !important;
            min-width: 0 !important;
            height: 100% !important;
            background-color: #f3f4f6 !important;
            border-right: 2px solid #000000 !important;
            font-size: 18pt !important;
            font-weight: bold !important;
            color: #000000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            white-space: nowrap !important;
            padding: 0 8px !important;
            line-height: 1 !important;
          }
          .print-takas-toplami-value {
            flex: 1 1 0% !important;
            min-width: 0 !important;
            height: 100% !important;
            background-color: #ffffff !important;
            font-size: 22pt !important;
            font-weight: bold !important;
            color: #000000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            white-space: nowrap !important;
            padding: 0 8px !important;
            line-height: 1 !important;
          }
          .print-bottom-table {
            border-collapse: collapse !important;
            border: 2px solid #000000 !important;
            width: 100% !important;
          }
          .print-bottom-table tr {
            height: 22px !important;
          }
          .print-bottom-table th {
            border: 1px solid #d1d5db !important;
            border-bottom: 2px solid #000000 !important;
            font-size: 9pt !important;
            padding: 1px 4px !important;
            font-weight: bold !important;
            height: 20px !important;
          }
          .print-bottom-table tbody td {
            border: 1px solid #d1d5db !important;
            font-size: 11pt !important;
            padding: 0 4px !important;
            font-weight: normal !important;
            color: #000000 !important;
            height: 22px !important;
            max-height: 22px !important;
            line-height: 22px !important;
            box-sizing: border-box !important;
          }
          .print-bottom-table tbody td span,
          .print-bottom-table tbody td input,
          .print-bottom-table input {
            font-size: 11pt !important;
            height: 22px !important;
            line-height: 22px !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            background: transparent !important;
            font-weight: normal !important;
            color: #000000 !important;
            display: block !important;
            width: 100% !important;
          }
          .print-bottom-table tfoot tr:not(.print-spacer-row):not(.print-acik-fazla-row) {
            border-top: 2px solid #000000 !important;
          }
          .print-bottom-table tfoot tr.print-spacer-row {
            border: none !important;
            height: 8px !important;
          }
          .print-bottom-table tfoot tr.print-spacer-row td {
            border: none !important;
            background-color: transparent !important;
            height: 8px !important;
            padding: 0 !important;
          }
          .print-bottom-table tfoot tr.print-acik-fazla-row {
            border: none !important;
          }
          .print-bottom-table tfoot tr.print-acik-fazla-row td {
            border: 2px solid #000000 !important;
            font-size: 11pt !important;
            font-weight: bold !important;
            height: 22px !important;
          }
          .print-bottom-table tfoot td {
            border: 1px solid #d1d5db !important;
            font-size: 11pt !important;
            font-weight: bold !important;
            padding: 0 4px !important;
            height: 22px !important;
            line-height: 22px !important;
          }
          input, select {
            padding: 0px 0px !important;
            height: 18px !important;
            font-size: 11pt !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            background-color: transparent !important;
            color: #000000 !important;
            font-weight: normal !important;
            -webkit-appearance: none !important;
            appearance: none !important;
          }
          td input {
            width: 100% !important;
            height: 100% !important;
            text-align: center !important;
            vertical-align: middle !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .takas-spacer-col {
            display: table-cell !important;
            width: 1.2% !important;
            min-width: 1.2% !important;
            max-width: 1.2% !important;
            padding: 0 !important;
            border: none !important;
            background-color: #ffffff !important;
          }
          thead th.takas-spacer-col {
            border-top: 2px solid #000000 !important;
            border-bottom: 2px solid #000000 !important;
          }
          tfoot td.takas-spacer-col {
            border-bottom: 2px solid #000000 !important;
          }
          .takas-bank-col {
            width: auto !important;
          }
          .takas-taksit-col {
            width: auto !important;
          }
          .taksit-tutar-col {
            width: auto !important;
          }
          .taksit-desc-col {
            width: auto !important;
          }
          /* Lower tables layout side-by-side */
          .print-lower-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 12px !important;
            margin-top: 6px !important;
            width: 100% !important;
          }
          .print-lower-grid table, 
          .print-lower-grid th, 
          .print-lower-grid td {
            font-size: 8pt !important;
          }
          .print-lower-grid tr {
            height: 14.5px !important;
          }
          .print-lower-grid input {
            height: 12.5px !important;
            font-size: 8pt !important;
          }
          /* Prevent overflow-y scrollbars on print */
          .overflow-y-auto.max-h-\\[220px\\] {
            overflow: visible !important;
            max-height: none !important;
          }
          /* Prevent page split */
          .main-checks-layout,
          .print-lower-grid > div {
            page-break-inside: avoid !important;
          }
          tr.h-28_5, tr.h-28_5 td {
            height: 21.33px !important;
          }
          .takas-toplami-label {
            font-size: 18pt !important;
            font-family: 'Calibri', sans-serif !important;
            font-weight: bold !important;
          }
          .takas-toplami-value {
            font-size: 22pt !important;
            font-family: 'Calibri', sans-serif !important;
            font-weight: bold !important;
          }
          .print-top-tables th,
          .print-top-tables td:not(.print-taksit-desc),
          .print-top-tables td:not(.print-taksit-desc) span {
            font-size: 11pt !important;
            font-family: 'Calibri', Arial, sans-serif !important;
            line-height: 1 !important;
          }
        }
      `}</style>
      <div className="print:hidden">
        <PageHeader
          title={isTakasRoute ? "Takas Çekleri" : "Çek Yönetimi (EBS)"}
          description={isTakasRoute ? "Takasa verilen çeklerinizin listesi ve durum takibi" : "EBS Çek Takip yazılımından senkronize edilen çeklerin listesi ve detayları"}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="btn-secondary flex items-center gap-2"
                title="Yazdır (A4 Yatay)"
              >
                <Printer size={16} />
                Yazdır
              </button>

              <div className="relative">
                <button
                  className="btn-secondary flex items-center gap-1.5"
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                >
                  Dışa Aktar
                  <ChevronDown size={16} className={`transition-transform duration-200 ${exportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-20 flex flex-col">
                      <button
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                        onClick={() => {
                          handleExportExcel();
                          setExportMenuOpen(false);
                        }}
                      >
                        <FileSpreadsheet size={14} className="text-gray-400" /> Excel Dışa Aktar
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                        onClick={() => {
                          handleExportPdf();
                          setExportMenuOpen(false);
                        }}
                      >
                        <FileText size={14} className="text-gray-400" /> PDF Dışa Aktar
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={fetchChecks}
                disabled={loading}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Verileri Güncelle
              </button>

              <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus size={16} />
                Çek Seç
              </button>
            </div>
          }
        />
      </div>

      {isTakasRoute ? (
        renderTakasDashboard()
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* LEFT SIDEBAR FILTERS (EBS Style) */}
          <div className="w-full lg:w-72 shrink-0 space-y-4 print:hidden">
            {/* Panel 1: Evrak Durumu Filtresi */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-3 flex items-center gap-1.5 select-none">
                <FolderOpen size={14} className="text-gray-400" />
                Evrak Durumu Filtresi
              </h3>
              <div className="flex flex-col gap-1">
                {currentSidebarFilters.map((filter) => {
                  const isActive = selectedSidebarFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedSidebarFilter(filter.id)}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left group ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 font-bold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate flex items-center gap-2">
                        <FileText size={13} className={isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'} />
                        {filter.label}
                      </span>
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          isActive
                            ? 'bg-brand-200 text-brand-900'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {filter.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel 2: Keşide Tarihi Sorgula */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-1.5 select-none">
                <Calendar size={14} className="text-gray-400" />
                Keşide Tarihi Sorgula
              </h3>
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase px-1">Başlangıç</span>
                  <input
                    type="date"
                    className="input py-1 px-2 text-xs w-full h-9 font-semibold text-gray-700"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase px-1">Bitiş</span>
                  <input
                    type="date"
                    className="input py-1 px-2 text-xs w-full h-9 font-semibold text-gray-700"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => {
                    setStartDate(tempStartDate);
                    setEndDate(tempEndDate);
                    setDateFilterType('custom');
                  }}
                  className="btn-primary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm mt-1"
                >
                  <Search size={13} />
                  Sorgula
                </button>
              </div>
            </div>

            {/* Panel 3: Keşide Tarihine Göre Filtreleme */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-3 flex items-center gap-1.5 select-none">
                <Filter size={14} className="text-gray-400" />
                Keşide Tarihine Göre Filtreleme
              </h3>
              <div className="flex flex-col gap-2 px-1">
                {dateOptions.filter(opt => opt.id !== 'custom').map((opt) => {
                  const isActive = dateFilterType === opt.id && !startDate && !endDate;
                  return (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-750 cursor-pointer select-none group"
                    >
                      <input
                        type="radio"
                        name="date_filter_radio"
                        checked={isActive}
                        onChange={() => {
                          setDateFilterType(opt.id);
                          setStartDate('');
                          setEndDate('');
                          setTempStartDate('');
                          setTempEndDate('');
                        }}
                        className="w-3.5 h-3.5 text-brand-650 border-gray-300 focus:ring-brand-500"
                      />
                      <span className={isActive ? 'text-brand-700 font-bold' : 'group-hover:text-gray-900'}>
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="flex-1 w-full min-w-0 space-y-6">
            {/* KPI Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
                <div className="rounded-lg bg-brand-55 p-3 text-brand-600">
                  <Coins size={22} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Bugünkü Evrak Tutarı</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(stats.todayAmount, 'TRY')}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
                <div className="rounded-lg bg-yellow-50 p-3 text-yellow-600">
                  <RefreshCw size={22} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Yarınki Evrak Tutarı</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(stats.tomorrowAmount, 'TRY')}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
                <div className="rounded-lg bg-green-50 p-3 text-green-600">
                  <Landmark size={22} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Bu Haftaki Evrak Tutarı</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(stats.thisWeekAmount, 'TRY')}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
                <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                  <FileText size={22} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Toplam Evrak Adedi</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{stats.count} Adet</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white rounded-lg shadow-sm print:hidden">
              <button
                onClick={() => handleTabChange('kesilen')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'kesilen'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ArrowUpRight size={16} className="text-blue-500" />
                Kesilen Çek & Senet
              </button>
              <button
                onClick={() => handleTabChange('alinan')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'alinan'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ArrowDownLeft size={16} className="text-green-500" />
                Alınan Çek & Senet
              </button>
            </div>

            {/* Data Table Panel */}
            <div className="space-y-4">
              <SectionCard
                title={activeTab === 'alinan' ? 'Alınan Çek & Senet Listesi' : 'Kesilen Çek & Senet Listesi'}
                icon={<Landmark size={16} className="text-gray-400" />}
              >
                {/* Search bar & Type Selector inside Panel */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 print:hidden">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Çek/Senet no, banka veya kişi/firma adına göre ara..."
                      className="input pl-10 w-full"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-250">
                    <button
                      onClick={() => setDocumentTypeFilter('all')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        documentTypeFilter === 'all'
                          ? 'bg-white text-gray-800 shadow-sm'
                          : 'text-gray-500 hover:text-gray-850'
                      }`}
                    >
                      Tümü
                    </button>
                    <button
                      onClick={() => setDocumentTypeFilter('cek')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        documentTypeFilter === 'cek'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-850'
                      }`}
                    >
                      Çek
                    </button>
                    <button
                      onClick={() => setDocumentTypeFilter('senet')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        documentTypeFilter === 'senet'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-850'
                      }`}
                    >
                      Senet
                    </button>
                  </div>
                </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-[12.5px] table-auto">
              <thead className="bg-gray-50">
                {activeTab === 'alinan' ? (
                  <tr>
                    {renderSortableHeader('Keşide Tarihi', 'due_date', 'center', 'w-28')}
                    {renderSortableHeader('Kalan', 'remaining_days', 'center', 'w-20')}
                    {renderSortableHeader('Asıl Alacaklı', 'debtor', 'left')}
                    {renderSortableHeader('Keşideci', 'kesideci', 'left')}
                    {renderSortableHeader('Ciro Eden', 'creditor', 'left')}
                    {renderSortableHeader('Evrak No', 'check_no', 'left')}
                    {renderSortableHeader('Tahsildar Banka', 'tahsildar_banka', 'left')}
                    {renderSortableHeader('Tutar', 'amount', 'center', 'w-32')}
                    {renderSortableHeader('Banka Adı', 'bank_name', 'left')}
                    {renderSortableHeader('Evrak Durumu', 'status', 'center', 'w-28')}
                    {renderSortableHeader('Banka Şube', 'bank_branch', 'left')}
                    {renderSortableHeader('Keşide Yeri', 'keside_yeri', 'left')}
                    {renderSortableHeader('Kayıt Tarihi', 'issue_date', 'center', 'w-28')}
                    {renderSortableHeader('Ciro Edilen', 'ciro_edilen', 'left')}
                    <th className="px-1.5 py-2 text-left text-[12.5px] font-semibold text-gray-600 w-32">Açıklama</th>
                  </tr>
                ) : (
                  <tr>
                    {renderSortableHeader('Keşide Tarihi', 'due_date', 'center', 'w-28')}
                    {renderSortableHeader('Kalan Gün', 'remaining_days', 'center', 'w-20')}
                    {renderSortableHeader('Evrağın Verildiği Firma/Şahıs Adı', 'creditor', 'left')}
                    {renderSortableHeader('Evrak No', 'check_no', 'left')}
                    {renderSortableHeader('Asıl Borçlu Firma/Şahıs Adı', 'debtor', 'left')}
                    {renderSortableHeader('Tutar', 'amount', 'center', 'w-32')}
                    {renderSortableHeader('Kayıt Tarihi', 'issue_date', 'center', 'w-28')}
                    {renderSortableHeader('Evrak Durumu', 'status', 'center', 'w-28')}
                    <th className="px-1.5 py-2 text-left text-[12.5px] font-semibold text-gray-600 w-32">Açıklama</th>
                  </tr>
                )}
                
                {/* Column-specific filters row */}
                {activeTab === 'alinan' ? (
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <th className="p-1.5 text-center">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.due_date}
                        onChange={(e) => setColumnFilters({ ...columnFilters, due_date: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-center">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.remaining_days}
                        onChange={(e) => setColumnFilters({ ...columnFilters, remaining_days: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.debtor}
                        onChange={(e) => setColumnFilters({ ...columnFilters, debtor: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.kesideci}
                        onChange={(e) => setColumnFilters({ ...columnFilters, kesideci: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.creditor}
                        onChange={(e) => setColumnFilters({ ...columnFilters, creditor: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.check_no}
                        onChange={(e) => setColumnFilters({ ...columnFilters, check_no: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.tahsildar_banka}
                        onChange={(e) => setColumnFilters({ ...columnFilters, tahsildar_banka: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-center">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.amount}
                        onChange={(e) => setColumnFilters({ ...columnFilters, amount: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.bank_name}
                        onChange={(e) => setColumnFilters({ ...columnFilters, bank_name: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-center">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.status}
                        onChange={(e) => setColumnFilters({ ...columnFilters, status: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.bank_branch}
                        onChange={(e) => setColumnFilters({ ...columnFilters, bank_branch: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.keside_yeri}
                        onChange={(e) => setColumnFilters({ ...columnFilters, keside_yeri: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-center">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.issue_date}
                        onChange={(e) => setColumnFilters({ ...columnFilters, issue_date: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.ciro_edilen}
                        onChange={(e) => setColumnFilters({ ...columnFilters, ciro_edilen: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.ozel_alan}
                        onChange={(e) => setColumnFilters({ ...columnFilters, ozel_alan: e.target.value })}
                      />
                    </th>
                  </tr>
                ) : (
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <th className="p-1.5 text-center">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.due_date}
                        onChange={(e) => setColumnFilters({ ...columnFilters, due_date: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-center">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.remaining_days}
                        onChange={(e) => setColumnFilters({ ...columnFilters, remaining_days: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.creditor}
                        onChange={(e) => setColumnFilters({ ...columnFilters, creditor: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.check_no}
                        onChange={(e) => setColumnFilters({ ...columnFilters, check_no: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 font-normal"
                        placeholder="Ara..."
                        value={columnFilters.debtor}
                        onChange={(e) => setColumnFilters({ ...columnFilters, debtor: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-center">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.amount}
                        onChange={(e) => setColumnFilters({ ...columnFilters, amount: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-center">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.issue_date}
                        onChange={(e) => setColumnFilters({ ...columnFilters, issue_date: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-center">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.status}
                        onChange={(e) => setColumnFilters({ ...columnFilters, status: e.target.value })}
                      />
                    </th>
                    <th className="p-1.5 text-left">
                      <input
                        type="text"
                        className="w-full text-[11px] px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:border-brand-500 text-center font-normal"
                        placeholder="Ara..."
                        value={columnFilters.ozel_alan}
                        onChange={(e) => setColumnFilters({ ...columnFilters, ozel_alan: e.target.value })}
                      />
                    </th>
                  </tr>
                )}
              </thead>
              <tbody key={`${activeTab}-${selectedSidebarFilter}-${dateFilterType}`} className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === 'alinan' ? 15 : 9} className="px-4 py-12 text-center text-gray-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-500" />
                      Veriler yükleniyor...
                    </td>
                  </tr>
                ) : filteredChecks.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'alinan' ? 15 : 9} className="px-4 py-12 text-center text-gray-400">
                      Arama kriterlerine uygun çek bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredChecks.map(check => {
                    const isPaid = (check.status || '').toLowerCase().includes('ödendi') || (check.status || '').toLowerCase().includes('tahsil edildi') || (check.status || '').toLowerCase().includes('ödenen') || ((check.status || '').toLowerCase().includes('tahsil') && !(check.status || '').toLowerCase().includes('tahsilde'));
                    const isProblem = (check.status || '').toLowerCase().includes('yazıldı') || (check.status || '').toLowerCase().includes('karşılıksız');
                    const remainingDays = calculateRemainingDays(check.due_date);
                    
                    const isRecordSenet = 
                      check.document_type === 'senet' || 
                      (check.tahsildar_banka || '').toUpperCase() === 'SENET' || 
                      (check.bank_name || '').toUpperCase() === 'SENET';

                    return (
                      <tr key={check.id} className="hover:bg-gray-50/50 transition-colors">
                        {activeTab === 'alinan' ? (
                          <>
                            <td className="px-1.5 py-1.5 text-center font-medium text-gray-700">{formatDate(check.due_date)}</td>
                            <td className="px-1.5 py-1.5 text-center font-semibold">
                              {remainingDays !== null ? (
                                <span
                                  className={
                                    isPaid
                                      ? 'text-gray-400 font-normal'
                                      : remainingDays < 0
                                      ? 'text-red-600 font-bold'
                                      : remainingDays <= 10
                                      ? 'text-amber-600 font-bold'
                                      : 'text-gray-600'
                                  }
                                >
                                  {remainingDays}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-1.5 py-1.5 text-gray-600 font-medium">{check.debtor || '-'}</td>
                            <td className="px-1.5 py-1.5 text-gray-600 font-medium">{fixCorruptedText(check.kesideci) || '-'}</td>
                            <td className="px-1.5 py-1.5 text-gray-600 font-medium">{fixCorruptedText(check.creditor) || '-'}</td>
                            <td className="px-1.5 py-1.5 font-semibold text-gray-800">
                              <div className="flex items-center gap-1.5">
                                {isRecordSenet ? (
                                  <span className="px-1 py-0.5 text-[9px] font-black rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wide flex-shrink-0 scale-95">SENET</span>
                                ) : (
                                  <span className="px-1 py-0.5 text-[9px] font-black rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide flex-shrink-0 scale-95">ÇEK</span>
                                )}
                                <span>{check.check_no || '-'}</span>
                              </div>
                            </td>
                            <td className="px-1.5 py-1.5 text-gray-600 font-medium">{check.tahsildar_banka || '-'}</td>
                            <td className="px-1.5 py-1.5 text-center font-bold text-gray-900 text-[12.5px] whitespace-nowrap">
                              {formatCurrency(check.amount, check.para_birimi)}
                            </td>
                            <td className="px-1.5 py-1.5 font-semibold text-gray-700">
                              <div className="flex items-center gap-1.5">
                                <Building size={13} className="text-gray-400 flex-shrink-0" />
                                {check.bank_name || '-'}
                              </div>
                            </td>
                            <td className="px-1.5 py-1.5 text-center">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                                  isPaid
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : isProblem
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {displayStatus(check.status, check.check_type)}
                              </span>
                            </td>
                            <td className="px-1.5 py-1.5 text-gray-500 font-medium">{check.bank_branch || '-'}</td>
                            <td className="px-1.5 py-1.5 text-gray-500 font-medium">{check.keside_yeri || '-'}</td>
                            <td className="px-1.5 py-1.5 text-center text-gray-600 font-medium">{formatDate(check.issue_date || check.created_at)}</td>
                            <td className="px-1.5 py-1.5 text-gray-600 font-medium">{check.ciro_edilen || '-'}</td>
                            <td className="px-1.5 py-1.5 text-gray-500 font-semibold">{fixCorruptedText(check.ozel_alan) || (isRecordSenet ? 'SENET' : 'ÇEK')}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-1.5 py-1.5 text-center font-medium text-gray-700">{formatDate(check.due_date)}</td>
                            <td className="px-1.5 py-1.5 text-center font-semibold">
                              {remainingDays !== null ? (
                                <span
                                  className={
                                    isPaid
                                      ? 'text-gray-400 font-normal'
                                      : remainingDays < 0
                                      ? 'text-red-600 font-bold'
                                      : remainingDays <= 10
                                      ? 'text-amber-600 font-bold'
                                      : 'text-gray-600'
                                  }
                                >
                                  {remainingDays}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-1.5 py-1.5 text-gray-600 font-medium">{check.creditor || '-'}</td>
                            <td className="px-1.5 py-1.5 font-semibold text-gray-800">
                              <div className="flex items-center gap-1.5">
                                {isRecordSenet ? (
                                  <span className="px-1 py-0.5 text-[9px] font-black rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wide flex-shrink-0 scale-95">SENET</span>
                                ) : (
                                  <span className="px-1 py-0.5 text-[9px] font-black rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide flex-shrink-0 scale-95">ÇEK</span>
                                )}
                                <span>{check.check_no || '-'}</span>
                              </div>
                            </td>
                            <td className="px-1.5 py-1.5 text-gray-600 font-medium">{check.debtor || '-'}</td>
                            <td className="px-1.5 py-1.5 text-center font-bold text-gray-900 text-[12.5px] whitespace-nowrap">
                              {formatCurrency(check.amount, check.para_birimi)}
                            </td>
                            <td className="px-1.5 py-1.5 text-center text-gray-600 font-medium">{formatDate(check.issue_date || check.created_at)}</td>
                            <td className="px-1.5 py-1.5 text-center">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                                  isPaid
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : isProblem
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {displayStatus(check.status, check.check_type)}
                              </span>
                            </td>
                            <td className="px-1.5 py-1.5 text-gray-500 font-semibold">{fixCorruptedText(check.ozel_alan) || (isRecordSenet ? 'SENET' : 'ÇEK')}</td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-gray-900">
                {activeTab === 'alinan' ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-3.5 text-right text-gray-500 uppercase tracking-wider text-[11.5px] font-bold">Toplam:</td>
                    <td className="px-3 py-3.5 text-center text-[17px] text-brand-700 font-extrabold">{formatCurrency(filteredTotal, 'TRY')}</td>
                    <td colSpan={2} className="px-3 py-3.5"></td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-3.5 text-right text-gray-500 uppercase tracking-wider text-[11.5px] font-bold">Toplam:</td>
                    <td className="px-3 py-3.5 text-center text-[17px] text-brand-700 font-extrabold">{formatCurrency(filteredTotal, 'TRY')}</td>
                    <td colSpan={3} className="px-3 py-3.5"></td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </SectionCard>
      </div>
      </div>
      </div>
      )}

      {/* Yeni Çek Ekleme Modalı */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Çek Seç"
        description={modalMode === 'select' ? 'Lütfen sistemdeki mevcut çeklerden seçim yapın.' : 'Lütfen manuel eklenecek çekin bilgilerini doldurun.'}
        size="md"
      >
        <form onSubmit={handleAddCheck} className="space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              type="button"
              className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 ${modalMode === 'select' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setModalMode('select')}
            >
              Sistemden Çek Seç
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 ${modalMode === 'create' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setModalMode('create')}
            >
              Yeni Çek Manuel Gir
            </button>
          </div>

          {modalMode === 'select' ? (
            <div className="space-y-4">
              <div>
                <label className="label">Çek Ara</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Alacaklı, Borçlu, Çek No veya Tutar yazarak arayın..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Mevcut Çekler ({filteredSelectableChecks.length} adet bulundu)</label>
                <select
                  className="input"
                  value={selectedCheckId}
                  onChange={(e) => setSelectedCheckId(e.target.value)}
                  required
                >
                  <option value="">-- Çek Seçin --</option>
                  {filteredSelectableChecks.map(c => {
                    const typeLabel = c.check_type === 'alinan' ? 'Alınan' : 'Kesilen';
                    const amountFormatted = formatExcelNumber(c.amount || 0);
                    const dueFormatted = c.due_date ? new Date(c.due_date).toLocaleDateString('tr-TR') : 'Vadesiz';
                    const name = c.check_type === 'alinan' ? c.creditor : c.debtor;
                    const label = `[${typeLabel}] ${name || 'İsimsiz'} - ${amountFormatted} TL - Vade: ${dueFormatted} (Çek No: ${c.check_no || 'Yok'})`;
                    return (
                      <option key={c.id} value={c.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Çek Türü</label>
                  <select
                    className="input"
                    value={newCheckType}
                    onChange={(e) => handleCheckTypeChange(e.target.value as 'alinan' | 'kesilen')}
                    required
                  >
                    <option value="kesilen">Kesilen Çek</option>
                    <option value="alinan">Alınan Çek</option>
                  </select>
                </div>
                <div>
                  <label className="label">Çek Numarası</label>
                  <input
                    type="text"
                    className="input"
                    value={newCheckNo}
                    onChange={(e) => setNewCheckNo(e.target.value)}
                    placeholder="Örn: 024758"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Banka Adı</label>
                  <input
                    type="text"
                    className="input"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="Örn: GARANTİ BANKASI"
                    required
                  />
                </div>
                <div>
                  <label className="label">Banka Şubesi</label>
                  <input
                    type="text"
                    className="input"
                    value={newBankBranch}
                    onChange={(e) => setNewBankBranch(e.target.value)}
                    placeholder="Örn: Mecidiyeköy (Boş bırakılabilir)"
                    disabled={newCheckType === 'kesilen'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{newCheckType === 'kesilen' ? 'Keşideci (Biz)' : 'Borçlu / Veren (Keşideci)'}</label>
                  <input
                    type="text"
                    className="input"
                    value={newDebtor}
                    onChange={(e) => setNewDebtor(e.target.value)}
                    placeholder="Örn: BEKO A.Ş. / Müşteri Adı"
                    required
                  />
                </div>
                <div>
                  <label className="label">{newCheckType === 'kesilen' ? 'Alacaklı Firma (Ciro Edilen)' : 'Ciro Eden (Alacaklı)'}</label>
                  <input
                    type="text"
                    className="input"
                    value={newCreditor}
                    onChange={(e) => setNewCreditor(e.target.value)}
                    placeholder="Örn: DİVAN İNŞAAT"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="label">Tutar</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className="input pr-16"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 text-sm">{newParaBirimi}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">Para Birimi</label>
                  <select
                    className="input"
                    value={newParaBirimi}
                    onChange={(e) => setNewParaBirimi(e.target.value)}
                    required
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vade Tarihi (Keşide)</label>
                  <input
                    type="date"
                    className="input"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Çek Durumu</label>
                  <select
                    className="input"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    required
                  >
                    {newCheckType === 'kesilen' ? (
                      <>
                        <option value="Tahsilde">Tahsildeki Çekler</option>
                        <option value="Ödendi">Ödenen Çekler</option>
                        <option value="Geri Alındı">Geri Alınan Çekler</option>
                        <option value="İptal">İptal Edilen Çekler</option>
                        <option value="Kayıp">Kayıp Çekler</option>
                      </>
                    ) : (
                      <>
                        <option value="Portföyde">Portföyde</option>
                        <option value="Tahsilde">Tahsilde</option>
                        <option value="Ciro Edildi">Ciro Edildi</option>
                        <option value="Teminata Verildi">Teminata Verildi</option>
                        <option value="Takasa Verildi">Takasa Verildi</option>
                        <option value="İcraya Verildi">İcraya Verildi</option>
                        <option value="Faktoringe Verildi">Faktoringe Verildi</option>
                        <option value="Borçluya İade Edildi">Borçluya İade Edildi</option>
                        <option value="Portföyden Tahsil">Portföyden Tahsil</option>
                        <option value="Bankadan Tahsil">Bankadan Tahsil</option>
                        <option value="İcradan Tahsil">İcradan Tahsil</option>
                        <option value="Portföyde Karşılıksız">Portföyde Karşılıksız</option>
                        <option value="Bankada Karşılıksız">Bankada Karşılıksız</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Açıklama</label>
                <input
                  type="text"
                  className="input"
                  value={newOzelAlan}
                  onChange={(e) => setNewOzelAlan(e.target.value)}
                  placeholder="Açıklama veya not yazın..."
                />
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="label">Eklenecek Sütun</label>
            <select
              className="input"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              required
            >
              <option value="TAKSİT">TAKSİT Sütunu</option>
              <option value="TAKASTA OLMAYAN">TAKASTA OLMAYAN ÇEKLER (Sol Alt)</option>
              {dashboardData.activeBankCols.map(col => (
                <option key={col} value={col}>{col} Sütunu</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
              disabled={saving}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
