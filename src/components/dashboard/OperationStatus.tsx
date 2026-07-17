import { Activity } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { operationModules, statusBadge } from '../../types/dashboard';

export function OperationStatus() {
  return (
    <SectionCard
      title="Operasyon Durumu"
      icon={Activity}
      action="Detaylar"
    >
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {operationModules.map((m) => {
          const Icon = m.icon;
          const badge = statusBadge[m.status];
          return (
            <li
              key={m.id}
              className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/40 p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 shadow-soft">
                <Icon size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {m.label}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-gray-700">
                  {m.summary}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{m.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
