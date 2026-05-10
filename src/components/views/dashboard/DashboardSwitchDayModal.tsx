import { CalendarClock, CheckCircle2 } from 'lucide-react';
import Modal from '../../Modal';

interface PendingProgramDay {
  id: string;
  day_number: number;
  day_name: string;
  exerciseCount: number;
  isCurrent: boolean;
}

interface DashboardSwitchDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingDays: PendingProgramDay[];
  selectedDayNum: number | null;
  onSelectDay: (dayNum: number) => void;
}

export function DashboardSwitchDayModal({
  isOpen,
  onClose,
  pendingDays,
  selectedDayNum,
  onSelectDay,
}: DashboardSwitchDayModalProps) {
  const selectedDay = pendingDays.find((day) => day.day_number === selectedDayNum);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cambiar sesión de hoy"
      description="Elige otra sesión pendiente de esta semana. El programa y los ejercicios se quedan igual."
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendingDays.map((day) => {
          const selected = day.day_number === selectedDayNum;
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => onSelectDay(day.day_number)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                width: '100%',
                background: selected
                  ? 'color-mix(in oklab, var(--accent), var(--paper-2) 88%)'
                  : 'var(--paper-2)',
                border: `1px solid ${selected ? 'color-mix(in oklab, var(--accent), transparent 45%)' : 'var(--rule)'}`,
                borderRadius: 12,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                color: 'var(--ink)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    background: selected ? 'var(--accent)' : 'color-mix(in oklab, var(--ink), transparent 94%)',
                    color: selected ? 'var(--accent-ink)' : 'var(--ink)',
                  }}
                >
                  {selected ? <CheckCircle2 size={16} /> : <CalendarClock size={16} />}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{day.day_name}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    Día {day.day_number} · {day.exerciseCount} ejercicios
                    {day.isCurrent ? ' · Siguiente sugerida' : ''}
                  </span>
                </span>
              </span>
            </button>
          );
        })}

        {pendingDays.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            No quedan sesiones pendientes en esta semana.
          </div>
        )}

        {selectedDay && (
          <div style={{
            border: '1px solid var(--rule)',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.5,
          }}>
            Hoy harás {selectedDay.day_name}. Las demás sesiones pendientes se mantienen disponibles para después.
          </div>
        )}
      </div>
    </Modal>
  );
}
