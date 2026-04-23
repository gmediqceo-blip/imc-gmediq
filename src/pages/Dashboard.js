import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Pacientes from '../components/Pacientes';
import PacienteDetalle from '../components/PacienteDetalle';

const B = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020', orange: '#C25A00' };

export default function Dashboard({ session }) {
  const [usuario, setUsuario] = useState(null);
  const [screen, setScreen] = useState('pacientes');
  const [pacienteActivo, setPacienteActivo] = useState(null);

  useEffect(() => {
    const fetchUsuario = async () => {
      const { data } = await supabase.from('usuarios').select('*').eq('id', session.user.id).single();
      setUsuario(data);
    };
    fetchUsuario();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const abrirPaciente = (paciente) => {
    setPacienteActivo(paciente);
    setScreen('paciente_detalle');
  };

  const volverAPacientes = () => {
    setPacienteActivo(null);
    setScreen('pacientes');
  };

  const rolColor = { admin: B.navy, fisioterapeuta: B.blue, medico: B.teal, nutricionista: B.green };
  const rolLabel = { admin: 'Administrador', fisioterapeuta: 'Fisioterapeuta', medico: 'Médico', nutricionista: 'Nutricionista' };

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", minHeight: '100vh', background: B.grayLt, display: 'flex', flexDirection: 'column' }}>
      {/* NAVBAR */}
      <nav style={{ background: B.navy, padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32 }}>
          <div style={{ background: B.white, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center' }}>
            <svg width="70" height="24" viewBox="0 0 220 80" fill="none">
              <circle cx="28" cy="10" r="8" fill="#1E7CB5"/>
              <path d="M28 18 C22 25 14 27 11 35 C8 42 13 50 19 47 C25 44 27 38 32 34 C37 30 43 34 41 42" stroke="#1E7CB5" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
              <path d="M28 18 C33 21 40 20 43 25 C46 30 41 36 36 33" stroke="#1E7CB5" strokeWidth="5" strokeLinecap="round" fill="none"/>
              <text x="52" y="46" fontFamily="Arial Black,Arial" fontWeight="900" fontSize="44" fill="#0B1F3B">IMC</text>
              <text x="52" y="63" fontFamily="Arial" fontWeight="700" fontSize="9" fill="#4B647A" letterSpacing="1">INSTITUTO METABÓLICO CORPORAL</text>
            </svg>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {[
            { key: 'pacientes', label: '👥 Pacientes' },
            { key: 'banco_ejercicios', label: '🏋️ Ejercicios' },
          ].map(item => (
            <button key={item.key} onClick={() => setScreen(item.key)}
              style={{ padding: '8px 16px', background: screen === item.key ? 'rgba(255,255,255,0.15)' : 'transparent', color: 'white', border: 'none', borderRadius: 6, fontWeight: screen === item.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {usuario && (
            <>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0 }}>{usuario.nombre} {usuario.apellido}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{rolLabel[usuario.rol]}</p>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: rolColor[usuario.rol] || B.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14 }}>
                {usuario.nombre?.charAt(0)?.toUpperCase()}
              </div>
            </>
          )}
          <button onClick={handleLogout}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            Salir
          </button>
        </div>
      </nav>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {screen === 'pacientes' && <Pacientes onAbrirPaciente={abrirPaciente} usuario={usuario} />}
        {screen === 'paciente_detalle' && pacienteActivo && (
          <PacienteDetalle paciente={pacienteActivo} onVolver={volverAPacientes} usuario={usuario} />
        )}
        {screen === 'banco_ejercicios' && <BancoEjercicios usuario={usuario} />}
      </div>
    </div>
  );
}

// ── BANCO DE EJERCICIOS ────────────────────────────────────────────────────────
function BancoEjercicios({ usuario }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [catFiltro, setCatFiltro] = useState('all');
  const [nuevo, setNuevo] = useState({ nombre: '', categoria: 'aerobico', entorno: 'gym', musculos: '', nivel: 'bajo', unidad: 'reps' });
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const B = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020', orange: '#C25A00' };
  const CAT_LABELS = { aerobico: 'Aeróbico', tren_inferior: 'Tren Inferior', tren_superior: 'Tren Superior', core: 'Core', respiratorio: 'Respiratorio', movilidad: 'Movilidad' };
  const CAT_COLORS = { aerobico: B.blue, tren_inferior: B.navy, tren_superior: B.teal, core: B.orange, respiratorio: '#7B2D8B', movilidad: '#7B2D8B' };

  useEffect(() => {
    fetchEjercicios();
  }, []);

  const fetchEjercicios = async () => {
    const { data } = await supabase.from('ejercicios').select('*').eq('activo', true).order('categoria').order('nombre');
    setEjercicios(data || []);
    setLoading(false);
  };

  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  const agregarEjercicio = async () => {
    if (!nuevo.nombre.trim()) return;
    setGuardando(true);
    const { error } = await supabase.from('ejercicios').insert([nuevo]);
    if (!error) { await fetchEjercicios(); setNuevo({ nombre: '', categoria: 'aerobico', entorno: 'gym', musculos: '', nivel: 'bajo', unidad: 'reps' }); showToast('Ejercicio agregado ✓'); }
    setGuardando(false);
  };

  const filtrados = ejercicios.filter(e => {
    const ms = e.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const mc = catFiltro === 'all' || e.categoria === catFiltro;
    return ms && mc;
  });

  const F = ({ label, value, onChange, opts, half }) => (
    <div style={{ flex: half ? '0 0 48%' : '0 0 100%', marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</label>
      {opts ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
          {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      )}
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: B.navy, margin: '0 0 20px' }}>Banco de Ejercicios</h2>

      {/* Agregar */}
      <div style={{ background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}`, padding: '20px 22px', marginBottom: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px' }}>➕ Agregar ejercicio</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
          <F label="Nombre *" value={nuevo.nombre} onChange={v => setNuevo(p => ({ ...p, nombre: v }))} />
          <F label="Categoría" value={nuevo.categoria} onChange={v => setNuevo(p => ({ ...p, categoria: v }))} opts={Object.entries(CAT_LABELS).map(([k, v]) => ({ v: k, l: v }))} half />
          <F label="Entorno" value={nuevo.entorno} onChange={v => setNuevo(p => ({ ...p, entorno: v }))} opts={[{ v: 'gym', l: '🏋️ Gimnasio' }, { v: 'casa', l: '🏠 Casa' }, { v: 'ambos', l: '✓ Ambos' }]} half />
          <F label="Músculos" value={nuevo.musculos} onChange={v => setNuevo(p => ({ ...p, musculos: v }))} half />
          <F label="Nivel" value={nuevo.nivel} onChange={v => setNuevo(p => ({ ...p, nivel: v }))} opts={[{ v: 'bajo', l: 'Bajo' }, { v: 'medio', l: 'Medio' }, { v: 'alto', l: 'Alto' }]} half />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={agregarEjercicio} disabled={guardando}
            style={{ padding: '9px 22px', background: B.teal, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {guardando ? 'Guardando...' : 'Agregar ✓'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar ejercicio..."
          style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${B.grayMd}`, fontSize: 13, outline: 'none' }} />
        <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${B.grayMd}`, fontSize: 13, outline: 'none' }}>
          <option value="all">Todas</option>
          {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
        {filtrados.map(ex => (
          <div key={ex.id} style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, padding: '12px 14px', borderLeft: `4px solid ${CAT_COLORS[ex.categoria] || B.teal}` }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: B.navy, margin: '0 0 5px' }}>{ex.nombre}</p>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 9, background: (CAT_COLORS[ex.categoria] || B.teal) + '22', color: CAT_COLORS[ex.categoria] || B.teal, padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>{CAT_LABELS[ex.categoria]}</span>
              <span style={{ fontSize: 9, color: B.gray, padding: '1px 4px' }}>{ex.entorno === 'gym' ? '🏋️' : ex.entorno === 'casa' ? '🏠' : '✓'}</span>
              <span style={{ fontSize: 9, color: B.gray, padding: '1px 4px' }}>{ex.nivel}</span>
            </div>
            {ex.musculos && <p style={{ fontSize: 11, color: B.gray, margin: 0 }}>{ex.musculos}</p>}
          </div>
        ))}
      </div>

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  );
}
