import { useEffect } from 'react';
import { create } from 'zustand';
import { Check, AlertCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastStore {
  toasts: Toast[];
  add: (message: string, variant?: ToastVariant) => void;
  remove: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, variant = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().add(message, 'success'),
  error: (message: string) => useToastStore.getState().add(message, 'error'),
  info: (message: string) => useToastStore.getState().add(message, 'info'),
};

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <Check className="size-3.5 text-emerald-500" />,
  error: <AlertCircle className="size-3.5 text-destructive" />,
  info: <Info className="size-3.5 text-blue-500" />,
};

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(), 2500);
    return () => clearTimeout(timer);
  }, [onRemove]);

  return (
    <div className="animate-toast-in flex items-center gap-2 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      {icons[t.variant]}
      <span className="max-w-[240px] truncate">{t.message}</span>
      <button type="button" onClick={onRemove} className="ml-1 rounded p-0.5 hover:bg-muted">
        <X className="size-3 text-muted-foreground" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col-reverse items-center gap-1.5">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
      ))}
    </div>
  );
}
