import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CambiarPassword from './components/CambiarPassword';

export default function App() {
  const [session, setSession] = useState(null);
  const [recuperando, setRecuperando] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecuperando(true);
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0B1F3B' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚕</div>
        <p style={{ fontSize: 18, fontWeight: 700 }}>IMC – Instituto Metabólico Corporal</p>
        <p style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>Cargando...</p>
      </div>
    </div>
  );

  if (session && recuperando) {
    return (
      <CambiarPassword
        titulo="Restablece tu contraseña"
        subtitulo="Crea una contraseña nueva para tu cuenta y vuelve a entrar con ella."
        textoBoton="Guardar y continuar"
        onCompletado={() => setRecuperando(false)}
      />
    );
  }

  return session ? <Dashboard session={session} /> : <Login />;
}
