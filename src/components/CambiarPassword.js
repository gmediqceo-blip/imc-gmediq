// ════════════════════════════════════════════════════════════════════════
// CambiarPassword.js — Pantalla para crear una contraseña nueva
//
// Se usa en dos flujos:
//   1. Primer ingreso del paciente (contraseña temporal → personal)
//   2. Recuperación "¿Olvidaste tu contraseña?" (enlace del correo)
//
// Props:
//   - titulo, subtitulo, textoBoton: textos de la pantalla
//   - onCompletado: callback tras cambiar la contraseña con éxito
// ════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { supabase } from '../lib/supabase';

const B = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020' };

export default function CambiarPassword({
  titulo = 'Crea tu nueva contraseña',
  subtitulo = 'Por tu seguridad, define una contraseña personal.',
  textoBoton = 'Guardar contraseña',
  onCompletado,
}) {
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (pass1.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (pass1 !== pass2) { setError('Las contraseñas no coinciden.'); return; }
    setGuardando(true);
    const { error: err } = await supabase.auth.updateUser({ password: pass1 });
    if (err) {
      setError(
        /same password|different from the old/i.test(err.message)
          ? 'La nueva contraseña debe ser diferente a la anterior.'
          : 'No se pudo guardar: ' + err.message
      );
      setGuardando(false);
      return;
    }
    setGuardando(false);
    if (onCompletado) await onCompletado();
  };

  const inputStyle = { width: '100%', padding: '12px 14px', border: `1.5px solid ${B.grayMd}`, borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };

  return (
    <div style={{ minHeight: '100vh', background: B.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', Arial, sans-serif", padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
          <h1 style={{ color: B.navy, fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>{titulo}</h1>
          <p style={{ color: B.gray, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{subtitulo}</p>
        </div>

        <form onSubmit={guardar}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nueva contraseña</label>
            <input
              type={verPass ? 'text' : 'password'}
              value={pass1}
              onChange={e => setPass1(e.target.value)}
              required
              placeholder="Mínimo 8 caracteres"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Repite la contraseña</label>
            <input
              type={verPass ? 'text' : 'password'}
              value={pass2}
              onChange={e => setPass2(e.target.value)}
              required
              placeholder="Escríbela de nuevo"
              style={inputStyle}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: B.gray, marginBottom: 18, cursor: 'pointer' }}>
            <input type="checkbox" checked={verPass} onChange={e => setVerPass(e.target.checked)} />
            Mostrar contraseña
          </label>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: B.red }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={guardando}
            style={{ width: '100%', padding: '13px', background: guardando ? '#9AA5B1' : B.navy, color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {guardando ? 'Guardando...' : `🔒 ${textoBoton}`}
          </button>
        </form>

        <button onClick={() => supabase.auth.signOut()}
          style={{ display: 'block', margin: '18px auto 0', background: 'none', border: 'none', color: B.gray, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
          Salir e ingresar con otra cuenta
        </button>
      </div>
    </div>
  );
}
