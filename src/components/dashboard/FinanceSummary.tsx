import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { financeMetrics } from '../../types/dashboard';

export function FinanceSummary() {
  return (
    <SectionCard title="Finans Özeti" icon={Wallet} action="Rapor">
      <div className="grid grid-cols-2 gap-4">
        {financeMetrics.map((m) => {
          const Icon = m.icon;
          const TrendIcon = m.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div
              key={m.id}
              className="rounded-lg border border-gray-100 bg-gray-50/40 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-gray-500 shadow-soft">
                  <Icon size={14} />
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                    m.trend === 'up' ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  <TrendIcon size={12} />
                  {m.delta}
                </span>
              </div>
              <p className="mt-3 text-lg font-semibold tracking-tight text-gray-900">
                {m.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{m.label}</p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
