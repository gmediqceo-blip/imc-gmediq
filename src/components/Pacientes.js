import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020', orange: '#C25A00' };
const planColors = { starter: B.teal, standard: B.blue, imc360: B.navy };
const planLabels = { starter: 'Starter $80', standard: 'Standard $250/mes', imc360: 'IMC 360 $400/mes' };
const grupoColors = { transformacion: B.blue, prequirurgico: B.orange, postquirurgico: B.green };
const grupoLabels = { transformacion: 'Transformación', prequirurgico: 'Pre-quirúrgico', postquirurgico: 'Post-quirúrgico' };

const calcAge = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;

export default function Pacientes({ onAbrirPaciente, usuario }) {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroPlan, setFiltroPlan] = useState('all');
  const [filtroGrupo, setFiltroGrupo] = useState('all');
  const [modalNuevo, setModalNuevo] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchPacientes(); }, []);

  const fetchPacientes = async () => {
    const { data } = await supabase.from('pacientes').select('*').eq('activo', true).order('nombre');
    setPacientes(data || []);
    setLoading(false);
  };

  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  // Búsqueda por nombre, cédula o historia clínica
  const filtrados = pacientes.filter(p => {
    const q = busqueda.toLowerCase();
    const matchBusqueda = !q ||
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
      (p.cedula && p.cedula.includes(q)) ||
      (p.historia_clinica && p.historia_clinica.toLowerCase().includes(q));
    const matchPlan = filtroPlan === 'all' || p.plan === filtroPlan;
    const matchGrupo = filtroGrupo === 'all' || p.grupo === filtroGrupo;
    return matchBusqueda && matchPlan && matchGrupo;
  });

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: B.navy, margin: '0 0 4px' }}>Pacientes</h2>
          <p style={{ fontSize: 13, color: B.gray, margin: 0 }}>{pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''} registrado{pacientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModalNuevo(true)}
          style={{ padding: '10px 22px', background: B.navy, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Nuevo paciente
        </button>
      </div>

      {/* Búsqueda y filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍  Buscar por nombre, cédula o historia clínica..."
          style={{ flex: 1, minWidth: 260, padding: '10px 16px', borderRadius: 8, border: `1.5px solid ${B.grayMd}`, fontSize: 14, outline: 'none' }} />
        <select value={filtroPlan} onChange={e => setFiltroPlan(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${B.grayMd}`, fontSize: 13, outline: 'none' }}>
          <option value="all">Todos los planes</option>
          {Object.entries(planLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${B.grayMd}`, fontSize: 13, outline: 'none' }}>
          <option value="all">Todos los grupos</option>
          {Object.entries(grupoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ textAlign: 'center', color: B.gray, padding: 60 }}>Cargando pacientes...</p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>👥</p>
          <p style={{ color: B.gray }}>{pacientes.length === 0 ? 'Registra tu primer paciente.' : 'Sin resultados para esta búsqueda.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {filtrados.map(p => {
            const age = calcAge(p.fecha_nacimiento);
            return (
              <div key={p.id} onClick={() => onAbrirPaciente(p)}
                style={{ background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}`, padding: '18px 18px', cursor: 'pointer', borderTop: `3px solid ${planColors[p.plan] || B.blue}`, transition: 'box-shadow .15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(30,124,181,0.15)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 21, background: B.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18 }}>
                    {p.nombre?.charAt(0)?.toUpperCase()}
                  </div>
                  <span style={{ background: (grupoColors[p.grupo] || B.blue) + '22', color: grupoColors[p.grupo] || B.blue, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1px solid ${(grupoColors[p.grupo] || B.blue)}44` }}>
                    {grupoLabels[p.grupo] || '—'}
                  </span>
                </div>
                <p style={{ fontWeight: 800, fontSize: 15, color: B.navy, margin: '0 0 3px' }}>{p.nombre} {p.apellido}</p>
                <p style={{ fontSize: 12, color: B.gray, margin: '0 0 6px' }}>
                  {age > 0 ? `${age} años` : '—'} · {p.sexo === 'F' ? 'Femenino' : p.sexo === 'M' ? 'Masculino' : '—'}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  {p.historia_clinica && <span style={{ fontSize: 10, background: B.grayLt, color: B.teal, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>📋 {p.historia_clinica}</span>}
                  {p.cedula && <span style={{ fontSize: 10, background: B.grayLt, color: B.gray, padding: '2px 8px', borderRadius: 10 }}>🪪 {p.cedula}</span>}
                </div>
                <span style={{ background: (planColors[p.plan] || B.blue) + '22', color: planColors[p.plan] || B.blue, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1px solid ${(planColors[p.plan] || B.blue)}44` }}>
                  {planLabels[p.plan] || '—'}
                </span>
                {p.diagnostico_principal && <p style={{ fontSize: 11, color: B.teal, margin: '6px 0 0' }}>Dx: {p.diagnostico_principal}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo Paciente */}
      {modalNuevo && (
        <ModalNuevoPaciente
          onClose={() => setModalNuevo(false)}
          onGuardado={() => { fetchPacientes(); setModalNuevo(false); showToast('Paciente registrado ✓'); }}
          usuario={usuario}
        />
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  );
}

// ── MODAL NUEVO PACIENTE ──────────────────────────────────────────────────────
function ModalNuevoPaciente({ onClose, onGuardado, usuario }) {
  const [form, setForm] = useState({
    nombre: '', apellido: '', cedula: '', fecha_nacimiento: '', sexo: '',
    telefono: '', email: '', ocupacion: '', grupo: 'transformacion', plan: 'starter',
    diagnostico_principal: '', cirugia: '', fecha_cirugia: '', medico_tratante: '',
    antecedentes_personales: '', antecedentes_familiares: '', alergias: '', medicamentos_actuales: '', notas: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.nombre.trim() || !form.apellido.trim()) { setError('Nombre y apellido son requeridos'); return; }
    setGuardando(true);
    setError('');
    const { error } = await supabase.from('pacientes').insert([{ ...form, created_by: usuario?.id }]);
    if (error) { setError(error.message); setGuardando(false); return; }
    onGuardado();
  };

  const F = ({ label, value, onChange, type = 'text', opts, half, required }) => (
    <div style={{ flex: half ? '0 0 48%' : '0 0 100%', marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
        {label}{required && <span style={{ color: B.red }}> *</span>}
      </label>
      {opts ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
          {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      )}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: B.white, borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        {/* Header */}
        <div style={{ background: B.navy, padding: '18px 24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>Nuevo Paciente</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px 28px' }}>
          {/* Sección: Datos personales */}
          <div style={{ borderLeft: `4px solid ${B.blue}`, paddingLeft: 10, marginBottom: 14 }}>
            <p style={{ fontWeight: 800, fontSize: 11, color: B.navy, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>Datos Personales</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <F label="Nombre *" value={form.nombre} onChange={set('nombre')} half required />
            <F label="Apellido *" value={form.apellido} onChange={set('apellido')} half required />
            <F label="Cédula" value={form.cedula} onChange={set('cedula')} half />
            <F label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} type="date" half />
            <F label="Sexo" value={form.sexo} onChange={set('sexo')} opts={[{ v: '', l: '—' }, { v: 'M', l: 'Masculino' }, { v: 'F', l: 'Femenino' }, { v: 'O', l: 'Otro' }]} half />
            <F label="Teléfono" value={form.telefono} onChange={set('telefono')} half />
            <F label="Email" value={form.email} onChange={set('email')} half />
            <F label="Ocupación" value={form.ocupacion} onChange={set('ocupacion')} half />
          </div>

          {/* Sección: Perfil IMC */}
          <div style={{ borderLeft: `4px solid ${B.blue}`, paddingLeft: 10, marginBottom: 14, marginTop: 20 }}>
            <p style={{ fontWeight: 800, fontSize: 11, color: B.navy, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>Perfil IMC</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <F label="Tipo de paciente" value={form.grupo} onChange={set('grupo')} opts={[{ v: 'transformacion', l: 'Transformación corporal' }, { v: 'prequirurgico', l: 'Pre-quirúrgico' }, { v: 'postquirurgico', l: 'Post-quirúrgico' }]} half />
            <F label="Plan IMC" value={form.plan} onChange={set('plan')} opts={[{ v: 'starter', l: 'Starter Plan — $80' }, { v: 'standard', l: 'Standard IMC — $250/mes' }, { v: 'imc360', l: 'IMC 360 — $400/mes' }]} half />
          </div>

          {/* Sección: Datos clínicos */}
          <div style={{ borderLeft: `4px solid ${B.blue}`, paddingLeft: 10, marginBottom: 14, marginTop: 20 }}>
            <p style={{ fontWeight: 800, fontSize: 11, color: B.navy, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>Datos Clínicos</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <F label="Diagnóstico principal" value={form.diagnostico_principal} onChange={set('diagnostico_principal')} />
            <F label="Cirugía / procedimiento" value={form.cirugia} onChange={set('cirugia')} half />
            <F label="Fecha de cirugía" value={form.fecha_cirugia} onChange={set('fecha_cirugia')} type="date" half />
            <F label="Médico tratante" value={form.medico_tratante} onChange={set('medico_tratante')} />
            <F label="Antecedentes personales" value={form.antecedentes_personales} onChange={set('antecedentes_personales')} />
            <F label="Antecedentes familiares" value={form.antecedentes_familiares} onChange={set('antecedentes_familiares')} />
            <F label="Alergias" value={form.alergias} onChange={set('alergias')} half />
            <F label="Medicamentos actuales" value={form.medicamentos_actuales} onChange={set('medicamentos_actuales')} half />
          </div>

          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: B.red }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{ padding: '9px 20px', background: 'transparent', color: B.gray, border: `2px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ padding: '9px 22px', background: guardando ? '#9AA5B1' : B.navy, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : 'Registrar paciente ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
