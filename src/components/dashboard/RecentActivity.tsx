import { Activity } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { activityItems } from '../../types/dashboard';

export function RecentActivity() {
  return (
    <SectionCard
      title="Son Hareketler"
      icon={Activity}
      action="Tümü"
      bodyClassName="!p-0"
    >
      <ul className="divide-y divide-gray-100">
        {activityItems.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500">
                <Icon size={13} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">{a.user}</span>{' '}
                  {a.action}{' '}
                  <span className="font-medium text-brand-600">{a.target}</span>
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{a.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
