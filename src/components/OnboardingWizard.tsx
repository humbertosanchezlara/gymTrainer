import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DEFAULT_EXERCISES, type ExerciseStatus } from '../types';
import { estimateKeyLifts } from '../engine/weightEstimator';
import { generateProgram } from '../engine/programGenerator';
import { getSplitTemplate } from '../engine/splitTemplates';
import { ArrowRight, ArrowLeft, User, Target, Calendar, Dumbbell, Loader2, Check } from 'lucide-react';

// ─── Step animation variants ─────────────────────────────
const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, transition: { duration: 0.2 } }),
};

const fadeUp = {
  hidden: { y: 16, opacity: 0 },
  show: (i: number) => ({ y: 0, opacity: 1, transition: { delay: i * 0.06, type: 'spring' as const, stiffness: 300, damping: 24 } }),
};

// ─── Chip Selector Component ─────────────────────────────
function ChipGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-5 py-2.5 rounded-full font-headline font-bold text-sm tracking-tight transition-all duration-200 border ${
            value === opt.value
              ? 'bg-primary-container text-on-primary-container border-primary-container shadow-md shadow-primary-container/20'
              : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Steps indicator ─────────────────────────────────────
function StepsIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i <= current
              ? 'bg-primary-container w-8'
              : 'bg-outline-variant/25 w-4'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Identity
  const [name, setName] = useState('');
  const [bodyweight, setBodyweight] = useState<number>(75);

  // Step 2: Experience & Goals
  const [experience, setExperience] = useState('intermediate');
  const [goal, setGoal] = useState('hypertrophy');
  const [equipment, setEquipment] = useState('commercial_gym');

  // Step 3: Schedule
  const [scheduleDays, setScheduleDays] = useState(4);
  const [limitations, setLimitations] = useState('');

  // Step 4: Key Lifts
  const [keyLifts, setKeyLifts] = useState({ squat: 0, bench: 0, deadlift: 0, ohp: 0 });
  const [liftsEstimated, setLiftsEstimated] = useState(false);

  const TOTAL_STEPS = 4;

  const next = () => {
    if (step === 2 && !liftsEstimated) {
      const estimated = estimateKeyLifts(bodyweight, experience);
      setKeyLifts(estimated);
      setLiftsEstimated(true);
    }
    setDir(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const prev = () => {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const splitInfo = getSplitTemplate(scheduleDays);

  const canProceed = () => {
    switch (step) {
      case 0: return name.trim().length > 0 && bodyweight > 0;
      case 1: return true;
      case 2: return scheduleDays >= 2 && scheduleDays <= 6;
      case 3: return keyLifts.squat > 0 && keyLifts.bench > 0 && keyLifts.deadlift > 0 && keyLifts.ohp > 0;
      default: return false;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        name,
        bodyweight,
        training_experience: experience,
        goal,
        schedule_days: scheduleDays,
        equipment_access: equipment,
        limitations: limitations || null,
      });

      const exerciseRows = DEFAULT_EXERCISES.map((e) => ({
        user_id: user.id,
        name: e.name,
        category: e.category,
        status: 'YES' as ExerciseStatus,
      }));
      await supabase.from('exercises').upsert(exerciseRows, { onConflict: 'user_id,name' });

      const { data: exercises } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'YES');

      if (!exercises || exercises.length === 0) {
        throw new Error('Failed to seed exercises');
      }

      const program = generateProgram(exercises, scheduleDays, bodyweight, experience, keyLifts, goal);

      const { data: savedProgram, error: pErr } = await supabase
        .from('programs')
        .insert({
          user_id: user.id,
          name: program.name,
          split_type: program.split_type,
          total_days: program.total_days,
        })
        .select()
        .single();

      if (pErr || !savedProgram) throw pErr;

      const dayRows = program.days.map((d) => ({
        program_id: savedProgram.id,
        day_number: d.day_number,
        day_name: d.day_name,
        exercises: d.exercises,
      }));
      await supabase.from('program_days').insert(dayRows);

      const mainLifts = [
        { name: 'Barbell Back Squat', weight: keyLifts.squat },
        { name: 'Barbell Bench Press', weight: keyLifts.bench },
        { name: 'Conventional Deadlift', weight: keyLifts.deadlift },
        { name: 'Barbell OHP', weight: keyLifts.ohp },
      ];

      for (const lift of mainLifts) {
        const ex = exercises.find((e) => e.name === lift.name);
        if (ex) {
          await supabase.from('working_weights').upsert(
            { user_id: user.id, exercise_id: ex.id, weight: lift.weight, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,exercise_id' }
          );
        }
      }

      onComplete();
    } catch (err) {
      console.error('Onboarding failed:', err);
      setSaving(false);
    }
  };

  // ─── Input class helper ─────────────────────────────────
  const inputCls = "w-full bg-surface-container-low rounded-lg border-none py-4 px-5 text-on-surface text-lg placeholder:text-on-surface-variant/30 outline-none focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all font-body";

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden flex flex-col">
      {/* Ambient */}
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-container/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-container/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-8 pt-10 pb-6 flex items-center justify-between">
        <h1 className="text-2xl font-headline font-extrabold tracking-tighter text-on-surface">
          FIT<span className="text-primary">.</span>
        </h1>
        <StepsIndicator current={step} total={TOTAL_STEPS} />
      </div>

      {/* Step Content */}
      <div className="flex-1 relative z-10 px-8 flex flex-col justify-center max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait" custom={dir}>
          {/* ─── Step 0: Identity ────────────────────── */}
          {step === 0 && (
            <motion.div key="step-0" custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-8">
              <div>
                <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show" className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
                  <User size={14} /> Identidad
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} initial="hidden" animate="show" className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight leading-[1.1] text-on-surface">
                  ¿Quién eres?
                </motion.h2>
              </div>

              <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show" className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Peso corporal (kg)</label>
                  <input
                    type="number"
                    value={bodyweight}
                    onChange={(e) => { setBodyweight(+e.target.value); setLiftsEstimated(false); }}
                    className={inputCls}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── Step 1: Experience & Goals ───────────── */}
          {step === 1 && (
            <motion.div key="step-1" custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-8">
              <div>
                <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show" className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
                  <Target size={14} /> Experiencia y Objetivos
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} initial="hidden" animate="show" className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight leading-[1.1] text-on-surface">
                  ¿Dónde estás?
                </motion.h2>
              </div>

              <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show" className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">Experiencia</label>
                  <ChipGroup
                    options={[
                      { value: 'beginner', label: 'Principiante' },
                      { value: 'intermediate', label: 'Intermedio' },
                      { value: 'advanced', label: 'Avanzado' },
                    ]}
                    value={experience}
                    onChange={(v) => { setExperience(v); setLiftsEstimated(false); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">Objetivo</label>
                  <ChipGroup
                    options={[
                      { value: 'hypertrophy', label: 'Hipertrofia' },
                      { value: 'strength', label: 'Fuerza' },
                      { value: 'fat_loss', label: 'Pérdida de grasa' },
                      { value: 'general', label: 'Fitness general' },
                    ]}
                    value={goal}
                    onChange={setGoal}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">Equipamiento</label>
                  <ChipGroup
                    options={[
                      { value: 'commercial_gym', label: 'Gimnasio comercial' },
                      { value: 'home_gym', label: 'Gimnasio en casa' },
                      { value: 'dumbbells_only', label: 'Solo mancuernas' },
                    ]}
                    value={equipment}
                    onChange={setEquipment}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── Step 2: Schedule ─────────────────────── */}
          {step === 2 && (
            <motion.div key="step-2" custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-8">
              <div>
                <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show" className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
                  <Calendar size={14} /> Horario
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} initial="hidden" animate="show" className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight leading-[1.1] text-on-surface">
                  ¿Cuántos días?
                </motion.h2>
              </div>

              <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show" className="space-y-8">
                <div>
                  <div className="flex items-baseline justify-between mb-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Días por semana</label>
                    <span className="text-5xl font-headline font-extrabold text-primary">{scheduleDays}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={6}
                    value={scheduleDays}
                    onChange={(e) => setScheduleDays(+e.target.value)}
                    className="w-full accent-primary h-1.5 bg-outline-variant/20 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-on-surface-variant/40 text-xs mt-2 font-body">
                    <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
                  </div>
                </div>

                {/* Split preview */}
                <div className="card-elevated rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Split auto-seleccionado</span>
                    <span className="text-primary font-headline font-bold text-sm">{splitInfo.label}</span>
                  </div>
                  <div className="space-y-1.5">
                    {splitInfo.days.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-on-surface-variant/50 font-headline font-bold w-14">Día {i + 1}</span>
                        <span className="text-on-surface font-body">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
                    Lesiones / Limitaciones <span className="text-on-surface-variant/30">(opcional)</span>
                  </label>
                  <textarea
                    value={limitations}
                    onChange={(e) => setLimitations(e.target.value)}
                    placeholder="Ej. Dolor en hombro izquierdo, problemas de espalda baja..."
                    rows={2}
                    className="w-full bg-surface-container-low rounded-lg border-none py-3 px-5 text-on-surface text-sm placeholder:text-on-surface-variant/30 outline-none focus:ring-1 focus:ring-primary transition-all font-body resize-none"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── Step 3: Key Lifts ────────────────────── */}
          {step === 3 && (
            <motion.div key="step-3" custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-8">
              <div>
                <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show" className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
                  <Dumbbell size={14} /> Pesos de Trabajo
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} initial="hidden" animate="show" className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight leading-[1.1] text-on-surface">
                  ¿Cuánto estás levantando?
                </motion.h2>
                <motion.p variants={fadeUp} custom={2} initial="hidden" animate="show" className="text-on-surface-variant mt-2 text-sm font-body">
                  Estos son tus pesos de trabajo actuales — no 1RMs. Los estimamos a partir de tu peso corporal. Ajústalos si es necesario.
                </motion.p>
              </div>

              <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show" className="grid grid-cols-2 gap-4">
                {([
                  { key: 'squat', label: 'Sentadilla' },
                  { key: 'bench', label: 'Press Banca' },
                  { key: 'deadlift', label: 'Peso Muerto' },
                  { key: 'ohp', label: 'Press Militar' },
                ] as const).map((lift) => (
                  <div key={lift.key} className="card-elevated rounded-xl p-5">
                    <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-2">{lift.label}</label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        value={keyLifts[lift.key]}
                        onChange={(e) => setKeyLifts({ ...keyLifts, [lift.key]: +e.target.value })}
                        step={2.5}
                        className="w-full bg-transparent text-3xl font-headline font-extrabold text-on-surface outline-none"
                      />
                      <span className="text-primary font-headline font-bold text-sm shrink-0">kg</span>
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.p variants={fadeUp} custom={4} initial="hidden" animate="show" className="text-on-surface-variant/50 text-xs font-body">
                La semana 1 es de calibración — estos pesos se validarán durante tus primeras sesiones.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="relative z-10 px-8 pb-10 pt-6 flex items-center justify-between max-w-lg mx-auto w-full">
        {step > 0 ? (
          <button
            onClick={prev}
            className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors font-headline font-bold text-sm"
          >
            <ArrowLeft size={16} /> Atrás
          </button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS - 1 ? (
          <button
            onClick={next}
            disabled={!canProceed()}
            className="bg-primary-container text-on-primary-container font-headline font-bold px-8 py-3.5 rounded-full text-base tracking-tight flex items-center gap-2 hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-primary-container/20 disabled:opacity-30 disabled:hover:scale-100"
          >
            Continuar <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={saving || !canProceed()}
            className="bg-primary-container text-on-primary-container font-headline font-bold px-8 py-3.5 rounded-full text-base tracking-tight flex items-center gap-2 hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-primary-container/25 disabled:opacity-30"
          >
            {saving ? (
              <><Loader2 size={18} className="animate-spin" /> Generando...</>
            ) : (
              <><Check size={18} /> Generar Programa</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
