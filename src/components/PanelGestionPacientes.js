// ════════════════════════════════════════════════════════════════════════
// PanelGestionPacientes.js — Panel de gestión con sistema de programas
//
// Usa el modelo de programas:
// - catalogo_programas (18 programas)
// - programas_paciente (suscripción del paciente)
// - invitaciones_paciente (envío por correo)
//
// Vista v_pacientes_con_programa + v_stats_panel_pacientes para las queries.
//
// ── Capa visual v2 ("clínico premium", aprobada 04/08/2026) ────────────
// La cabecera, los KPIs, los chips, EstadoDot e Inicial ya estaban migrados. Esta
// pasada termina lo que faltaba: la tabla, la tarjeta móvil, el estado vacío, el
// aviso flotante y los tres modales.
//
// Lo que NO cambió: props, estados, las dos vistas SQL, el filtrado, la cadena de
// tres inserts (pacientes → programas_paciente → invitaciones_paciente), el cálculo
// de fecha de vencimiento, y los updates de suspender / reactivar / renovar.
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AccesoPacienteModal from './AccesoPacienteModal';
import { Icon, EstadoDot, Inicial } from './v2/Icon';

const ROJO = '#B02020';
const VERDE = '#1A7A4A';
const NARANJA = '#C25A00';
const AMBAR = '#B87503';
const MORADO = '#7C3AED';
const AZUL = '#1E7CB5';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Antes en móvil se leía window.innerWidth en cada render sin escuchar el resize,
// así que al girar el teléfono el layout no cambiaba hasta recargar.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

// ── Estilos compartidos (v2) ──────────────────────────────────────────
const FUENTE = 'Poppins, system-ui, sans-serif';
const COLS = '50px 2fr 1.5fr 1.3fr 1fr 1fr 160px';

const fieldLabel = () => ({ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.06em', marginBottom: 6 });
const fieldRow = () => ({ display: 'flex', flexWrap: 'wrap', gap: '0 4%' });
const inputStyle = (extra) => ({ width: '100%', height: 40, padding: '0 11px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...extra });

const btnPrimary = (extra) => ({ height: 40, padding: '0 20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(180deg,#14355F,var(--ink))', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)', ...extra });
const btnSecondary = () => ({ height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' });
const btnPlano = (color) => ({ height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: color, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' });

const modalBg = () => ({ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: FUENTE, color: 'var(--ink)' });
const modalCard = (width) => ({ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: width, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 40px 90px -30px rgba(11,31,59,.6)' });
const modalHeader = (extra) => ({ background: 'linear-gradient(180deg,#14355F,var(--ink))', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, ...extra });

const tableHeader = (isMobile) => ({
  display: isMobile ? 'none' : 'grid',
  gridTemplateColumns: COLS, gap: 12,
  padding: '12px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)',
  fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.12em',
});

// Helper V2: botón icónico como el mockup
const iconBtnV2 = (extra = {}) => ({
  width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid var(--line)', borderRadius: 9, background: 'var(--surface)',
  color: 'var(--ink-2)', cursor: 'pointer', transition: 'all .14s ease', fontFamily: 'inherit',
  ...extra,
});

const BotonCerrar = ({ onClose }) => (
  <button onClick={onClose} aria-label="Cerrar"
    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
    <Icon name="x" size={16} strokeWidth={2} />
  </button>
);

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
  const [modalAcceso, setModalAcceso] = useState(null);
  const [toast, setToast] = useState(null);
  const isMobile = useIsMobile();

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

  const showToast = (msg, color = VERDE) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Filtrado ─────────────────────────────────────────────────────────
  const filtrados = pacientes.filter(p => {
    // Filtro por estado
    if (filtroEstado !== 'todos' && p.programa_estado !== filtroEstado) return false;

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

    if (error) { showToast('Error: ' + error.message, ROJO); return; }
    showToast(`${paciente.nombre} suspendido`, NARANJA);
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

    if (error) { showToast('Error: ' + error.message, ROJO); return; }
    showToast(`${paciente.nombre} reactivado`);
    cargarDatos();
  };

  // ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box', fontFamily: FUENTE, color: 'var(--ink)' }}>

      {/* HEADER V2 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 5px' }}>
            Pacientes
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0 }}>
            {stats.total || 0} en gestión
            {stats.por_vencer > 0 && (
              <span style={{ color: AMBAR, fontWeight: 500, marginLeft: 6 }}>
                · {stats.por_vencer} vencen este mes
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setModalNuevo(true)} style={btnPrimary({ padding: '0 18px' })}>
          <Icon name="plus" size={17} color="#fff" /> Nuevo paciente
        </button>
      </div>

      {/* KPIs V2 — en móvil pasan a dos columnas para no aplastarse */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(5,1fr)', gap: 12, marginBottom: 16 }}>
        <KpiCardV2 activa={filtroEstado === 'todos'} label="Todos los pacientes" num={stats.total || 0} total={stats.total || 1} tone="var(--accent)" onClick={() => setFiltroEstado('todos')} />
        <KpiCardV2 activa={filtroEstado === 'activo'} label="Activos" num={stats.activos || 0} total={stats.total || 1} tone={VERDE} onClick={() => setFiltroEstado('activo')} />
        <KpiCardV2 activa={filtroEstado === 'por_vencer'} label="Por vencer" num={stats.por_vencer || 0} total={stats.total || 1} tone="#E0A62A" onClick={() => setFiltroEstado('por_vencer')} />
        <KpiCardV2 activa={filtroEstado === 'modo_lectura'} label="Modo lectura" num={stats.modo_lectura || 0} total={stats.total || 1} tone={NARANJA} onClick={() => setFiltroEstado('modo_lectura')} />
        <KpiCardV2 activa={filtroEstado === 'suspendido'} label="Suspendidos" num={stats.suspendidos || 0} total={stats.total || 1} tone={ROJO} onClick={() => setFiltroEstado('suspendido')} />
      </div>

      {/* Filtros V2 con search e iconos */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 280, maxWidth: 420 }}>
          <span style={{ position: 'absolute', left: 13, display: 'flex', color: 'var(--ink-3)', pointerEvents: 'none' }}>
            <Icon name="search" size={17} />
          </span>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono"
            style={inputStyle({ paddingLeft: 38 })}
          />
        </div>
        <div style={{ display: 'flex', gap: 7, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <ChipV2 on={filtroModulo === 'todos'} onClick={() => setFiltroModulo('todos')}>Todos los módulos</ChipV2>
          <ChipV2 on={filtroModulo === 'nutri'} onClick={() => setFiltroModulo('nutri')}>
            <Icon name="utensils" size={14} /> Nutrición
          </ChipV2>
          <ChipV2 on={filtroModulo === 'fisio'} onClick={() => setFiltroModulo('fisio')}>
            <Icon name="activity" size={14} /> Fisioterapia
          </ChipV2>
          <ChipV2 on={filtroModulo === 'aparat'} onClick={() => setFiltroModulo('aparat')}>
            <Icon name="zap" size={14} /> Aparatología
          </ChipV2>
        </div>
      </div>

      {/* TABLA DE PACIENTES */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)', fontSize: 13.5 }}>
          Cargando pacientes…
        </p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--sh-1)' }}>
          <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: 'var(--accent-wash)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Icon name="users" size={22} color="var(--accent)" />
          </span>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
            {pacientes.length === 0 ? 'Aún no hay pacientes' : 'Sin resultados'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 0' }}>
            {pacientes.length === 0
              ? 'Crea el primero con «Nuevo paciente».'
              : 'Prueba con otro término o quita los filtros.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', boxShadow: 'var(--sh-2)', overflow: 'hidden', width: '100%' }}>
          {/* Header de tabla */}
          <div style={tableHeader(isMobile)}>
            <div></div>
            <div>Paciente</div>
            <div>Programa</div>
            <div>Módulos</div>
            <div>Vence</div>
            <div>Estado</div>
            <div style={{ textAlign: 'right' }}>Acciones</div>
          </div>

          {/* Filas de pacientes */}
          {filtrados.map(p => (
            <PatientRow
              key={p.paciente_id}
              paciente={p}
              isMobile={isMobile}
              onAbrir={() => onAbrirPaciente && onAbrirPaciente({
                id: p.paciente_id,
                nombre: p.nombre,
                apellido: p.apellido,
                cedula: p.cedula,
                fecha_nacimiento: p.fecha_nacimiento,
                sexo: p.sexo,
                email: p.email,
                telefono: p.telefono,
                grupo_nutricional: p.grupo_nutricional,
              })}
              onRenovar={() => setModalRenovar(p)}
              onSuspender={() => setModalSuspender(p)}
              onReactivar={() => handleReactivar(p)}
              onAcceso={() => setModalAcceso(p)}
            />
          ))}
        </div>
      )}

      {/* MODALES */}
      {modalNuevo && (
        <ModalNuevoPaciente
          usuario={usuario}
          onClose={() => setModalNuevo(false)}
          onGuardado={() => { cargarDatos(); setModalNuevo(false); showToast('Paciente creado e invitación enviada'); }}
        />
      )}

      {modalRenovar && (
        <ModalRenovar
          paciente={modalRenovar}
          onClose={() => setModalRenovar(null)}
          onRenovado={() => { cargarDatos(); setModalRenovar(null); showToast('Programa renovado'); }}
        />
      )}

      {modalSuspender && (
        <ModalSuspender
          paciente={modalSuspender}
          onClose={() => setModalSuspender(null)}
          onSuspendido={(razon) => handleSuspender(modalSuspender, razon)}
        />
      )}

      {modalAcceso && (
        <AccesoPacienteModal
          paciente={modalAcceso}
          onClose={() => setModalAcceso(null)}
          onActualizado={cargarDatos}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 9,
          background: 'var(--ink)', color: '#fff', padding: '12px 20px',
          borderRadius: 12, fontWeight: 500, fontSize: 13.5, zIndex: 9999,
          boxShadow: 'var(--sh-nav)', fontFamily: FUENTE,
        }}>
          <Icon name={toast.color === ROJO ? 'alert-circle' : 'check-circle-2'} size={16}
            color={toast.color === ROJO ? '#FCA5A5' : toast.color === NARANJA ? '#F5C87A' : '#6EE7A8'} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE V2: KpiCard con progress bar y estilo clínico premium
// ════════════════════════════════════════════════════════════════════════
function KpiCardV2({ label, num, total, activa, onClick, tone }) {
  const pct = total ? Math.round((num / total) * 100) : 0;
  return (
    <button onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '15px 16px 14px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        background: activa ? 'linear-gradient(180deg,#14355F,#0B1F3B)' : 'var(--surface)',
        border: activa ? '1px solid #0B1F3B' : '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: activa ? 'var(--sh-2)' : 'var(--sh-1)',
        transition: 'all .16s ease',
      }}>
      <p style={{ fontSize: 12, fontWeight: 500, color: activa ? 'rgba(255,255,255,.66)' : 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</p>
      <p style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1, color: activa ? '#fff' : 'var(--ink)', margin: 0 }}>{num}</p>
      <div style={{ height: 4, borderRadius: 999, marginTop: 12, background: activa ? 'rgba(255,255,255,.16)' : 'var(--line-soft)', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: pct + '%', borderRadius: 999, background: activa ? '#7FC0EC' : tone }} />
      </div>
    </button>
  );
}

// ── Chip V2 (para filtros de módulos) ─────────────────────────────────
function ChipV2({ on, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{
        height: 34, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 7,
        border: on ? '1px solid var(--ink)' : '1px solid var(--line)', borderRadius: 999,
        background: on ? 'var(--ink)' : 'var(--surface)', fontFamily: 'inherit',
        fontSize: 12.5, fontWeight: 500, color: on ? '#fff' : 'var(--ink-2)',
        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .14s ease',
      }}>
      {children}
    </button>
  );
}

// ── Texto de vencimiento, compartido entre la fila y la tarjeta móvil ──
function textoVencimiento(dias) {
  if (dias == null) return null;
  if (dias < 0) return `Hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Hoy';
  return `En ${dias} ${dias === 1 ? 'día' : 'días'}`;
}
const colorVencimiento = dias => dias == null ? 'var(--ink-3)' : dias < 0 ? ROJO : dias < 14 ? NARANJA : 'var(--ink-3)';

// ════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: Fila de paciente en la tabla
// ════════════════════════════════════════════════════════════════════════
function PatientRow({ paciente, isMobile, onAbrir, onRenovar, onSuspender, onReactivar, onAcceso }) {
  const diasRestantes = paciente.dias_restantes;

  // ── Versión móvil: tarjeta vertical ────────────────────────────────
  if (isMobile) {
    return (
      <div
        onClick={onAbrir}
        style={{ padding: '14px 15px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', background: 'var(--surface)' }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Inicial nombre={paciente.nombre} size={42} tone="strong" />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
              {paciente.nombre} {paciente.apellido || ''}
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '3px 0 0' }}>
              {paciente.programa_nombre || 'Sin programa asignado'}
            </p>

            <div style={{ display: 'flex', gap: 10, marginTop: 9, flexWrap: 'wrap', alignItems: 'center' }}>
              <EstadoDot estado={paciente.programa_estado || 'pendiente_activacion'} />
              {paciente.fecha_vencimiento && (
                <span style={{ fontSize: 12, color: colorVencimiento(diasRestantes), whiteSpace: 'nowrap' }}>
                  {diasRestantes < 0 ? 'Vencido' : 'Vence'} {textoVencimiento(diasRestantes).toLowerCase()}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <ModuleDot active={paciente.incluye_nutricion}    color={VERDE}   iconName="utensils" />
              <ModuleDot active={paciente.incluye_fisioterapia} color={NARANJA} iconName="activity" />
              <ModuleDot active={paciente.incluye_aparatologia} color={MORADO}  iconName="zap" />
            </div>
          </div>

          <Icon name="chevron-right" size={17} color="var(--ink-3)" style={{ marginTop: 12 }} />
        </div>
      </div>
    );
  }

  // ── Versión desktop: fila horizontal ───────────────────────────────
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: COLS, gap: 12,
        padding: '14px 16px', alignItems: 'center',
        borderBottom: '1px solid var(--line-soft)',
        transition: 'background .14s ease', cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={onAbrir}
    >
      {/* Avatar V2 */}
      <Inicial nombre={paciente.nombre} size={40} />

      {/* Info paciente */}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {paciente.nombre} {paciente.apellido || ''}
        </p>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {paciente.email || 'Sin email'}
        </p>
      </div>

      {/* Programa */}
      <div style={{ minWidth: 0 }}>
        {paciente.programa_nombre ? (
          <>
            <p style={{ fontSize: 12.5, fontWeight: 500, margin: 0, lineHeight: 1.35 }}>
              {paciente.programa_nombre}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '3px 0 0' }}>
              Día {paciente.dia_del_programa || 0} de {paciente.duracion_total_dias || '—'}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: 0 }}>Sin programa</p>
        )}
      </div>

      {/* Módulos */}
      <div style={{ display: 'flex', gap: 6 }}>
        <ModuleDot active={paciente.incluye_nutricion}    color={VERDE}   iconName="utensils" />
        <ModuleDot active={paciente.incluye_fisioterapia} color={NARANJA} iconName="activity" />
        <ModuleDot active={paciente.incluye_aparatologia} color={MORADO}  iconName="zap" />
      </div>

      {/* Vence */}
      <div>
        {paciente.fecha_vencimiento ? (
          <>
            <p style={{ fontSize: 12.5, fontWeight: 500, margin: 0, color: diasRestantes < 14 ? NARANJA : 'var(--ink)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatDate(paciente.fecha_vencimiento)}
            </p>
            <p style={{ fontSize: 11.5, margin: '3px 0 0', color: colorVencimiento(diasRestantes), whiteSpace: 'nowrap' }}>
              {textoVencimiento(diasRestantes)}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: 0 }}>—</p>
        )}
      </div>

      {/* Estado V2 con dot circular */}
      <div>
        <EstadoDot estado={paciente.programa_estado || 'pendiente_activacion'} />
      </div>

      {/* Acciones V2 con iconos Lucide */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
        <button onClick={onAcceso} title="Acceso a la app del paciente" style={iconBtnV2()}>
          <Icon name="key-round" size={15} />
        </button>
        {paciente.programa_estado === 'por_vencer' || paciente.programa_estado === 'modo_lectura' ? (
          <button onClick={onRenovar} title="Renovar programa" style={iconBtnV2({ borderColor: '#F0D9A8', color: AMBAR, background: '#FFFBF2' })}>
            <Icon name="refresh-cw" size={15} />
          </button>
        ) : paciente.programa_estado === 'suspendido' ? (
          <button onClick={onReactivar} title="Reactivar programa" style={iconBtnV2({ borderColor: '#BFE0CE', color: VERDE, background: '#F2FBF6' })}>
            <Icon name="play" size={15} />
          </button>
        ) : (
          <button onClick={onSuspender} title="Suspender programa" style={iconBtnV2()}>
            <Icon name="pause" size={15} />
          </button>
        )}
        <button onClick={onAbrir} title="Abrir ficha clínica" style={iconBtnV2()}>
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </div>
  );
}

function ModuleDot({ active, color, iconName }) {
  return (
    <span style={{
      width: 30, height: 30, borderRadius: 9,
      background: active ? color + '14' : 'var(--line-soft)',
      color: active ? color : '#C3CEDC',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={iconName || 'utensils'} size={15} strokeWidth={active ? 1.9 : 1.6} />
    </span>
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
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>Nuevo paciente</p>
            <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, margin: '3px 0 0' }}>
              Paso {paso} de 2 — {paso === 1 ? 'Datos personales' : 'Programa contratado'}
            </p>
          </div>
          <BotonCerrar onClose={onClose} />
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', padding: '0 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', gap: 4 }}>
          <div style={stepperItem(paso >= 1)}>1 · Datos personales</div>
          <div style={stepperItem(paso >= 2)}>2 · Programa e invitación</div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px 24px' }}>

          {paso === 1 && (
            <>
              <SectionTitle>Datos personales</SectionTitle>
              <div style={fieldRow()}>
                <Field label="Nombre *"         value={nombre}   onChange={setNombre} half />
                <Field label="Apellido"         value={apellido} onChange={setApellido} half />
                <Field label="Email *"          value={email}    onChange={setEmail} type="email" half />
                <Field label="Teléfono"         value={telefono} onChange={setTelefono} half />
                <Field label="Cédula"           value={cedula}   onChange={setCedula} half />
                <Field label="Fecha nacimiento" value={fechaNac} onChange={setFechaNac} type="date" half />
                <Field label="Sexo" value={sexo} onChange={setSexo} half
                  opts={[{ v: '', l: '—' }, { v: 'F', l: 'Femenino' }, { v: 'M', l: 'Masculino' }, { v: 'O', l: 'Otro' }]} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={onClose} style={btnSecondary()}>Cancelar</button>
                <button
                  onClick={() => setPaso(2)}
                  disabled={!nombre || !email}
                  style={btnPrimary({ opacity: (nombre && email) ? 1 : 0.5, cursor: (nombre && email) ? 'pointer' : 'not-allowed' })}
                >
                  Siguiente <Icon name="chevron-right" size={16} color="#fff" />
                </button>
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <SectionTitle>Programa contratado</SectionTitle>

              <div style={{ marginBottom: 16 }}>
                <label style={fieldLabel()}>Programa *</label>
                <select
                  value={catalogoId}
                  onChange={e => setCatalogoId(e.target.value)}
                  style={inputStyle()}
                >
                  <option value="">— Selecciona un programa —</option>
                  {programas.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>

                {programaSel && (
                  <div style={{ marginTop: 10, padding: '13px 14px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12 }}>
                    <p style={{ fontWeight: 600, fontSize: 13.5, margin: '0 0 4px' }}>{programaSel.nombre}</p>
                    {programaSel.descripcion && (
                      <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '0 0 10px', lineHeight: 1.5 }}>{programaSel.descripcion}</p>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {programaSel.incluye_nutricion && <Badge color={VERDE} icon="utensils">Nutrición</Badge>}
                      {programaSel.incluye_fisioterapia && <Badge color={NARANJA} icon="activity">Fisioterapia</Badge>}
                      {programaSel.incluye_aparatologia && <Badge color={MORADO} icon="zap">{programaSel.sesiones_aparatologia} sesiones</Badge>}
                      {programaSel.duracion_meses && <Badge color={AZUL} icon="calendar-days">{programaSel.duracion_meses} {programaSel.duracion_meses === 1 ? 'mes' : 'meses'}</Badge>}
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
                    { v: 'B', l: 'Grupo B — Conservador' },
                    { v: 'A', l: 'Grupo A — Bariátrico / Farmacológico' },
                  ]} />
              </div>

              {error && (
                <div style={{ background: '#FFF0F0', border: '1px solid #FBD5D5', borderRadius: 10, padding: '10px 13px', marginTop: 8, fontSize: 12.5, lineHeight: 1.5, color: ROJO }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
                <button onClick={() => setPaso(1)} style={btnSecondary()}>
                  <Icon name="arrow-left" size={16} color="var(--ink-3)" /> Volver
                </button>
                <button
                  onClick={guardarYInvitar}
                  disabled={guardando || !catalogoId}
                  style={btnPrimary({ opacity: (!guardando && catalogoId) ? 1 : 0.5, cursor: (!guardando && catalogoId) ? 'pointer' : 'not-allowed' })}
                >
                  {guardando ? 'Creando…' : <><Icon name="send" size={16} color="#fff" /> Crear y enviar invitación</>}
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
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>Renovar programa</p>
          <BotonCerrar onClose={onClose} />
        </div>

        <div style={{ padding: '22px 24px 24px' }}>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}>{paciente.nombre} {paciente.apellido || ''}</p>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '3px 0 0' }}>
              {paciente.programa_nombre || 'Sin programa'}
              {paciente.fecha_vencimiento && ` · vence ${formatDate(paciente.fecha_vencimiento)}`}
            </p>
          </div>

          <Field label="Duración de la renovación" value={String(meses)} onChange={v => setMeses(parseInt(v))}
            opts={[
              { v: '1', l: '1 mes' },
              { v: '3', l: '3 meses' },
              { v: '6', l: '6 meses' },
              { v: '12', l: '12 meses' },
            ]} />

          <p style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, marginTop: 4 }}>
            <Icon name="info" size={13} color="var(--ink-3)" style={{ marginTop: 1 }} />
            El programa actual se marca como finalizado y se crea uno nuevo con los mismos módulos.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <button onClick={onClose} style={btnSecondary()}>Cancelar</button>
            <button onClick={renovar} disabled={guardando} style={btnPlano(VERDE)}>
              {guardando ? 'Renovando…' : <><Icon name="refresh-cw" size={16} color="#fff" /> Renovar</>}
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
        <div style={modalHeader({ background: 'linear-gradient(180deg,#8E1A1A,' + ROJO + ')' })}>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>Suspender paciente</p>
          <BotonCerrar onClose={onClose} />
        </div>

        <div style={{ padding: '22px 24px 24px' }}>
          <p style={{ fontSize: 14, margin: '0 0 6px' }}>
            ¿Suspender el acceso de <strong style={{ fontWeight: 600 }}>{paciente.nombre} {paciente.apellido || ''}</strong>?
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '0 0 18px', lineHeight: 1.55 }}>
            El paciente no podrá entrar a su app hasta que reactives su acceso. Su historia clínica no se
            modifica y puedes reactivarlo en cualquier momento.
          </p>

          <Field label="Razón de suspensión" value={razon} onChange={setRazon} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <button onClick={onClose} style={btnSecondary()}>Cancelar</button>
            <button onClick={() => onSuspendido(razon)} style={btnPlano(ROJO)}>
              <Icon name="pause" size={16} color="#fff" /> Suspender
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
  <div style={{ flex: half ? '0 0 48%' : '0 0 100%', marginBottom: 14 }}>
    <label style={fieldLabel()}>{label}</label>
    {opts ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle()}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle()} />
    )}
  </div>
);

// Encabezado de sección: eyebrow con línea inferior, sin el filete azul a la izquierda.
const SectionTitle = ({ children }) => (
  <div style={{ marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--line-soft)' }}>
    <p style={{ fontWeight: 600, fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.12em', margin: 0 }}>
      {children}
    </p>
  </div>
);

const Badge = ({ color, icon, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 8, background: color + '14', color, fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
    <Icon name={icon} size={12} /> {children}
  </span>
);

const stepperItem = (active) => ({
  flex: 1, padding: '11px 4px', fontSize: 11.5, fontWeight: active ? 600 : 500,
  color: active ? 'var(--ink)' : 'var(--ink-3)',
  borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
  marginBottom: -1,
});

// Helpers de fecha
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
}
