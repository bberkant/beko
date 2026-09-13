import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  FileText, 
  FileSpreadsheet, 
  Trash2, 
  Pencil, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Car, 
  Receipt, 
  Calendar, 
  RefreshCw, 
  X, 
  ChevronRight, 
  CreditCard, 
  Sparkles, 
  Download 
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { supabase, normalizeFileName } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useVehicles } from './store';
import * as XLSX from 'xlsx';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export interface SanayiGideri {
  id: string;
  organization_id: string;
  date: string;
  plate: string;
  supplier: string; // Sanayi Carisi / Usta / Servis
  invoice_no: string | null;
  description: string | null;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: 'odendi' | 'bekliyor' | 'kismi';
  payment_date: string | null;
  document_url: string | null;
  document_name: string | null;
  notes: string | null;
  created_at: string;
}

interface FormState {
  date: string;
  plate: string;
  supplier: string;
  invoice_no: string;
  description: string;
  amount: string;
  paid_amount: string;
  payment_status: 'odendi' | 'bekliyor' | 'kismi';
  payment_date: string;
  notes: string;
  file?: File | null;
}

const emptyForm = (): FormState => ({
  date: new Date().toISOString().split('T')[0],
  plate: '',
  supplier: '',
  invoice_no: '',
  description: '',
  amount: '',
  paid_amount: '0',
  payment_status: 'bekliyor',
  payment_date: '',
  notes: '',
  file: null
});

const formatMoney = (n: number) =>
  `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ₺`;

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
};

export function SanayiGiderleriPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { vehicles } = useVehicles();
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'faturalar' | 'cariler' | 'araclar'>('faturalar');
  const [items, setItems] = useState<SanayiGideri[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedPlate, setSelectedPlate] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Modal & Edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SanayiGideri | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [selectedCariDetail, setSelectedCariDetail] = useState<string | null>(null);

  // PDF Preview Modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isAiParsing, setIsAiParsing] = useState(false);

  const canWrite = ['Süper Admin', 'Admin', 'Developer', 'Süper Yönetici', 'Yönetici', 'Muhasebe', 'Finans'].includes(user?.role ?? '');

  // Fetch all sanayi giderleri
  const fetchRecords = useCallback(async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sanayi_giderleri')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('date', { ascending: false });

      if (error) throw error;
      setItems((data || []).map(r => ({
        ...r,
        amount: Number(r.amount) || 0,
        paid_amount: Number(r.paid_amount) || 0,
        remaining_amount: Number(r.remaining_amount) || 0
      })));
    } catch (err: any) {
      notify('Sanayi giderleri yüklenirken hata oluştu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, notify]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  // AI / PDF Invoice Parser
  const parsePdfInvoice = async (file: File) => {
    setIsAiParsing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += ' ' + pageStr;
      }

      console.log('Extracted PDF Text:', fullText.slice(0, 500));

      // 1. Detect Fatura No (e.g. GIB2026..., EAR2026..., 16 chars)
      let detectedInvoiceNo = '';
      const invoiceNoMatch = fullText.match(/\b([A-Z]{3}202[3-9]\d{9})\b/i) || 
                             fullText.match(/Fatura\s*No\s*[:.]?\s*([A-Z0-9]{10,16})/i) ||
                             fullText.match(/\b([A-Z0-9]{16})\b/);
      if (invoiceNoMatch) {
        detectedInvoiceNo = invoiceNoMatch[1];
      }

      // 2. Detect Date (DD.MM.YYYY or YYYY-MM-DD)
      let detectedDate = new Date().toISOString().split('T')[0];
      const dateMatch = fullText.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
      if (dateMatch) {
        const [, d, m, y] = dateMatch;
        detectedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      // 3. Detect Plate
      let detectedPlate = '';
      for (const v of vehicles) {
        const cleanP = v.plate.toUpperCase().replace(/\s+/g, '');
        if (cleanP && fullText.toUpperCase().replace(/\s+/g, '').includes(cleanP)) {
          detectedPlate = v.plate;
          break;
        }
      }
      if (!detectedPlate) {
        const plateMatch = fullText.match(/\b(0[1-9]|[1-7][0-9]|8[01])\s*([A-Z]{1,3})\s*(\d{2,4})\b/i);
        if (plateMatch) {
          detectedPlate = `${plateMatch[1]} ${plateMatch[2].toUpperCase()} ${plateMatch[3]}`;
        }
      }

      // 4. Detect Supplier (Sanayi Carisi / Usta / Firma)
      let detectedSupplier = '';
      const supplierKeywords = ['OTO', 'SANAYİ', 'SERVİS', 'POMPA', 'MAKAS', 'TİCARET', 'LTD', 'A.Ş', 'TORNA', 'KAPORTA', 'BOYA', 'LASTİK', 'EGZOZ', 'RADYATÖR', 'DÖŞEME', 'YEDEK PARÇA', 'KASAP', 'MOTOR'];
      
      const lines = fullText.split(/[\n\r]+/);
      for (const line of lines) {
        const upper = line.toUpperCase();
        if (supplierKeywords.some(k => upper.includes(k)) && !upper.includes('AMASYA ET') && !upper.includes('DARS GIDA') && upper.length < 60) {
          detectedSupplier = line.trim();
          break;
        }
      }

      // 5. Detect Amount (Ödenecek Tutar / Toplam)
      let detectedAmount = 0;
      const amountMatches = fullText.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g);
      if (amountMatches) {
        const parsedAmounts = amountMatches
          .map(m => parseFloat(m.replace(/\./g, '').replace(',', '.')))
          .filter(n => !isNaN(n) && n > 0);
        if (parsedAmounts.length > 0) {
          detectedAmount = Math.max(...parsedAmounts);
        }
      }

      // Open Form with Pre-filled values
      setEditingItem(null);
      setForm({
        date: detectedDate,
        plate: detectedPlate,
        supplier: detectedSupplier || 'Sanayi Servisi',
        invoice_no: detectedInvoiceNo,
        description: 'Sanayi Bakım / Onarım Faturası',
        amount: detectedAmount > 0 ? String(detectedAmount) : '',
        paid_amount: '0',
        payment_status: 'bekliyor',
        payment_date: '',
        notes: `PDF Faturadan otomatik ayrıştırıldı: ${file.name}`,
        file: file
      });
      setIsModalOpen(true);
      notify('Fatura PDF başarıyla analiz edildi ve alanlar otomatik dolduruldu!', 'success');
    } catch (err: any) {
      notify('PDF ayrıştırma hatası: ' + err.message, 'error');
    } finally {
      setIsAiParsing(false);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void parsePdfInvoice(file);
    }
    e.target.value = '';
  };

  // Filter Logic
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search
      if (search) {
        const q = search.toLocaleLowerCase('tr-TR');
        const matchSupplier = (item.supplier || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchPlate = (item.plate || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchInv = (item.invoice_no || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchDesc = (item.description || '').toLocaleLowerCase('tr-TR').includes(q);
        if (!matchSupplier && !matchPlate && !matchInv && !matchDesc) return false;
      }

      // Plate filter
      if (selectedPlate !== 'all' && item.plate !== selectedPlate) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && item.payment_status !== statusFilter) {
        return false;
      }

      // Year & Month filter
      if (item.date) {
        const [y, m] = item.date.split('-');
        if (selectedYear !== 'all' && y !== selectedYear) return false;
        if (selectedMonth !== 'all' && m !== selectedMonth.padStart(2, '0')) return false;
      }

      return true;
    });
  }, [items, search, selectedPlate, statusFilter, selectedYear, selectedMonth]);

  // Aggregated Cariler (Usta / Servis bazlı özet)
  const aggregatedCaris = useMemo(() => {
    const map = new Map<string, {
      supplier: string;
      totalCount: number;
      totalAmount: number;
      totalPaid: number;
      totalRemaining: number;
      plates: Set<string>;
      lastDate: string;
      items: SanayiGideri[];
    }>();

    items.forEach(item => {
      const key = (item.supplier || 'Diğer').trim();
      if (!map.has(key)) {
        map.set(key, {
          supplier: key,
          totalCount: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalRemaining: 0,
          plates: new Set(),
          lastDate: item.date,
          items: []
        });
      }
      const g = map.get(key)!;
      g.totalCount += 1;
      g.totalAmount += item.amount;
      g.totalPaid += item.paid_amount;
      g.totalRemaining += item.remaining_amount;
      if (item.plate) g.plates.add(item.plate);
      if (item.date > g.lastDate) g.lastDate = item.date;
      g.items.push(item);
    });

    return Array.from(map.values()).sort((a, b) => b.totalRemaining - a.totalRemaining || b.totalAmount - a.totalAmount);
  }, [items]);

  // Aggregated Vehicles (Araç bazlı özet)
  const aggregatedVehicles = useMemo(() => {
    const map = new Map<string, {
      plate: string;
      totalCount: number;
      totalAmount: number;
      totalPaid: number;
      totalRemaining: number;
      suppliers: Set<string>;
      lastDate: string;
    }>();

    items.forEach(item => {
      const key = (item.plate || 'Belirtilmemiş').trim();
      if (!map.has(key)) {
        map.set(key, {
          plate: key,
          totalCount: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalRemaining: 0,
          suppliers: new Set(),
          lastDate: item.date
        });
      }
      const g = map.get(key)!;
      g.totalCount += 1;
      g.totalAmount += item.amount;
      g.totalPaid += item.paid_amount;
      g.totalRemaining += item.remaining_amount;
      if (item.supplier) g.suppliers.add(item.supplier);
      if (item.date > g.lastDate) g.lastDate = item.date;
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [items]);

  // Stats calculations
  const stats = useMemo(() => {
    const totalAmount = filteredItems.reduce((s, x) => s + x.amount, 0);
    const totalPaid = filteredItems.reduce((s, x) => s + x.paid_amount, 0);
    const totalRemaining = filteredItems.reduce((s, x) => s + x.remaining_amount, 0);
    
    // Bu ayki harcama
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const thisMonthAmount = items
      .filter(x => x.date?.startsWith(currentYearMonth))
      .reduce((s, x) => s + x.amount, 0);

    return {
      totalAmount,
      totalPaid,
      totalRemaining,
      thisMonthAmount,
      totalCount: filteredItems.length,
      activeCarisCount: aggregatedCaris.length
    };
  }, [filteredItems, items, aggregatedCaris]);

  // Save / Insert / Update Record
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;
    if (!form.plate.trim() || !form.supplier.trim() || !form.amount) {
      notify('Lütfen Plaka, Sanayi Carisi ve Tutar alanlarını doldurun.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const amountNum = parseFloat(form.amount) || 0;
      const paidNum = parseFloat(form.paid_amount) || 0;
      const remainingNum = Math.max(0, amountNum - paidNum);
      const paymentStatus = remainingNum === 0 ? 'odendi' : paidNum > 0 ? 'kismi' : form.payment_status;

      let document_url = editingItem?.document_url || null;
      let document_name = editingItem?.document_name || null;

      // Upload file if selected
      if (form.file) {
        const normName = normalizeFileName(form.file.name);
        const path = `${user.organizationId}/sanayi/${crypto.randomUUID()}-${normName}`;
        const { error: uploadErr } = await supabase.storage
          .from('operations-documents')
          .upload(path, form.file, { contentType: form.file.type });

        if (!uploadErr) {
          document_url = path;
          document_name = form.file.name;
        } else {
          console.warn('Storage upload error:', uploadErr);
        }
      }

      const payload = {
        organization_id: user.organizationId,
        date: form.date,
        plate: form.plate.trim().toUpperCase(),
        supplier: form.supplier.trim(),
        invoice_no: form.invoice_no.trim() || null,
        description: form.description.trim() || null,
        amount: amountNum,
        paid_amount: paidNum,
        remaining_amount: remainingNum,
        payment_status: paymentStatus,
        payment_date: form.payment_date || null,
        document_url,
        document_name,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        const { error } = await supabase
          .from('sanayi_giderleri')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        notify('Sanayi gideri güncellendi.', 'success');
      } else {
        const { error } = await supabase
          .from('sanayi_giderleri')
          .insert([payload]);
        if (error) throw error;
        notify('Yeni sanayi gideri başarıyla eklendi.', 'success');
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setForm(emptyForm());
      await fetchRecords();
    } catch (err: any) {
      notify('Kayıt kaydedilirken hata oluştu: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Record
  const handleDelete = async (id: string, title?: string) => {
    if (!confirm(`"${title || 'Bu masraf kaydı'}" silinsin mi?`)) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('sanayi_giderleri')
        .delete()
        .eq('id', id);
      if (error) throw error;
      notify('Kayıt silindi.', 'success');
      await fetchRecords();
    } catch (err: any) {
      notify('Silinirken hata oluştu: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!user?.organizationId || filteredItems.length === 0) return;
    const count = filteredItems.length;
    if (!confirm(`Filtrelenen ${count} adet sanayi masrafını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;

    setActionLoading(true);
    try {
      const ids = filteredItems.map(x => x.id);
      const { error } = await supabase
        .from('sanayi_giderleri')
        .delete()
        .in('id', ids)
        .eq('organization_id', user.organizationId);
      if (error) throw error;
      notify(`${count} adet sanayi masrafı silindi.`, 'success');
      await fetchRecords();
    } catch (err: any) {
      notify('Toplu silme hatası: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Payment for a single item
  const handleQuickPay = async (item: SanayiGideri) => {
    const payAmountStr = prompt(`"${item.supplier} - ${item.plate}" için ödenecek tutarı girin (Kalan: ${formatMoney(item.remaining_amount)}):`, String(item.remaining_amount));
    if (!payAmountStr) return;
    const payAmount = parseFloat(payAmountStr);
    if (isNaN(payAmount) || payAmount <= 0) {
      notify('Geçerli bir ödeme tutarı giriniz.', 'error');
      return;
    }

    const newPaid = item.paid_amount + payAmount;
    const newRemaining = Math.max(0, item.amount - newPaid);
    const newStatus = newRemaining === 0 ? 'odendi' : 'kismi';

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('sanayi_giderleri')
        .update({
          paid_amount: newPaid,
          remaining_amount: newRemaining,
          payment_status: newStatus,
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', item.id);
      if (error) throw error;
      notify('Ödeme kaydedildi.', 'success');
      await fetchRecords();
    } catch (err: any) {
      notify('Ödeme hatası: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Document / PDF Viewer
  const handleOpenDoc = async (docUrl: string) => {
    try {
      if (docUrl.startsWith('http')) {
        setPreviewPdfUrl(docUrl);
      } else {
        const { data, error } = await supabase.storage
          .from('operations-documents')
          .createSignedUrl(docUrl, 300);
        if (error) throw error;
        setPreviewPdfUrl(data.signedUrl);
      }
    } catch (err: any) {
      notify('Belge açılamadı: ' + err.message, 'error');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      notify('Dışa aktarılacak kayıt bulunamadı.', 'error');
      return;
    }

    const exportRows = filteredItems.map(item => ({
      'Tarih': item.date,
      'Plaka': item.plate,
      'Sanayi Carisi / Usta': item.supplier,
      'Fatura No': item.invoice_no || '',
      'Yapılan İşlem / Açıklama': item.description || '',
      'Toplam Tutar (TL)': item.amount,
      'Ödenen Tutar (TL)': item.paid_amount,
      'Kalan Borç (TL)': item.remaining_amount,
      'Ödeme Durumu': item.payment_status === 'odendi' ? 'Ödendi' : item.payment_status === 'kismi' ? 'Kısmi Ödendi' : 'Bekliyor',
      'Ödeme Tarihi': item.payment_date || '',
      'Notlar': item.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sanayi Giderleri');
    XLSX.writeFile(wb, `sanayi_giderleri_${new Date().toISOString().split('T')[0]}.xlsx`);
    notify('Excel tablosu başarıyla indirildi.', 'success');
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'odendi':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200"><CheckCircle2 size={12}/>Ödendi</span>;
      case 'kismi':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200"><Clock size={12}/>Kısmi</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 border border-red-200"><AlertCircle size={12}/>Bekliyor</span>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Sanayi Giderleri & Bakım Masrafları"
        description="Şirket araçlarının sanayi, tamir, bakım, parça ve servis faturalarını bağımsız Sanayi Carileri üzerinden yönetin."
        actions={
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={pdfInputRef}
              onChange={handlePdfUpload}
              accept="application/pdf"
              className="hidden"
            />
            {canWrite && (
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={isAiParsing}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-blue-500/20"
                title="Gelen e-Fatura / e-Arşiv PDF'ini seçtiğinizde Plaka, Cari, Tutar ve Kalemler otomatik doldurulur."
              >
                {isAiParsing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Fatura Analiz Ediliyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-amber-300" />
                    <span>Fatura PDF Yükle (Akıllı)</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              title="Excel İndir"
            >
              <FileSpreadsheet size={16} />
              <span>Excel'e Aktar</span>
            </button>

            {canWrite && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setForm(emptyForm());
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20"
              >
                <Plus size={16} />
                <span>Yeni Masraf Ekle</span>
              </button>
            )}
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Toplam Sanayi Gideri */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Toplam Sanayi Masrafı</span>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Wrench size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight text-gray-950 block">{formatMoney(stats.totalAmount)}</span>
            <span className="text-xs font-medium text-gray-500 mt-1 block">{stats.totalCount} adet fatura/fiş</span>
          </div>
        </div>

        {/* Toplam Ödenen */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Toplam Ödenen</span>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight text-emerald-600 block">{formatMoney(stats.totalPaid)}</span>
            <span className="text-xs font-medium text-emerald-700/70 mt-1 block">Kapatılan Sanayi Masrafı</span>
          </div>
        </div>

        {/* Kalan Borç / Bakiye */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kalan Sanayi Borcu</span>
            <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight text-red-600 block">{formatMoney(stats.totalRemaining)}</span>
            <span className="text-xs font-medium text-red-700/70 mt-1 block">Ödenmesi Gereken Bakiye</span>
          </div>
        </div>

        {/* Bu Ayki Masraf */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bu Ayki Sanayi Gideri</span>
            <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
              <Calendar size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight text-purple-950 block">{formatMoney(stats.thisMonthAmount)}</span>
            <span className="text-xs font-medium text-gray-500 mt-1 block">{stats.activeCarisCount} farklı usta / servis</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('faturalar')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'faturalar' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Receipt size={17} />
          <span>Fatura & Masraf Listesi</span>
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{filteredItems.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('cariler')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'cariler' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Building2 size={17} />
          <span>Sanayi Carileri & Ekstre</span>
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{aggregatedCaris.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('araclar')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'araclar' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Car size={17} />
          <span>Araç Bazlı Döküm</span>
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{aggregatedVehicles.length}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none"
            placeholder="Sanayi Carisi, Plaka, Fatura No, İşlem ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Plaka Filtresi */}
          <select
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
            value={selectedPlate}
            onChange={(e) => setSelectedPlate(e.target.value)}
          >
            <option value="all">Tüm Plakalar</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.plate}>{v.plate} ({v.brand} {v.model})</option>
            ))}
          </select>

          {/* Durum Filtresi */}
          <select
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="bekliyor">Bekleyen / Borçlu</option>
            <option value="kismi">Kısmi Ödenen</option>
            <option value="odendi">Tamamen Ödenen</option>
          </select>

          {/* Yıl Filtresi */}
          <select
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="all">Tüm Yıllar</option>
            <option value="2027">2027 Yılı</option>
            <option value="2026">2026 Yılı</option>
            <option value="2025">2025 Yılı</option>
            <option value="2024">2024 Yılı</option>
          </select>

          {/* Ay Filtresi */}
          <select
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">Tüm Aylar</option>
            <option value="1">Ocak</option>
            <option value="2">Şubat</option>
            <option value="3">Mart</option>
            <option value="4">Nisan</option>
            <option value="5">Mayıs</option>
            <option value="6">Haziran</option>
            <option value="7">Temmuz</option>
            <option value="8">Ağustos</option>
            <option value="9">Eylül</option>
            <option value="10">Ekim</option>
            <option value="11">Kasım</option>
            <option value="12">Aralık</option>
          </select>

          <button
            onClick={fetchRecords}
            className="rounded-xl p-2 text-gray-400 border border-gray-300 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title="Yenile"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* TAB 1: Fatura ve Masraf Listesi */}
      {activeTab === 'faturalar' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150 text-left text-sm">
              <thead className="bg-gray-50 text-[11.5px] uppercase tracking-wider font-semibold text-gray-500">
                <tr>
                  <th className="px-4 py-3.5 text-center w-[110px]">Tarih</th>
                  <th className="px-4 py-3.5 text-center w-[120px]">Plaka</th>
                  <th className="px-4 py-3.5 min-w-[180px]">Sanayi Carisi (Usta / Servis)</th>
                  <th className="px-4 py-3.5 w-[140px]">Fatura No</th>
                  <th className="px-4 py-3.5 min-w-[200px]">Yapılan İşlem / Açıklama</th>
                  <th className="px-4 py-3.5 text-right w-[130px]">Tutar</th>
                  <th className="px-4 py-3.5 text-right w-[120px]">Ödenen</th>
                  <th className="px-4 py-3.5 text-right w-[130px]">Kalan Borç</th>
                  <th className="px-4 py-3.5 text-center w-[110px]">Durum</th>
                  <th className="px-4 py-3.5 text-center w-[80px]">Evrak</th>
                  <th className="px-4 py-3.5 text-right w-[130px]">
                    {canWrite && filteredItems.length > 0 && (
                      <button
                        onClick={handleBulkDelete}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        title="Filtrelenenleri Sil"
                      >
                        <Trash2 size={13} />
                        <span>Tümünü Sil</span>
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-500" />
                      Sanayi giderleri yükleniyor...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400">
                      Kayıtlı sanayi gideri bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-center text-gray-600 font-medium whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white tracking-wider">
                          <Car size={12} className="text-gray-300" />
                          {item.plate}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        <button
                          onClick={() => {
                            setSelectedCariDetail(item.supplier);
                            setActiveTab('cariler');
                          }}
                          className="hover:text-brand-600 hover:underline text-left"
                          title="Bu carinin tüm ekstre dökümünü gör"
                        >
                          {item.supplier}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {item.invoice_no || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-[250px] truncate" title={item.description || ''}>
                        {item.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-950 whitespace-nowrap">
                        {formatMoney(item.amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                        {item.paid_amount > 0 ? formatMoney(item.paid_amount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-red-600 whitespace-nowrap">
                        {item.remaining_amount > 0 ? formatMoney(item.remaining_amount) : '0,00 ₺'}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {statusBadge(item.payment_status)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {item.document_url ? (
                          <button
                            onClick={() => handleOpenDoc(item.document_url!)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            title="Fatura PDF / Belgeyi Görüntüle"
                          >
                            <FileText size={15} />
                            <span>PDF</span>
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canWrite && item.remaining_amount > 0 && (
                            <button
                              onClick={() => void handleQuickPay(item)}
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Ödeme Yap"
                            >
                              <CreditCard size={16} />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setForm({
                                  date: item.date,
                                  plate: item.plate,
                                  supplier: item.supplier,
                                  invoice_no: item.invoice_no || '',
                                  description: item.description || '',
                                  amount: String(item.amount),
                                  paid_amount: String(item.paid_amount),
                                  payment_status: item.payment_status,
                                  payment_date: item.payment_date || '',
                                  notes: item.notes || '',
                                  file: null
                                });
                                setIsModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition-colors"
                              title="Düzenle"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => void handleDelete(item.id, `${item.supplier} (${item.plate})`)}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-gray-900">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right uppercase text-xs text-gray-500 font-bold">Toplamlar:</td>
                    <td className="px-4 py-3 text-right text-gray-950 font-extrabold">{formatMoney(stats.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatMoney(stats.totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-extrabold">{formatMoney(stats.totalRemaining)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Sanayi Carileri & Ekstre */}
      {activeTab === 'cariler' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-150 text-left text-sm">
                <thead className="bg-gray-50 text-[11.5px] uppercase tracking-wider font-semibold text-gray-500">
                  <tr>
                    <th className="px-4 py-3.5 min-w-[200px]">Sanayi Carisi / Usta / Servis</th>
                    <th className="px-4 py-3.5 text-center w-[120px]">İşlem Sayısı</th>
                    <th className="px-4 py-3.5 min-w-[180px]">İlgili Araçlar (Plakalar)</th>
                    <th className="px-4 py-3.5 text-right w-[150px]">Toplam Masraf</th>
                    <th className="px-4 py-3.5 text-right w-[140px]">Toplam Ödenen</th>
                    <th className="px-4 py-3.5 text-right w-[150px]">Kalan Borç / Bakiye</th>
                    <th className="px-4 py-3.5 text-center w-[130px]">Son İşlem Tarihi</th>
                    <th className="px-4 py-3.5 text-center w-[120px]">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {aggregatedCaris.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        Henüz Sanayi Carisi kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    aggregatedCaris.map(c => {
                      const isSelected = selectedCariDetail === c.supplier;
                      return (
                        <tr key={c.supplier} className={`hover:bg-gray-50/60 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}>
                          <td className="px-4 py-3.5 font-bold text-gray-900">
                            <button
                              onClick={() => setSelectedCariDetail(isSelected ? null : c.supplier)}
                              className="text-left font-bold text-brand-700 hover:text-brand-900 hover:underline flex items-center gap-1.5"
                            >
                              <Building2 size={16} className="text-gray-400 shrink-0" />
                              <span>{c.supplier}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-gray-700">
                            {c.totalCount} fatura
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {Array.from(c.plates).map(p => (
                                <span key={p} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-gray-950">
                            {formatMoney(c.totalAmount)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-emerald-700">
                            {c.totalPaid > 0 ? formatMoney(c.totalPaid) : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-red-600">
                            {c.totalRemaining > 0 ? formatMoney(c.totalRemaining) : '0,00 ₺'}
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs text-gray-500 font-medium">
                            {formatDate(c.lastDate)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => setSelectedCariDetail(isSelected ? null : c.supplier)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline"
                            >
                              <span>{isSelected ? 'Gizle' : 'Ekstre'}</span>
                              <ChevronRight size={14} className={`transition-transform ${isSelected ? 'rotate-90' : ''}`} />
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

          {/* Selected Cari Ekstre Details */}
          {selectedCariDetail && (
            <div className="rounded-2xl border-2 border-brand-200 bg-white p-6 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="text-brand-600" size={20} />
                    <span>{selectedCariDetail} — Cari Hesap Ekstresi</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Bu ustaya/servise ait tüm fatura ve ödeme hareketleri</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCariDetail(null)}
                    className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-150 text-left text-xs">
                  <thead className="bg-gray-50 font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-3.5 py-2.5">Tarih</th>
                      <th className="px-3.5 py-2.5">Plaka</th>
                      <th className="px-3.5 py-2.5">Fatura No</th>
                      <th className="px-3.5 py-2.5">Açıklama</th>
                      <th className="px-3.5 py-2.5 text-right">Tutar</th>
                      <th className="px-3.5 py-2.5 text-right">Ödenen</th>
                      <th className="px-3.5 py-2.5 text-right">Kalan</th>
                      <th className="px-3.5 py-2.5 text-center">Durum</th>
                      <th className="px-3.5 py-2.5 text-center">Evrak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {items
                      .filter(x => x.supplier === selectedCariDetail)
                      .map(row => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-3.5 py-2 text-gray-600">{formatDate(row.date)}</td>
                          <td className="px-3.5 py-2 font-bold text-gray-900">{row.plate}</td>
                          <td className="px-3.5 py-2 text-gray-500 font-mono">{row.invoice_no || '—'}</td>
                          <td className="px-3.5 py-2 text-gray-700">{row.description || '—'}</td>
                          <td className="px-3.5 py-2 text-right font-bold text-gray-950">{formatMoney(row.amount)}</td>
                          <td className="px-3.5 py-2 text-right text-emerald-700">{formatMoney(row.paid_amount)}</td>
                          <td className="px-3.5 py-2 text-right font-bold text-red-600">{formatMoney(row.remaining_amount)}</td>
                          <td className="px-3.5 py-2 text-center">{statusBadge(row.payment_status)}</td>
                          <td className="px-3.5 py-2 text-center">
                            {row.document_url ? (
                              <button
                                onClick={() => handleOpenDoc(row.document_url!)}
                                className="text-blue-600 hover:underline font-semibold"
                              >
                                PDF
                              </button>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Araç Bazlı Masraf Dökümü */}
      {activeTab === 'araclar' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150 text-left text-sm">
              <thead className="bg-gray-50 text-[11.5px] uppercase tracking-wider font-semibold text-gray-500">
                <tr>
                  <th className="px-4 py-3.5 w-[140px]">Plaka</th>
                  <th className="px-4 py-3.5 text-center w-[120px]">Tamir Sayısı</th>
                  <th className="px-4 py-3.5 min-w-[200px]">Gittiği Sanayi Carileri / Ustalar</th>
                  <th className="px-4 py-3.5 text-right w-[160px]">Toplam Sanayi Masrafı</th>
                  <th className="px-4 py-3.5 text-right w-[150px]">Ödenen Tutar</th>
                  <th className="px-4 py-3.5 text-right w-[160px]">Kalan Borç</th>
                  <th className="px-4 py-3.5 text-center w-[140px]">Son Bakım Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {aggregatedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Kayıtlı araç sanayi masrafı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  aggregatedVehicles.map(v => (
                    <tr key={v.plate} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white tracking-wider">
                          <Car size={13} className="text-gray-300" />
                          {v.plate}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-gray-700">
                        {v.totalCount} işlem
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(v.suppliers).map(s => (
                            <span key={s} className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-gray-950">
                        {formatMoney(v.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-emerald-700">
                        {formatMoney(v.totalPaid)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-red-600">
                        {v.totalRemaining > 0 ? formatMoney(v.totalRemaining) : '0,00 ₺'}
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs text-gray-500 font-medium">
                        {formatDate(v.lastDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Sanayi Giderini Düzenle' : 'Yeni Sanayi Gideri Ekle'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tarih */}
            <div>
              <label className="label">Fatura / Masraf Tarihi *</label>
              <input
                type="date"
                required
                className="input w-full"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {/* Plaka */}
            <div>
              <label className="label">Araç / Plaka *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  list="vehicle-plates"
                  placeholder="Örn: 05 AT 123"
                  className="input w-full uppercase"
                  value={form.plate}
                  onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                />
                <datalist id="vehicle-plates">
                  {vehicles.map(v => (
                    <option key={v.id} value={v.plate}>{v.plate} ({v.brand} {v.model})</option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Sanayi Carisi */}
            <div>
              <label className="label">Sanayi Carisi / Usta / Servis *</label>
              <input
                type="text"
                required
                list="suppliers-list"
                placeholder="Örn: Yıldız Oto Makas, Özdemir Pompa"
                className="input w-full"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
              <datalist id="suppliers-list">
                {aggregatedCaris.map(c => (
                  <option key={c.supplier} value={c.supplier} />
                ))}
              </datalist>
            </div>

            {/* Fatura No */}
            <div>
              <label className="label">Fatura / Fiş Numarası</label>
              <input
                type="text"
                placeholder="Örn: GIB202600001234"
                className="input w-full"
                value={form.invoice_no}
                onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
              />
            </div>

            {/* Toplam Tutar */}
            <div>
              <label className="label">Toplam Tutar (TL) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                className="input w-full font-bold"
                value={form.amount}
                onChange={(e) => {
                  const val = e.target.value;
                  const amt = parseFloat(val) || 0;
                  const paid = parseFloat(form.paid_amount) || 0;
                  setForm({
                    ...form,
                    amount: val,
                    payment_status: paid >= amt && amt > 0 ? 'odendi' : paid > 0 ? 'kismi' : 'bekliyor'
                  });
                }}
              />
            </div>

            {/* Ödenen Tutar */}
            <div>
              <label className="label">Ödenen Peşinat / Tutar (TL)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="input w-full text-emerald-700 font-semibold"
                value={form.paid_amount}
                onChange={(e) => {
                  const val = e.target.value;
                  const paid = parseFloat(val) || 0;
                  const amt = parseFloat(form.amount) || 0;
                  setForm({
                    ...form,
                    paid_amount: val,
                    payment_status: paid >= amt && amt > 0 ? 'odendi' : paid > 0 ? 'kismi' : 'bekliyor'
                  });
                }}
              />
            </div>

            {/* Ödeme Durumu */}
            <div>
              <label className="label">Ödeme Durumu</label>
              <select
                className="input w-full"
                value={form.payment_status}
                onChange={(e) => setForm({ ...form, payment_status: e.target.value as any })}
              >
                <option value="bekliyor">Bekliyor (Borçlu)</option>
                <option value="kismi">Kısmi Ödendi</option>
                <option value="odendi">Ödendi (Kapandı)</option>
              </select>
            </div>

            {/* Ödeme / Vade Tarihi */}
            <div>
              <label className="label">Ödeme / Vade Tarihi</label>
              <input
                type="date"
                className="input w-full"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              />
            </div>
          </div>

          {/* Yapılan İşlem / Açıklama */}
          <div>
            <label className="label">Yapılan İşlem / Değişen Parça Detayı</label>
            <textarea
              rows={2}
              placeholder="Örn: Ön fren balataları değişimi, rot balans ayarı ve 10W-40 motor yağı bakımı."
              className="input w-full"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Fatura PDF Yükle */}
          <div>
            <label className="label">Fatura PDF / Belge Ekle</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf,image/*"
                className="input w-full file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setForm({ ...form, file });
                }}
              />
              {editingItem?.document_url && (
                <button
                  type="button"
                  onClick={() => handleOpenDoc(editingItem.document_url!)}
                  className="px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 shrink-0"
                >
                  Mevcut PDF
                </button>
              )}
            </div>
          </div>

          {/* Notlar */}
          <div>
            <label className="label">Ek Notlar</label>
            <input
              type="text"
              placeholder="Örn: Garanti kapsamında yapıldı."
              className="input w-full"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn-primary"
            >
              {actionLoading ? 'Kaydediliyor...' : editingItem ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PDF Preview Modal */}
      {previewPdfUrl && (
        <Modal
          open={!!previewPdfUrl}
          onClose={() => setPreviewPdfUrl(null)}
          title="Fatura PDF Önizleme"
          size="xl"
        >
          <div className="flex flex-col h-[75vh]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">Fatura belgesi görüntüleniyor</span>
              <a
                href={previewPdfUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
              >
                <Download size={14} />
                <span>Yeni Sekmede Aç / İndir</span>
              </a>
            </div>
            <iframe
              src={previewPdfUrl}
              className="w-full flex-1 rounded-xl border border-gray-200"
              title="PDF Fatura"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
