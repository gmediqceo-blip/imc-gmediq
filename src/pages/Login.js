import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, CheckCircle2, Send } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// LoginV2 — Adaptación quirúrgica del mockup aprobado (04/08/2026)
// El JSX y estilos son idénticos al original de ui_kits/panel_clinico_v2/LoginV2.jsx
// Solo se reemplazaron las funciones simuladas por auth real de Supabase.
// ═══════════════════════════════════════════════════════════════════════

// Wrapper de icono con estilo del mockup original
const Icon = ({ name, size = 16 }) => {
  const icons = {
    mail: Mail,
    lock: Lock,
    'check-circle-2': CheckCircle2,
    send: Send,
  };
  const IconComp = icons[name] || Mail;
  return <IconComp size={size} strokeWidth={1.75} />;
};

export default function LoginV2() {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetOk, setResetOk] = useState(false);
  const [loading, setLoading] = useState(false);

  // AUTH REAL — Supabase (reemplaza la simulación del mockup)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (err) setError('Email o contraseña incorrectos');
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setResetOk(false);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: window.location.origin }
    );
    if (err) setError('No se pudo enviar el enlace. Verifica el correo.');
    else setResetOk(true);
    setLoading(false);
  };

  const toggle = () => {
    setMode(mode === 'login' ? 'forgot' : 'login');
    setError('');
    setResetOk(false);
  };

  // Estilos del mockup original (idénticos)
  const label = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)',
    marginBottom: 7,
  };
  const field = { position: 'relative', display: 'flex', alignItems: 'center' };
  const ico = {
    position: 'absolute',
    left: 13,
    color: 'var(--ink-3)',
    display: 'flex',
    pointerEvents: 'none',
  };
  const input = {
    width: '100%',
    height: 40,
    padding: '0 12px 0 38px',
    border: '1px solid var(--line)',
    borderRadius: 10,
    background: 'var(--surface)',
    fontFamily: 'inherit',
    fontSize: 13.5,
    color: 'var(--ink)',
    outline: 'none',
  };

  return (
    <div
      className="v2"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 32,
        position: 'relative',
        background: 'var(--ink)',
        overflow: 'hidden',
        fontFamily: 'Poppins, system-ui, sans-serif',
      }}
    >
      {/* Trama hexagonal — marca IMC (idéntico al mockup) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0l30 17.32v34.64L30 69.28 0 51.96V17.32z' fill='none' stroke='%231E7CB5' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: '60px 52px',
        }}
      />

      {/* Halo azul radial arriba (idéntico al mockup) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 90% at 50% -10%, rgba(30,124,181,.42), transparent 62%)',
        }}
      />

      {/* Contenedor de la card */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 428 }}>
        {/* Card blanca con sombra dramática */}
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '38px 36px 30px',
            boxShadow:
              '0 40px 90px -30px rgba(0,0,0,.6), 0 2px 4px rgba(0,0,0,.2)',
          }}
        >
          {/* Logo + subtítulo */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <img
              src="/logo-imc.png"
              alt="IMC — Instituto Metabólico Corporal"
              style={{
                width: 186,
                height: 'auto',
                display: 'block',
                margin: '0 auto',
              }}
            />
            <p
              style={{
                fontSize: 12.5,
                color: 'var(--ink-3)',
                marginTop: 12,
              }}
            >
              Sistema de gestión clínica
            </p>
          </div>

          {/* Formulario LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={label}>Email</label>
                <div style={field}>
                  <span style={ico}>
                    <Icon name="mail" size={16} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    style={input}
                  />
                </div>
              </div>

              <div style={{ marginBottom: error ? 12 : 22 }}>
                <label style={label}>Contraseña</label>
                <div style={field}>
                  <span style={ico}>
                    <Icon name="lock" size={16} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={input}
                  />
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: '#FFF0F0',
                    border: '1px solid #FBD5D5',
                    color: '#B02020',
                    padding: '10px 12px',
                    borderRadius: 10,
                    marginBottom: 16,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 46,
                  background: 'linear-gradient(180deg, #14355F, var(--ink))',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontFamily: 'inherit',
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)',
                  transition: 'filter .14s ease',
                }}
                onMouseEnter={(e) =>
                  !loading && (e.currentTarget.style.filter = 'brightness(1.12)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
              >
                {loading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>
          )}

          {/* Formulario OLVIDÉ CONTRASEÑA */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot}>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--ink-2)',
                  marginBottom: 18,
                }}
              >
                Escribe tu correo y te enviaremos un enlace para crear una contraseña
                nueva.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={label}>Email</label>
                <div style={field}>
                  <span style={ico}>
                    <Icon name="mail" size={16} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    style={input}
                  />
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: '#FFF0F0',
                    border: '1px solid #FBD5D5',
                    color: '#B02020',
                    padding: '10px 12px',
                    borderRadius: 10,
                    marginBottom: 16,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}

              {resetOk && (
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    background: '#EDF9F2',
                    border: '1px solid #BCE3CE',
                    borderRadius: 10,
                    padding: '11px 13px',
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      color: '#1A7A4A',
                      display: 'flex',
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    <Icon name="check-circle-2" size={15} />
                  </span>
                  <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#155F3A' }}>
                    Enlace enviado. Revisa tu correo (y la carpeta de spam) y sigue las
                    instrucciones.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 46,
                  background: 'linear-gradient(180deg, #14355F, var(--ink))',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'filter .14s ease',
                }}
                onMouseEnter={(e) =>
                  !loading && (e.currentTarget.style.filter = 'brightness(1.12)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
              >
                <Icon name="send" size={16} />
                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          )}

          {/* Toggle entre modos */}
          <button
            onClick={toggle}
            type="button"
            style={{
              display: 'block',
              margin: '18px auto 0',
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {mode === 'login' ? '¿Olvidaste tu contraseña?' : '← Volver a ingresar'}
          </button>
        </div>

        {/* Footer bajo la card */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 11.5,
            color: 'rgba(255,255,255,.5)',
            marginTop: 20,
            letterSpacing: '.02em',
          }}
        >
          Instituto Metabólico Corporal · IMC360
        </p>
      </div>
    </div>
  );
}
