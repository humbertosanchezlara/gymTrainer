import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useBreakpoint';
import ProgramView from './ProgramView';
import DashboardView from './views/DashboardView';
import SessionView from './views/SessionView';
import LibraryView from './views/LibraryView';
import ProgressView from './views/ProgressView';
import type { SessionLogEntry } from './views/DashboardView';
import { Plus, X, Home, Calendar, TrendingUp, Dumbbell } from 'lucide-react';

export type Tab = 'dashboard' | 'program' | 'progress' | 'library';
export type Scene = 'app' | 'session';

const NAV: { id: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard', label: 'Hoy',       Icon: Home },
  { id: 'program',   label: 'Programa',  Icon: Calendar },
  { id: 'progress',  label: 'Progreso',  Icon: TrendingUp },
  { id: 'library',   label: 'Ejercicios', Icon: Dumbbell },
];

interface MainShellProps {
  onProgramDeleted: () => void;
  theme?: string;
  toggleTheme?: () => void;
}

function SettingsDrawer({ open, onClose, onLogout }: { open: boolean; onClose: () => void; onLogout: () => void }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const initial = user?.email?.[0]?.toUpperCase() ?? 'U';
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: isMobile ? '100%' : 420, background: 'var(--paper)', height: '100vh', padding: '32px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }} className="forge-fade">
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
  const isMobile = useIsMobile();
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
      <style>{`
        .bottom-nav-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; padding: 10px 4px; background: none; border: none; cursor: pointer; font-family: var(--sans); transition: color .15s; }
      `}</style>

      {/* Top nav */}
      <header className="forge-topnav">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, background: 'var(--ink)', borderRadius: 5, display: 'grid', placeItems: 'center', color: 'var(--paper)', flexShrink: 0 }}>
              <span className="serif" style={{ fontSize: 20, lineHeight: 1, fontStyle: 'italic' }}>F</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>Forge</span>
          </div>

          {/* Desktop nav tabs */}
          {!isMobile && (
            <nav style={{ display: 'flex', gap: 4 }}>
              {NAV.map(n => {
                const on = tab === n.id;
                return (
                  <button key={n.id} onClick={() => setTab(n.id)} style={{
                    background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--paper)' : 'var(--ink)',
                    border: 'none', padding: '10px 16px', borderRadius: 999, cursor: 'pointer',
                    fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 14, transition: 'background .2s, color .2s',
                  }}>{n.label}</button>
                );
              })}
            </nav>
          )}

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isMobile && (
              <button onClick={() => goToSession()} className="btn btn-ghost" style={{ padding: '8px 14px', borderRadius: 999, gap: 6, display: 'flex', alignItems: 'center' }}>
                <Plus size={14}/> <span style={{ fontSize: 13 }}>Sesión libre</span>
              </button>
            )}
            <button onClick={() => setSettingsOpen(true)} style={{
              width: 32, height: 32, borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-ink)',
              display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer',
            }}>{initial}</button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: 1280, margin: '0 auto',
        padding: isMobile ? '20px 16px 90px' : '32px',
        minHeight: `calc(100vh - ${isMobile ? 56 : 64}px)`,
      }}>
        {tab === 'dashboard' && <DashboardView onNavigate={setTab} onStartSession={() => goToSession()} onStartTravel={(draft) => goToSession(draft)} />}
        {tab === 'program'   && <ProgramView />}
        {tab === 'progress'  && <ProgressView />}
        {tab === 'library'   && <LibraryView onProgramDeleted={onProgramDeleted} />}
      </main>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'var(--paper)', borderTop: '1px solid var(--rule)',
          display: 'flex', alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {NAV.map(n => {
            const on = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)} className="bottom-nav-btn" style={{ color: on ? 'var(--ink)' : 'var(--muted)' }}>
                <n.Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '0.02em' }}>{n.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} onLogout={() => { setSettingsOpen(false); signOut(); }} />
    </div>
  );
}
