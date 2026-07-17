import { Sparkles, ArrowRight } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { aiSuggestions, priorityBadge } from '../../types/dashboard';

export function AISuggestions() {
  return (
    <SectionCard
      title="AI Önerileri"
      icon={Sparkles}
      action="AI Asistan"
      bodyClassName="!p-0"
    >
      <ul className="divide-y divide-gray-100">
        {aiSuggestions.map((s) => {
          const badge = priorityBadge[s.priority];
          return (
            <li key={s.id} className="px-5 py-4 hover:bg-gray-50/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                      <Sparkles size={12} />
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {s.title}
                    </p>
                  </div>
                  <p className="mt-1.5 pl-8 text-xs leading-relaxed text-gray-500">
                    {s.detail}
                  </p>
                  <p className="mt-2 pl-8 text-[11px] font-medium text-gray-400">
                    {s.category}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}
                >
                  {badge.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <button className="flex w-full items-center justify-center gap-1.5 border-t border-gray-100 px-5 py-3 text-xs font-medium text-brand-600 hover:bg-brand-50/40">
        Tüm önerileri gör
        <ArrowRight size={13} />
      </button>
    </SectionCard>
  );
}
