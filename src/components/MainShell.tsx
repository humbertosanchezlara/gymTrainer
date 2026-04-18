import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ProgramView from './ProgramView';
import DashboardView from './views/DashboardView';
import SessionView from './views/SessionView';
import LibraryView from './views/LibraryView';
import ProgressView from './views/ProgressView';
import type { SessionLogEntry } from './views/DashboardView';
import {
  Activity, Dumbbell, BookOpen, LineChart, ClipboardList, LogOut,
} from 'lucide-react';

// ─── Nav Items ────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Inicio', icon: Activity },
  { id: 'program', label: 'Programa', icon: ClipboardList },
  { id: 'session', label: 'Entrenar', icon: Dumbbell },
  { id: 'library', label: 'Ajustes', icon: BookOpen },
  { id: 'progress', label: 'Progreso', icon: LineChart },
] as const;

export type Tab = typeof NAV[number]['id'];

// ─── Main Shell ───────────────────────────────────────────
export default function MainShell() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [travelDraft, setTravelDraft] = useState<SessionLogEntry[] | null>(null);

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

            <nav role="navigation" aria-label="Navegación principal" className="flex flex-col gap-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    aria-label={`Ir a ${item.label}`}
                    aria-current={active ? 'page' : undefined}
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
            aria-label="Cerrar sesión"
            className="flex items-center gap-3 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors text-sm font-body px-5 py-3"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </aside>

        {/* Content */}
        <main className="flex-1 px-6 py-8 pb-28 lg:px-12 lg:py-12 overflow-y-auto">
          <AnimatePresence mode="wait">
            {tab === 'dashboard' && (
              <DashboardView
                key="dash"
                onNavigate={setTab}
                onStartTravel={(draft) => { setTravelDraft(draft); setTab('session'); }}
              />
            )}
            {tab === 'program' && <ProgramView key="prog-view" />}
            {tab === 'session' && (
              <SessionView
                key="sess"
                onNavigate={setTab}
                travelDraft={travelDraft}
                onClearTravel={() => setTravelDraft(null)}
              />
            )}
            {tab === 'library' && <LibraryView key="lib" />}
            {tab === 'progress' && <ProgressView key="prog" />}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav role="navigation" aria-label="Navegación móvil" className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass-nav">
        <div className="flex justify-around py-3 max-w-md mx-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                aria-label={`Ir a ${item.label}`}
                aria-current={active ? 'page' : undefined}
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
