import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DEFAULT_EXERCISES, type ExerciseStatus } from '../types';
import { estimateKeyLifts } from '../engine/weightEstimator';
import { generateWeekWithAI } from '../lib/openaiProgramGenerator';
import {
  DEFAULT_INJURY_DRAFT,
  fetchPrimaryInjuryDraft,
  savePrimaryInjuryDraft,
  type InjuryDraft,
} from '../lib/injuryProfile';
import {
  NO_EQUIPMENT_DEFAULT_EXERCISES,
  deriveEngineProfile,
  generateNoEquipmentProgram,
} from '../engine/noEquipmentAdapter';
import { ArrowRight, Loader2, Check } from 'lucide-react';
import { OnboardingIdentityStep } from './onboarding/OnboardingIdentityStep';
import { OnboardingGoalsStep } from './onboarding/OnboardingGoalsStep';
import { OnboardingScheduleStep } from './onboarding/OnboardingScheduleStep';
import { OnboardingKeyLiftsStep } from './onboarding/OnboardingKeyLiftsStep';

interface OnboardingWizardProps {
  onComplete: () => void;
  regenerateMode?: boolean;
}

export default function OnboardingWizard({ onComplete, regenerateMode = false }: OnboardingWizardProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [bodyweight, setBodyweight] = useState(75);
  const [height, setHeight] = useState(170);
  const [experience, setExperience] = useState('intermediate');
  const [goal, setGoal] = useState('hypertrophy');
  const [equipment, setEquipment] = useState('commercial_gym');
  const [scheduleDays, setScheduleDays] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [limitations, setLimitations] = useState('');
  const [injuryDraft, setInjuryDraft] = useState<InjuryDraft>(DEFAULT_INJURY_DRAFT);
  const [keyLifts, setKeyLifts] = useState({ squat: 0, bench: 0, deadlift: 0, ohp: 0 });
  const [liftsEstimated, setLiftsEstimated] = useState(false);

  const isNoEquipment = equipment === 'no_equipment' || equipment === 'bodyweight_only';
  const TOTAL_STEPS = regenerateMode ? 2 : (isNoEquipment ? 3 : 4);

  // Map visual step → content step (regenerate mode skips step 0)
  const contentStep = regenerateMode ? step + 1 : step;

  // Pre-load profile in regenerate mode
  useEffect(() => {
    if (!regenerateMode || !user) return;
    supabase
      .from('profiles')
      .select('name, gender, bodyweight, height, training_experience, goal, equipment_access, schedule_days, session_minutes, limitations')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setName(data.name ?? '');
        setGender((data.gender as 'male' | 'female') ?? 'male');
        setBodyweight(data.bodyweight ?? 75);
        setHeight(data.height ?? 170);
        setExperience(data.training_experience ?? 'intermediate');
        setGoal(data.goal ?? 'hypertrophy');
        setEquipment(data.equipment_access ?? 'commercial_gym');
        setScheduleDays(data.schedule_days ?? 4);
        setSessionMinutes(data.session_minutes ?? 60);
        setLimitations(data.limitations ?? '');
      });
    fetchPrimaryInjuryDraft(user.id).then(setInjuryDraft);
  }, [regenerateMode, user]);

  const next = () => {
    if (!regenerateMode && step === 2 && !liftsEstimated) {
      const estimated = estimateKeyLifts(bodyweight, experience, gender);
      setKeyLifts(estimated);
      setLiftsEstimated(true);
    }
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else if (regenerateMode) {
      handleRegenerateFinish();
    } else {
      handleFinish();
    }
  };

  const prev = () => setStep(s => Math.max(0, s - 1));

  const canProceed = () => {
    switch (contentStep) {
      case 0: return name.trim().length > 0 && bodyweight > 0 && height > 0;
      case 1: return true;
      case 2: return scheduleDays >= 2 && scheduleDays <= 6;
      case 3: return keyLifts.squat > 0 && keyLifts.bench > 0 && keyLifts.deadlift > 0 && keyLifts.ohp > 0;
      default: return false;
    }
  };

  // ─── Submit: regenerate mode ──────────────────────────
  const handleRegenerateFinish = async () => {
    if (!user) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await supabase.from('profiles').update({
        goal, equipment_access: equipment, schedule_days: scheduleDays,
        session_minutes: sessionMinutes, limitations: limitations || null,
      }).eq('id', user.id);
      const injuries = await savePrimaryInjuryDraft(user.id, injuryDraft);

      const seedExercises = isNoEquipment ? NO_EQUIPMENT_DEFAULT_EXERCISES : DEFAULT_EXERCISES;
      await supabase.from('exercises').upsert(
        seedExercises.map((e) => ({ user_id: user.id, name: e.name, category: e.category, status: 'YES' as ExerciseStatus })),
        { onConflict: 'user_id,name' }
      );

      const { data: exercises } = await supabase.from('exercises').select('*').eq('user_id', user.id).neq('status', 'NO');
      if (!exercises || exercises.length === 0) throw new Error('No exercises');

      const currentKeyLifts = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };
      if (!isNoEquipment) {
        const { data: ww } = await supabase.from('working_weights').select('weight, exercise:exercises(name)').eq('user_id', user.id);
        if (ww) {
          for (const w of ww) {
            const ex = w.exercise as unknown as { name: string } | { name: string }[] | null;
            const exName = Array.isArray(ex) ? ex[0]?.name : ex?.name;
            if (exName === 'Barra Back Squat') currentKeyLifts.squat = w.weight;
            if (exName === 'Barra Press de Banca') currentKeyLifts.bench = w.weight;
            if (exName === 'Peso Muerto Convencional') currentKeyLifts.deadlift = w.weight;
            if (exName === 'Barra Press Militar') currentKeyLifts.ohp = w.weight;
          }
        }
        const estimated = estimateKeyLifts(bodyweight, experience, gender);
        if (!currentKeyLifts.squat) currentKeyLifts.squat = estimated.squat;
        if (!currentKeyLifts.bench) currentKeyLifts.bench = estimated.bench;
        if (!currentKeyLifts.deadlift) currentKeyLifts.deadlift = estimated.deadlift;
        if (!currentKeyLifts.ohp) currentKeyLifts.ohp = estimated.ohp;
      }

      let programName: string, splitType: string, totalDays: number;
      let days: { day_number: number; day_name: string; exercises: unknown[] }[];

      if (isNoEquipment) {
        const engineProfile = deriveEngineProfile({ experience, scheduleDays, sessionMinutes, goal, hasBands: equipment === 'no_equipment' });
        const program = generateNoEquipmentProgram(engineProfile, exercises, 1);
        programName = program.name; splitType = program.split_type; totalDays = program.total_days; days = program.days;
      } else {
        const result = await generateWeekWithAI({
          weekNum: 1,
          exercises,
          profile: { bodyweight, height, training_experience: experience, goal, schedule_days: scheduleDays, session_minutes: sessionMinutes, gender, limitations, injuries },
          keyLifts: currentKeyLifts,
          cycleNumber: 1,
        });
        programName = result.programName; splitType = result.splitType; totalDays = result.totalDays; days = result.days;
      }

      const { data: savedProgram, error: pErr } = await supabase.from('programs')
        .insert({ user_id: user.id, name: programName, split_type: splitType, total_days: totalDays }).select().single();
      if (pErr || !savedProgram) throw pErr;
      await supabase.from('program_days').insert(days.map((d) => ({ program_id: savedProgram.id, day_number: d.day_number, day_name: d.day_name, exercises: d.exercises, week_num: 1 })));

      if (!isNoEquipment) {
        const mainLifts = [
          { name: 'Barra Back Squat', weight: currentKeyLifts.squat },
          { name: 'Barra Press de Banca', weight: currentKeyLifts.bench },
          { name: 'Peso Muerto Convencional', weight: currentKeyLifts.deadlift },
          { name: 'Barra Press Militar', weight: currentKeyLifts.ohp },
        ];
        for (const lift of mainLifts) {
          const ex = exercises.find((e) => e.name === lift.name);
          if (ex) await supabase.from('working_weights').upsert({ user_id: user.id, exercise_id: ex.id, weight: lift.weight, updated_at: new Date().toISOString() }, { onConflict: 'user_id,exercise_id' });
        }
      }
      onComplete();
    } catch (err) {
      console.error('Program regeneration failed:', err);
      setErrorMessage('No se pudo regenerar el programa. Intenta nuevamente.');
      setSaving(false);
    }
  };

  // ─── Submit: normal onboarding ────────────────────────
  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await supabase.from('profiles').upsert({
        id: user.id, name, gender, bodyweight, height,
        training_experience: experience, goal, schedule_days: scheduleDays,
        session_minutes: sessionMinutes, equipment_access: equipment,
        limitations: limitations || null,
      });
      const injuries = await savePrimaryInjuryDraft(user.id, injuryDraft);

      const seedExercises = isNoEquipment ? NO_EQUIPMENT_DEFAULT_EXERCISES : DEFAULT_EXERCISES;
      await supabase.from('exercises').upsert(
        seedExercises.map((e) => ({ user_id: user.id, name: e.name, category: e.category, status: 'YES' as ExerciseStatus })),
        { onConflict: 'user_id,name' }
      );

      const { data: exercises } = await supabase.from('exercises').select('*').eq('user_id', user.id).neq('status', 'NO');
      if (!exercises || exercises.length === 0) throw new Error('Failed to seed exercises');

      let programName: string, splitType: string, totalDays: number;
      let days: { day_number: number; day_name: string; exercises: unknown[] }[];

      if (isNoEquipment) {
        const engineProfile = deriveEngineProfile({ experience, scheduleDays, sessionMinutes, goal, hasBands: equipment === 'no_equipment' });
        const program = generateNoEquipmentProgram(engineProfile, exercises, 1);
        programName = program.name; splitType = program.split_type; totalDays = program.total_days; days = program.days;
      } else {
        const result = await generateWeekWithAI({
          weekNum: 1,
          exercises,
          profile: { bodyweight, height, training_experience: experience, goal, schedule_days: scheduleDays, session_minutes: sessionMinutes, gender, limitations, injuries },
          keyLifts,
          cycleNumber: 1,
        });
        programName = result.programName; splitType = result.splitType; totalDays = result.totalDays; days = result.days;
      }

      const { data: savedProgram, error: pErr } = await supabase.from('programs')
        .insert({ user_id: user.id, name: programName, split_type: splitType, total_days: totalDays }).select().single();
      if (pErr || !savedProgram) throw pErr;
      await supabase.from('program_days').insert(days.map((d) => ({ program_id: savedProgram.id, day_number: d.day_number, day_name: d.day_name, exercises: d.exercises, week_num: 1 })));

      if (!isNoEquipment) {
        const mainLifts = [
          { name: 'Barra Back Squat', weight: keyLifts.squat },
          { name: 'Barra Press de Banca', weight: keyLifts.bench },
          { name: 'Peso Muerto Convencional', weight: keyLifts.deadlift },
          { name: 'Barra Press Militar', weight: keyLifts.ohp },
        ];
        for (const lift of mainLifts) {
          const ex = exercises.find((e) => e.name === lift.name);
          if (ex) await supabase.from('working_weights').upsert({ user_id: user.id, exercise_id: ex.id, weight: lift.weight, updated_at: new Date().toISOString() }, { onConflict: 'user_id,exercise_id' });
        }
      }
      onComplete();
    } catch (err) {
      console.error('Onboarding failed:', err);
      setErrorMessage('No se pudo generar tu programa. Intenta nuevamente.');
      setSaving(false);
    }
  };

  // ─── BMI badge ────────────────────────────────────────
  const bmi = bodyweight / ((height / 100) ** 2);
  const bmiLabel = bmi < 18.5 ? 'Bajo peso' : bmi < 25 ? 'Rango saludable' : 'Sobre el rango recomendado';

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)', color: 'var(--ink)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 2px; background: var(--rule); border-radius: 2px; outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--ink); cursor: pointer; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: 'var(--ink)', borderRadius: 5, display: 'grid', placeItems: 'center', color: 'var(--paper)' }}>
            <span className="serif" style={{ fontSize: 20, lineHeight: 1, fontStyle: 'italic' }}>F</span>
          </div>
          <span className="uc" style={{ fontSize: 12 }}>{regenerateMode ? 'Actualizar perfil' : 'Configurar'}</span>
        </div>
        <div className="mono caption" style={{ color: 'var(--muted)' }}>Paso {step + 1} de {TOTAL_STEPS}</div>
        <div style={{ width: 80 }} />
      </header>

      {/* Progress bars */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TOTAL_STEPS}, 1fr)`, gap: 4, padding: '0 32px' }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} style={{ height: 3, background: i <= step ? 'var(--ink)' : 'var(--rule)', borderRadius: 2, transition: 'background .3s' }} />
        ))}
      </div>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div style={{ maxWidth: 720, width: '100%' }} className="forge-fade">

          {/* ─── Step 0: Identity ─────────────────────── */}
          {contentStep === 0 && (
            <OnboardingIdentityStep
              totalSteps={TOTAL_STEPS}
              name={name}
              onNameChange={setName}
              gender={gender}
              onGenderChange={setGender}
              bodyweight={bodyweight}
              onBodyweightChange={setBodyweight}
              height={height}
              onHeightChange={setHeight}
              bmi={bmi}
              bmiLabel={bmiLabel}
              onInvalidateLifts={() => setLiftsEstimated(false)}
            />
          )}

          {/* ─── Step 1: Goals & Equipment ────────────── */}
          {contentStep === 1 && (
            <OnboardingGoalsStep
              totalSteps={TOTAL_STEPS}
              regenerateMode={regenerateMode}
              experience={experience}
              onExperienceChange={(value) => { setExperience(value); setLiftsEstimated(false); }}
              goal={goal}
              onGoalChange={setGoal}
              equipment={equipment}
              onEquipmentChange={(value) => {
                setEquipment(value);
                if ((value === 'no_equipment' || value === 'bodyweight_only') && scheduleDays > 5) setScheduleDays(5);
              }}
            />
          )}

          {/* ─── Step 2: Schedule ──────────────────────── */}
          {contentStep === 2 && (
            <OnboardingScheduleStep
              totalSteps={TOTAL_STEPS}
              isNoEquipment={isNoEquipment}
              scheduleDays={scheduleDays}
              onScheduleDaysChange={setScheduleDays}
              sessionMinutes={sessionMinutes}
              onSessionMinutesChange={setSessionMinutes}
              limitations={limitations}
              onLimitationsChange={setLimitations}
              injuryDraft={injuryDraft}
              onInjuryDraftChange={setInjuryDraft}
            />
          )}

          {/* ─── Step 3: Key Lifts ──────────────────────── */}
          {contentStep === 3 && (
            <OnboardingKeyLiftsStep totalSteps={TOTAL_STEPS} keyLifts={keyLifts} onKeyLiftsChange={setKeyLifts} />
          )}
        </div>
      </main>

      {/* Footer navigation */}
      {errorMessage && (
        <div style={{ padding: '0 32px 16px' }}>
          <div style={{
            border: '1px solid color-mix(in oklab, var(--accent), transparent 70%)',
            background: 'color-mix(in oklab, var(--accent), transparent 94%)',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 13,
            lineHeight: 1.5,
          }}>
            {errorMessage}
          </div>
        </div>
      )}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderTop: '1px solid var(--rule)' }}>
        <button
          onClick={prev}
          disabled={step === 0}
          className="btn btn-ghost"
          style={{ opacity: step === 0 ? 0.3 : 1 }}
        >
          ← Atrás
        </button>

        <div className="mono caption" style={{ color: 'var(--muted)' }}>
          {Math.round(((step + 1) / TOTAL_STEPS) * 100)}%
        </div>

        <button
          onClick={next}
          disabled={saving || !canProceed()}
          className="btn btn-ink btn-lg"
          style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: (!canProceed() && !saving) ? 0.4 : 1 }}
        >
          {saving ? (
            <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Generando...</>
          ) : isLastStep ? (
            <><Check size={16} /> Generar programa</>
          ) : (
            <>Siguiente <ArrowRight size={16} /></>
          )}
        </button>
      </footer>
    </div>
  );
}
