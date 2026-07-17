import { useLocation } from 'react-router-dom';
import { navItems } from '../types/navigation';

export function PlaceholderPage() {
  const location = useLocation();
  const item = navItems.find((n) => n.to === location.pathname);
  const child = navItems
    .flatMap((n) => n.children ?? [])
    .find((c) => c.to === location.pathname);

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {child?.label ?? item?.label ?? 'Sayfa'}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">Bu modül henüz geliştirilmedi.</p>
      </div>
    </div>
  );
}
