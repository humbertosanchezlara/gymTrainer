import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

// ─── Focus trap helper ────────────────────────────────────
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// ─── Modal ────────────────────────────────────────────────
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  actions,
  size = 'md',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // Basic focus trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus first focusable element when modal opens
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const focusable = panelRef.current.querySelector<HTMLElement>(FOCUSABLE);
    focusable?.focus();
  }, [isOpen]);

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4 sm:py-6">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className={`relative z-10 flex max-h-[calc(100dvh-2rem)] w-full ${SIZE_CLASSES[size]} flex-col overflow-hidden card-elevated rounded-2xl p-6`}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute top-4 right-4 text-on-surface-variant/50 hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface-container"
            >
              <X size={18} />
            </button>

            {/* Icon */}
            {icon && (
              <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-low border border-outline-variant/20">
                {icon}
              </div>
            )}

            {/* Header */}
            <h2
              id="modal-title"
              className="font-headline font-bold text-xl text-on-surface tracking-tight pr-8"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm font-body text-on-surface-variant leading-relaxed">
                {description}
              </p>
            )}

            {/* Body */}
            {children && <div className="mt-5 min-h-0 overflow-y-auto pr-1 -mr-1">{children}</div>}

            {/* Actions */}
            {actions && (
              <div className="mt-6 flex shrink-0 items-center justify-end gap-3 flex-wrap">
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
