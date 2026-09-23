// ════════════════════════════════════════════════════════════════════════
// TabNutricionV2.js — Módulo de Nutrición
//
// "Router" del módulo: detecta el protocolo del paciente y muestra la vista de
// fases (manga/balón), el editor SMAE, anamnesis, consultas y plantillas.
//
// Props: paciente {id, nombre, apellido, protocolo_nutricional, ...}, usuario.
//
// ── Capa visual v2 ("clínico premium", aprobada 04/08/2026) ────────────
// Lo que NO cambió: props, el enrutado por `vista`, cargarDatos, la carga de
// fase activa / plan SMAE / consultas, generarPDFPlan con sus tres queries en
// paralelo, y las seis subvistas (TimelineFases, EditorPlanSMAE, Anamnesis,
// ConsultaNutricionalV2, HistorialConsultas, PlanIntercambios).
//
// Cambia la presentación, que rompía con el navy del resto del sistema:
//   · el banner deja el gradiente de color (verde/naranja/morado según protocolo)
//     por navy con la trama hexagonal de marca; el protocolo queda como chip con
//     un punto de su color, no como fondo a sangre;
//   · las tarjetas de fase y plan pierden el borde izquierdo de 4px de color
//     (jerarquía por elevación, estado con punto + texto);
//   · las tarjetas de "Información clínica" pierden el borde superior de color
//     (el icono va en cuadro de color suave, que era el anti-patrón más visible);
//   · los cinco botones dejan de ser de colores distintos (morado / naranja /
//     azul / verde / pizarra) y quedan como acciones fantasma uniformes; sólo
//     "Editar plan" es primario navy.
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from './v2/Icon';
import TimelineFases from './TimelineFases';
import EditorPlanSMAE from './EditorPlanSMAE';
import AnamnesisNutricional from './AnamnesisNutricional';
import ConsultaNutricionalV2 from './ConsultaNutricionalV2';
import { generarPDFPlanSMAE } from './PDFNutricion';
import PlanIntercambios from './PlanIntercambios';

const ROJO = '#B02020';
const VERDE = '#1A7A4A';
const AZUL = '#1E7CB5';
const MORADO = '#7C3AED';
const NARANJA = '#C25A00';
const AMBAR = '#B87503';

// El color del protocolo se conserva sólo como acento puntual (un punto en el chip),
// nunca como fondo de banner ni como borde de tarjeta.
const PROTOCOLOS = {
  manga:       { nombre: 'Manga Gástrica',          color: AZUL,      tieneFases: true,  fasesDe: 'manga' },
  balon:       { nombre: 'Balón Gástrico',          color: MORADO,    tieneFases: true,  fasesDe: 'balon' },
  glp1:        { nombre: 'GLP-1 (Ozempic/Wegovy)',  color: NARANJA,   tieneFases: false, fasesDe: null    },
  conservador: { nombre: 'Conservador IMC',         color: VERDE,     tieneFases: false, fasesDe: null    },
  bypass:      { nombre: 'Bypass Gástrico',         color: '#B87503', tieneFases: true,  fasesDe: 'manga' },
  biparticion: { nombre: 'Bipartición de Tránsito', color: '#DC2626', tieneFases: true,  fasesDe: 'manga' },
};

const TRAMA_HEX = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0l30 17.32v34.64L30 69.28 0 51.96V17.32z' fill='none' stroke='%231E7CB5' stroke-width='1'/%3E%3C/svg%3E\")";

export default function TabNutricionV2({ paciente, usuario }) {
  const [vista, setVista] = useState('resumen');
  const [loading, setLoading] = useState(true);
  const [protocolo, setProtocolo] = useState(null);
  const [faseActual, setFaseActual] = useState(null);
  const [planSmae, setPlanSmae] = useState(null);
  const [historiaFases, setHistoriaFases] = useState([]);
  const [consultasCount, setConsultasCount] = useState(0);
  const [consultas, setConsultas] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (paciente?.id) cargarDatos();
  }, [paciente?.id]);

  const showToast = (msg, color = VERDE) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const cargarDatos = async () => {
    setLoading(true);
    const codigoProtocolo = paciente.protocolo_nutricional || 'conservador';
    setProtocolo(codigoProtocolo);

    if (PROTOCOLOS[codigoProtocolo]?.tieneFases) {
      const { data: fases } = await supabase
        .from('paciente_fases')
        .select('*, fases_nutricionales(nombre, descripcion_corta, numero_orden, duracion_dias_default)')
        .eq('paciente_id', paciente.id)
        .order('fecha_inicio', { ascending: false });

      setHistoriaFases(fases || []);
      const activa = (fases || []).find(f => f.estado === 'activa');
      setFaseActual(activa || null);
    }

    const { data: plan } = await supabase
      .from('planes_smae')
      .select('*')
      .eq('paciente_id', paciente.id)
      .eq('estado', 'activo')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    setPlanSmae(plan || null);

    const { data: cons } = await supabase
      .from('consultas_nutricion_v2')
      .select('*')
      .eq('paciente_id', paciente.id)
      .order('fecha', { ascending: false });
    setConsultas(cons || []);
    setConsultasCount((cons || []).length);

    setLoading(false);
  };

  const generarPDFPlan = async () => {
    if (!planSmae) return;
    try {
      const [porcionesRes, ejemplosRes, intercambiosRes] = await Promise.all([
        supabase.from('plan_smae_porciones').select('*').eq('plan_id', planSmae.id).order('orden'),
        supabase.from('plan_smae_ejemplos').select('*').eq('plan_id', planSmae.id).order('tiempo_codigo').order('numero_opcion'),
        supabase.from('smae_intercambios').select('*').eq('activo', true).order('categoria_codigo').order('orden'),
      ]);
      generarPDFPlanSMAE({
        plan: planSmae,
        paciente,
        porciones: porcionesRes.data || [],
        ejemplos: ejemplosRes.data || [],
        intercambios: intercambiosRes.data || [],
        usuario,
      });
    } catch (e) {
      showToast('Error generando PDF: ' + e.message, ROJO);
    }
  };

  // ── Subvistas ────────────────────────────────────────────────────────
  if (vista === 'timeline') {
    return (
      <TimelineFases
        paciente={paciente}
        protocolo={PROTOCOLOS[protocolo]?.fasesDe || protocolo}
        protocoloOriginal={protocolo}
        usuario={usuario}
        onVolver={() => { setVista('resumen'); cargarDatos(); }}
      />
    );
  }

  if (vista === 'editor_smae') {
    return (
      <EditorPlanSMAE
        paciente={paciente}
        protocolo={protocolo}
        usuario={usuario}
        planExistente={planSmae}
        onVolver={() => { setVista('resumen'); cargarDatos(); }}
        onGuardado={() => { setVista('resumen'); cargarDatos(); showToast('Plan SMAE guardado'); }}
      />
    );
  }

  if (vista === 'anamnesis') {
    return (
      <AnamnesisNutricional
        paciente={paciente}
        usuario={usuario}
        onVolver={() => { setVista('resumen'); cargarDatos(); }}
        onGuardado={() => { setVista('resumen'); cargarDatos(); showToast('Anamnesis guardada'); }}
      />
    );
  }

  if (vista === 'nueva_consulta') {
    return (
      <ConsultaNutricionalV2
        paciente={paciente}
        usuario={usuario}
        protocolo={protocolo}
        modo="nueva"
        onVolver={() => { setVista('resumen'); cargarDatos(); }}
        onGuardado={() => { setVista('resumen'); cargarDatos(); showToast('Consulta guardada'); }}
      />
    );
  }

  if (vista === 'historial_consultas') {
    return (
      <HistorialConsultasNutricion
        paciente={paciente}
        consultas={consultas}
        onVolver={() => setVista('resumen')}
        onVerConsulta={(c) => { /* TODO ver detalle */ }}
      />
    );
  }

  if (vista === 'intercambios') {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={() => { setVista('resumen'); cargarDatos(); }} style={btnGhost({ marginBottom: 16 })}>
          <Icon name="arrow-left" size={15} color="var(--ink-3)" /> Volver a nutrición
        </button>
        <PlanIntercambios paciente={paciente} usuario={usuario} />
      </div>
    );
  }

  // ── VISTA PRINCIPAL: Resumen ─────────────────────────────────────────
  const protocoloInfo = PROTOCOLOS[protocolo] || PROTOCOLOS.conservador;

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13.5 }}>Cargando información nutricional…</div>;
  }

  return (
    <div style={{ padding: 20, fontFamily: "'Poppins', system-ui, sans-serif", color: 'var(--ink)' }}>

      {/* Banner del módulo: navy con trama de marca, no gradiente de color */}
      <div style={{ background: 'var(--ink)', color: '#fff', padding: '20px 22px', borderRadius: 14, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, top: -40, width: 240, height: 240, opacity: 0.1, pointerEvents: 'none', backgroundImage: TRAMA_HEX, backgroundSize: '60px 52px' }} />
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: 10.5, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 600, margin: 0 }}>Módulo nutrición</p>
          <p style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.01em', margin: '5px 0 10px' }}>{paciente.nombre} {paciente.apellido || ''}</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 26, padding: '0 11px', borderRadius: 8, background: 'rgba(255,255,255,.1)', fontSize: 12, color: 'rgba(255,255,255,.9)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: protocoloInfo.color, boxShadow: '0 0 0 3px ' + protocoloInfo.color + '33' }} />
            {protocoloInfo.nombre}
            {paciente.fecha_procedimiento && <span style={{ opacity: 0.6 }}> · {formatDate(paciente.fecha_procedimiento)}</span>}
          </span>
        </div>
      </div>

      {/* Fases bariátricas (manga / balón / bypass / bipartición) */}
      {protocoloInfo.tieneFases && (
        <div style={cardStyle()}>
          <div style={cardHeader()}>
            <h3 style={cardTitle()}><Icon name="git-branch" size={16} color="var(--accent)" /> Fases bariátricas</h3>
            <button style={btnPrimary()} onClick={() => setVista('timeline')}>
              <Icon name={faseActual ? 'git-branch' : 'plus'} size={15} color="#fff" /> {faseActual ? 'Ver timeline' : 'Iniciar fases'}
            </button>
          </div>

          {!faseActual && historiaFases.length === 0 && (
            <EmptyBox icon="salad" titulo="Sin fases iniciadas aún" texto={`Asigna la primera fase del protocolo de ${protocoloInfo.nombre} al paciente.`} />
          )}

          {faseActual && (
            <ActivoBox
              eyebrow="Fase activa"
              titulo={faseActual.fases_nutricionales?.nombre || 'Fase'}
              sub={`Inicio ${formatDate(faseActual.fecha_inicio)} · día ${diasDesde(faseActual.fecha_inicio)} de la fase`}
              chip={historiaFases.length > 1 ? `${historiaFases.length} fases registradas` : null}
              color={protocoloInfo.color}
            />
          )}
        </div>
      )}

      {/* Plan SMAE (todos los protocolos) */}
      <div style={cardStyle()}>
        <div style={cardHeader()}>
          <h3 style={cardTitle()}><Icon name="utensils" size={16} color="var(--accent)" /> Plan SMAE {protocoloInfo.tieneFases && '(post-fases)'}</h3>
          <button style={btnPrimary()} onClick={() => setVista('editor_smae')}>
            <Icon name={planSmae ? 'pencil' : 'plus'} size={15} color="#fff" /> {planSmae ? 'Editar plan' : 'Crear plan SMAE'}
          </button>
        </div>

        {!planSmae ? (
          <EmptyBox icon="utensils" titulo="Sin plan SMAE activo" texto="Crea un plan personalizado con porciones por tiempo de comida." />
        ) : (
          <ActivoBox
            eyebrow="Plan activo"
            titulo={planSmae.nombre}
            sub={`${planSmae.objetivo || '—'} · ${planSmae.kcal_objetivo || '—'} kcal · desde ${formatDate(planSmae.fecha_inicio)}`}
            chip="Activo"
            color={VERDE}
          />
        )}
      </div>

      {/* Información clínica */}
      <div style={cardStyle()}>
        <h3 style={{ ...cardTitle(), marginBottom: 14 }}><Icon name="clipboard-list" size={16} color="var(--accent)" /> Información clínica</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <InfoTile titulo="Alergias" valor="—" color={AMBAR} icon="alert-triangle" />
          <InfoTile titulo="Suplementos" valor="—" color={AZUL} icon="pill" />
          <InfoTile titulo="Diagnóstico" valor="—" color={VERDE} icon="clipboard-list" />
          <InfoTile titulo="Próxima consulta" valor="Sin agendar" color={MORADO} icon="calendar-days" />
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-soft)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btnGhost()} onClick={() => setVista('anamnesis')}>
            <Icon name="clipboard-list" size={14} color="var(--ink-3)" /> Anamnesis nutricional
          </button>
          <button style={btnGhost()} onClick={() => setVista('nueva_consulta')}>
            <Icon name="stethoscope" size={14} color="var(--ink-3)" /> Nueva consulta
          </button>
          <button style={btnGhost()} onClick={() => setVista('historial_consultas')}>
            <Icon name="history" size={14} color="var(--ink-3)" /> Historial ({consultasCount})
          </button>
          <button style={btnGhost({ opacity: planSmae ? 1 : 0.5, cursor: planSmae ? 'pointer' : 'not-allowed' })} onClick={generarPDFPlan} disabled={!planSmae} title={planSmae ? 'Generar PDF del Plan SMAE' : 'Crea un plan SMAE primero'}>
            <Icon name="file-text" size={14} color="var(--ink-3)" /> PDF Plan SMAE
          </button>
          <button style={btnGhost()} onClick={() => setVista('intercambios')}>
            <Icon name="replace" size={14} color="var(--ink-3)" /> Plan por Intercambios
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ink)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 500, fontSize: 13.5, zIndex: 9999, boxShadow: 'var(--sh-nav)' }}>
          <Icon name={toast.color === ROJO ? 'alert-circle' : 'check-circle-2'} size={16} color={toast.color === ROJO ? '#FCA5A5' : '#6EE7A8'} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes y helpers ───────────────────────────────────────────
// Caja de estado activo: sin borde izquierdo de color; estado con punto + texto.
function ActivoBox({ eyebrow, titulo, sub, chip, color }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.12em', margin: 0 }}>{eyebrow}</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '4px 0 0' }}>{titulo}</p>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '5px 0 0' }}>{sub}</p>
        </div>
        {chip && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 8, background: color + '14', color: color, fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
            {chip}
          </span>
        )}
      </div>
    </div>
  );
}

// Tile clínico: icono en cuadro de color suave; sin borde superior de color.
function InfoTile({ titulo, valor, color, icon }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '13px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
        <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, background: color + '14', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={14} color={color} />
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>{titulo}</span>
      </div>
      <p style={{ fontSize: 14, color: valor === '—' ? 'var(--ink-3)' : 'var(--ink)', fontWeight: 600, margin: 0 }}>{valor}</p>
    </div>
  );
}

function EmptyBox({ icon, titulo, texto }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 24px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, marginTop: 8 }}>
      <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: 'var(--accent-wash)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon name={icon} size={22} color="var(--accent)" />
      </span>
      <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{titulo}</p>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '6px 0 0' }}>{texto}</p>
    </div>
  );
}

const cardStyle = () => ({ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--sh-1)', padding: 18, marginBottom: 16 });
const cardHeader = () => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 10 });
const cardTitle = () => ({ margin: 0, color: 'var(--ink)', fontSize: 15, fontWeight: 600, letterSpacing: '-.01em', display: 'flex', alignItems: 'center', gap: 9 });

const btnPrimary = (extra = {}) => ({ height: 38, padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(180deg,#14355F,var(--ink))', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)', ...extra });
const btnGhost = (extra = {}) => ({ height: 38, padding: '0 15px', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', ...extra });

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

function diasDesde(iso) {
  if (!iso) return 0;
  const inicio = new Date(iso + 'T12:00:00');
  const hoy = new Date();
  return Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
}

// ── Historial de consultas — vista inline ──────────────────────────────
function HistorialConsultasNutricion({ paciente, consultas, onVolver, onVerConsulta }) {
  return (
    <div style={{ padding: 20, fontFamily: "'Poppins', system-ui, sans-serif", color: 'var(--ink)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={onVolver} style={btnGhost()}>
          <Icon name="arrow-left" size={15} color="var(--ink-3)" /> Volver
        </button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--ink)', margin: 0 }}>Historial de consultas nutricionales</h2>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '3px 0 0' }}>
            {paciente.nombre} {paciente.apellido || ''} · {consultas.length} consulta{consultas.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {consultas.length === 0 ? (
        <div style={cardStyle()}>
          <EmptyBox icon="clipboard-list" titulo="Sin consultas registradas" texto="Las consultas nutricionales aparecerán aquí cuando las registres." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {consultas.map(c => {
            const esAnamnesis = c.tipo === 'anamnesis';
            const tono = esAnamnesis ? AZUL : VERDE;
            return (
              <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--sh-1)', padding: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, padding: '0 9px', borderRadius: 7, background: tono + '14', color: tono, fontSize: 11, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: tono }} />
                    {esAnamnesis ? 'Anamnesis' : 'Seguimiento'}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{formatDate(c.fecha)}</span>
                </div>
                {c.peso_kg && (
                  <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {c.peso_kg} kg{c.imc && ` · IMC ${c.imc}`}{c.grasa_pct && ` · ${c.grasa_pct}% grasa`}
                  </p>
                )}
                {c.diagnostico && (
                  <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '5px 0 0', lineHeight: 1.5 }}>
                    {c.diagnostico.substring(0, 120)}{c.diagnostico.length > 120 ? '…' : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
