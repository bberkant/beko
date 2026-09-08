import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { Percent, Coins, TrendingUp } from 'lucide-react';

interface PosCalculator {
  id: number;
  title: string;
  pos: number;
  baseRate: number;
  appliedRate: number;
}

export function PosDifferencesPage() {
  const [calculators, setCalculators] = useState<PosCalculator[]>(() => {
    const saved = localStorage.getItem('pos_multiple_calculators');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing multiple calculators', e);
      }
    }
    return [
      { id: 1, title: '', pos: 450000, baseRate: 2.99, appliedRate: 3.90 },
      { id: 2, title: '', pos: 450000, baseRate: 2.99, appliedRate: 3.90 },
      { id: 3, title: '', pos: 450000, baseRate: 2.99, appliedRate: 3.90 },
      { id: 4, title: '', pos: 450000, baseRate: 2.99, appliedRate: 3.90 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('pos_multiple_calculators', JSON.stringify(calculators));
  }, [calculators]);

  const updateCalculator = (id: number, field: keyof PosCalculator, value: any) => {
    setCalculators(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
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

  const activeData = useMemo(() => {
    let grandTotalPos = 0;
    let grandTotalBaseCommission = 0;
    let grandTotalAppliedCommission = 0;
    let grandTotalBaseRemaining = 0;
    let grandTotalAppliedRemaining = 0;
    let grandTotalDifference = 0;

    const items = calculators.map(c => {
      const totalBaseCommission = (c.pos * c.baseRate) / 100;
      const totalAppliedCommission = (c.pos * c.appliedRate) / 100;
      const totalBaseRemaining = c.pos - totalBaseCommission;
      const totalAppliedRemaining = c.pos - totalAppliedCommission;
      const totalDifference = totalAppliedCommission - totalBaseCommission;

      grandTotalPos += c.pos;
      grandTotalBaseCommission += totalBaseCommission;
      grandTotalAppliedCommission += totalAppliedCommission;
      grandTotalBaseRemaining += totalBaseRemaining;
      grandTotalAppliedRemaining += totalAppliedRemaining;
      grandTotalDifference += totalDifference;

      return {
        ...c,
        totalBaseCommission,
        totalAppliedCommission,
        totalBaseRemaining,
        totalAppliedRemaining,
        totalDifference
      };
    });

    return {
      items,
      grandTotalPos,
      grandTotalBaseCommission,
      grandTotalAppliedCommission,
      grandTotalBaseRemaining,
      grandTotalAppliedRemaining,
      grandTotalDifference
    };
  }, [calculators]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="POS Komisyon Farkı Hesaplama"
        description="Bankalarla yaptığınız anlaşma oranları ile uygulanan güncel POS oranları arasındaki komisyon farklarını ve maliyet kayıplarını hesaplayın."
      />

      {/* KPI Cards (Grand Total) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Top. POS Hacmi</span>
            <span className="p-1 rounded-lg bg-gray-50 text-gray-500"><Coins size={14} /></span>
          </div>
          <p className="mt-4 text-lg font-bold text-gray-900">{formatCurrency(activeData.grandTotalPos)}</p>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Top. Anlaşma Kom.</span>
            <span className="p-1 rounded-lg bg-brand-50 text-brand-700"><Percent size={14} /></span>
          </div>
          <p className="mt-4 text-lg font-bold text-brand-700">{formatCurrency(activeData.grandTotalBaseCommission)}</p>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Top. Uygulanan Kom.</span>
            <span className="p-1 rounded-lg bg-red-50 text-red-700"><Coins size={14} /></span>
          </div>
          <p className="mt-4 text-lg font-bold text-red-600">{formatCurrency(activeData.grandTotalAppliedCommission)}</p>
        </div>

        <div className="card p-4 flex flex-col justify-between bg-emerald-50/20 border-emerald-100 ring-1 ring-emerald-50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Top. Kom. Kazancı</span>
            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800"><TrendingUp size={14} /></span>
          </div>
          <p className="mt-4 text-lg font-black text-emerald-700">{formatCurrency(activeData.grandTotalDifference)}</p>
        </div>
      </div>

      {/* 2x2 Grid of Calculators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeData.items.map((item, idx) => (
          <SectionCard 
            key={item.id} 
            title={`POS Komisyon Farkı ${idx + 1}`} 
            icon={<TrendingUp size={16} className="text-emerald-600" />}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-4 font-bold text-gray-900 text-base">POS Başlığı</td>
                    <td colSpan={2} className="py-4 text-right">
                      <div className="flex justify-end items-center">
                        <input
                          type="text"
                          className="input text-right !py-2 font-normal text-gray-700 text-lg max-w-[320px] w-full"
                          value={item.title}
                          onChange={e => updateCalculator(item.id, 'title', e.target.value)}
                        />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-gray-700">Toplam POS</td>
                    <td colSpan={2} className="py-3.5 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <input
                          type="text"
                          className="input text-right !py-1.5 font-bold text-gray-900 max-w-[160px]"
                          placeholder="0"
                          value={formatNumberWithDots(item.pos)}
                          onChange={e => updateCalculator(item.id, 'pos', handleNumberChange(e.target.value))}
                        />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-gray-700">Oran</td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">%</span>
                        <input
                          type="number"
                          step="0.01"
                          className="input text-right !py-1 font-bold text-gray-900 w-20 no-spinner"
                          value={item.baseRate}
                          onChange={e => updateCalculator(item.id, 'baseRate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">%</span>
                        <input
                          type="number"
                          step="0.01"
                          className="input text-right !py-1 font-bold text-gray-900 w-20 no-spinner"
                          value={item.appliedRate}
                          onChange={e => updateCalculator(item.id, 'appliedRate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-gray-700">Komisyon</td>
                    <td className="py-3.5 text-right text-gray-800 font-semibold">{formatCurrency(item.totalBaseCommission)}</td>
                    <td className="py-3.5 text-right text-red-600 font-semibold">{formatCurrency(item.totalAppliedCommission)}</td>
                  </tr>
                  <tr className="bg-emerald-50/20">
                    <td className="py-4 font-bold text-emerald-950 text-lg">Net Kalan</td>
                    <td className="py-4 text-right font-bold text-emerald-900 text-lg">{formatCurrency(item.totalBaseRemaining)}</td>
                    <td className="py-4 text-right font-bold text-emerald-900 text-lg">{formatCurrency(item.totalAppliedRemaining)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex justify-between items-center text-emerald-800">
              <span className="text-sm font-bold uppercase tracking-wider">Fark Kazancımız (Net)</span>
              <span className="text-lg font-bold">{formatCurrency(item.totalDifference)}</span>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
