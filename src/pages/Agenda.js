import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Calendar, Stethoscope, Activity, Salad, Zap, Sparkles, ClipboardList,
  ChevronLeft, ChevronRight, Plus, X, Check, Pencil, Trash2, Save,
  UserRound, StickyNote, Info, ArrowRight, Search,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Agenda — capa visual v2 ("clínico premium", aprobada 04/08/2026)
//
// Lo que NO cambió: props, estados, permisos por rol (isAdmin / puedeCrearCitas),
// fetchCitas con su select anidado y filtros, agrupación por profesional, insert
// y update de citas, borrado, y la lista HORAS de 07:00 a 17:30 cada 30 minutos.
// Lo que cambió: sólo la presentación — tokens de src/styles/v2.css, iconos
// lucide-react en lugar de emoji, jerarquía por elevación, y Poppins.
// ═══════════════════════════════════════════════════════════════════════

const ROJO = '#B02020';
const NARANJA = '#C25A00';
const VERDE = '#1A7A4A';

// El color del servicio es información (identifica la disciplina), no decoración.
const SERVICIOS = [
  { value: 'consulta_medica', label: 'Consulta Médica', color: '#4B647A', icon: Stethoscope },
  { value: 'valoracion_fisio', label: 'Valoración Fisioterapéutica', color: '#1E7CB5', icon: Activity },
  { value: 'nutricion', label: 'Consulta Nutrición', color: VERDE, icon: Salad },
  { value: 'aparatologia', label: 'Aparatología EmZero', color: '#7B2D8B', icon: Zap },
  { value: 'masaje_tonificante', label: 'Masaje Tonificante', color: '#C9A86A', icon: Sparkles },
];

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: NARANJA },
  { value: 'preatendido', label: 'Pre-atendido', color: '#1E7CB5' },
  { value: 'atendida', label: 'Atendida', color: VERDE },
  { value: 'cancelada', label: 'Cancelada', color: ROJO },
];

const HORAS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const getServicio = v => SERVICIOS.find(s => s.value === v) || { label: v, color: '#4B647A', icon: ClipboardList };
const getEstado = v => ESTADOS.find(s => s.value === v) || { label: v, color: '#4B647A' };
const fmtFecha = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';
const today = () => new Date().toISOString().split('T')[0];
const capitalizar = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// ── Estilos compartidos (v2) ──────────────────────────────────────────────────
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.06em', marginBottom: 6 };
const inputStyle = { width: '100%', height: 40, padding: '0 11px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const areaStyle = { width: '100%', padding: '10px 11px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 };
const btnPrimario = { height: 40, padding: '0 20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(180deg,#14355F,var(--ink))', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)' };
const btnFantasma = { height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' };
const FUENTE = 'Poppins, system-ui, sans-serif';

const Overlay = ({ children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: FUENTE, color: 'var(--ink)' }}>
    {children}
  </div>
);

const CabeceraModal = ({ titulo, onClose }) => (
  <div style={{ background: 'linear-gradient(180deg,#14355F,var(--ink))', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
    <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>{titulo}</p>
    <button onClick={onClose} aria-label="Cerrar"
      style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer' }}>
      <X size={16} strokeWidth={2} />
    </button>
  </div>
);

// ── AGENDA ────────────────────────────────────────────────────────────────────
export default function Agenda({ usuario, onAbrirPaciente }) {
  const [fecha, setFecha] = useState(today());
  const [citas, setCitas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [citaEditar, setCitaEditar] = useState(null);
  const [toast, setToast] = useState(null);
  const [filtroProf, setFiltroProf] = useState('todos');

  const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'secretaria' || usuario?.rol === 'cosmetologa';
  const puedeCrearCitas = isAdmin || usuario?.rol === 'fisioterapeuta' || usuario?.rol === 'medico' || usuario?.rol === 'nutricionista';
  const showToast = (msg, color = VERDE) => { setToast({ msg, color }); setTimeout(() => setToast(null), 3000); };

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

  const moverDia = n => { const d = new Date(fecha + 'T12:00:00'); d.setDate(d.getDate() + n); setFecha(d.toISOString().split('T')[0]); };
  const navBtn = { width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--canvas)', fontFamily: FUENTE, color: 'var(--ink)' }}>
      <div style={{ background: 'var(--ink)', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, boxShadow: '0 18px 40px -24px rgba(11,31,59,.55)' }}>
        <div>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 19, margin: 0, letterSpacing: '-.01em' }}>Agenda</p>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12.5, margin: '3px 0 0' }}>{capitalizar(fmtFecha(fecha))}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: 4 }}>
            <button onClick={() => moverDia(-1)} aria-label="Día anterior" style={navBtn}><ChevronLeft size={16} strokeWidth={1.75} /></button>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 12.5, outline: 'none', fontFamily: 'inherit', cursor: 'pointer', colorScheme: 'dark' }} />
            <button onClick={() => moverDia(1)} aria-label="Día siguiente" style={navBtn}><ChevronRight size={16} strokeWidth={1.75} /></button>
          </div>
          <button onClick={() => setFecha(today())}
            style={{ height: 38, padding: '0 15px', background: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.16)', borderRadius: 10, fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Hoy
          </button>
          {puedeCrearCitas && (
            <button onClick={() => setModalNueva(true)}
              style={{ height: 38, padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={16} strokeWidth={1.75} /> Nueva cita
            </button>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '14px 28px', display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['Total del día', totalCitas, 'var(--ink)'], ['Pendientes', pendientes, NARANJA], ['Atendidas', atendidas, VERDE]].map(([l, n, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 21, color: c, letterSpacing: '-.02em' }}>{n}</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{l}</span>
          </div>
        ))}
        {isAdmin && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>
            <label style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Profesional</label>
            <select value={filtroProf} onChange={e => setFiltroProf(e.target.value)}
              style={{ height: 36, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}>
              <option value="todos">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ padding: '22px 28px 40px', maxWidth: 980, margin: '0 auto' }}>
        {cargando ? (
          <p style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)', fontSize: 13.5 }}>Cargando agenda…</p>
        ) : citas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', boxShadow: '0 1px 2px rgba(11,31,59,.05)' }}>
            <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: 'var(--accent-wash)', color: 'var(--accent)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Calendar size={22} strokeWidth={1.75} />
            </span>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Día libre</p>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 18px' }}>No hay citas agendadas para este día.</p>
            {puedeCrearCitas && (
              <button onClick={() => setModalNueva(true)} style={btnPrimario}>
                <Plus size={16} strokeWidth={1.75} /> Agendar cita
              </button>
            )}
          </div>
        ) : (
          Object.entries(gruposCitas).map(([prof, citasProf]) => (
            <div key={prof} style={{ marginBottom: 26 }}>
              {isAdmin && filtroProf === 'todos' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.12em', whiteSpace: 'nowrap' }}>
                    {prof} · {citasProf.length} cita{citasProf.length !== 1 ? 's' : ''}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                </div>
              )}
              <div style={{ display: 'grid', gap: 10 }}>
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
          onGuardado={() => { fetchCitas(); setModalNueva(false); showToast('Cita agendada'); }}
        />
      )}

      {citaEditar && (
        <ModalEditarCita
          cita={citaEditar}
          usuarios={usuarios}
          onClose={() => setCitaEditar(null)}
          onGuardado={() => { fetchCitas(); setCitaEditar(null); showToast('Cita actualizada'); }}
          onEliminar={async () => {
            await supabase.from('citas').delete().eq('id', citaEditar.id);
            fetchCitas(); setCitaEditar(null); showToast('Cita eliminada', ROJO);
          }}
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

// ─── CITA CARD ────────────────────────────────────────────────────────────────
function CitaCard({ cita, isAdmin, onEditar, onAbrirPaciente, onCambiarEstado }) {
  const servicio = getServicio(cita.servicio);
  const estado = getEstado(cita.estado);
  const paciente = cita.paciente;
  const cancelada = cita.estado === 'cancelada';
  const IconoServicio = servicio.icon;
  const grupoLabels = { transformacion: 'Transformación', prequirurgico: 'Pre-quirúrgico', postquirurgico: 'Post-quirúrgico' };

  const btnAccion = (color) => ({
    height: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6,
    background: color + '12', color, border: 'none', borderRadius: 9,
    fontWeight: 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', boxShadow: '0 1px 2px rgba(11,31,59,.05)', overflow: 'hidden', opacity: cancelada ? .62 : 1 }}>
      <div style={{ padding: '15px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, minWidth: 240 }}>
          <div style={{ textAlign: 'center', minWidth: 52 }}>
            <p style={{ fontWeight: 600, fontSize: 19, margin: 0, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', color: cancelada ? 'var(--ink-3)' : 'var(--ink)' }}>
              {cita.hora?.slice(0, 5)}
            </p>
            <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '2px 0 0' }}>{cita.duracion || 60} min</p>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, background: servicio.color + '12', color: servicio.color, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconoServicio size={14} strokeWidth={1.75} />
              </span>
              <p style={{ fontWeight: 600, fontSize: 13.5, margin: 0 }}>{servicio.label}</p>
            </div>
            {isAdmin && cita.profesional && (
              <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', margin: '5px 0 0' }}>
                <UserRound size={12} strokeWidth={1.75} />
                {cita.profesional.nombre} {cita.profesional.apellido} · {cita.profesional.especialidad || cita.profesional.rol}
              </p>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          {paciente ? (
            <div>
              <p style={{ fontWeight: 600, fontSize: 13.5, margin: '0 0 4px' }}>{paciente.nombre} {paciente.apellido}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{paciente.historia_clinica || '—'}</span>
                {paciente.cedula && <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>CI {paciente.cedula}</span>}
                {paciente.grupo && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 9px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11.5, color: 'var(--ink-2)' }}>
                    {grupoLabels[paciente.grupo] || paciente.grupo}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>Sin paciente asignado</p>
          )}
          {cita.notas && (
            <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--ink-2)', margin: '7px 0 0', lineHeight: 1.45 }}>
              <StickyNote size={12} strokeWidth={1.75} color="var(--ink-3)" style={{ flexShrink: 0, marginTop: 2 }} />
              {cita.notas}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 8, background: estado.color + '14', color: estado.color, fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: estado.color }} />
            {estado.label}
          </span>

          {paciente && onAbrirPaciente && !cancelada && (
            <button onClick={() => onAbrirPaciente(paciente)} style={btnAccion('var(--ink)')}>
              <ClipboardList size={14} strokeWidth={1.75} /> Expediente
            </button>
          )}
          {cita.estado === 'pendiente' && (
            <button onClick={() => onCambiarEstado('preatendido')} style={btnAccion('#1E7CB5')}>
              <ArrowRight size={14} strokeWidth={1.75} /> Pre-atendido
            </button>
          )}
          {cita.estado === 'preatendido' && (
            <button onClick={() => onCambiarEstado('atendida')} style={btnAccion(VERDE)}>
              <Check size={14} strokeWidth={2} /> Atendida
            </button>
          )}
          {isAdmin && (
            <button onClick={onEditar} aria-label="Editar cita"
              style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 9, cursor: 'pointer' }}>
              <Pencil size={14} strokeWidth={1.75} />
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

  return (
    <Overlay>
      <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 90px -30px rgba(11,31,59,.6)' }}>
        <CabeceraModal titulo="Nueva cita" onClose={onClose} />

        <div style={{ padding: '20px 24px 24px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
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
              <label style={labelStyle}>Duración</label>
              <select value={duracion} onChange={e => setDuracion(e.target.value)} style={inputStyle}>
                {['30','45','60','90','120'].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Servicio</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SERVICIOS.map(s => {
                const on = servicio === s.value;
                const IconoS = s.icon;
                return (
                  <button key={s.value} onClick={() => setServicio(s.value)}
                    style={{ padding: '11px 13px', border: '1px solid ' + (on ? s.color : 'var(--line)'), borderRadius: 10, background: on ? s.color + '0F' : 'var(--surface)', color: on ? s.color : 'var(--ink-2)', fontWeight: on ? 600 : 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 9, boxShadow: on ? '0 0 0 3px ' + s.color + '1A' : 'none' }}>
                    <IconoS size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} /> {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Profesional asignado</label>
            {isAdmin ? (
              <select value={profesionalId} onChange={e => setProfesionalId(e.target.value)} style={inputStyle}>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.especialidad || u.rol}</option>)}
              </select>
            ) : (
              <div style={{ height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13.5, fontWeight: 500 }}>
                {usuario.nombre} {usuario.apellido}
                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 400 }}>(tú)</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Paciente <span style={{ color: ROJO }}>*</span></label>
            {pacienteSeleccionado ? (
              <div style={{ background: '#EDF9F2', border: '1px solid #BCE3CE', borderRadius: 10, padding: '11px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ display: 'inline-flex', color: VERDE, flexShrink: 0 }}><Check size={16} strokeWidth={2} /></span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13.5, margin: 0 }}>{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0' }}>{pacienteSeleccionado.historia_clinica} · CI {pacienteSeleccionado.cedula || '—'}</p>
                  </div>
                </div>
                <button onClick={() => { setPacienteSeleccionado(null); setBusquedaPac(''); }} aria-label="Quitar paciente"
                  style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,31,59,.06)', color: 'var(--ink-2)', border: 'none', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 12, color: 'var(--ink-3)', display: 'flex', pointerEvents: 'none' }}>
                    <Search size={15} strokeWidth={1.75} />
                  </span>
                  <input value={busquedaPac} onChange={e => buscarPaciente(e.target.value)}
                    placeholder="Buscar por nombre, cédula o historia clínica"
                    style={{ ...inputStyle, paddingLeft: 36 }} />
                </div>
                {buscando && <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '7px 0 0' }}>Buscando…</p>}
                {pacientes.length > 0 && !pacienteSeleccionado && (
                  <div style={{ marginTop: 7, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, maxHeight: 200, overflowY: 'auto', boxShadow: '0 1px 2px rgba(11,31,59,.04), 0 14px 30px -18px rgba(11,31,59,.22)' }}>
                    {pacientes.map((p, i) => (
                      <div key={p.id} onClick={() => { setPacienteSeleccionado(p); setBusquedaPac(`${p.nombre} ${p.apellido}`); setPacientes([]); }}
                        style={{ padding: '11px 13px', cursor: 'pointer', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{p.nombre} {p.apellido}</p>
                        <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0' }}>{p.historia_clinica} · CI {p.cedula || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
                {busquedaPac.length > 2 && pacientes.length === 0 && !buscando && (
                  <p style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: NARANJA, margin: '8px 0 0', lineHeight: 1.5 }}>
                    <Info size={13} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
                    Sin resultados. Puedes crear el paciente desde la sección Pacientes.
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              placeholder="Motivo de la cita, preparación especial…" style={areaStyle} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={btnFantasma}>Cancelar</button>
            <button onClick={guardar} disabled={guardando || !pacienteSeleccionado}
              style={{ ...btnPrimario, opacity: (!pacienteSeleccionado || guardando) ? .55 : 1, cursor: (!pacienteSeleccionado || guardando) ? 'not-allowed' : 'pointer' }}>
              {guardando ? 'Agendando…' : <><Calendar size={16} strokeWidth={1.75} /> Agendar cita</>}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
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
    <Overlay>
      <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 40px 90px -30px rgba(11,31,59,.6)' }}>
        <CabeceraModal titulo="Editar cita" onClose={onClose} />

        <div style={{ padding: '20px 24px 24px' }}>
          {paciente && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
              <p style={{ fontWeight: 600, fontSize: 13.5, margin: 0 }}>{paciente.nombre} {paciente.apellido}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '3px 0 0' }}>{paciente.historia_clinica} · {cita.fecha}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
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

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Servicio</label>
            <select value={servicio} onChange={e => setServicio(e.target.value)} style={inputStyle}>
              {SERVICIOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Profesional</label>
            <select value={profesionalId} onChange={e => setProfesionalId(e.target.value)} style={inputStyle}>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} style={inputStyle}>
              {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} style={areaStyle} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {!confirmEliminar ? (
              <button onClick={() => setConfirmEliminar(true)}
                style={{ height: 36, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 7, background: ROJO + '0F', color: ROJO, border: 'none', borderRadius: 9, fontWeight: 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Trash2 size={14} strokeWidth={1.75} /> Eliminar
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: ROJO, fontWeight: 500 }}>¿Eliminar la cita?</span>
                <button onClick={onEliminar}
                  style={{ height: 32, padding: '0 12px', background: ROJO, color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>Sí</button>
                <button onClick={() => setConfirmEliminar(false)}
                  style={{ height: 32, padding: '0 12px', background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 9, fontWeight: 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>No</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
              <button onClick={onClose} style={btnFantasma}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ ...btnPrimario, opacity: guardando ? .6 : 1 }}>
                {guardando ? 'Guardando…' : <><Save size={16} strokeWidth={1.75} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
