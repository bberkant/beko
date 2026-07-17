import { CalendarClock } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { upcomingEvents, eventBadge, eventIcon } from '../../types/dashboard';

export function UpcomingEvents() {
  return (
    <SectionCard
      title="Yaklaşan Tarihler"
      icon={CalendarClock}
      action="Takvim"
      bodyClassName="!p-0"
    >
      <ul className="divide-y divide-gray-100">
        {upcomingEvents.map((ev) => {
          const Icon = eventIcon[ev.type];
          const badge = eventBadge[ev.type];
          return (
            <li
              key={ev.id}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                <Icon size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {ev.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{ev.date}</p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}
              >
                {badge.label}
              </span>
              <span className="shrink-0 w-12 text-right text-xs font-medium text-gray-500">
                {ev.daysLeft === 0 ? 'Bugün' : `${ev.daysLeft} gün`}
              </span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
