// ════════════════════════════════════════════════════════════════════════
// DashboardPaciente.js — Vista del paciente en la app IMC
//
// Secciones:
//   1. Header de bienvenida + score y racha
//   2. Check-in de hoy (alimentación, entreno, agua, ánimo) — 15 segundos
//   3. Próxima cita
//   4. Mi plan de alimentación (fase activa o plan por intercambios + PDF)
//   5. Mi plan de entreno
//   6. Mi progreso (peso)
//   7. Contacto de la clínica
//
// Todo es de solo lectura excepto el check-in (protegido por RLS).
//
// ── Capa visual v2 ("clínico premium", aprobada 04/08/2026) ────────────
// Lo que NO cambió: props, los ocho queries del Promise.all, scoreDia,
// scorePeriodo, calcularRacha, el upsert del check-in con onConflict
// 'paciente_id,fecha', la generación del PDF de intercambios, el número de
// WhatsApp de la clínica y el agrupado del plan de entreno por día.
//
// Cambia la presentación: tokens en vez de la constante B, Poppins, iconos
// Lucide en vez de emoji, y ningún control por debajo de 44px de alto —
// esta pantalla se usa desde el teléfono del paciente.
//
// Las caras del ánimo sí siguen siendo un icono de cara (Angry → Laugh de
// Lucide): es una escala visual, no decoración.
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generarPDFIntercambios } from './PDFIntercambios';
import {
  CalendarDays, Utensils, Dumbbell, Droplet, HeartPulse, TrendingDown,
  Clock, FileText, MessageCircle, LogOut, Pencil, Check, Flame,
  AlertTriangle, StickyNote, ChevronDown, ChevronUp, Info,
  Angry, Frown, Meh, Smile, Laugh,
} from 'lucide-react';

const ROJO = '#B02020';
const VERDE = '#1A7A4A';
const AMBAR = '#B87503';
const NARANJA = '#C25A00';
const WHATSAPP_VERDE = '#25D366';

const WHATSAPP_CLINICA = '593984058395';
const hoy = () => new Date().toISOString().split('T')[0];
const fmtFecha = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long' }) : '';
const fmtFechaCorta = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) : '';
// La fecha viene en minúscula del locale. Antes se usaba textTransform:'capitalize',
// que también ponía mayúscula a "De" y "Agosto"; esto sólo levanta la primera letra.
const capitalizar = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const FUENTE = "'Poppins', system-ui, sans-serif";

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

// Sobre el navy del header los colores necesitan más luz para contrastar.
const colorScoreClaro = s => s === null ? 'rgba(255,255,255,.42)' : s >= 80 ? '#6EE7A8' : s >= 50 ? '#FBBF24' : '#F87171';

// ── Piezas compartidas (v2) ───────────────────────────────────────────────
const CARD = { background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', boxShadow: 'var(--sh-1)', padding: 18, marginBottom: 14 };

const Bloque = ({ icon: Ico, titulo, children, style }) => (
  <div style={{ ...CARD, ...style }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
      <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 9, background: 'var(--accent-wash)', color: 'var(--accent)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ico size={15} strokeWidth={1.85} />
      </span>
      <h2 style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-.01em', margin: 0 }}>{titulo}</h2>
    </div>
    {children}
  </div>
);

const btnNavy = (extra = {}) => ({
  minHeight: 46, padding: '0 20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  background: 'linear-gradient(180deg,#14355F,var(--ink))', color: '#fff', border: 'none', borderRadius: 12,
  fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)', ...extra,
});

const btnWhatsapp = {
  minHeight: 46, padding: '0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  background: WHATSAPP_VERDE, color: '#fff', borderRadius: 12, fontWeight: 600, fontSize: 14,
  textDecoration: 'none', fontFamily: 'inherit',
};

const vacio = texto => (
  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>{texto}</p>
);

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

  const showToast = (msg, color = VERDE) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

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
    if (error) { showToast('No se pudo guardar: ' + error.message, ROJO); return; }
    showToast('Check-in registrado');
    cargarTodo();
  };

  const scoreSemana = scorePeriodo(checkins, 7);
  const scoreMes = scorePeriodo(checkins, 30);
  const racha = calcularRacha(checkins);

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: FUENTE, padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo-imc-blanco.png" alt="IMC" style={{ width: 150, display: 'block', margin: '0 auto 18px' }} />
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.6)', margin: 0 }}>Cargando tu información…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FUENTE, minHeight: '100vh', background: 'var(--canvas)', color: 'var(--ink)' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ink)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 500, fontSize: 13.5, zIndex: 3000, boxShadow: 'var(--sh-nav)', maxWidth: 'calc(100vw - 32px)' }}>
          {toast.color === ROJO
            ? <AlertTriangle size={16} strokeWidth={2} color="#FCA5A5" style={{ flexShrink: 0 }} />
            : <Check size={16} strokeWidth={2.5} color="#6EE7A8" style={{ flexShrink: 0 }} />}
          {toast.msg}
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div style={{ background: 'var(--ink)', padding: '20px 18px 26px', position: 'relative', overflow: 'hidden' }}>
        {/* Trama hexagonal de marca, como firma discreta */}
        <div style={{
          position: 'absolute', right: -40, top: -30, width: 260, height: 260, opacity: 0.11, pointerEvents: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0l30 17.32v34.64L30 69.28 0 51.96V17.32z' fill='none' stroke='%231E7CB5' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: '60px 52px',
        }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <img src="/logo-imc-blanco.png" alt="IMC — Instituto Metabólico Corporal" style={{ height: 30, width: 'auto', display: 'block' }} />
            <button onClick={onLogout}
              style={{ minHeight: 44, padding: '0 15px', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.8)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 11, fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              <LogOut size={15} strokeWidth={1.75} /> Salir
            </button>
          </div>

          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 12.5, margin: '0 0 3px' }}>Hola,</p>
          <h1 style={{ color: '#fff', fontSize: 25, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>{paciente.nombre}</h1>

          {/* Score y racha: las conductas primero, el peso después */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginTop: 18 }}>
            {[
              ['Semana', scoreSemana === null ? '—' : scoreSemana + '%', colorScoreClaro(scoreSemana), null],
              ['Mes', scoreMes === null ? '—' : scoreMes + '%', colorScoreClaro(scoreMes), null],
              ['Días seguidos', String(racha), '#FBBF24', Flame],
            ].map(([label, valor, color, Ico]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.11)', borderRadius: 12, padding: '13px 10px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 23, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1, color }}>
                  {Ico && <Ico size={17} strokeWidth={2} />}{valor}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)', marginTop: 6, lineHeight: 1.2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 14px 40px' }}>

        {/* ═══ CHECK-IN DE HOY ═══ */}
        <CheckinCard checkinHoy={checkinHoy} onGuardar={guardarCheckin} />

        {/* ═══ PRÓXIMA CITA ═══ */}
        <Bloque icon={CalendarDays} titulo="Próxima cita">
          {proximaCita ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: 'var(--accent-wash)', border: '1px solid #DCEAF6', borderRadius: 12, padding: '10px 13px', textAlign: 'center', minWidth: 62, flexShrink: 0 }}>
                <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1, color: 'var(--accent-deep)' }}>
                  {new Date(proximaCita.fecha + 'T12:00:00').getDate()}
                </div>
                <div style={{ fontSize: 10, color: 'var(--accent-deep)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>
                  {new Date(proximaCita.fecha + 'T12:00:00').toLocaleDateString('es-EC', { month: 'short' }).replace('.', '')}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{capitalizar(fmtFecha(proximaCita.fecha))}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} strokeWidth={1.75} color="var(--ink-3)" />
                  {String(proximaCita.hora || '').slice(0, 5)} · {proximaCita.servicio || 'Consulta'}
                </p>
              </div>
            </div>
          ) : (
            <div>
              {vacio('No tienes citas agendadas próximamente.')}
              <a href={`https://wa.me/${WHATSAPP_CLINICA}?text=${encodeURIComponent('Hola, quisiera agendar mi próximo control en IMC')}`}
                target="_blank" rel="noreferrer" style={{ ...btnWhatsapp, marginTop: 14 }}>
                <MessageCircle size={16} strokeWidth={1.9} /> Agendar por WhatsApp
              </a>
            </div>
          )}
        </Bloque>

        {/* ═══ MI PLAN DE ALIMENTACIÓN ═══ */}
        <Bloque icon={Utensils} titulo="Mi plan de alimentación">
          {faseActiva && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 13.5 }}>
                <strong style={{ fontWeight: 600 }}>Fase actual:</strong> {faseActiva.plantilla?.nombre || 'Fase de tu protocolo'}
                {faseActiva.fecha_inicio ? ` · desde el ${fmtFechaCorta(faseActiva.fecha_inicio)}` : ''}
              </p>
              {faseActiva.plantilla?.hidratacion_litros && (
                <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Droplet size={13} strokeWidth={1.75} color="var(--accent)" />
                  Hidratación: {faseActiva.plantilla.hidratacion_litros} L al día
                </p>
              )}
            </div>
          )}
          {planIntercambios ? (
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14 }}>
                {planIntercambios.titulo || 'Plan Nutricional Mensual'}
              </p>
              <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Del {fmtFechaCorta(planIntercambios.fecha)} · {planIntercambios.nutricionista_nombre || 'Nutrición IMC'} · {(planIntercambios.tiempos_comida || []).length} tiempos de comida
              </p>
              <button onClick={() => generarPDFIntercambios(paciente, planIntercambios)} style={btnNavy({ width: '100%' })}>
                <FileText size={16} strokeWidth={1.85} /> Ver mi plan completo
              </button>
            </div>
          ) : !faseActiva ? (
            vacio('Tu plan aparecerá aquí cuando tu nutricionista lo asigne.')
          ) : null}
        </Bloque>

        {/* ═══ MI PLAN DE ENTRENO ═══ */}
        <Bloque icon={Dumbbell} titulo="Mi plan de entreno">
          {planEntreno ? (
            <PlanEntrenoResumen plan={planEntreno} ejerciciosCat={ejerciciosCat} />
          ) : (
            vacio('Tu plan de entrenamiento aparecerá aquí cuando tu fisioterapeuta lo asigne.')
          )}
        </Bloque>

        {/* ═══ MI PROGRESO ═══ */}
        <Bloque icon={TrendingDown} titulo="Mi progreso">
          {pesos.length >= 2 ? (
            <GraficaPeso pesos={pesos} />
          ) : (
            vacio('Tu evolución de peso aparecerá aquí después de tus controles con el equipo IMC.')
          )}
        </Bloque>

        {/* ═══ CONTACTO ═══ */}
        <div style={{ background: 'var(--ink)', borderRadius: 14, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: -30, bottom: -40, width: 220, height: 220, opacity: 0.1, pointerEvents: 'none',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0l30 17.32v34.64L30 69.28 0 51.96V17.32z' fill='none' stroke='%231E7CB5' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundSize: '60px 52px',
          }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ color: '#fff', fontSize: 14.5, fontWeight: 600, letterSpacing: '-.01em', margin: '0 0 8px' }}>¿Necesitas ayuda?</h2>
            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'rgba(255,255,255,.72)', lineHeight: 1.6 }}>
              Estamos contigo en cada paso. Escríbenos si tienes dudas sobre tu plan, síntomas o tu próxima cita.
            </p>
            <a href={`https://wa.me/${WHATSAPP_CLINICA}`} target="_blank" rel="noreferrer" style={{ ...btnWhatsapp, width: '100%', boxSizing: 'border-box' }}>
              <MessageCircle size={16} strokeWidth={1.9} /> WhatsApp de la clínica
            </a>
            <p style={{ margin: '16px 0 0', fontSize: 11, color: 'rgba(255,255,255,.4)', textAlign: 'center' }}>
              Instituto Metabólico Corporal · Quito, Ecuador
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// CHECK-IN DE HOY — 4 preguntas, 15 segundos
// ════════════════════════════════════════════════════════════════════════
// Cada punto de la escala lleva icono, etiqueta visible y color propio. Sólo el icono
// no alcanza: a 21px monocromo, Angry y Frown comparten la misma boca, y el `title`
// no existe en una pantalla táctil.
const CARAS = [
  { Ico: Angry, label: 'Muy mal',  color: ROJO },
  { Ico: Frown, label: 'Mal',      color: NARANJA },
  { Ico: Meh,   label: 'Regular',  color: AMBAR },
  { Ico: Smile, label: 'Bien',     color: '#4E9E5C' },
  { Ico: Laugh, label: 'Muy bien', color: VERDE },
];

function CheckinCard({ checkinHoy, onGuardar }) {
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

  // 46px de alto: el paciente responde esto desde el teléfono.
  const opcion = (activo, color) => ({
    flex: 1, minHeight: 46, padding: '0 6px', borderRadius: 11,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontWeight: activo ? 600 : 500, fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit',
    background: activo ? color : 'var(--surface)',
    color: activo ? '#fff' : 'var(--ink-2)',
    border: '1px solid ' + (activo ? color : 'var(--line)'),
    boxShadow: activo ? '0 0 0 3px ' + color + '1F' : 'none',
    transition: 'all .14s ease',
  });

  const pregunta = { fontSize: 13.5, fontWeight: 500, margin: '0 0 9px', display: 'flex', alignItems: 'center', gap: 7 };
  const completo = alimentacion && entreno && agua && animo;

  if (!editando && checkinHoy) {
    const Cara = (CARAS[(checkinHoy.animo || 3) - 1] || CARAS[2]).Ico;
    const resumen = [
      { Ico: Utensils, texto: checkinHoy.alimentacion === 'si' ? 'Cumplido' : checkinHoy.alimentacion === 'parcial' ? 'Parcial' : 'No' },
      { Ico: Dumbbell, texto: checkinHoy.entreno === 'si' ? 'Hecho' : checkinHoy.entreno === 'descanso' ? 'Descanso' : 'No' },
      { Ico: Droplet, texto: checkinHoy.agua === 'si' ? 'Sí' : 'No' },
      { Ico: Cara, texto: (CARAS[(checkinHoy.animo || 3) - 1] || CARAS[2]).label },
    ];
    return (
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 9, background: '#EDF9F2', color: VERDE, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={16} strokeWidth={2.5} />
              </span>
              <h2 style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-.01em', margin: 0 }}>Check-in de hoy</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {resumen.map(({ Ico, texto }, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 11px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                  <Ico size={13} strokeWidth={1.75} color="var(--ink-3)" /> {texto}
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setEditando(true)}
            style={{ minHeight: 44, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 11, fontWeight: 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            <Pencil size={14} strokeWidth={1.75} /> Corregir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
        <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 9, background: 'var(--accent-wash)', color: 'var(--accent)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <HeartPulse size={15} strokeWidth={1.85} />
        </span>
        <h2 style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-.01em', margin: 0 }}>Mi check-in de hoy</h2>
      </div>

      <p style={pregunta}><Utensils size={14} strokeWidth={1.75} color="var(--ink-3)" /> ¿Cumpliste tu plan de alimentación?</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button style={opcion(alimentacion === 'si', VERDE)} onClick={() => setAlimentacion('si')}>Sí</button>
        <button style={opcion(alimentacion === 'parcial', AMBAR)} onClick={() => setAlimentacion('parcial')}>Parcial</button>
        <button style={opcion(alimentacion === 'no', ROJO)} onClick={() => setAlimentacion('no')}>No</button>
      </div>

      <p style={pregunta}><Dumbbell size={14} strokeWidth={1.75} color="var(--ink-3)" /> ¿Hiciste tu entrenamiento?</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button style={opcion(entreno === 'si', VERDE)} onClick={() => setEntreno('si')}>Sí</button>
        <button style={opcion(entreno === 'no', ROJO)} onClick={() => setEntreno('no')}>No</button>
        <button style={opcion(entreno === 'descanso', '#4B647A')} onClick={() => setEntreno('descanso')}>Era descanso</button>
      </div>

      <p style={pregunta}><Droplet size={14} strokeWidth={1.75} color="var(--ink-3)" /> ¿Tomaste tu agua del día?</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button style={opcion(agua === 'si', VERDE)} onClick={() => setAgua('si')}>Sí</button>
        <button style={opcion(agua === 'no', ROJO)} onClick={() => setAgua('no')}>No</button>
      </div>

      <p style={pregunta}><HeartPulse size={14} strokeWidth={1.75} color="var(--ink-3)" /> ¿Cómo te sentiste hoy?</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {CARAS.map(({ Ico, label, color }, i) => {
          const on = animo === i + 1;
          return (
            <button key={i} onClick={() => setAnimo(i + 1)} aria-label={label} aria-pressed={on}
              style={{ ...opcion(on, color), flexDirection: 'column', gap: 4, padding: '8px 3px', minHeight: 62 }}>
              <Ico size={24} strokeWidth={on ? 2.1 : 1.8} color={on ? '#fff' : color} />
              <span style={{ fontSize: 9.5, fontWeight: on ? 600 : 500, lineHeight: 1.15, textAlign: 'center', color: on ? '#fff' : 'var(--ink-2)' }}>{label}</span>
            </button>
          );
        })}
      </div>

      <button onClick={guardar} disabled={!completo || guardando}
        style={btnNavy({
          width: '100%', minHeight: 50, fontSize: 14.5,
          background: completo ? 'linear-gradient(180deg,#14355F,var(--ink))' : 'var(--line)',
          color: completo ? '#fff' : 'var(--ink-3)',
          boxShadow: completo ? '0 8px 18px -10px rgba(11,31,59,.55)' : 'none',
          cursor: completo ? 'pointer' : 'not-allowed',
        })}>
        {guardando ? 'Guardando…' : completo ? 'Guardar mi check-in' : 'Responde las 4 preguntas'}
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
      <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14 }}>
        {plan.fase ? `Fase: ${plan.fase}` : 'Plan de entrenamiento'}{plan.entorno ? ` · ${plan.entorno}` : ''}
      </p>
      <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        {plan.semanas ? `${plan.semanas} semanas · ` : ''}{items.length} ejercicios · {plan.terapeuta_nombre || 'Fisioterapia IMC'}
      </p>

      {plan.notas_alarma && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FFF6F2', border: '1px solid #F6D9C9', borderRadius: 12, padding: '12px 13px', marginBottom: 14 }}>
          <AlertTriangle size={16} strokeWidth={1.9} color="#C25A00" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: '0 0 3px', fontSize: 12.5, fontWeight: 600, color: '#8A4200' }}>Señales de alarma</p>
            <p style={{ margin: 0, fontSize: 12.5, color: '#8A4200', lineHeight: 1.5 }}>{plan.notas_alarma}</p>
          </div>
        </div>
      )}

      <button onClick={() => setAbierto(!abierto)}
        style={{ minHeight: 46, width: '100%', padding: '0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
        {abierto ? <ChevronUp size={16} strokeWidth={1.85} /> : <ChevronDown size={16} strokeWidth={1.85} />}
        {abierto ? 'Ocultar ejercicios' : 'Ver mis ejercicios'}
      </button>

      {abierto && (
        <div style={{ marginTop: 14 }}>
          {Object.entries(porDia).map(([dia, ejercicios]) => (
            <div key={dia} style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.12em' }}>{dia}</p>
              <div style={{ display: 'grid', gap: 6 }}>
                {ejercicios.map((it, i) => {
                  const ex = ejerciciosCat[it.ejercicio_id];
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '11px 13px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 11 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500, minWidth: 0 }}>{ex?.nombre || 'Ejercicio'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-deep)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {it.series && it.repeticiones ? `${it.series} × ${it.repeticiones}${ex?.unidad ? ' ' + ex.unidad : ''}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {plan.notas_generales && (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <StickyNote size={13} strokeWidth={1.75} color="var(--ink-3)" style={{ flexShrink: 0, marginTop: 2 }} />
              {plan.notas_generales}
            </p>
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
  const W = 560, H = 170, PAD = 34;
  const vals = pesos.map(p => p.peso);
  const min = Math.min(...vals), max = Math.max(...vals);
  const rango = max - min || 1;
  const x = i => PAD + (i / (pesos.length - 1)) * (W - PAD * 2);
  const y = v => H - PAD - ((v - min) / rango) * (H - PAD * 2);
  const path = pesos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.peso).toFixed(1)}`).join(' ');
  const area = path + ` L ${x(pesos.length - 1).toFixed(1)} ${H - PAD} L ${PAD} ${H - PAD} Z`;
  const primero = pesos[0].peso, ultimo = pesos[pesos.length - 1].peso;
  const delta = +(ultimo - primero).toFixed(1);
  const bajando = delta <= 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-.02em' }}>{ultimo}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-3)', marginLeft: 4 }}>kg hoy</span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 11px', borderRadius: 9, background: (bajando ? VERDE : NARANJA) + '14', color: bajando ? VERDE : NARANJA, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {delta > 0 ? '+' : ''}{delta} kg desde el inicio
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="gradPesoPac" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E7CB5" stopOpacity=".18" />
            <stop offset="100%" stopColor="#1E7CB5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#E6EDF6" strokeWidth="1" />
        <path d={area} fill="url(#gradPesoPac)" />
        <path d={path} fill="none" stroke="#1E7CB5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pesos.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.peso)} r={i === pesos.length - 1 ? 5 : 3.4}
            fill="#fff" stroke="#0B1F3B" strokeWidth={i === pesos.length - 1 ? 2.4 : 1.6} />
        ))}
        <text x={PAD} y={y(primero) - 11} fontSize="11" fill="#7C8DA1">{primero}</text>
        <text x={x(pesos.length - 1)} y={y(ultimo) - 13} fontSize="11.5" fill="#0B1F3B" fontWeight="600" textAnchor="end">{ultimo}</text>
      </svg>

      <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Info size={12} strokeWidth={1.75} />
        {fmtFechaCorta(pesos[0].fecha)} → {fmtFechaCorta(pesos[pesos.length - 1].fecha)} · según tus controles en IMC
      </p>
    </div>
  );
}
