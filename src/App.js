import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  return session ? <Dashboard session={session} /> : <Login />;
}
