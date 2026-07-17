import { TrendingUp, TrendingDown } from 'lucide-react';
import { kpiCards } from '../../types/dashboard';

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpiCards.map((k) => {
        const Icon = k.icon;
        const TrendIcon = k.trend === 'up' ? TrendingUp : TrendingDown;
        return (
          <div key={k.id} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                <Icon size={16} />
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                  k.trend === 'up' ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                <TrendIcon size={12} />
                {k.delta}
              </span>
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight text-gray-900">
              {k.value}
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-600">{k.label}</p>
            <p className="mt-1 text-xs text-gray-400">{k.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
