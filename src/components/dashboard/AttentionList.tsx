import { Bell } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { attentionItems, levelBadge } from '../../types/dashboard';

export function AttentionList() {
  return (
    <SectionCard
      title="Dikkat Edilmesi Gerekenler"
      icon={Bell}
      action="Tümü"
      bodyClassName="!p-0"
    >
      <ul className="divide-y divide-gray-100">
        {attentionItems.map((item) => {
          const Icon = item.icon;
          const badge = levelBadge[item.level];
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/60"
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${badge.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{item.detail}</p>
              </div>
              <Icon size={16} className="mt-0.5 shrink-0 text-gray-300" />
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
