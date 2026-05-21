// ════════════════════════════════════════════════════════════════════════
// PanelGestionPacientes.js — Panel de gestión con sistema de programas
// 
// Reemplaza al Pacientes.js antiguo. Usa el nuevo modelo:
// - profiles (auth)
// - catalogo_programas (18 programas)
// - programas_paciente (suscripción del paciente)
// - invitaciones_paciente (envío por correo)
//
// Vista de la v_pacientes_con_programa para optimizar queries.
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ── PALETA IMC (consistente con tu sistema) ────────────────────────────
const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00', amber: '#F59E0B',
  purple: '#7C3AED',
};

// ── METADATOS DE ESTADOS ───────────────────────────────────────────────
const ESTADOS_META = {
  pendiente_activacion: { color: B.gray,   bg: '#E5E7EB', icon: '⏳', label: 'Pendiente activación' },
  activo:               { color: B.green,  bg: '#E6F5EE', icon: '🟢', label: 'Activo' },
  por_vencer:           { color: B.amber,  bg: '#FEF3C7', icon: '🟡', label: 'Por vencer' },
  modo_lectura:         { color: B.orange, bg: '#FFF0E0', icon: '🟠', label: 'Modo lectura' },
  suspendido:           { color: B.red,    bg: '#FFEBEB', icon: '🔴', label: 'Suspendido' },
  finalizado:           { color: B.teal,   bg: B.grayLt,  icon: '⚪', label: 'Finalizado' },
};

const calcAge = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : 0;

// ════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════
export default function PanelGestionPacientes({ onAbrirPaciente, usuario }) {
  const [pacientes, setPacientes]   = useState([]);
  const [stats, setStats]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [busqueda, setBusqueda]     = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalRenovar, setModalRenovar] = useState(null);
  const [modalSuspender, setModalSuspender] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    // Cargar pacientes con su programa (usando la vista que creamos en SQL)
    const { data: pacs } = await supabase
      .from('v_pacientes_con_programa')
      .select('*')
      .order('nombre');
    
    // Cargar stats agregados
    const { data: st } = await supabase
      .from('v_stats_panel_pacientes')
      .select('*')
      .single();
    
    setPacientes(pacs || []);
    setStats(st || {});
    setLoading(false);
  };

  const showToast = (msg, color = B.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Filtrado ─────────────────────────────────────────────────────────
  const filtrados = pacientes.filter(p => {
    // Filtro por estado
    if (filtroEstado !== 'todos' && p.programa_estado !== filtroEstado) return false;
    if (filtroEstado === 'todos' && !p.programa_id) {
      // Si no hay programa y filtro "todos", lo mostramos como pendiente
    }
    
    // Filtro por módulo
    if (filtroModulo === 'nutri' && !p.incluye_nutricion) return false;
    if (filtroModulo === 'fisio' && !p.incluye_fisioterapia) return false;
    if (filtroModulo === 'aparat' && !p.incluye_aparatologia) return false;
    
    // Búsqueda
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const texto = `${p.nombre || ''} ${p.apellido || ''} ${p.email || ''} ${p.telefono || ''}`.toLowerCase();
      if (!texto.includes(q)) return false;
    }
    
    return true;
  });

  // ── Acciones rápidas ─────────────────────────────────────────────────
  const handleSuspender = async (paciente, razon) => {
    const { error } = await supabase
      .from('programas_paciente')
      .update({ 
        estado: 'suspendido', 
        razon_estado: razon,
        fecha_suspension: new Date().toISOString()
      })
      .eq('id', paciente.programa_id);
    
    if (error) { showToast('Error: ' + error.message, B.red); return; }
    showToast(`${paciente.nombre} suspendido ✓`, B.orange);
    cargarDatos();
    setModalSuspender(null);
  };

  const handleReactivar = async (paciente) => {
    const { error } = await supabase
      .from('programas_paciente')
      .update({ 
        estado: 'activo', 
        razon_estado: null,
        fecha_suspension: null 
      })
      .eq('id', paciente.programa_id);
    
    if (error) { showToast('Error: ' + error.message, B.red); return; }
    showToast(`${paciente.nombre} reactivado ✓`);
    cargarDatos();
  };

  // ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: B.navy, margin: '0 0 4px' }}>
            Gestión de Pacientes
          </h2>
          <p style={{ fontSize: 13, color: B.gray, margin: 0 }}>
            {stats.total || 0} pacientes en gestión
            {stats.por_vencer > 0 && (
              <span style={{ color: B.orange, fontWeight: 700, marginLeft: 8 }}>
                · {stats.por_vencer} vencen pronto
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          style={btnPrimary()}
        >
          + Nuevo paciente
        </button>
      </div>

      {/* STATS CLICKEABLES COMO FILTROS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatTile
          activa={filtroEstado === 'todos'}
          color={B.blue}
          num={stats.total || 0}
          label="🔵 Todos"
          onClick={() => setFiltroEstado('todos')}
        />
        <StatTile
          activa={filtroEstado === 'activo'}
          color={B.green}
          num={stats.activos || 0}
          label="🟢 Activos"
          onClick={() => setFiltroEstado('activo')}
        />
        <StatTile
          activa={filtroEstado === 'por_vencer'}
          color={B.amber}
          num={stats.por_vencer || 0}
          label="🟡 Por vencer"
          onClick={() => setFiltroEstado('por_vencer')}
        />
        <StatTile
          activa={filtroEstado === 'modo_lectura'}
          color={B.orange}
          num={stats.modo_lectura || 0}
          label="🟠 Modo lectura"
          onClick={() => setFiltroEstado('modo_lectura')}
        />
        <StatTile
          activa={filtroEstado === 'suspendido'}
          color={B.red}
          num={stats.suspendidos || 0}
          label="🔴 Suspendidos"
          onClick={() => setFiltroEstado('suspendido')}
        />
      </div>

      {/* BARRA DE FILTROS */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre, email o teléfono..."
          style={inputStyle({ flex: 1, minWidth: 280 })}
        />
        <select
          value={filtroModulo}
          onChange={e => setFiltroModulo(e.target.value)}
          style={inputStyle({})}
        >
          <option value="todos">Todos los módulos</option>
          <option value="nutri">🥗 Con Nutrición</option>
          <option value="fisio">🏃 Con Fisioterapia</option>
          <option value="aparat">⚡ Con Aparatología</option>
        </select>
      </div>

      {/* TABLA DE PACIENTES */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: B.gray }}>
          Cargando pacientes...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>👥</p>
          <p style={{ color: B.gray }}>
            {pacientes.length === 0
              ? 'Aún no tienes pacientes. Crea el primero con "+ Nuevo paciente".'
              : 'No hay pacientes que coincidan con los filtros actuales.'}
          </p>
        </div>
      ) : (
        <div style={{ background: B.white, borderRadius: 12, border: `1px solid ${B.grayMd}`, overflow: 'hidden' }}>
          {/* Header de tabla */}
          <div style={tableHeader()}>
            <div></div>
            <div>PACIENTE</div>
            <div>PROGRAMA</div>
            <div>MÓDULOS</div>
            <div>VENCE</div>
            <div>ESTADO</div>
            <div style={{ textAlign: 'right' }}>ACCIONES</div>
          </div>
          
          {/* Filas de pacientes */}
          {filtrados.map(p => (
            <PatientRow
              key={p.paciente_id}
              paciente={p}
              onAbrir={() => onAbrirPaciente && onAbrirPaciente({ id: p.paciente_id })}
              onRenovar={() => setModalRenovar(p)}
              onSuspender={() => setModalSuspender(p)}
              onReactivar={() => handleReactivar(p)}
            />
          ))}
        </div>
      )}

      {/* MODALES */}
      {modalNuevo && (
        <ModalNuevoPaciente
          usuario={usuario}
          onClose={() => setModalNuevo(false)}
          onGuardado={() => { cargarDatos(); setModalNuevo(false); showToast('Paciente creado e invitación enviada ✓'); }}
        />
      )}
      
      {modalRenovar && (
        <ModalRenovar
          paciente={modalRenovar}
          onClose={() => setModalRenovar(null)}
          onRenovado={() => { cargarDatos(); setModalRenovar(null); showToast('Programa renovado ✓'); }}
        />
      )}
      
      {modalSuspender && (
        <ModalSuspender
          paciente={modalSuspender}
          onClose={() => setModalSuspender(null)}
          onSuspendido={(razon) => handleSuspender(modalSuspender, razon)}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.color, color: 'white', padding: '12px 28px',
          borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: Stat Tile (estadística clickeable como filtro)
// ════════════════════════════════════════════════════════════════════════
function StatTile({ activa, color, num, label, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: activa ? color + '15' : B.white,
        border: `1.5px solid ${activa ? color : B.grayMd}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 10,
        padding: 14,
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: activa ? `0 4px 12px ${color}30` : 'none',
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 800, color: B.navy, lineHeight: 1 }}>{num}</div>
      <div style={{ fontSize: 11, color: B.gray, fontWeight: 600, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: Fila de paciente en la tabla
// ════════════════════════════════════════════════════════════════════════
function PatientRow({ paciente, onAbrir, onRenovar, onSuspender, onReactivar }) {
  const meta = ESTADOS_META[paciente.programa_estado] || ESTADOS_META.pendiente_activacion;
  const inicial = paciente.nombre?.charAt(0)?.toUpperCase() || '?';
  const diasRestantes = paciente.dias_restantes;
  
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '50px 2fr 1.5fr 1.3fr 1fr 1fr 160px',
        gap: 12,
        padding: '14px 16px',
        alignItems: 'center',
        borderBottom: `1px solid ${B.grayLt}`,
        transition: 'background 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.background = B.grayLt}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={onAbrir}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: 20,
        background: `linear-gradient(135deg, ${B.blue}, ${B.navy})`,
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 14,
      }}>
        {inicial}
      </div>
      
      {/* Info paciente */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: B.navy }}>
          {paciente.nombre}
        </div>
        <div style={{ fontSize: 11, color: B.gray }}>
          {paciente.email || 'Sin email'}
        </div>
      </div>
      
      {/* Programa */}
      <div>
        {paciente.programa_nombre ? (
          <>
            <div style={{ fontSize: 12, color: B.navy, fontWeight: 600 }}>
              {paciente.programa_nombre}
            </div>
            <div style={{ fontSize: 10, color: B.gray, marginTop: 2 }}>
              Día {paciente.dia_del_programa || 0} de {paciente.duracion_total_dias || '—'}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: B.gray, fontStyle: 'italic' }}>
            Sin programa asignado
          </div>
        )}
      </div>
      
      {/* Módulos */}
      <div style={{ display: 'flex', gap: 6 }}>
        <ModuleDot active={paciente.incluye_nutricion}    color={B.green}  emoji="🥗" />
        <ModuleDot active={paciente.incluye_fisioterapia} color={B.orange} emoji="🏃" />
        <ModuleDot active={paciente.incluye_aparatologia} color={B.purple} emoji="⚡" />
      </div>
      
      {/* Vence */}
      <div>
        {paciente.fecha_vencimiento ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: diasRestantes < 14 ? B.orange : B.navy }}>
              {formatDate(paciente.fecha_vencimiento)}
            </div>
            <div style={{ fontSize: 10, color: diasRestantes < 0 ? B.red : diasRestantes < 14 ? B.orange : B.gray }}>
              {diasRestantes < 0 ? `Hace ${Math.abs(diasRestantes)} días` 
                : diasRestantes === 0 ? 'Hoy'
                : `En ${diasRestantes} días`}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: B.gray }}>—</div>
        )}
      </div>
      
      {/* Estado */}
      <div>
        <span style={{
          background: meta.bg,
          color: meta.color,
          padding: '4px 10px',
          borderRadius: 12,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.3,
          whiteSpace: 'nowrap',
        }}>
          {meta.icon} {meta.label}
        </span>
      </div>
      
      {/* Acciones */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
        {paciente.programa_estado === 'por_vencer' || paciente.programa_estado === 'modo_lectura' ? (
          <button onClick={onRenovar} style={btnIcon(B.amber)}>🔄 Renovar</button>
        ) : paciente.programa_estado === 'suspendido' ? (
          <button onClick={onReactivar} style={btnIcon(B.green)}>▶️ Reactivar</button>
        ) : (
          <>
            <button onClick={onAbrir} style={btnIconSm()}>👁️</button>
            <button onClick={onSuspender} style={btnIconSm()}>⏸️</button>
          </>
        )}
      </div>
    </div>
  );
}

function ModuleDot({ active, color, emoji }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 6,
      background: active ? color + '22' : B.grayLt,
      color: active ? color : B.grayMd,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13,
      filter: active ? 'none' : 'grayscale(1) opacity(0.5)',
    }}>
      {emoji}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MODAL: Nuevo Paciente (crea paciente + asigna programa + envía invitación)
// ════════════════════════════════════════════════════════════════════════
function ModalNuevoPaciente({ usuario, onClose, onGuardado }) {
  const [paso, setPaso] = useState(1);
  const [programas, setProgramas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  
  // Datos del paciente
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [fechaNac, setFechaNac] = useState('');
  const [sexo, setSexo] = useState('');
  
  // Datos del programa
  const [catalogoId, setCatalogoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [frecuencia, setFrecuencia] = useState('quincenal');
  const [grupoNutri, setGrupoNutri] = useState('B');
  
  useEffect(() => {
    supabase.from('catalogo_programas')
      .select('*').eq('activo', true).order('orden')
      .then(({ data }) => setProgramas(data || []));
  }, []);

  const programaSel = programas.find(p => p.id === catalogoId);

  const guardarYInvitar = async () => {
    setError('');
    if (!nombre.trim() || !email.trim()) {
      setError('Nombre y email son obligatorios');
      return;
    }
    if (!catalogoId) {
      setError('Selecciona un programa');
      return;
    }
    
    setGuardando(true);
    try {
      // 1. Crear paciente
      const { data: pac, error: errPac } = await supabase
        .from('pacientes')
        .insert([{
          nombre, apellido, email, telefono, cedula,
          fecha_nacimiento: fechaNac || null,
          sexo: sexo || null,
          grupo_nutricional: grupoNutri,
          activo: true,
        }])
        .select()
        .single();
      
      if (errPac) throw errPac;
      
      // 2. Calcular fecha vencimiento
      const meses = programaSel?.duracion_meses || 1;
      const venc = new Date(fechaInicio);
      venc.setMonth(venc.getMonth() + meses);
      
      // 3. Crear programa
      const { data: prog, error: errProg } = await supabase
        .from('programas_paciente')
        .insert([{
          paciente_id: pac.id,
          catalogo_id: catalogoId,
          fecha_inicio: fechaInicio,
          fecha_vencimiento: venc.toISOString().split('T')[0],
          incluye_nutricion: programaSel.incluye_nutricion,
          incluye_fisioterapia: programaSel.incluye_fisioterapia,
          incluye_aparatologia: programaSel.incluye_aparatologia,
          sesiones_aparatologia: programaSel.sesiones_aparatologia || 0,
          frecuencia_control: frecuencia,
          estado: 'pendiente_activacion',
          created_by: usuario?.id,
        }])
        .select()
        .single();
      
      if (errProg) throw errProg;
      
      // 4. Crear invitación
      const { error: errInv } = await supabase
        .from('invitaciones_paciente')
        .insert([{
          paciente_id: pac.id,
          programa_id: prog.id,
          email,
          nombre_completo: `${nombre} ${apellido}`.trim(),
          enviada_por: usuario?.id,
        }]);
      
      if (errInv) throw errInv;
      
      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={modalBg()}>
      <div style={modalCard(720)}>
        {/* Header */}
        <div style={modalHeader()}>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>Nuevo Paciente</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>
              Paso {paso} de 2 — {paso === 1 ? 'Datos personales' : 'Programa contratado'}
            </div>
          </div>
          <button onClick={onClose} style={btnClose()}>✕</button>
        </div>
        
        {/* Stepper */}
        <div style={{ display: 'flex', padding: '0 28px', background: B.grayLt, gap: 4 }}>
          <div style={stepperItem(paso >= 1)}>1. Datos personales</div>
          <div style={stepperItem(paso >= 2)}>2. Programa + invitación</div>
        </div>
        
        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          
          {paso === 1 && (
            <>
              <SectionTitle>👤 Datos personales</SectionTitle>
              <div style={fieldRow()}>
                <Field label="Nombre *"        value={nombre}   onChange={setNombre} half />
                <Field label="Apellido"        value={apellido} onChange={setApellido} half />
                <Field label="Email *"         value={email}    onChange={setEmail} type="email" half />
                <Field label="Teléfono"        value={telefono} onChange={setTelefono} half />
                <Field label="Cédula"          value={cedula}   onChange={setCedula} half />
                <Field label="Fecha nacimiento"value={fechaNac} onChange={setFechaNac} type="date" half />
                <Field label="Sexo" value={sexo} onChange={setSexo} half
                  opts={[{ v: '', l: '—' }, { v: 'F', l: 'Femenino' }, { v: 'M', l: 'Masculino' }, { v: 'O', l: 'Otro' }]} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button onClick={onClose} style={btnSecondary()}>Cancelar</button>
                <button 
                  onClick={() => setPaso(2)}
                  disabled={!nombre || !email}
                  style={btnPrimary({ opacity: (nombre && email) ? 1 : 0.5 })}
                >
                  Siguiente →
                </button>
              </div>
            </>
          )}
          
          {paso === 2 && (
            <>
              <SectionTitle>📋 Programa contratado</SectionTitle>
              
              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel()}>Programa *</label>
                <select 
                  value={catalogoId} 
                  onChange={e => setCatalogoId(e.target.value)}
                  style={inputStyle({ width: '100%' })}
                >
                  <option value="">— Selecciona un programa —</option>
                  {programas.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.apellido || ''}
                    </option>
                  ))}
                </select>
                
                {programaSel && (
                  <div style={{ marginTop: 10, padding: 12, background: B.grayLt, borderRadius: 8, fontSize: 12, color: B.navy }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{programaSel.nombre}</div>
                    {programaSel.descripcion && <div style={{ color: B.gray, marginBottom: 6 }}>{programaSel.descripcion}</div>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {programaSel.incluye_nutricion && <span style={badgeStyle(B.green)}>🥗 Nutrición</span>}
                      {programaSel.incluye_fisioterapia && <span style={badgeStyle(B.orange)}>🏃 Fisioterapia</span>}
                      {programaSel.incluye_aparatologia && <span style={badgeStyle(B.purple)}>⚡ {programaSel.sesiones_aparatologia} sesiones</span>}
                      {programaSel.duracion_meses && <span style={badgeStyle(B.blue)}>📅 {programaSel.duracion_meses} {programaSel.duracion_meses === 1 ? 'mes' : 'meses'}</span>}
                    </div>
                  </div>
                )}
              </div>
              
              <div style={fieldRow()}>
                <Field label="Fecha de inicio *" value={fechaInicio} onChange={setFechaInicio} type="date" half />
                <Field label="Frecuencia de control" value={frecuencia} onChange={setFrecuencia} half
                  opts={[
                    { v: 'semanal', l: 'Semanal' },
                    { v: 'quincenal', l: 'Quincenal' },
                    { v: 'mensual', l: 'Mensual' },
                    { v: 'bimensual', l: 'Bimensual' },
                    { v: 'trimestral', l: 'Trimestral' },
                  ]} />
                <Field label="Grupo nutricional" value={grupoNutri} onChange={setGrupoNutri} half
                  opts={[
                    { v: 'B', l: '🟢 Grupo B — Conservador' },
                    { v: 'A', l: '🟠 Grupo A — Bariátrico/Farmacológico' },
                  ]} />
              </div>
              
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginTop: 14, fontSize: 13, color: B.red }}>
                  {error}
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button onClick={() => setPaso(1)} style={btnSecondary()}>← Volver</button>
                <button 
                  onClick={guardarYInvitar} 
                  disabled={guardando || !catalogoId}
                  style={btnPrimary({ opacity: (!guardando && catalogoId) ? 1 : 0.5 })}
                >
                  {guardando ? 'Creando...' : '✓ Crear y enviar invitación'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MODAL: Renovar programa
// ════════════════════════════════════════════════════════════════════════
function ModalRenovar({ paciente, onClose, onRenovado }) {
  const [meses, setMeses] = useState(3);
  const [guardando, setGuardando] = useState(false);
  
  const renovar = async () => {
    setGuardando(true);
    
    // 1. Finalizar el programa actual
    await supabase
      .from('programas_paciente')
      .update({ estado: 'finalizado', fecha_finalizacion: new Date().toISOString() })
      .eq('id', paciente.programa_id);
    
    // 2. Crear nuevo programa con los mismos módulos
    const inicio = new Date();
    const venc = new Date();
    venc.setMonth(venc.getMonth() + meses);
    
    await supabase.from('programas_paciente').insert([{
      paciente_id: paciente.paciente_id,
      catalogo_id: paciente.catalogo_id || null, // si no hay, lo creamos personalizado
      fecha_inicio: inicio.toISOString().split('T')[0],
      fecha_vencimiento: venc.toISOString().split('T')[0],
      incluye_nutricion: paciente.incluye_nutricion,
      incluye_fisioterapia: paciente.incluye_fisioterapia,
      incluye_aparatologia: paciente.incluye_aparatologia,
      sesiones_aparatologia: paciente.sesiones_aparatologia || 0,
      frecuencia_control: paciente.frecuencia_control || 'quincenal',
      estado: 'activo',
      programa_origen_id: paciente.programa_id,
    }]);
    
    setGuardando(false);
    onRenovado();
  };

  return (
    <div style={modalBg()}>
      <div style={modalCard(480)}>
        <div style={modalHeader()}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>
            🔄 Renovar programa
          </div>
          <button onClick={onClose} style={btnClose()}>✕</button>
        </div>
        
        <div style={{ padding: '24px 28px' }}>
          <p style={{ fontSize: 14, color: B.navy, margin: '0 0 16px' }}>
            Renovando programa de <strong>{paciente.nombre}</strong>
          </p>
          
          <Field label="Duración de la renovación" value={meses} onChange={v => setMeses(parseInt(v))}
            opts={[
              { v: '1', l: '1 mes' },
              { v: '3', l: '3 meses' },
              { v: '6', l: '6 meses' },
              { v: '12', l: '12 meses' },
            ]} />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={onClose} style={btnSecondary()}>Cancelar</button>
            <button onClick={renovar} disabled={guardando} style={btnPrimary({ background: B.green })}>
              {guardando ? 'Renovando...' : '✓ Renovar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MODAL: Suspender paciente
// ════════════════════════════════════════════════════════════════════════
function ModalSuspender({ paciente, onClose, onSuspendido }) {
  const [razon, setRazon] = useState('');
  
  return (
    <div style={modalBg()}>
      <div style={modalCard(480)}>
        <div style={{ ...modalHeader(), background: B.red }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>
            ⏸️ Suspender paciente
          </div>
          <button onClick={onClose} style={btnClose()}>✕</button>
        </div>
        
        <div style={{ padding: '24px 28px' }}>
          <p style={{ fontSize: 14, color: B.navy, margin: '0 0 6px' }}>
            ¿Suspender el acceso de <strong>{paciente.nombre}</strong>?
          </p>
          <p style={{ fontSize: 12, color: B.gray, margin: '0 0 16px' }}>
            El paciente no podrá entrar a su app hasta que reactives su acceso.
          </p>
          
          <Field label="Razón de suspensión" value={razon} onChange={setRazon} type="text" />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={onClose} style={btnSecondary()}>Cancelar</button>
            <button onClick={() => onSuspendido(razon)} style={btnPrimary({ background: B.red })}>
              ⏸️ Suspender
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// HELPERS DE UI
// ════════════════════════════════════════════════════════════════════════
const Field = ({ label, value, onChange, type = 'text', opts, half }) => (
  <div style={{ flex: half ? '0 0 48%' : '0 0 100%', marginBottom: 12 }}>
    <label style={fieldLabel()}>{label}</label>
    {opts ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle({ width: '100%' })}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle({ width: '100%' })} />
    )}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ borderLeft: `4px solid ${B.blue}`, paddingLeft: 10, marginBottom: 14, marginTop: 8 }}>
    <p style={{ fontWeight: 800, fontSize: 11, color: B.navy, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>
      {children}
    </p>
  </div>
);

const fieldLabel = () => ({
  display: 'block', fontSize: 10, fontWeight: 700, color: B.teal,
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
});

const fieldRow = () => ({ display: 'flex', flexWrap: 'wrap', gap: '0 4%' });

const inputStyle = (extra) => ({
  padding: '9px 12px', border: `1.5px solid ${B.grayMd}`, borderRadius: 7,
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  background: 'white', ...extra,
});

const btnPrimary = (extra) => ({
  padding: '10px 22px', background: B.navy, color: 'white', border: 'none',
  borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
  fontFamily: 'inherit', ...extra,
});

const btnSecondary = () => ({
  padding: '9px 20px', background: 'transparent', color: B.gray,
  border: `2px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 700, fontSize: 13,
  cursor: 'pointer', fontFamily: 'inherit',
});

const btnIcon = (color) => ({
  padding: '6px 10px', background: color, color: 'white', border: 'none',
  borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer',
  fontFamily: 'inherit', whiteSpace: 'nowrap',
});

const btnIconSm = () => ({
  padding: '6px 8px', background: B.white, color: B.navy,
  border: `1px solid ${B.grayMd}`, borderRadius: 6, fontWeight: 700, fontSize: 12,
  cursor: 'pointer', fontFamily: 'inherit',
});

const btnClose = () => ({
  background: 'none', border: 'none', color: 'white', fontSize: 22,
  cursor: 'pointer', lineHeight: 1, padding: 4,
});

const tableHeader = () => ({
  display: 'grid', gridTemplateColumns: '50px 2fr 1.5fr 1.3fr 1fr 1fr 160px', gap: 12,
  padding: '12px 16px', background: B.grayLt, borderBottom: `2px solid ${B.grayMd}`,
  fontSize: 10, color: B.gray, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5,
});

const modalBg = () => ({
  position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
});

const modalCard = (width) => ({
  background: B.white, borderRadius: 16, width: '100%', maxWidth: width,
  maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
});

const modalHeader = () => ({
  background: B.navy, padding: '16px 24px', borderRadius: '16px 16px 0 0',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  position: 'sticky', top: 0, zIndex: 10,
});

const stepperItem = (active) => ({
  flex: 1, padding: '10px 12px', fontSize: 11, fontWeight: 700,
  color: active ? B.navy : B.gray, textTransform: 'uppercase', letterSpacing: 0.3,
  borderBottom: `3px solid ${active ? B.blue : 'transparent'}`,
});

const badgeStyle = (color) => ({
  background: color + '22', color: color, padding: '3px 8px',
  borderRadius: 10, fontSize: 11, fontWeight: 700,
});

// Helpers de fecha
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]} ${d.getFullYear()}`;
}
