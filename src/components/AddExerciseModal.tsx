import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { searchExercise } from '../lib/claudeExercise';
import type { ExerciseSearchResult } from '../lib/claudeExercise';
import type { MovementCategory, ProgramDayExercise } from '../types';
import { CATEGORY_LABELS } from '../types';
import Modal from './Modal';
import { Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { fetchProgramDayForWeekOrFallback, fetchProgramProgressState, normalizeProgramDayExercise } from '../utils/programState';
import { replaceExerciseInProgram } from '../utils/programExerciseMutations';

type Step = 'SEARCH' | 'SEARCHING' | 'CONFIRM' | 'SAVING' | 'PROGRAM_PROMPT' | 'ADD_OR_REPLACE' | 'SELECT_REPLACE' | 'DONE';

interface DuplicateInfo {
  name: string;
  category: MovementCategory;
  source: 'user' | 'community';
}

interface ProgramDayData {
  programId: string;
  currentWeek: number;
  dayNum: number;
  dayName: string;
  exercises: ProgramDayExercise[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExerciseAdded: (exercise: { id: string; name: string; category: MovementCategory }) => void;
}

const STEP_TITLES: Record<Step, string> = {
  SEARCH: 'Añadir ejercicio',
  SEARCHING: 'Buscando...',
  CONFIRM: 'Confirmar ejercicio',
  SAVING: 'Guardando...',
  PROGRAM_PROMPT: 'Ejercicio añadido',
  ADD_OR_REPLACE: 'Añadir al programa de hoy',
  SELECT_REPLACE: '¿Qué ejercicio reemplazas?',
  DONE: '¡Listo!',
};

function sessionDraftKey(userId: string) {
  return `session_draft_${userId}`;
}

export default function AddExerciseModal({ isOpen, onClose, onExerciseAdded }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('SEARCH');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<ExerciseSearchResult | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [savedExercise, setSavedExercise] = useState<{ id: string; name: string; category: MovementCategory } | null>(null);
  const [programDay, setProgramDay] = useState<ProgramDayData | null>(null);
  const [bodyweight, setBodyweight] = useState(75);
  const [categoryMatchesDay, setCategoryMatchesDay] = useState(false);
  const [suggestedReplaceId, setSuggestedReplaceId] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState('');

  const reset = () => {
    setStep('SEARCH');
    setQuery('');
    setError(null);
    setSearchResult(null);
    setDuplicates([]);
    setSavedExercise(null);
    setProgramDay(null);
    setCategoryMatchesDay(false);
    setSuggestedReplaceId(null);
    setDoneMessage('');
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Step 1: Search via Claude API ─────────────────────────
  const handleSearch = async () => {
    if (!query.trim() || !user) return;
    setError(null);
    setStep('SEARCHING');

    try {
      const result = await searchExercise(query.trim());

      if (!result.standardized_name) {
        setStep('SEARCH');
        setError('No se reconoció ese ejercicio. Intenta con otro nombre.');
        return;
      }

      // Check for duplicates in user exercises and community_exercises
      const allNames = [result.standardized_name, ...result.alternative_names].map(n => n.toLowerCase());

      const [userExsRes, communityExsRes] = await Promise.allSettled([
        supabase.from('exercises').select('name, category').eq('user_id', user.id),
        supabase.from('community_exercises').select('name, category'),
      ]);
      const userExs = userExsRes.status === 'fulfilled' ? userExsRes.value.data : [];
      const communityExs = communityExsRes.status === 'fulfilled' ? communityExsRes.value.data : [];

      const found: DuplicateInfo[] = [];
      for (const ex of userExs ?? []) {
        if (allNames.includes(ex.name.toLowerCase())) {
          found.push({ name: ex.name, category: ex.category as MovementCategory, source: 'user' });
        }
      }
      for (const ex of (communityExs as { name: string; category: string }[] | null) ?? []) {
        if (allNames.includes(ex.name.toLowerCase()) && !found.some(f => f.name.toLowerCase() === ex.name.toLowerCase())) {
          found.push({ name: ex.name, category: ex.category as MovementCategory, source: 'community' });
        }
      }

      setSearchResult(result);
      setDuplicates(found);
      setStep('CONFIRM');
    } catch {
      setStep('SEARCH');
      setError('Error al buscar el ejercicio. Verifica tu conexión e inténtalo de nuevo.');
    }
  };

  // ── Step 2: Confirm and save ───────────────────────────────
  const handleConfirm = async () => {
    if (!searchResult?.standardized_name || !user) return;
    setStep('SAVING');

    try {
      // Save to community_exercises (ignore conflict if already exists)
      await supabase.from('community_exercises').upsert(
        { name: searchResult.standardized_name, category: searchResult.category, instructions: searchResult.instructions, created_by: user.id },
        { onConflict: 'name', ignoreDuplicates: true }
      );

      // Save to user exercises
      const { data: saved, error: exErr } = await supabase
        .from('exercises')
        .upsert({ user_id: user.id, name: searchResult.standardized_name, category: searchResult.category, status: 'YES', notes: searchResult.instructions }, { onConflict: 'user_id,name' })
        .select('id, name, category')
        .single();

      if (exErr || !saved) throw exErr ?? new Error('No se pudo guardar');

      const saved_ = { id: saved.id, name: saved.name, category: saved.category as MovementCategory };
      setSavedExercise(saved_);
      onExerciseAdded(saved_);

      // Fetch program data for today
      const { data: profile } = await supabase.from('profiles').select('bodyweight').eq('id', user.id).single();
      if (profile?.bodyweight) setBodyweight(Number(profile.bodyweight));

      const { data: program } = await supabase
        .from('programs')
        .select('id, total_days, total_weeks, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!program) { setDoneMessage(`Ejercicio guardado en la categoría "${CATEGORY_LABELS[searchResult.category]}".`); setStep('DONE'); return; }

      const progress = await fetchProgramProgressState(user.id, program);
      const dayNum = progress.currentDay;
      const currentWeek = progress.currentWeek;

      const dayResult = await fetchProgramDayForWeekOrFallback(program.id, currentWeek, dayNum);

      if (!dayResult.day) { setDoneMessage(`Ejercicio guardado en la categoría "${CATEGORY_LABELS[searchResult.category]}".`); setStep('DONE'); return; }

      const todayExercises = dayResult.day.exercises.map((exercise) => normalizeProgramDayExercise(exercise));
      const matches = todayExercises.some(ex => ex.category === searchResult.category);
      setProgramDay({ programId: program.id, currentWeek, dayNum, dayName: dayResult.day.day_name, exercises: todayExercises });
      setCategoryMatchesDay(matches);
      setStep('PROGRAM_PROMPT');
    } catch {
      setStep('CONFIRM');
      setError('Error al guardar el ejercicio. Intenta de nuevo.');
    }
  };

  // ── Step 3: User wants to add to today ────────────────────
  const handleAddToProgram = () => {
    if (!programDay || !searchResult) return;
    if (!categoryMatchesDay) {
      setDoneMessage(`Ejercicio guardado. Tu sesión de hoy (${programDay.dayName}) no incluye ejercicios de la categoría "${CATEGORY_LABELS[searchResult.category]}", así que no se añadió al día de hoy.`);
      setStep('DONE');
      return;
    }
    // Suggest the exercise to replace: last one in same category, else last overall
    const sameCategory = programDay.exercises.filter(ex => ex.category === searchResult.category);
    const suggested = sameCategory.length > 0
      ? sameCategory[sameCategory.length - 1].exercise_id
      : programDay.exercises[programDay.exercises.length - 1]?.exercise_id ?? null;
    setSuggestedReplaceId(suggested);
    setStep('ADD_OR_REPLACE');
  };

  // ── Step 4a: Add to day ───────────────────────────────────
  const handleAddExercise = async () => {
    if (!programDay || !savedExercise || !searchResult) return;
    const bw = bodyweight || 75;
    const weight = Math.round(bw * searchResult.bw_multiplier / 2.5) * 2.5;
    const newEx: ProgramDayExercise = {
      exercise_id: savedExercise.id,
      exercise_name: savedExercise.name,
      category: savedExercise.category,
      role: 'secondary',
      sets: 3,
      reps_min: 10,
      reps_max: 12,
      rpe: 7,
      weight,
      is_calibration: true,
      notes: 'Peso de calibración — ajusta según tus sensaciones',
    };
    const updated = [...programDay.exercises, newEx];
    const { error: updateErr } = await supabase
      .from('program_days')
      .update({ exercises: updated })
      .eq('program_id', programDay.programId)
      .eq('day_number', programDay.dayNum)
      .gte('week_num', programDay.currentWeek);
    if (updateErr) { setError('No se pudo añadir el ejercicio al programa. Intenta de nuevo.'); return; }
    localStorage.removeItem(sessionDraftKey(user!.id));
    setDoneMessage(`¡${savedExercise.name} añadido a ${programDay.dayName}! Aparecerá en tu próxima sesión con un peso de calibración de ${weight} kg.`);
    setStep('DONE');
  };

  // ── Step 4b: Replace exercise ─────────────────────────────
  const handleReplaceExercise = async (replaceId: string) => {
    if (!programDay || !savedExercise || !searchResult) return;
    const bw = bodyweight || 75;
    const weight = Math.round(bw * searchResult.bw_multiplier / 2.5) * 2.5;
    const replaced = programDay.exercises.find(ex => ex.exercise_id === replaceId);
    try {
      await replaceExerciseInProgram({
        userId: user!.id,
        programId: programDay.programId,
        currentWeek: programDay.currentWeek,
        fromExerciseId: replaceId,
        toExerciseId: savedExercise.id,
      });
      localStorage.removeItem(sessionDraftKey(user!.id));
      setDoneMessage(`¡${savedExercise.name} reemplazó a "${replaced?.exercise_name ?? replaceId}" desde ${programDay.dayName}! ${weight > 0 ? `Su peso inicial sugerido es ${weight} kg.` : ''}`);
      setStep('DONE');
    } catch {
      setError('No se pudo actualizar el programa. Intenta de nuevo.');
    }
  };

  // ── Render helpers ────────────────────────────────────────
  const renderContent = () => {
    switch (step) {
      case 'SEARCH':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="caption" style={{ color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Nombre del ejercicio o máquina</label>
              <input
                className="body"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="ej. Leg Press, Cable Fly, Hip Abductor..."
                autoFocus
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--paper-2)', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(186,26,26,0.08)', border: '1px solid rgba(186,26,26,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                <AlertTriangle size={16} style={{ color: '#ba1a1a', flexShrink: 0, marginTop: 1 }} />
                <span className="caption" style={{ color: '#ba1a1a' }}>{error}</span>
              </div>
            )}
            <p className="caption" style={{ color: 'var(--muted)', margin: 0 }}>
              Claude buscará información del ejercicio y sugerirá la categoría correcta automáticamente.
            </p>
          </div>
        );

      case 'SEARCHING':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
            <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
            <span className="body" style={{ color: 'var(--muted)' }}>Consultando información del ejercicio...</span>
          </div>
        );

      case 'CONFIRM':
        if (!searchResult) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Exercise info card */}
            <div style={{ background: 'var(--paper-2)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <span className="d-s" style={{ fontWeight: 700, lineHeight: 1.2 }}>{searchResult.standardized_name}</span>
                <span className="mono caption" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {CATEGORY_LABELS[searchResult.category]}
                </span>
              </div>
              <p className="caption" style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{searchResult.instructions}</p>
            </div>

            {/* Duplicate warning */}
            {duplicates.length > 0 && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(255,160,0,0.08)', border: '1px solid rgba(255,160,0,0.3)', borderRadius: 8, padding: '12px 14px' }}>
                <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div className="caption" style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Posible duplicado encontrado</div>
                  {duplicates.map((d, i) => (
                    <div key={i} className="caption" style={{ color: '#92400e' }}>
                      "{d.name}" ya existe en tu biblioteca bajo{' '}
                      <strong>{CATEGORY_LABELS[d.category]}</strong>
                      {d.source === 'community' ? ' (biblioteca comunitaria)' : ''}.
                    </div>
                  ))}
                  <div className="caption" style={{ color: '#92400e', marginTop: 6 }}>Puedes continuar si es un ejercicio distinto.</div>
                </div>
              </div>
            )}

            {error && (
              <div className="caption" style={{ color: '#ba1a1a' }}>{error}</div>
            )}
          </div>
        );

      case 'SAVING':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
            <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
            <span className="body" style={{ color: 'var(--muted)' }}>Guardando ejercicio...</span>
          </div>
        );

      case 'PROGRAM_PROMPT':
        if (!savedExercise) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(0,120,80,0.08)', border: '1px solid rgba(0,120,80,0.2)', borderRadius: 8, padding: '12px 14px' }}>
              <CheckCircle2 size={16} style={{ color: '#00834e', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="caption" style={{ fontWeight: 600, color: '#00834e' }}>Ejercicio guardado</div>
                <div className="caption" style={{ color: '#00834e', marginTop: 2 }}>
                  {savedExercise.name} se añadió a{' '}
                  <strong>{CATEGORY_LABELS[savedExercise.category]}</strong> en tu biblioteca.
                </div>
              </div>
            </div>
            {programDay && (
              <div style={{ background: 'var(--paper-2)', borderRadius: 10, padding: '14px 16px' }}>
                <div className="body" style={{ fontWeight: 600 }}>¿Incorporarlo a tu programa ahora?</div>
                <div className="caption" style={{ color: 'var(--muted)', marginTop: 4 }}>
                  Tu siguiente sesión es: <strong>{programDay.dayName}</strong>.
                  {!categoryMatchesDay && (
                    <span> Este ejercicio ({CATEGORY_LABELS[savedExercise.category]}) no corresponde a esa sesión.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'ADD_OR_REPLACE':
        if (!programDay || !searchResult) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="caption" style={{ color: 'var(--muted)' }}>
              Sesión: <strong style={{ color: 'var(--ink)' }}>{programDay.dayName}</strong>
            </div>
            <button
              onClick={handleAddExercise}
              className="btn btn-ink btn-sq"
              style={{ justifyContent: 'flex-start', borderRadius: 8, padding: '14px 18px', textAlign: 'left', display: 'block' }}
            >
              <div style={{ fontWeight: 700 }}>Añadir al final</div>
              <div style={{ fontSize: 13, opacity: .7, marginTop: 4, fontWeight: 400 }}>Se agrega como ejercicio extra a la sesión de hoy en adelante.</div>
            </button>
            <button
              onClick={() => setStep('SELECT_REPLACE')}
              style={{ background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink)', padding: '14px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--sans)', textAlign: 'left' }}
            >
              <div style={{ fontWeight: 700 }}>Reemplazar un ejercicio</div>
              <div style={{ fontSize: 13, opacity: .7, marginTop: 4, fontWeight: 400 }}>Sustituye a otro ejercicio de hoy en adelante.</div>
            </button>
          </div>
        );

      case 'SELECT_REPLACE':
        if (!programDay) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="caption" style={{ color: 'var(--muted)', marginBottom: 4 }}>
              Selecciona el ejercicio a reemplazar:
            </div>
            {programDay.exercises.filter(ex => ex.category === searchResult?.category).map(ex => {
              const isSuggested = ex.exercise_id === suggestedReplaceId;
              return (
                <button
                  key={ex.exercise_id}
                  onClick={() => handleReplaceExercise(ex.exercise_id)}
                  style={{
                    background: isSuggested ? 'var(--paper-2)' : 'transparent',
                    border: isSuggested ? '1.5px solid var(--ink)' : '1px solid var(--rule)',
                    color: 'var(--ink)',
                    padding: '12px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontFamily: 'var(--sans)',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: isSuggested ? 700 : 500, fontSize: 14 }}>{ex.exercise_name}</div>
                    <div style={{ fontSize: 12, opacity: .6, marginTop: 2 }}>{CATEGORY_LABELS[ex.category as MovementCategory] ?? ex.category} — {ex.sets}×{ex.reps_min}</div>
                  </div>
                  {isSuggested && (
                    <span style={{ background: 'var(--ink)', color: 'var(--paper)', fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                      SUGERIDO
                    </span>
                  )}
                </button>
              );
            })}
            {programDay.exercises.filter(ex => ex.category === searchResult?.category).length === 0 && (
              <div className="caption" style={{ color: 'var(--muted)' }}>
                No hay ejercicios compatibles de esa categoría para reemplazar en esta sesión.
              </div>
            )}
          </div>
        );

      case 'DONE':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
            <CheckCircle2 size={36} style={{ color: '#00834e' }} />
            <p className="body" style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>{doneMessage}</p>
          </div>
        );
    }
  };

  const renderActions = () => {
    switch (step) {
      case 'SEARCH':
        return (
          <>
            <button onClick={handleClose} className="btn btn-ghost">Cancelar</button>
            <button onClick={handleSearch} disabled={!query.trim()} className="btn btn-ink">Buscar →</button>
          </>
        );
      case 'CONFIRM':
        return (
          <>
            <button onClick={reset} className="btn btn-ghost">Atrás</button>
            <button onClick={handleConfirm} className="btn btn-ink">Confirmar y añadir</button>
          </>
        );
      case 'PROGRAM_PROMPT':
        return (
          <>
            <button onClick={() => { setDoneMessage(`Ejercicio guardado en "${CATEGORY_LABELS[savedExercise!.category]}". Puedes encontrarlo en tu biblioteca.`); setStep('DONE'); }} className="btn btn-ghost">No, gracias</button>
            {programDay && (
              <button onClick={handleAddToProgram} className="btn btn-ink">Sí, incorporar →</button>
            )}
          </>
        );
      case 'ADD_OR_REPLACE':
        return <button onClick={() => setStep('PROGRAM_PROMPT')} className="btn btn-ghost">Atrás</button>;
      case 'SELECT_REPLACE':
        return <button onClick={() => setStep('ADD_OR_REPLACE')} className="btn btn-ghost">Atrás</button>;
      case 'DONE':
        return <button onClick={handleClose} className="btn btn-ink">Cerrar</button>;
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'CONFIRM' && searchResult?.standardized_name ? searchResult.standardized_name : STEP_TITLES[step]}
      size="md"
      icon={step === 'CONFIRM' ? <Info size={20} /> : undefined}
      actions={renderActions()}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {renderContent()}
    </Modal>
  );
}
