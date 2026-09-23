import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Users, ClipboardList, IdCard, X, Check, Plus, Stethoscope } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Pacientes — capa visual v2 ("clínico premium", aprobada 04/08/2026)
//
// Lo que NO cambió: props, estados, queries a Supabase, nombres de campo del
// insert, filtros, cálculo de edad y el patrón de <Field> fuera del componente.
// Lo que cambió: sólo la presentación — tokens de src/styles/v2.css en lugar de
// la constante B, iconos lucide-react en lugar de emoji, jerarquía por elevación
// en lugar de borde de 1.5px, y fuera el filete de color superior en la tarjeta.
// ═══════════════════════════════════════════════════════════════════════

// Colores semánticos que siguen siendo datos, no estilo: identifican plan y grupo.
const planColors = { starter: '#4B647A', standard: '#1E7CB5', imc360: '#0B1F3B' };
const planLabels = { starter: 'Starter $80', standard: 'Standard $250/mes', imc360: 'IMC 360 $400/mes' };
const grupoColors = { transformacion: '#1E7CB5', prequirurgico: '#C25A00', postquirurgico: '#1A7A4A' };
const grupoLabels = { transformacion: 'Transformación', prequirurgico: 'Pre-quirúrgico', postquirurgico: 'Post-quirúrgico' };
const calcAge = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;

const ROJO = '#B02020';

// ── FIELD — definido FUERA de cualquier componente para evitar re-renders ──────
const Field = ({ label, value, onChange, type = 'text', opts, half, required }) => (
  <div style={{ flex: half ? '0 0 48%' : '0 0 100%', marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.06em', marginBottom: 6 }}>
      {label}{required && <span style={{ color: ROJO }}> *</span>}
    </label>
    {opts ? (
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
    )}
  </div>
);

// Píldora de dato (plan, grupo): color como información, no como decoración.
const Pildora = ({ color, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 8, background: color + '14', color, fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
    {children}
  </span>
);

const selectFiltro = {
  height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--line)',
  background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', fontFamily: 'inherit',
};

// ── PACIENTES ──────────────────────────────────────────────────────────────────
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

  const showToast = (msg, color = '#1A7A4A') => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

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
    <div style={{ padding: 28, maxWidth: 1180, margin: '0 auto', fontFamily: 'Poppins, system-ui, sans-serif', color: 'var(--ink)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 5px' }}>Pacientes</h2>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0 }}>
            {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''} registrado{pacientes.length !== 1 ? 's' : ''}
            {filtrados.length !== pacientes.length && ` · ${filtrados.length} en el filtro actual`}
          </p>
        </div>
        <button onClick={() => setModalNuevo(true)}
          style={{ height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(180deg,#14355F,var(--ink))', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)', transition: 'filter .14s ease' }}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.12)'}
          onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}>
          <Plus size={16} strokeWidth={1.75} /> Nuevo paciente
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 280 }}>
          <span style={{ position: 'absolute', left: 13, color: 'var(--ink-3)', display: 'flex', pointerEvents: 'none' }}>
            <Search size={16} strokeWidth={1.75} />
          </span>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, cédula o historia clínica"
            style={{ width: '100%', height: 40, padding: '0 12px 0 38px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <select value={filtroPlan} onChange={e => setFiltroPlan(e.target.value)} style={selectFiltro}>
          <option value="all">Todos los planes</option>
          {Object.entries(planLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)} style={selectFiltro}>
          <option value="all">Todos los grupos</option>
          {Object.entries(grupoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 60, fontSize: 13.5 }}>Cargando pacientes…</p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: '0 1px 2px rgba(11,31,59,.05)' }}>
          <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: 'var(--accent-wash)', color: 'var(--accent)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Users size={22} strokeWidth={1.75} />
          </span>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
            {pacientes.length === 0 ? 'Aún no hay pacientes' : 'Sin resultados'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 0' }}>
            {pacientes.length === 0 ? 'Registra tu primer paciente para empezar.' : 'Prueba con otro término o quita los filtros.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(296px,1fr))', gap: 14 }}>
          {filtrados.map(p => {
            const age = calcAge(p.fecha_nacimiento);
            return (
              <div key={p.id} onClick={() => onAbrirPaciente(p)}
                style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 18, cursor: 'pointer', boxShadow: '0 1px 2px rgba(11,31,59,.05)', transition: 'box-shadow .14s ease, border-color .14s ease' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(11,31,59,.04), 0 14px 30px -18px rgba(11,31,59,.22)'; e.currentTarget.style.borderColor = '#CFDCEA'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(11,31,59,.05)'; e.currentTarget.style.borderColor = 'var(--line)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(180deg,#14355F,var(--ink))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 17, flexShrink: 0 }}>
                    {p.nombre?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nombre} {p.apellido}
                    </p>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '2px 0 0' }}>
                      {age > 0 ? `${age} años` : '—'} · {p.sexo === 'F' ? 'Femenino' : p.sexo === 'M' ? 'Masculino' : '—'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Pildora color={grupoColors[p.grupo] || '#1E7CB5'}>{grupoLabels[p.grupo] || '—'}</Pildora>
                  <Pildora color={planColors[p.plan] || '#1E7CB5'}>{planLabels[p.plan] || '—'}</Pildora>
                </div>

                {(p.historia_clinica || p.cedula) && (
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
                    {p.historia_clinica && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                        <ClipboardList size={13} strokeWidth={1.75} color="var(--ink-3)" /> {p.historia_clinica}
                      </span>
                    )}
                    {p.cedula && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                        <IdCard size={13} strokeWidth={1.75} color="var(--ink-3)" /> {p.cedula}
                      </span>
                    )}
                  </div>
                )}

                {p.diagnostico_principal && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10 }}>
                    <Stethoscope size={13} strokeWidth={1.75} color="var(--ink-3)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, lineHeight: 1.45 }}>{p.diagnostico_principal}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalNuevo && (
        <ModalNuevoPaciente
          onClose={() => setModalNuevo(false)}
          onGuardado={() => { fetchPacientes(); setModalNuevo(false); showToast('Paciente registrado'); }}
          usuario={usuario}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ink)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 500, fontSize: 13.5, zIndex: 9999, boxShadow: '0 18px 40px -24px rgba(11,31,59,.55)' }}>
          <Check size={16} strokeWidth={2} color={toast.color === ROJO ? '#FCA5A5' : '#6EE7A8'} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── MODAL NUEVO PACIENTE ──────────────────────────────────────────────────────
function ModalNuevoPaciente({ onClose, onGuardado, usuario }) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [ocupacion, setOcupacion] = useState('');
  const [grupo, setGrupo] = useState('transformacion');
  const [plan, setPlan] = useState('starter');
  const [diagnostico, setDiagnostico] = useState('');
  const [cirugia, setCirugia] = useState('');
  const [fechaCirugia, setFechaCirugia] = useState('');
  const [medicoTratante, setMedicoTratante] = useState('');
  const [antPersonales, setAntPersonales] = useState('');
  const [antFamiliares, setAntFamiliares] = useState('');
  const [alergias, setAlergias] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Encabezado de sección: eyebrow tipográfico, sin el filete de color a la izquierda.
  const Sec = ({ children }) => (
    <div style={{ marginBottom: 14, marginTop: 24, paddingBottom: 8, borderBottom: '1px solid var(--line-soft)' }}>
      <p style={{ fontWeight: 600, fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.12em', margin: 0 }}>{children}</p>
    </div>
  );

  const guardar = async () => {
    if (!nombre.trim() || !apellido.trim()) { setError('Nombre y apellido son requeridos'); return; }
    setGuardando(true);
    setError('');
    const { error: err } = await supabase.from('pacientes').insert([{
      nombre, apellido, cedula, fecha_nacimiento: fechaNacimiento || null,
      sexo, telefono, email, ocupacion, grupo, plan,
      diagnostico_principal: diagnostico, cirugia, fecha_cirugia: fechaCirugia || null,
      medico_tratante: medicoTratante, antecedentes_personales: antPersonales,
      antecedentes_familiares: antFamiliares, alergias, medicamentos_actuales: medicamentos,
      created_by: usuario?.id,
    }]);
    if (err) { setError(err.message); setGuardando(false); return; }
    onGuardado();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: 'Poppins, system-ui, sans-serif', color: 'var(--ink)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 40px 90px -30px rgba(11,31,59,.6)' }}>
        <div style={{ background: 'linear-gradient(180deg,#14355F,var(--ink))', padding: '18px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>Nuevo paciente</p>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: '20px 28px 28px' }}>
          <Sec>Datos personales</Sec>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="Nombre" value={nombre} onChange={setNombre} half required />
            <Field label="Apellido" value={apellido} onChange={setApellido} half required />
            <Field label="Cédula" value={cedula} onChange={setCedula} half />
            <Field label="Fecha de nacimiento" value={fechaNacimiento} onChange={setFechaNacimiento} type="date" half />
            <Field label="Sexo" value={sexo} onChange={setSexo} opts={[{ v: '', l: '—' }, { v: 'M', l: 'Masculino' }, { v: 'F', l: 'Femenino' }, { v: 'O', l: 'Otro' }]} half />
            <Field label="Teléfono" value={telefono} onChange={setTelefono} half />
            <Field label="Email" value={email} onChange={setEmail} half />
            <Field label="Ocupación" value={ocupacion} onChange={setOcupacion} half />
          </div>

          <Sec>Perfil IMC</Sec>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="Tipo de paciente" value={grupo} onChange={setGrupo}
              opts={[{ v: 'transformacion', l: 'Transformación corporal' }, { v: 'prequirurgico', l: 'Pre-quirúrgico' }, { v: 'postquirurgico', l: 'Post-quirúrgico' }]} half />
            <Field label="Plan IMC" value={plan} onChange={setPlan}
              opts={[{ v: 'starter', l: 'Starter Plan — $80' }, { v: 'standard', l: 'Standard IMC — $250/mes' }, { v: 'imc360', l: 'IMC 360 — $400/mes' }]} half />
          </div>

          <Sec>Datos clínicos</Sec>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="Diagnóstico principal" value={diagnostico} onChange={setDiagnostico} />
            <Field label="Cirugía / procedimiento" value={cirugia} onChange={setCirugia} half />
            <Field label="Fecha de cirugía" value={fechaCirugia} onChange={setFechaCirugia} type="date" half />
            <Field label="Médico tratante" value={medicoTratante} onChange={setMedicoTratante} />
            <Field label="Antecedentes personales" value={antPersonales} onChange={setAntPersonales} />
            <Field label="Antecedentes familiares" value={antFamiliares} onChange={setAntFamiliares} />
            <Field label="Alergias" value={alergias} onChange={setAlergias} half />
            <Field label="Medicamentos actuales" value={medicamentos} onChange={setMedicamentos} half />
          </div>

          {error && (
            <div style={{ background: '#FFF0F0', border: '1px solid #FBD5D5', borderRadius: 10, padding: '10px 13px', marginTop: 6, marginBottom: 14, fontSize: 12.5, lineHeight: 1.5, color: ROJO }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={onClose}
              style={{ height: 40, padding: '0 18px', background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              style={{ height: 40, padding: '0 20px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(180deg,#14355F,var(--ink))', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? .7 : 1, fontFamily: 'inherit', boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)' }}>
              {guardando ? 'Guardando…' : <><Check size={16} strokeWidth={2} /> Registrar paciente</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
