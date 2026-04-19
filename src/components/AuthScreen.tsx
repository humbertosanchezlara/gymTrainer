import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Loader2 } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot';

interface AuthScreenProps {
  initialMode?: 'login' | 'signup';
  onBack?: () => void;
}

export default function AuthScreen({ initialMode = 'login', onBack }: AuthScreenProps) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setSuccess('Revisa tu correo para confirmar tu cuenta.');
      } else if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccess('Te enviamos un enlace a tu correo. Revisa tu bandeja de entrada.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Algo salió mal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr', background: 'var(--paper)' }}>
      {/* Left: brand panel */}
      <aside style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {onBack ? (
            <button onClick={onBack} className="btn btn-ghost" style={{ color: 'var(--paper)', borderColor: 'rgba(241,237,228,0.2)' }}>← Volver</button>
          ) : <div />}
          <span className="mono caption" style={{ color: 'rgba(241,237,228,0.4)' }}>Forge / Auth</span>
        </div>

        <div>
          <div className="uc" style={{ opacity: .6, marginBottom: 24 }}>
            {mode === 'signup' ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
          </div>
          <h1 className="d-hero" style={{ margin: 0, color: 'var(--paper)' }}>
            {mode === 'signup'
              ? <><span>Vamos a</span><br/><span className="serif" style={{ fontStyle: 'italic', fontWeight: 400 }}>construir</span> algo.</>
              : <><span>Ya está</span><br/><span className="serif" style={{ fontStyle: 'italic', fontWeight: 400 }}>todo listo</span>.</>}
          </h1>
        </div>

        <div style={{ borderTop: '1px solid rgba(241,237,228,0.15)', paddingTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { v: '12·', label: 'Semanas' },
            { v: '4·',  label: 'Bloques' },
            { v: 'RPE', label: 'Progresión' },
          ].map(x => (
            <div key={x.label}>
              <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{x.v}</div>
              <div className="caption mono uc" style={{ marginTop: 6 }}>{x.label}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Right: form */}
      <main style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--paper)' }}>
        <div style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
          <div className="uc" style={{ marginBottom: 24, color: 'var(--muted)' }}>
            {mode === 'forgot' ? 'Recuperar acceso' : mode === 'signup' ? 'Nuevo en Forge' : 'Iniciar sesión'}
          </div>
          <h2 className="d-l" style={{ margin: 0, marginBottom: 40 }}>
            {mode === 'forgot' ? 'Tu correo.' : mode === 'signup' ? 'Tu correo.' : 'Adelante.'}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              <div className="uc" style={{ marginBottom: 8, color: 'var(--muted)' }}>Correo</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                className="forge-field"
              />
            </label>

            {mode !== 'forgot' && (
              <label>
                <div className="uc" style={{ marginBottom: 8, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Contraseña</span>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', font: 'inherit', textDecoration: 'underline', fontSize: 11, letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
                      Olvidé
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="forge-field"
                />
              </label>
            )}

            {error && (
              <p style={{ margin: 0, color: '#ba1a1a', fontSize: 13 }}>{error}</p>
            )}
            {success && (
              <p style={{ margin: 0, color: 'var(--ok)', fontSize: 13 }}>{success}</p>
            )}

            <button type="submit" disabled={loading} className="btn btn-ink btn-lg" style={{ marginTop: 16, justifyContent: 'space-between', opacity: loading ? .6 : 1 }}>
              {loading
                ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <>{mode === 'signup' ? 'Crear cuenta' : mode === 'forgot' ? 'Enviar enlace' : 'Entrar'} <ArrowRight size={18}/></>}
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--rule)', marginTop: 40, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {mode === 'forgot' ? (
              <>
                <span className="body-s" style={{ color: 'var(--muted)' }}>¿Recuerdas tu contraseña?</span>
                <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: 'inherit', fontWeight: 600 }}>
                  Entrar →
                </button>
              </>
            ) : (
              <>
                <span className="body-s" style={{ color: 'var(--muted)' }}>
                  {mode === 'signup' ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}
                </span>
                <button onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: 'inherit', fontWeight: 600 }}>
                  {mode === 'signup' ? 'Entrar' : 'Crear cuenta'} →
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
