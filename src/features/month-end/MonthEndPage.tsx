import { useState, useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Building2, TrendingUp, TrendingDown, Wallet, 
  History, RotateCcw, FileSpreadsheet, ArrowUpRight,
  Search, Plus, Trash2, Edit3, Eye, Layers, Clock, Check, Printer
} from 'lucide-react';
import * as xlsx from 'xlsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../lib/toast';
import { useAuth, isSuleymanOrMustafaDemir } from '../../lib/auth';
import { defaultMonthEnd2026_08 } from './defaultData2026_08';
import type { MonthEndData, MonthEndSnapshot, AssetItem, LiabilityItem, CheckOrOpenGood } from './types';

const fmt = (val: number) => {
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const formatted = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(absVal);
  return `${isNeg ? '-' : ''}${formatted} ₺`;
};

const formatNumberWithDots = (val: number | string) => {
  if (val === '' || val === undefined || val === null || val === 0) {
    if (val === 0) return '0';
    return '';
  }
  const str = String(val).replace(/[^0-9-]/g, '');
  if (!str) return '';
  const isNegative = str.startsWith('-');
  const cleanStr = str.replace(/-/g, '');
  if (!cleanStr) return isNegative ? '-' : '';
  const formatted = cleanStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-${formatted}` : formatted;
};

const parseFormattedNumber = (str: string): number => {
  if (!str) return 0;
  const isNeg = str.startsWith('-');
  const clean = str.replace(/[^0-9]/g, '');
  const num = Number(clean);
  return isNeg ? -num : num;
};

type SectionKey = 'realEstates' | 'vehicles' | 'stocks' | 'receivables' | 'bankAndLiquid' | 'otherAssets' | 'pastDeficits' | 'loansAndPersonalDebts' | 'givenChecks';

export function MonthEndPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  if (user && isSuleymanOrMustafaDemir(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Active Tab
  const [activeTab, setActiveTab] = useState<'balance' | 'pl' | 'liquidity' | 'checks' | 'snapshots'>('balance');

  // Month End Working Data
  const [data, setData] = useState<MonthEndData>(() => {
    try {
      const saved = localStorage.getItem('dars_month_end_active_data_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.realEstates) return parsed;
      }
    } catch {}
    return defaultMonthEnd2026_08;
  });

  // Snapshots / Backup History
  const [snapshots, setSnapshots] = useState<MonthEndSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('dars_month_end_snapshots');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'snap_initial_2026_08',
        period: '2026-08',
        snapshotName: '2026 Ağustos Resmi Kapanış Yedeği',
        createdAt: '2026-08-31T18:00:00.000Z',
        createdByName: 'Sistem Yöneticisi',
        note: 'Masaüstü Excel tablolarından aktarılan orijinal ağustos ayı kapanış tablosudur.',
        totalAssets: 607324089,
        totalLiabilities: 617618909,
        netWorth: -10294820,
        data: defaultMonthEnd2026_08,
      }
    ];
  });

  // Item Modal states (Add / Edit)
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<{ key: SectionKey; title: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ id?: string; name: string; value: number; category?: string; dateStr?: string; bank?: string; type?: 'check' | 'open_good' } | null>(null);

  // Snapshot modal states
  const [newSnapshotModalOpen, setNewSnapshotModalOpen] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotNote, setNewSnapshotNote] = useState('');

  // Preview snapshot modal
  const [previewSnapshot, setPreviewSnapshot] = useState<MonthEndSnapshot | null>(null);

  // Search in checks
  const [checkSearch, setCheckSearch] = useState('');

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dars_month_end_active_data_v2', JSON.stringify(data));
    } catch {}
  }, [data]);

  useEffect(() => {
    try {
      localStorage.setItem('dars_month_end_snapshots', JSON.stringify(snapshots));
    } catch {}
  }, [snapshots]);

  // Calculations
  const totalRealEstates = useMemo(() => (data.realEstates || []).reduce((sum, r) => sum + r.value, 0), [data.realEstates]);
  const totalVehicles = useMemo(() => data.vehicles.reduce((sum, v) => sum + v.value, 0), [data.vehicles]);
  const totalStocks = useMemo(() => data.stocks.reduce((sum, s) => sum + s.value, 0), [data.stocks]);
  const totalReceivables = useMemo(() => data.receivables.reduce((sum, r) => sum + r.value, 0), [data.receivables]);
  const totalBankAndLiquid = useMemo(() => data.bankAndLiquid.reduce((sum, b) => sum + b.value, 0), [data.bankAndLiquid]);
  const totalOtherAssets = useMemo(() => data.otherAssets.reduce((sum, o) => sum + o.value, 0), [data.otherAssets]);
  const totalPastDeficits = useMemo(() => data.pastDeficits.reduce((sum, p) => sum + p.value, 0), [data.pastDeficits]);

  // Total Assets (Sermaye + Demirbaş)
  const totalAssets = useMemo(() => {
    return totalRealEstates + totalVehicles + totalOtherAssets + totalStocks + totalReceivables + totalBankAndLiquid + totalPastDeficits;
  }, [totalRealEstates, totalVehicles, totalOtherAssets, totalStocks, totalReceivables, totalBankAndLiquid, totalPastDeficits]);

  // Total Liabilities
  const totalGivenChecks = useMemo(() => data.givenChecks.reduce((sum, c) => sum + c.amount, 0), [data.givenChecks]);
  const totalLoansAndDebts = useMemo(() => data.loansAndPersonalDebts.reduce((sum, d) => sum + d.amount, 0), [data.loansAndPersonalDebts]);
  const totalOperationalDebts = useMemo(() => data.operationalDebts.reduce((sum, o) => sum + o.amount, 0), [data.operationalDebts]);

  const totalLiabilities = useMemo(() => {
    return totalGivenChecks + totalLoansAndDebts + totalOperationalDebts;
  }, [totalGivenChecks, totalLoansAndDebts, totalOperationalDebts]);

  const netWorth = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  // Handle Add Item
  const handleOpenAdd = (key: SectionKey, title: string) => {
    setActiveSection({ key, title });
    setEditingItem({
      name: '',
      value: 0,
      category: '',
      dateStr: '',
      bank: '',
      type: 'check'
    });
    setItemModalOpen(true);
  };

  // Handle Edit Item
  const handleOpenEdit = (key: SectionKey, title: string, item: any) => {
    setActiveSection({ key, title });
    setEditingItem({
      id: item.id,
      name: item.name || item.recipient || '',
      value: item.value ?? item.amount ?? 0,
      category: item.category || '',
      dateStr: item.dateStr || '',
      bank: item.bank || '',
      type: item.type || 'check'
    });
    setItemModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveItem = () => {
    if (!activeSection || !editingItem || !editingItem.name.trim()) {
      notify('Lütfen geçerli bir isim / açıklama girin.', 'error');
      return;
    }

    const { key } = activeSection;

    setData(prev => {
      const updated = { ...prev };
      const isEditing = Boolean(editingItem.id);

      if (key === 'givenChecks') {
        const item: CheckOrOpenGood = {
          id: editingItem.id || 'gc_' + Date.now(),
          recipient: editingItem.name.trim(),
          amount: Number(editingItem.value) || 0,
          bank: editingItem.bank?.trim() || 'AÇIK MAL',
          dateStr: editingItem.dateStr?.trim() || new Date().toLocaleDateString('tr-TR'),
          type: editingItem.type || 'check'
        };
        if (isEditing) {
          updated.givenChecks = prev.givenChecks.map(c => c.id === item.id ? item : c);
        } else {
          updated.givenChecks = [item, ...prev.givenChecks];
        }
      } else if (key === 'loansAndPersonalDebts') {
        const item: LiabilityItem = {
          id: editingItem.id || 'deb_' + Date.now(),
          name: editingItem.name.trim(),
          amount: Number(editingItem.value) || 0,
          category: editingItem.category?.trim() || 'Borç'
        };
        if (isEditing) {
          updated.loansAndPersonalDebts = prev.loansAndPersonalDebts.map(d => d.id === item.id ? item : d);
        } else {
          updated.loansAndPersonalDebts = [item, ...prev.loansAndPersonalDebts];
        }
      } else {
        const item: AssetItem = {
          id: editingItem.id || 'item_' + Date.now(),
          name: editingItem.name.trim(),
          value: Number(editingItem.value) || 0,
          category: editingItem.category?.trim() || ''
        };
        const list = (prev[key] as AssetItem[]) || [];
        if (isEditing) {
          (updated as any)[key] = list.map(x => x.id === item.id ? item : x);
        } else {
          (updated as any)[key] = [item, ...list];
        }
      }

      return updated;
    });

    setItemModalOpen(false);
    setEditingItem(null);
    notify(editingItem.id ? 'Kalem başarıyla güncellendi.' : 'Yeni kalem başarıyla eklendi.', 'success');
  };

  // Delete Item
  const handleDeleteItem = (key: SectionKey, id: string, name: string) => {
    if (confirm(`"${name}" kalemini silmek istediğinize emin misiniz?`)) {
      setData(prev => {
        const updated = { ...prev };
        if (key === 'givenChecks') {
          updated.givenChecks = prev.givenChecks.filter(c => c.id !== id);
        } else if (key === 'loansAndPersonalDebts') {
          updated.loansAndPersonalDebts = prev.loansAndPersonalDebts.filter(d => d.id !== id);
        } else {
          const list = (prev[key] as AssetItem[]) || [];
          (updated as any)[key] = list.filter(x => x.id !== id);
        }
        return updated;
      });
      notify('Kalem silindi.', 'success');
    }
  };

  // Create Snapshot
  const handleCreateSnapshot = () => {
    if (!newSnapshotName.trim()) {
      notify('Lütfen yedeğe bir isim verin.', 'error');
      return;
    }
    const newSnap: MonthEndSnapshot = {
      id: 'snap_' + Date.now(),
      period: data.period,
      snapshotName: newSnapshotName.trim(),
      createdAt: new Date().toISOString(),
      createdByName: user?.name || 'Berkant (Developer)',
      note: newSnapshotNote.trim() || undefined,
      totalAssets,
      totalLiabilities,
      netWorth,
      data: JSON.parse(JSON.stringify(data)),
    };
    setSnapshots(prev => [newSnap, ...prev]);
    setNewSnapshotModalOpen(false);
    setNewSnapshotName('');
    setNewSnapshotNote('');
    notify(`"${newSnap.snapshotName}" yedeği başarıyla oluşturuldu.`, 'success');
  };

  // Restore from snapshot
  const handleRestoreSnapshot = (snap: MonthEndSnapshot) => {
    if (confirm(`"${snap.snapshotName}" tarihli yedeğe geri dönmek üzeresiniz. Mevcut ekran bu yedeğin verileriyle güncellenecektir. Devam edilsin mi?`)) {
      setData(JSON.parse(JSON.stringify(snap.data)));
      setPreviewSnapshot(null);
      setActiveTab('balance');
      notify(`"${snap.snapshotName}" yedeğine başarıyla geri dönüldü. Artık üzerinde düzenleme yapabilirsiniz.`, 'success');
    }
  };

  // Delete snapshot
  const handleDeleteSnapshot = (id: string) => {
    if (confirm('Bu yedeği silmek istediğinize emin misiniz?')) {
      setSnapshots(prev => prev.filter(s => s.id !== id));
      notify('Yedek silindi.', 'success');
    }
  };

  // Export to Excel (Holding format)
  const handleExportExcel = () => {
    try {
      const wb = xlsx.utils.book_new();

      const sheet1Data = [
        ['DARS & ETAŞ KONSOLİDE AY SONU YÖNETİCİ RAPORU'],
        ['Dönem:', data.period, 'Rapor Tarihi:', new Date().toLocaleDateString('tr-TR')],
        [],
        ['VARLIKLAR (AKTİFLER)', 'TUTAR (TL)', '', 'BORÇLAR VE YÜKÜMLÜLÜKLER (PASİFLER)', 'TUTAR (TL)'],
        ['Araç Filosu & Çekiciler Toplamı', totalVehicles, '', 'Verilen Çekler & Açık Mal Toplamı', totalGivenChecks],
        ['Stoklar Toplamı (Et & Mamul)', totalStocks, '', 'Banka Kredileri & Şahıs Borçları', totalLoansAndDebts],
        ['Müşteri & Cari Alacakları', totalReceivables, '', 'İşletme & Maaş/Tazminat Borçları', totalOperationalDebts],
        ['Banka Mevduatları & Portföy Çek/Senet', totalBankAndLiquid],
        ['Şube Fazlaları & Diğer Varlıklar', totalOtherAssets],
        ['Geçmiş Dönem Bakiye Farkları', totalPastDeficits],
        [],
        ['TOPLAM VARLIKLAR', totalAssets, '', 'TOPLAM BORÇLAR', totalLiabilities],
        ['NET ŞİRKET POZİSYONU (ÖZKAYNAK FARKI)', netWorth],
      ];
      const ws1 = xlsx.utils.aoa_to_sheet(sheet1Data);
      xlsx.utils.book_append_sheet(wb, ws1, 'Yönetici Özeti & Bilanço');

      const pl = data.plStatement;
      const sheet2Data = [
        ['AYLIK OPERASYONEL GELİR TABLOSU (P&L)'],
        ['Dönem:', data.period],
        [],
        ['KALEM', 'TUTAR (TL)', 'CİROYA ORANI (%)'],
        ['Brüt Satış Geliri', pl.grossSales, '100%'],
        ['Satış İadeleri ve İskontolar', -pl.returnsAndDiscounts, `${((pl.returnsAndDiscounts / pl.grossSales) * 100).toFixed(1)}%`],
        ['NET SATIŞLAR (CİRO)', pl.netSales, `${((pl.netSales / pl.grossSales) * 100).toFixed(1)}%`],
        ['Satılan Malın Maliyeti (SMM)', -pl.cogs, `${((pl.cogs / pl.grossSales) * 100).toFixed(1)}%`],
        ['BRÜT KÂR', pl.grossProfit, `${((pl.grossProfit / pl.grossSales) * 100).toFixed(1)}%`],
        ['Personel Giderleri', -pl.personnelExpenses, `${((pl.personnelExpenses / pl.grossSales) * 100).toFixed(1)}%`],
        ['Tesis, Kira ve Enerji', -pl.facilityAndUtilities, `${((pl.facilityAndUtilities / pl.grossSales) * 100).toFixed(1)}%`],
        ['Lojistik ve Nakliye', -pl.transportAndLogistics, `${((pl.transportAndLogistics / pl.grossSales) * 100).toFixed(1)}%`],
        ['Diğer Faaliyet Giderleri', -pl.otherOpex, `${((pl.otherOpex / pl.grossSales) * 100).toFixed(1)}%`],
        ['FAALİYET KÂRI (FAVÖK / EBITDA)', pl.ebitda, `${((pl.ebitda / pl.grossSales) * 100).toFixed(1)}%`],
        ['Finansman ve Faiz Giderleri', -pl.financialAndInterest, `${((pl.financialAndInterest / pl.grossSales) * 100).toFixed(1)}%`],
        ['Amortisman (Filo Yıpranma Payı)', -pl.depreciation, `${((pl.depreciation / pl.grossSales) * 100).toFixed(1)}%`],
        ['Vergi Karşılığı', -pl.taxProvision, `${((pl.taxProvision / pl.grossSales) * 100).toFixed(1)}%`],
        ['NET DÖNEM KÂRI', pl.netProfit, `${((pl.netProfit / pl.grossSales) * 100).toFixed(1)}%`],
      ];
      const ws2 = xlsx.utils.aoa_to_sheet(sheet2Data);
      xlsx.utils.book_append_sheet(wb, ws2, 'Gelir Tablosu (P&L)');

      const sheet3Data = [
        ['VADE / TARİH', 'ALICI / CARİ', 'BANKA / TÜR', 'TUTAR (TL)', 'TÜR'],
        ...data.givenChecks.map(c => [c.dateStr || '-', c.recipient, c.bank, c.amount, c.type === 'check' ? 'Verilen Çek' : 'Açık Mal']),
        ['TOPLAM', '', '', totalGivenChecks],
      ];
      const ws3 = xlsx.utils.aoa_to_sheet(sheet3Data);
      xlsx.utils.book_append_sheet(wb, ws3, 'Çekler & Açık Mal Dökümü');

      xlsx.writeFile(wb, `Ay_Sonu_Konsolide_Raporu_${data.period}.xlsx`);
      notify('Excel raporu başarıyla indirildi.', 'success');
    } catch (err: any) {
      notify('Excel indirilirken hata oluştu: ' + (err?.message || ''), 'error');
    }
  };

  const filteredChecks = useMemo(() => {
    if (!checkSearch.trim()) return data.givenChecks;
    const q = checkSearch.toLowerCase();
    return data.givenChecks.filter(c => 
      c.recipient.toLowerCase().includes(q) || 
      c.bank.toLowerCase().includes(q) || 
      (c.dateStr && c.dateStr.includes(q))
    );
  }, [data.givenChecks, checkSearch]);

  const tahomaStyle = { fontFamily: 'Tahoma, Arial, sans-serif' };

  return (
    <div className="space-y-6 ay-sonu-print" style={tahomaStyle}>
      {/* Print-Only Executive Header */}
      <div className="hidden print:block mb-3 pb-2 border-b-2 border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight" style={tahomaStyle}>KONSOLİDE AY SONU BİLANÇO RAPORU</h1>
          </div>
          <div className="text-right text-xs text-gray-600 font-semibold" style={tahomaStyle}>
            <div>Tarih: {new Date().toLocaleDateString('tr-TR')}</div>
            <div>Net Pozisyon: <strong className="text-sm font-bold text-gray-900">{fmt(netWorth)}</strong></div>
          </div>
        </div>
      </div>

      {/* Header (Screen Only) */}
      <div className="no-print print:hidden">
        <PageHeader
          title="Ay Sonu"
          description="Konsolide varlık-borç dengesi, P&L kârlılık analizi ve tarihli kapanış yedekleme paneli."
          actions={
            <div className="flex flex-wrap items-center gap-2" style={tahomaStyle}>
              <button 
                className="btn-secondary flex items-center gap-1.5 text-sm font-semibold"
                onClick={() => setNewSnapshotModalOpen(true)}
                style={tahomaStyle}
              >
                <History size={16} className="text-purple-600" />
                <span>Yedek / Snapshot Al</span>
              </button>
              <button 
                className="btn-secondary flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                onClick={() => window.print()}
                style={tahomaStyle}
                title="Sayfayı Yazdır veya PDF Olarak Kaydet"
              >
                <Printer size={16} className="text-gray-600" />
                <span>Yazdır</span>
              </button>
              <button 
                className="btn-primary flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-sm font-bold"
                onClick={handleExportExcel}
                style={tahomaStyle}
              >
                <FileSpreadsheet size={16} />
                <span>Excel İndir</span>
              </button>
            </div>
          }
        />
      </div>

      {/* Top Executive KPI Cards (Screen Only) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 no-print print:hidden" style={tahomaStyle}>
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Toplam Varlıklar</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><Building2 size={18} /></div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-900" style={tahomaStyle}>{fmt(totalAssets)}</div>
          <p className="mt-1 text-[12px] text-gray-500 font-medium">Araçlar, Stok, Banka, Alacaklar</p>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Toplam Borçlar</span>
            <div className="rounded-lg bg-red-50 p-2 text-red-600"><TrendingDown size={18} /></div>
          </div>
          <div className="mt-2 text-2xl font-black text-red-900" style={tahomaStyle}>{fmt(totalLiabilities)}</div>
          <p className="mt-1 text-[12px] text-gray-500 font-medium">Çekler, Krediler, Şahıs Borçları</p>
        </div>

        <div className={`rounded-xl border p-4 shadow-sm ${netWorth >= 0 ? 'border-emerald-100 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-600">Net Şirket Pozisyonu</span>
            <div className={`rounded-lg p-2 ${netWorth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><Wallet size={18} /></div>
          </div>
          <div className={`mt-2 text-2xl font-black ${netWorth >= 0 ? 'text-emerald-900' : 'text-amber-900'}`} style={tahomaStyle}>{fmt(netWorth)}</div>
          <p className="mt-1 text-[12px] text-gray-500 font-medium">Varlıklar - Borçlar (Özkaynak)</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Aylık Net Kâr (P&L)</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><TrendingUp size={18} /></div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700" style={tahomaStyle}>{fmt(data.plStatement.netProfit)}</div>
          <p className="mt-1 text-[12px] text-emerald-600 font-bold">%3.4 Net Kâr Marjı</p>
        </div>

        <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">FAVÖK (EBITDA)</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600"><Layers size={18} /></div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-900" style={tahomaStyle}>{fmt(data.plStatement.ebitda)}</div>
          <p className="mt-1 text-[12px] text-purple-700 font-bold">Operasyonel Kâr Gücü</p>
        </div>
      </div>

      {/* Navigation Tabs (Screen Only) */}
      <div className="flex border-b border-gray-200 bg-white px-4 pt-3 rounded-t-xl shadow-sm no-print print:hidden" style={tahomaStyle}>
        <button
          onClick={() => setActiveTab('balance')}
          className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-[14px] font-bold transition-all ${
            activeTab === 'balance'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          style={tahomaStyle}
        >
          <Building2 size={16} />
          <span>1. Konsolide Bilanço (Varlık & Borç)</span>
        </button>

        <button
          onClick={() => setActiveTab('pl')}
          className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-[14px] font-bold transition-all ${
            activeTab === 'pl'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          style={tahomaStyle}
        >
          <TrendingUp size={16} />
          <span>2. Gelir Tablosu (P&L - Kâr/Zarar)</span>
        </button>

        <button
          onClick={() => setActiveTab('liquidity')}
          className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-[14px] font-bold transition-all ${
            activeTab === 'liquidity'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          style={tahomaStyle}
        >
          <Clock size={16} />
          <span>3. Vade & Likidite Analizi</span>
        </button>

        <button
          onClick={() => setActiveTab('checks')}
          className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-[14px] font-bold transition-all ${
            activeTab === 'checks'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          style={tahomaStyle}
        >
          <FileSpreadsheet size={16} />
          <span>4. Çekler & Açık Mal ({data.givenChecks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('snapshots')}
          className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-[14px] font-bold transition-all ${
            activeTab === 'snapshots'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-lg'
              : 'border-transparent text-purple-600 hover:text-purple-800'
          }`}
          style={tahomaStyle}
        >
          <History size={16} />
          <span>📸 Tarihli Yedekler & Sürüm Paneli ({snapshots.length})</span>
        </button>
      </div>

      {/* Tab 1: Balance Sheet */}
      {activeTab === 'balance' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 ay-sonu-columns" style={tahomaStyle}>
          {/* Sol Kolon: Varlıklar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 header-card">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-black text-blue-950 flex items-center gap-2" style={tahomaStyle}>
                  <Building2 size={20} className="text-blue-600" />
                  A. ŞİRKETİN TÜM VARLIKLARI (AKTİFLER)
                </h3>
                <span className="text-[17px] font-black text-blue-900" style={tahomaStyle}>{fmt(totalAssets)}</span>
              </div>
            </div>

            {/* 1. Gayrimenkuller, Arsalar & Tesisler */}
            {(data.realEstates && data.realEstates.length > 0) && (
              <div className="card overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-3">
                  <span className="text-[15px] font-bold text-gray-900" style={tahomaStyle}>1. Gayrimenkuller, Arsalar & Tesisler ({data.realEstates.length} Kalem)</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenAdd('realEstates', 'Gayrimenkul / Tesis')}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 text-[12px] font-bold transition-all"
                      title="Yeni Gayrimenkul Ekle"
                    >
                      <Plus size={14} /> Ekle
                    </button>
                    <span className="text-[16px] font-black text-blue-700" style={tahomaStyle}>{fmt(totalRealEstates)}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {data.realEstates.map((re, i) => (
                    <div key={re.id || i} className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <span className="text-[14px] font-medium text-gray-800" style={tahomaStyle}>{re.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[14.5px] font-bold text-gray-950" style={tahomaStyle}>{fmt(re.value)}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit('realEstates', 'Gayrimenkul Düzenle', re)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Düzenle"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem('realEstates', re.id, re.name)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Araç Filosu */}
            <div className="card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-3">
                <span className="text-[15px] font-bold text-gray-900" style={tahomaStyle}>2. Araç Filosu & Çekiciler ({data.vehicles.length} Araç)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('vehicles', 'Araç Filosu & Çekici')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 text-[12px] font-bold transition-all"
                    title="Yeni Araç Ekle"
                  >
                    <Plus size={14} /> Ekle
                  </button>
                  <span className="text-[16px] font-black text-blue-700" style={tahomaStyle}>{fmt(totalVehicles)}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {data.vehicles.map((v, i) => (
                  <div key={v.id || i} className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="text-[14px] font-medium text-gray-800" style={tahomaStyle}>{v.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-bold text-gray-950" style={tahomaStyle}>{fmt(v.value)}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit('vehicles', 'Araç Düzenle', v)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Düzenle"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem('vehicles', v.id, v.name)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Şube Fazlaları & Diğer Varlıklar */}
            <div className="card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-3">
                <span className="text-[15px] font-bold text-gray-900" style={tahomaStyle}>5. Şube Fazlaları & Diğer Varlıklar</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('otherAssets', 'Şube / Diğer Varlık')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 text-[12px] font-bold transition-all"
                    title="Yeni Varlık Ekle"
                  >
                    <Plus size={14} /> Ekle
                  </button>
                  <span className="text-[16px] font-black text-purple-700" style={tahomaStyle}>{fmt(totalOtherAssets)}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {data.otherAssets.map((o, i) => (
                  <div key={o.id || i} className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="text-[14px] font-medium text-gray-800" style={tahomaStyle}>{o.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-bold text-gray-950" style={tahomaStyle}>{fmt(o.value)}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit('otherAssets', 'Varlık Düzenle', o)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Düzenle"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem('otherAssets', o.id, o.name)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Geçmiş Dönem Eksikleri */}
            <div className="card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-3">
                <span className="text-[15px] font-bold text-gray-900" style={tahomaStyle}>6. Geçmiş Dönem Bakiye Farkları</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('pastDeficits', 'Geçmiş Dönem Farkı')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 text-[12px] font-bold transition-all"
                    title="Yeni Fark Ekle"
                  >
                    <Plus size={14} /> Ekle
                  </button>
                  <span className="text-[16px] font-black text-amber-700" style={tahomaStyle}>{fmt(totalPastDeficits)}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {data.pastDeficits.map((p, i) => (
                  <div key={p.id || i} className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="text-[14px] font-medium text-gray-800" style={tahomaStyle}>{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[14.5px] font-bold ${p.value < 0 ? 'text-red-600' : 'text-gray-950'}`} style={tahomaStyle}>{fmt(p.value)}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit('pastDeficits', 'Bakiye Farkı Düzenle', p)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Düzenle"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem('pastDeficits', p.id, p.name)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Borçlar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 header-card">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-black text-red-950 flex items-center gap-2" style={tahomaStyle}>
                  <TrendingDown size={20} className="text-red-600" />
                  B. ŞİRKETİN TÜM BORÇLARI (PASİFLER)
                </h3>
                <span className="text-[17px] font-black text-red-900" style={tahomaStyle}>{fmt(totalLiabilities)}</span>
              </div>
            </div>

            {/* 1. Verilen Çekler ve Açık Mal */}
            <div className="card overflow-hidden border-2 border-red-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-red-100 bg-red-50/80 px-4 py-3">
                <div>
                  <span className="text-[15px] font-black text-red-950" style={tahomaStyle}>1. Verilen Çekler & Açık Mal Ödemeleri</span>
                  <span className="ml-2 text-[12px] text-red-700 font-bold">({data.givenChecks.length} Kalem)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('givenChecks', 'Çek / Açık Mal Ödemesi')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 hover:bg-red-200 text-[12px] font-bold transition-all"
                    title="Yeni Çek / Açık Mal Ekle"
                  >
                    <Plus size={14} /> Ekle
                  </button>
                  <span className="text-[16px] font-black text-red-700" style={tahomaStyle}>{fmt(totalGivenChecks)}</span>
                </div>
              </div>
              <div className="p-3 bg-white text-[13px] text-gray-600 flex justify-between items-center" style={tahomaStyle}>
                <span>Vadesi gelen tüm piyasa çekleri ve açık mal tedarikçi ödemeleridir.</span>
                <button 
                  onClick={() => setActiveTab('checks')}
                  className="text-[13px] text-brand-600 font-bold hover:underline flex items-center gap-1"
                  style={tahomaStyle}
                >
                  Detayları Gör <ArrowUpRight size={14} />
                </button>
              </div>
            </div>

            {/* 2. Banka Kredileri & Şahıs Borçları */}
            <div className="card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-3">
                <span className="text-[15px] font-bold text-gray-900" style={tahomaStyle}>2. Banka Kredileri, Faizler & Şahıs Borçları</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('loansAndPersonalDebts', 'Kredi / Şahıs Borcu')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 hover:bg-red-200 text-[12px] font-bold transition-all"
                    title="Yeni Borç Ekle"
                  >
                    <Plus size={14} /> Ekle
                  </button>
                  <span className="text-[16px] font-black text-red-700" style={tahomaStyle}>{fmt(totalLoansAndDebts)}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {data.loansAndPersonalDebts.map((d, i) => (
                  <div key={d.id || i} className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <div>
                      <span className="text-[14px] font-semibold text-gray-900" style={tahomaStyle}>{d.name}</span>
                      <span className="ml-2 text-[11px] text-gray-500 font-medium">({d.category})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-bold text-red-600" style={tahomaStyle}>{fmt(d.amount)}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit('loansAndPersonalDebts', 'Borç Düzenle', d)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Düzenle"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem('loansAndPersonalDebts', d.id, d.name)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SONUÇ Kartı (Excel Formatı) */}
            <div className={`rounded-xl border-2 p-4 shadow-sm net-denge-card ${netWorth >= 0 ? 'border-emerald-400 bg-emerald-50/80' : 'border-red-300 bg-red-50/80'}`}>
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2 mb-3">
                <h4 className="text-[14px] font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5" style={tahomaStyle}>
                  📊 SONUÇ
                </h4>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/80 text-gray-700 border border-gray-200">
                  Konsolide Denge
                </span>
              </div>
              <div className="space-y-2 text-[13.5px]" style={tahomaStyle}>
                <div className="flex items-center justify-between text-gray-800">
                  <span className="font-semibold">sermaye + demirbaş:</span>
                  <span className="font-bold text-blue-900">{fmt(totalAssets)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-800">
                  <span className="font-semibold">borçlar:</span>
                  <span className="font-bold text-red-700">{fmt(totalLiabilities)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-300/80">
                  <span className="font-black text-gray-900 text-[14.5px]">kalan alacağımız:</span>
                  <span className={`text-[18px] font-black ${netWorth >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                    {fmt(netWorth)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Stoklar (Et, Sakatat, Mamul) */}
            <div className="card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-3">
                <span className="text-[15px] font-bold text-gray-900" style={tahomaStyle}>2. Stoklar (Et, Sakatat, Mamul)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('stocks', 'Stok Kalemi')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-[12px] font-bold transition-all"
                    title="Yeni Stok Ekle"
                  >
                    <Plus size={14} /> Ekle
                  </button>
                  <span className="text-[16px] font-black text-emerald-700" style={tahomaStyle}>{fmt(totalStocks)}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {data.stocks.map((s, i) => (
                  <div key={s.id || i} className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="text-[14px] font-medium text-gray-800" style={tahomaStyle}>{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-bold text-gray-950" style={tahomaStyle}>{fmt(s.value)}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit('stocks', 'Stok Düzenle', s)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Düzenle"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem('stocks', s.id, s.name)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Müşteri & Cari Alacakları */}
            <div className="card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-3">
                <span className="text-[15px] font-bold text-gray-900" style={tahomaStyle}>3. Müşteri Carileri & Alacaklar</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('receivables', 'Müşteri Cari / Alacak')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-[12px] font-bold transition-all"
                    title="Yeni Alacak Ekle"
                  >
                    <Plus size={14} /> Ekle
                  </button>
                  <span className="text-[16px] font-black text-indigo-700" style={tahomaStyle}>{fmt(totalReceivables)}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {data.receivables.map((r, i) => (
                  <div key={r.id || i} className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="text-[14px] font-medium text-gray-800" style={tahomaStyle}>{r.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-bold text-gray-950" style={tahomaStyle}>{fmt(r.value)}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit('receivables', 'Alacak Düzenle', r)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Düzenle"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem('receivables', r.id, r.name)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Banka Mevduatları & Portföy Çek/Senetler */}
            <div className="card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-3">
                <span className="text-[15px] font-bold text-gray-900" style={tahomaStyle}>4. Banka Mevduatları & Portföy Çek/Senetler</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('bankAndLiquid', 'Banka / Likit Kalemi')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-700 hover:bg-cyan-200 text-[12px] font-bold transition-all"
                    title="Yeni Banka / Portföy Ekle"
                  >
                    <Plus size={14} /> Ekle
                  </button>
                  <span className="text-[16px] font-black text-cyan-700" style={tahomaStyle}>{fmt(totalBankAndLiquid)}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {data.bankAndLiquid.map((b, i) => (
                  <div key={b.id || i} className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="text-[14px] font-medium text-gray-800" style={tahomaStyle}>{b.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-bold text-gray-950" style={tahomaStyle}>{fmt(b.value)}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit('bankAndLiquid', 'Banka / Likit Düzenle', b)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Düzenle"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem('bankAndLiquid', b.id, b.name)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: P&L Income Statement */}
      {activeTab === 'pl' && (
        <div className="space-y-6" style={tahomaStyle}>
          <div className="card p-6">
            <h3 className="text-[18px] font-bold text-gray-900 mb-1" style={tahomaStyle}>Aylık Operasyonel Gelir & Kârlılık Tablosu (P&L)</h3>
            <p className="text-[13px] text-gray-500 mb-6 font-medium">Holding standartlarında net ciro, satılan malın maliyeti (SMM), işletme giderleri (OPEX) ve net dönem kârı.</p>

            <div className="space-y-3 font-sans">
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-blue-50/80 border border-blue-100">
                <div>
                  <div className="text-[15px] font-black text-blue-950" style={tahomaStyle}>1. NET SATIŞ GELİRLERİ (CİRO)</div>
                  <div className="text-[12px] text-blue-700 font-medium">Tüm kesilen faturalar, mağaza ve toptan et satışları</div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-black text-blue-950" style={tahomaStyle}>{fmt(data.plStatement.netSales)}</div>
                  <div className="text-[12px] text-blue-600 font-bold">%100</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg bg-gray-50 border border-gray-200">
                <div>
                  <div className="text-[14.5px] font-bold text-gray-800" style={tahomaStyle}>- Satılan Malın Maliyeti (SMM)</div>
                  <div className="text-[12px] text-gray-500 font-medium">Canlı hayvan alımları, kesim ve hammadde maliyeti</div>
                </div>
                <div className="text-right">
                  <div className="text-[16px] font-bold text-red-600" style={tahomaStyle}>- {fmt(data.plStatement.cogs)}</div>
                  <div className="text-[12px] text-gray-500 font-bold">%{((data.plStatement.cogs / data.plStatement.netSales) * 100).toFixed(1)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <div>
                  <div className="text-[15px] font-black text-emerald-950" style={tahomaStyle}>= BRÜT KÂR</div>
                  <div className="text-[12px] text-emerald-700 font-medium">Satışlardan kalan brüt marj</div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-black text-emerald-900" style={tahomaStyle}>{fmt(data.plStatement.grossProfit)}</div>
                  <div className="text-[12px] text-emerald-700 font-bold">%{((data.plStatement.grossProfit / data.plStatement.netSales) * 100).toFixed(1)} Brüt Marj</div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2.5">
                <div className="text-[13px] font-bold uppercase text-gray-700" style={tahomaStyle}>- Faaliyet Giderleri (OPEX):</div>
                <div className="grid grid-cols-2 gap-3 text-[13.5px] text-gray-700 pl-3">
                  <div className="flex justify-between"><span>• Personel & Maaşlar:</span><span className="font-bold text-gray-900" style={tahomaStyle}>{fmt(data.plStatement.personnelExpenses)}</span></div>
                  <div className="flex justify-between"><span>• Tesis, Kira & Enerji:</span><span className="font-bold text-gray-900" style={tahomaStyle}>{fmt(data.plStatement.facilityAndUtilities)}</span></div>
                  <div className="flex justify-between"><span>• Nakliye & Lojistik:</span><span className="font-bold text-gray-900" style={tahomaStyle}>{fmt(data.plStatement.transportAndLogistics)}</span></div>
                  <div className="flex justify-between"><span>• Diğer İşletme Masrafları:</span><span className="font-bold text-gray-900" style={tahomaStyle}>{fmt(data.plStatement.otherOpex)}</span></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg bg-purple-50 border border-purple-200">
                <div>
                  <div className="text-[15px] font-black text-purple-950" style={tahomaStyle}>= FAALİYET KÂRI (FAVÖK / EBITDA)</div>
                  <div className="text-[12px] text-purple-700 font-medium">Şirketin asıl operasyonel kâr gücü</div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-black text-purple-900" style={tahomaStyle}>{fmt(data.plStatement.ebitda)}</div>
                  <div className="text-[12px] text-purple-700 font-bold">%{((data.plStatement.ebitda / data.plStatement.netSales) * 100).toFixed(1)} FAVÖK Marjı</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg bg-gray-50 border border-gray-200">
                <div>
                  <span className="font-semibold text-gray-700 text-[14px]" style={tahomaStyle}>- Finansman Giderleri & Faiz: </span>
                  <span className="text-gray-500 text-[12px]">Kredi faizleri ve POS kesintileri</span>
                </div>
                <span className="font-bold text-red-600 text-[15px]" style={tahomaStyle}>- {fmt(data.plStatement.financialAndInterest)}</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md">
                <div>
                  <div className="text-[16px] font-black tracking-wide" style={tahomaStyle}>⭐ NET DÖNEM KÂRI</div>
                  <div className="text-[12px] text-emerald-100 font-medium">Tüm maliyetler, giderler, faizler ve vergiler düşüldükten sonra kalan net kâr</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black" style={tahomaStyle}>{fmt(data.plStatement.netProfit)}</div>
                  <div className="text-[12px] text-emerald-100 font-bold">Net Kâr Marjı: %{((data.plStatement.netProfit / data.plStatement.netSales) * 100).toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Liquidity & Maturity */}
      {activeTab === 'liquidity' && (
        <div className="space-y-6" style={tahomaStyle}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-5 border-l-4 border-l-red-500 shadow-sm">
              <span className="text-[12px] font-bold uppercase tracking-wider text-red-700">1. Kısa Vade (0 - 30 Gün)</span>
              <h4 className="text-[16px] font-black text-gray-900 mt-1" style={tahomaStyle}>Acil Likidite Dengesi</h4>
              <p className="text-[12px] text-gray-500 mt-1 font-medium">Bu ay içinde vadesi gelen çekler, personel maaşları ve açık mal borçları.</p>
              
              <div className="mt-4 space-y-2.5 text-[14px]">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Ödenecek Çek & Açık Mal:</span>
                  <span className="font-bold text-red-600" style={tahomaStyle}>{fmt(totalGivenChecks * 0.45)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Mevcut Banka & Nakit:</span>
                  <span className="font-bold text-emerald-600" style={tahomaStyle}>{fmt(totalBankAndLiquid)}</span>
                </div>
              </div>
            </div>

            <div className="card p-5 border-l-4 border-l-amber-500 shadow-sm">
              <span className="text-[12px] font-bold uppercase tracking-wider text-amber-700">2. Orta Vade (1 - 3 Ay)</span>
              <h4 className="text-[16px] font-black text-gray-900 mt-1" style={tahomaStyle}>Gelecek Ay Çek Yükü</h4>
              <p className="text-[12px] text-gray-500 mt-1 font-medium">Ekim ve Kasım vadeli çekler ile tahsil edilecek müşteri senetleri.</p>
              
              <div className="mt-4 space-y-2.5 text-[14px]">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Ekim/Kasım Çek Borçları:</span>
                  <span className="font-bold text-red-600" style={tahomaStyle}>{fmt(totalGivenChecks * 0.55)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Portföy Senet & Çek Tahsilatı:</span>
                  <span className="font-bold text-blue-600" style={tahomaStyle}>{fmt(78991650)}</span>
                </div>
              </div>
            </div>

            <div className="card p-5 border-l-4 border-l-blue-500 shadow-sm">
              <span className="text-[12px] font-bold uppercase tracking-wider text-blue-700">3. Uzun Vade (12+ Ay)</span>
              <h4 className="text-[16px] font-black text-gray-900 mt-1" style={tahomaStyle}>Yapılandırılmış Krediler</h4>
              <p className="text-[12px] text-gray-500 mt-1 font-medium">24 aylık TEB kredisi ve uzun vadeli filo araç kredileri.</p>
              
              <div className="mt-4 space-y-2.5 text-[14px]">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Uzun Vadeli Kredi Anaparası:</span>
                  <span className="font-bold text-gray-950" style={tahomaStyle}>{fmt(19379173)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Aylık Kredi Taksit Yükü:</span>
                  <span className="font-bold text-gray-950" style={tahomaStyle}>{fmt(1520000)} / Ay</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Checks & Open Goods */}
      {activeTab === 'checks' && (
        <div className="space-y-4" style={tahomaStyle}>
          <div className="card p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  className="input pl-9 text-[13.5px]"
                  placeholder="Alıcı adı, banka veya tarih ara..."
                  value={checkSearch}
                  onChange={e => setCheckSearch(e.target.value)}
                  style={tahomaStyle}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenAdd('givenChecks', 'Çek / Açık Mal Ödemesi')}
                  className="btn-primary flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-[13px] font-bold"
                  style={tahomaStyle}
                >
                  <Plus size={16} /> Yeni Çek / Açık Mal Ekle
                </button>
                <div className="text-[13.5px] text-gray-600" style={tahomaStyle}>
                  Toplam <span className="font-bold text-gray-900">{filteredChecks.length}</span> kalem · Toplam: <span className="font-black text-red-700">{fmt(filteredChecks.reduce((s, c) => s + c.amount, 0))}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card overflow-x-auto shadow-sm">
            <table className="min-w-full text-[13.5px]" style={tahomaStyle}>
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="table-th text-[13.5px]">Vade / Tarih</th>
                  <th className="table-th text-[13.5px]">Alıcı / Cari Adı</th>
                  <th className="table-th text-[13.5px]">Banka / Ödeme Türü</th>
                  <th className="table-th text-[13.5px]">Tür</th>
                  <th className="table-th text-[13.5px] text-right">Tutar</th>
                  <th className="table-th text-[13.5px] text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredChecks.map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium text-gray-700">{c.dateStr || '-'}</td>
                    <td className="table-td font-bold text-gray-950">{c.recipient}</td>
                    <td className="table-td">
                      <span className={`rounded px-2 py-0.5 font-bold text-[12px] ${
                        c.type === 'open_good' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
                      }`}>
                        {c.bank}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        c.type === 'open_good' ? 'bg-amber-100 text-amber-800' : 'bg-red-50 text-red-700'
                      }`}>
                        {c.type === 'open_good' ? 'Açık Mal' : 'Verilen Çek'}
                      </span>
                    </td>
                    <td className="table-td text-right font-black text-red-600">{fmt(c.amount)}</td>
                    <td className="table-td text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit('givenChecks', 'Çek / Açık Mal Düzenle', c)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Düzenle"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem('givenChecks', c.id, c.recipient)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Snapshots / Backup History */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4" style={tahomaStyle}>
          <div className="card p-5 border-l-4 border-l-purple-600 bg-purple-50/30 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-black text-purple-950 flex items-center gap-2" style={tahomaStyle}>
                  <History size={18} className="text-purple-600" />
                  Tarihli Kapanış Yedekleri & Versiyon Paneli
                </h3>
                <p className="text-[13px] text-gray-600 mt-1 font-medium">
                  İstediğiniz zaman bir yedek oluşturabilir, geçmiş ayların kopyalarını inceleyebilir ve tek tıkla eski sürüme geri dönebilirsiniz.
                </p>
              </div>
              <button
                className="btn-primary flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-sm font-bold"
                onClick={() => setNewSnapshotModalOpen(true)}
                style={tahomaStyle}
              >
                <Plus size={16} />
                <span>Yeni Yedek / Snapshot Al</span>
              </button>
            </div>
          </div>

          <div className="card overflow-x-auto shadow-sm">
            <table className="min-w-full text-[13.5px]" style={tahomaStyle}>
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="table-th text-[13.5px]">Yedek Adı</th>
                  <th className="table-th text-[13.5px]">Dönem</th>
                  <th className="table-th text-[13.5px]">Yedek Tarihi</th>
                  <th className="table-th text-[13.5px]">Oluşturan</th>
                  <th className="table-th text-[13.5px] text-right">Toplam Varlık</th>
                  <th className="table-th text-[13.5px] text-right">Toplam Borç</th>
                  <th className="table-th text-[13.5px] text-right">Net Fark</th>
                  <th className="table-th text-[13.5px] text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snapshots.map(snap => (
                  <tr key={snap.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="table-td">
                      <div className="font-bold text-gray-950">{snap.snapshotName}</div>
                      {snap.note && <div className="text-[12px] text-gray-500 mt-0.5">{snap.note}</div>}
                    </td>
                    <td className="table-td font-bold text-brand-600">{snap.period}</td>
                    <td className="table-td text-gray-600 font-medium">{new Date(snap.createdAt).toLocaleString('tr-TR')}</td>
                    <td className="table-td text-gray-800 font-medium">{snap.createdByName}</td>
                    <td className="table-td text-right font-black text-blue-700">{fmt(snap.totalAssets)}</td>
                    <td className="table-td text-right font-black text-red-600">{fmt(snap.totalLiabilities)}</td>
                    <td className="table-td text-right font-black text-amber-800">{fmt(snap.netWorth)}</td>
                    <td className="table-td text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          className="btn-secondary py-1 px-2.5 text-[12px] font-bold text-purple-700 border-purple-200 hover:bg-purple-50"
                          onClick={() => setPreviewSnapshot(snap)}
                          title="Önizle"
                          style={tahomaStyle}
                        >
                          <Eye size={14} className="inline mr-1" /> Önizle
                        </button>
                        <button
                          className="btn-primary py-1 px-2.5 text-[12px] font-bold bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleRestoreSnapshot(snap)}
                          title="Bu Yedeğe Geri Dön"
                          style={tahomaStyle}
                        >
                          <RotateCcw size={14} className="inline mr-1" /> Geri Yükle
                        </button>
                        {snapshots.length > 1 && (
                          <button
                            className="p-1 text-gray-400 hover:text-red-600"
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            title="Yedeği Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {itemModalOpen && activeSection && editingItem && (
        <Modal
          open={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          title={editingItem.id ? `Düzenle: ${activeSection.title}` : `Yeni Ekle: ${activeSection.title}`}
          description="Kalem bilgilerini girin veya düzenleyin."
        >
          <div className="space-y-4" style={tahomaStyle}>
            <div>
              <label className="label text-[13.5px] font-bold">Kalem Adı / Açıklama</label>
              <input
                type="text"
                className="input text-[13.5px]"
                value={editingItem.name}
                onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                placeholder="Örn: Yeni Alınan Dorse, Ziraat Hesabı, Açık Mal Carisi vb."
                required
                style={tahomaStyle}
              />
            </div>

            <div>
              <label className="label text-[13.5px] font-bold">Tutar (TL)</label>
              <input
                type="text"
                inputMode="numeric"
                className="input text-[14.5px] font-bold tracking-wide"
                value={formatNumberWithDots(editingItem.value)}
                onChange={e => {
                  const num = parseFormattedNumber(e.target.value);
                  setEditingItem({ ...editingItem, value: num });
                }}
                placeholder="0"
                required
                style={tahomaStyle}
              />
            </div>

            {activeSection.key === 'givenChecks' && (
              <>
                <div>
                  <label className="label text-[13.5px] font-bold">Banka / Ödeme Kanalı</label>
                  <input
                    type="text"
                    className="input text-[13.5px]"
                    value={editingItem.bank || ''}
                    onChange={e => setEditingItem({ ...editingItem, bank: e.target.value })}
                    placeholder="Örn: E.İŞBANK, M.AKBANK, AÇIK MAL vb."
                    style={tahomaStyle}
                  />
                </div>
                <div>
                  <label className="label text-[13.5px] font-bold">Vade / Tarih</label>
                  <input
                    type="text"
                    className="input text-[13.5px]"
                    value={editingItem.dateStr || ''}
                    onChange={e => setEditingItem({ ...editingItem, dateStr: e.target.value })}
                    placeholder="Örn: 15/09/2026"
                    style={tahomaStyle}
                  />
                </div>
                <div>
                  <label className="label text-[13.5px] font-bold">Tür</label>
                  <select
                    className="input text-[13.5px]"
                    value={editingItem.type || 'check'}
                    onChange={e => setEditingItem({ ...editingItem, type: e.target.value as any })}
                    style={tahomaStyle}
                  >
                    <option value="check">Verilen Çek</option>
                    <option value="open_good">Açık Mal Ödemesi</option>
                  </select>
                </div>
              </>
            )}

            {activeSection.key !== 'givenChecks' && (
              <div>
                <label className="label text-[13.5px] font-bold">Kategori / Not (Opsiyonel)</label>
                <input
                  type="text"
                  className="input text-[13.5px]"
                  value={editingItem.category || ''}
                  onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                  placeholder="Örn: Çekici, Dorse, Banka Kredisi, Emanet vb."
                  style={tahomaStyle}
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-3">
              <button
                className="btn-primary flex-1 bg-brand-600 hover:bg-brand-700 text-sm font-bold py-2.5"
                onClick={handleSaveItem}
                style={tahomaStyle}
              >
                <Check size={16} className="inline mr-1" /> Kaydet
              </button>
              <button
                className="btn-secondary text-sm font-semibold py-2.5"
                onClick={() => setItemModalOpen(false)}
                style={tahomaStyle}
              >
                İptal
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Snapshot Modal */}
      <Modal
        open={newSnapshotModalOpen}
        onClose={() => setNewSnapshotModalOpen(false)}
        title="Yeni Kapanış Yedeği (Snapshot) Al"
        description="Mevcut ay sonu tablosunu tüm varlıkları, borçları ve kâr/zarar verileriyle birlikte kalıcı bir yedek olarak kaydedin."
      >
        <div className="space-y-4" style={tahomaStyle}>
          <div>
            <label className="label text-[13.5px] font-bold">Yedek Adı</label>
            <input
              type="text"
              className="input text-[13.5px]"
              value={newSnapshotName}
              onChange={e => setNewSnapshotName(e.target.value)}
              placeholder="Örn: 2026-08 Ay Sonu Nihai Kapanış Yedeği"
              required
              style={tahomaStyle}
            />
          </div>
          <div>
            <label className="label text-[13.5px] font-bold">Açıklama / Not (Opsiyonel)</label>
            <textarea
              className="input min-h-20 text-[13.5px]"
              value={newSnapshotNote}
              onChange={e => setNewSnapshotNote(e.target.value)}
              placeholder="Örn: Banka hesapları ve çekler doğrulandıktan sonra alınan yedek."
              style={tahomaStyle}
            />
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-[13px] text-gray-700 space-y-1.5">
            <div className="flex justify-between"><span>Kaydedilecek Varlık Toplamı:</span><span className="font-bold text-blue-700" style={tahomaStyle}>{fmt(totalAssets)}</span></div>
            <div className="flex justify-between"><span>Kaydedilecek Borç Toplamı:</span><span className="font-bold text-red-600" style={tahomaStyle}>{fmt(totalLiabilities)}</span></div>
            <div className="flex justify-between"><span>Net Şirket Farkı:</span><span className="font-bold text-amber-800" style={tahomaStyle}>{fmt(netWorth)}</span></div>
          </div>
          <button
            className="btn-primary w-full bg-purple-600 hover:bg-purple-700 text-sm font-bold py-2.5"
            onClick={handleCreateSnapshot}
            style={tahomaStyle}
          >
            Yedeği Şimdi Kaydet
          </button>
        </div>
      </Modal>

      {/* Preview Snapshot Modal */}
      {previewSnapshot && (
        <Modal
          open={Boolean(previewSnapshot)}
          onClose={() => setPreviewSnapshot(null)}
          title={`Yedek Önizleme: ${previewSnapshot.snapshotName}`}
          description={`Tarih: ${new Date(previewSnapshot.createdAt).toLocaleString('tr-TR')} · Oluşturan: ${previewSnapshot.createdByName}`}
        >
          <div className="space-y-4 text-[13.5px]" style={tahomaStyle}>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <div className="text-gray-500 font-medium text-[12px]">Toplam Varlık</div>
                <div className="text-[16px] font-black text-blue-900 mt-1" style={tahomaStyle}>{fmt(previewSnapshot.totalAssets)}</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <div className="text-gray-500 font-medium text-[12px]">Toplam Borç</div>
                <div className="text-[16px] font-black text-red-900 mt-1" style={tahomaStyle}>{fmt(previewSnapshot.totalLiabilities)}</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-center">
                <div className="text-gray-500 font-medium text-[12px]">Net Durum</div>
                <div className="text-[16px] font-black text-amber-900 mt-1" style={tahomaStyle}>{fmt(previewSnapshot.netWorth)}</div>
              </div>
            </div>

            {previewSnapshot.note && (
              <div className="p-2.5 bg-gray-50 rounded border border-gray-200 text-gray-800 italic">
                "{previewSnapshot.note}"
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700 text-sm font-bold py-2"
                onClick={() => handleRestoreSnapshot(previewSnapshot)}
                style={tahomaStyle}
              >
                <RotateCcw size={15} className="inline mr-1" /> Bu Yedeği Geri Yükle
              </button>
              <button
                className="btn-secondary text-sm font-semibold"
                onClick={() => setPreviewSnapshot(null)}
                style={tahomaStyle}
              >
                Kapat
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
