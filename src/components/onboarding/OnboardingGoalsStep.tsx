import { Choice, OnboardingSectionHeader } from './OnboardingControls';

interface OnboardingGoalsStepProps {
  totalSteps: number;
  regenerateMode: boolean;
  experience: string;
  onExperienceChange: (value: string) => void;
  goal: string;
  onGoalChange: (value: string) => void;
  equipment: string;
  onEquipmentChange: (value: string) => void;
}

export function OnboardingGoalsStep({
  totalSteps,
  regenerateMode,
  experience,
  onExperienceChange,
  goal,
  onGoalChange,
  equipment,
  onEquipmentChange,
}: OnboardingGoalsStepProps) {
  return (
    <div>
      <OnboardingSectionHeader n="02" totalSteps={totalSteps} question="¿Qué buscas?" hint="Tu programa se ajusta completamente a esto." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {!regenerateMode && (
          <div>
            <div className="uc" style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 11 }}>Experiencia</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { v: 'beginner', l: 'Principiante' },
                { v: 'intermediate', l: 'Intermedio' },
                { v: 'advanced', l: 'Avanzado' },
              ].map((option) => (
                <Choice key={option.v} label={option.l} selected={experience === option.v} onClick={() => onExperienceChange(option.v)} />
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 11 }}>Objetivo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { v: 'hypertrophy', l: 'Hipertrofia' },
              { v: 'strength', l: 'Fuerza' },
              { v: 'fat_loss', l: 'Pérdida de grasa' },
              { v: 'general', l: 'Fitness general' },
            ].map((option) => (
              <Choice key={option.v} label={option.l} selected={goal === option.v} onClick={() => onGoalChange(option.v)} />
            ))}
          </div>
        </div>
        <div>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 11 }}>Equipamiento</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { v: 'commercial_gym', l: 'Gimnasio' },
              { v: 'home_gym', l: 'Casa con mancuernas' },
              { v: 'dumbbells_only', l: 'Solo mancuernas' },
              { v: 'no_equipment', l: 'Bandas + cuerpo' },
              { v: 'bodyweight_only', l: 'Sin equipo' },
            ].map((option) => (
              <Choice key={option.v} label={option.l} selected={equipment === option.v} onClick={() => onEquipmentChange(option.v)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
