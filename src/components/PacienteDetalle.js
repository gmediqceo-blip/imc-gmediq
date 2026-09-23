import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PlanEjercicio from './PlanEjercicio';
import { BotonesDocumentos, generarInforme } from './Documentos';
import { Field, TextArea, SectionTitle, FieldRow } from './FormFields';
import BancoArchivos from './BancoArchivos';
import ConsultaMedica, { HistorialUnificado } from './ConsultaMedica';
import Parametros from './Parametros';
import SugerenciasIA from './SugerenciasIA';
import TabNutricionV2 from './TabNutricionV2';
import EvolucionAntropometrica from './EvolucionAntropometrica';
import TabCosmetologia from './TabCosmetologia';
import { Icon, Inicial } from './v2/Icon';

// ═══════════════════════════════════════════════════════════════════════
// PacienteDetalle — capa visual v2 ("clínico premium", aprobada 04/08/2026)
//
// Lo que NO cambió: props, los siete queries del Promise.all, cargarProtocolos,
// el filtrado de pestañas por rol, el truco de mantener ConsultaMedica montada
// con display:none para no perder el borrador al navegar, el cálculo automático
// de IMC y de las tres zonas de FC, el insert de valoraciones con su update de
// citas a 'atendida', el insert de consultas médicas, el update de valoración
// con recálculo de IMC, el update de paciente y la impresión del informe.
//
// Cambia la presentación: tokens en vez de la constante B, Poppins, iconos
// Lucide en vez de emoji, y jerarquía por elevación.
// ═══════════════════════════════════════════════════════════════════════

const ROJO = '#B02020';
const VERDE = '#1A7A4A';
const NARANJA = '#C25A00';
const AZUL = '#1E7CB5';
const PIZARRA = '#4B647A';
const FUENTE = "'Poppins', system-ui, sans-serif";

const calcAge = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const planLabels = { starter: 'Starter $80', standard: 'Standard $250/mes', imc360: 'IMC 360 $400/mes' };
const grupoLabels = { transformacion: 'Transformación', prequirurgico: 'Pre-quirúrgico', postquirurgico: 'Post-quirúrgico' };

const APTITUD = {
  apto:      { label: 'Apto', color: VERDE, icon: 'check-circle-2' },
  apto_rest: { label: 'Con restricciones', color: NARANJA, icon: 'alert-triangle' },
  no_apto:   { label: 'No apto', color: ROJO, icon: 'alert-circle' },
};

// ── Estilos compartidos (v2) ──────────────────────────────────────────
const CARD = { background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' };
const btnPrimario = (extra = {}) => ({ height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(180deg,#14355F,var(--ink))', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)', ...extra });
const btnFantasma = (extra = {}) => ({ height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', ...extra });
const btnPlano = (color, extra = {}) => ({ height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: color, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', ...extra });
const btnMini = (extra = {}) => ({ height: 30, padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 9, fontWeight: 500, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', ...extra });

const modalBg = (extra = {}) => ({ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, fontFamily: FUENTE, color: 'var(--ink)', ...extra });
const modalCard = (width, extra = {}) => ({ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: width, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 40px 90px -30px rgba(11,31,59,.6)', ...extra });
const modalHeader = (extra = {}) => ({ background: 'linear-gradient(180deg,#14355F,var(--ink))', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10, ...extra });

const eyebrow = { fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.12em', margin: 0 };

const BotonCerrar = ({ onClose }) => (
  <button onClick={onClose} aria-label="Cerrar"
    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
    <Icon name="x" size={16} strokeWidth={2} />
  </button>
);

const Toast = ({ toast }) => (
  <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ink)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 500, fontSize: 13.5, zIndex: 9999, boxShadow: 'var(--sh-nav)', fontFamily: FUENTE }}>
    <Icon name={toast.color === ROJO ? 'alert-circle' : 'check-circle-2'} size={16} color={toast.color === ROJO ? '#FCA5A5' : '#6EE7A8'} />
    {toast.msg}
  </div>
);

const Vacio = ({ icon, titulo, texto }) => (
  <div style={{ ...CARD, textAlign: 'center', padding: '60px 24px' }}>
    <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: 'var(--accent-wash)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
      <Icon name={icon} size={22} color="var(--accent)" />
    </span>
    <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{titulo}</p>
    {texto && <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 0' }}>{texto}</p>}
  </div>
);

// Tile de dato clínico: sin el filete de color superior; el color va en la cifra.
const Tile = ({ label, valor, unidad, color }) => (
  <div style={{ ...CARD, padding: '13px 15px' }}>
    <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '0 0 7px' }}>{label}</p>
    <p style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1, margin: 0, color: valor ? (color || 'var(--ink)') : 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
      {valor || '—'}
      {valor && unidad && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 4 }}>{unidad}</span>}
    </p>
  </div>
);

export default function PacienteDetalle({ paciente, onVolver, usuario }) {
  const [tab, setTab] = useState('resumen');
  const [modalEditarPaciente, setModalEditarPaciente] = useState(false);
  const [protocolos, setProtocolos] = useState([]);
  const [pacienteFull, setPacienteFull] = useState(paciente);
  const [valoraciones, setValoraciones] = useState([]);
  const [consultasMed, setConsultasMed] = useState([]);
  const [consultasNut, setConsultasNut] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ejercicios, setEjercicios] = useState([]);
  const [sesionesCosm, setSesionesCosm] = useState([]);

  const age = calcAge(pacienteFull.fecha_nacimiento);

  useEffect(() => {
    fetchTodo();
    cargarProtocolos();
  }, [paciente.id]);

  const cargarProtocolos = async () => {
    const { data } = await supabase
      .from('protocolos_nutricionales')
      .select('*')
      .eq('activo', true)
      .order('orden');
    setProtocolos(data || []);
  };

  // Sincronizar si cambia paciente
  useEffect(() => {
    setPacienteFull(paciente);
  }, [paciente.id]);

  const fetchTodo = async () => {
    const [pacFull, v, m, n, pl, ej, cosm] = await Promise.all([
      supabase.from('pacientes').select('*').eq('id', paciente.id).single(),
      supabase.from('valoraciones').select('*').eq('paciente_id', paciente.id).order('fecha', { ascending: false }),
      supabase.from('consultas_medicas').select('*').eq('paciente_id', paciente.id).order('fecha', { ascending: false }),
      supabase.from('consultas_nutricion').select('*').eq('paciente_id', paciente.id).order('fecha', { ascending: false }),
      supabase.from('planes_ejercicio').select('*, plan_ejercicios(*)').eq('paciente_id', paciente.id).order('fecha', { ascending: false }),
      supabase.from('ejercicios').select('*').eq('activo', true).order('categoria').order('nombre'),
      supabase.from('sesiones_cosmetologia').select('*, tratamientos_cosmetologia(nombre, icono)').eq('paciente_id', paciente.id).order('fecha', { ascending: false }),
    ]);
    if (pacFull.data) setPacienteFull(pacFull.data);
    setValoraciones(v.data || []);
    setConsultasMed(m.data || []);
    setConsultasNut(n.data || []);
    setPlanes(pl.data || []);
    setEjercicios(ej.data || []);
    setSesionesCosm(cosm.data || []);
    setLoading(false);
  };

  const lastV = valoraciones[0];

  // Control de acceso por rol
  const rol = usuario?.rol;

  const allTabs = [
    { key: 'resumen', label: 'Resumen', icon: 'layout-dashboard', roles: null }, // todos
    { key: 'historial', label: 'Historial', icon: 'history', roles: null },
    { key: 'parametros', label: 'Parámetros', icon: 'ruler', roles: null },
    { key: 'fisioterapia', label: 'Fisioterapia', icon: 'activity', roles: ['admin','secretaria','fisioterapeuta'] },
    { key: 'medico', label: 'Médico', icon: 'stethoscope', roles: ['admin','secretaria','medico'] },
    { key: 'nutricion', label: 'Nutrición', icon: 'utensils', roles: ['admin','secretaria','nutricionista'] },
    { key: 'evolucion', label: 'Evolución', icon: 'trending-up', roles: null },
    { key: 'ejercicio', label: 'Plan de ejercicio', icon: 'dumbbell', roles: ['admin','secretaria','fisioterapeuta'] },
    { key: 'cosmetologia', label: 'Cosmetología', icon: 'sparkles', roles: ['admin','secretaria','cosmetologa'] },
    { key: 'archivos', label: 'Archivos', icon: 'folder', roles: null },
  ];
  const tabs = allTabs.filter(t => !t.roles || t.roles.includes(rol));

  // El protocolo puede no existir en el catálogo: antes se concatenaba
  // `undefined + ' ' + '—'` y se imprimía "undefined —" en la ficha.
  const protoActual = protocolos.find(p => p.codigo === pacienteFull.protocolo_nutricional);

  const chipHeader = (extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 8, background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.85)', fontSize: 11.5, whiteSpace: 'nowrap', ...extra });

  return (
    <div style={{ fontFamily: FUENTE, minHeight: '100vh', background: 'var(--canvas)', color: 'var(--ink)' }}>
      {/* Header paciente */}
      <div style={{ background: 'var(--ink)', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', right: -30, top: -40, width: 240, height: 240, opacity: 0.1, pointerEvents: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0l30 17.32v34.64L30 69.28 0 51.96V17.32z' fill='none' stroke='%231E7CB5' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: '60px 52px',
        }} />
        <button onClick={onVolver} aria-label="Volver a pacientes"
          style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, color: '#fff', cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
          <Icon name="arrow-left" size={17} />
        </button>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Inicial nombre={pacienteFull.nombre} size={44} tone="strong" />
        </div>
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 18, letterSpacing: '-.01em', margin: '0 0 6px' }}>
            {pacienteFull.nombre} {pacienteFull.apellido || ''}
          </p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            {paciente.historia_clinica && (
              <span style={chipHeader()}>
                <Icon name="clipboard-list" size={12} color="rgba(255,255,255,.6)" /> {paciente.historia_clinica}
              </span>
            )}
            {pacienteFull.cedula && (
              <span style={chipHeader({ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.65)' })}>
                <Icon name="id-card" size={12} color="rgba(255,255,255,.5)" /> {pacienteFull.cedula}
              </span>
            )}
            {grupoLabels[paciente.grupo] && <span style={chipHeader()}>{grupoLabels[paciente.grupo]}</span>}
            {age > 0 && <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 11.5 }}>{age} años</span>}
          </div>
        </div>
        <button
          onClick={() => setModalEditarPaciente(true)}
          title="Editar datos del paciente"
          style={{ position: 'relative', height: 38, padding: '0 15px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          <Icon name="edit" size={15} /> Editar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', display: 'flex', paddingLeft: 16, overflowX: 'auto' }}>
        {tabs.map(t => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '13px 15px', border: 'none', background: 'none', fontWeight: on ? 600 : 500, fontSize: 13, cursor: 'pointer', color: on ? 'var(--ink)' : 'var(--ink-3)', borderBottom: '2px solid ' + (on ? 'var(--accent)' : 'transparent'), marginBottom: -1, whiteSpace: 'nowrap', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Icon name={t.icon} size={15} strokeWidth={on ? 2 : 1.7} color={on ? 'var(--accent)' : 'var(--ink-3)'} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: '22px 24px 40px', maxWidth: 1000, margin: '0 auto' }}>

        {/* RESUMEN */}
        {tab === 'resumen' && (
          <div>
            {/* Documentos */}
            <BotonesDocumentos
              paciente={paciente}
              valoraciones={valoraciones}
              planes={planes}
              ejercicios={ejercicios}
            />

            {/* Stats rápidos */}
            {lastV && (
              <>
                <p style={{ ...eyebrow, margin: '0 0 12px' }}>Última valoración · {fmtDate(lastV.fecha)}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(152px,1fr))', gap: 12, marginBottom: 22 }}>
                  {[
                    ['Peso', lastV.peso, 'kg', null],
                    ['% Grasa', lastV.pct_grasa, '%', NARANJA],
                    ['Músculo', lastV.masa_muscular, 'kg', VERDE],
                    ['IMC', lastV.bmi, '', null],
                    ['VO₂ máx', lastV.vo2max, 'ml/kg/min', AZUL],
                    ['Sit & Stand', lastV.sit_stand, 'rep', null],
                  ].map(([l, v, u, c]) => <Tile key={l} label={l} valor={v} unidad={u} color={c} />)}
                </div>
              </>
            )}

            {/* Mini evolución antropométrica */}
            <EvolucionAntropometrica paciente={pacienteFull} compacto={true} />

            {/* Info del paciente */}
            <div style={{ ...CARD, padding: '20px 22px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <p style={eyebrow}>Información completa del paciente</p>
                <button onClick={() => setModalEditarPaciente(true)} title="Editar datos del paciente" style={btnMini()}>
                  <Icon name="edit" size={13} color="var(--ink-3)" /> Editar
                </button>
              </div>

              {[
                ['Datos personales', [
                  ['Nombre completo', `${pacienteFull.nombre || ''} ${pacienteFull.apellido || ''}`.trim()],
                  ['Cédula', pacienteFull.cedula],
                  ['Fecha nacimiento', pacienteFull.fecha_nacimiento ? fmtDate(pacienteFull.fecha_nacimiento) : null],
                  ['Edad', age > 0 ? `${age} años` : null],
                  ['Sexo', pacienteFull.sexo === 'M' ? 'Masculino' : pacienteFull.sexo === 'F' ? 'Femenino' : null],
                  ['Teléfono', pacienteFull.telefono],
                  ['Email', pacienteFull.email],
                  ['Ocupación', paciente.ocupacion],
                ]],
                ['Datos clínicos', [
                  ['Plan IMC', planLabels[paciente.plan]],
                  ['Grupo', grupoLabels[paciente.grupo]],
                  ['Protocolo nutricional', protoActual ? protoActual.nombre : null],
                  ['Fecha procedimiento', pacienteFull.fecha_procedimiento ? fmtDate(pacienteFull.fecha_procedimiento) : null],
                  ['Diagnóstico principal', paciente.diagnostico_principal],
                  ['Cirugía', paciente.cirugia],
                  ['Fecha cirugía', paciente.fecha_cirugia ? fmtDate(paciente.fecha_cirugia) : null],
                  ['Médico tratante', paciente.medico_tratante],
                ]],
                ['Antecedentes', [
                  ['Antecedentes personales', paciente.antecedentes_personales],
                  ['Antecedentes familiares', paciente.antecedentes_familiares],
                  ['Alergias', paciente.alergias],
                  ['Medicamentos actuales', paciente.medicamentos_actuales],
                ]],
              ].map(([titulo, filas], si) => (
                <div key={titulo} style={{ marginTop: si ? 22 : 0 }}>
                  <p style={{ ...eyebrow, paddingBottom: 8, marginBottom: 14, borderBottom: '1px solid var(--line-soft)' }}>{titulo}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px 28px' }}>
                    {filas.map(([k, v]) => (
                      <div key={k}>
                        <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '0 0 3px' }}>{k}</p>
                        <p style={{ fontSize: 13.5, color: v ? 'var(--ink)' : 'var(--ink-3)', margin: 0, lineHeight: 1.45 }}>
                          {v || 'Sin registrar'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen de sesiones */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
              {[
                { label: 'Valoraciones', count: valoraciones.length, last: valoraciones[0]?.fecha, color: AZUL, icon: 'activity' },
                { label: 'Consultas médicas', count: consultasMed.length, last: consultasMed[0]?.fecha, color: PIZARRA, icon: 'stethoscope' },
                { label: 'Consultas nutrición', count: consultasNut.length, last: consultasNut[0]?.fecha, color: VERDE, icon: 'utensils' },
              ].map(m => (
                <div key={m.label} style={{ ...CARD, padding: '15px 17px', display: 'flex', alignItems: 'center', gap: 13 }}>
                  <span style={{ display: 'inline-flex', width: 36, height: 36, borderRadius: 11, background: m.color + '14', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={m.icon} size={17} color={m.color} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13.5, margin: 0 }}>{m.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '3px 0 0' }}>
                      {m.count} sesión{m.count !== 1 ? 'es' : ''}{m.last ? ` · ${fmtDate(m.last)}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {tab === 'historial' && (
          <HistorialUnificado
            valoraciones={valoraciones}
            consultasMed={consultasMed}
            consultasNut={consultasNut}
            planes={planes}
            sesionesCosm={sesionesCosm}
          />
        )}

        {/* PARÁMETROS */}
        {tab === 'parametros' && (
          <Parametros valoraciones={valoraciones} consultasMed={consultasMed} paciente={paciente} />
        )}

        {/* FISIOTERAPIA */}
        {tab === 'fisioterapia' && (
          <TabFisioterapia paciente={paciente} valoraciones={valoraciones} planes={planes} onActualizar={fetchTodo} usuario={usuario} />
        )}

        {/* MÉDICO — siempre montado para conservar el borrador al navegar entre pestañas */}
        {tabs.some(t => t.key === 'medico') && (
          <div style={{ display: tab === 'medico' ? 'block' : 'none' }}>
            <ConsultaMedica
              paciente={paciente}
              consultas={consultasMed}
              onActualizar={fetchTodo}
              usuario={usuario}
            />
          </div>
        )}

        {/* NUTRICIÓN */}
        {tab === 'nutricion' && (
          <TabNutricion paciente={pacienteFull} consultas={consultasNut} onActualizar={fetchTodo} usuario={usuario} />
        )}

        {/* EVOLUCIÓN ANTROPOMÉTRICA */}
        {tab === 'evolucion' && (
          <EvolucionAntropometrica paciente={pacienteFull} />
        )}

        {/* EJERCICIO */}
        {tab === 'ejercicio' && (
          <PlanEjercicio
            paciente={paciente}
            planes={planes}
            valoraciones={valoraciones}
            onActualizar={fetchTodo}
            usuario={usuario}
          />
        )}

        {/* COSMETOLOGÍA */}
        {tab === 'cosmetologia' && (
          <TabCosmetologia paciente={paciente} usuario={usuario} />
        )}

        {/* ARCHIVOS */}
        {tab === 'archivos' && (
          <BancoArchivos
            paciente={paciente}
            usuario={usuario}
          />
        )}
      </div>

      {/* Modal Editar Paciente */}
      {modalEditarPaciente && (
        <ModalEditarPaciente
          paciente={pacienteFull}
          protocolos={protocolos}
          usuario={usuario}
          onClose={() => setModalEditarPaciente(false)}
          onGuardado={() => { setModalEditarPaciente(false); fetchTodo(); }}
        />
      )}
    </div>
  );
}

// ── TAB FISIOTERAPIA ──────────────────────────────────────────────────────────
function TabFisioterapia({ paciente, valoraciones, planes, onActualizar, usuario }) {
  const [modalNueva, setModalNueva] = useState(false);
  const [valoracionEditar, setValoracionEditar] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, color = VERDE) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0 }}>
          {valoraciones.length} valoración{valoraciones.length !== 1 ? 'es' : ''} registrada{valoraciones.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setModalNueva(true)} style={btnPrimario()}>
          <Icon name="plus" size={16} color="#fff" /> Nueva valoración
        </button>
      </div>

      {valoraciones.length === 0 ? (
        <Vacio icon="activity" titulo="Sin valoraciones" texto="Registra la primera valoración fisioterapéutica de este paciente." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {valoraciones.map(v => <ValoracionCard key={v.id} v={v} paciente={paciente} onEditar={() => setValoracionEditar(v)} />)}
        </div>
      )}

      {/* IA Sugerencias */}
      {valoraciones.length > 0 && (
        <SugerenciasIA
          paciente={paciente}
          valoracion={valoraciones[0]}
          planes={planes || []}
          usuario={usuario}
          onPlanCreado={onActualizar}
        />
      )}

      {modalNueva && (
        <ModalValoracion
          paciente={paciente}
          usuario={usuario}
          onClose={() => setModalNueva(false)}
          onGuardado={() => { onActualizar(); setModalNueva(false); showToast('Valoración guardada'); }}
        />
      )}

      {valoracionEditar && (
        <ModalEditarValoracion
          paciente={paciente}
          valoracion={valoracionEditar}
          usuario={usuario}
          onClose={() => setValoracionEditar(null)}
          onGuardado={() => { onActualizar(); setValoracionEditar(null); showToast('Valoración actualizada'); }}
        />
      )}

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function ValoracionCard({ v, paciente, onEditar }) {
  const [open, setOpen] = useState(false);
  const apt = APTITUD[v.aptitud] || APTITUD.apto;

  return (
    <div style={{ ...CARD, overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '14px 17px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{fmtDate(v.fecha)}</p>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '3px 0 0' }}>
            {v.terapeuta_nombre || '—'} · Peso {v.peso || '—'} kg · VO₂ máx {v.vo2max || '—'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 8, background: apt.color + '14', color: apt.color, fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
            <Icon name={apt.icon} size={13} /> {apt.label}
          </span>
          <button onClick={e => { e.stopPropagation(); onEditar && onEditar(); }} style={btnMini()}>
            <Icon name="edit" size={13} color="var(--ink-3)" /> Editar
          </button>
          <button onClick={e => { e.stopPropagation(); imprimirValoracion(paciente, v); }} style={btnMini()}>
            <Icon name="printer" size={13} color="var(--ink-3)" /> Imprimir
          </button>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={17} color="var(--ink-3)" />
        </div>
      </div>

      {open && (
        <div style={{ padding: '16px 17px 18px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
            {[
              ['Peso', v.peso, 'kg'], ['% Grasa', v.pct_grasa, '%'], ['Músculo', v.masa_muscular, 'kg'],
              ['IMC', v.bmi, ''], ['VO₂ máx', v.vo2max, 'ml/kg/min'], ['FC reposo', v.fc_reposo, 'lpm'],
              ['SpO₂', v.spo2, '%'], ['Cintura', v.cintura, 'cm'], ['Sit & Stand', v.sit_stand, 'rep'],
              ['Dinamometría D', v.dina_d, 'kg'],
            ].filter(([, val]) => val).map(([l, val, u]) => (
              <div key={l} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 12px' }}>
                <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '0 0 5px' }}>{l}</p>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {val}{u && <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 3 }}>{u}</span>}
                </p>
              </div>
            ))}
          </div>

          {v.zona2_lo && v.zona2_hi && (
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--accent-wash)', border: '1px solid #DCEAF6', borderRadius: 12, padding: '11px 15px' }}>
              <Icon name="activity" size={17} color="var(--accent-deep)" />
              <div>
                <p style={{ fontSize: 11, color: 'var(--accent-deep)', margin: '0 0 2px' }}>Zona 2 objetivo</p>
                <p style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--accent-deep)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {v.zona2_lo} – {v.zona2_hi} <span style={{ fontSize: 11, fontWeight: 400 }}>lpm</span>
                </p>
              </div>
            </div>
          )}

          {v.diagnostico && (
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 14, lineHeight: 1.55 }}>
              <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>Diagnóstico:</strong> {v.diagnostico}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── MODAL VALORACIÓN ──────────────────────────────────────────────────────────
function ModalValoracion({ paciente, usuario, onClose, onGuardado }) {
  const age = calcAge(paciente.fecha_nacimiento);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    terapeuta_nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : '',
    fc_reposo: '', pa_sistolica: '', pa_diastolica: '', spo2: '', fr: '',
    peso: '', talla: '', pct_grasa: '', masa_muscular: '', masa_grasa: '', agua_corporal: '',
    cintura: '', cadera: '', inbody_score_muscular: '', inbody_score_grasa: '',
    dina_d: '', dina_i: '', orm_superior: '', orm_inferior: '',
    sit_stand: '', borg: '', fc_pre: '', fc_post: '', spo2_pre: '', spo2_post: '',
    vo2max: '', vo2max_clasificacion: '',
    zona1_lo: '', zona1_hi: '', zona2_lo: '', zona2_hi: '', zona3_lo: '', zona3_hi: '',
    diagnostico: '', fortalezas: '', limitantes: '', aptitud: 'apto', notas: ''
  });
  const [guardando, setGuardando] = useState(false);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const bmi = form.peso && form.talla ? (parseFloat(form.peso) / ((parseFloat(form.talla) / 100) ** 2)).toFixed(1) : '';
  const fcmax = age > 0 ? 220 - age : '';
  const reserve = fcmax && form.fc_reposo ? fcmax - parseInt(form.fc_reposo) : '';
  const autoZona = (pctLow, pctHigh) => reserve && form.fc_reposo ? { lo: Math.round(reserve * pctLow / 100 + parseFloat(form.fc_reposo)), hi: Math.round(reserve * pctHigh / 100 + parseFloat(form.fc_reposo)) } : { lo: '', hi: '' };
  const z1 = autoZona(35, 47); const z2 = autoZona(48, 67); const z3 = autoZona(68, 74);

  const guardar = async () => {
    setGuardando(true);
    // Excluir nuevo_estado — es solo para actualizar pacientes, no va en valoraciones
    const { nuevo_estado, ...formData } = form;
    const data = {
      ...formData, paciente_id: paciente.id, terapeuta_id: usuario?.id,
      bmi: bmi || null, fc_max: fcmax || null, fc_reserva: reserve || null,
      zona1_lo: form.zona1_lo || z1.lo || null, zona1_hi: form.zona1_hi || z1.hi || null,
      zona2_lo: form.zona2_lo || z2.lo || null, zona2_hi: form.zona2_hi || z2.hi || null,
      zona3_lo: form.zona3_lo || z3.lo || null, zona3_hi: form.zona3_hi || z3.hi || null,
    };
    // Convert empty strings to null
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    const { error } = await supabase.from('valoraciones').insert([data]);
    if (!error) {
      // Update patient estado if changed
      if (form.nuevo_estado) {
        await supabase.from('pacientes').update({ grupo: form.nuevo_estado }).eq('id', paciente.id);
      }
      await supabase.from('citas').update({ estado: 'atendida' }).eq('paciente_id', paciente.id).eq('fecha', new Date().toISOString().split('T')[0]).in('estado', ['pendiente', 'preatendido', 'confirmada']);
      onGuardado();
    }
    setGuardando(false);
  };

  return (
    <div style={modalBg()}>
      <div style={modalCard(760)}>
        <div style={modalHeader()}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>Nueva valoración</p>
            <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, margin: '3px 0 0' }}>{paciente.nombre} {paciente.apellido || ''}</p>
          </div>
          <BotonCerrar onClose={onClose} />
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          <FieldRow>
            <Field label="Fecha" value={form.fecha} onChange={set('fecha')} type="date" half />
            <Field label="Terapeuta" value={form.terapeuta_nombre} onChange={set('terapeuta_nombre')} half />
          </FieldRow>

          <SectionTitle>Signos vitales en reposo</SectionTitle>
          <FieldRow>
            <Field label="FC reposo (lpm)" value={form.fc_reposo} onChange={set('fc_reposo')} type="number" half hint="Normal: 60–100" />
            <Field label="SpO₂ (%)" value={form.spo2} onChange={set('spo2')} type="number" half hint="Normal: ≥ 95 %" />
            <Field label="PA sistólica (mmHg)" value={form.pa_sistolica} onChange={set('pa_sistolica')} type="number" half hint="Normal: menor a 120" />
            <Field label="PA diastólica (mmHg)" value={form.pa_diastolica} onChange={set('pa_diastolica')} type="number" half hint="Normal: menor a 80" />
          </FieldRow>

          <SectionTitle>Composición corporal — InBody 270S</SectionTitle>
          <FieldRow>
            <Field label="Peso (kg)" value={form.peso} onChange={set('peso')} type="number" half />
            <Field label="Talla (cm)" value={form.talla} onChange={set('talla')} type="number" half />
            <Field label="IMC (automático)" value={bmi} readOnly half hint={bmi ? `Calculado: ${bmi}` : 'Ingresa peso y talla'} />
            <Field label="% Grasa corporal" value={form.pct_grasa} onChange={set('pct_grasa')} type="number" half hint="H: 10–20 % · M: 18–28 %" />
            <Field label="Masa muscular (kg)" value={form.masa_muscular} onChange={set('masa_muscular')} type="number" half />
            <Field label="Masa grasa (kg)" value={form.masa_grasa} onChange={set('masa_grasa')} type="number" half />
            <Field label="Cintura (cm)" value={form.cintura} onChange={set('cintura')} type="number" half hint="Riesgo H mayor a 94 · M mayor a 80" />
            <Field label="Cadera (cm)" value={form.cadera} onChange={set('cadera')} type="number" half />
          </FieldRow>

          <SectionTitle>Dinamometría y fuerza</SectionTitle>
          <FieldRow>
            <Field label="Dinamometría derecha (kg)" value={form.dina_d} onChange={set('dina_d')} type="number" half hint="H: 35–55 · M: 20–35" />
            <Field label="Dinamometría izquierda (kg)" value={form.dina_i} onChange={set('dina_i')} type="number" half />
            <Field label="1RM tren superior (kg)" value={form.orm_superior} onChange={set('orm_superior')} type="number" half />
            <Field label="1RM tren inferior (kg)" value={form.orm_inferior} onChange={set('orm_inferior')} type="number" half />
          </FieldRow>

          <SectionTitle>Test Sit to Stand (1 minuto)</SectionTitle>
          <FieldRow>
            <Field label="Repeticiones" value={form.sit_stand} onChange={set('sit_stand')} type="number" half hint="≥ 20 normal · menos de 14 bajo" />
            <Field label="Borg post-test (0–10)" value={form.borg} onChange={set('borg')} type="number" half />
            <Field label="FC pre-test (lpm)" value={form.fc_pre} onChange={set('fc_pre')} type="number" half />
            <Field label="FC post-test (lpm)" value={form.fc_post} onChange={set('fc_post')} type="number" half />
            <Field label="SpO₂ pre (%)" value={form.spo2_pre} onChange={set('spo2_pre')} type="number" half />
            <Field label="SpO₂ post (%)" value={form.spo2_post} onChange={set('spo2_post')} type="number" half hint="No debe bajar más de 4 %" />
          </FieldRow>

          <SectionTitle>VO₂ máx y zonas cardiacas</SectionTitle>
          {form.fc_reposo && (
            <div style={{ background: 'var(--accent-wash)', border: '1px solid #DCEAF6', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
              {[
                ['FC máx teórica', `${fcmax} lpm`],
                ['FC de reserva', `${reserve || '—'} lpm`],
                ['Zona 2 automática', `${z2.lo || '—'} – ${z2.hi || '—'} lpm`],
              ].map(([l, v]) => (
                <div key={l}>
                  <p style={{ fontSize: 11, color: 'var(--accent-deep)', margin: '0 0 4px' }}>{l}</p>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-deep)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{v}</p>
                </div>
              ))}
            </div>
          )}
          <FieldRow>
            <Field label="VO₂ máx (ml/kg/min)" value={form.vo2max} onChange={set('vo2max')} type="number" half />
            <Field label="Clasificación VO₂ máx" value={form.vo2max_clasificacion} onChange={set('vo2max_clasificacion')} opts={[{ v: '', l: '—' }, { v: 'muy_pobre', l: 'Muy pobre' }, { v: 'pobre', l: 'Pobre' }, { v: 'regular', l: 'Regular' }, { v: 'bueno', l: 'Bueno' }, { v: 'excelente', l: 'Excelente' }]} half />
            <Field label="Zona 1 — desde (lpm)" value={form.zona1_lo || String(z1.lo || '')} onChange={set('zona1_lo')} type="number" half />
            <Field label="Zona 1 — hasta (lpm)" value={form.zona1_hi || String(z1.hi || '')} onChange={set('zona1_hi')} type="number" half />
            <Field label="Zona 2 — desde (lpm)" value={form.zona2_lo || String(z2.lo || '')} onChange={set('zona2_lo')} type="number" half />
            <Field label="Zona 2 — hasta (lpm)" value={form.zona2_hi || String(z2.hi || '')} onChange={set('zona2_hi')} type="number" half />
            <Field label="Zona 3 — desde (lpm)" value={form.zona3_lo || String(z3.lo || '')} onChange={set('zona3_lo')} type="number" half />
            <Field label="Zona 3 — hasta (lpm)" value={form.zona3_hi || String(z3.hi || '')} onChange={set('zona3_hi')} type="number" half />
          </FieldRow>

          <SectionTitle>Diagnóstico y aptitud</SectionTitle>
          <TextArea label="Diagnóstico fisioterapéutico" value={form.diagnostico} onChange={set('diagnostico')} rows={3} />
          <TextArea label="Fortalezas del paciente" value={form.fortalezas} onChange={set('fortalezas')} />
          <TextArea label="Limitantes y factores de riesgo" value={form.limitantes} onChange={set('limitantes')} />

          <Field label="Aptitud" value={form.aptitud} onChange={set('aptitud')}
            opts={[
              { v: 'apto', l: 'Apto — sin restricciones' },
              { v: 'apto_rest', l: 'Apto con restricciones' },
              { v: 'no_apto', l: 'No apto — requiere evaluación médica' },
            ]} />

          <Field label="Actualizar estado del paciente" value={form.nuevo_estado || ''} onChange={set('nuevo_estado')}
            opts={[
              { v: '', l: '— Sin cambios —' },
              { v: 'transformacion', l: 'Transformación corporal' },
              { v: 'prequirurgico', l: 'Pre-quirúrgico' },
              { v: 'postquirurgico', l: 'Post-quirúrgico' },
            ]} />

          <TextArea label="Notas adicionales" value={form.notas} onChange={set('notas')} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={onClose} style={btnFantasma()}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={btnPrimario({ opacity: guardando ? .6 : 1 })}>
              {guardando ? 'Guardando…' : <><Icon name="save" size={16} color="#fff" /> Guardar valoración</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB MÉDICO ────────────────────────────────────────────────────────────────
function TabMedico({ paciente, consultas, onActualizar, usuario }) {
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, color = VERDE) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0 }}>
          {consultas.length} consulta{consultas.length !== 1 ? 's' : ''} registrada{consultas.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setModal(true)} style={btnPrimario()}>
          <Icon name="plus" size={16} color="#fff" /> Nueva consulta
        </button>
      </div>

      {consultas.length === 0
        ? <Vacio icon="stethoscope" titulo="Sin consultas médicas" texto="Registra la primera consulta de este paciente." />
        : (
          <div style={{ display: 'grid', gap: 10 }}>
            {consultas.map(c => (
              <div key={c.id} style={{ ...CARD, padding: '16px 17px' }}>
                <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{fmtDate(c.fecha)}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '3px 0 12px' }}>{c.medico_nombre || '—'}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
                  {[
                    ['Peso', c.peso, 'kg'], ['Glucosa', c.glucosa, 'mg/dL'], ['HbA1c', c.hba1c, '%'],
                    ['Presión', c.pa_sistolica && c.pa_diastolica ? `${c.pa_sistolica}/${c.pa_diastolica}` : null, 'mmHg'],
                  ].filter(([, v]) => v).map(([l, v, u]) => (
                    <div key={l} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 11px' }}>
                      <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '0 0 4px' }}>{l}</p>
                      <p style={{ fontSize: 15, fontWeight: 600, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {v}{u && <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 3 }}>{u}</span>}
                      </p>
                    </div>
                  ))}
                </div>
                {c.diagnostico && (
                  <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12, lineHeight: 1.55 }}>
                    <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>Diagnóstico:</strong> {c.diagnostico}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

      {modal && <ModalMedico paciente={paciente} usuario={usuario} onClose={() => setModal(false)} onGuardado={() => { onActualizar(); setModal(false); showToast('Consulta médica guardada'); }} />}
      {toast && <Toast toast={toast} />}
    </div>
  );
}

function ModalMedico({ paciente, usuario, onClose, onGuardado }) {
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], medico_nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : '', peso: '', bmi: '', cintura: '', pa_sistolica: '', pa_diastolica: '', fc: '', glucosa: '', hba1c: '', colesterol_total: '', colesterol_ldl: '', colesterol_hdl: '', trigliceridos: '', insulina: '', tsh: '', glp1: '', metformina: '', otros_medicamentos: '', diagnostico: '', plan_tratamiento: '', proxima_visita: '', notas: '' });
  const [guardando, setGuardando] = useState(false);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));
  const guardar = async () => {
    setGuardando(true);
    const data = { ...form, paciente_id: paciente.id, medico_id: usuario?.id };
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    const { error } = await supabase.from('consultas_medicas').insert([data]);
    if (!error) {
      await supabase.from('citas').update({ estado: 'atendida' }).eq('paciente_id', paciente.id).eq('fecha', new Date().toISOString().split('T')[0]).in('estado', ['pendiente', 'preatendido', 'confirmada']);
      onGuardado();
    }
    setGuardando(false);
  };

  return (
    <div style={modalBg()}>
      <div style={modalCard(720)}>
        <div style={modalHeader()}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>Consulta médica</p>
            <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, margin: '3px 0 0' }}>{paciente.nombre} {paciente.apellido || ''}</p>
          </div>
          <BotonCerrar onClose={onClose} />
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          <FieldRow>
            <Field label="Fecha" value={form.fecha} onChange={set('fecha')} type="date" half />
            <Field label="Médico" value={form.medico_nombre} onChange={set('medico_nombre')} half />
          </FieldRow>

          <SectionTitle>Medidas</SectionTitle>
          <FieldRow>
            <Field label="Peso (kg)" value={form.peso} onChange={set('peso')} type="number" half />
            <Field label="IMC" value={form.bmi} onChange={set('bmi')} type="number" half />
            <Field label="Cintura (cm)" value={form.cintura} onChange={set('cintura')} type="number" half />
            <Field label="PA sistólica" value={form.pa_sistolica} onChange={set('pa_sistolica')} type="number" half hint="Normal: menor a 120" />
            <Field label="PA diastólica" value={form.pa_diastolica} onChange={set('pa_diastolica')} type="number" half hint="Normal: menor a 80" />
            <Field label="FC (lpm)" value={form.fc} onChange={set('fc')} type="number" half />
          </FieldRow>

          <SectionTitle>Laboratorios</SectionTitle>
          <FieldRow>
            <Field label="Glucosa (mg/dL)" value={form.glucosa} onChange={set('glucosa')} type="number" half hint="Normal: 70–100" />
            <Field label="HbA1c (%)" value={form.hba1c} onChange={set('hba1c')} type="number" half hint="Normal: menor a 5.7 %" />
            <Field label="Colesterol total" value={form.colesterol_total} onChange={set('colesterol_total')} type="number" half hint="Normal: menor a 200" />
            <Field label="LDL" value={form.colesterol_ldl} onChange={set('colesterol_ldl')} type="number" half hint="Normal: menor a 100" />
            <Field label="HDL" value={form.colesterol_hdl} onChange={set('colesterol_hdl')} type="number" half hint="H mayor a 40 · M mayor a 50" />
            <Field label="Triglicéridos" value={form.trigliceridos} onChange={set('trigliceridos')} type="number" half hint="Normal: menor a 150" />
            <Field label="Insulina (µU/mL)" value={form.insulina} onChange={set('insulina')} type="number" half />
            <Field label="TSH (mU/L)" value={form.tsh} onChange={set('tsh')} type="number" half />
          </FieldRow>

          <SectionTitle>Medicamentos</SectionTitle>
          <FieldRow>
            <Field label="GLP-1 (nombre y dosis)" value={form.glp1} onChange={set('glp1')} half />
            <Field label="Metformina (dosis)" value={form.metformina} onChange={set('metformina')} half />
          </FieldRow>
          <TextArea label="Otros medicamentos" value={form.otros_medicamentos} onChange={set('otros_medicamentos')} />

          <SectionTitle>Diagnóstico y plan</SectionTitle>
          <TextArea label="Diagnóstico médico" value={form.diagnostico} onChange={set('diagnostico')} />
          <TextArea label="Plan de tratamiento" value={form.plan_tratamiento} onChange={set('plan_tratamiento')} />
          <FieldRow>
            <Field label="Próxima visita" value={form.proxima_visita} onChange={set('proxima_visita')} type="date" half />
          </FieldRow>
          <TextArea label="Notas" value={form.notas} onChange={set('notas')} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={onClose} style={btnFantasma()}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={btnPrimario({ opacity: guardando ? .6 : 1 })}>
              {guardando ? 'Guardando…' : <><Icon name="save" size={16} color="#fff" /> Guardar consulta</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB NUTRICIÓN ─────────────────────────────────────────────────────────────
function TabNutricion({ paciente, consultas, onActualizar, usuario }) {
  return <TabNutricionV2 paciente={paciente} usuario={usuario} />;
}

// ─── IMPRIMIR VALORACIÓN ─────────────────────────────────────────────────────
function imprimirValoracion(paciente, v) {
  const html = generarInforme(paciente, v);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ─── MODAL EDITAR VALORACIÓN ─────────────────────────────────────────────────
function ModalEditarValoracion({ paciente, valoracion, usuario, onClose, onGuardado }) {
  const v = valoracion;
  const fields = [
    ['fc_reposo','FC reposo (lpm)','number'],['pa_sistolica','PA sistólica','number'],['pa_diastolica','PA diastólica','number'],
    ['spo2','SpO₂ (%)','number'],['fr','FR (rpm)','number'],
    ['peso','Peso (kg)','number'],['talla','Talla (cm)','number'],
    ['pct_grasa','% Grasa corporal','number'],['masa_muscular','Masa muscular (kg)','number'],
    ['masa_grasa','Masa grasa (kg)','number'],['agua_corporal','Agua corporal (L)','number'],
    ['cintura','Cintura (cm)','number'],['cadera','Cadera (cm)','number'],
    ['sit_stand','Sit & Stand (rep)','number'],['borg','Borg','number'],
    ['dina_d','Dinamometría D (kg)','number'],['dina_i','Dinamometría I (kg)','number'],
    ['vo2max','VO₂ máx (ml/kg/min)','number'],
  ];

  const [form, setForm] = useState(() => {
    const f = {};
    fields.forEach(([k]) => { f[k] = v[k] || ''; });
    f.diagnostico = v.diagnostico || '';
    f.limitantes = v.limitantes || '';
    f.fortalezas = v.fortalezas || '';
    f.notas = v.notas || '';
    f.aptitud = v.aptitud || 'apto';
    return f;
  });

  const [guardando, setGuardando] = useState(false);
  const set = k => val => setForm(p => ({...p, [k]: val}));

  const guardar = async () => {
    setGuardando(true);
    const data = {};
    Object.keys(form).forEach(k => {
      const val = form[k];
      data[k] = val === '' ? null : (typeof val === 'string' && !isNaN(val) && val !== '' && fields.find(f => f[0] === k) ? parseFloat(val) : val);
    });

    // Recalculate BMI if peso/talla changed
    if (data.peso && data.talla) {
      data.bmi = parseFloat((data.peso / ((data.talla/100)**2)).toFixed(1));
    }

    const { error } = await supabase.from('valoraciones').update(data).eq('id', v.id);
    if (!error) onGuardado();
    setGuardando(false);
  };

  return (
    <div style={modalBg({ alignItems: 'stretch', padding: 0, backdropFilter: 'none', background: 'rgba(11,31,59,.85)' })}>
      <div style={{ background: 'var(--canvas)', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={modalHeader({ position: 'static' })}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>Editar valoración fisioterapéutica</p>
            <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, margin: '3px 0 0' }}>
              {paciente.nombre} {paciente.apellido || ''} · {fmtDate(v.fecha)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            <button onClick={guardar} disabled={guardando} style={btnPlano(VERDE, { opacity: guardando ? .6 : 1 })}>
              {guardando ? 'Guardando…' : <><Icon name="save" size={16} color="#fff" /> Guardar cambios</>}
            </button>
            <BotonCerrar onClose={onClose} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 40px', maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ ...CARD, padding: '20px 22px', marginBottom: 14 }}>
            <p style={{ ...eyebrow, paddingBottom: 8, marginBottom: 16, borderBottom: '1px solid var(--line-soft)' }}>Medidas y signos vitales</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0 16px' }}>
              {fields.map(([k, label, type]) => (
                <Field key={k} label={label} value={form[k]} onChange={set(k)} type={type} />
              ))}
            </div>
          </div>

          <div style={{ ...CARD, padding: '20px 22px' }}>
            <p style={{ ...eyebrow, paddingBottom: 8, marginBottom: 16, borderBottom: '1px solid var(--line-soft)' }}>Diagnóstico y aptitud</p>

            <Field label="Aptitud" value={form.aptitud} onChange={set('aptitud')}
              opts={[
                { v: 'apto', l: 'Apto — sin restricciones' },
                { v: 'apto_rest', l: 'Apto con restricciones' },
                { v: 'no_apto', l: 'No apto' },
              ]} />

            {[
              ['diagnostico', 'Diagnóstico fisioterapéutico', 4],
              ['limitantes', 'Limitantes', 3],
              ['fortalezas', 'Fortalezas', 3],
              ['notas', 'Notas adicionales', 3],
            ].map(([k, label, rows]) => (
              <TextArea key={k} label={label} value={form[k]} onChange={set(k)} rows={rows} />
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button onClick={onClose} style={btnFantasma()}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={btnPrimario({ opacity: guardando ? .6 : 1 })}>
                {guardando ? 'Guardando…' : <><Icon name="save" size={16} color="#fff" /> Guardar cambios</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: Editar Paciente — datos personales, clínicos, programa
// ═══════════════════════════════════════════════════════════════════════════
function ModalEditarPaciente({ paciente, protocolos, usuario, onClose, onGuardado }) {
  const [seccion, setSeccion] = useState('personales');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    nombre: paciente.nombre || '',
    apellido: paciente.apellido || '',
    cedula: paciente.cedula || '',
    fecha_nacimiento: paciente.fecha_nacimiento || '',
    sexo: paciente.sexo || '',
    telefono: paciente.telefono || '',
    email: paciente.email || '',
    ocupacion: paciente.ocupacion || '',
    plan: paciente.plan || '',
    grupo: paciente.grupo || '',
    protocolo_nutricional: paciente.protocolo_nutricional || 'conservador',
    fecha_procedimiento: paciente.fecha_procedimiento || '',
    diagnostico_principal: paciente.diagnostico_principal || '',
    cirugia: paciente.cirugia || '',
    fecha_cirugia: paciente.fecha_cirugia || '',
    medico_tratante: paciente.medico_tratante || '',
    antecedentes_personales: paciente.antecedentes_personales || '',
    antecedentes_familiares: paciente.antecedentes_familiares || '',
    alergias: paciente.alergias || '',
    medicamentos_actuales: paciente.medicamentos_actuales || '',
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const payload = { ...form };
      // Convertir cadenas vacías a null en fechas
      ['fecha_nacimiento', 'fecha_procedimiento', 'fecha_cirugia'].forEach(f => {
        if (!payload[f]) payload[f] = null;
      });
      const { error: err } = await supabase
        .from('pacientes')
        .update(payload)
        .eq('id', paciente.id);
      if (err) throw err;
      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const secciones = [
    { k: 'personales', l: 'Datos personales', icon: 'user' },
    { k: 'clinicos', l: 'Datos clínicos', icon: 'stethoscope' },
    { k: 'antecedentes', l: 'Antecedentes', icon: 'clipboard-list' },
  ];

  return (
    <div style={modalBg()}>
      <div style={modalCard(780, { overflow: 'hidden', display: 'flex', flexDirection: 'column' })}>
        {/* Header */}
        <div style={modalHeader({ position: 'static', flexShrink: 0 })}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>Editar paciente</p>
            <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, margin: '3px 0 0' }}>{paciente.nombre} {paciente.apellido || ''}</p>
          </div>
          <BotonCerrar onClose={onClose} />
        </div>

        {/* Tabs */}
        <div style={{ background: 'var(--surface-2)', padding: '0 16px', display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', overflowX: 'auto', flexShrink: 0 }}>
          {secciones.map(t => {
            const on = seccion === t.k;
            return (
              <button key={t.k} onClick={() => setSeccion(t.k)}
                style={{ padding: '12px 13px', fontSize: 12.5, fontWeight: on ? 600 : 500, whiteSpace: 'nowrap', cursor: 'pointer', background: 'none', color: on ? 'var(--ink)' : 'var(--ink-3)', border: 'none', borderBottom: '2px solid ' + (on ? 'var(--accent)' : 'transparent'), marginBottom: -1, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Icon name={t.icon} size={14} strokeWidth={on ? 2 : 1.7} color={on ? 'var(--accent)' : 'var(--ink-3)'} />
                {t.l}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: '#FFF0F0', border: '1px solid #FBD5D5', color: ROJO, padding: '11px 13px', borderRadius: 10, marginBottom: 16, fontSize: 12.5, lineHeight: 1.5 }}>
              <Icon name="alert-circle" size={15} color={ROJO} style={{ marginTop: 1 }} />
              {error}
            </div>
          )}

          {seccion === 'personales' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0 16px' }}>
              <EditField label="Nombre" valor={form.nombre} onChange={v => set('nombre', v)} />
              <EditField label="Apellido" valor={form.apellido} onChange={v => set('apellido', v)} />
              <EditField label="Cédula" valor={form.cedula} onChange={v => set('cedula', v)} />
              <EditField label="Fecha de nacimiento" tipo="date" valor={form.fecha_nacimiento} onChange={v => set('fecha_nacimiento', v)} />
              <EditSelect label="Sexo" valor={form.sexo} onChange={v => set('sexo', v)} opciones={[
                { val: '', txt: '— Seleccionar —' },
                { val: 'M', txt: 'Masculino' },
                { val: 'F', txt: 'Femenino' },
              ]} />
              <EditField label="Teléfono" valor={form.telefono} onChange={v => set('telefono', v)} />
              <EditField label="Email" tipo="email" valor={form.email} onChange={v => set('email', v)} />
              <EditField label="Ocupación" valor={form.ocupacion} onChange={v => set('ocupacion', v)} />
            </div>
          )}

          {seccion === 'clinicos' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0 16px' }}>
              <EditSelect label="Plan IMC" valor={form.plan} onChange={v => set('plan', v)} opciones={[
                { val: '', txt: '— Seleccionar —' },
                { val: 'starter', txt: 'Starter $80' },
                { val: 'standard', txt: 'Standard $250/mes' },
                { val: 'imc360', txt: 'IMC 360 $400/mes' },
              ]} />
              <EditSelect label="Grupo" valor={form.grupo} onChange={v => set('grupo', v)} opciones={[
                { val: '', txt: '— Seleccionar —' },
                { val: 'transformacion', txt: 'Transformación' },
                { val: 'prequirurgico', txt: 'Pre-quirúrgico' },
                { val: 'postquirurgico', txt: 'Post-quirúrgico' },
              ]} />
              <div style={{ gridColumn: '1 / -1' }}>
                <EditSelect
                  label="Protocolo nutricional"
                  valor={form.protocolo_nutricional}
                  onChange={v => set('protocolo_nutricional', v)}
                  opciones={protocolos.map(p => ({ val: p.codigo, txt: p.nombre }))}
                />
              </div>
              <EditField label="Fecha del procedimiento (manga, balón, etc.)" tipo="date" valor={form.fecha_procedimiento} onChange={v => set('fecha_procedimiento', v)} />
              <EditField label="Fecha cirugía (legado)" tipo="date" valor={form.fecha_cirugia} onChange={v => set('fecha_cirugia', v)} />
              <div style={{ gridColumn: '1 / -1' }}>
                <EditField label="Diagnóstico principal" valor={form.diagnostico_principal} onChange={v => set('diagnostico_principal', v)} />
              </div>
              <EditField label="Cirugía" valor={form.cirugia} onChange={v => set('cirugia', v)} />
              <EditField label="Médico tratante" valor={form.medico_tratante} onChange={v => set('medico_tratante', v)} />
            </div>
          )}

          {seccion === 'antecedentes' && (
            <div>
              <EditArea label="Antecedentes personales" valor={form.antecedentes_personales} onChange={v => set('antecedentes_personales', v)} />
              <EditArea label="Antecedentes familiares" valor={form.antecedentes_familiares} onChange={v => set('antecedentes_familiares', v)} />
              <EditArea label="Alergias" valor={form.alergias} onChange={v => set('alergias', v)} />
              <EditArea label="Medicamentos actuales" valor={form.medicamentos_actuales} onChange={v => set('medicamentos_actuales', v)} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', background: 'var(--surface-2)', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={btnFantasma()}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={btnPrimario({ opacity: guardando ? .5 : 1, cursor: guardando ? 'not-allowed' : 'pointer' })}>
            {guardando ? 'Guardando…' : <><Icon name="save" size={16} color="#fff" /> Guardar cambios</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// Los tres usan los mismos tokens que FormFields.js, con etiqueta sobre el control.
const etiquetaEdit = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.06em', margin: '0 0 6px' };
const controlEdit = { width: '100%', height: 40, padding: '0 11px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13.5, color: 'var(--ink)', background: 'var(--surface)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color .14s ease, box-shadow .14s ease' };
const enfocar = e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(30,124,181,.12)'; };
const desenfocar = e => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; };

function EditField({ label, valor, onChange, tipo = 'text' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={etiquetaEdit}>{label}</label>
      <input type={tipo} value={valor || ''} onChange={e => onChange(e.target.value)}
        onFocus={enfocar} onBlur={desenfocar} style={controlEdit} />
    </div>
  );
}

function EditSelect({ label, valor, onChange, opciones }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={etiquetaEdit}>{label}</label>
      <select value={valor || ''} onChange={e => onChange(e.target.value)}
        onFocus={enfocar} onBlur={desenfocar} style={controlEdit}>
        {opciones.map(o => <option key={o.val} value={o.val}>{o.txt}</option>)}
      </select>
    </div>
  );
}

function EditArea({ label, valor, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={etiquetaEdit}>{label}</label>
      <textarea value={valor || ''} onChange={e => onChange(e.target.value)} rows={3}
        onFocus={enfocar} onBlur={desenfocar}
        style={{ ...controlEdit, height: 'auto', padding: '10px 11px', resize: 'vertical', minHeight: 72, lineHeight: 1.55 }} />
    </div>
  );
}
