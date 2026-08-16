import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { Plus, Trash2, CalendarDays, Percent, Coins, ArrowRightLeft, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Modal } from '../../components/ui/Modal';

interface CheckRow {
  id: string;
  dueDate: string;
  amount: number;
}

interface TargetDateRow {
  id: string;
  dueDate: string;
  amount: number;
}

export function CheckValuationPage() {
  const [activeTab, setActiveTab] = useState<'commission' | 'target'>('commission');

  // Common Inputs
  const [baseDate, setBaseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [monthlyRate, setMonthlyRate] = useState<number>(5.94);

  // Tab 1: Commission Calculator state
  const [checks, setChecks] = useState<CheckRow[]>(() => {
    const saved = localStorage.getItem('check-valuation-checks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing saved checks', e);
      }
    }
    return [
      { id: '1', dueDate: '', amount: 0 },
      { id: '2', dueDate: '', amount: 0 },
      { id: '3', dueDate: '', amount: 0 },
      { id: '4', dueDate: '', amount: 0 },
      { id: '5', dueDate: '', amount: 0 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('check-valuation-checks', JSON.stringify(checks));
  }, [checks]);

  const { user } = useAuth();
  const [ebsLoading, setEbsLoading] = useState(false);

  // EBS Import Modal States
  const [isEbsModalOpen, setIsEbsModalOpen] = useState(false);
  const [ebsChecks, setEbsChecks] = useState<any[]>([]);
  const [selectedEbsIds, setSelectedEbsIds] = useState<Set<string>>(new Set());
  const [ebsSearch, setEbsSearch] = useState('');

  const handleImportFromEbs = async () => {
    if (!user?.organizationId) return;
    setEbsLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('ebs_checks')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('check_type', 'alinan')
        .eq('document_type', 'cek')
        .gte('due_date', todayStr)
        .order('due_date', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setEbsChecks(data);
        setSelectedEbsIds(new Set());
        setEbsSearch('');
        setIsEbsModalOpen(true);
      } else {
        alert('EBS tablosunda içe aktarılabilecek alınan çek bulunamadı. Lütfen önce ofis bilgisayarından senkronizasyon yapın.');
      }
    } catch (err: any) {
      console.error(err);
      alert('EBS verisi yüklenirken hata oluştu: ' + err.message);
    } finally {
      setEbsLoading(false);
    }
  };

  const filteredEbsChecks = useMemo(() => {
    if (!ebsSearch.trim()) return ebsChecks;
    const query = ebsSearch.toLowerCase();
    return ebsChecks.filter(x => 
      (x.check_no && x.check_no.toLowerCase().includes(query)) ||
      (x.kesideci && x.kesideci.toLowerCase().includes(query))
    );
  }, [ebsChecks, ebsSearch]);

  const toggleSelectAll = () => {
    const allFilteredIds = filteredEbsChecks.map(x => x.id);
    const allSelected = allFilteredIds.every(id => selectedEbsIds.has(id));

    const next = new Set(selectedEbsIds);
    if (allSelected) {
      allFilteredIds.forEach(id => next.delete(id));
    } else {
      allFilteredIds.forEach(id => next.add(id));
    }
    setSelectedEbsIds(next);
  };

  const toggleSelectCheck = (id: string) => {
    const next = new Set(selectedEbsIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEbsIds(next);
  };

  const addSelectedEbsChecks = () => {
    const selectedChecks = ebsChecks.filter(x => selectedEbsIds.has(x.id));
    if (selectedChecks.length === 0) {
      alert('Lütfen eklenecek en az bir çek seçin.');
      return;
    }

    if (activeTab === 'commission') {
      const currentFilled = checks.filter(c => c.dueDate || c.amount > 0);
      const newRows = selectedChecks.map(x => ({
        id: String(x.id),
        dueDate: x.due_date || '',
        amount: Number(x.amount) || 0
      }));
      const combined = [...currentFilled, ...newRows];
      while (combined.length < 5) {
        combined.push({
          id: `empty-${Date.now()}-${Math.random()}`,
          dueDate: '',
          amount: 0
        });
      }
      setChecks(combined);
    } else {
      const currentFilled = targetDates.filter(d => d.dueDate || d.amount > 0);
      const newRows = selectedChecks.map(x => ({
        id: String(x.id),
        dueDate: x.due_date || '',
        amount: Number(x.amount) || 0
      }));
      const combined = [...currentFilled, ...newRows];
      while (combined.length < 5) {
        combined.push({
          id: `empty-${Date.now()}-${Math.random()}`,
          dueDate: '',
          amount: 0
        });
      }
      setTargetDates(combined);

      // Automatically set targetNet to total sum of selected checks
      const totalSelectedAmount = selectedChecks.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
      if (totalSelectedAmount > 0) {
        setTargetNet(totalSelectedAmount);
      }
    }

    setIsEbsModalOpen(false);
  };

  // Tab 2: Target Amount Calculator state
  const [targetNet, setTargetNet] = useState<number>(3000000);
  const [targetDates, setTargetDates] = useState<TargetDateRow[]>(() => {
    const saved = localStorage.getItem('check-valuation-target-dates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing saved target dates', e);
      }
    }
    return [
      { id: '1', dueDate: '', amount: 0 },
      { id: '2', dueDate: '', amount: 0 },
      { id: '3', dueDate: '', amount: 0 },
      { id: '4', dueDate: '', amount: 0 },
      { id: '5', dueDate: '', amount: 0 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('check-valuation-target-dates', JSON.stringify(targetDates));
  }, [targetDates]);

  // Yearly Rate auto calculation
  const yearlyRate = useMemo(() => (monthlyRate * 12).toFixed(2), [monthlyRate]);

  // Date helper functions
  const diffDays = (date1Str: string, date2Str: string): number => {
    if (!date1Str || !date2Str) return 0;
    const d1 = new Date(date1Str);
    d1.setHours(12, 0, 0, 0);
    const d2 = new Date(date2Str);
    d2.setHours(12, 0, 0, 0);
    const diffTime = d1.getTime() - d2.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const addDaysToDate = (dateStr: string, days: number): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + Math.round(days));
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const formatNumberWithDots = (val: number): string => {
    if (!val) return '';
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(val);
  };

  const handleNumberChange = (rawValStr: string): number => {
    const clean = rawValStr.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  };

  // Tab 1 Calculations (Classic Commission Calculator)
  const tab1Calculations = useMemo(() => {
    let totalAmount = 0;
    let weightedDaysSum = 0;

    const rowsWithDays = checks.map(c => {
      const days = c.dueDate ? diffDays(c.dueDate, baseDate) : 0;
      if (c.amount > 0 && c.dueDate) {
        totalAmount += c.amount;
        weightedDaysSum += days * c.amount;
      }
      return { ...c, days };
    });

    const averageMaturityDays = totalAmount > 0 ? (weightedDaysSum / totalAmount) : 0;
    // Excel formula: average days + 1
    const averageMaturityDaysAdjusted = totalAmount > 0 ? (averageMaturityDays + 1) : 0;

    // Excel formula: (Total Amount * Monthly Rate % / 30) * Average Days
    const totalCommission = (totalAmount * (monthlyRate / 100) / 30) * averageMaturityDaysAdjusted;
    const remainingAmount = totalAmount - totalCommission;
    const averageDateStr = totalAmount > 0 ? addDaysToDate(baseDate, averageMaturityDaysAdjusted - 1) : '-';

    return {
      rows: rowsWithDays,
      totalAmount,
      averageMaturityDays: averageMaturityDaysAdjusted,
      averageDate: averageDateStr,
      totalCommission,
      remainingAmount,
    };
  }, [checks, baseDate, monthlyRate]);

  // Tab 2 Calculations (From Target Net Amount)
  const tab2Calculations = useMemo(() => {
    let totalAmount = 0;
    let weightedDaysSum = 0;
    const validDates = targetDates.filter(d => d.dueDate);

    const rowsWithDays = validDates.map(d => {
      const days = diffDays(d.dueDate, baseDate);
      const amt = Number(d.amount) || 0;
      totalAmount += amt;
      weightedDaysSum += days * amt;
      return { ...d, days };
    });

    let averageMaturityDays = 0;
    if (totalAmount > 0) {
      averageMaturityDays = weightedDaysSum / totalAmount;
    } else {
      const totalDays = validDates.reduce((sum, d) => sum + diffDays(d.dueDate, baseDate), 0);
      averageMaturityDays = validDates.length > 0 ? (totalDays / validDates.length) : 0;
    }

    // Adjust by +1 like excel
    const averageMaturityDaysAdjusted = validDates.length > 0 ? (averageMaturityDays + 1) : 0;

    // Reverse formula: Gross = Net / (1 - (Rate% / 30) * Days)
    const discountFactor = 1 - ((monthlyRate / 100) / 30) * averageMaturityDaysAdjusted;
    const requiredGrossAmount = discountFactor > 0 && validDates.length > 0 ? (targetNet / discountFactor) : 0;
    const totalCommission = requiredGrossAmount - targetNet;
    const averageDateStr = validDates.length > 0 ? addDaysToDate(baseDate, averageMaturityDaysAdjusted - 1) : '-';
    const amountPerCheck = requiredGrossAmount > 0 ? (requiredGrossAmount / validDates.length) : 0;

    return {
      rows: rowsWithDays,
      averageMaturityDays: averageMaturityDaysAdjusted,
      averageDate: averageDateStr,
      requiredGrossAmount,
      totalCommission,
      amountPerCheck,
      totalAmount,
    };
  }, [targetDates, baseDate, monthlyRate, targetNet]);

  // Tab 1 CRUD handlers
  const addCheckRow = () => {
    const id = Date.now().toString();
    const nextMonth = new Date(baseDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setChecks([...checks, { id, dueDate: nextMonth.toISOString().split('T')[0], amount: 0 }]);
  };

  const removeCheckRow = (id: string) => {
    if (checks.length > 5) {
      setChecks(checks.filter(c => c.id !== id));
    } else {
      setChecks(checks.map(c => c.id === id ? { ...c, dueDate: '', amount: 0 } : c));
    }
  };

  const updateCheckRow = (id: string, field: keyof CheckRow, value: any) => {
    setChecks(checks.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // Tab 2 CRUD handlers
  const addTargetDateRow = () => {
    const id = Date.now().toString();
    const nextMonth = new Date(baseDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setTargetDates([...targetDates, { id, dueDate: nextMonth.toISOString().split('T')[0], amount: 0 }]);
  };

  const removeTargetDateRow = (id: string) => {
    if (targetDates.length > 5) {
      setTargetDates(targetDates.filter(d => d.id !== id));
    } else {
      setTargetDates(targetDates.map(d => d.id === id ? { ...d, dueDate: '', amount: 0 } : d));
    }
  };

  const updateTargetDateRow = (id: string, field: keyof TargetDateRow, value: any) => {
    setTargetDates(targetDates.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const clearAllChecks = () => {
    if (confirm('Tüm çeklerin bilgileri silinsin mi?')) {
      setChecks([
        { id: '1', dueDate: '', amount: 0 },
        { id: '2', dueDate: '', amount: 0 },
        { id: '3', dueDate: '', amount: 0 },
        { id: '4', dueDate: '', amount: 0 },
        { id: '5', dueDate: '', amount: 0 },
      ]);
    }
  };

  const clearAllTargetDates = () => {
    if (confirm('Tüm tarihler silinsin mi?')) {
      setTargetDates([
        { id: '1', dueDate: '', amount: 0 },
        { id: '2', dueDate: '', amount: 0 },
        { id: '3', dueDate: '', amount: 0 },
        { id: '4', dueDate: '', amount: 0 },
        { id: '5', dueDate: '', amount: 0 },
      ]);
    }
  };

  const handleManualNetChange = (valueStr: string) => {
    const newNet = handleNumberChange(valueStr);
    const currentNet = tab1Calculations.remainingAmount;

    if (currentNet > 0 && newNet > 0) {
      const k = newNet / currentNet;
      setChecks(checks.map(c => ({
        ...c,
        amount: Math.round(c.amount * k)
      })));
    } else if (newNet > 0) {
      const validRows = checks.filter(c => c.dueDate);
      if (validRows.length > 0) {
        const totalDays = validRows.reduce((sum, c) => sum + diffDays(c.dueDate, baseDate), 0);
        const avgDays = totalDays / validRows.length;
        const avgDaysAdjusted = avgDays + 1;
        const discountFactor = 1 - ((monthlyRate / 100) / 30) * avgDaysAdjusted;
        const requiredGross = discountFactor > 0 ? (newNet / discountFactor) : newNet;
        const amtPerCheck = Math.round(requiredGross / validRows.length);
        setChecks(checks.map(c => c.dueDate ? { ...c, amount: amtPerCheck } : c));
      } else {
        setChecks(checks.map((c, idx) => idx === 0 ? { ...c, amount: newNet } : c));
      }
    } else {
      setChecks(checks.map(c => ({ ...c, amount: 0 })));
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader 
        title="Çek Ortalama Vade & Komisyon Hesaplama" 
        description="Çek portföyünüzün ortalama vadesini, komisyon giderlerini ve iskonto sonrası elinize geçecek net tutarları hesaplayın."
      />

      {/* Tabs Menu */}
      <div className="mb-6 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('commission')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'commission'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Coins size={16} />
          Komisyon Hesaplama (Klasik)
        </button>
        <button
          onClick={() => setActiveTab('target')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'target'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <ArrowRightLeft size={16} />
          Tutardan Geriye Hesaplama (Hedef Net)
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Parameters Form and Checks List (col-span-2) */}
        <div className="space-y-6 lg:col-span-2">
          {/* İşlem Parametreleri */}
          <SectionCard title="İşlem Parametreleri" icon={<Percent size={16} className="text-gray-400" />}>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label font-bold text-gray-700">Vade Başlangıç Tarihi</label>
                <div className="relative">
                  <input
                    type="date"
                    className="input"
                    value={baseDate}
                    onChange={e => setBaseDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label font-bold text-gray-700">Komisyon Oranı (%)</label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="number"
                    step="0.01"
                    className="input pr-12 no-spinner"
                    placeholder="5.94"
                    value={monthlyRate}
                    onChange={e => setMonthlyRate(parseFloat(e.target.value) || 0)}
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-semibold text-gray-400">% / Ay</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="label font-bold text-gray-700">Hesaplanan Yıllık Oran (Referans)</label>
                <div className="rounded-lg bg-gray-50 px-3.5 py-2 text-sm font-semibold text-gray-600 h-[38px] flex items-center">
                  %{yearlyRate} / Yıl
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Çekler Listesi */}
          {activeTab === 'commission' ? (
            <SectionCard 
              title="Çekler Listesi" 
              icon={<CalendarDays size={16} className="text-gray-400" />}
              action={
                <div className="flex gap-2">
                  <button
                    onClick={handleImportFromEbs}
                    disabled={ebsLoading}
                    className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3 text-xs text-brand-600 hover:text-brand-700 hover:bg-brand-50 border-brand-200"
                  >
                    <RefreshCw size={14} className={ebsLoading ? 'animate-spin' : ''} />
                    {ebsLoading ? 'EBS\'ten Çekiliyor...' : 'EBS\'ten Çekleri Getir'}
                  </button>
                  <button
                    onClick={clearAllChecks}
                    className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 size={14} />
                    Tümünü Sil
                  </button>
                  <button onClick={addCheckRow} className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3 text-xs">
                    <Plus size={14} />
                    Yeni Çek Ekle
                  </button>
                </div>
              }
            >
              <div className="mb-4">
                <label className="label text-emerald-700 font-semibold">Net Alınacak Tutar</label>
                <input
                  type="text"
                  className="input !py-2 font-bold text-emerald-700"
                  placeholder="0"
                  value={formatNumberWithDots(Math.round(tab1Calculations.remainingAmount))}
                  onChange={e => handleManualNetChange(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Sıra</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Çek Vade Tarihi</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Çek Tutarı</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Vade Gün</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-16">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {checks.map((check, index) => {
                      const days = diffDays(check.dueDate, baseDate);
                      return (
                        <tr key={check.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 font-medium">{index + 1}</td>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              className="input !py-1.5 !text-sm"
                              value={check.dueDate}
                              onChange={e => updateCheckRow(check.id, 'dueDate', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="input text-right !py-1.5 !text-sm"
                              placeholder="0"
                              value={formatNumberWithDots(check.amount)}
                              onChange={e => updateCheckRow(check.id, 'amount', handleNumberChange(e.target.value))}
                            />
                          </td>
                          <td className={`px-4 py-3 text-center font-semibold ${days < 0 ? 'text-red-500' : 'text-brand-600'}`}>
                            {check.dueDate ? `${days} Gün` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeCheckRow(check.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Excel-style summary row */}
                    <tr className="bg-gray-50/50 font-bold border-t border-gray-200">
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-gray-600 uppercase text-xs">TOPLAM</td>
                      <td className="px-4 py-3 text-right text-gray-900 text-sm">
                        {formatCurrency(tab1Calculations.totalAmount)}
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : (
            <SectionCard 
              title="Geri Hesaplama Çek Vadeleri" 
              icon={<CalendarDays size={16} className="text-gray-400" />}
              action={
                <div className="flex gap-2">
                  <button
                    onClick={handleImportFromEbs}
                    disabled={ebsLoading}
                    className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3 text-xs text-brand-600 hover:text-brand-700 hover:bg-brand-50 border-brand-200"
                  >
                    <RefreshCw size={14} className={ebsLoading ? 'animate-spin' : ''} />
                    {ebsLoading ? 'EBS\'ten Çekiliyor...' : 'EBS\'ten Çekleri Getir'}
                  </button>
                  <button
                    onClick={clearAllTargetDates}
                    className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 size={14} />
                    Tümünü Sil
                  </button>
                  <button onClick={addTargetDateRow} className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3 text-xs">
                    <Plus size={14} />
                    Yeni Tarih Ekle
                  </button>
                </div>
              }
            >
              <div className="mb-4">
                <label className="label text-emerald-700 font-semibold">Hedef Net Alınacak Tutar</label>
                <input
                  type="text"
                  className="input !py-2"
                  placeholder="3.000.000"
                  value={formatNumberWithDots(targetNet)}
                  onChange={e => setTargetNet(handleNumberChange(e.target.value))}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Sıra</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Çek Vade Tarihi</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Çek Tutarı</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Vade Gün</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-16">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {targetDates.map((dateRow, index) => {
                      const days = diffDays(dateRow.dueDate, baseDate);
                      return (
                        <tr key={dateRow.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 font-medium">{index + 1}</td>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              className="input !py-1.5 !text-sm"
                              value={dateRow.dueDate}
                              onChange={e => updateTargetDateRow(dateRow.id, 'dueDate', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="input text-right !py-1.5 !text-sm"
                              placeholder="0"
                              value={formatNumberWithDots(dateRow.amount)}
                              onChange={e => updateTargetDateRow(dateRow.id, 'amount', handleNumberChange(e.target.value))}
                            />
                          </td>
                          <td className={`px-4 py-3 text-center font-semibold ${days < 0 ? 'text-red-500' : 'text-brand-600'}`}>
                            {dateRow.dueDate ? `${days} Gün` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeTargetDateRow(dateRow.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Summary row */}
                    <tr className="bg-gray-50/50 font-bold border-t border-gray-200">
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-gray-600 uppercase text-xs">TOPLAM</td>
                      <td className="px-4 py-3 text-right text-gray-900 text-sm">
                        {formatCurrency(tab2Calculations.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">
                        BRÜT: {formatCurrency(tab2Calculations.requiredGrossAmount)}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right Side: Calculation Results Only (col-span-1) */}
        <div className="space-y-6 lg:col-span-1">
          {activeTab === 'commission' ? (
            <SectionCard title="Hesaplama Sonuçları" icon={<Coins size={16} className="text-brand-600" />}>
              <div className="space-y-3.5">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-medium text-gray-500">Ortalama Vade Gün:</span>
                  <span className="text-sm font-bold text-brand-700">{tab1Calculations.averageMaturityDays.toFixed(0)} Gün</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-medium text-gray-500">Ortalama Tarih:</span>
                  <span className="text-sm font-semibold text-gray-800">{tab1Calculations.averageDate}</span>
                </div>
                <div className="my-2 border-t border-gray-200"></div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-medium text-gray-500">Çek Toplamı (Brüt):</span>
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(tab1Calculations.totalAmount)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-medium text-gray-500">Ortalama Vade:</span>
                  <span className="text-sm font-semibold text-gray-800">{tab1Calculations.averageMaturityDays.toFixed(0)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-medium text-gray-500">Ortalama Tarih:</span>
                  <span className="text-sm font-semibold text-gray-800">{tab1Calculations.averageDate}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-medium text-gray-500">Komisyon Oranı:</span>
                  <span className="text-sm font-semibold text-red-500">%{monthlyRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2 text-red-600">
                  <span className="text-xs font-semibold">Toplam Komisyon:</span>
                  <span className="text-sm font-bold">{formatCurrency(tab1Calculations.totalCommission)}</span>
                </div>
                <div className="flex justify-between items-center bg-brand-50/50 rounded-lg p-3 border border-brand-100 text-emerald-700">
                  <span className="text-sm font-bold">Kalan (Net):</span>
                  <span className="text-xl font-extrabold">{formatCurrency(tab1Calculations.remainingAmount)}</span>
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Geri Hesaplama Sonuçları" icon={<ArrowRightLeft size={16} className="text-brand-600" />}>
              <div className="space-y-3.5">
                <div className="flex justify-between border-b border-gray-100 pb-2 text-emerald-700">
                  <span className="text-xs font-semibold">Hedef Alınacak Net (Kalan):</span>
                  <span className="text-sm font-bold">{formatCurrency(targetNet)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-medium text-gray-500">Ortalama Vade Gün:</span>
                  <span className="text-sm font-semibold text-brand-700">{tab2Calculations.averageMaturityDays.toFixed(0)} Gün</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-medium text-gray-500">Ortalama Tarih:</span>
                  <span className="text-sm font-semibold text-gray-800">{tab2Calculations.averageDate}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2 text-red-600">
                  <span className="text-xs font-semibold">Toplam Komisyon:</span>
                  <span className="text-sm font-bold">{formatCurrency(tab2Calculations.totalCommission)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2 text-gray-600">
                  <span className="text-xs font-medium">Çek Başına Brüt Tutar:</span>
                  <span className="text-sm font-semibold">{formatCurrency(tab2Calculations.amountPerCheck)}</span>
                </div>
                <div className="flex justify-between items-center bg-brand-50/50 rounded-lg p-3 border border-brand-100 text-brand-800">
                  <span className="text-sm font-bold">Gerekli Toplam Brüt:</span>
                  <span className="text-xl font-extrabold">{formatCurrency(tab2Calculations.requiredGrossAmount)}</span>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* EBS Check Selection Modal */}
      <Modal
        open={isEbsModalOpen}
        onClose={() => setIsEbsModalOpen(false)}
        title="EBS Portföyünden Çek Seç"
        description="Aşağıdaki listeden eklemek istediğiniz çekleri seçip portföyünüze ekleyebilirsiniz."
        size="lg"
        footer={
          <>
            <span className="mr-auto text-xs text-gray-500 font-semibold">
              {selectedEbsIds.size} Çek Seçildi
            </span>
            <button
              onClick={() => setIsEbsModalOpen(false)}
              className="btn-secondary !py-1.5 !px-3.5 text-xs font-semibold"
            >
              İptal
            </button>
            <button
              onClick={addSelectedEbsChecks}
              className="btn-primary !py-1.5 !px-3.5 text-xs font-semibold"
              disabled={selectedEbsIds.size === 0}
            >
              Seçilenleri Ekle
            </button>
          </>
        }
      >
        <div className="mb-4 relative rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={15} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="input pl-9 text-sm !py-2"
            placeholder="Çek No veya Keşideci Adı ile filtreleyin..."
            value={ebsSearch}
            onChange={e => setEbsSearch(e.target.value)}
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto border border-gray-100 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer h-4 w-4"
                    checked={filteredEbsChecks.length > 0 && filteredEbsChecks.every(x => selectedEbsIds.has(x.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Çek No</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Keşideci (Borçlu)</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vade Tarihi</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredEbsChecks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Arama kriterine uygun çek bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredEbsChecks.map(x => {
                  const isSelected = selectedEbsIds.has(x.id);
                  return (
                    <tr 
                      key={x.id} 
                      className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-brand-50/20' : ''}`}
                      onClick={() => toggleSelectCheck(x.id)}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer h-4 w-4"
                          checked={isSelected}
                          onChange={() => toggleSelectCheck(x.id)}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{x.check_no || '-'}</td>
                      <td className="px-4 py-3 text-gray-655 max-w-[150px] truncate font-medium" title={x.kesideci}>
                        {x.kesideci || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-650">
                        {x.due_date ? new Date(x.due_date).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">
                        {formatNumberWithDots(x.amount)} TL
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
