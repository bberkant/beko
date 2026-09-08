import { AlertTriangle, Clock } from 'lucide-react';
import { formatDate } from '../data/labels';

interface DueDateCellProps {
  dueDate: string;
  statementStatus?: string;
  currentDebt?: number;
  cardLimit?: number;
}

export function DueDateCell({ dueDate, statementStatus, currentDebt: _currentDebt, cardLimit }: DueDateCellProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  // Limiti 0 olan kartlar hatırlatmaya girmez, sade tarih olarak altlarda gösterilir
  if (cardLimit !== undefined && cardLimit <= 0) {
    return (
      <div className="flex items-center gap-1.5 text-gray-500 font-medium">
        <span className="text-sm">{formatDate(dueDate)}</span>
      </div>
    );
  }


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
    const isCritical = diffDays <= 2;
    return (
      <div className="flex items-center gap-1.5">
        <Clock size={14} className={isCritical ? "text-amber-600 animate-pulse" : "text-amber-500"} />
        <span className={`text-sm ${isCritical ? "font-bold text-amber-900" : "font-medium text-amber-700"}`}>
          {formatDate(dueDate)}
        </span>
        {diffDays === 0 ? (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-black text-red-700">(bugün)</span>
        ) : diffDays === 1 ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-black text-amber-800">(yarın)</span>
        ) : diffDays === 2 ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-black text-amber-800">(son 2 gün)</span>
        ) : (
          <span className="text-xs text-amber-600 font-medium">({diffDays} gün)</span>
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
