import { useState, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { supabase } from '../../lib/supabase';
import { ensureSupabaseBackendSession } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import {
  Coins,
  Search,
  RefreshCw,
  FileText,
  Calendar,
  Landmark,
  FileSpreadsheet,
  FileDown,
  Printer,
  Camera,
  Layers,
  ShieldCheck,
  X,
  Building2,
  FolderLock,
  Wallet,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { CustomerCheckItem } from './types/customerChecks';
import {
  groupCustomerChecks,
  formatCurrency,
  formatDate,
  formatDrawerEndorser,
  getKasadaCategory,
} from './utils/customerChecksGrouping';
import {
  exportCustomerChecksToExcel,
  exportCustomerChecksToPdf,
  printCustomerChecks,
  captureCustomerChecksScreenshot,
} from './utils/customerChecksExport';
import { fixCorruptedTurkishText } from '../../lib/turkishTextFixer';

// Backward compatibility export
export type { CustomerCheckItem, CustomerCheck } from './types/customerChecks';

export function CustomerChecksPage() {
  const { notify } = useToast();
  const matrixCaptureRef = useRef<HTMLDivElement>(null);

  const [checks, setChecks] = useState<CustomerCheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKasadaCategory, setSelectedKasadaCategory] = useState<string>('ALL');

  // Loading states for export actions
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);

  // Tahsildeki Senetler Ekleme / Çıkarma state'leri
  const [showAddSenetForm, setShowAddSenetForm] = useState(false);
  const [newSenetDate, setNewSenetDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [newSenetKesideci, setNewSenetKesideci] = useState('');
  const [newSenetCiroEden, setNewSenetCiroEden] = useState('');
  const [newSenetAmount, setNewSenetAmount] = useState('');
  const [isSavingSenet, setIsSavingSenet] = useState(false);
  const [removedSenetHistory, setRemovedSenetHistory] = useState<CustomerCheckItem[]>([]);

  /**
   * Fetches all active incoming customer checks from Supabase ebs_checks table.
   * Uses pagination loop to guarantee all checks (>400) are retrieved without truncation.
   */
  const fetchCustomerChecks = async () => {
    setLoading(true);
    try {
      await ensureSupabaseBackendSession();
      let allRows: CustomerCheckItem[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('ebs_checks')
          .select('*')
          .eq('check_type', 'alinan')
          .neq('status', 'Ödendi')
          .order('due_date', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows = allRows.concat(data as CustomerCheckItem[]);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      setChecks(allRows);
    } catch (err: any) {
      console.error('Müşteri çekleri yüklenirken hata:', err);
      notify('Müşteri çekleri yüklenirken hata oluştu: ' + (err?.message || String(err)), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomerChecks();
  }, []);

  /**
   * Group active checks into 6 side-by-side vertical matrix strips and bottom kasada table
   */
  const groupedData = useMemo(() => {
    return groupCustomerChecks(checks, searchTerm);
  }, [checks, searchTerm]);

  /**
   * Filtered checks for the bottom Kasada table based on active pill category
   */
  const visibleKasadaChecks = useMemo(() => {
    if (selectedKasadaCategory === 'ALL') {
      return groupedData.kasadaChecks;
    }
    return groupedData.kasadaChecks.filter(
      (c) => getKasadaCategory(c.ciro_edilen).category === selectedKasadaCategory
    );
  }, [groupedData.kasadaChecks, selectedKasadaCategory]);

  const visibleKasadaTotal = useMemo(() => {
    return visibleKasadaChecks.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  }, [visibleKasadaChecks]);

  // Strip 6 subtotal for KPI card
  const tahsildekiSenetlerStrip = groupedData.strips[5];
  const tahsildekiSenetlerTotal = tahsildekiSenetlerStrip?.stripTotal || 0;
  const tahsildekiSenetlerCount = tahsildekiSenetlerStrip?.blocks.reduce(
    (acc, b) => acc + b.checks.length,
    0
  ) || 0;

  // =========================================================================
  // TAHSİLDEKİ SENETLER EKLEME / ÇIKARMA / GERİ ALMA İŞLEMLERİ
  // =========================================================================
  const handleAddSenet = async (e: React.FormEvent) => {
    e.preventDefault();
    const kesideciClean = newSenetKesideci.trim().toLocaleUpperCase('tr-TR');
    const ciroClean = newSenetCiroEden.trim().toLocaleUpperCase('tr-TR');
    const parsedAmount = parseFloat(
      newSenetAmount.replace(/\./g, '').replace(',', '.').trim()
    );

    if (!newSenetDate) {
      notify('Lütfen senet vade tarihini seçin.', 'error');
      return;
    }
    if (!kesideciClean) {
      notify('Lütfen keşideci / firma adını girin.', 'error');
      return;
    }
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      notify('Lütfen geçerli bir senet tutarı girin.', 'error');
      return;
    }

    setIsSavingSenet(true);
    try {
      await ensureSupabaseBackendSession();
      const payload = {
        organization_id: '13b8da90-27d1-440d-a8f4-eb50dadd6391',
        check_type: 'alinan',
        document_type: 'senet',
        local_id: Math.floor(Date.now() / 1000),
        check_no: '',
        issue_date: newSenetDate,
        due_date: newSenetDate,
        amount: parsedAmount,
        kesideci: kesideciClean,
        creditor: ciroClean || kesideciClean,
        debtor: '',
        bank_name: 'SENET',
        bank_branch: '',
        tahsildar_banka: 'SENET',
        ciro_edilen: '',
        status: 'Teminata Verildi',
        para_birimi: 'TL',
        ozel_alan: 'WEB_MANUEL_SENET',
      };

      const { data: inserted, error } = await supabase
        .from('ebs_checks')
        .insert([payload])
        .select();

      if (error) throw error;

      const createdRow: CustomerCheckItem =
        inserted && inserted[0]
          ? (inserted[0] as CustomerCheckItem)
          : ({ id: `senet-${Date.now()}`, ...payload } as CustomerCheckItem);

      setChecks((prev) => [...prev, createdRow]);
      setNewSenetKesideci('');
      setNewSenetCiroEden('');
      setNewSenetAmount('');
      setShowAddSenetForm(false);
      notify('Yeni senet Tahsildeki Senetler listesine eklendi.', 'success');
    } catch (err: any) {
      console.error('Senet ekleme hatası:', err);
      notify('Senet eklenirken hata oluştu: ' + (err?.message || String(err)), 'error');
    } finally {
      setIsSavingSenet(false);
    }
  };

  const handleRemoveSenet = async (item: CustomerCheckItem) => {
    // Optimistically remove from UI and save in undo stack
    setChecks((prev) => prev.filter((c) => c.id !== item.id));
    setRemovedSenetHistory((prev) => [...prev, item]);

    try {
      await ensureSupabaseBackendSession();
      const isWebManual = String(item.ozel_alan || '').toUpperCase().includes('WEB_MANUEL_SENET');
      const hasEbsLocalId = Boolean(item.local_id && item.local_id > 0 && item.local_id < 1000000);

      if (hasEbsLocalId && !isWebManual) {
        // EBS'den gelen senetleri Ödendi + SİLİNDİ olarak işaretle ki 5 dk senkronizasyonda geri gelmesin
        const { error } = await supabase
          .from('ebs_checks')
          .update({
            status: 'Ödendi',
            ozel_alan: 'SİLİNDİ - SENET LİSTESİNDEN KALDIRILDI',
          })
          .eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ebs_checks').delete().eq('id', item.id);
        if (error) throw error;
      }

      notify('Senet listeden çıkarıldı.', 'success');
    } catch (err: any) {
      console.error('Senet silme hatası:', err);
      notify('Senet çıkarılırken hata oluştu: ' + (err?.message || String(err)), 'error');
      void fetchCustomerChecks();
    }
  };

  const handleUndoRemoveSenet = async () => {
    if (removedSenetHistory.length === 0) return;
    const lastRemoved = removedSenetHistory[removedSenetHistory.length - 1];
    setRemovedSenetHistory((prev) => prev.slice(0, -1));

    try {
      await ensureSupabaseBackendSession();
      const isWebManual = String(lastRemoved.ozel_alan || '').toUpperCase().includes('WEB_MANUEL_SENET');
      const hasEbsLocalId = Boolean(
        lastRemoved.local_id && lastRemoved.local_id > 0 && lastRemoved.local_id < 1000000
      );

      if (hasEbsLocalId && !isWebManual) {
        const { error } = await supabase
          .from('ebs_checks')
          .update({
            status: lastRemoved.status || 'Teminata Verildi',
            ozel_alan:
              lastRemoved.ozel_alan && !lastRemoved.ozel_alan.includes('SİLİNDİ')
                ? lastRemoved.ozel_alan
                : 'SENET',
          })
          .eq('id', lastRemoved.id);
        if (error) throw error;
        setChecks((prev) => [...prev, lastRemoved]);
      } else {
        const { id: _oldId, ...insertFields } = lastRemoved as any;
        const { data: reInserted, error } = await supabase
          .from('ebs_checks')
          .insert([insertFields])
          .select();
        if (error) throw error;
        const restored =
          reInserted && reInserted[0] ? (reInserted[0] as CustomerCheckItem) : lastRemoved;
        setChecks((prev) => [...prev, restored]);
      }

      notify('Çıkarılan senet geri alındı.', 'success');
    } catch (err: any) {
      console.error('Senet geri alma hatası:', err);
      notify('Senet geri alınırken hata: ' + (err?.message || String(err)), 'error');
      void fetchCustomerChecks();
    }
  };

  // =========================================================================
  // EXPORT ACTION HANDLERS
  // =========================================================================
  const handleExportExcel = () => {
    try {
      setIsExportingExcel(true);
      exportCustomerChecksToExcel(groupedData);
      notify('Müşteri çekleri Excel (.xlsx) tablosu başarıyla indirildi.', 'success');
    } catch (err: any) {
      console.error('Excel dışa aktarım hatası:', err);
      notify('Excel dışa aktarılırken hata: ' + (err?.message || String(err)), 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportCustomerChecksToPdf('musteri-cekleri-matrix-capture');
      notify('Müşteri çekleri matrisi PDF dosyası başarıyla indirildi.', 'success');
    } catch (err: any) {
      console.error('PDF dışa aktarım hatası:', err);
      notify('PDF oluşturulurken hata: ' + (err?.message || String(err)), 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    printCustomerChecks();
  };

  const handleCaptureScreenshot = async () => {
    try {
      setIsCapturingScreenshot(true);
      const res = await captureCustomerChecksScreenshot('musteri-cekleri-matrix-capture');
      if (res.clipboard) {
        notify(
          'Matris ekran görüntüsü panoya kopyalandı! WhatsApp Web\'de Ctrl+V ile yapıştırabilirsiniz.',
          'success'
        );
      } else if (res.success) {
        notify('Matris ekran görüntüsü PNG olarak indirildi.', 'success');
      } else {
        notify('Ekran görüntüsü alınamadı: ' + (res.error || 'Bilinmeyen hata'), 'error');
      }
    } catch (err: any) {
      console.error('Ekran görüntüsü alma hatası:', err);
      notify('Ekran görüntüsü alınırken hata: ' + (err?.message || String(err)), 'error');
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  /**
   * Helper to color-code Kasada category badges in the bottom table
   */
  const getBadgeStyle = (category: string) => {
    switch (category) {
      case 'KASADA':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'KASADA YAZILDI':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'İCRADA / AVUKATTA':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'ÖNDER ABİ DE':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'APO ABİ DE':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'BANKADA':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Embedded Print Styling */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 4mm;
          }
          aside, header, nav, button, .no-print, input, [class*="PageHeader"] {
            display: none !important;
          }
          div.lg\\:pl-\\[72px\\], div.lg\\:pl-\\[240px\\], [class*="lg:pl-"] {
            padding-left: 0 !important;
          }
          body, html, main, #root, .min-h-screen {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          #musteri-cekleri-matrix-capture {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            width: 100% !important;
            min-width: 100% !important;
          }
        }
      `}</style>

      {/* Header & Main Actions */}
      <PageHeader
        title="Müşteri Çekleri Listesi"
        description="Müşterilerden alınan çek ve senetlerin banka ve faktoring matrisi, kasadaki çekler ve analizi"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchCustomerChecks}
              disabled={loading}
              title="Supabase'den güncel verileri çek"
              className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Verileri Güncelle</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || loading}
              title="Excel (.xlsx) çoklu sayfa olarak indir"
              className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>{isExportingExcel ? 'Hazırlanıyor...' : 'Excel İndir'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || loading}
              title="Matris tablosunu yatay A4 PDF olarak indir"
              className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
            >
              <FileDown size={14} className="text-rose-600" />
              <span>{isExportingPdf ? 'İndiriliyor...' : 'PDF İndir'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading}
              title="Yazdır veya tarayıcıdan PDF kaydet"
              className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <Printer size={14} className="text-gray-600" />
              <span>Yazdır</span>
            </button>

            <button
              onClick={handleCaptureScreenshot}
              disabled={isCapturingScreenshot || loading}
              title="WhatsApp paylaşımı için yüksek çözünürlüklü ekran görüntüsü al"
              className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 shadow-xs bg-emerald-600 hover:bg-emerald-700"
            >
              <Camera size={14} />
              <span>{isCapturingScreenshot ? 'Çekiliyor...' : 'Ekran Görüntüsü Al'}</span>
            </button>
          </div>
        }
      />

      {/* Cross-Table Instant Search Input */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Coins size={18} className="text-brand-600" />
          <span>Aktif Müşteri Çekleri ve Senetleri</span>
          <span className="text-xs font-normal text-gray-500">
            ({groupedData.totalActiveChecks} / {checks.length} Kayıt)
          </span>
        </div>

        <div className="relative w-full sm:w-96">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Çek no, keşideci, ciro eden, banka ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 pr-8 py-1.5 text-xs w-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Aramayı temizle"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Top 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: GENEL TOPLAM */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              GENEL TOPLAM
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
              <Coins size={18} />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-gray-900">
            {formatCurrency(groupedData.grandTotal)}
          </div>
          <div className="mt-1 text-xs text-gray-500 flex items-center gap-1 font-medium">
            <span>{groupedData.totalActiveChecks} Toplam Çek / Senet</span>
          </div>
        </div>

        {/* KPI 2: MATRİS TOPLAMI */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              MATRİS TOPLAMI
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Landmark size={18} />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-700">
            {formatCurrency(groupedData.matrixTotal)}
          </div>
          <div className="mt-1 text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <span>{groupedData.totalMatrixChecks} Banka / Faktoring Çeki</span>
          </div>
        </div>

        {/* KPI 3: KASADA TOPLAMI */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              KASADA TOPLAMI
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-amber-700">
            {formatCurrency(groupedData.kasadaTotal)}
          </div>
          <div className="mt-1 text-xs text-amber-600 flex items-center gap-1 font-medium">
            <span>{groupedData.kasadaChecks.length} Kasada / Avukatta</span>
          </div>
        </div>

        {/* KPI 4: TAHSİLDEKİ SENETLER */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              TAHSİLDEKİ SENETLER
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <FileText size={18} />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-purple-700">
            {formatCurrency(tahsildekiSenetlerTotal)}
          </div>
          <div className="mt-1 text-xs text-purple-600 flex items-center gap-1 font-medium">
            <span>{tahsildekiSenetlerCount} Tahsildeki Senet</span>
          </div>
        </div>

        {/* KPI 5: TOPLAM ÇEK SAYISI */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              TOPLAM ÇEK SAYISI
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-blue-700">
            {groupedData.totalActiveChecks} Adet
          </div>
          <div className="mt-1 text-xs text-blue-600 flex items-center gap-1 font-medium">
            <span>{groupedData.totalMatrixChecks} Matris + {groupedData.kasadaChecks.length} Kasa</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN 6-STRIP SIDE-BY-SIDE MATRIX TABLE (CAPTURE CONTAINER)
         ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
            <Building2 size={16} className="text-brand-600" />
            Müşteri Çekleri & Senetleri Matrisi (6 Sütun)
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            Tahsildar Banka / Faktoring / Elimizdeki / Senetler
          </span>
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div
            id="musteri-cekleri-matrix-capture"
            ref={matrixCaptureRef}
            className="min-w-[1460px] bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4"
          >
            {/* Header info bar inside screenshot/print capture */}
            <div className="border-b border-gray-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight">
                  DARS - MÜŞTERİ ÇEKLERİ MATRİS TABLOSU
                </h3>
                <p className="text-xs text-gray-500">
                  Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')} | Durum: Aktif Alınan Çekler ve Senetler
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200 font-semibold font-mono">
                  Matris: {formatCurrency(groupedData.matrixTotal)}
                </div>
                <div className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200 font-semibold font-mono">
                  Kasada: {formatCurrency(groupedData.kasadaTotal)}
                </div>
                <div className="bg-slate-900 text-amber-300 px-3 py-1 rounded-md font-bold font-mono">
                  GENEL: {formatCurrency(groupedData.grandTotal)}
                </div>
              </div>
            </div>

            {/* 6 Side-by-Side Strips */}
            <div className="grid grid-cols-6 gap-3 items-start">
              {groupedData.strips.map((strip) => (
                <div key={strip.stripNumber} className="flex flex-col gap-3 min-w-[230px]">
                  {/* Strip Header Banner */}
                  <div className="bg-slate-800 text-white px-2.5 py-2 rounded-lg shadow-xs flex items-center justify-between">
                    <span className="font-bold text-[11px] tracking-wide truncate" title={strip.title}>
                      SÜTUN {strip.stripNumber}: {strip.title}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-amber-300 shrink-0 ml-1">
                      {formatCurrency(strip.stripTotal)}
                    </span>
                  </div>

                  {/* Bank & Factoring Blocks */}
                  {strip.blocks.map((block) => (
                    <div
                      key={block.id}
                      className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden flex flex-col"
                    >
                      {/* Block Title Header */}
                      <div className="bg-gray-50 px-2.5 py-1.5 border-b border-gray-200 flex items-center justify-between gap-1">
                        <span
                          className="font-bold text-[11px] text-gray-800 uppercase tracking-tight truncate mr-1"
                          title={block.title}
                        >
                          {block.title}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {block.id === 'tahsildeki-senetler' && removedSenetHistory.length > 0 && (
                            <button
                              type="button"
                              onClick={handleUndoRemoveSenet}
                              data-html2canvas-ignore="true"
                              className="no-print inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-[9px] font-bold transition-colors"
                              title="Son çıkarılan senedi geri al"
                            >
                              <RotateCcw size={9} />
                              <span>Geri Al</span>
                            </button>
                          )}
                          {block.id === 'tahsildeki-senetler' && (
                            <button
                              type="button"
                              onClick={() => setShowAddSenetForm((prev) => !prev)}
                              data-html2canvas-ignore="true"
                              className="no-print inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold shadow-2xs transition-colors"
                              title="Tahsildeki Senetlere Yeni Senet Ekle"
                            >
                              <Plus size={10} />
                              <span>Ekle</span>
                            </button>
                          )}
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-gray-200 text-gray-700 shrink-0">
                            {block.checks.length}
                          </span>
                        </div>
                      </div>

                      {/* Inline Add Form ONLY for Tahsildeki Senetler */}
                      {block.id === 'tahsildeki-senetler' && showAddSenetForm && (
                        <form
                          onSubmit={handleAddSenet}
                          data-html2canvas-ignore="true"
                          className="no-print bg-emerald-50/70 p-2 border-b border-emerald-200 space-y-1.5 text-[10px]"
                        >
                          <div className="font-bold text-emerald-900 flex items-center justify-between">
                            <span>Yeni Senet Ekle</span>
                            <button
                              type="button"
                              onClick={() => setShowAddSenetForm(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-gray-600 mb-0.5">
                              Vade Tarihi
                            </label>
                            <input
                              type="date"
                              value={newSenetDate}
                              onChange={(e) => setNewSenetDate(e.target.value)}
                              className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-[10px] focus:border-emerald-500 focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-gray-600 mb-0.5">
                              Keşideci / Borçlu
                            </label>
                            <input
                              type="text"
                              placeholder="Örn: KÖFTEHANEM"
                              value={newSenetKesideci}
                              onChange={(e) => setNewSenetKesideci(e.target.value)}
                              className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-[10px] uppercase focus:border-emerald-500 focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-gray-600 mb-0.5">
                              Ciro Eden (Opsiyonel)
                            </label>
                            <input
                              type="text"
                              placeholder="Örn: GEREDE ÜRETİM"
                              value={newSenetCiroEden}
                              onChange={(e) => setNewSenetCiroEden(e.target.value)}
                              className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-[10px] uppercase focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-gray-600 mb-0.5">
                              Tutar (₺)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Örn: 250000"
                              value={newSenetAmount}
                              onChange={(e) => setNewSenetAmount(e.target.value)}
                              className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-[10px] font-mono focus:border-emerald-500 focus:outline-none"
                              required
                            />
                          </div>
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAddSenetForm(false)}
                              className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold"
                            >
                              İptal
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingSenet}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs disabled:opacity-50"
                            >
                              {isSavingSenet ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Checks List */}
                      <div className="divide-y divide-gray-100 text-[10px]">
                        <div className="grid grid-cols-12 bg-gray-50/70 px-1.5 py-1 text-[9px] font-bold text-gray-500 uppercase border-b border-gray-100">
                          <span className="col-span-3">Vade</span>
                          <span className="col-span-6">Keşideci (Ciro)</span>
                          <span className="col-span-3 text-right">Tutar</span>
                        </div>

                        {loading ? (
                          <div className="py-3 text-center text-gray-400 text-[10px]">
                            Yükleniyor...
                          </div>
                        ) : block.checks.length === 0 ? (
                          <div className="py-2.5 text-center text-gray-400 italic text-[10px]">
                            Kayıt bulunamadı
                          </div>
                        ) : (
                          block.checks.map((c) => {
                            const formattedDrawer = formatDrawerEndorser(c.kesideci, c.creditor);
                            const isSenetBlock = block.id === 'tahsildeki-senetler';
                            return (
                              <div
                                key={c.id}
                                className="group grid grid-cols-12 px-1.5 py-1 hover:bg-amber-50/50 transition-colors items-center"
                              >
                                <span
                                  className="col-span-3 font-mono text-gray-600 truncate"
                                  title={c.due_date || '-'}
                                >
                                  {formatDate(c.due_date)}
                                </span>
                                <span
                                  className="col-span-5 font-medium text-gray-800 truncate pr-1"
                                  title={formattedDrawer}
                                >
                                  {formattedDrawer}
                                </span>
                                <span className="col-span-4 font-mono font-bold text-gray-900 text-right whitespace-nowrap flex items-center justify-end gap-1">
                                  <span>{formatCurrency(c.amount, false)}</span>
                                  {isSenetBlock && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSenet(c)}
                                      data-html2canvas-ignore="true"
                                      className="no-print text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-0.5 rounded transition-colors shrink-0"
                                      title="Bu senedi listeden çıkar"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Block Subtotal */}
                      <div className="bg-gray-50/90 px-2 py-1 border-t border-gray-200 flex items-center justify-between font-bold text-[10px]">
                        <span className="text-gray-500">Ara Toplam:</span>
                        <span className="font-mono text-gray-900">
                          {formatCurrency(block.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Strip Total Summary Card (if multiple blocks) */}
                  {strip.blocks.length > 1 && (
                    <div className="bg-slate-100 text-slate-800 px-2.5 py-1.5 rounded-md border border-slate-200 flex items-center justify-between text-[11px] font-bold">
                      <span className="truncate">{strip.title} Toplamı:</span>
                      <span className="font-mono text-slate-900 shrink-0 ml-1">
                        {formatCurrency(strip.stripTotal)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Matrix Grand Summary Banner */}
            <div className="mt-4 p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-slate-400 mr-2">Matris Toplamı:</span>
                  <strong className="text-emerald-400 font-mono text-sm">
                    {formatCurrency(groupedData.matrixTotal)}
                  </strong>
                  <span className="text-slate-400 text-[10px] ml-1">
                    ({groupedData.totalMatrixChecks} Çek)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 mr-2">Kasa/Avukat Toplamı:</span>
                  <strong className="text-amber-300 font-mono text-sm">
                    {formatCurrency(groupedData.kasadaTotal)}
                  </strong>
                  <span className="text-slate-400 text-[10px] ml-1">
                    ({groupedData.kasadaChecks.length} Çek)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-bold uppercase tracking-wider text-xs">
                  GENEL TOPLAM:
                </span>
                <span className="text-xl font-black font-mono text-amber-400">
                  {formatCurrency(groupedData.grandTotal)}
                </span>
                <span className="text-slate-400 text-xs">
                  ({groupedData.totalActiveChecks} Kayıt)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM SECTION: KASADA / YAZILAN / AVUKATTAKİ ÇEKLER TABLOSU
         ========================================================================= */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header & Category Filter Pills */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <FolderLock size={18} className="text-amber-600" />
                <span>Kasada / Yazılan / Avukattaki Çekler Tablosu</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Kasada bekleyen, yazılan veya hukuki takipteki müşteri çekleri
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">
                Toplam: <strong className="font-mono text-gray-900">{formatCurrency(groupedData.kasadaTotal)}</strong> ({groupedData.kasadaChecks.length} Çek)
              </span>
            </div>
          </div>

          {/* Quick Filter Badges/Pills by Ciro Edilen Category */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setSelectedKasadaCategory('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedKasadaCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>Tümü</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedKasadaCategory === 'ALL' ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {groupedData.kasadaChecks.length}
              </span>
              <span className="font-mono text-[10px] opacity-80">
                ({formatCurrency(groupedData.kasadaTotal)})
              </span>
            </button>

            {groupedData.kasadaGroups.map((group) => {
              const isSelected = selectedKasadaCategory === group.category;
              return (
                <button
                  key={group.category}
                  onClick={() => setSelectedKasadaCategory(group.category)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <span>{group.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-amber-800 text-white' : 'bg-amber-200/80 text-amber-900'
                    }`}
                  >
                    {group.checks.length}
                  </span>
                  <span className="font-mono text-[10px] opacity-90">
                    ({formatCurrency(group.subtotal)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Table Contents */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase">
                <th className="py-2.5 px-3">Vade Tarihi</th>
                <th className="py-2.5 px-3">Çek No</th>
                <th className="py-2.5 px-3">Keşideci (Ciro Eden)</th>
                <th className="py-2.5 px-3">Banka</th>
                <th className="py-2.5 px-3">Ciro Edilen / Konum</th>
                <th className="py-2.5 px-3 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Kasada çekler yükleniyor...
                  </td>
                </tr>
              ) : visibleKasadaChecks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Bu filtreye uygun çek kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                visibleKasadaChecks.map((c) => {
                  const normalizedCat = getKasadaCategory(c.ciro_edilen).category;
                  const ciroEdilenClean = fixCorruptedTurkishText(c.ciro_edilen || 'KASADA');
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2 px-3 font-semibold text-gray-800 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-mono">
                          <Calendar size={13} className="text-gray-400" />
                          {formatDate(c.due_date || c.issue_date)}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-700">{c.check_no || '-'}</td>
                      <td className="py-2 px-3 font-semibold text-gray-900">
                        {formatDrawerEndorser(c.kesideci, c.creditor)}
                      </td>
                      <td className="py-2 px-3 text-gray-700">
                        <span className="inline-flex items-center gap-1">
                          <Landmark size={12} className="text-gray-400" />
                          {fixCorruptedTurkishText(c.bank_name || '-')}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getBadgeStyle(
                            normalizedCat
                          )}`}
                        >
                          <Wallet size={11} />
                          {ciroEdilenClean}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold font-mono text-gray-900 whitespace-nowrap">
                        {formatCurrency(c.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer with Subtotal */}
            {visibleKasadaChecks.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-bold text-xs text-gray-800">
                  <td colSpan={4} className="py-2.5 px-3">
                    Filtrelenen Kayıt: {visibleKasadaChecks.length} Adet
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600">
                    Ara Toplam:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-950 font-black">
                    {formatCurrency(visibleKasadaTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
