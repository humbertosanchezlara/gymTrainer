import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { searchExercise } from '../lib/claudeExercise';
import type { ExerciseSearchResult } from '../lib/claudeExercise';
import type { MovementCategory, ProgramDayExercise } from '../types';
import { CATEGORY_LABELS } from '../types';
import Modal from './Modal';
import { Info } from 'lucide-react';
import { fetchProgramDayForWeekOrFallback, fetchProgramProgressState, normalizeProgramDayExercise } from '../utils/programState';
import { replaceExerciseInProgram } from '../utils/programExerciseMutations';
import {
  AddExerciseConfirmStep,
  AddExerciseDoneStep,
  AddExerciseLoadingStep,
  AddExerciseProgramOptionsStep,
  AddExerciseProgramPromptStep,
  AddExerciseReplaceStep,
  AddExerciseSearchStep,
} from './addExercise/AddExerciseSteps';

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
        return <AddExerciseSearchStep query={query} onQueryChange={setQuery} onSubmit={handleSearch} error={error} />;

      case 'SEARCHING':
        return <AddExerciseLoadingStep message="Consultando información del ejercicio..." />;

      case 'CONFIRM':
        if (!searchResult) return null;
        return <AddExerciseConfirmStep searchResult={searchResult} duplicates={duplicates} error={error} />;

      case 'SAVING':
        return <AddExerciseLoadingStep message="Guardando ejercicio..." />;

      case 'PROGRAM_PROMPT':
        if (!savedExercise) return null;
        return <AddExerciseProgramPromptStep savedExercise={savedExercise} dayName={programDay?.dayName ?? null} categoryMatchesDay={categoryMatchesDay} />;

      case 'ADD_OR_REPLACE':
        if (!programDay || !searchResult) return null;
        return <AddExerciseProgramOptionsStep dayName={programDay.dayName} onAdd={handleAddExercise} onReplace={() => setStep('SELECT_REPLACE')} />;

      case 'SELECT_REPLACE':
        if (!programDay || !searchResult) return null;
        return <AddExerciseReplaceStep exercises={programDay.exercises} category={searchResult.category} suggestedReplaceId={suggestedReplaceId} onSelect={handleReplaceExercise} />;

      case 'DONE':
        return <AddExerciseDoneStep doneMessage={doneMessage} />;
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
