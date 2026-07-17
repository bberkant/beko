import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  notify: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; cls: string }
> = {
  success: { icon: CheckCircle2, cls: 'text-emerald-500' },
  error: { icon: AlertCircle, cls: 'text-red-500' },
  info: { icon: Info, cls: 'text-brand-500' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const { icon: Icon, cls } = variantConfig[t.variant];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-card"
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${cls}`} />
              <p className="flex-1 text-sm text-gray-700">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Kapat"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
