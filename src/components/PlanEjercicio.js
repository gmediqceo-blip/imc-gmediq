import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generarGuia } from './Documentos';
import { Icon } from './v2/Icon';

// ═══════════════════════════════════════════════════════════════════════
// PlanEjercicio.js — armador de rutinas, capa visual v2
//
// Lo que NO cambió: props, fetchEjercicios, el filtrado del banco por entorno /
// categoría / búsqueda, addEx / removeEx / updateEx, el insert del plan +
// plan_ejercicios, el update del editor (borra e re-inserta), la impresión con
// generarGuia, y el agrupado por día. Los dos modales siguen siendo pantalla
// completa a dos columnas (banco | plan semanal): es la densidad que el
// fisioterapeuta necesita para armar siete días de una vez.
//
// Cambia la presentación: tokens, Poppins, iconos Lucide y —lo nuevo— la
// miniatura de cada ejercicio desde ejercicios.imagen_url, tanto en el banco
// como en las tarjetas del plan.
// ═══════════════════════════════════════════════════════════════════════

const VERDE = '#1A7A4A', ROJO = '#B02020', NARANJA = '#C25A00';
const FUENTE = "'Poppins', system-ui, sans-serif";

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CAT_LABELS = { aerobico: 'Aeróbico', tren_inferior: 'Tren Inferior', tren_superior: 'Tren Superior', core: 'Core', respiratorio: 'Respiratorio', movilidad: 'Movilidad' };
const CAT_COLORS = { aerobico: '#1E7CB5', tren_inferior: '#0B1F3B', tren_superior: '#4B647A', core: '#C25A00', respiratorio: '#7B2D8B', movilidad: '#7B2D8B' };
const CAT_ICONS = { aerobico: 'activity', tren_inferior: 'dumbbell', tren_superior: 'dumbbell', core: 'target', respiratorio: 'activity', movilidad: 'refresh-cw' };
const LEVEL_COLORS = { bajo: VERDE, medio: NARANJA, alto: ROJO };
const ENTORNO_ICON = { gym: 'building', casa: 'home', ambos: 'check-circle-2' };

const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Miniatura del ejercicio: usa imagen_url del banco; si falta o no carga, el icono
// de la categoría. Estado propio de fallo — una URL muerta sigue siendo string.
function MiniEjercicio({ ex, size = 34, radius = 8 }) {
  const [falla, setFalla] = useState(false);
  const col = CAT_COLORS[ex?.categoria] || '#4B647A';
  const conImg = !!ex?.imagen_url && !falla;
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0, background: conImg ? 'var(--surface-2)' : col + '14', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {conImg
        ? <img src={ex.imagen_url} alt={ex.nombre} onError={() => setFalla(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <Icon name={CAT_ICONS[ex?.categoria] || 'dumbbell'} size={size * 0.5} color={col} strokeWidth={1.7} />}
    </div>
  );
}

// ── Estilos compartidos (v2) ──────────────────────────────────────────
const btnPrimario = (extra = {}) => ({ height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(180deg,#14355F,var(--ink))', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)', ...extra });
const btnMini = (extra = {}) => ({ height: 30, padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 9, fontWeight: 500, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', ...extra });
const controlChip = (on) => ({ height: 32, padding: '0 12px', borderRadius: 9, border: '1px solid ' + (on ? 'var(--ink)' : 'var(--line)'), background: on ? 'var(--ink)' : 'var(--surface)', color: on ? '#fff' : 'var(--ink-2)', fontWeight: on ? 600 : 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' });
const inputFull = { width: '100%', height: 38, padding: '0 11px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const inputMini = { width: '100%', height: 32, padding: '0 8px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' };
const labelMini = { fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 };
const eyebrow = { fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.12em', margin: 0 };

const headerFull = () => ({ background: 'linear-gradient(180deg,#14355F,var(--ink))', padding: '15px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexShrink: 0 });
const cerrarFull = (onClose) => (
  <button onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer' }}>
    <Icon name="x" size={17} strokeWidth={2} />
  </button>
);
const selectHeader = { height: 34, padding: '0 10px', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, color: '#fff', fontSize: 12.5, outline: 'none', fontFamily: 'inherit' };

export default function PlanEjercicio({ paciente, planes, valoraciones, onActualizar, usuario }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [planEditar, setPlanEditar] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = VERDE) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => { fetchEjercicios(); }, []);

  const fetchEjercicios = async () => {
    const { data } = await supabase.from('ejercicios').select('*').eq('activo', true).order('categoria').order('nombre');
    setEjercicios(data || []);
  };

  return (
    <div style={{ fontFamily: FUENTE, color: 'var(--ink)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0 }}>
          {planes.length} plan{planes.length !== 1 ? 'es' : ''} de ejercicio
        </p>
        {valoraciones.length > 0
          ? <button onClick={() => setModalNuevo(true)} style={btnPrimario()}><Icon name="plus" size={16} color="#fff" /> Nuevo plan</button>
          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: NARANJA, fontWeight: 500 }}>
              <Icon name="alert-triangle" size={15} color={NARANJA} /> Primero registra una valoración
            </span>
        }
      </div>

      {planes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--sh-1)' }}>
          <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: 'var(--accent-wash)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Icon name="dumbbell" size={22} color="var(--accent)" />
          </span>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Sin planes de ejercicio</p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 16px' }}>Arma la primera rutina de este paciente.</p>
          {valoraciones.length > 0 && (
            <button onClick={() => setModalNuevo(true)} style={btnPrimario()}><Icon name="plus" size={16} color="#fff" /> Crear primer plan</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {planes.map(pl => (
            <PlanCard key={pl.id} plan={pl} paciente={paciente} ejercicios={ejercicios} valoracion={valoraciones[0] || null} onEditar={() => setPlanEditar(pl)} />
          ))}
        </div>
      )}

      {modalNuevo && (
        <ModalArmadorPlan paciente={paciente} valoracion={valoraciones[0]} ejercicios={ejercicios} usuario={usuario}
          onClose={() => setModalNuevo(false)}
          onGuardado={() => { onActualizar(); setModalNuevo(false); showToast('Plan guardado'); }} />
      )}

      {planEditar && (
        <ModalEditarPlan plan={planEditar} paciente={paciente} ejercicios={ejercicios} usuario={usuario}
          onClose={() => setPlanEditar(null)}
          onGuardado={() => { onActualizar(); setPlanEditar(null); showToast('Plan actualizado'); }} />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ink)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 500, fontSize: 13.5, zIndex: 9999, boxShadow: 'var(--sh-nav)', fontFamily: FUENTE }}>
          <Icon name="check-circle-2" size={16} color="#6EE7A8" /> {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── PLAN CARD ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, paciente, ejercicios, valoracion, onEditar }) {
  const [open, setOpen] = useState(false);
  const exById = {};
  ejercicios.forEach(e => exById[e.id] = e);

  const diasActivos = (plan.plan_ejercicios || []).reduce((acc, pe) => {
    if (!acc[pe.dia]) acc[pe.dia] = [];
    acc[pe.dia].push(pe);
    return acc;
  }, {});
  const totalEjs = plan.plan_ejercicios?.length || 0;
  const diasCount = Object.keys(diasActivos).length;
  const entIcon = ENTORNO_ICON[plan.entorno] || 'building';
  const entLabel = plan.entorno === 'casa' ? 'Casa' : plan.entorno === 'ambos' ? 'Ambos' : 'Gimnasio';

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', boxShadow: 'var(--sh-1)', overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '15px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>{fmtDate(plan.fecha)} · Fase {plan.fase}</p>
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '0 0 9px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{plan.terapeuta_nombre || '—'}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name={entIcon} size={13} color="var(--ink-3)" /> {entLabel}</span>
            <span>· {diasCount} días · {totalEjs} ejercicios</span>
          </p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {DAYS.filter(d => diasActivos[d]).map(d => (
              <span key={d} style={{ background: 'var(--accent-wash)', color: 'var(--accent-deep)', padding: '3px 9px', borderRadius: 7, fontSize: 10.5, fontWeight: 600 }}>{d.slice(0, 3)}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={e => { e.stopPropagation(); imprimirPlan(paciente, plan, ejercicios, valoracion); }} style={btnMini()}>
            <Icon name="printer" size={13} color="var(--ink-3)" /> Imprimir
          </button>
          <button onClick={e => { e.stopPropagation(); onEditar && onEditar(); }} style={btnMini()}>
            <Icon name="edit" size={13} color="var(--ink-3)" /> Editar
          </button>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={17} color="var(--ink-3)" />
        </div>
      </div>

      {open && (
        <div style={{ padding: '4px 18px 18px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)' }}>
          {DAYS.filter(d => diasActivos[d]).map(dia => (
            <div key={dia} style={{ marginTop: 16 }}>
              <p style={{ ...eyebrow, margin: '0 0 10px', paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>{dia}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 8 }}>
                {diasActivos[dia].sort((a, b) => a.orden - b.orden).map(pe => {
                  const ex = exById[pe.ejercicio_id];
                  if (!ex) return null;
                  return (
                    <div key={pe.id} style={{ background: 'var(--surface)', borderRadius: 10, padding: 9, border: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <MiniEjercicio ex={ex} size={42} radius={9} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 12.5, margin: '0 0 3px' }}>{ex.nombre}</p>
                        <p style={{ fontSize: 11.5, color: 'var(--accent-deep)', margin: 0, fontWeight: 500 }}>
                          {pe.series && pe.repeticiones ? `${pe.series} × ${pe.repeticiones} ${ex.unidad || ''}` : ''}
                          {pe.carga ? ` · ${pe.carga}` : ''}
                        </p>
                        {pe.nota && <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '3px 0 0' }}>{pe.nota}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {plan.notas_generales && (
            <div style={{ marginTop: 14, background: 'var(--accent-wash)', border: '1px solid #DCEAF6', borderRadius: 10, padding: '11px 14px' }}>
              <p style={{ ...eyebrow, color: 'var(--accent-deep)', margin: '0 0 4px' }}>Notas</p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>{plan.notas_generales}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MODAL ARMADOR DE PLAN ─────────────────────────────────────────────────────
function ModalArmadorPlan({ paciente, valoracion, ejercicios, usuario, onClose, onGuardado }) {
  const [config, setConfig] = useState({
    fecha: new Date().toISOString().split('T')[0],
    terapeuta_nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : '',
    fase: '1', entorno: 'gym', notas_generales: '',
  });
  const [selectedDay, setSelectedDay] = useState('Lunes');
  const [dayExercises, setDayExercises] = useState({ Lunes: [], Martes: [], 'Miércoles': [], Jueves: [], Viernes: [], Sábado: [], Domingo: [] });
  const [exSearch, setExSearch] = useState('');
  const [exCat, setExCat] = useState('all');
  const [guardando, setGuardando] = useState(false);

  const filteredEx = ejercicios.filter(e => {
    const ms = e.nombre.toLowerCase().includes(exSearch.toLowerCase());
    const mc = exCat === 'all' || e.categoria === exCat;
    const env = config.entorno === 'gym'
      ? (e.entorno === 'gym' || e.entorno === 'ambos')
      : (e.entorno === 'casa' || e.entorno === 'ambos');
    return ms && mc && env;
  });

  const addEx = (ex) => {
    const current = dayExercises[selectedDay] || [];
    if (current.find(e => e.ejercicio_id === ex.id)) return;
    setDayExercises(prev => ({
      ...prev,
      [selectedDay]: [...current, {
        ejercicio_id: ex.id, nombre: ex.nombre, categoria: ex.categoria, unidad: ex.unidad,
        series: '3', repeticiones: ex.categoria === 'aerobico' ? '20' : '10',
        carga: ex.categoria === 'aerobico' ? 'Zona 2' : '30% 1RM', nota: '', orden: current.length,
      }]
    }));
  };
  const removeEx = (day, exId) => setDayExercises(prev => ({ ...prev, [day]: prev[day].filter(e => e.ejercicio_id !== exId) }));
  const updateEx = (day, exId, field, val) => setDayExercises(prev => ({ ...prev, [day]: prev[day].map(e => e.ejercicio_id === exId ? { ...e, [field]: val } : e) }));

  const totalEjs = Object.values(dayExercises).flat().length;
  const diasActivos = Object.values(dayExercises).filter(d => d.length > 0).length;

  const guardar = async () => {
    if (totalEjs === 0) return alert('Agrega al menos un ejercicio');
    setGuardando(true);
    const { data: plan, error } = await supabase.from('planes_ejercicio').insert([{
      paciente_id: paciente.id, valoracion_id: valoracion?.id, terapeuta_id: usuario?.id,
      terapeuta_nombre: config.terapeuta_nombre, fecha: config.fecha, fase: config.fase,
      entorno: config.entorno, notas_generales: config.notas_generales, activo: true,
    }]).select().single();
    if (error || !plan) { setGuardando(false); return; }
    const planEjs = Object.entries(dayExercises).flatMap(([dia, exs]) =>
      exs.map((e, idx) => ({ plan_id: plan.id, dia, ejercicio_id: e.ejercicio_id, orden: idx, series: e.series, repeticiones: e.repeticiones, carga: e.carga, nota: e.nota }))
    );
    if (planEjs.length > 0) await supabase.from('plan_ejercicios').insert(planEjs);
    onGuardado();
    setGuardando(false);
  };

  const F = ({ label, value, onChange, opts, half }) => (
    <div style={{ flex: half ? '0 0 48%' : '0 0 100%', marginBottom: 10 }}>
      <label style={labelMini}>{label}</label>
      {opts
        ? <select value={value} onChange={e => onChange(e.target.value)} style={inputFull}>{opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
        : <input value={value} onChange={e => onChange(e.target.value)} style={inputFull} />}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.85)', display: 'flex', alignItems: 'stretch', zIndex: 1000, fontFamily: FUENTE, color: 'var(--ink)' }}>
      <div style={{ background: 'var(--canvas)', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={headerFull()}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 15.5, margin: 0, letterSpacing: '-.01em' }}>Armador de plan de ejercicio</p>
            <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, margin: '2px 0 0' }}>{paciente.nombre} {paciente.apellido} · {diasActivos} días · {totalEjs} ejercicios</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={guardar} disabled={guardando} style={{ height: 38, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando…' : <><Icon name="save" size={16} color="#fff" /> Guardar plan</>}
            </button>
            {cerrarFull(onClose)}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '330px 1fr', flex: 1, overflow: 'hidden' }}>
          {/* IZQ — config + banco */}
          <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--surface)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
                <F label="Fecha" value={config.fecha} onChange={v => setConfig(p => ({ ...p, fecha: v }))} half />
                <F label="Fase" value={config.fase} onChange={v => setConfig(p => ({ ...p, fase: v }))}
                  opts={[{ v: '1', l: 'Fase 1 — Aprendizaje' }, { v: '2', l: 'Fase 2 — Adaptación' }, { v: '3', l: 'Fase 3 — Fuerza' }, { v: '4', l: 'Fase 4 — Hipertrofia' }]} half />
                <F label="Entorno" value={config.entorno} onChange={v => setConfig(p => ({ ...p, entorno: v }))}
                  opts={[{ v: 'gym', l: 'Gimnasio' }, { v: 'casa', l: 'Casa' }]} half />
                <F label="Terapeuta" value={config.terapeuta_nombre} onChange={v => setConfig(p => ({ ...p, terapeuta_nombre: v }))} half />
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <p style={{ ...eyebrow, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="library" size={13} color="var(--ink-3)" /> Banco · día activo: <span style={{ color: 'var(--accent)' }}>{selectedDay}</span>
              </p>
              <input value={exSearch} onChange={e => setExSearch(e.target.value)} placeholder="Buscar ejercicio…" style={{ ...inputFull, marginBottom: 6 }} />
              <select value={exCat} onChange={e => setExCat(e.target.value)} style={inputFull}>
                <option value="all">Todas las categorías</option>
                {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
              {filteredEx.map(ex => {
                const inDay = (dayExercises[selectedDay] || []).find(e => e.ejercicio_id === ex.id);
                return (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 7, borderRadius: 10, marginBottom: 5, background: inDay ? 'var(--accent-wash)' : 'var(--surface-2)', border: '1px solid ' + (inDay ? '#CFE3F3' : 'var(--line)') }}>
                    <MiniEjercicio ex={ex} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 12, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.nombre}</p>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <span style={{ fontSize: 9.5, background: (CAT_COLORS[ex.categoria] || '#4B647A') + '1F', color: CAT_COLORS[ex.categoria] || '#4B647A', padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>{CAT_LABELS[ex.categoria]?.split(' ')[0]}</span>
                        <span style={{ fontSize: 9.5, background: (LEVEL_COLORS[ex.nivel] || '#4B647A') + '1F', color: LEVEL_COLORS[ex.nivel] || '#4B647A', padding: '1px 5px', borderRadius: 6, fontWeight: 600, textTransform: 'capitalize' }}>{ex.nivel}</span>
                      </div>
                    </div>
                    <button onClick={() => addEx(ex)} disabled={!!inDay} aria-label="Agregar al día"
                      style={{ width: 30, height: 30, borderRadius: 9, background: inDay ? 'var(--line)' : 'var(--accent)', color: inDay ? 'var(--ink-3)' : '#fff', border: 'none', cursor: inDay ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={inDay ? 'check' : 'plus'} size={16} strokeWidth={2.2} color={inDay ? 'var(--ink-3)' : '#fff'} />
                    </button>
                  </div>
                );
              })}
              {filteredEx.length === 0 && <p style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 20, fontSize: 12.5 }}>Sin ejercicios para este filtro.</p>}
            </div>
          </div>

          {/* DER — plan semanal */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, background: 'var(--surface)' }}>
              {DAYS.map(day => {
                const count = (dayExercises[day] || []).length;
                const on = selectedDay === day;
                return (
                  <button key={day} onClick={() => setSelectedDay(day)} style={{ ...controlChip(on), position: 'relative', paddingRight: count > 0 ? 26 : 12, background: on ? 'var(--ink)' : count > 0 ? 'var(--accent-wash)' : 'var(--surface)', color: on ? '#fff' : count > 0 ? 'var(--accent-deep)' : 'var(--ink-3)', borderColor: on ? 'var(--ink)' : count > 0 ? '#CFE3F3' : 'var(--line)' }}>
                    {day.slice(0, 3)}
                    {count > 0 && <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: on ? '#fff' : 'var(--accent)', color: on ? 'var(--ink)' : '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 12px', letterSpacing: '-.01em' }}>{selectedDay}</p>
              {(dayExercises[selectedDay] || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--ink-3)', border: '1.5px dashed var(--line)', borderRadius: 12, background: 'var(--surface)' }}>
                  <Icon name="plus-circle" size={26} color="var(--ink-3)" strokeWidth={1.5} />
                  <p style={{ fontSize: 13, margin: '10px 0 0' }}>Agrega ejercicios desde el banco</p>
                </div>
              ) : (
                (dayExercises[selectedDay] || []).map(de => {
                  const ex = ejercicios.find(e => e.id === de.ejercicio_id);
                  return (
                    <div key={de.ejercicio_id} style={{ background: 'var(--surface)', borderRadius: 12, padding: '13px 14px', marginBottom: 10, border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 11, gap: 10 }}>
                        <div style={{ display: 'flex', gap: 11, alignItems: 'center', minWidth: 0 }}>
                          <MiniEjercicio ex={ex} size={40} radius={9} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>{de.nombre}</p>
                            <span style={{ fontSize: 9.5, background: (CAT_COLORS[de.categoria] || '#4B647A') + '1F', color: CAT_COLORS[de.categoria] || '#4B647A', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{CAT_LABELS[de.categoria]}</span>
                          </div>
                        </div>
                        <button onClick={() => removeEx(selectedDay, de.ejercicio_id)} aria-label="Quitar" style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#FBEAEA', color: ROJO, border: 'none', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
                          <Icon name="trash-2" size={14} color={ROJO} />
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 8 }}>
                        {[
                          { label: 'Series', field: 'series', placeholder: '3' },
                          { label: de.unidad || 'Reps', field: 'repeticiones', placeholder: '10' },
                          { label: 'Carga/FC', field: 'carga', placeholder: '30%' },
                          { label: 'Nota clínica', field: 'nota', placeholder: 'Observación…' },
                        ].map(({ label, field, placeholder }) => (
                          <div key={field}>
                            <label style={labelMini}>{label}</label>
                            <input value={de[field] || ''} onChange={e => updateEx(selectedDay, de.ejercicio_id, field, e.target.value)} placeholder={placeholder} style={inputMini} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', flexShrink: 0, background: 'var(--surface)' }}>
              <label style={labelMini}>Notas generales del plan</label>
              <textarea value={config.notas_generales} onChange={e => setConfig(p => ({ ...p, notas_generales: e.target.value }))} rows={2}
                style={{ ...inputFull, height: 'auto', padding: '8px 11px', resize: 'none', lineHeight: 1.5 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MODAL EDITAR PLAN ─────────────────────────────────────────────────────────
function ModalEditarPlan({ plan, paciente, ejercicios, usuario, onClose, onGuardado }) {
  const exById = {};
  ejercicios.forEach(e => exById[e.id] = e);

  const initDias = () => {
    const d = {};
    DAYS.forEach(dia => d[dia] = []);
    (plan.plan_ejercicios || []).forEach(pe => { if (!d[pe.dia]) d[pe.dia] = []; d[pe.dia].push({ ...pe }); });
    return d;
  };

  const [diasEjercicios, setDiasEjercicios] = useState(initDias());
  const [fase, setFase] = useState(plan.fase || '1');
  const [entorno, setEntorno] = useState(plan.entorno || 'gym');
  const [notas, setNotas] = useState(plan.notas_generales || '');
  const [diaActivo, setDiaActivo] = useState('Lunes');
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [catFiltro, setCatFiltro] = useState('Todos');

  const categorias = ['Todos', ...new Set(ejercicios.map(e => e.categoria).filter(Boolean))];
  const ejsFiltrados = ejercicios.filter(e =>
    (catFiltro === 'Todos' || e.categoria === catFiltro) &&
    (entorno === 'ambos' || e.entorno === entorno || e.entorno === 'ambos') &&
    e.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const addEjercicio = (ej) => setDiasEjercicios(prev => ({ ...prev, [diaActivo]: [...(prev[diaActivo] || []), { ejercicio_id: ej.id, dia: diaActivo, series: '3', repeticiones: '12', carga: '', nota: '', orden: prev[diaActivo]?.length || 0, _nuevo: true }] }));
  const removeEjercicio = (dia, idx) => setDiasEjercicios(prev => ({ ...prev, [dia]: prev[dia].filter((_, i) => i !== idx) }));
  const updateEjField = (dia, idx, field, val) => setDiasEjercicios(prev => ({ ...prev, [dia]: prev[dia].map((pe, i) => i === idx ? { ...pe, [field]: val } : pe) }));

  const guardar = async () => {
    setGuardando(true);
    await supabase.from('planes_ejercicio').update({ fase, entorno, notas_generales: notas || null }).eq('id', plan.id);
    await supabase.from('plan_ejercicios').delete().eq('plan_id', plan.id);
    const nuevos = [];
    DAYS.forEach(dia => {
      (diasEjercicios[dia] || []).forEach((pe, idx) => {
        nuevos.push({ plan_id: plan.id, dia, ejercicio_id: pe.ejercicio_id, series: pe.series || '3', repeticiones: pe.repeticiones || '12', carga: pe.carga || '', nota: pe.nota || '', orden: idx });
      });
    });
    if (nuevos.length > 0) await supabase.from('plan_ejercicios').insert(nuevos);
    onGuardado();
    setGuardando(false);
  };

  const totalEjs = DAYS.reduce((acc, d) => acc + (diasEjercicios[d]?.length || 0), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.87)', display: 'flex', alignItems: 'stretch', zIndex: 1000, fontFamily: FUENTE, color: 'var(--ink)' }}>
      <div style={{ background: 'var(--canvas)', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={headerFull()}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 15.5, margin: 0, letterSpacing: '-.01em' }}>Editar plan de ejercicio</p>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, margin: '2px 0 0' }}>{paciente.nombre} {paciente.apellido} · {totalEjs} ejercicios</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select value={fase} onChange={e => setFase(e.target.value)} style={selectHeader}>
              {['1', '2', '3', '4', '5'].map(f => <option key={f} value={f} style={{ color: 'var(--ink)' }}>Fase {f}</option>)}
            </select>
            <select value={entorno} onChange={e => setEntorno(e.target.value)} style={selectHeader}>
              <option value="gym" style={{ color: 'var(--ink)' }}>Gimnasio</option>
              <option value="casa" style={{ color: 'var(--ink)' }}>Casa</option>
              <option value="ambos" style={{ color: 'var(--ink)' }}>Ambos</option>
            </select>
            <button onClick={guardar} disabled={guardando} style={{ height: 38, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, background: VERDE, color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando…' : <><Icon name="save" size={16} color="#fff" /> Guardar cambios</>}
            </button>
            {cerrarFull(onClose)}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', display: 'flex', paddingLeft: 16, flexShrink: 0, overflowX: 'auto' }}>
          {DAYS.map(dia => {
            const count = diasEjercicios[dia]?.length || 0;
            const on = diaActivo === dia;
            return (
              <button key={dia} onClick={() => setDiaActivo(dia)} style={{ padding: '11px 14px', border: 'none', background: 'none', fontWeight: on ? 600 : 500, fontSize: 12.5, cursor: 'pointer', color: on ? 'var(--ink)' : 'var(--ink-3)', borderBottom: '2px solid ' + (on ? 'var(--accent)' : 'transparent'), marginBottom: -1, whiteSpace: 'nowrap', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                {dia.slice(0, 3)}
                {count > 0 && <span style={{ background: on ? 'var(--accent)' : 'var(--line)', color: on ? '#fff' : 'var(--ink-2)', borderRadius: 9, fontSize: 9.5, padding: '1px 6px', fontWeight: 700 }}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 340px' }}>
          <div style={{ overflowY: 'auto', padding: '16px 18px' }}>
            <p style={{ ...eyebrow, margin: '0 0 12px' }}>{diaActivo} — {diasEjercicios[diaActivo]?.length || 0} ejercicios</p>
            {(diasEjercicios[diaActivo] || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 44, color: 'var(--ink-3)', background: 'var(--surface)', borderRadius: 12, border: '1.5px dashed var(--line)' }}>
                <Icon name="plus-circle" size={24} color="var(--ink-3)" strokeWidth={1.5} />
                <p style={{ fontSize: 12.5, margin: '10px 0 0' }}>Agrega ejercicios desde el banco de la derecha</p>
              </div>
            ) : (
              (diasEjercicios[diaActivo] || []).map((pe, idx) => {
                const ex = exById[pe.ejercicio_id];
                if (!ex) return null;
                return (
                  <div key={idx} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)', padding: '13px 14px', marginBottom: 8, boxShadow: 'var(--sh-1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 10 }}>
                      <div style={{ display: 'flex', gap: 11, alignItems: 'center', minWidth: 0 }}>
                        <MiniEjercicio ex={ex} size={40} radius={9} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>{ex.nombre}</p>
                          <span style={{ fontSize: 9.5, background: (CAT_COLORS[ex.categoria] || '#4B647A') + '1F', color: CAT_COLORS[ex.categoria] || '#4B647A', padding: '2px 8px', borderRadius: 6, fontWeight: 600, textTransform: 'capitalize' }}>{ex.categoria}</span>
                        </div>
                      </div>
                      <button onClick={() => removeEjercicio(diaActivo, idx)} aria-label="Quitar" style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#FBEAEA', color: ROJO, border: 'none', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
                        <Icon name="trash-2" size={14} color={ROJO} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 8 }}>
                      {[['Series', 'series'], ['Reps', 'repeticiones'], ['Carga', 'carga'], ['Nota', 'nota']].map(([l, f]) => (
                        <div key={f}>
                          <label style={labelMini}>{l}</label>
                          <input value={pe[f] || ''} onChange={e => updateEjField(diaActivo, idx, f, e.target.value)} placeholder={l} style={inputMini} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            <div style={{ marginTop: 16 }}>
              <label style={labelMini}>Notas generales del plan</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} style={{ ...inputFull, height: 'auto', padding: '8px 11px', resize: 'none', lineHeight: 1.5 }} />
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <p style={{ ...eyebrow, margin: '0 0 8px' }}>Banco de ejercicios</p>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ejercicio…" style={{ ...inputFull, marginBottom: 6 }} />
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {categorias.slice(0, 6).map(cat => (
                  <button key={cat} onClick={() => setCatFiltro(cat)} style={{ ...controlChip(catFiltro === cat), height: 26, fontSize: 10.5, textTransform: 'capitalize' }}>{cat}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
              {ejsFiltrados.map(ej => {
                const inPlan = (diasEjercicios[diaActivo] || []).some(pe => pe.ejercicio_id === ej.id);
                return (
                  <div key={ej.id} onClick={() => !inPlan && addEjercicio(ej)} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: 8, borderRadius: 9, marginBottom: 5, cursor: inPlan ? 'default' : 'pointer', border: '1px solid ' + (inPlan ? '#BFE0CE' : 'var(--line)'), background: inPlan ? '#F2FBF6' : 'var(--surface-2)' }}>
                    <MiniEjercicio ex={ej} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 11.5, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ej.nombre}</p>
                      <p style={{ fontSize: 9.5, color: 'var(--ink-3)', margin: 0, textTransform: 'capitalize' }}>{ej.categoria} · {ej.nivel}</p>
                    </div>
                    {inPlan
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, color: VERDE, fontWeight: 600, flexShrink: 0 }}><Icon name="check" size={12} color={VERDE} /> En el día</span>
                      : <Icon name="plus" size={15} color="var(--accent)" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── IMPRIMIR PLAN ────────────────────────────────────────────────────────────
function imprimirPlan(paciente, plan, ejercicios, valoracion) {
  const planEjercicios = plan.plan_ejercicios || [];
  const html = generarGuia(paciente, valoracion, plan, planEjercicios, ejercicios);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
