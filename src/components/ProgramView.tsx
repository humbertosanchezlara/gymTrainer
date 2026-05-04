import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ensureWeekGenerated } from '../lib/openaiProgramGenerator';
import { supabase } from '../lib/supabase';
import type { Program, ProgramDay } from '../types';
import { BLOCKS } from '../engine/programGenerator';
import { Loader2 } from 'lucide-react';
import { fetchProgramProgressState, fetchProgramWeekDays, fetchProgramWeekDaysOrFallback } from '../utils/programState';
import { ProgramContextBadge } from './views/program/ProgramContextBadge';
import { ProgramWeekPicker } from './views/program/ProgramWeekPicker';
import { ProgramWeekNotice } from './views/program/ProgramWeekNotice';
import { ProgramRpeInfo } from './views/program/ProgramRpeInfo';
import { ProgramDayCards } from './views/program/ProgramDayCards';

export default function ProgramView() {
  const { user } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showRPE, setShowRPE] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentDay, setCurrentDay] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [generatedWeek, setGeneratedWeek] = useState(true);
  const [sourceWeek, setSourceWeek] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    Promise.resolve(
      supabase
        .from('programs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ).then(async ({ data }) => {
      if (!mounted) return;
      if (data) {
        setProgram(data);
        const progress = await fetchProgramProgressState(user.id, data);
        if (!mounted) return;
        setCurrentWeek(progress.currentWeek);
        setCurrentDay(progress.currentDay);
        setSelectedWeek(progress.currentWeek);
      } else {
        setLoading(false);
      }
    }).catch(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!program) return;
    const userId = user?.id;
    if (!userId) return;
    let cancelled = false;

    const loadWeek = async () => {
      setLoading(true);
      setGenerationError(null);
      try {
        if (selectedWeek === currentWeek) {
          let generationFailed = false;
          try {
            await ensureWeekGenerated(userId, program.id, selectedWeek);
          } catch (error) {
            generationFailed = true;
            console.error('[ProgramView] Week generation failed:', error);
            setGenerationError(`Forge no pudo preparar el detalle de la semana ${selectedWeek}. Intenta recargar en unos segundos.`);
          }

          const result = await fetchProgramWeekDaysOrFallback(program.id, selectedWeek);
          if (cancelled) return;
          const hasUnsafeFallback = generationFailed && result.isFallback && result.sourceWeek !== selectedWeek;
          setDays(hasUnsafeFallback ? [] : result.days);
          setGeneratedWeek(hasUnsafeFallback ? false : result.days.length > 0);
          setSourceWeek(hasUnsafeFallback ? null : result.sourceWeek);
        } else {
          const explicitDays = await fetchProgramWeekDays(program.id, selectedWeek);
          if (cancelled) return;
          setDays(explicitDays);
          setGeneratedWeek(explicitDays.length > 0);
          setSourceWeek(explicitDays.length > 0 ? selectedWeek : null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadWeek().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [program, selectedWeek, currentWeek]);

  useEffect(() => {
    if (!generatedWeek || selectedWeek !== currentWeek) {
      setExpandedDay(null);
      return;
    }

    const hasCurrentDay = days.some((day) => day.day_number === currentDay);
    setExpandedDay(hasCurrentDay ? currentDay : null);
  }, [days, generatedWeek, selectedWeek, currentWeek, currentDay]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="forge-fade" style={{ maxWidth: 640 }}>
        <div style={{ border: '1px solid var(--rule)', borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <h2 className="d-m" style={{ margin: 0 }}>Aún no hay programa</h2>
          <p style={{ color: 'var(--muted)', marginTop: 12, fontSize: 14 }}>Completa el onboarding para generar tu primer programa de entrenamiento.</p>
        </div>
      </div>
    );
  }

  const totalWeeks = program.total_weeks ?? 12;
  const block = BLOCKS.find(b => b.weeks.includes(selectedWeek)) ?? BLOCKS[0];
  const todayDayNumber = selectedWeek === currentWeek ? currentDay : -1;

  return (
    <div className="forge-fade">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .program-rpe-collapse {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 320ms cubic-bezier(.2,.7,.2,1);
        }
        .program-rpe-collapse.open { grid-template-rows: 1fr; }
        .program-rpe-collapse > div { overflow: hidden; }
      `}</style>

      <ProgramContextBadge selectedWeek={selectedWeek} totalWeeks={totalWeeks} block={block} />
      <ProgramWeekPicker totalWeeks={totalWeeks} currentWeek={currentWeek} selectedWeek={selectedWeek} onSelect={setSelectedWeek} />
      <ProgramWeekNotice generatedWeek={generatedWeek} selectedWeek={selectedWeek} sourceWeek={sourceWeek} block={block} generationError={generationError} />
      <ProgramRpeInfo block={block} showRPE={showRPE} onToggle={() => setShowRPE((value) => !value)} />
      {generatedWeek && (
        <ProgramDayCards
          days={days}
          expandedDay={expandedDay}
          onToggleDay={(dayNumber) => setExpandedDay(expandedDay === dayNumber ? null : dayNumber)}
          todayDayNumber={todayDayNumber}
        />
      )}
    </div>
  );
}
