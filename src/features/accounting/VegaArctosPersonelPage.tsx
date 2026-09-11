import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Database, 
  Search, 
  RefreshCw, 
  Eye, 
  PlusCircle,
  Building,
  User,
  ArrowLeft,
  X,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

interface PersonnelCard {
  id?: string;
  code: string;
  name: string;
  companyCode?: string;
  companyTrackingCode?: string;
  taxOffice?: string;
  taxNo?: string;
  type: string;
  city: string;
  lastTransactionDate?: string;
  balance: number;
  is_manual?: boolean;
}

interface PersonnelMovement {
  id?: string;
  date: string;
  invoiceNo?: string;
  izahat?: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  lineTutar?: number;
  productName?: string;
  unitName?: string;
  borc: number;
  alacak: number;
  vade?: string;
  altnot?: string;
  type: string;
  amount: number;
  is_manual?: boolean;
}

const TUNNEL_URL = 'https://vega-api.amasyaetas.com';
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

export function VegaArctosPersonelPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const codeParam = searchParams.get('code');

  const [personnelList, setPersonnelList] = useState<PersonnelCard[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelCard | null>(null);
  const [selectedMovements, setSelectedMovements] = useState<PersonnelMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vega' | 'manual' | 'borc' | 'alacak'>('all');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [liveConnection, setLiveConnection] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<'code' | 'name' | 'type' | 'lastTransactionDate' | 'balance'>('balance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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

  // Modals
  const [isAddPersonnelModalOpen, setIsAddPersonnelModalOpen] = useState(false);
  const [isAddMovementModalOpen, setIsAddMovementModalOpen] = useState(false);

  // Form States
  const [newPersonnelName, setNewPersonnelName] = useState('');
  const [newPersonnelCode, setNewPersonnelCode] = useState('');
  const [newPersonnelCity, setNewPersonnelCity] = useState('');

  const [newMoveDate, setNewMoveDate] = useState(new Date().toISOString().slice(0, 10));
  const [newMoveDescription, setNewMoveDescription] = useState('');
  const [newMoveType, setNewMoveType] = useState<'borc' | 'alacak'>('borc');
  const [newMoveAmount, setNewMoveAmount] = useState('');

  useEffect(() => {
    initLoad();
  }, [user?.organizationId]);

  useEffect(() => {
    if (codeParam && personnelList.length > 0 && !selectedPersonnel) {
      const matched = personnelList.find(p => p.code === codeParam);
      if (matched) {
        setSelectedPersonnel(matched);
      }
    }
  }, [codeParam, personnelList, selectedPersonnel]);

  useEffect(() => {
    if (selectedPersonnel) {
      fetchMovements(selectedPersonnel);
    } else {
      setSelectedMovements([]);
    }
  }, [selectedPersonnel]);

  const initLoad = async () => {
    setIsPageLoading(true);
    // 1. Initial cached load from Supabase for instant response
    await fetchSavedPersonnel();
    setIsPageLoading(false);

    // 2. Fetch live data from Vega tunnel in background immediately
    await handleSync(true);
  };

  const fetchSavedPersonnel = async () => {
    const orgId = user?.organizationId || DEFAULT_ORG_ID;
    try {
      const { data, error } = await supabase
        .from('vega_personel')
        .select('*')
        .eq('organization_id', orgId)
        .order('code', { ascending: true });
        
      if (error) throw error;
      if (data && data.length > 0) {
        const mappedData: PersonnelCard[] = data.map(item => ({
          id: item.id,
          code: String(item.code),
          name: item.name,
          companyCode: item.company_code,
          companyTrackingCode: item.company_tracking_code,
          taxOffice: item.tax_office,
          taxNo: item.tax_no,
          type: item.type || 'Personel',
          city: item.city || '',
          lastTransactionDate: item.last_transaction_date,
          balance: Number(item.balance || 0),
          is_manual: Boolean(item.is_manual)
        }));
        setPersonnelList(mappedData);
        return true;
      }
    } catch (err) {
      console.error('Supabase personel kartları yüklenemedi:', err);
    }
    return false;
  };

  const handleSync = async (silent = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    const orgId = user?.organizationId || DEFAULT_ORG_ID;
    try {
      const response = await fetch(`${TUNNEL_URL}/api/personel`);
      if (!response.ok) throw new Error('Vega API yanıt vermedi.');
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setLiveConnection(true);
        const now = new Date();
        setLastSyncTime(
          `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
        );

        const mappedLive: PersonnelCard[] = data.map(item => ({
          code: String(item.code),
          name: item.name,
          companyCode: item.companyCode,
          companyTrackingCode: item.companyTrackingCode,
          taxOffice: item.taxOffice,
          taxNo: item.taxNo,
          type: 'Personel',
          city: item.city || '',
          lastTransactionDate: item.lastTransactionDate,
          balance: Number(item.balance || 0),
          is_manual: false
        }));

        // Merge with existing manual personnel
        setPersonnelList(prev => {
          const manualOnes = prev.filter(p => p.is_manual);
          return [...mappedLive, ...manualOnes];
        });

        // Upsert to Supabase in chunks of 100
        const payload = data.map(item => ({
          organization_id: orgId,
          code: String(item.code),
          name: item.name,
          company_code: item.companyCode,
          company_tracking_code: item.companyTrackingCode,
          tax_office: item.taxOffice,
          tax_no: item.taxNo,
          type: 'Personel',
          city: item.city || '',
          last_transaction_date: item.lastTransactionDate,
          balance: Number(item.balance || 0),
          is_manual: false
        }));

        const chunkSize = 100;
        for (let i = 0; i < payload.length; i += chunkSize) {
          const chunk = payload.slice(i, i + chunkSize);
          await supabase
            .from('vega_personel')
            .upsert(chunk, { onConflict: 'organization_id,code' });
        }

        if (!silent) {
          notify(`Vega personel verileri başarıyla eşitlendi (${data.length} Personel).`, 'success');
        }
      }
    } catch (err: any) {
      console.error('Eşitleme hatası:', err);
      setLiveConnection(false);
      if (!silent) {
        notify('Vega API bağlantısı kurulamadı. Kayıtlı veriler gösteriliyor.', 'error');
      }
      await fetchSavedPersonnel();
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchMovements = async (personnel: PersonnelCard) => {
    setIsLoadingMovements(true);
    const orgId = user?.organizationId || DEFAULT_ORG_ID;
    try {
      if (personnel.is_manual) {
        // Load manual movements from Supabase
        const { data, error } = await supabase
          .from('vega_personel_hareketler')
          .select('*')
          .eq('organization_id', orgId)
          .eq('personel_code', personnel.code)
          .order('date', { ascending: true });

        if (error) throw error;
        
        const mappedMoves: PersonnelMovement[] = (data || []).map(row => ({
          id: row.id,
          date: row.date,
          invoiceNo: row.invoice_no,
          izahat: row.izahat || 'İşlem',
          description: row.description || row.izahat || 'Manuel Hareket',
          borc: Number(row.borc || 0),
          alacak: Number(row.alacak || 0),
          type: Number(row.borc) > 0 ? 'Borç Dekontu' : 'Alacak Dekontu',
          amount: Number(row.borc) > 0 ? Number(row.borc) : Number(row.alacak),
          is_manual: true
        }));
        
        setSelectedMovements(mappedMoves);
      } else {
        // Load live movements from Vega API
        const response = await fetch(`${TUNNEL_URL}/api/personel/${personnel.code}/hareketler`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const mappedMoves: PersonnelMovement[] = data.map(item => ({
              ...item,
              description: item.description || item.productName || item.izahat || 'Cari Hareket',
              borc: Number(item.borc || 0),
              alacak: Number(item.alacak || 0),
              amount: Number(item.amount || (Number(item.borc || 0) + Number(item.alacak || 0)))
            }));
            setSelectedMovements(mappedMoves);
          }
        } else {
          notify('Vega hareket detayı alınamadı.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      notify('Hareket detayları yüklenirken hata oluştu.', 'error');
    } finally {
      setIsLoadingMovements(false);
    }
  };

  // Create Manual Personnel
  const handleAddPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = user?.organizationId || DEFAULT_ORG_ID;
    if (!newPersonnelName || !newPersonnelCode) {
      notify('Lütfen isim ve kod alanlarını doldurun.', 'error');
      return;
    }

    try {
      const exists = personnelList.some(p => p.code.toLowerCase() === newPersonnelCode.trim().toLowerCase());
      if (exists) {
        notify('Bu personel kodu zaten kullanımda.', 'error');
        return;
      }

      const payload = {
        organization_id: orgId,
        code: newPersonnelCode.trim(),
        name: newPersonnelName.trim(),
        city: newPersonnelCity.trim() || 'AMASYA',
        type: 'Personel',
        balance: 0,
        is_manual: true
      };

      const { error } = await supabase
        .from('vega_personel')
        .insert([payload]);

      if (error) throw error;

      notify('Personel başarıyla oluşturuldu.', 'success');
      setIsAddPersonnelModalOpen(false);
      setNewPersonnelName('');
      setNewPersonnelCode('');
      setNewPersonnelCity('');
      
      await fetchSavedPersonnel();
    } catch (err: any) {
      console.error(err);
      notify('Personel eklenirken hata oluştu: ' + err.message, 'error');
    }
  };

  // Create Manual Movement
  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = user?.organizationId || DEFAULT_ORG_ID;
    if (!selectedPersonnel) return;
    if (!newMoveAmount || isNaN(Number(newMoveAmount))) {
      notify('Lütfen geçerli bir tutar girin.', 'error');
      return;
    }

    try {
      const amountNum = Number(newMoveAmount);
      const isBorc = newMoveType === 'borc';
      
      const payload = {
        organization_id: orgId,
        personel_code: selectedPersonnel.code,
        date: new Date(newMoveDate).toISOString(),
        invoice_no: 'MANUEL',
        izahat: isBorc ? 'Borç' : 'Alacak',
        description: newMoveDescription.trim() || (isBorc ? 'Elde Ödeme' : 'Hak Ediş'),
        borc: isBorc ? amountNum : 0,
        alacak: isBorc ? 0 : amountNum
      };

      const { error: moveError } = await supabase
        .from('vega_personel_hareketler')
        .insert([payload]);

      if (moveError) throw moveError;

      // Fetch all movements to calculate new balance
      const { data: moves, error: fetchError } = await supabase
        .from('vega_personel_hareketler')
        .select('borc,alacak')
        .eq('organization_id', orgId)
        .eq('personel_code', selectedPersonnel.code);

      if (fetchError) throw fetchError;

      let newBalance = 0;
      (moves || []).forEach(m => {
        newBalance += (Number(m.borc || 0) - Number(m.alacak || 0));
      });

      // Update personnel balance
      const { error: updateError } = await supabase
        .from('vega_personel')
        .update({ balance: newBalance })
        .eq('organization_id', orgId)
        .eq('code', selectedPersonnel.code);

      if (updateError) throw updateError;

      notify('İşlem başarıyla eklendi.', 'success');
      setIsAddMovementModalOpen(false);
      setNewMoveDescription('');
      setNewMoveAmount('');
      
      // Refresh lists
      await fetchSavedPersonnel();
      const updatedCard = { ...selectedPersonnel, balance: newBalance };
      setSelectedPersonnel(updatedCard);
      await fetchMovements(updatedCard);
    } catch (err: any) {
      console.error(err);
      notify('İşlem kaydedilirken hata oluştu: ' + err.message, 'error');
    }
  };

  // Format Helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;
    if (timeStr === '00:00:00') return `${day}.${month}.${year}`;
    return `${day}.${month}.${year} ${timeStr}`;
  };

  // Running balance calculation for statement view
  let runningBalance = 0;
  const seenCariInds = new Set<string | number>();
  const movementsWithBalance = selectedMovements.map((inv, idx) => {
    const idKey = inv.id || idx;
    let change = 0;
    if (!seenCariInds.has(idKey)) {
      seenCariInds.add(idKey);
      change = (inv.borc || 0) - (inv.alacak || 0);
    }
    runningBalance += change;
    return {
      ...inv,
      balanceVal: runningBalance
    };
  });

  // Filters and search logic
  const filteredList = personnelList.filter(p => {
    const normQuery = turkishNormalize(searchQuery);
    const matchesSearch = 
      turkishNormalize(p.name).includes(normQuery) ||
      turkishNormalize(p.code).includes(normQuery) ||
      turkishNormalize(p.city || '').includes(normQuery);
      
    if (!matchesSearch) return false;
    if (filterType === 'all') return true;
    if (filterType === 'vega') return !p.is_manual;
    if (filterType === 'manual') return p.is_manual;
    if (filterType === 'borc') return (p.balance || 0) > 0;
    if (filterType === 'alacak') return (p.balance || 0) < 0;
    return true;
  });

  // Sort logic helper
  const sortedList = useMemo<PersonnelCard[]>(() => {
    return [...filteredList].sort((a, b) => {
      // Rule: Push 0 balances to the bottom of the list
      const balA = Number(a.balance || 0);
      const balB = Number(b.balance || 0);
      if (balA === 0 && balB !== 0) return 1;
      if (balB === 0 && balA !== 0) return -1;

      let valA: any = '';
      let valB: any = '';

      if (sortField === 'balance') {
        valA = Number(a.balance || 0);
        valB = Number(b.balance || 0);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      } else if (sortField === 'code') {
        valA = a.code || '';
        valB = b.code || '';
      } else if (sortField === 'name') {
        valA = a.name || '';
        valB = b.name || '';
      } else if (sortField === 'type') {
        valA = a.type || '';
        valB = b.type || '';
      } else if (sortField === 'lastTransactionDate') {
        valA = a.lastTransactionDate || '';
        valB = b.lastTransactionDate || '';
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB, 'tr')
          : valB.localeCompare(valA, 'tr');
      }

      return 0;
    });
  }, [filteredList, sortField, sortDirection]);

  // Calculate statistics
  const totalBorc = personnelList.filter(p => (p.balance || 0) > 0).reduce((acc, p) => acc + (p.balance || 0), 0);
  const totalAlacak = personnelList.filter(p => (p.balance || 0) < 0).reduce((acc, p) => acc + Math.abs(p.balance || 0), 0);
  const netBalance = totalBorc - totalAlacak;
  const borcluCount = personnelList.filter(p => (p.balance || 0) > 0).length;
  const alacakliCount = personnelList.filter(p => (p.balance || 0) < 0).length;
  const activePersonnelCount = personnelList.filter(p => (p.balance || 0) !== 0).length;

  if (isPageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-600 border-t-transparent"></div>
        <p className="text-sm font-semibold text-gray-500">Personel verileri yükleniyor...</p>
      </div>
    );
  }

  // Detail Statement View
  if (selectedPersonnel) {
    return (
      <div className="space-y-6">
        {/* Header navigation bar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <button
            onClick={() => { setSelectedPersonnel(null); setSearchParams({}); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft size={14} />
            <span>Personel Listesine Dön</span>
          </button>
          
          <div className="flex items-center gap-2">
            {selectedPersonnel.is_manual && (
              <button
                onClick={() => setIsAddMovementModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors"
              >
                <PlusCircle size={15} />
                <span>Manuel Hareket Ekle</span>
              </button>
            )}
            <button
              onClick={() => { setSelectedPersonnel(null); setSearchParams({}); }}
              className="px-4 py-2 border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Geri Dön
            </button>
          </div>
        </div>

        {/* Title and Badge */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{selectedPersonnel.name}</h1>
          <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold ${
            selectedPersonnel.is_manual ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {selectedPersonnel.is_manual ? 'Manuel Personel' : 'Vega Personel'}
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Details Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm col-span-2 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Personel Detay Bilgileri</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Personel Kodu</span>
                <span className="font-bold text-gray-900">{selectedPersonnel.code}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Şehir / Şube</span>
                <span className="font-bold text-gray-900">{selectedPersonnel.city || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Kart Türü</span>
                <span className="font-bold text-gray-900">{selectedPersonnel.type}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Son Hareket Tarihi</span>
                <span className="font-bold text-gray-900">{formatDateTime(selectedPersonnel.lastTransactionDate) || '-'}</span>
              </div>
            </div>
          </div>

          {/* Balance Widget */}
          <div className="bg-[#002d59] text-white p-6 rounded-2xl border border-[#001f3f] shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Net Bakiye</span>
              <div className="text-2xl font-extrabold mt-1 text-white">
                {Math.abs(selectedPersonnel.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-[10px] text-white/60 uppercase font-bold tracking-wider">Hesap Durumu</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedPersonnel.balance > 0 ? 'bg-blue-500/30 text-blue-200 border border-blue-400/30' : selectedPersonnel.balance < 0 ? 'bg-rose-500/30 text-rose-200 border border-rose-400/30' : 'bg-white/10 text-white/70'
              }`}>
                {selectedPersonnel.balance > 0 ? 'Personel Borçlu (B)' : selectedPersonnel.balance < 0 ? 'Personel Alacaklı (A)' : 'Bakiyesiz'}
              </span>
            </div>
          </div>
        </div>

        {/* Info Notification */}
        <div className="bg-blue-50 border border-blue-150 p-4 rounded-xl flex items-start gap-3 text-xs text-blue-800">
          <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <p>
            {selectedPersonnel.is_manual 
              ? 'Bu personel panelden manuel olarak eklenmiştir. Cari hareket girişlerini, silme ve düzenleme işlemlerini panel üzerinden gerçekleştirebilirsiniz.'
              : 'Aşağıdaki hareket dökümü, mezbahane lokal server kasasında kurulu olan **Vega Arctos** programının veritabanından anlık olarak çekilmektedir.'
            }
          </p>
        </div>

        {/* Statement Table Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Personel Cari Hesap Ekstresi</h2>
              <div className="text-xs font-semibold text-gray-500 mt-0.5">{selectedPersonnel.name}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-left text-xs text-gray-700">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center">Tarih</th>
                  <th className="border-r border-gray-200 px-3 py-2.5">Açıklama</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center">İzahat</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-right">Borç (Çıkış)</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-right">Alacak (Giriş)</th>
                  <th className="px-3 py-2.5 text-right">Toplam Bakiye</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {/* Previous period row */}
                <tr className="bg-gray-50/50 text-gray-500">
                  <td className="border-r border-gray-200 px-3 py-2 text-center font-bold">-</td>
                  <td className="border-r border-gray-200 px-3 py-2 font-bold uppercase" colSpan={2}>ÖNCEKİ DÖNEMDEN DEVREDEN:</td>
                  <td className="border-r border-gray-200 px-3 py-2 text-right">-</td>
                  <td className="border-r border-gray-200 px-3 py-2 text-right">-</td>
                  <td className="px-3 py-2 text-right font-bold text-gray-600">0.00 (-) TL</td>
                </tr>

                {isLoadingMovements ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent"></div>
                        <span>Hareket dökümü yükleniyor...</span>
                      </div>
                    </td>
                  </tr>
                ) : movementsWithBalance.length > 0 ? (
                  movementsWithBalance.map((inv, idx) => {
                    const isBlueRow = idx % 2 === 1;
                    const bakiyeIndicator = inv.balanceVal > 0 ? '(B)' : inv.balanceVal < 0 ? '(A)' : '(-)';
                    
                    return (
                      <tr key={inv.id || idx} className={`${isBlueRow ? 'bg-[#f0f7ff]' : 'bg-white'} hover:bg-gray-50/30 transition-colors`}>
                        <td className="border-r border-gray-200 px-3 py-2 text-center whitespace-nowrap text-gray-500">{formatDate(inv.date)}</td>
                        <td className="border-r border-gray-200 px-3 py-2 font-semibold text-gray-900 max-w-[280px] truncate" title={inv.description}>
                          {inv.description || inv.izahat || 'İşlem'}
                        </td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500 font-bold">{inv.izahat || 'İşlem'}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-blue-700">
                          {inv.borc > 0 ? inv.borc.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-emerald-600">
                          {inv.alacak > 0 ? inv.alacak.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-slate-950 whitespace-nowrap bg-blue-50/5">
                          {Math.abs(inv.balanceVal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL <span className="text-[10px] text-gray-500 font-semibold ml-1">{bakiyeIndicator}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-450">
                      Bu personele ait hareket dökümü bulunmamaktadır.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end items-center mt-4 text-sm font-bold text-gray-950 pr-4 gap-2">
            <span>Genel Toplam :</span>
            <span className="text-base text-brand-600">
              {Math.abs(selectedPersonnel.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
              <span className="text-xs ml-1 font-semibold text-gray-500">
                {selectedPersonnel.balance > 0 ? '(B) Borçlu' : selectedPersonnel.balance < 0 ? '(A) Alacaklı' : ''}
              </span>
            </span>
          </div>
        </div>

        {/* Modal: Add Manual Movement */}
        {isAddMovementModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 relative space-y-4">
              <button 
                onClick={() => setIsAddMovementModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div>
                <h3 className="text-base font-bold text-gray-900">Manuel İşlem Ekle</h3>
                <p className="text-xs text-gray-500 mt-1">{selectedPersonnel.name} için cari hareket oluştur.</p>
              </div>

              <form onSubmit={handleAddMovement} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-gray-500">İşlem Tarihi</label>
                  <input
                    type="date"
                    required
                    value={newMoveDate}
                    onChange={(e) => setNewMoveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500">İşlem Türü</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewMoveType('borc')}
                      className={`py-2 text-center rounded-lg border font-bold transition-all ${
                        newMoveType === 'borc'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Borç (Elde Ödeme / Çıkış)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMoveType('alacak')}
                      className={`py-2 text-center rounded-lg border font-bold transition-all ${
                        newMoveType === 'alacak'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Alacak (Hakediş / Giriş)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500">Tutar (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={newMoveAmount}
                    onChange={(e) => setNewMoveAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500">Açıklama</label>
                  <input
                    type="text"
                    placeholder="Elde Ödeme, Prim vb."
                    value={newMoveDescription}
                    onChange={(e) => setNewMoveDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddMovementModalOpen(false)}
                    className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-500 transition-colors"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vega Arctos Personel Cari Entegrasyonu</h1>
          <p className="text-sm text-gray-500">
            Mezbahane server kasasından çekilen personeller ve şubeler için manuel eklenen personel kartları.
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAddPersonnelModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
          >
            <UserPlus size={16} />
            <span>Personel Cari Kart Ekle</span>
          </button>
          
          <button
            onClick={() => handleSync(false)}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors disabled:opacity-70"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Personel Eşitleniyor...' : 'Vega Personellerini Eşitle'}</span>
          </button>
        </div>
      </div>

      {/* Connection widget & Status */}
      <div className="bg-[#002d59] text-white p-5 rounded-2xl border border-[#001f3f] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
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
                {liveConnection ? 'Mezbahane Server Kasası Bağlantısı Aktif' : 'Vega SQL Bağlantısı Bekleniyor'}
              </h2>
            </div>
            <p className="text-xs text-white/70 mt-1">
              Server IP: <span className="font-semibold text-white">{liveConnection ? '192.168.2.240 (Lokal)' : 'Lokal Server'}</span> &nbsp;|&nbsp; 
              Veritabanı: <span className="font-semibold text-white">ARCTOS_2026</span> &nbsp;|&nbsp;
              Bağlantı Modu: <span className={`${liveConnection ? 'text-emerald-300' : 'text-amber-300'} font-semibold`}>
                {liveConnection ? 'SQL Direct-Query (Canlı)' : 'Kayıtlı Veriler'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-6 z-10 border-t border-white/10 pt-4 md:border-t-0 md:pt-0">
          <div>
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Son Eşitleme</span>
            <div className="text-sm font-semibold mt-0.5">{liveConnection ? (lastSyncTime ? lastSyncTime : 'Az Önce') : 'Senkronize Edilmedi'}</div>
          </div>
          <div>
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Kayıtlı / Aktif Personel</span>
            <div className="text-sm font-semibold mt-0.5">{personnelList.length} Toplam ({activePersonnelCount} Bakiyeli)</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam Personel Borcu (B)</span>
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">
              {totalBorc.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
            </div>
            <p className="text-[11px] text-gray-500 font-semibold flex items-center gap-1.5 mt-2">
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">{borcluCount} Kişi</span>
              <span>Personele verilen avans / borçlar</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-600"></span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam Personel Alacağı (A)</span>
            </div>
            <div className="text-2xl font-black text-rose-700 mt-2">
              {totalAlacak.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
            </div>
            <p className="text-[11px] text-gray-500 font-semibold flex items-center gap-1.5 mt-2">
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-100">{alacakliCount} Kişi</span>
              <span>Personele ödenecek maaş / hak ediş</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${netBalance > 0 ? 'bg-blue-600' : netBalance < 0 ? 'bg-rose-600' : 'bg-gray-400'}`}></span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Konsolide Net Durum</span>
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2 flex items-baseline gap-2">
              <span>{Math.abs(netBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                netBalance > 0 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : netBalance < 0 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                    : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}>
                {netBalance > 0 ? '(B) Şirket Alacaklı' : netBalance < 0 ? '(A) Personel Alacaklı' : '0.00'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-semibold mt-2">
              {netBalance > 0 
                ? 'Şirket personellerden net alacaklıdır.' 
                : netBalance < 0 
                  ? 'Personeller şirketten net alacaklıdır.' 
                  : 'Konsolide personel bakiyesi sıfırdır.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main List and Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search bar with Clear button */}
          <div className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Personel Adı, Kod veya Şehir..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-10 py-2 w-full text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Aramayı Temizle"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setSearchQuery('')}
              disabled={!searchQuery}
              className="px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-300 rounded-lg bg-white transition-all shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Temizle
            </button>
          </div>

          {/* Filter badges */}
          <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-150'
              }`}
            >
              Tümü ({personnelList.length})
            </button>
            <button
              onClick={() => setFilterType('borc')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === 'borc'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Borçlular ({borcluCount})
            </button>
            <button
              onClick={() => setFilterType('alacak')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === 'alacak'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Alacaklılar ({alacakliCount})
            </button>
            <button
              onClick={() => setFilterType('vega')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === 'vega'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-150'
              }`}
            >
              Vega ({personnelList.filter(p => !p.is_manual).length})
            </button>
            <button
              onClick={() => setFilterType('manual')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === 'manual'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Manuel ({personnelList.filter(p => p.is_manual).length})
            </button>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-gray-700">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {renderSortHeader('Personel Kodu', 'code', 'left', 'pl-5 pr-2 w-28')}
                {renderSortHeader('Personel Adı Soyadı', 'name')}
                {renderSortHeader('Kart Tipi', 'type')}
                {renderSortHeader('Net Bakiye', 'balance', 'right')}
                {renderSortHeader('Son İşlem Tarihi', 'lastTransactionDate', 'right')}
                <th className="px-5 py-3 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 font-medium">
              {sortedList.length > 0 ? (
                sortedList.map((cari) => (
                  <tr key={cari.code} className="hover:bg-gray-50/50 transition-colors">
                    <td className="pl-5 pr-2 py-2.5 text-xs font-bold text-brand-600 w-28" title={cari.code}>
                      <div className="w-20 truncate">{cari.code}</div>
                    </td>
                    <td className="px-5 py-2.5 max-w-[400px]" title={cari.name}>
                      <div 
                        onClick={() => { setSelectedPersonnel(cari); setSearchParams({ code: cari.code }); }}
                        className="text-sm font-bold text-gray-900 hover:text-brand-600 hover:underline cursor-pointer transition-colors truncate"
                      >
                        {cari.name}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">{cari.city || 'AMASYA'}</div>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        cari.is_manual
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {cari.is_manual ? <Building size={10} /> : <User size={10} />}
                        {cari.is_manual ? 'Manuel' : 'Vega'}
                      </span>
                    </td>
                    <td className={`px-5 py-2.5 text-[15px] font-bold text-right whitespace-nowrap ${
                      (cari.balance || 0) > 0 ? 'text-blue-700' : (cari.balance || 0) < 0 ? 'text-rose-700' : 'text-gray-900'
                    }`}>
                      {Math.abs(cari.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                      <span className={`text-xs font-bold ml-1.5 px-1.5 py-0.5 rounded ${
                        (cari.balance || 0) > 0 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : (cari.balance || 0) < 0 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'text-gray-400'
                      }`}>
                        {(cari.balance || 0) > 0 ? '(B)' : (cari.balance || 0) < 0 ? '(A)' : '-'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-700 font-semibold text-right whitespace-nowrap">{formatDateTime(cari.lastTransactionDate) || '-'}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setSelectedPersonnel(cari); setSearchParams({ code: cari.code }); }}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Cari Hesap Ekstresi"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-450 font-semibold">
                    Aranan kriterlere uygun personel cari kartı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Manual Personnel Card */}
      {isAddPersonnelModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 relative space-y-4">
            <button 
              onClick={() => setIsAddPersonnelModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div>
              <h3 className="text-base font-bold text-gray-900">Personel Cari Kartı Ekle</h3>
              <p className="text-xs text-gray-500 mt-1">Sistemde Vega kartı olmayan personeller için manuel kart tanımla.</p>
            </div>

            <form onSubmit={handleAddPersonnel} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-gray-500">Personel Adı Soyadı</label>
                <input
                  type="text"
                  placeholder="Ahmet Yılmaz, Ayşe Kaya"
                  required
                  value={newPersonnelName}
                  onChange={(e) => setNewPersonnelName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-500">Personel Kodu (Benzersiz)</label>
                <input
                  type="text"
                  placeholder="P001, PERS-10"
                  required
                  value={newPersonnelCode}
                  onChange={(e) => setNewPersonnelCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-500">Şehir / Şube</label>
                <input
                  type="text"
                  placeholder="AMASYA, RİZE, SAMSUN vb. (Boş bırakılırsa AMASYA)"
                  value={newPersonnelCity}
                  onChange={(e) => setNewPersonnelCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPersonnelModalOpen(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-500 transition-colors"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
