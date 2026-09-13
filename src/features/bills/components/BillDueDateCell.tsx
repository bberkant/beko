import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
        <div className="flex items-center gap-1">
          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
          <span className="font-bold text-emerald-700 text-sm">{formatDateTR(dueDate)}</span>
        </div>
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
      <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
        <div className="flex items-center gap-1">
          <AlertTriangle size={13} className="text-red-600 shrink-0" />
          <span className="font-bold text-red-700 text-sm">{formatDateTR(dueDate)}</span>
        </div>
        <span className="text-xs text-red-600 font-extrabold tracking-tight">
          ({Math.abs(diffDays)} gün gecikti)
        </span>
      </div>
    );
  }

  if (isToday) {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
        <div className="flex items-center gap-1">
          <Clock size={13} className="text-red-600 shrink-0 animate-pulse" />
          <span className="font-bold text-red-700 text-sm">{formatDateTR(dueDate)}</span>
        </div>
        <span className="text-xs text-red-600 font-extrabold tracking-tight">(bugün)</span>
      </div>
    );
  }

  if (isTomorrow) {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
        <div className="flex items-center gap-1">
          <Clock size={13} className="text-amber-600 shrink-0" />
          <span className="font-bold text-amber-800 text-sm">{formatDateTR(dueDate)}</span>
        </div>
        <span className="text-xs text-amber-700 font-extrabold tracking-tight">(yarın)</span>
      </div>
    );
  }

  if (isSoon) {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
        <div className="flex items-center gap-1">
          <Clock size={13} className="text-amber-500 shrink-0" />
          <span className="font-bold text-amber-700 text-sm">{formatDateTR(dueDate)}</span>
        </div>
        <span className="text-xs text-amber-600 font-bold tracking-tight">
          ({diffDays} gün kaldı)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <span className="font-medium text-gray-700 text-sm">{formatDateTR(dueDate)}</span>
    </div>
  );
}
