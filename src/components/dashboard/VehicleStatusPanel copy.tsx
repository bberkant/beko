import { Car } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { vehicleStatus } from '../../types/dashboard';

export function VehicleStatusPanel() {
  const total = vehicleStatus.reduce((s, v) => s + v.count, 0);

  return (
    <SectionCard title="Araç Durumu" icon={Car} action="Filo">
      <div className="flex items-center gap-6">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            {(() => {
              let offset = 0;
              return vehicleStatus.map((v) => {
                const dash = (v.count / total) * 100;
                const seg = (
                  <circle
                    key={v.id}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    className={v.color}
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeDasharray={`${dash} ${100 - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += dash;
                return seg;
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold text-gray-900">{total}</span>
            <span className="text-[10px] text-gray-400">Araç</span>
          </div>
        </div>

        <ul className="flex-1 space-y-2.5">
          {vehicleStatus.map((v) => (
            <li key={v.id} className="flex items-center gap-2.5">
              <span className={`h-2.5 w-2.5 rounded-full ${v.color}`} />
              <span className="flex-1 text-sm text-gray-600">{v.label}</span>
              <span className="text-sm font-semibold text-gray-900">
                {v.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
