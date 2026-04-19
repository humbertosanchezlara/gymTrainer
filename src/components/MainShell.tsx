import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ProgramView from './ProgramView';
import DashboardView from './views/DashboardView';
import SessionView from './views/SessionView';
import LibraryView from './views/LibraryView';
import ProgressView from './views/ProgressView';
import type { SessionLogEntry } from './views/DashboardView';
import { Plus, X } from 'lucide-react';

export type Tab = 'dashboard' | 'program' | 'progress' | 'library';
export type Scene = 'app' | 'session';

const NAV: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Hoy' },
  { id: 'program',   label: 'Programa' },
  { id: 'progress',  label: 'Progreso' },
  { id: 'library',   label: 'Ejercicios' },
];

interface MainShellProps {
  onProgramDeleted: () => void;
  theme?: string;
  toggleTheme?: () => void;
}

function SettingsDrawer({
  open,
  onClose,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const { user } = useAuth();
  const initial = user?.email?.[0]?.toUpperCase() ?? 'U';

  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 420, background: 'var(--paper)', height: '100vh', padding: '32px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }} className="forge-fade">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="uc" style={{ color: 'var(--muted)' }}>Cuenta</div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 8 }}><X size={18}/></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700 }}>{initial}</div>
          <div>
            <div className="d-s" style={{ fontWeight: 600 }}>{user?.email?.split('@')[0]}</div>
            <div className="caption" style={{ color: 'var(--muted)', marginTop: 2 }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--rule)' }} />

        <div style={{ flex: 1 }} />
        <button onClick={onLogout} className="btn btn-ghost" style={{ justifyContent: 'space-between' }}>
          Cerrar sesión →
        </button>
      </div>
    </div>
  );
}

export default function MainShell({ onProgramDeleted }: MainShellProps) {
  const { signOut, user } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [scene, setScene] = useState<Scene>('app');
  const [travelDraft, setTravelDraft] = useState<SessionLogEntry[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const initial = user?.email?.[0]?.toUpperCase() ?? 'U';

  const goToSession = (draft?: SessionLogEntry[] | null) => {
    if (draft) setTravelDraft(draft);
    else setTravelDraft(null);
    setScene('session');
  };

  if (scene === 'session') {
    return (
      <SessionView
        onNavigate={(t) => { setScene('app'); setTab(t); }}
        travelDraft={travelDraft}
        onClearTravel={() => setTravelDraft(null)}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', color: 'var(--ink)' }}>
      {/* Top nav */}
      <header className="forge-topnav">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo + nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 26, height: 26, background: 'var(--ink)', borderRadius: 5, display: 'grid', placeItems: 'center', color: 'var(--paper)', flexShrink: 0 }}>
                <span className="serif" style={{ fontSize: 20, lineHeight: 1, fontStyle: 'italic' }}>F</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>Forge</span>
            </div>

            <nav style={{ display: 'flex', gap: 4 }}>
              {NAV.map(n => {
                const on = tab === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setTab(n.id)}
                    style={{
                      background: on ? 'var(--ink)' : 'transparent',
                      color: on ? 'var(--paper)' : 'var(--ink)',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: 999,
                      cursor: 'pointer',
                      fontFamily: 'var(--sans)',
                      fontWeight: 600,
                      fontSize: 14,
                      transition: 'background .2s, color .2s',
                    }}
                  >{n.label}</button>
                );
              })}
            </nav>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => goToSession()}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', borderRadius: 999, gap: 6, display: 'flex', alignItems: 'center' }}
            >
              <Plus size={14}/> <span style={{ fontSize: 13 }}>Sesión libre</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}
            >
              {initial}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px', minHeight: 'calc(100vh - 64px)' }}>
        {tab === 'dashboard' && (
          <DashboardView
            onNavigate={setTab}
            onStartSession={goToSession}
            onStartTravel={(draft) => goToSession(draft)}
          />
        )}
        {tab === 'program'  && <ProgramView />}
        {tab === 'progress' && <ProgressView />}
        {tab === 'library'  && <LibraryView onProgramDeleted={onProgramDeleted} />}
      </main>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={() => { setSettingsOpen(false); signOut(); }}
      />
    </div>
  );
}
