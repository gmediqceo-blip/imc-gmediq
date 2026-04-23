import { useState } from 'react';
import { supabase } from '../lib/supabase';

const B = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', white: '#FFFFFF', red: '#B02020', grayLt: '#F4F6F8' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('Email o contraseña incorrectos');
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: B.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', Arial, sans-serif", padding: 20 }}>
      <div style={{ background: B.white, borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: B.navy, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none">
              <circle cx="60" cy="14" r="10" fill="#1E7CB5"/>
              <path d="M60 24 C52 32 37 35 31 47 C26 57 33 68 41 64 C49 60 53 51 60 46 C67 41 75 46 71 58" stroke="#1E7CB5" strokeWidth="8" strokeLinecap="round" fill="none"/>
              <path d="M60 24 C67 29 78 27 83 35 C88 43 80 51 72 47" stroke="#1E7CB5" strokeWidth="7" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: B.navy, margin: '0 0 4px' }}>IMC</h1>
          <p style={{ fontSize: 12, color: B.teal, margin: 0, letterSpacing: 1.5, textTransform: 'uppercase' }}>Instituto Metabólico Corporal</p>
          <p style={{ fontSize: 11, color: '#9AA5B1', margin: '4px 0 0' }}>by GMEDiQ</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #DDE3EA', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}/>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #DDE3EA', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}/>
          </div>
          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: B.red }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? '#9AA5B1' : B.navy, color: B.white, border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#9AA5B1', marginTop: 24 }}>
          Acceso exclusivo para personal IMC
        </p>
      </div>
    </div>
  );
}
