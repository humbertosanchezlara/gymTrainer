import { Repeat2 } from 'lucide-react';

interface DashboardReplaceExerciseCardProps {
  onClick: () => void;
}

export function DashboardReplaceExerciseCard({ onClick }: DashboardReplaceExerciseCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '14px 18px',
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 18,
        cursor: 'pointer',
        fontFamily: 'var(--sans)',
        color: 'var(--ink)',
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Cambiar ejercicio</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Actualiza tu programa activo con otro ejercicio compatible.</span>
      </span>
      <Repeat2 size={16} />
    </button>
  );
}
