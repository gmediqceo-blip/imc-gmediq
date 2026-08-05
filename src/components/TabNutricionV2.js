// ════════════════════════════════════════════════════════════════════════
// TabNutricionV2.js — Módulo de Nutrición v2 (IMC360)
//
// Este componente es el "router" del módulo nutrición.
// Detecta automáticamente el protocolo del paciente y muestra:
//   - Vista de fases (si es manga/balón)
//   - Editor SMAE (si es GLP-1/conservador o terminó fases)
//   - Acceso a anamnesis, consultas, plantillas
//
// Props:
//   - paciente: {id, nombre, apellido, protocolo_nutricional, fecha_procedimiento, ...}
//   - usuario:  el usuario logueado
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

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#7C8DA1',
  grayLt: '#FAFCFE', grayMd: '#E6EDF6', white: '#FFFFFF',
  green: '#1A7A4A', greenLt: '#4ADE80', red: '#B02020',
  orange: '#C25A00', amber: '#F59E0B', purple: '#7C3AED',
  softGreen: '#E6F5EE', softBlue: '#E8F2FA', softOrange: '#FFF0E0',
  softPurple: '#F3E8FF', softRed: '#FFEBEB',
};

const PROTOCOLOS = {
  manga:       { nombre: 'Manga Gástrica',           emoji: '', color: B.blue,    tieneFases: true,  bg: B.softBlue,   fasesDe: 'manga' },
  balon:       { nombre: 'Balón Gástrico',           emoji: '', color: B.purple,  tieneFases: true,  bg: B.softPurple, fasesDe: 'balon' },
  glp1:        { nombre: 'GLP-1 (Ozempic/Wegovy)',   emoji: ''  , color: B.orange,  tieneFases: false, bg: B.softOrange, fasesDe: null    },
  conservador: { nombre: 'Conservador IMC',          emoji: '', color: B.green,   tieneFases: false, bg: B.softGreen,  fasesDe: null    },
  bypass:      { nombre: 'Bypass Gástrico',          emoji: '', color: '#F59E0B', tieneFases: true,  bg: '#FEF3C7',    fasesDe: 'manga' },
  biparticion: { nombre: 'Bipartición de Tránsito',  emoji: '', color: '#DC2626', tieneFases: true,  bg: '#FEE2E2',    fasesDe: 'manga' },
};

export default function TabNutricionV2({ paciente, usuario }) {
  const [vista, setVista] = useState('resumen'); // resumen | timeline | editor_smae | anamnesis | nueva_consulta | historial_consultas
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

  const showToast = (msg, color = B.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const cargarDatos = async () => {
    setLoading(true);
    const codigoProtocolo = paciente.protocolo_nutricional || 'conservador';
    setProtocolo(codigoProtocolo);

    // Si el protocolo tiene fases, cargar la fase activa
    if (PROTOCOLOS[codigoProtocolo]?.tieneFases) {
      // Bypass y Biparticion comparten las fases de manga
      const { data: fases } = await supabase
        .from('paciente_fases')
        .select('*, fases_nutricionales(nombre, descripcion_corta, numero_orden, duracion_dias_default)')
        .eq('paciente_id', paciente.id)
        .order('fecha_inicio', { ascending: false });

      setHistoriaFases(fases || []);
      const activa = (fases || []).find(f => f.estado === 'activa');
      setFaseActual(activa || null);
    }

    // Cargar plan SMAE activo (todos los protocolos pueden tenerlo)
    const { data: plan } = await supabase
      .from('planes_smae')
      .select('*')
      .eq('paciente_id', paciente.id)
      .eq('estado', 'activo')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    setPlanSmae(plan || null);

    // Cargar consultas nutricionales
    const { data: cons } = await supabase
      .from('consultas_nutricion_v2')
      .select('*')
      .eq('paciente_id', paciente.id)
      .order('fecha', { ascending: false });
    setConsultas(cons || []);
    setConsultasCount((cons || []).length);

    setLoading(false);
  };

  // ── Generar PDF del Plan SMAE ────────────────────────────────────────
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
      showToast('Error generando PDF: ' + e.message, B.red);
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
        <button
          onClick={() => { setVista('resumen'); cargarDatos(); }}
          style={{ padding: '8px 16px', background: 'transparent', color: B.teal, border: `1px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}>
          ← Volver a nutrición
        </button>
        <PlanIntercambios paciente={paciente} usuario={usuario} />
      </div>
    );
  }

  // ── VISTA PRINCIPAL: Resumen ─────────────────────────────────────────
  const protocoloInfo = PROTOCOLOS[protocolo] || PROTOCOLOS.conservador;

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: B.gray }}>
        Cargando información nutricional...
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      
      {/* Banner del protocolo */}
      <div style={{
        background: `linear-gradient(135deg, ${protocoloInfo.color}, ${protocoloInfo.color}DD)`,
        color: 'white', padding: 20, borderRadius: 12, marginBottom: 18,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
            Módulo Nutrición
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
            {paciente.nombre} {paciente.apellido || ''}
          </div>
          <div style={{ fontSize: 12, opacity: 0.95, marginTop: 4 }}>
            Protocolo: <strong>{protocoloInfo.nombre}</strong>
            {paciente.fecha_procedimiento && ` · ${formatDate(paciente.fecha_procedimiento)}`}
          </div>
        </div>
      </div>

      {/* ═══════ SI TIENE PROTOCOLO CON FASES (manga/balón) ═══════ */}
      {protocoloInfo.tieneFases && (
        <>
          <div style={cardStyle()}>
            <div style={cardHeader()}>
              <h3 style={{ margin: 0, color: B.navy, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="git-branch" size={16} color={B.navy} /> Fases Bariátricas
              </h3>
              <button style={btnPrimary(protocoloInfo.color)} onClick={() => setVista('timeline')}>
                {faseActual ? 'Ver timeline' : '+ Iniciar fases'}
              </button>
            </div>

            {!faseActual && historiaFases.length === 0 && (
              <div style={emptyStateBox()}>
                <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: '#EFF6FC', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Icon name="salad" size={22} color={B.blue} /></span>
                <h4 style={{ color: B.navy, marginBottom: 6, fontSize: 14 }}>Sin fases iniciadas aún</h4>
                <p style={{ color: B.gray, fontSize: 12, marginBottom: 14 }}>
                  Asigna la primera fase del protocolo de {protocoloInfo.nombre} al paciente.
                </p>
              </div>
            )}

            {faseActual && (
              <div style={{
                background: protocoloInfo.bg,
                borderLeft: `4px solid ${protocoloInfo.color}`,
                padding: 14, borderRadius: 8, marginTop: 6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: protocoloInfo.color, textTransform: 'uppercase' }}>
                      FASE ACTIVA
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.navy, marginTop: 2 }}>
                      {faseActual.fases_nutricionales?.nombre || 'Fase'}
                    </div>
                    <div style={{ fontSize: 11, color: B.gray, marginTop: 4 }}>
                      Inicio: {formatDate(faseActual.fecha_inicio)} · Día {diasDesde(faseActual.fecha_inicio)} de la fase
                    </div>
                  </div>
                  {historiaFases.length > 1 && (
                    <span style={{
                      background: 'white', color: protocoloInfo.color,
                      padding: '3px 9px', borderRadius: 11, fontSize: 11, fontWeight: 700,
                    }}>
                      {historiaFases.length} fases registradas
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════ PLAN SMAE (todos los protocolos) ═══════ */}
      <div style={cardStyle()}>
        <div style={cardHeader()}>
          <h3 style={{ margin: 0, color: B.navy, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="utensils" size={16} color={B.navy} /> Plan SMAE {protocoloInfo.tieneFases && '(post-fases)'}
          </h3>
          <button style={btnPrimary(B.green)} onClick={() => setVista('editor_smae')}>
            {planSmae ? 'Editar plan' : '+ Crear plan SMAE'}
          </button>
        </div>

        {!planSmae ? (
          <div style={emptyStateBox()}>
            <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: '#EFF6FC', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Icon name="utensils" size={22} color={B.blue} /></span>
            <h4 style={{ color: B.navy, marginBottom: 6, fontSize: 14 }}>Sin plan SMAE activo</h4>
            <p style={{ color: B.gray, fontSize: 12, marginBottom: 14 }}>
              Crea un plan personalizado con porciones por tiempo de comida.
            </p>
          </div>
        ) : (
          <div style={{
            background: B.softGreen,
            borderLeft: `4px solid ${B.green}`,
            padding: 14, borderRadius: 8, marginTop: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: B.green, textTransform: 'uppercase' }}>
                  PLAN ACTIVO
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: B.navy, marginTop: 2 }}>
                  {planSmae.nombre}
                </div>
                <div style={{ fontSize: 11, color: B.gray, marginTop: 4 }}>
                  {planSmae.objetivo || '—'} · {planSmae.kcal_objetivo || '—'} kcal · Desde {formatDate(planSmae.fecha_inicio)}
                </div>
              </div>
              <span style={{
                background: 'white', color: B.green,
                padding: '3px 9px', borderRadius: 11, fontSize: 11, fontWeight: 700,
              }}>
                Activo
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ Información clínica común ═══════ */}
      <div style={cardStyle()}>
        <h3 style={{ margin: '0 0 12px', color: B.navy, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="clipboard-list" size={16} color={B.navy} /> Información clínica</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <InfoTile titulo="Alergias" valor="—" color={B.amber} icon="alert-triangle" />
          <InfoTile titulo="Suplementos" valor="—" color={B.blue} icon="pill" />
          <InfoTile titulo="Diagnóstico" valor="—" color={B.green} icon="clipboard-list" />
          <InfoTile titulo="Próxima consulta" valor="Sin agendar" color={B.purple} icon="calendar-days" />
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${B.grayLt}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btnSecondaryActivo(B.blue)} onClick={() => setVista('anamnesis')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name="clipboard-list" size={14} /> Anamnesis nutricional
          </button>
          <button style={btnSecondaryActivo(B.green)} onClick={() => setVista('nueva_consulta')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name="stethoscope" size={14} /> Nueva consulta
          </button>
          <button style={btnSecondaryActivo(B.purple)} onClick={() => setVista('historial_consultas')}>
            Historial ({consultasCount})
          </button>
          <button style={btnSecondaryActivo(B.orange)} onClick={generarPDFPlan} disabled={!planSmae} title={planSmae ? 'Generar PDF del Plan SMAE' : 'Crea un plan SMAE primero'}>
            PDF Plan SMAE
          </button>
          <button style={btnSecondaryActivo(B.teal)} onClick={() => setVista('intercambios')}>
            Plan por Intercambios
          </button>
        </div>
      </div>

      {/* Toast */}
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

// ────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTES Y HELPERS
// ────────────────────────────────────────────────────────────────────────
function InfoTile({ titulo, valor, color, icon }) {
  return (
    <div style={{
      background: 'white',
      border: `1px solid ${B.grayMd}`,
      borderRadius: 8,
      padding: '10px 12px',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 10, color: B.gray, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={13} color={color} /> {titulo}
      </div>
      <div style={{ fontSize: 13, color: B.navy, fontWeight: 700, marginTop: 4 }}>
        {valor}
      </div>
    </div>
  );
}

const cardStyle = () => ({
  background: 'white',
  border: `1px solid ${B.grayMd}`,
  borderRadius: 12,
  padding: 18,
  marginBottom: 16,
});

const cardHeader = () => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
  flexWrap: 'wrap',
  gap: 8,
});

const emptyStateBox = () => ({
  textAlign: 'center',
  padding: 24,
  background: B.grayLt,
  borderRadius: 8,
  marginTop: 8,
});

const btnPrimary = (color) => ({
  padding: '9px 16px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const btnSecondary = () => ({
  padding: '8px 14px',
  background: 'white',
  color: B.navy,
  border: `1px solid ${B.grayMd}`,
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  opacity: 0.5,
});

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


// ────────────────────────────────────────────────────────────────────────
// HISTORIAL DE CONSULTAS — vista inline
// ────────────────────────────────────────────────────────────────────────
function HistorialConsultasNutricion({ paciente, consultas, onVolver, onVerConsulta }) {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={onVolver} style={{ padding: '8px 14px', background: B.white, color: B.navy, border: `1px solid ${B.grayMd}`, borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: B.navy, margin: 0 }}>Historial de Consultas Nutricionales</h2>
          <p style={{ fontSize: 12, color: B.gray, margin: '2px 0 0' }}>
            {paciente.nombre} {paciente.apellido || ''} · {consultas.length} consultas
          </p>
        </div>
      </div>

      {consultas.length === 0 ? (
        <div style={{ background: 'white', border: `1px solid ${B.grayMd}`, borderRadius: 12, padding: 60, textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: '#EFF6FC', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Icon name="clipboard-list" size={22} color={B.blue} /></span>
          <h4 style={{ color: B.navy, marginBottom: 6, fontSize: 14 }}>Sin consultas registradas</h4>
          <p style={{ color: B.gray, fontSize: 12 }}>Las consultas nutricionales aparecerán aquí cuando las registres.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {consultas.map(c => (
            <div key={c.id} style={{
              background: 'white',
              border: `1px solid ${B.grayMd}`,
              borderLeft: `4px solid ${c.tipo === 'anamnesis' ? B.blue : B.green}`,
              borderRadius: 10,
              padding: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      background: c.tipo === 'anamnesis' ? B.softBlue : B.softGreen,
                      color: c.tipo === 'anamnesis' ? B.blue : B.green,
                      padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: 0.3,
                    }}>
                      {c.tipo === 'anamnesis' ? 'Anamnesis' : 'Seguimiento'}
                    </span>
                    <span style={{ fontSize: 11, color: B.gray }}>
                      {formatDate(c.fecha)}
                    </span>
                  </div>
                  {c.peso_kg && (
                    <div style={{ fontSize: 12, color: B.navy }}>
                      {c.peso_kg} kg
                      {c.imc && ` · IMC ${c.imc}`}
                      {c.grasa_pct && ` · ${c.grasa_pct}% grasa`}
                    </div>
                  )}
                  {c.diagnostico && (
                    <div style={{ fontSize: 11, color: B.gray, marginTop: 4 }}>
                      {c.diagnostico.substring(0, 100)}{c.diagnostico.length > 100 ? '...' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btnSecondaryActivo = (color) => ({
  padding: '8px 14px',
  background: 'white',
  color: color,
  border: `1px solid ${color}`,
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});
