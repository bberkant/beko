import { formatDateTR } from '../data/labels';
import type { BillStatus } from '../types';

interface BillDueDateCellProps {
  dueDate?: string;
  billStatus: BillStatus;
  lastPaidAt?: string;
}

export function BillDueDateCell({ dueDate, billStatus, lastPaidAt }: BillDueDateCellProps) {
  if (billStatus === 'odendi') {
    return (
      <div className="flex flex-col items-center justify-center leading-tight">
        <span className="font-semibold text-emerald-700 text-sm">{formatDateTR(dueDate)}</span>
        <span className="text-[11px] text-emerald-600 font-medium">
          {lastPaidAt ? `(${formatDateTR(lastPaidAt)} ödendi)` : '(ödendi)'}
        </span>
      </div>
    );
  }

  if (!dueDate) {
    return <span className="text-gray-400 font-medium text-sm">—</span>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  const isOverdue = diffDays < 0;
  const isToday = diffDays === 0;
  const isTomorrow = diffDays === 1;
  const isSoon = diffDays > 1 && diffDays <= 7;

  if (isOverdue) {
    return (
      <div className="flex flex-col items-center justify-center leading-tight">
        <span className="font-bold text-red-700 text-sm">{formatDateTR(dueDate)}</span>
        <span className="text-xs text-red-600 font-bold tracking-tight">
          ({Math.abs(diffDays)} gün gecikti)
        </span>
      </div>
    );
  }

  if (isToday) {
    return (
      <div className="flex flex-col items-center justify-center leading-tight">
        <span className="font-bold text-red-700 text-sm">{formatDateTR(dueDate)}</span>
        <span className="text-xs text-red-600 font-bold tracking-tight">(bugün)</span>
      </div>
    );
  }

  if (isTomorrow) {
    return (
      <div className="flex flex-col items-center justify-center leading-tight">
        <span className="font-bold text-amber-800 text-sm">{formatDateTR(dueDate)}</span>
        <span className="text-xs text-amber-700 font-bold tracking-tight">(yarın)</span>
      </div>
    );
  }

  if (isSoon) {
    return (
      <div className="flex flex-col items-center justify-center leading-tight">
        <span className="font-medium text-gray-900 text-sm">{formatDateTR(dueDate)}</span>
        <span className="text-xs text-amber-700 font-medium tracking-tight">
          ({diffDays} gün kaldı)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <span className="font-medium text-gray-700 text-sm">{formatDateTR(dueDate)}</span>
    </div>
  );
}
