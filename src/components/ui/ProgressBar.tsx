interface ProgressBarProps {
  value: number;
  level?: 'normal' | 'dikkat' | 'kritik';
  showLabel?: boolean;
}

const barColor: Record<string, string> = {
  normal: 'bg-emerald-500',
  dikkat: 'bg-amber-500',
  kritik: 'bg-red-500',
};

export function ProgressBar({ value, level = 'normal', showLabel }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor[level]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-600">%{pct}</span>
      )}
    </div>
  );
}
