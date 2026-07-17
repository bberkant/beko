import { isValidElement, type ComponentType, type ReactNode, type SVGProps } from 'react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: string | number }>;

interface SectionCardProps {
  title: string;
  icon?: ReactNode | IconComponent;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  action?: ReactNode;
}

export function SectionCard({ title, icon, children, className = '', bodyClassName = '', action }: SectionCardProps) {
  const renderedIcon = typeof icon === 'function'
    ? (() => {
        const Icon = icon as IconComponent;
        return <Icon size={16} className="text-gray-400" />;
      })()
    : isValidElement(icon) || icon == null
      ? icon
      : null;

  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {renderedIcon}
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
