import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function SectionCard({ title, icon, children, className = '', action }: SectionCardProps) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
