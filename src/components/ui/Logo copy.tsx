export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
        <span className="text-sm font-bold">O</span>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight text-gray-900">OPS360</span>
          <span className="text-[10px] font-medium text-gray-500">AI Operations</span>
        </div>
      )}
    </div>
  );
}
