import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration: number;
}

interface ToastContextType {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const MAX_TOASTS = 4;
const DEFAULT_DURATION = 3500;

// ─── Toast styling maps ───────────────────────────────────
const TOAST_STYLES: Record<Toast['type'], string> = {
  success: 'bg-primary-container text-on-primary-container',
  error: 'bg-error-container text-on-error-container',
  info: 'bg-surface-container text-on-surface',
  warning: 'bg-amber-100 text-amber-900',
};

const TOAST_ICONS: Record<Toast['type'], React.ReactNode> = {
  success: <CheckCircle size={18} className="shrink-0" />,
  error: <AlertCircle size={18} className="shrink-0" />,
  info: <Info size={18} className="shrink-0" />,
  warning: <AlertTriangle size={18} className="shrink-0" />,
};

// ─── Individual Toast ─────────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={`flex items-start gap-3 rounded-xl px-4 py-3.5 shadow-md min-w-[280px] max-w-[360px] ${TOAST_STYLES[toast.type]}`}
    >
      {TOAST_ICONS[toast.type]}
      <p className="flex-1 text-sm font-body font-medium leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar notificación"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}

// ─── Provider ─────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: Toast['type'], message: string, duration = DEFAULT_DURATION) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setToasts((prev) => {
        const next = [...prev, { id, type, message, duration }];
        // If over limit, remove oldest first
        if (next.length > MAX_TOASTS) {
          const removed = next.shift();
          if (removed) {
            const t = timersRef.current.get(removed.id);
            if (t) {
              clearTimeout(t);
              timersRef.current.delete(removed.id);
            }
          }
        }
        return next;
      });

      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const ctx: ToastContextType = {
    success: (msg, dur) => addToast('success', msg, dur),
    error: (msg, dur) => addToast('error', msg, dur),
    info: (msg, dur) => addToast('info', msg, dur),
    warning: (msg, dur) => addToast('warning', msg, dur),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast overlay */}
      <div
        aria-live="polite"
        aria-label="Notificaciones"
        className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-[9999] flex flex-col gap-2 items-stretch sm:items-end pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return ctx;
}
