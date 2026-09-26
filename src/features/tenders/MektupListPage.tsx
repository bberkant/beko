import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Clock,
  Landmark,
  ShieldCheck,
  Phone,
  X,
  FileSpreadsheet,
  Building,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { INITIAL_GUARANTEE_LETTERS, GuaranteeLetter } from './data/seedGuaranteeLetters';
import {
  LetterType,
  LetterStatus,
  SortField,
  formatMoney,
  formatDate,
  getDaysDiff,
  formatPhoneNumber,
  parseMoneyInput,
  normalizeTurkishSearch,
  calculateMetrics,
  sortLetters,
} from './utils/guaranteeLetterUtils';

interface LetterFormData {
  institution_name: string;
  letter_type: LetterType;
  amount: string;
  bank_name: string;
  phone_number: string;
  issue_date: string;
  end_date: string;
  company_name: string;
  status: LetterStatus;
  notes: string;
}

const emptyFormData: LetterFormData = {
  institution_name: '',
  letter_type: 'KESİN',
  amount: '',
  bank_name: 'Kuveyt Türk (Merzifon)',
  phone_number: '',
  issue_date: '',
  end_date: '',
  company_name: 'MARİF / ETİK ET',
  status: 'aktif',
  notes: '',
};

export function MektupListPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [letters, setLetters] = useState<GuaranteeLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | LetterType>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | LetterStatus>('all');
  const [filterExpiringOnly, setFilterExpiringOnly] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('end_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<GuaranteeLetter | null>(null);
  const [formData, setFormData] = useState<LetterFormData>(emptyFormData);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<GuaranteeLetter | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canWrite =
    ['Süper Admin', 'Admin', 'Developer', 'Süper Yönetici', 'Yönetici', 'Muhasebe', 'Finans'].includes(user?.role ?? '') ||
    ['super_admin', 'admin', 'developer', 'muhasebe', 'finans'].includes(user?.rawRole ?? '');

  const generateLetterUUID = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
  const localStorageKey = `dars_tender_guarantee_letters_${orgId}`;

  // Load letters from Supabase or Fallback
  const loadLetters = useCallback(async () => {
    setLoading(true);
    let loadedFromDb = false;

    try {
      const { data, error } = await supabase
        .from('tender_guarantee_letters')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (!error) {
        if (data && data.length > 0) {
          const mapped = data.map((d: any) => ({
            ...d,
            amount: Number(d.amount) || 0,
          })) as GuaranteeLetter[];
          setLetters(mapped);
          localStorage.setItem(localStorageKey, JSON.stringify(mapped));
          loadedFromDb = true;
        } else {
          // Table exists in Supabase DB but has 0 records -> auto-seed from initial dataset!
          const seeded = INITIAL_GUARANTEE_LETTERS.map((l) => ({
            ...l,
            id: orgId === '13b8da90-27d1-440d-a8f4-eb50dadd6391' ? l.id : generateLetterUUID(),
            organization_id: orgId,
          }));
          const { error: seedErr } = await supabase
            .from('tender_guarantee_letters')
            .insert(seeded);
          if (!seedErr) {
            setLetters(seeded);
            localStorage.setItem(localStorageKey, JSON.stringify(seeded));
            loadedFromDb = true;
          }
        }
      }
    } catch {
      // Supabase table or query failed; fallback to local
    }

    if (!loadedFromDb) {
      const cached = localStorage.getItem(localStorageKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as GuaranteeLetter[];
          if (parsed && parsed.length > 0) {
            const sanitized = parsed.map((item) => ({
              ...item,
              amount: Number(item.amount) || 0,
            }));
            setLetters(sanitized);
            setLoading(false);
            return;
          }
        } catch {
          // parse error
        }
      }
      // Initialize with seed data bound to active org
      const initialWithOrg = INITIAL_GUARANTEE_LETTERS.map((l) => ({
        ...l,
        organization_id: orgId,
      }));
      setLetters(initialWithOrg);
      localStorage.setItem(localStorageKey, JSON.stringify(initialWithOrg));
    }

    setLoading(false);
  }, [localStorageKey, orgId]);

  useEffect(() => {
    void loadLetters();
  }, [loadLetters]);

  // Sync / Refresh function
  const handleRefresh = async () => {
    setSyncing(true);
    await loadLetters();
    setSyncing(false);
    notify('Mektup listesi güncellendi', 'success');
  };

  // Distinct banks list for filter (Turkish alphabetical collation)
  const distinctBanks = useMemo(() => {
    const banks = new Set<string>();
    letters.forEach((l) => {
      if (l.bank_name) banks.add(l.bank_name.trim());
    });
    return Array.from(banks).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [letters]);

  // KPI Calculations using centralized metrics utility
  const metrics = useMemo(() => {
    return calculateMetrics(letters);
  }, [letters]);

  // Filtered & Sorted items
  const filteredLetters = useMemo(() => {
    const filtered = letters.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const q = normalizeTurkishSearch(searchQuery);
        const matchInst = normalizeTurkishSearch(item.institution_name).includes(q);
        const matchBank = normalizeTurkishSearch(item.bank_name).includes(q);
        const matchPhone = normalizeTurkishSearch(item.phone_number).includes(q);
        const matchNotes = normalizeTurkishSearch(item.notes).includes(q);
        const matchCompany = normalizeTurkishSearch(item.company_name).includes(q);
        const matchType = normalizeTurkishSearch(item.letter_type).includes(q);
        const cleanDigits = q.replace(/[^0-9]/g, '');
        const matchAmount = cleanDigits ? String(item.amount).includes(cleanDigits) : false;
        if (!matchInst && !matchBank && !matchPhone && !matchNotes && !matchCompany && !matchType && !matchAmount) {
          return false;
        }
      }

      // Bank filter
      if (selectedBank !== 'all' && item.bank_name !== selectedBank) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && item.letter_type !== selectedType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }

      // Expiring filter (< 30 days or overdue)
      if (filterExpiringOnly) {
        if (item.status !== 'aktif') return false;
        const diff = getDaysDiff(item.end_date);
        if (diff === null || diff > 30) return false;
      }

      return true;
    });

    return sortLetters(filtered, sortField, sortOrder);
  }, [letters, searchQuery, selectedBank, selectedType, selectedStatus, filterExpiringOnly, sortField, sortOrder]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Open modal for new letter
  const handleOpenAddModal = () => {
    setEditingLetter(null);
    setFormData(emptyFormData);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (letter: GuaranteeLetter) => {
    setEditingLetter(letter);
    setFormData({
      institution_name: letter.institution_name,
      letter_type: letter.letter_type,
      amount: String(letter.amount),
      bank_name: letter.bank_name,
      phone_number: letter.phone_number || '',
      issue_date: letter.issue_date ? letter.issue_date.slice(0, 10) : '',
      end_date: letter.end_date ? letter.end_date.slice(0, 10) : '',
      company_name: letter.company_name || 'MARİF / ETİK ET',
      status: letter.status,
      notes: letter.notes || '',
    });
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      notify('Kayıt ekleme veya düzenleme yetkiniz bulunmamaktadır', 'error');
      return;
    }
    if (!formData.institution_name.trim()) {
      notify('Lütfen kurum adını giriniz', 'error');
      return;
    }
    if (!formData.bank_name.trim()) {
      notify('Lütfen banka adını giriniz', 'error');
      return;
    }
    const numAmount = parseMoneyInput(formData.amount);
    if (numAmount <= 0) {
      notify('Lütfen geçerli bir teminat tutarı giriniz (0\'dan büyük olmalıdır)', 'error');
      return;
    }
    if (formData.issue_date && formData.end_date && formData.end_date < formData.issue_date) {
      // Legacy records from Excel might have inverted dates; permit saving if dates weren't modified during this edit
      const datesWereUnchanged =
        editingLetter &&
        formData.issue_date === (editingLetter.issue_date ? editingLetter.issue_date.slice(0, 10) : '') &&
        formData.end_date === (editingLetter.end_date ? editingLetter.end_date.slice(0, 10) : '');

      if (!datesWereUnchanged) {
        notify('Vade (bitiş) tarihi, düzenleme tarihinden önce olamaz', 'error');
        return;
      }
    }

    setIsSaving(true);

    try {
      if (editingLetter) {
        // UPDATE
        const updatedLetter: GuaranteeLetter = {
          ...editingLetter,
          institution_name: formData.institution_name.trim(),
          letter_type: formData.letter_type,
          amount: numAmount,
          bank_name: formData.bank_name.trim(),
          phone_number: formData.phone_number.trim() || null,
          issue_date: formData.issue_date || null,
          end_date: formData.end_date || null,
          company_name: formData.company_name.trim() || null,
          status: formData.status,
          notes: formData.notes.trim() || null,
          updated_at: new Date().toISOString(),
        };

        const updatedList = letters.map((l) => (l.id === editingLetter.id ? updatedLetter : l));
        setLetters(updatedList);
        localStorage.setItem(localStorageKey, JSON.stringify(updatedList));

        // Try Supabase update (scoped to orgId)
        const { error } = await supabase
          .from('tender_guarantee_letters')
          .update({
            institution_name: updatedLetter.institution_name,
            letter_type: updatedLetter.letter_type,
            amount: updatedLetter.amount,
            bank_name: updatedLetter.bank_name,
            phone_number: updatedLetter.phone_number,
            issue_date: updatedLetter.issue_date,
            end_date: updatedLetter.end_date,
            company_name: updatedLetter.company_name,
            status: updatedLetter.status,
            notes: updatedLetter.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLetter.id)
          .eq('organization_id', orgId);

        if (error) {
          notify('Teminat mektubu yerel olarak güncellendi (DB bağlantısı bekleniyor)', 'info');
        } else {
          notify('Teminat mektubu başarıyla güncellendi', 'success');
        }
      } else {
        // CREATE
        const newId = generateLetterUUID();
        const newLetter: GuaranteeLetter = {
          id: newId,
          organization_id: orgId,
          institution_name: formData.institution_name.trim(),
          letter_type: formData.letter_type,
          amount: numAmount,
          bank_name: formData.bank_name.trim(),
          phone_number: formData.phone_number.trim() || null,
          issue_date: formData.issue_date || null,
          end_date: formData.end_date || null,
          company_name: formData.company_name.trim() || null,
          status: formData.status,
          notes: formData.notes.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedList = [newLetter, ...letters];
        setLetters(updatedList);
        localStorage.setItem(localStorageKey, JSON.stringify(updatedList));

        // Try Supabase insert
        const { error } = await supabase.from('tender_guarantee_letters').insert([newLetter]);
        if (error) {
          notify('Teminat mektubu yerel olarak eklendi (DB bağlantısı bekleniyor)', 'info');
        } else {
          notify('Yeni teminat mektubu başarıyla eklendi', 'success');
        }
      }

      setIsModalOpen(false);
    } catch {
      notify('İşlem yerel olarak kaydedildi', 'info');
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!canWrite) {
      notify('Kayıt silme yetkiniz bulunmamaktadır', 'error');
      return;
    }
    if (!letterToDelete) return;
    setIsSaving(true);
    try {
      const updatedList = letters.filter((l) => l.id !== letterToDelete.id);
      setLetters(updatedList);
      localStorage.setItem(localStorageKey, JSON.stringify(updatedList));

      const { error } = await supabase
        .from('tender_guarantee_letters')
        .delete()
        .eq('id', letterToDelete.id)
        .eq('organization_id', orgId);
      if (error) {
        notify('Teminat mektubu yerel listeden kaldırıldı', 'info');
      } else {
        notify('Teminat mektubu silindi', 'success');
      }
      setIsDeleteModalOpen(false);
      setLetterToDelete(null);
    } catch {
      notify('Kayıt yerel listeden kaldırıldı', 'info');
      setIsDeleteModalOpen(false);
      setLetterToDelete(null);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Status Toggle (Aktif / İade Edildi / Hükümsüz)
  const handleQuickStatusChange = async (letter: GuaranteeLetter, newStatus: LetterStatus) => {
    if (!canWrite) {
      notify('Durum değişikliği yapma yetkiniz bulunmamaktadır', 'error');
      return;
    }

    const updatedLetter: GuaranteeLetter = {
      ...letter,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const updatedList = letters.map((l) => (l.id === letter.id ? updatedLetter : l));
    setLetters(updatedList);
    localStorage.setItem(localStorageKey, JSON.stringify(updatedList));

    const statusLabel = newStatus === 'aktif' ? 'Aktif' : newStatus === 'iade_edildi' ? 'İade Edildi' : 'Hükümsüz';
    try {
      const { error } = await supabase
        .from('tender_guarantee_letters')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', letter.id)
        .eq('organization_id', orgId);
      if (error) {
        notify(`Durum "${statusLabel}" olarak yerel güncellendi`, 'info');
      } else {
        notify(`Durum "${statusLabel}" olarak güncellendi`, 'success');
      }
    } catch {
      // Local is already updated
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    try {
      if (filteredLetters.length === 0) {
        notify('Dışa aktarılacak teminat mektubu bulunamadı', 'info');
        return;
      }

      const exportRows = filteredLetters.map((item, index) => {
        const diff = getDaysDiff(item.end_date);
        let kalanGunText = 'Süresiz';
        if (diff !== null) {
          if (diff < 0) kalanGunText = `Vadesi Geçti (${Math.abs(diff)} gün önce)`;
          else if (diff === 0) kalanGunText = 'Bugün Son Gün';
          else kalanGunText = `${diff} gün`;
        }

        return {
          'Sıra No': index + 1,
          'Düzenleme Tarihi': formatDate(item.issue_date),
          'Kurum Adı': item.institution_name,
          'Mektup Türü': item.letter_type,
          'Tutar (₺)': item.amount,
          'Banka': item.bank_name,
          'İletişim / Tel No': formatPhoneNumber(item.phone_number),
          'Vade (Bitiş) Tarihi': item.end_date ? formatDate(item.end_date) : 'Süresiz',
          'Kalan Gün': kalanGunText,
          'Durum': item.status === 'aktif' ? 'Aktif' : item.status === 'iade_edildi' ? 'İade Edildi' : 'Hükümsüz',
          'Firma': item.company_name || 'MARİF / ETİK ET',
          'Açıklama / Not': item.notes || '',
        };
      });

      // Add summary row at the bottom
      const totalFilteredAmount = filteredLetters.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
      exportRows.push({
        'Sıra No': 'TOPLAM',
        'Düzenleme Tarihi': '',
        'Kurum Adı': `${filteredLetters.length} Adet Teminat Mektubu`,
        'Mektup Türü': '',
        'Tutar (₺)': totalFilteredAmount,
        'Banka': '',
        'İletişim / Tel No': '',
        'Vade (Bitiş) Tarihi': '',
        'Kalan Gün': '',
        'Durum': '',
        'Firma': '',
        'Açıklama / Not': '',
      } as any);

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      // Auto-fit column widths
      const colWidths = [
        { wch: 10 }, // Sıra No
        { wch: 16 }, // Düzenleme Tarihi
        { wch: 42 }, // Kurum Adı
        { wch: 14 }, // Mektup Türü
        { wch: 20 }, // Tutar
        { wch: 26 }, // Banka
        { wch: 20 }, // Tel No
        { wch: 18 }, // Vade Tarihi
        { wch: 24 }, // Kalan Gün
        { wch: 14 }, // Durum
        { wch: 22 }, // Firma
        { wch: 26 }, // Not
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Teminat Mektupları');

      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const da = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yr}-${mo}-${da}`;

      XLSX.writeFile(workbook, `Teminat_Mektuplari_Listesi_${todayStr}.xlsx`);
      notify('Excel dosyası başarıyla indirildi', 'success');
    } catch (err: any) {
      notify('Excel oluşturulurken hata meydana geldi: ' + (err?.message || ''), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto whitespace-nowrap">
        <Link
          to="/ihaleler"
          className="px-3.5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        >
          4734 Sayılı İhaleler
        </Link>
        <Link
          to="/ihaleler/dogrudan-teminler"
          className="px-3.5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        >
          Doğrudan Teminler (22/d)
        </Link>
        <Link
          to="/ihaleler/mektup-listesi"
          className="px-3.5 py-2 text-sm font-semibold text-brand-600 bg-brand-50 border border-brand-200/60 rounded-lg shadow-2xs shrink-0"
        >
          Mektup Listesi (Banka Teminat)
        </Link>
      </div>

      {/* Header */}
      <PageHeader
        title="Banka Teminat Mektubu Takibi"
        description="Marif ve Etik Et 2026 yılı alınan ihaleler ve tedarikçi teminat mektupları portföyü."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
              title="Yenile ve Veritabanı ile Senkronize Et"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin text-brand-600' : ''} />
              <span>Yenile</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Excel İndir (.xlsx)</span>
            </button>
            {canWrite && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Plus size={16} />
                <span>Yeni Mektup Ekle</span>
              </button>
            )}
          </div>
        }
      />

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Toplam Teminat */}
        <div
          onClick={() => {
            setSelectedType('all');
            setFilterExpiringOnly(false);
          }}
          className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all group"
          title="Tüm mektupları göster (Tür ve vade filtrelerini sıfırla)"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Toplam Teminat Tutarı
            </span>
            <div className="text-2xl font-bold text-gray-900">
              {formatMoney(metrics.totalAmount)}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">{metrics.activeCount}</span> aktif mektup (toplam {metrics.totalCount})
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Landmark size={24} />
          </div>
        </div>

        {/* Card 2: Kesin Teminatlar */}
        <div
          onClick={() => {
            setSelectedType(selectedType === 'KESİN' ? 'all' : 'KESİN');
          }}
          className={`rounded-2xl border p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all group ${
            selectedType === 'KESİN'
              ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400'
              : 'bg-white border-gray-200/80 hover:border-indigo-300'
          }`}
          title="Kesin teminat mektuplarını filtrele (Tıkla filtrele / kaldır)"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kesin Teminat Mektupları
            </span>
            <div className="text-2xl font-bold text-indigo-950">
              {formatMoney(metrics.kesinAmount)}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-indigo-600">{metrics.kesinCount}</span> adet kesin teminat
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* Card 3: Geçici Teminatlar */}
        <div
          onClick={() => {
            setSelectedType(selectedType === 'GEÇİCİ' ? 'all' : 'GEÇİCİ');
          }}
          className={`rounded-2xl border p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all group ${
            selectedType === 'GEÇİCİ'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-gray-200/80 hover:border-amber-300'
          }`}
          title="Geçici teminat mektuplarını filtrele (Tıkla filtrele / kaldır)"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Geçici Teminat Mektupları
            </span>
            <div className="text-2xl font-bold text-amber-950">
              {formatMoney(metrics.geciciAmount)}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-amber-600">{metrics.geciciCount}</span> adet ihale teklif teminatı
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Clock size={24} />
          </div>
        </div>

        {/* Card 4: Vadesi Yaklaşanlar (< 30 Gün) */}
        <div
          onClick={() => setFilterExpiringOnly(!filterExpiringOnly)}
          className={`rounded-2xl border p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all group ${
            filterExpiringOnly
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400'
              : metrics.expiringCount > 0
              ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50'
              : 'bg-white border-gray-200/80'
          }`}
          title="Vadesi 30 gün altında kalan veya geçmiş olanları filtrele"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Vadesi Yaklaşanlar
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-200 text-rose-800">
                &lt; 30 Gün
              </span>
            </div>
            <div className="text-2xl font-bold text-rose-950">
              {metrics.expiringCount} Adet
            </div>
            <div className="text-xs text-rose-600 font-medium">
              {formatMoney(metrics.expiringAmount)}
              {metrics.overdueCount > 0 && (
                <span className="block text-[10px] text-rose-500 font-normal">
                  ({metrics.overdueCount} vadesi geçmiş, {metrics.upcomingCount} yaklaşan)
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Kurum adı, banka, telefon veya not ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Bank filter */}
          <div className="md:col-span-3">
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all text-gray-700"
            >
              <option value="all">Tüm Bankalar ({distinctBanks.length})</option>
              {distinctBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Letter Type filter */}
          <div className="md:col-span-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all text-gray-700"
            >
              <option value="all">Tüm Türler</option>
              <option value="KESİN">Kesin Teminat</option>
              <option value="GEÇİCİ">Geçici Teminat</option>
              <option value="AVANS">Avans Teminatı</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all text-gray-700"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="aktif">Aktif</option>
              <option value="iade_edildi">İade Edildi</option>
              <option value="hukumsuz">Hükümsüz</option>
            </select>
          </div>

          {/* Quick toggle button */}
          <div className="md:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={() => setFilterExpiringOnly(!filterExpiringOnly)}
              className={`p-2 rounded-xl border text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                filterExpiringOnly
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
              title="Vadesi 30 Gün Altında Kalanları Filtrele"
            >
              <AlertTriangle size={16} />
            </button>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchQuery || selectedBank !== 'all' || selectedType !== 'all' || selectedStatus !== 'all' || filterExpiringOnly) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-400 font-medium">Aktif Filtreler:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Arama: "{searchQuery}"
                <X size={12} className="cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
            {selectedBank !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Banka: {selectedBank}
                <X size={12} className="cursor-pointer" onClick={() => setSelectedBank('all')} />
              </span>
            )}
            {selectedType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Tür: {selectedType}
                <X size={12} className="cursor-pointer" onClick={() => setSelectedType('all')} />
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Durum: {selectedStatus}
                <X size={12} className="cursor-pointer" onClick={() => setSelectedStatus('all')} />
              </span>
            )}
            {filterExpiringOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                ⚠️ Vadesi Yaklaşanlar (&lt; 30 gün)
                <X size={12} className="cursor-pointer" onClick={() => setFilterExpiringOnly(false)} />
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBank('all');
                setSelectedType('all');
                setSelectedStatus('all');
                setFilterExpiringOnly(false);
              }}
              className="text-xs text-gray-500 hover:text-gray-800 underline ml-auto"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Main Letters Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th
                  onClick={() => handleSort('issue_date')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                  title="Düzenleme tarihine göre sırala"
                >
                  <div className="flex items-center gap-1">
                    <span>Düzenleme Tarihi</span>
                    <span className="text-[10px] text-gray-400">
                      {sortField === 'issue_date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('institution_name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors min-w-[220px]"
                  title="Kurum adına göre sırala"
                >
                  <div className="flex items-center gap-1">
                    <span>Kurum Adı</span>
                    <span className="text-[10px] text-gray-400">
                      {sortField === 'institution_name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('letter_type')}
                  className="py-3.5 px-3 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                  title="Mektup türüne göre sırala"
                >
                  <div className="flex items-center gap-1">
                    <span>Mektup Türü</span>
                    <span className="text-[10px] text-gray-400">
                      {sortField === 'letter_type' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-gray-100 select-none transition-colors"
                  title="Tutara göre sırala"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Tutar (₺)</span>
                    <span className="text-[10px] text-gray-400">
                      {sortField === 'amount' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('bank_name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                  title="Bankaya göre sırala"
                >
                  <div className="flex items-center gap-1">
                    <span>Banka</span>
                    <span className="text-[10px] text-gray-400">
                      {sortField === 'bank_name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-4">İletişim / Tel No</th>
                <th
                  onClick={() => handleSort('end_date')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                  title="Vade tarihine göre sırala"
                >
                  <div className="flex items-center gap-1">
                    <span>Vade (Bitiş) Tarihi</span>
                    <span className="text-[10px] text-gray-400">
                      {sortField === 'end_date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('end_date')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                  title="Kalan güne / vadeye göre sırala"
                >
                  <div className="flex items-center gap-1">
                    <span>Kalan Gün</span>
                    <span className="text-[10px] text-gray-400">
                      {sortField === 'end_date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3.5 px-3 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                  title="Duruma göre sırala"
                >
                  <div className="flex items-center gap-1">
                    <span>Durum</span>
                    <span className="text-[10px] text-gray-400">
                      {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                    Teminat mektupları yükleniyor...
                  </td>
                </tr>
              ) : filteredLetters.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    Arama kriterlerine uygun teminat mektubu bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredLetters.map((letter, idx) => {
                  const daysDiff = getDaysDiff(letter.end_date);

                  return (
                    <tr key={letter.id} className="hover:bg-gray-50/70 transition-colors group">
                      {/* Index */}
                      <td className="py-3 px-4 text-center text-gray-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Düzenleme Tarihi */}
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap font-medium">
                        {formatDate(letter.issue_date)}
                      </td>

                      {/* Kurum Adı */}
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        <div className="flex flex-col">
                          <span>{letter.institution_name}</span>
                          {letter.notes && (
                            <span className="text-[10px] text-gray-400 font-normal italic">
                              {letter.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mektup Türü Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {letter.letter_type === 'KESİN' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            KESİN
                          </span>
                        ) : letter.letter_type === 'GEÇİCİ' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            GEÇİCİ
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            AVANS
                          </span>
                        )}
                      </td>

                      {/* Tutar */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        {formatMoney(letter.amount)}
                      </td>

                      {/* Banka */}
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building className="text-gray-400 shrink-0" size={13} />
                          <span>{letter.bank_name}</span>
                        </div>
                      </td>

                      {/* Tel No */}
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap font-mono text-[11px]">
                        {letter.phone_number ? (
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Phone className="text-gray-400 shrink-0" size={12} />
                            <span>{formatPhoneNumber(letter.phone_number)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Vade Tarihi */}
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap font-medium">
                        {formatDate(letter.end_date)}
                      </td>

                      {/* Kalan Gün Rozeti */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {daysDiff === null ? (
                          <span className="text-gray-400 text-[11px]">Süresiz</span>
                        ) : daysDiff < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle size={11} />
                            Vadesi Geçti ({Math.abs(daysDiff)} g)
                          </span>
                        ) : daysDiff === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">
                            <AlertTriangle size={11} />
                            Bugün Son Gün
                          </span>
                        ) : daysDiff <= 30 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Clock size={11} />
                            {daysDiff} gün kaldı
                          </span>
                        ) : daysDiff <= 60 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={11} />
                            {daysDiff} gün kaldı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                            {daysDiff} gün
                          </span>
                        )}
                      </td>

                      {/* Durum Rozeti */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {letter.status === 'aktif' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Aktif
                          </span>
                        ) : letter.status === 'iade_edildi' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            İade Edildi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Hükümsüz
                          </span>
                        )}
                      </td>

                      {/* İşlemler */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canWrite ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inline Quick Status Selector */}
                            <select
                              value={letter.status}
                              onChange={(e) => void handleQuickStatusChange(letter, e.target.value as LetterStatus)}
                              className="text-[11px] py-1 px-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-brand-500 cursor-pointer font-medium"
                              title="Mektup durumunu hızlıca güncelle"
                            >
                              <option value="aktif">Aktif</option>
                              <option value="iade_edildi">İade Edildi</option>
                              <option value="hukumsuz">Hükümsüz</option>
                            </select>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(letter)}
                              title="Mektubu Düzenle"
                              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil size={14} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setLetterToDelete(letter);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Sil"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">Salt Okunur</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div className="p-4 bg-gray-50/70 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 gap-2">
          <div>
            Toplam <strong>{filteredLetters.length}</strong> kayıt listeleniyor (Tüm portföy: {letters.length})
          </div>
          <div className="font-semibold text-gray-900">
            Filtrelenen Toplam Tutar:{' '}
            <span className="text-brand-700 font-bold font-mono">
              {formatMoney(filteredLetters.reduce((sum, l) => sum + (Number(l.amount) || 0), 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Add / Edit Letter */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLetter ? 'Teminat Mektubunu Düzenle' : 'Yeni Teminat Mektubu Ekle'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kurum Adı */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                İhale / Kurum Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Örn: AMASYA ÜNİVERSİTESİ REKTÖRLÜĞÜ"
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Mektup Türü */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mektup Türü <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.letter_type}
                onChange={(e) => setFormData({ ...formData, letter_type: e.target.value as LetterType })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500"
              >
                <option value="KESİN">KESİN TEMİNAT MEKTUBU</option>
                <option value="GEÇİCİ">GEÇİCİ TEMİNAT MEKTUBU</option>
                <option value="AVANS">AVANS TEMİNAT MEKTUBU</option>
              </select>
            </div>

            {/* Tutar */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tutar (₺) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="Örn: 500.000 veya 500000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500 font-mono"
              />
              {formData.amount && parseMoneyInput(formData.amount) > 0 && (
                <div className="text-[11px] text-brand-600 mt-1 font-mono font-medium flex items-center gap-1">
                  <span className="text-gray-500">Önizleme:</span>
                  <span className="font-bold">{formatMoney(parseMoneyInput(formData.amount))}</span>
                </div>
              )}
            </div>

            {/* Banka Adı */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Düzenleyen Banka <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Örn: Kuveyt Türk (Merzifon)"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* İletişim / Tel No */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Kurum İletişim / Tel No
              </label>
              <input
                type="text"
                placeholder="Örn: 0 358 218 18 45"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            {/* Düzenleme Tarihi */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Düzenleme Tarihi
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Vade (Bitiş) Tarihi */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Vade (Bitiş) Tarihi
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            {formData.issue_date && formData.end_date && formData.end_date < formData.issue_date && (
              <div className="md:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                <span>
                  Dikkat: Vade tarihi, düzenleme tarihinden öncedir. Yeni kayıtlarda veya tarih değişikliklerinde vade tarihi düzenleme tarihinden önce olamaz.
                </span>
              </div>
            )}

            {/* Firma Adı */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Adına Alınan Şirket
              </label>
              <input
                type="text"
                placeholder="Örn: MARİF / ETİK ET"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Durum */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mektup Durumu
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as LetterStatus })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500"
              >
                <option value="aktif">Aktif</option>
                <option value="iade_edildi">İade Edildi</option>
                <option value="hukumsuz">Hükümsüz</option>
              </select>
            </div>

            {/* Açıklama / Notlar */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Özel Notlar / Sıra Bilgisi
              </label>
              <textarea
                rows={2}
                placeholder="Örn: (1. SIRA), İhale yenileme, komisyon kararı vb."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Kaydediliyor...' : editingLetter ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Teminat Mektubunu Sil"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{letterToDelete?.institution_name}</strong> kurumuna ait{' '}
            <strong>{formatMoney(letterToDelete?.amount || 0)}</strong> tutarındaki teminat mektubu kaydını
            silmek istediğinize emin misiniz?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Siliniyor...' : 'Evet, Sil'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MektupListPage;
