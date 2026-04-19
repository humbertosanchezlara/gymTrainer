import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DEFAULT_EXERCISES, type ExerciseStatus } from '../types';
import { estimateKeyLifts } from '../engine/weightEstimator';
import { generateProgram } from '../engine/programGenerator';
import {
  NO_EQUIPMENT_DEFAULT_EXERCISES,
  deriveEngineProfile,
  generateNoEquipmentProgram,
} from '../engine/noEquipmentAdapter';
import { ArrowRight, Loader2, Check, ChevronUp, ChevronDown } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
  regenerateMode?: boolean;
}

// ─── Stepper number input ─────────────────────────────────
function NumStepper({ value, onChange, step = 2.5, min = 0 }: { value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 48, fontWeight: 700, fontFamily: 'var(--mono)', lineHeight: 1, minWidth: 80 }}>{value}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button type="button" onClick={() => onChange(Math.round((value + step) / step) * step)}
          style={{ width: 36, height: 36, border: '1px solid var(--rule)', borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}>
          <ChevronUp size={16} />
        </button>
        <button type="button" onClick={() => onChange(Math.max(min, Math.round((value - step) / step) * step))}
          style={{ width: 36, height: 36, border: '1px solid var(--rule)', borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}>
          <ChevronDown size={16} />
        </button>
      </div>
      <span className="mono" style={{ color: 'var(--muted)', fontSize: 14 }}>kg</span>
    </div>
  );
}

// ─── Choice pill button ───────────────────────────────────
function Choice({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: selected ? 'var(--ink)' : 'transparent',
        color: selected ? 'var(--paper)' : 'var(--ink)',
        border: '1px solid',
        borderColor: selected ? 'var(--ink)' : 'var(--rule)',
        padding: '14px 22px',
        borderRadius: 999,
        fontSize: 16,
        fontFamily: 'var(--sans)',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background .15s, color .15s, border-color .15s',
      }}
    >
      {label}
    </button>
  );
}

export default function OnboardingWizard({ onComplete, regenerateMode = false }: OnboardingWizardProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

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
  }, [regenerateMode, user]);

  const next = () => {
    if (!regenerateMode && step === 2 && !liftsEstimated) {
      const estimated = estimateKeyLifts(bodyweight, experience, gender);
      setKeyLifts(estimated);
      setLiftsEstimated(true);
    }
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else regenerateMode ? handleRegenerateFinish() : handleFinish();
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
    try {
      await supabase.from('profiles').update({
        goal, equipment_access: equipment, schedule_days: scheduleDays,
        session_minutes: sessionMinutes, limitations: limitations || null,
      }).eq('id', user.id);

      const seedExercises = isNoEquipment ? NO_EQUIPMENT_DEFAULT_EXERCISES : DEFAULT_EXERCISES;
      await supabase.from('exercises').upsert(
        seedExercises.map((e) => ({ user_id: user.id, name: e.name, category: e.category, status: 'YES' as ExerciseStatus })),
        { onConflict: 'user_id,name' }
      );

      const { data: exercises } = await supabase.from('exercises').select('*').eq('user_id', user.id).eq('status', 'YES');
      if (!exercises || exercises.length === 0) throw new Error('No exercises');

      const bmi = bodyweight / ((height / 100) ** 2);
      let currentKeyLifts = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };
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
        const program = generateProgram(exercises, scheduleDays, bodyweight, experience, currentKeyLifts, goal, bmi, sessionMinutes, gender);
        programName = program.name; splitType = program.split_type; totalDays = program.total_days; days = program.days;
      }

      const { data: savedProgram, error: pErr } = await supabase.from('programs')
        .insert({ user_id: user.id, name: programName, split_type: splitType, total_days: totalDays }).select().single();
      if (pErr || !savedProgram) throw pErr;
      await supabase.from('program_days').insert(days.map((d) => ({ program_id: savedProgram.id, day_number: d.day_number, day_name: d.day_name, exercises: d.exercises })));

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
      setSaving(false);
    }
  };

  // ─── Submit: normal onboarding ────────────────────────
  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').upsert({
        id: user.id, name, gender, bodyweight, height,
        training_experience: experience, goal, schedule_days: scheduleDays,
        session_minutes: sessionMinutes, equipment_access: equipment,
        limitations: limitations || null,
      });

      const seedExercises = isNoEquipment ? NO_EQUIPMENT_DEFAULT_EXERCISES : DEFAULT_EXERCISES;
      await supabase.from('exercises').upsert(
        seedExercises.map((e) => ({ user_id: user.id, name: e.name, category: e.category, status: 'YES' as ExerciseStatus })),
        { onConflict: 'user_id,name' }
      );

      const { data: exercises } = await supabase.from('exercises').select('*').eq('user_id', user.id).eq('status', 'YES');
      if (!exercises || exercises.length === 0) throw new Error('Failed to seed exercises');

      let programName: string, splitType: string, totalDays: number;
      let days: { day_number: number; day_name: string; exercises: unknown[] }[];

      if (isNoEquipment) {
        const engineProfile = deriveEngineProfile({ experience, scheduleDays, sessionMinutes, goal, hasBands: equipment === 'no_equipment' });
        const program = generateNoEquipmentProgram(engineProfile, exercises, 1);
        programName = program.name; splitType = program.split_type; totalDays = program.total_days; days = program.days;
      } else {
        const bmi = bodyweight / ((height / 100) ** 2);
        const program = generateProgram(exercises, scheduleDays, bodyweight, experience, keyLifts, goal, bmi, sessionMinutes, gender);
        programName = program.name; splitType = program.split_type; totalDays = program.total_days; days = program.days;
      }

      const { data: savedProgram, error: pErr } = await supabase.from('programs')
        .insert({ user_id: user.id, name: programName, split_type: splitType, total_days: totalDays }).select().single();
      if (pErr || !savedProgram) throw pErr;
      await supabase.from('program_days').insert(days.map((d) => ({ program_id: savedProgram.id, day_number: d.day_number, day_name: d.day_name, exercises: d.exercises })));

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
      setSaving(false);
    }
  };

  // ─── Shared section header ────────────────────────────
  const SectionHeader = ({ n, question, hint }: { n: string; question: string; hint?: string }) => (
    <div style={{ marginBottom: 48 }}>
      <div className="mono uc" style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 13 }}>{n} / {String(TOTAL_STEPS).padStart(2, '0')}</div>
      <h1 className="d-xl" style={{ margin: 0 }}>{question}</h1>
      {hint && <p className="body-l" style={{ color: 'var(--muted)', marginTop: 16, maxWidth: 560 }}>{hint}</p>}
    </div>
  );

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
            <div>
              <SectionHeader n="01" question="¿Quién eres?" hint="Usaremos esto para calibrar tu programa." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                <div>
                  <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 11 }}>Nombre</div>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre"
                    autoFocus
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      fontSize: 24, padding: '20px 0',
                      border: 'none', borderBottom: '2px solid var(--rule)',
                      background: 'transparent', color: 'var(--ink)',
                      fontFamily: 'var(--sans)', outline: 'none',
                      transition: 'border-color .2s',
                    }}
                    onFocus={e => (e.target.style.borderBottomColor = 'var(--ink)')}
                    onBlur={e => (e.target.style.borderBottomColor = 'var(--rule)')}
                  />
                </div>

                <div>
                  <div className="uc" style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 11 }}>Género</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Choice label="Masculino" selected={gender === 'male'} onClick={() => { setGender('male'); setLiftsEstimated(false); }} />
                    <Choice label="Femenino" selected={gender === 'female'} onClick={() => { setGender('female'); setLiftsEstimated(false); }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 11 }}>Peso corporal (kg)</div>
                    <input
                      type="number"
                      value={bodyweight}
                      onChange={e => { setBodyweight(+e.target.value); setLiftsEstimated(false); }}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: 32, fontFamily: 'var(--mono)', fontWeight: 600, padding: '16px 0', border: 'none', borderBottom: '2px solid var(--rule)', background: 'transparent', color: 'var(--ink)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 11 }}>Altura (cm)</div>
                    <input
                      type="number"
                      value={height}
                      onChange={e => setHeight(+e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: 32, fontFamily: 'var(--mono)', fontWeight: 600, padding: '16px 0', border: 'none', borderBottom: '2px solid var(--rule)', background: 'transparent', color: 'var(--ink)', outline: 'none' }}
                    />
                  </div>
                </div>

                {bodyweight > 0 && height > 0 && (
                  <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div className="uc" style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 4 }}>IMC</div>
                      <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>{bmi.toFixed(1)}</div>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 14px', borderRadius: 999, border: '1px solid var(--rule)', color: 'var(--muted)' }}>
                      {bmiLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 1: Goals & Equipment ────────────── */}
          {contentStep === 1 && (
            <div>
              <SectionHeader n="02" question="¿Qué buscas?" hint="Tu programa se ajusta completamente a esto." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                {!regenerateMode && (
                  <div>
                    <div className="uc" style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 11 }}>Experiencia</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {[
                        { v: 'beginner', l: 'Principiante' },
                        { v: 'intermediate', l: 'Intermedio' },
                        { v: 'advanced', l: 'Avanzado' },
                      ].map(o => <Choice key={o.v} label={o.l} selected={experience === o.v} onClick={() => { setExperience(o.v); setLiftsEstimated(false); }} />)}
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
                    ].map(o => <Choice key={o.v} label={o.l} selected={goal === o.v} onClick={() => setGoal(o.v)} />)}
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
                    ].map(o => <Choice key={o.v} label={o.l} selected={equipment === o.v} onClick={() => { setEquipment(o.v); if ((o.v === 'no_equipment' || o.v === 'bodyweight_only') && scheduleDays > 5) setScheduleDays(5); }} />)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 2: Schedule ──────────────────────── */}
          {contentStep === 2 && (
            <div>
              <SectionHeader n="03" question="¿Cuántos días?" hint="Sé honesto. Vale más cumplir 3 que prometer 6." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
                    <div className="uc" style={{ color: 'var(--muted)', fontSize: 11 }}>Días por semana</div>
                    <span className="mono" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{scheduleDays}</span>
                  </div>
                  <input type="range" min={2} max={isNoEquipment ? 5 : 6} value={scheduleDays}
                    onChange={e => setScheduleDays(+e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--ink)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="mono caption">
                    <span style={{ color: 'var(--muted)' }}>2</span><span style={{ color: 'var(--muted)' }}>3</span>
                    <span style={{ color: 'var(--muted)' }}>4</span><span style={{ color: 'var(--muted)' }}>5</span>
                    {!isNoEquipment && <span style={{ color: 'var(--muted)' }}>6</span>}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
                    <div className="uc" style={{ color: 'var(--muted)', fontSize: 11 }}>Tiempo por sesión</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span className="mono" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{sessionMinutes}</span>
                      <span className="mono" style={{ color: 'var(--muted)', fontSize: 18 }}>min</span>
                    </div>
                  </div>
                  <input type="range" min={20} max={90} step={5} value={sessionMinutes}
                    onChange={e => setSessionMinutes(+e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--ink)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="mono caption">
                    {['20', '35', '50', '65', '80', '90'].map(v => <span key={v} style={{ color: 'var(--muted)' }}>{v}</span>)}
                  </div>
                </div>

                <div>
                  <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 11 }}>
                    Lesiones / Limitaciones <span style={{ opacity: .5 }}>(opcional)</span>
                  </div>
                  <textarea
                    value={limitations}
                    onChange={e => setLimitations(e.target.value)}
                    placeholder="Ej. Dolor en hombro izquierdo, problemas de espalda baja..."
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '16px 0', border: 'none', borderBottom: '2px solid var(--rule)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 16, outline: 'none', resize: 'none' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 3: Key Lifts ──────────────────────── */}
          {contentStep === 3 && (
            <div>
              <SectionHeader n="04" question="¿Cuánto estás levantando?" hint="Pesos de trabajo actuales — no 1RMs. Los estimamos de tu perfil; ajústalos si hace falta." />
              <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '16px 24px', background: 'var(--paper-2)', borderBottom: '1px solid var(--rule)' }}>
                  <p className="body-s" style={{ color: 'var(--muted)', margin: 0 }}>
                    <strong style={{ color: 'var(--ink)' }}>¿Qué es 1RM?</strong> El peso máximo que puedes levantar en una sola repetición con técnica perfecta. No es el peso con el que entrenas a diario.
                  </p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {([
                  { key: 'squat',    label: 'Sentadilla' },
                  { key: 'bench',    label: 'Press de Pecho (Barra)' },
                  { key: 'deadlift', label: 'Peso Muerto' },
                  { key: 'ohp',      label: 'Press de Hombro' },
                ] as const).map(lift => (
                  <div key={lift.key} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 24px' }}>
                    <div className="uc" style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 16 }}>{lift.label}</div>
                    <NumStepper
                      value={keyLifts[lift.key]}
                      onChange={v => setKeyLifts({ ...keyLifts, [lift.key]: v })}
                      step={2.5}
                      min={0}
                    />
                  </div>
                ))}
              </div>
              <p className="caption" style={{ color: 'var(--muted)', marginTop: 24 }}>
                La semana 1 es de calibración — estos pesos se validarán durante tus primeras sesiones.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer navigation */}
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
