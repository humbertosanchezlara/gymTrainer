import { motion } from 'framer-motion';
import { CalendarOff, ClipboardX, Scale, Dumbbell } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// ─── Animation variants ───────────────────────────────────
const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
  },
};

// ─── Base component ───────────────────────────────────────
export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="show"
      className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className ?? ''}`}
    >
      {/* Icon circle */}
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low mb-5 text-on-surface-variant">
        {icon}
      </div>

      {/* Title */}
      <h3 className="font-headline font-bold text-on-surface text-lg tracking-tight mb-1.5">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="font-body text-on-surface-variant text-sm leading-relaxed max-w-xs">
          {description}
        </p>
      )}

      {/* CTA */}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 border border-outline-variant rounded-full px-6 py-2 text-sm font-headline font-bold text-on-surface-variant hover:text-on-surface hover:border-outline transition-colors"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

// ─── Predefined instances ─────────────────────────────────
export function NoSessionsEmpty({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={<CalendarOff size={28} />}
      title="Sin sesiones registradas"
      description="Todavía no has registrado ningún entrenamiento. ¡Empieza hoy!"
      action={onAction ? { label: 'Registrar sesión', onClick: onAction } : undefined}
    />
  );
}

export function NoProgramEmpty({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={<ClipboardX size={28} />}
      title="Sin programa activo"
      description="No tienes un programa de entrenamiento activo. Crea uno para comenzar."
      action={onAction ? { label: 'Crear programa', onClick: onAction } : undefined}
    />
  );
}

export function NoWeightsEmpty() {
  return (
    <EmptyState
      icon={<Scale size={28} />}
      title="Sin registros de peso"
      description="Aún no hay datos de progreso de peso corporal. Empieza a registrar tu evolución."
    />
  );
}

export function NoExercisesEmpty() {
  return (
    <EmptyState
      icon={<Dumbbell size={28} />}
      title="Sin ejercicios en biblioteca"
      description="La biblioteca de ejercicios está vacía. Agrega ejercicios para personalizarla."
    />
  );
}
