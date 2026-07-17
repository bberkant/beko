import { AlertTriangle, Clock } from 'lucide-react';
import { formatDate } from '../data/labels';

interface DueDateCellProps {
  dueDate: string;
  statementStatus?: string;
}

export function DueDateCell({ dueDate, statementStatus }: DueDateCellProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  const isOverdue = diffDays < 0;
  const isSoon = diffDays >= 0 && diffDays <= 7;
  const missingStatement = statementStatus === 'bu-ay-eksik' || statementStatus === 'bekleniyor';

  if (isOverdue) {
    return (
      <div className="flex items-center gap-1.5">
        <AlertTriangle size={14} className="text-red-500" />
        <span className="text-sm font-medium text-red-600">{formatDate(dueDate)}</span>
        <span className="text-xs text-red-500">({Math.abs(diffDays)} gün gecikti)</span>
      </div>
    );
  }

  if (isSoon) {
    return (
      <div className="flex items-center gap-1.5">
        <Clock size={14} className="text-amber-500" />
        <span className="text-sm font-medium text-amber-700">{formatDate(dueDate)}</span>
        {diffDays === 0 ? (
          <span className="text-xs text-amber-600">(bugün)</span>
        ) : (
          <span className="text-xs text-amber-600">({diffDays} gün)</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {missingStatement && <AlertTriangle size={13} className="text-amber-400" />}
      <span className="text-sm text-gray-700">{formatDate(dueDate)}</span>
    </div>
  );
}
