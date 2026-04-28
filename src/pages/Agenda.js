import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00', purple: '#7B2D8B',
};

const SERVICIOS = [
  { value: 'consulta_medica', label: 'Consulta Médica', color: B.teal, icon: '🩺' },
  { value: 'valoracion_fisio', label: 'Valoración Fisioterapéutica', color: B.blue, icon: '🏃' },
  { value: 'nutricion', label: 'Consulta Nutrición', color: B.green, icon: '🥗' },
  { value: 'aparatologia', label: 'Aparatología EmZero', color: B.purple, icon: '⚡' },
];

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: B.orange },
  { value: 'preatendido', label: 'Pre-atendido', color: B.blue },
  { value: 'atendida', label: 'Atendida', color: B.green },
  { value: 'cancelada', label: 'Cancelada', color: B.red },
];

const HORAS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const getServicio = v => SERVICIOS.find(s => s.value === v) || { label: v, color: B.gray, icon: '📋' };
const getEstado = v => ESTADOS.find(s => s.value === v) || { label: v, color: B.gray };
const fmtFecha = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';
const fmtFechaShort = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) : '';
const today = () => new Date().toISOString().split('T')[0];

export default function Agenda({ usuario, onAbrirPaciente }) {
  const [fecha, setFecha] = useState(today());
  const [citas, setCitas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [citaEditar, setCitaEditar] = useState(null);
  const [toast, setToast] = useState(null);
  const [filtroProf, setFiltroProf] = useState('todos');

  const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'secretaria';
  const puedeCrearCitas = isAdmin || usuario?.rol === 'fisioterapeuta' || usuario?.rol === 'medico' || usuario?.rol === 'nutricionista';
  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 3000); };

  const fetchCitas = useCallback(async () => {
    setCargando(true);
    let query = supabase
      .from('citas')
      .select(`*, paciente:paciente_id(id, nombre, apellido, cedula, historia_clinica, grupo), profesional:profesional_id(id, nombre, apellido, rol, especialidad)`)
      .eq('fecha', fecha)
      .order('hora');

    if (!isAdmin) {
      query = query.eq('profesional_id', usuario.id);
    } else if (filtroProf !== 'todos') {
      query = query.eq('profesional_id', filtroProf);
    }

    const { data } = await query;
    setCitas(data || []);
    setCargando(false);
  }, [fecha, isAdmin, usuario?.id, filtroProf]);

  useEffect(() => { fetchCitas(); }, [fetchCitas]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('usuarios').select('id, nombre, apellido, rol, especialidad').order('nombre').then(({ data }) => setUsuarios(data || []));
  }, [isAdmin]);

  const citasPorProfesional = () => {
    if (!isAdmin || filtroProf !== 'todos') return { 'Mis citas': citas };
    const grupos = {};
    citas.forEach(c => {
      const key = c.profesional ? `${c.profesional.nombre} ${c.profesional.apellido}` : 'Sin asignar';
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(c);
    });
    return grupos;
  };

  const gruposCitas = citasPorProfesional();
  const totalCitas = citas.length;
  const atendidas = citas.filter(c => c.estado === 'atendida').length;
  const pendientes = citas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada').length;

  return (
    <div style={{ minHeight: '100vh', background: B.grayLt, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: B.navy, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>📅 Agenda</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0, textTransform: 'capitalize' }}>{fmtFecha(fecha)}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Navegación de fechas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 8px' }}>
            <button onClick={() => { const d = new Date(fecha + 'T12:00:00'); d.setDate(d.getDate() - 1); setFecha(d.toISOString().split('T')[0]); }}
              style={{ background: 'none', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>‹</button>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'white', fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }} />
            <button onClick={() => { const d = new Date(fecha + 'T12:00:00'); d.setDate(d.getDate() + 1); setFecha(d.toISOString().split('T')[0]); }}
              style={{ background: 'none', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>›</button>
          </div>
          <button onClick={() => setFecha(today())}
            style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            Hoy
          </button>
          {puedeCrearCitas && (
            <button onClick={() => setModalNueva(true)}
              style={{ padding: '8px 18px', background: B.blue, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Nueva cita
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: B.white, borderBottom: `2px solid ${B.grayMd}`, padding: '10px 24px', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['Total', totalCitas, B.navy], ['Pendientes', pendientes, B.orange], ['Atendidas', atendidas, B.green]].map(([l, n, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 20, color: c }}>{n}</span>
            <span style={{ fontSize: 11, color: B.gray, textTransform: 'uppercase', letterSpacing: 1 }}>{l}</span>
          </div>
        ))}
        {isAdmin && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1 }}>Profesional:</label>
            <select value={filtroProf} onChange={e => setFiltroProf(e.target.value)}
              style={{ padding: '5px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
              <option value="todos">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 60, color: B.gray }}>Cargando agenda...</div>
        ) : citas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}` }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📅</p>
            <p style={{ color: B.gray, fontSize: 14, marginBottom: 16 }}>No hay citas agendadas para este día.</p>
            {puedeCrearCitas && (
              <button onClick={() => setModalNueva(true)}
                style={{ padding: '10px 22px', background: B.blue, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Agendar cita
              </button>
            )}
          </div>
        ) : (
          Object.entries(gruposCitas).map(([prof, citasProf]) => (
            <div key={prof} style={{ marginBottom: 24 }}>
              {isAdmin && filtroProf === 'todos' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, height: 1, background: B.grayMd }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                    {prof} — {citasProf.length} cita{citasProf.length !== 1 ? 's' : ''}
                  </span>
                  <div style={{ flex: 1, height: 1, background: B.grayMd }} />
                </div>
              )}
              {citasProf.map(cita => (
                <CitaCard
                  key={cita.id}
                  cita={cita}
                  isAdmin={isAdmin}
                  onEditar={() => setCitaEditar(cita)}
                  onAbrirPaciente={onAbrirPaciente}
                  onCambiarEstado={async (estado) => {
                    await supabase.from('citas').update({ estado }).eq('id', cita.id);
                    fetchCitas();
                    showToast(`Cita marcada como ${getEstado(estado).label}`);
                  }}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {modalNueva && (
        <ModalCita
          usuario={usuario}
          isAdmin={isAdmin}
          fecha={fecha}
          usuarios={usuarios}
          onClose={() => setModalNueva(false)}
          onGuardado={() => { fetchCitas(); setModalNueva(false); showToast('Cita agendada ✓'); }}
        />
      )}

      {citaEditar && (
        <ModalEditarCita
          cita={citaEditar}
          usuarios={usuarios}
          onClose={() => setCitaEditar(null)}
          onGuardado={() => { fetchCitas(); setCitaEditar(null); showToast('Cita actualizada ✓'); }}
          onEliminar={async () => {
            await supabase.from('citas').delete().eq('id', citaEditar.id);
            fetchCitas(); setCitaEditar(null); showToast('Cita eliminada', B.red);
          }}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── CITA CARD ────────────────────────────────────────────────────────────────
function CitaCard({ cita, isAdmin, onEditar, onAbrirPaciente, onCambiarEstado }) {
  const servicio = getServicio(cita.servicio);
  const estado = getEstado(cita.estado);
  const paciente = cita.paciente;
  const grupoLabels = { transformacion: 'Transformación', prequirurgico: 'Pre-quirúrgico', postquirurgico: 'Post-quirúrgico' };

  return (
    <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, marginBottom: 8, borderLeft: `4px solid ${servicio.color}`, overflow: 'hidden', opacity: cita.estado === 'cancelada' ? 0.6 : 1 }}>
      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        {/* Hora y servicio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'center', minWidth: 50 }}>
            <p style={{ fontWeight: 800, fontSize: 18, color: servicio.color, margin: 0, fontFamily: 'monospace' }}>{cita.hora?.slice(0, 5)}</p>
            <p style={{ fontSize: 9, color: B.gray, margin: 0 }}>{cita.duracion || 60} min</p>
          </div>
          <div style={{ width: 1, height: 40, background: B.grayMd }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>{servicio.icon}</span>
              <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: 0 }}>{servicio.label}</p>
            </div>
            {isAdmin && cita.profesional && (
              <p style={{ fontSize: 11, color: B.teal, margin: 0 }}>
                👤 {cita.profesional.nombre} {cita.profesional.apellido} · {cita.profesional.especialidad || cita.profesional.rol}
              </p>
            )}
          </div>
        </div>

        {/* Paciente */}
        <div style={{ flex: 1, minWidth: 200, paddingLeft: 14 }}>
          {paciente ? (
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 2px' }}>
                {paciente.nombre} {paciente.apellido}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: B.gray }}>HC: {paciente.historia_clinica || '—'}</span>
                {paciente.cedula && <span style={{ fontSize: 10, color: B.gray }}>· CI: {paciente.cedula}</span>}
                {paciente.grupo && <span style={{ fontSize: 10, background: B.navy + '11', color: B.navy, padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>{grupoLabels[paciente.grupo] || paciente.grupo}</span>}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: B.gray, margin: 0, fontStyle: 'italic' }}>Sin paciente asignado</p>
          )}
          {cita.notas && <p style={{ fontSize: 11, color: B.gray, margin: '4px 0 0', fontStyle: 'italic' }}>📝 {cita.notas}</p>}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: estado.color + '22', color: estado.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            {estado.label}
          </span>
          {paciente && onAbrirPaciente && cita.estado !== 'cancelada' && (
            <button onClick={() => onAbrirPaciente(paciente)}
              style={{ padding: '6px 14px', background: servicio.color, color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              📋 Abrir expediente
            </button>
          )}

          {cita.estado === 'pendiente' && (
            <button onClick={() => onCambiarEstado('preatendido')}
              style={{ padding: '6px 14px', background: B.blue + '22', color: B.blue, border: `1px solid ${B.blue}44`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              → Pre-atendido
            </button>
          )}
          {cita.estado === 'preatendido' && (
            <button onClick={() => onCambiarEstado('atendida')}
              style={{ padding: '6px 14px', background: B.green + '22', color: B.green, border: `1px solid ${B.green}44`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✓ Atendida
            </button>
          )}
          {isAdmin && (
            <button onClick={onEditar}
              style={{ padding: '6px 12px', background: B.grayLt, color: B.teal, border: `1px solid ${B.grayMd}`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✏️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODAL NUEVA CITA ─────────────────────────────────────────────────────────
function ModalCita({ usuario, isAdmin, fecha, usuarios, onClose, onGuardado }) {
  const [fechaCita, setFechaCita] = useState(fecha);
  const [hora, setHora] = useState('08:00');
  const [duracion, setDuracion] = useState('60');
  const [servicio, setServicio] = useState('consulta_medica');
  // No-admin users can only assign to themselves
  const [profesionalId, setProfesionalId] = useState(usuario.id);
  const [notas, setNotas] = useState('');
  // Paciente
  const [busquedaPac, setBusquedaPac] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const buscarPaciente = async (q) => {
    setBusquedaPac(q);
    setPacienteSeleccionado(null);
    if (!q || q.length < 2) { setPacientes([]); return; }
    setBuscando(true);
    const { data } = await supabase.from('pacientes')
      .select('id, nombre, apellido, cedula, historia_clinica, grupo')
      .or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,cedula.ilike.%${q}%,historia_clinica.ilike.%${q}%`)
      .limit(8);
    setPacientes(data || []);
    setBuscando(false);
  };

  const guardar = async () => {
    if (!pacienteSeleccionado) return;
    setGuardando(true);
    const { error } = await supabase.from('citas').insert([{
      paciente_id: pacienteSeleccionado.id,
      profesional_id: profesionalId,
      fecha: fechaCita,
      hora,
      duracion: parseInt(duracion),
      servicio,
      estado: 'pendiente',
      notas: notas || null,
      created_by: usuario.id,
    }]);
    if (!error) onGuardado();
    setGuardando(false);
  };

  const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'secretaria';
  const puedeCrearCitas = isAdmin || usuario?.rol === 'fisioterapeuta' || usuario?.rol === 'medico' || usuario?.rol === 'nutricionista';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: B.white, borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ background: B.navy, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>📅 Nueva Cita</p>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', borderRadius: 6, padding: '3px 9px' }}>✕</button>
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto' }}>
          {/* Fecha, hora, duración */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" value={fechaCita} onChange={e => setFechaCita(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hora</label>
              <select value={hora} onChange={e => setHora(e.target.value)} style={inputStyle}>
                {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Duración (min)</label>
              <select value={duracion} onChange={e => setDuracion(e.target.value)} style={inputStyle}>
                {['30','45','60','90','120'].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Servicio */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Servicio</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SERVICIOS.map(s => (
                <button key={s.value} onClick={() => setServicio(s.value)}
                  style={{ padding: '10px 14px', border: `2px solid ${servicio === s.value ? s.color : B.grayMd}`, borderRadius: 8, background: servicio === s.value ? s.color + '11' : B.white, color: servicio === s.value ? s.color : B.gray, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Profesional */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Profesional asignado</label>
            {isAdmin ? (
              <select value={profesionalId} onChange={e => setProfesionalId(e.target.value)} style={inputStyle}>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.especialidad || u.rol}</option>)}
              </select>
            ) : (
              <div style={{ padding: '9px 12px', background: B.grayLt, borderRadius: 6, border: `1.5px solid ${B.grayMd}`, fontSize: 13, color: B.navy, fontWeight: 600 }}>
                {usuario.nombre} {usuario.apellido} <span style={{ fontSize: 11, color: B.gray, fontWeight: 400 }}>(tú)</span>
              </div>
            )}
          </div>

          {/* Buscar paciente */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Paciente *</label>
            {pacienteSeleccionado ? (
              <div style={{ background: B.green + '11', border: `1.5px solid ${B.green}`, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 2px' }}>{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}</p>
                  <p style={{ fontSize: 11, color: B.gray, margin: 0 }}>HC: {pacienteSeleccionado.historia_clinica} · CI: {pacienteSeleccionado.cedula || '—'}</p>
                </div>
                <button onClick={() => { setPacienteSeleccionado(null); setBusquedaPac(''); }}
                  style={{ background: B.red + '22', color: B.red, border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>✕</button>
              </div>
            ) : (
              <div>
                <input value={busquedaPac} onChange={e => buscarPaciente(e.target.value)}
                  placeholder="Buscar por nombre, cédula o historia clínica..."
                  style={{ ...inputStyle, marginBottom: 4 }} />
                {buscando && <p style={{ fontSize: 11, color: B.teal, margin: '4px 0' }}>Buscando...</p>}
                {pacientes.length > 0 && !pacienteSeleccionado && (
                  <div style={{ background: B.white, border: `1.5px solid ${B.grayMd}`, borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                    {pacientes.map(p => (
                      <div key={p.id} onClick={() => { setPacienteSeleccionado(p); setBusquedaPac(`${p.nombre} ${p.apellido}`); setPacientes([]); }}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${B.grayLt}` }}
                        onMouseEnter={e => e.currentTarget.style.background = B.grayLt}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <p style={{ fontWeight: 600, fontSize: 13, color: B.navy, margin: '0 0 2px' }}>{p.nombre} {p.apellido}</p>
                        <p style={{ fontSize: 11, color: B.gray, margin: 0 }}>HC: {p.historia_clinica} · CI: {p.cedula || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
                {busquedaPac.length > 2 && pacientes.length === 0 && !buscando && (
                  <p style={{ fontSize: 11, color: B.orange, margin: '4px 0' }}>⚠ No encontrado. Puedes crear el paciente desde la sección Pacientes.</p>
                )}
              </div>
            )}
          </div>

          {/* Notas */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Motivo de la cita, preparación especial..."
              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose}
              style={{ padding: '9px 18px', background: B.grayLt, color: B.gray, border: `1px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando || !pacienteSeleccionado}
              style={{ padding: '9px 22px', background: !pacienteSeleccionado ? '#9AA5B1' : (guardando ? '#9AA5B1' : B.blue), color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: !pacienteSeleccionado || guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Agendando...' : '📅 Agendar cita'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL EDITAR CITA ────────────────────────────────────────────────────────
function ModalEditarCita({ cita, usuarios, onClose, onGuardado, onEliminar }) {
  const [hora, setHora] = useState(cita.hora?.slice(0, 5) || '08:00');
  const [duracion, setDuracion] = useState(String(cita.duracion || 60));
  const [servicio, setServicio] = useState(cita.servicio || 'consulta_medica');
  const [profesionalId, setProfesionalId] = useState(cita.profesional_id || '');
  const [estado, setEstado] = useState(cita.estado || 'pendiente');
  const [notas, setNotas] = useState(cita.notas || '');
  const [guardando, setGuardando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    await supabase.from('citas').update({
      hora, duracion: parseInt(duracion), servicio,
      profesional_id: profesionalId || null,
      estado, notas: notas || null,
    }).eq('id', cita.id);
    onGuardado();
    setGuardando(false);
  };

  const paciente = cita.paciente;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: B.white, borderRadius: 14, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: B.teal, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>✏️ Editar Cita</p>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', borderRadius: 6, padding: '3px 9px' }}>✕</button>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {paciente && (
            <div style={{ background: B.grayLt, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 2px' }}>{paciente.nombre} {paciente.apellido}</p>
              <p style={{ fontSize: 11, color: B.gray, margin: 0 }}>HC: {paciente.historia_clinica} · {cita.fecha}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Hora</label>
              <select value={hora} onChange={e => setHora(e.target.value)} style={inputStyle}>
                {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Duración</label>
              <select value={duracion} onChange={e => setDuracion(e.target.value)} style={inputStyle}>
                {['30','45','60','90','120'].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Servicio</label>
            <select value={servicio} onChange={e => setServicio(e.target.value)} style={inputStyle}>
              {SERVICIOS.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Profesional</label>
            <select value={profesionalId} onChange={e => setProfesionalId(e.target.value)} style={inputStyle}>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} style={inputStyle}>
              {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {!confirmEliminar ? (
              <button onClick={() => setConfirmEliminar(true)}
                style={{ padding: '8px 14px', background: B.red + '11', color: B.red, border: `1px solid ${B.red}33`, borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑 Eliminar
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: B.red, fontWeight: 600 }}>¿Confirmar?</span>
                <button onClick={onEliminar}
                  style={{ padding: '6px 12px', background: B.red, color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Sí, eliminar</button>
                <button onClick={() => setConfirmEliminar(false)}
                  style={{ padding: '6px 12px', background: B.grayLt, color: B.gray, border: `1px solid ${B.grayMd}`, borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>No</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose}
                style={{ padding: '9px 16px', background: B.grayLt, color: B.gray, border: `1px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                style={{ padding: '9px 20px', background: guardando ? '#9AA5B1' : B.teal, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                {guardando ? 'Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
