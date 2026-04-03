import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Exercise, Session, SessionLog, WorkingWeight } from '../types';
import { CATEGORY_LABELS, DEFAULT_EXERCISES, type MovementCategory, type ExerciseStatus } from '../types';
import ProgramView from './ProgramView';
import {
  Activity, Dumbbell, BookOpen, LineChart, ClipboardList,
  Plus, Check, ChevronDown, ChevronRight,
  LogOut, Save, Trash2
} from 'lucide-react';

// ─── Animation Variants ───────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const fadeUp = {
  hidden: { y: 18, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

// ─── Nav Items ────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Inicio', icon: Activity },
  { id: 'program', label: 'Programa', icon: ClipboardList },
  { id: 'session', label: 'Entrenar', icon: Dumbbell },
  { id: 'library', label: 'Ejercicios', icon: BookOpen },
  { id: 'progress', label: 'Progreso', icon: LineChart },
] as const;

type Tab = typeof NAV[number]['id'];

// ─── Main Shell ───────────────────────────────────────────
export default function MainShell() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-surface relative selection:bg-primary-container selection:text-on-primary-container">
      {/* Ambient light */}
      <div className="fixed top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary-container/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] rounded-full bg-secondary-container/8 blur-[100px] pointer-events-none" />

      {/* Desktop layout */}
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row min-h-screen relative z-10">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col justify-between w-72 px-8 py-12 border-r border-outline-variant/15">
          <div>
            <h1 className="text-5xl font-headline font-extrabold leading-[0.85] tracking-tighter mb-2 text-on-surface">
              FIT<span className="text-primary">.</span>
            </h1>
            <p className="text-on-surface-variant text-sm font-body mb-14">Entrenamiento basado en evidencia</p>

            <nav className="flex flex-col gap-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`flex items-center gap-4 py-3.5 px-5 rounded-xl transition-all duration-300 text-left font-headline font-bold text-base tracking-tight relative overflow-hidden ${
                      active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebarActive"
                        className="absolute inset-0 bg-primary-container/25 border border-primary-container/30 rounded-xl"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <Icon size={18} className="relative z-10 shrink-0" />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-3 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors text-sm font-body px-5 py-3"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </aside>

        {/* Content */}
        <main className="flex-1 px-6 py-8 pb-28 lg:px-12 lg:py-12 overflow-y-auto">
          <AnimatePresence mode="wait">
            {tab === 'dashboard' && <DashboardView key="dash" onNavigate={setTab} />}
            {tab === 'program' && <ProgramView key="prog-view" />}
            {tab === 'session' && <SessionView key="sess" onNavigate={setTab} />}
            {tab === 'library' && <LibraryView key="lib" />}
            {tab === 'progress' && <ProgressView key="prog" />}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass-nav">
        <div className="flex justify-around py-3 max-w-md mx-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 transition-all duration-200 relative ${
                  active ? 'text-primary' : 'text-on-surface-variant/50'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-headline font-bold tracking-wide">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="mobileActive"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════
function DashboardView({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { user } = useAuth();
  const [weights, setWeights] = useState<WorkingWeight[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [nextDayName, setNextDayName] = useState<string | null>(null);
  const [nextDayNum, setNextDayNum] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('working_weights').select('*, exercise:exercises(*)').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
      supabase.from('programs').select('id, total_days').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(async ([wRes, sRes, pRes, countRes]) => {
      if (wRes.data) setWeights(wRes.data);
      if (sRes.data) setSessions(sRes.data);

      if (pRes.data) {
        const totalSessions = countRes.count ?? 0;
        const dayNum = (totalSessions % pRes.data.total_days) + 1;
        setNextDayNum(dayNum);
        const { data: dayData } = await supabase
          .from('program_days')
          .select('day_name')
          .eq('program_id', pRes.data.id)
          .eq('day_number', dayNum)
          .maybeSingle();
        if (dayData) setNextDayName(dayData.day_name);
      }

      setLoading(false);
    });
  }, [user]);

  const topWeights = weights.slice(0, 4);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-8">
      {/* Hero card */}
      <motion.div variants={fadeUp} className="glass-panel rounded-xl p-8 md:p-12 relative overflow-hidden group shadow-xl shadow-on-surface/3">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-container/20 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 transition-transform duration-700 group-hover:scale-[1.4]" />
        <h2 className="text-3xl md:text-4xl font-headline font-extrabold mb-2 relative z-10 text-on-surface">¿Listo para entrenar?</h2>
        <p className="text-on-surface-variant mb-2 max-w-md relative z-10 font-body">
          {sessions.length === 0
            ? 'Aún no tienes sesiones. Comienza la primera.'
            : `Última sesión: ${sessions[0]?.name ?? '—'}`}
        </p>
        {nextDayName && (
          <p className="text-primary mb-8 relative z-10 font-headline font-bold text-sm tracking-tight">
            Siguiente: Día {nextDayNum} — {nextDayName}
          </p>
        )}
        {!nextDayName && <div className="mb-8" />}
        <button
          onClick={() => onNavigate('session')}
          className="relative z-10 bg-primary-container text-on-primary-container font-headline font-bold px-8 py-4 rounded-full text-lg tracking-tight hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-primary-container/25 flex items-center gap-2 group/btn"
        >
          Iniciar Sesión
          <Dumbbell size={18} className="group-hover/btn:rotate-12 transition-transform" />
        </button>
      </motion.div>

      {/* Working Weights Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <motion.div key={i} variants={fadeUp} className="card-elevated rounded-xl p-6 animate-pulse h-36" />
            ))
          : topWeights.length > 0
          ? topWeights.map((w) => (
              <motion.div
                key={w.id}
                variants={fadeUp}
                className="card-elevated rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest truncate">
                  {(w.exercise as any)?.name ?? 'Ejercicio'}
                </span>
                <div className="mt-3">
                  <span className="text-4xl font-headline font-extrabold text-on-surface">{w.weight}</span>
                  <span className="text-primary font-headline font-bold ml-1">kg</span>
                </div>
              </motion.div>
            ))
          : (
              <motion.div variants={fadeUp} className="col-span-full card-elevated rounded-xl p-8 text-center text-on-surface-variant font-body">
                No tienes pesos de trabajo aún. Registra tu primera sesión para empezar.
              </motion.div>
            )}
      </div>

      {/* Recent Sessions */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-6 md:p-8">
        <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Sesiones Recientes</h3>
        {sessions.length === 0 ? (
          <p className="text-on-surface-variant/50 font-body text-sm py-8 text-center">Sin sesiones registradas</p>
        ) : (
          <div className="divide-y divide-outline-variant/15">
            {sessions.map((s) => (
              <div key={s.id} className="flex justify-between items-center py-3.5 hover:bg-surface-container-high/50 -mx-3 px-3 rounded-lg transition-colors">
                <div className="flex gap-4 items-center">
                  <span className="text-primary font-headline font-bold text-sm w-12">
                    {s.block_num ? `B${s.block_num}` : '—'}
                  </span>
                  <span className="text-on-surface font-body">{s.name}</span>
                </div>
                <span className="text-on-surface-variant/50 text-sm">{new Date(s.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SESSION / TRAINING VIEW — Auto-fill from program
// ═══════════════════════════════════════════════════════════
interface SessionLogEntry {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps_per_set: number;
  weight: number;
  rpe: number;
  notes: string;
}

function getBlockInfo(week: number): { blockNum: number; blockName: string } {
  if (week <= 4) return { blockNum: 1, blockName: 'Volumen' };
  if (week <= 8) return { blockNum: 2, blockName: 'Intensidad' };
  if (week <= 11) return { blockNum: 3, blockName: 'Pico' };
  return { blockNum: 4, blockName: 'Descarga' };
}

function SessionView({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [weekNum, setWeekNum] = useState<number>(1);
  const [blockNum, setBlockNum] = useState<number>(1);
  const [blockName, setBlockName] = useState('Volumen');
  const [dayNum, setDayNum] = useState<number>(1);
  const [logs, setLogs] = useState<SessionLogEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingProgram, setLoadingProgram] = useState(true);
  const [hasProgram, setHasProgram] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadSession = async () => {
      const { data: exData } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'YES')
        .order('category');
      if (exData) setExercises(exData);

      const { data: program } = await supabase
        .from('programs')
        .select('id, total_days, total_weeks')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!program) {
        setLoadingProgram(false);
        return;
      }

      setHasProgram(true);

      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const sessCount = totalSessions ?? 0;
      const currentDayNum = (sessCount % program.total_days) + 1;
      const currentWeek = Math.floor(sessCount / program.total_days) + 1;
      const { blockNum: bNum, blockName: bName } = getBlockInfo(currentWeek);

      setDayNum(currentDayNum);
      setWeekNum(currentWeek);
      setBlockNum(bNum);
      setBlockName(bName);

      const { data: programDay } = await supabase
        .from('program_days')
        .select('*')
        .eq('program_id', program.id)
        .eq('day_number', currentDayNum)
        .maybeSingle();

      if (programDay) {
        setSessionName(programDay.day_name);

        const { data: wwData } = await supabase
          .from('working_weights')
          .select('exercise_id, weight')
          .eq('user_id', user.id);

        const weightMap = new Map<string, number>();
        if (wwData) {
          for (const ww of wwData) {
            weightMap.set(ww.exercise_id, Number(ww.weight));
          }
        }

        const dayExercises = (programDay.exercises || []) as any[];
        const preFilled: SessionLogEntry[] = dayExercises.map((ex: any) => {
          const currentWeight = weightMap.get(ex.exercise_id) ?? ex.weight ?? 0;
          return {
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name || '—',
            sets: ex.sets,
            reps_per_set: ex.reps_max ?? ex.reps_min ?? 8,
            weight: currentWeight,
            rpe: ex.rpe ?? 7,
            notes: '',
          };
        });

        setLogs(preFilled);
      }

      setLoadingProgram(false);
    };

    loadSession();
  }, [user]);

  const addLog = () => {
    setLogs([...logs, { exercise_id: '', exercise_name: '', sets: 3, reps_per_set: 8, weight: 0, rpe: 7, notes: '' }]);
  };

  const updateLog = (idx: number, field: string, value: any) => {
    const updated = [...logs];
    (updated[idx] as any)[field] = value;
    if (field === 'exercise_id') {
      const found = exercises.find(e => e.id === value);
      updated[idx].exercise_name = found?.name ?? '';
    }
    setLogs(updated);
  };

  const removeLog = (idx: number) => {
    setLogs(logs.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!user || !sessionName || logs.length === 0) return;
    setSaving(true);

    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .insert({ user_id: user.id, name: sessionName, week_num: weekNum, block_num: blockNum })
      .select()
      .single();

    if (sErr || !session) { setSaving(false); return; }

    const logRows = logs.filter(l => l.exercise_id).map(l => ({
      session_id: session.id,
      exercise_id: l.exercise_id,
      sets: l.sets,
      reps_per_set: l.reps_per_set,
      weight: l.weight,
      rpe: l.rpe || null,
      notes: l.notes || null,
    }));

    await supabase.from('session_logs').insert(logRows);

    for (const l of logs.filter(l => l.exercise_id && l.weight > 0)) {
      await supabase.from('working_weights').upsert(
        { user_id: user.id, exercise_id: l.exercise_id, weight: l.weight, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,exercise_id' }
      );
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      onNavigate('dashboard');
    }, 1500);
  };

  if (loadingProgram) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const inputNumCls = "w-full bg-surface-container-low border-none rounded-lg py-2 px-3 text-center text-on-surface outline-none focus:ring-1 focus:ring-primary transition-colors font-body text-sm";

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6 max-w-2xl">
      <motion.div variants={fadeUp}>
        <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-1 text-on-surface">
          {hasProgram ? sessionName || 'Registrar Sesión' : 'Registrar Sesión'}
        </h2>
        <p className="text-on-surface-variant font-body text-sm">
          {hasProgram ? (
            <>
              Día {dayNum} · Semana {weekNum} · <span className="text-primary font-bold">{blockName}</span>
            </>
          ) : (
            'Registra tu trabajo. Los pesos se actualizan automáticamente.'
          )}
        </p>
      </motion.div>

      {/* Session Meta */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Detalles de la Sesión</span>
          {hasProgram && (
            <span className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">Llenado automático</span>
          )}
        </div>
        <input
          type="text"
          placeholder="Nombre de la sesión"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          className="w-full bg-transparent border-b border-outline-variant/20 pb-2 text-on-surface text-lg font-headline font-bold placeholder:text-on-surface-variant/30 outline-none focus:border-primary transition-colors mb-3"
        />
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-on-surface-variant/60 text-[10px] font-bold uppercase tracking-widest block mb-1">Semana</label>
            <input type="number" min={1} max={12} value={weekNum} onChange={(e) => setWeekNum(+e.target.value)}
              className={inputNumCls} />
          </div>
          <div className="flex-1">
            <label className="text-on-surface-variant/60 text-[10px] font-bold uppercase tracking-widest block mb-1">Bloque</label>
            <input type="number" min={1} max={4} value={blockNum} onChange={(e) => setBlockNum(+e.target.value)}
              className={inputNumCls} />
          </div>
        </div>
      </motion.div>

      {/* Exercise Logs */}
      <AnimatePresence>
        {logs.map((log, i) => (
          <motion.div
            key={`log-${i}-${log.exercise_id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.04 }}
            className="card-elevated rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              {log.exercise_name ? (
                <span className="text-on-surface font-headline font-bold text-lg tracking-tight">{log.exercise_name}</span>
              ) : (
                <select
                  value={log.exercise_id}
                  onChange={(e) => updateLog(i, 'exercise_id', e.target.value)}
                  className="flex-1 bg-transparent text-on-surface font-headline font-bold text-lg outline-none appearance-none cursor-pointer"
                >
                  <option value="" className="bg-surface">Seleccionar ejercicio...</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id} className="bg-surface">{ex.name}</option>
                  ))}
                </select>
              )}
              <button onClick={() => removeLog(i)} className="text-on-surface-variant/30 hover:text-error transition-colors p-1">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Series', field: 'sets', val: log.sets },
                { label: 'Reps', field: 'reps_per_set', val: log.reps_per_set },
                { label: 'Peso', field: 'weight', val: log.weight },
                { label: 'RPE', field: 'rpe', val: log.rpe },
              ].map((f) => (
                <div key={f.field}>
                  <label className="text-on-surface-variant/50 text-[10px] font-bold uppercase tracking-widest block mb-1">{f.label}</label>
                  <input
                    type="number"
                    value={f.val}
                    onChange={(e) => updateLog(i, f.field, +e.target.value)}
                    className={inputNumCls}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Exercise */}
      <motion.button
        variants={fadeUp}
        onClick={addLog}
        className="w-full border border-dashed border-outline-variant/30 rounded-xl py-4 text-on-surface-variant/50 hover:text-primary hover:border-primary/30 transition-all font-headline font-bold flex items-center justify-center gap-2 text-sm"
      >
        <Plus size={16} /> Agregar Ejercicio
      </motion.button>

      {/* Save */}
      {logs.length > 0 && (
        <motion.div variants={fadeUp} className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !sessionName}
            className="w-full bg-primary-container text-on-primary-container font-headline font-bold py-4 rounded-full text-lg tracking-tight flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary-container/20 disabled:opacity-40"
          >
            {saved ? <><Check size={20} /> ¡Guardado!</> : saving ? 'Guardando...' : <><Save size={18} /> Guardar Sesión</>}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  EXERCISE LIBRARY VIEW
// ═══════════════════════════════════════════════════════════
function LibraryView() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<MovementCategory | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchExercises = async () => {
    if (!user) return;
    const { data } = await supabase.from('exercises').select('*').eq('user_id', user.id).order('category').order('name');
    if (data) setExercises(data);
    setLoading(false);
  };

  useEffect(() => { fetchExercises(); }, [user]);

  const seedLibrary = async () => {
    if (!user) return;
    setSeeding(true);
    const rows = DEFAULT_EXERCISES.map((e) => ({
      user_id: user.id,
      name: e.name,
      category: e.category,
      status: 'YES' as ExerciseStatus,
    }));
    await supabase.from('exercises').upsert(rows, { onConflict: 'user_id,name' });
    await fetchExercises();
    setSeeding(false);
  };

  const toggleStatus = async (ex: Exercise) => {
    const next: ExerciseStatus = ex.status === 'YES' ? 'SUB' : ex.status === 'SUB' ? 'NO' : 'YES';
    await supabase.from('exercises').update({ status: next }).eq('id', ex.id);
    setExercises(exercises.map((e) => e.id === ex.id ? { ...e, status: next } : e));
  };

  const grouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    category: cat as MovementCategory,
    label,
    items: exercises.filter((e) => e.category === cat),
  }));

  const statusColor: Record<ExerciseStatus, string> = {
    YES: 'bg-primary-container/30 text-primary border-primary-container/50',
    SUB: 'bg-secondary-container/40 text-secondary border-secondary-container/60',
    NO: 'bg-error-container/30 text-error border-error-container/50',
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6 max-w-2xl">
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-1 text-on-surface">Biblioteca de Ejercicios</h2>
          <p className="text-on-surface-variant font-body text-sm">Toca el estado para cambiar: YES → SUB → NO</p>
        </div>
        {exercises.length === 0 && !loading && (
          <button
            onClick={seedLibrary}
            disabled={seeding}
            className="bg-primary-container text-on-primary-container font-headline font-bold px-5 py-2.5 rounded-xl text-sm tracking-tight hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50"
          >
            {seeding ? 'Cargando...' : 'Cargar Biblioteca'}
          </button>
        )}
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card-elevated rounded-xl h-16 animate-pulse" />)}
        </div>
      ) : (
        grouped.filter(g => g.items.length > 0).map((group) => (
          <motion.div key={group.category} variants={fadeUp} className="card-elevated rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === group.category ? null : group.category)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-container-high/50 transition-colors"
            >
              <span className="font-headline font-bold text-lg tracking-tight text-on-surface">{group.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-on-surface-variant/40 text-sm font-body">{group.items.length}</span>
                <motion.div animate={{ rotate: expanded === group.category ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight size={16} className="text-on-surface-variant/40" />
                </motion.div>
              </div>
            </button>

            <AnimatePresence>
              {expanded === group.category && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 space-y-1">
                    {group.items.map((ex) => (
                      <div key={ex.id} className="flex items-center justify-between py-2.5 px-3 -mx-1 rounded-lg hover:bg-surface-container-high/40 transition-colors">
                        <span className="text-on-surface font-body text-sm">{ex.name}</span>
                        <button
                          onClick={() => toggleStatus(ex)}
                          className={`text-xs font-headline font-bold px-3 py-1 rounded-full border ${statusColor[ex.status]} transition-all hover:scale-105 active:scale-95`}
                        >
                          {ex.status}
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PROGRESS VIEW
// ═══════════════════════════════════════════════════════════
function ProgressView() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<(Session & { logs: (SessionLog & { exercise: Exercise })[] })[]>([]);
  const [weights, setWeights] = useState<WorkingWeight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('sessions').select('*, logs:session_logs(*, exercise:exercises(*))').eq('user_id', user.id).order('date', { ascending: false }).limit(20),
      supabase.from('working_weights').select('*, exercise:exercises(*)').eq('user_id', user.id).order('weight', { ascending: false }),
    ]).then(([sRes, wRes]) => {
      if (sRes.data) setSessions(sRes.data as any);
      if (wRes.data) setWeights(wRes.data);
      setLoading(false);
    });
  }, [user]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-8 max-w-3xl">
      <motion.div variants={fadeUp}>
        <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-1 text-on-surface">Progreso</h2>
        <p className="text-on-surface-variant font-body text-sm">Tu historial de entrenamiento y pesos de trabajo actuales</p>
      </motion.div>

      {/* Current Working Weights */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-6 md:p-8">
        <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-5">Pesos de Trabajo Actuales</h3>
        {weights.length === 0 ? (
          <p className="text-on-surface-variant/50 font-body text-sm text-center py-6">Aún no hay pesos registrados</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {weights.map((w) => (
              <div key={w.id} className="bg-surface-container-high/50 rounded-xl p-4 border border-outline-variant/10">
                <span className="text-on-surface-variant text-[10px] font-bold tracking-widest uppercase block truncate">
                  {(w.exercise as any)?.name}
                </span>
                <div className="mt-1">
                  <span className="text-2xl font-headline font-extrabold text-on-surface">{w.weight}</span>
                  <span className="text-primary font-headline font-bold text-sm ml-1">kg</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Session History */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-6 md:p-8">
        <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-5">Historial de Sesiones</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-container-high/50 rounded-xl animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-on-surface-variant/50 font-body text-sm text-center py-6">Aún no hay sesiones</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <details key={s.id} className="group bg-surface-container-high/30 rounded-xl border border-outline-variant/10 overflow-hidden">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-high/50 transition-colors list-none">
                  <div className="flex items-center gap-4">
                    <span className="text-primary font-headline font-bold text-sm">
                      {s.block_num ? `B${s.block_num}W${s.week_num}` : '—'}
                    </span>
                    <span className="text-on-surface font-body">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-on-surface-variant/40 text-xs">{new Date(s.date).toLocaleDateString()}</span>
                    <ChevronDown size={14} className="text-on-surface-variant/30 group-open:rotate-180 transition-transform duration-200" />
                  </div>
                </summary>
                {s.logs && s.logs.length > 0 && (
                  <div className="px-4 pb-4 pt-1 border-t border-outline-variant/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-on-surface-variant/50 text-[10px] font-bold uppercase tracking-widest">
                          <th className="text-left py-2 font-normal">Ejercicio</th>
                          <th className="text-center py-2 font-normal">Series × Reps</th>
                          <th className="text-center py-2 font-normal">Peso</th>
                          <th className="text-center py-2 font-normal">RPE</th>
                        </tr>
                      </thead>
                      <tbody className="text-on-surface font-body">
                        {s.logs.map((log) => (
                          <tr key={log.id} className="border-t border-outline-variant/8">
                            <td className="py-2">{(log.exercise as any)?.name ?? '—'}</td>
                            <td className="text-center py-2">{log.sets} × {log.reps_per_set}</td>
                            <td className="text-center py-2">{log.weight}<span className="text-primary ml-0.5 text-xs font-bold">kg</span></td>
                            <td className="text-center py-2 text-on-surface-variant">{log.rpe ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {s.notes && <p className="text-on-surface-variant/40 text-xs mt-3 italic">{s.notes}</p>}
                  </div>
                )}
              </details>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
