import { Loader2 } from 'lucide-react';
import Modal from '../../Modal';

interface DashboardTravelSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  travelDays: number;
  onTravelDaysChange: (value: number) => void;
  travelHasBands: boolean;
  onTravelHasBandsChange: (value: boolean) => void;
  travelHasPullupBar: boolean;
  onTravelHasPullupBarChange: (value: boolean) => void;
  travelVolume: 'basic' | 'intermediate' | 'advanced';
  onTravelVolumeChange: (value: 'basic' | 'intermediate' | 'advanced') => void;
  travelDisliked: string;
  onTravelDislikedChange: (value: string) => void;
  adjusting: boolean;
  travelGenerating: boolean;
  onRegenerate: () => void;
  onNextSession: () => void;
}

export function DashboardTravelSetupModal({
  isOpen,
  onClose,
  travelDays,
  onTravelDaysChange,
  travelHasBands,
  onTravelHasBandsChange,
  travelHasPullupBar,
  onTravelHasPullupBarChange,
  travelVolume,
  onTravelVolumeChange,
  travelDisliked,
  onTravelDislikedChange,
  adjusting,
  travelGenerating,
  onRegenerate,
  onNextSession,
}: DashboardTravelSetupModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sesión fuera del gym"
      description="Configura tu rutina según lo que tienes disponible."
      size="md"
      actions={
        <>
          <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button
            onClick={onRegenerate}
            disabled={adjusting}
            className="btn btn-ghost"
            title="Descarta el bloque guardado y genera uno nuevo con IA"
          >
            Regenerar
          </button>
          <button onClick={onNextSession} disabled={adjusting} className="btn btn-ink" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {adjusting ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
            {adjusting && travelGenerating ? 'Generando con IA…' : 'Siguiente sesión'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12 }}>Días por semana fuera</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => onTravelDaysChange(n)} className={`btn ${travelDays === n ? 'btn-ink' : 'btn-ghost'}`}>
                {n} {n === 1 ? 'día' : 'días'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12 }}>Equipo disponible</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={travelHasBands} onChange={(e) => onTravelHasBandsChange(e.target.checked)} />
              <span className="body">Bandas elásticas</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={travelHasPullupBar} onChange={(e) => onTravelHasPullupBarChange(e.target.checked)} />
              <span className="body">Barra de dominadas / calistenia</span>
            </label>
          </div>
        </div>
        <div>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12 }}>Volumen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(['basic', 'intermediate', 'advanced'] as const).map((value) => (
              <button
                key={value}
                onClick={() => onTravelVolumeChange(value)}
                className={`btn btn-sq ${travelVolume === value ? 'btn-ink' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', borderRadius: 8 }}
              >
                {{ basic: 'Básico (5-10 reps)', intermediate: 'Intermedio (10-20 reps)', advanced: 'Avanzado (20+ reps)' }[value]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 8 }}>Ejercicios que prefieres evitar</div>
          <div className="body-s" style={{ color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>
            Separa por comas. Ej: burpees, sentadillas con salto, jumping jacks
          </div>
          <input
            type="text"
            value={travelDisliked}
            onChange={(e) => onTravelDislikedChange(e.target.value)}
            placeholder="burpees, jumping jacks..."
            className="forge-field"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    </Modal>
  );
}
