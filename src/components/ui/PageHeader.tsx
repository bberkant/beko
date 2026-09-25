import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  backTo,
  backLabel,
  onBack,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} />
          {backLabel ?? 'Geri'}
        </button>
      ) : backTo ? (
        <Link
          to={backTo}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft size={15} />
          {backLabel ?? 'Geri'}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
        )}
      </div>
    </div>
  );
}
