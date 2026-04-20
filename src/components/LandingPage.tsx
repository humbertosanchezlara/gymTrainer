import { ArrowRight } from 'lucide-react';

const PROGRAM_BLOCKS = [
  { id: 'volumen',    name: 'Volumen',    weeks: [1,2,3,4],   intent: 'Construir base. Series altas, RPE 7.' },
  { id: 'intensidad', name: 'Intensidad', weeks: [5,6,7,8],   intent: 'Cargas medias-altas. RPE 8.' },
  { id: 'pico',       name: 'Pico',       weeks: [9,10,11],   intent: 'Máximo trabajo útil. RPE 8-9.' },
  { id: 'descarga',   name: 'Descarga',   weeks: [12],        intent: 'Bajar volumen. Recuperar.' },
];

function MarqueeStrip() {
  const items = ['EVIDENCIA', 'RPE', 'PERIODIZACIÓN', 'PROGRESIÓN', 'SIN RELLENO'];
  const doubled = [...items, ...items, ...items, ...items];
  return (
    <div style={{ overflow: 'hidden', padding: '14px 0', background: 'var(--ink)', color: 'var(--paper)', borderTop: '1px solid var(--rule)', borderBottom: '1px solid rgba(241,237,228,0.1)' }}>
      <div className="marquee-track">
        {doubled.map((t, i) => (
          <span key={i} className="mono uc" style={{ fontSize: 12, letterSpacing: '0.18em', display: 'flex', alignItems: 'center', gap: 48, whiteSpace: 'nowrap' }}>
            {t} <span style={{ opacity: .4 }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, background: 'var(--ink)', borderRadius: 6, display: 'grid', placeItems: 'center', color: 'var(--paper)', flexShrink: 0 }}>
        <span className="serif" style={{ fontSize: 22, lineHeight: 1, fontStyle: 'italic' }}>F</span>
      </div>
      <span className="uc" style={{ fontSize: 12 }}>Forge</span>
    </div>
  );
}

interface HeroProps { onLogin: () => void; onSignup: () => void; }

function Hero({ onLogin, onSignup }: HeroProps) {
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <section style={{ paddingTop: 'clamp(24px, 4vw, 40px)', paddingBottom: 0 }}>
      <style>{`
        @media (max-width: 767px) {
          .hero-eyebrow { display: none !important; }
          .hero-subgrid { display: flex !important; flex-direction: column !important; gap: 32px !important; }
          .hero-subgrid > * { grid-column: auto !important; }
          .hero-stat { display: none !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .how-grid > div { border-right: none !important; border-bottom: 1px solid var(--rule) !important; min-height: auto !important; }
          .how-grid > div:last-child { border-bottom: none !important; }
          .program-weeks { grid-template-columns: repeat(6, 1fr) !important; }
          .program-blocks { grid-template-columns: 1fr 1fr !important; }
          .philosophy-grid { grid-template-columns: 1fr !important; }
          .philosophy-grid > div { border-right: none !important; }
          .cta-hero { font-size: clamp(36px, 10vw, 64px) !important; }
        }
      `}</style>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', paddingInline: 'clamp(16px, 4vw, 48px)' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(32px, 6vw, 80px)' }}>
          <Logo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onLogin} className="btn btn-ghost" style={{ padding: '10px 16px' }}>Entrar</button>
            <button onClick={onSignup} className="btn btn-ink" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
              Crear cuenta <ArrowRight size={14}/>
            </button>
          </div>
        </div>

        {/* Eyebrow grid — hidden on mobile */}
        <div className="hero-eyebrow" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, marginBottom: 32 }}>
          <div style={{ gridColumn: 'span 4' }} className="uc">001 — Programación personal</div>
          <div style={{ gridColumn: 'span 4' }} />
          <div style={{ gridColumn: 'span 4', textAlign: 'right' }} className="uc">Madrid, ES — {today}</div>
        </div>

        {/* Mega title */}
        <h1 className="d-mega" style={{ margin: 0, fontWeight: 700 }}>
          Entrena<br/>
          <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400, fontSize: '0.95em' }}>como si</span> tuvieras<br/>
          un coach.
        </h1>

        {/* Subhead row */}
        <div className="hero-subgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, marginTop: 'clamp(32px, 5vw, 56px)', alignItems: 'end' }}>
          <p className="body-l" style={{ gridColumn: 'span 5', margin: 0, maxWidth: 460, color: 'var(--ink-2)' }}>
            Programa de 12 semanas hecho para tu cuerpo, tu equipo y tus días. Llegas, abres, entrenas. Sin pensar, sin Excel, sin gurús.
          </p>
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={onSignup} className="btn btn-accent btn-xl" style={{ width: '100%', justifyContent: 'space-between' }}>
              Empezar mi programa <ArrowRight size={20}/>
            </button>
            <button onClick={onLogin} className="btn btn-ghost btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              Ya tengo cuenta
            </button>
          </div>
          <div className="hero-stat" style={{ gridColumn: 'span 3', textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 56, lineHeight: 1, fontWeight: 600 }}>12<span style={{ color: 'var(--accent)' }}>·</span></div>
            <div className="caption mono uc" style={{ marginTop: 8 }}>Semanas · 4 bloques</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 'clamp(32px, 6vw, 80px)' }}>
        <MarqueeStrip />
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Te conocemos', body: 'Cinco minutos. Peso, altura, días disponibles, equipo, lesiones. Sin formularios eternos.', meta: '5 min' },
    { n: '02', title: 'Generamos tu programa', body: 'Doce semanas, cuatro bloques: Volumen, Intensidad, Pico, Descarga. Pensado para tu nivel.', meta: '12 sem' },
    { n: '03', title: 'Entrenas', body: 'Un ejercicio a la vez. Pesos sugeridos, RPE objetivo, descanso cronometrado. Cero ambigüedad.', meta: '~55 min' },
    { n: '04', title: 'Progresas', body: 'Cuando subes peso a RPE bajo, lo subimos. Cuando estancas, deload. Tu programa se mueve contigo.', meta: 'Cada sesión' },
  ];
  return (
    <section style={{ paddingBlock: 'clamp(48px, 8vw, 140px)', borderBottom: '1px solid var(--rule)' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', paddingInline: 'clamp(16px, 4vw, 48px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '16px 24px', marginBottom: 48, alignItems: 'baseline' }}>
          <div className="uc" style={{ flex: '0 0 auto' }}>002 — Cómo funciona</div>
          <h2 className="d-l" style={{ margin: 0, flex: '1 1 auto', minWidth: 200 }}>
            Cuatro pasos. Sin <span className="serif" style={{ fontStyle: 'italic' }}>fricción</span>.
          </h2>
        </div>
        <div className="how-grid" style={{ borderTop: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ padding: '28px 20px', borderRight: i < steps.length - 1 ? '1px solid var(--rule)' : 'none', display: 'flex', flexDirection: 'column', gap: 20, minHeight: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{s.n}</span>
                <span className="caption mono">{s.meta}</span>
              </div>
              <h3 className="d-m" style={{ margin: 0, marginTop: 'auto' }}>{s.title}</h3>
              <p className="body" style={{ margin: 0, color: 'var(--ink-2)' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProgramPreview() {
  return (
    <section style={{ paddingBlock: 'clamp(48px, 8vw, 140px)', background: 'var(--ink)', color: 'var(--paper)' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', paddingInline: 'clamp(16px, 4vw, 48px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '16px 24px', marginBottom: 48, alignItems: 'baseline' }}>
          <div className="uc" style={{ flex: '0 0 auto' }}>003 — El programa</div>
          <h2 className="d-l" style={{ margin: 0, flex: '1 1 auto', minWidth: 200 }}>
            Doce semanas que <span className="serif" style={{ fontStyle: 'italic' }}>significan algo</span>.
          </h2>
        </div>

        <div className="program-weeks" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4, marginBottom: 32 }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const w = i + 1;
            const block = PROGRAM_BLOCKS.find(b => b.weeks.includes(w))!;
            const isPico = block.id === 'pico';
            const isDeload = block.id === 'descarga';
            return (
              <div key={i} style={{
                padding: 'clamp(16px, 2vw, 32px) 8px',
                background: isPico ? 'var(--accent)' : isDeload ? 'transparent' : 'color-mix(in oklab, var(--paper), transparent 92%)',
                color: isPico ? 'var(--accent-ink)' : 'var(--paper)',
                border: isDeload ? '1px dashed color-mix(in oklab, var(--paper), transparent 70%)' : 'none',
                borderRadius: 6, minHeight: 80,
                display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between',
              }}>
                <div className="mono" style={{ fontSize: 9, opacity: isPico ? .7 : .5 }}>S{String(w).padStart(2, '0')}</div>
                <div className="serif" style={{ fontSize: 'clamp(20px, 2.5vw, 36px)', lineHeight: 1, fontStyle: 'italic' }}>{w}</div>
              </div>
            );
          })}
        </div>

        <div className="program-blocks" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginTop: 32 }}>
          {PROGRAM_BLOCKS.map(b => (
            <div key={b.id} style={{ borderTop: '1px solid color-mix(in oklab, var(--paper), transparent 80%)', paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4 className="d-s" style={{ margin: 0 }}>{b.name}</h4>
                <span className="mono caption" style={{ opacity: .6 }}>{b.weeks.length} sem</span>
              </div>
              <p className="body-s" style={{ marginTop: 12, color: 'color-mix(in oklab, var(--paper), transparent 25%)' }}>{b.intent}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Philosophy() {
  const tenets = [
    { k: 'RPE, no porcentajes', v: 'Programamos por esfuerzo percibido. Tu cuerpo cambia cada día — los porcentajes no.' },
    { k: 'Compuestos primero',  v: 'Sentadilla, peso muerto, press, dominadas. Lo que mueve la aguja va antes que los curls.' },
    { k: 'Progresión, no fe',   v: 'Cuando completas el rango a RPE bajo dos veces, sube el peso. Regla simple, aplicada siempre.' },
    { k: 'Deload programado',   v: 'Cada 4-6 semanas o cuando se estanca. Recuperar es entrenar.' },
  ];
  return (
    <section style={{ paddingBlock: 'clamp(48px, 8vw, 140px)', borderBottom: '1px solid var(--rule)' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', paddingInline: 'clamp(16px, 4vw, 48px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '16px 24px', marginBottom: 48, alignItems: 'baseline' }}>
          <div className="uc" style={{ flex: '0 0 auto' }}>004 — Filosofía</div>
          <h2 className="d-l" style={{ margin: 0, flex: '1 1 auto', minWidth: 200 }}>
            Lo que <span className="serif" style={{ fontStyle: 'italic' }}>no</span> hacemos.
          </h2>
        </div>
        <div className="philosophy-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: '1px solid var(--rule)' }}>
          {tenets.map((t, i) => (
            <div key={t.k} style={{
              padding: 'clamp(24px, 3vw, 36px) clamp(16px, 3vw, 32px)',
              borderRight: i % 2 === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: i < 2 ? '1px solid var(--rule)' : 'none',
            }}>
              <div className="mono uc" style={{ marginBottom: 16 }}>—{String(i+1).padStart(2,'0')}</div>
              <h3 className="d-m" style={{ margin: 0 }}>{t.k}</h3>
              <p className="body-l" style={{ marginTop: 16, color: 'var(--ink-2)' }}>{t.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onSignup }: { onSignup: () => void }) {
  return (
    <section style={{ paddingBlock: 'clamp(48px, 8vw, 140px)', background: 'var(--accent)', color: 'var(--accent-ink)' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', paddingInline: 'clamp(16px, 4vw, 48px)', textAlign: 'center' }}>
        <div className="uc" style={{ marginBottom: 32, opacity: .8 }}>005 — Empieza hoy</div>
        <h2 className="cta-hero d-hero" style={{ margin: 0 }}>
          Tu próxima sesión<br/>
          <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400 }}>está esperando.</span>
        </h2>
        <button onClick={onSignup} className="btn btn-ink btn-xl" style={{ marginTop: 48, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          Crear mi programa <ArrowRight size={20}/>
        </button>
        <div className="mono caption" style={{ marginTop: 24, opacity: .7 }}>Gratis · 5 min · Sin tarjeta</div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '32px 0 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', paddingInline: 'clamp(16px, 4vw, 48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 16 }}>
        <div className="serif" style={{ fontSize: 28, lineHeight: 1, fontStyle: 'italic' }}>Forge<sup style={{ fontSize: 11, marginLeft: 4 }}>©</sup></div>
        <div className="mono caption" style={{ color: 'color-mix(in oklab, var(--paper), transparent 40%)' }}>
          Hecho en Madrid · 2026
        </div>
      </div>
    </footer>
  );
}

interface LandingPageProps { onLogin: () => void; onSignup: () => void; }

export default function LandingPage({ onLogin, onSignup }: LandingPageProps) {
  return (
    <div className="forge-fade" style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh' }}>
      <Hero onLogin={onLogin} onSignup={onSignup} />
      <HowItWorks />
      <ProgramPreview />
      <Philosophy />
      <FinalCTA onSignup={onSignup} />
      <Footer />
    </div>
  );
}
