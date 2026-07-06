// ════════════════════════════════════════════════════════════════════════
// DashboardPaciente.js — Vista del paciente en la app IMC
//
// Secciones:
//   1. Header de bienvenida + estado del programa
//   2. Check-in de hoy (alimentación, entreno, agua, ánimo) — 15 segundos
//   3. Score semanal/mensual + racha de días registrando
//   4. Próxima cita
//   5. Mi plan de alimentación (fase activa o plan por intercambios + PDF)
//   6. Mi plan de entreno
//   7. Mi progreso (peso)
//   8. Contacto de la clínica
//
// Todo es de solo lectura excepto el check-in (protegido por RLS).
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generarPDFIntercambios } from './PDFIntercambios';

const B = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020', orange: '#C25A00', amber: '#F59E0B', gold: '#C9A86A' };

const WHATSAPP_CLINICA = '593984058395';
const hoy = () => new Date().toISOString().split('T')[0];
const fmtFecha = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long' }) : '';
const fmtFechaCorta = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) : '';

// ── Cálculo de scores ──────────────────────────────────────────────────────
function scoreDia(ch) {
  const vals = [];
  if (ch.alimentacion) vals.push(ch.alimentacion === 'si' ? 100 : ch.alimentacion === 'parcial' ? 50 : 0);
  if (ch.entreno && ch.entreno !== 'descanso') vals.push(ch.entreno === 'si' ? 100 : 0);
  if (ch.agua) vals.push(ch.agua === 'si' ? 100 : 0);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function scorePeriodo(checkins, dias) {
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  const enRango = checkins.filter(c => new Date(c.fecha + 'T12:00:00') >= limite);
  const scores = enRango.map(scoreDia).filter(s => s !== null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function calcularRacha(checkins) {
  const fechas = new Set(checkins.map(c => c.fecha));
  let racha = 0;
  const d = new Date();
  // La racha se mantiene si registró hoy o ayer
  if (!fechas.has(d.toISOString().split('T')[0])) d.setDate(d.getDate() - 1);
  while (fechas.has(d.toISOString().split('T')[0])) {
    racha++;
    d.setDate(d.getDate() - 1);
  }
  return racha;
}

const colorScore = s => (s === null ? B.gray : s >= 80 ? B.green : s >= 50 ? B.amber : B.red);

// ════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════
export default function DashboardPaciente({ paciente, onLogout }) {
  const [cargando, setCargando] = useState(true);
  const [checkins, setCheckins] = useState([]);
  const [checkinHoy, setCheckinHoy] = useState(null);
  const [proximaCita, setProximaCita] = useState(null);
  const [planIntercambios, setPlanIntercambios] = useState(null);
  const [faseActiva, setFaseActiva] = useState(null);
  const [planEntreno, setPlanEntreno] = useState(null);
  const [ejerciciosCat, setEjerciciosCat] = useState({});
  const [pesos, setPesos] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => { cargarTodo(); }, [paciente.id]);

  const cargarTodo = async () => {
    setCargando(true);
    const [chk, cita, planInt, fases, plantillas, entreno, cat, consultas] = await Promise.all([
      supabase.from('checkins_paciente').select('*').eq('paciente_id', paciente.id)
        .order('fecha', { ascending: false }).limit(60),
      supabase.from('citas').select('*').eq('paciente_id', paciente.id)
        .gte('fecha', hoy()).order('fecha').order('hora').limit(1),
      supabase.from('planes_intercambio').select('*').eq('paciente_id', paciente.id)
        .order('fecha', { ascending: false }).limit(1),
      supabase.from('paciente_fases').select('*').eq('paciente_id', paciente.id).eq('estado', 'activa').limit(1),
      supabase.from('fases_nutricionales').select('*'),
      supabase.from('planes_ejercicio').select('*, plan_ejercicios(*)').eq('paciente_id', paciente.id)
        .eq('activo', true).order('fecha', { ascending: false }).limit(1),
      supabase.from('ejercicios').select('id, nombre, categoria, unidad'),
      supabase.from('consultas_nutricion_v2').select('fecha, peso_kg').eq('paciente_id', paciente.id)
        .not('peso_kg', 'is', null).order('fecha'),
    ]);

    const chs = chk.data || [];
    setCheckins(chs);
    setCheckinHoy(chs.find(c => c.fecha === hoy()) || null);
    setProximaCita(cita.data?.[0] || null);
    setPlanIntercambios(planInt.data?.[0] || null);

    const fa = fases.data?.[0] || null;
    if (fa && plantillas.data) {
      const plantilla = plantillas.data.find(f => f.id === fa.fase_id);
      setFaseActiva({ ...fa, plantilla });
    } else {
      setFaseActiva(fa);
    }

    setPlanEntreno(entreno.data?.[0] || null);
    const catMap = {};
    (cat.data || []).forEach(e => { catMap[e.id] = e; });
    setEjerciciosCat(catMap);
    setPesos((consultas.data || []).map(c => ({ fecha: c.fecha, peso: parseFloat(c.peso_kg) })));
    setCargando(false);
  };

  const guardarCheckin = async (respuestas) => {
    const payload = { paciente_id: paciente.id, fecha: hoy(), ...respuestas };
    const { error } = await supabase.from('checkins_paciente')
      .upsert(payload, { onConflict: 'paciente_id,fecha' });
    if (error) { showToast('⚠ No se pudo guardar: ' + error.message, B.red); return; }
    showToast('✓ ¡Check-in registrado! 💪');
    cargarTodo();
  };

  const scoreSemana = scorePeriodo(checkins, 7);
  const scoreMes = scorePeriodo(checkins, 30);
  const racha = calcularRacha(checkins);

  const card = { background: 'white', borderRadius: 14, border: `1px solid ${B.grayMd}`, padding: '18px 18px', marginBottom: 14 };
  const secTitle = { fontSize: 11, fontWeight: 800, color: B.teal, textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 12px' };

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: B.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚕</div>
          <p style={{ fontWeight: 700 }}>Cargando tu información...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", minHeight: '100vh', background: B.grayLt }}>
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '10px 22px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 3000, boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
          {toast.msg}
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div style={{ background: `linear-gradient(135deg, ${B.navy}, #123059)`, padding: '22px 18px 26px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ background: 'white', color: B.navy, fontWeight: 800, fontSize: 13, padding: '4px 12px', borderRadius: 8, letterSpacing: 1 }}>IMC</span>
            <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: 'none', borderRadius: 7, padding: '7px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Salir</button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 2px' }}>Hola,</p>
          <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, margin: 0 }}>{paciente.nombre} 👋</h1>
          {/* Score y racha, arriba y grandes (las conductas primero, el peso después) */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: scoreSemana === null ? 'rgba(255,255,255,0.4)' : colorScore(scoreSemana) === B.green ? '#4ADE80' : colorScore(scoreSemana) === B.amber ? '#FBBF24' : '#F87171' }}>
                {scoreSemana === null ? '—' : `${scoreSemana}%`}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Semana</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: scoreMes === null ? 'rgba(255,255,255,0.4)' : colorScore(scoreMes) === B.green ? '#4ADE80' : colorScore(scoreMes) === B.amber ? '#FBBF24' : '#F87171' }}>
                {scoreMes === null ? '—' : `${scoreMes}%`}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Mes</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#FBBF24' }}>🔥 {racha}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Días seguidos</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 14px 40px' }}>

        {/* ═══ CHECK-IN DE HOY ═══ */}
        <CheckinCard checkinHoy={checkinHoy} onGuardar={guardarCheckin} card={card} secTitle={secTitle} />

        {/* ═══ PRÓXIMA CITA ═══ */}
        <div style={card}>
          <p style={secTitle}>📅 Próxima cita</p>
          {proximaCita ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: B.blue + '18', borderRadius: 12, padding: '10px 14px', textAlign: 'center', minWidth: 64 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: B.blue }}>{new Date(proximaCita.fecha + 'T12:00:00').getDate()}</div>
                <div style={{ fontSize: 10, color: B.teal, textTransform: 'uppercase', fontWeight: 700 }}>
                  {new Date(proximaCita.fecha + 'T12:00:00').toLocaleDateString('es-EC', { month: 'short' })}
                </div>
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: B.navy, textTransform: 'capitalize' }}>{fmtFecha(proximaCita.fecha)}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: B.gray }}>
                  🕐 {String(proximaCita.hora || '').slice(0, 5)} · {proximaCita.servicio || 'Consulta'}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: B.gray }}>No tienes citas agendadas próximamente.</p>
              <a href={`https://wa.me/${WHATSAPP_CLINICA}?text=${encodeURIComponent('Hola, quisiera agendar mi próximo control en IMC 😊')}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'inline-block', background: '#25D366', color: 'white', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                📲 Agendar por WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* ═══ MI PLAN DE ALIMENTACIÓN ═══ */}
        <div style={card}>
          <p style={secTitle}>🥗 Mi plan de alimentación</p>
          {faseActiva && (
            <div style={{ background: B.blue + '10', borderLeft: `4px solid ${B.blue}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: B.navy }}>
                <strong>Fase actual:</strong> {faseActiva.plantilla?.nombre || 'Fase de tu protocolo'}
                {faseActiva.fecha_inicio ? ` · desde el ${fmtFechaCorta(faseActiva.fecha_inicio)}` : ''}
              </p>
              {faseActiva.plantilla?.hidratacion_litros && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: B.teal }}>💧 Hidratación: {faseActiva.plantilla.hidratacion_litros} L/día</p>
              )}
            </div>
          )}
          {planIntercambios ? (
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: B.navy }}>
                {planIntercambios.titulo || 'Plan Nutricional Mensual'}
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: B.gray }}>
                Del {fmtFechaCorta(planIntercambios.fecha)} · {planIntercambios.nutricionista_nombre || 'Nutrición IMC'} · {(planIntercambios.tiempos_comida || []).length} tiempos de comida
              </p>
              <button onClick={() => generarPDFIntercambios(paciente, planIntercambios)}
                style={{ background: B.navy, color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                📄 Ver mi plan completo
              </button>
            </div>
          ) : !faseActiva ? (
            <p style={{ margin: 0, fontSize: 13, color: B.gray }}>Tu plan aparecerá aquí cuando tu nutricionista lo asigne. 🌱</p>
          ) : null}
        </div>

        {/* ═══ MI PLAN DE ENTRENO ═══ */}
        <div style={card}>
          <p style={secTitle}>🏋️ Mi plan de entreno</p>
          {planEntreno ? (
            <PlanEntrenoResumen plan={planEntreno} ejerciciosCat={ejerciciosCat} />
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: B.gray }}>Tu plan de entrenamiento aparecerá aquí cuando tu fisioterapeuta lo asigne. 💪</p>
          )}
        </div>

        {/* ═══ MI PROGRESO ═══ */}
        <div style={card}>
          <p style={secTitle}>📊 Mi progreso</p>
          {pesos.length >= 2 ? (
            <GraficaPeso pesos={pesos} />
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: B.gray }}>
              Tu evolución de peso aparecerá aquí después de tus controles con el equipo IMC.
            </p>
          )}
        </div>

        {/* ═══ CONTACTO ═══ */}
        <div style={{ ...card, background: B.navy, border: 'none' }}>
          <p style={{ ...secTitle, color: B.gold }}>💬 ¿Necesitas ayuda?</p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            Estamos contigo en cada paso. Escríbenos si tienes dudas sobre tu plan, síntomas o tu próxima cita.
          </p>
          <a href={`https://wa.me/${WHATSAPP_CLINICA}`} target="_blank" rel="noreferrer"
            style={{ display: 'inline-block', background: '#25D366', color: 'white', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
            📲 WhatsApp de la clínica
          </a>
          <p style={{ margin: '14px 0 0', fontSize: 10.5, color: 'rgba(255,255,255,0.45)' }}>
            Instituto Metabólico Corporal · Quito, Ecuador
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// CHECK-IN DE HOY — 4 preguntas, 15 segundos
// ════════════════════════════════════════════════════════════════════════
function CheckinCard({ checkinHoy, onGuardar, card, secTitle }) {
  const [editando, setEditando] = useState(!checkinHoy);
  const [alimentacion, setAlimentacion] = useState(checkinHoy?.alimentacion || null);
  const [entreno, setEntreno] = useState(checkinHoy?.entreno || null);
  const [agua, setAgua] = useState(checkinHoy?.agua || null);
  const [animo, setAnimo] = useState(checkinHoy?.animo || null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setEditando(!checkinHoy);
    setAlimentacion(checkinHoy?.alimentacion || null);
    setEntreno(checkinHoy?.entreno || null);
    setAgua(checkinHoy?.agua || null);
    setAnimo(checkinHoy?.animo || null);
  }, [checkinHoy]);

  const guardar = async () => {
    setGuardando(true);
    await onGuardar({ alimentacion, entreno, agua, animo });
    setGuardando(false);
  };

  const opcion = (activo, color) => ({
    flex: 1, padding: '10px 6px', borderRadius: 10, fontWeight: 700, fontSize: 12,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
    background: activo ? color : B.grayLt,
    color: activo ? 'white' : B.gray,
    border: `1.5px solid ${activo ? color : B.grayMd}`,
    transition: 'all 0.15s',
  });

  const preguntaLabel = { fontSize: 13, fontWeight: 700, color: B.navy, margin: '0 0 8px' };
  const completo = alimentacion && entreno && agua && animo;

  if (!editando && checkinHoy) {
    const emojis = ['😞', '😕', '😐', '🙂', '😄'];
    return (
      <div style={{ ...card, borderLeft: `4px solid ${B.green}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={secTitle}>✅ Check-in de hoy</p>
            <p style={{ margin: 0, fontSize: 13, color: B.navy }}>
              ¡Registrado! 🥗 {checkinHoy.alimentacion === 'si' ? 'Cumplido' : checkinHoy.alimentacion === 'parcial' ? 'Parcial' : 'No'} ·
              🏋️ {checkinHoy.entreno === 'si' ? 'Hecho' : checkinHoy.entreno === 'descanso' ? 'Descanso' : 'No'} ·
              💧 {checkinHoy.agua === 'si' ? 'Sí' : 'No'} ·
              {' '}{emojis[(checkinHoy.animo || 3) - 1]}
            </p>
          </div>
          <button onClick={() => setEditando(true)}
            style={{ background: B.grayLt, color: B.teal, border: `1px solid ${B.grayMd}`, borderRadius: 7, padding: '7px 14px', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            ✏️ Corregir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...card, borderLeft: `4px solid ${B.blue}` }}>
      <p style={secTitle}>✅ Mi check-in de hoy</p>

      <p style={preguntaLabel}>🥗 ¿Cumpliste tu plan de alimentación?</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={opcion(alimentacion === 'si', B.green)} onClick={() => setAlimentacion('si')}>Sí ✓</button>
        <button style={opcion(alimentacion === 'parcial', B.amber)} onClick={() => setAlimentacion('parcial')}>Parcial</button>
        <button style={opcion(alimentacion === 'no', B.red)} onClick={() => setAlimentacion('no')}>No</button>
      </div>

      <p style={preguntaLabel}>🏋️ ¿Hiciste tu entrenamiento?</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={opcion(entreno === 'si', B.green)} onClick={() => setEntreno('si')}>Sí ✓</button>
        <button style={opcion(entreno === 'no', B.red)} onClick={() => setEntreno('no')}>No</button>
        <button style={opcion(entreno === 'descanso', B.teal)} onClick={() => setEntreno('descanso')}>Era descanso</button>
      </div>

      <p style={preguntaLabel}>💧 ¿Tomaste tu agua del día?</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={opcion(agua === 'si', B.green)} onClick={() => setAgua('si')}>Sí ✓</button>
        <button style={opcion(agua === 'no', B.red)} onClick={() => setAgua('no')}>No</button>
      </div>

      <p style={preguntaLabel}>💪 ¿Cómo te sentiste hoy?</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {['😞', '😕', '😐', '🙂', '😄'].map((e, i) => (
          <button key={i} onClick={() => setAnimo(i + 1)}
            style={{ ...opcion(animo === i + 1, B.blue), fontSize: 20, padding: '8px 4px' }}>
            {e}
          </button>
        ))}
      </div>

      <button onClick={guardar} disabled={!completo || guardando}
        style={{ width: '100%', padding: '13px', background: completo ? B.navy : B.grayMd, color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: completo ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
        {guardando ? 'Guardando...' : completo ? '💾 Guardar mi check-in' : 'Responde las 4 preguntas'}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// RESUMEN DEL PLAN DE ENTRENO
// ════════════════════════════════════════════════════════════════════════
function PlanEntrenoResumen({ plan, ejerciciosCat }) {
  const [abierto, setAbierto] = useState(false);
  const items = plan.plan_ejercicios || [];

  // Agrupar por día si existe la propiedad, si no, lista plana
  const porDia = {};
  items.forEach(it => {
    const dia = it.dia || it.dia_semana || 'Rutina';
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(it);
  });

  return (
    <div>
      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#0B1F3B' }}>
        {plan.fase ? `Fase: ${plan.fase}` : 'Plan de entrenamiento'} {plan.entorno ? `· ${plan.entorno}` : ''}
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6E6E70' }}>
        {plan.semanas ? `${plan.semanas} semanas · ` : ''}{items.length} ejercicios · {plan.terapeuta_nombre || 'Fisioterapia IMC'}
      </p>
      {plan.notas_alarma && (
        <div style={{ background: '#FFEBEB', borderLeft: '4px solid #B02020', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#B02020' }}>⚠️ {plan.notas_alarma}</p>
        </div>
      )}
      <button onClick={() => setAbierto(!abierto)}
        style={{ background: '#0B1F3B', color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
        {abierto ? '▲ Ocultar ejercicios' : '▼ Ver mis ejercicios'}
      </button>
      {abierto && (
        <div style={{ marginTop: 12 }}>
          {Object.entries(porDia).map(([dia, ejercicios]) => (
            <div key={dia} style={{ marginBottom: 10 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1 }}>{dia}</p>
              {ejercicios.map((it, i) => {
                const ex = ejerciciosCat[it.ejercicio_id];
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F4F6F8', borderRadius: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#0B1F3B', fontWeight: 600 }}>{ex?.nombre || 'Ejercicio'}</span>
                    <span style={{ fontSize: 12, color: '#1E7CB5', fontWeight: 700 }}>
                      {it.series && it.repeticiones ? `${it.series} × ${it.repeticiones}${ex?.unidad ? ' ' + ex.unidad : ''}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
          {plan.notas_generales && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6E6E70', fontStyle: 'italic' }}>📝 {plan.notas_generales}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// GRÁFICA DE PESO — SVG nativo simple
// ════════════════════════════════════════════════════════════════════════
function GraficaPeso({ pesos }) {
  const W = 560, H = 160, PAD = 34;
  const vals = pesos.map(p => p.peso);
  const min = Math.min(...vals), max = Math.max(...vals);
  const rango = max - min || 1;
  const x = i => PAD + (i / (pesos.length - 1)) * (W - PAD * 2);
  const y = v => H - PAD - ((v - min) / rango) * (H - PAD * 2);
  const path = pesos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.peso).toFixed(1)}`).join(' ');
  const primero = pesos[0].peso, ultimo = pesos[pesos.length - 1].peso;
  const delta = (ultimo - primero).toFixed(1);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#0B1F3B' }}>{ultimo} kg</span>
          <span style={{ fontSize: 11, color: '#6E6E70', marginLeft: 6 }}>actual</span>
        </div>
        <div style={{ alignSelf: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: delta <= 0 ? '#1A7A4A' : '#C25A00' }}>
            {delta > 0 ? '+' : ''}{delta} kg desde el inicio
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#DDE3EA" strokeWidth="1" />
        <path d={path} fill="none" stroke="#1E7CB5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pesos.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.peso)} r="3.5" fill="#0B1F3B" />
        ))}
        <text x={PAD} y={y(pesos[0].peso) - 8} fontSize="10" fill="#6E6E70">{pesos[0].peso}</text>
        <text x={x(pesos.length - 1) - 10} y={y(ultimo) - 8} fontSize="10" fill="#0B1F3B" fontWeight="700">{ultimo}</text>
      </svg>
      <p style={{ margin: '4px 0 0', fontSize: 10.5, color: '#6E6E70' }}>
        {fmtFechaCorta(pesos[0].fecha)} → {fmtFechaCorta(pesos[pesos.length - 1].fecha)} · según tus controles en IMC
      </p>
    </div>
  );
}
