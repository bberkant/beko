import { TrendingUp } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { cashFlowData } from '../../types/dashboard';

export function CashFlowChart() {
  const max = Math.max(
    ...cashFlowData.map((d) => Math.max(d.income, d.expense)),
  );
  const totalIncome = cashFlowData.reduce((s, d) => s + d.income, 0);
  const totalExpense = cashFlowData.reduce((s, d) => s + d.expense, 0);
  const net = totalIncome - totalExpense;

  return (
    <SectionCard title="Nakit Akışı" icon={TrendingUp} action="Bu Hafta">
      <div className="mb-4 flex items-center gap-6">
        <div>
          <p className="text-xs text-gray-500">Gelir</p>
          <p className="text-base font-semibold text-gray-900">
            ₺{totalIncome.toLocaleString('tr-TR')}K
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Gider</p>
          <p className="text-base font-semibold text-gray-900">
            ₺{totalExpense.toLocaleString('tr-TR')}K
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Net</p>
          <p
            className={`text-base font-semibold ${
              net >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {net >= 0 ? '+' : '-'}₺{Math.abs(net).toLocaleString('tr-TR')}K
          </p>
        </div>
      </div>

      <div className="flex h-40 items-end justify-between gap-3">
        {cashFlowData.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div
                className="w-2.5 rounded-t bg-brand-500 transition-all"
                style={{ height: `${(d.income / max) * 100}%` }}
                title={`Gelir: ₺${d.income}K`}
              />
              <div
                className="w-2.5 rounded-t bg-gray-200 transition-all"
                style={{ height: `${(d.expense / max) * 100}%` }}
                title={`Gider: ₺${d.expense}K`}
              />
            </div>
            <span className="text-[11px] text-gray-400">{d.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-5 border-t border-gray-100 pt-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Gelir
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-gray-200" /> Gider
        </span>
      </div>
    </SectionCard>
  );
}
