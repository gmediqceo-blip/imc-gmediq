import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
  blueLt: '#E8F4FD',
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CAT_LABELS = { aerobico: 'Aeróbico', tren_inferior: 'Tren Inferior', tren_superior: 'Tren Superior', core: 'Core', respiratorio: 'Respiratorio', movilidad: 'Movilidad' };
const CAT_COLORS = { aerobico: B.blue, tren_inferior: B.navy, tren_superior: B.teal, core: B.orange, respiratorio: '#7B2D8B', movilidad: '#7B2D8B' };
const LEVEL_COLORS = { bajo: B.green, medio: B.orange, alto: B.red };

const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function PlanEjercicio({ paciente, planes, valoraciones, onActualizar, usuario }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [planEditar, setPlanEditar] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    fetchEjercicios();
  }, []);

  const fetchEjercicios = async () => {
    const { data } = await supabase.from('ejercicios').select('*').eq('activo', true).order('categoria').order('nombre');
    setEjercicios(data || []);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
          {planes.length} plan{planes.length !== 1 ? 'es' : ''}
        </p>
        {valoraciones.length > 0
          ? <button onClick={() => setModalNuevo(true)}
              style={{ padding: '9px 20px', background: B.navy, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Nuevo plan
            </button>
          : <p style={{ fontSize: 12, color: B.orange }}>⚠ Primero registra una valoración</p>
        }
      </div>

      {/* Lista de planes */}
      {planes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}` }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>🏋️</p>
          <p style={{ color: B.gray, marginBottom: 16 }}>No hay planes de ejercicio registrados.</p>
          {valoraciones.length > 0 && (
            <button onClick={() => setModalNuevo(true)}
              style={{ padding: '10px 22px', background: B.navy, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Crear primer plan
            </button>
          )}
        </div>
      ) : (
        planes.map(pl => (
          <PlanCard key={pl.id} plan={pl} paciente={paciente} ejercicios={ejercicios} onEditar={() => setPlanEditar(pl)} />
        ))
      )}

      {/* Modal armador */}
      {modalNuevo && (
        <ModalArmadorPlan
          paciente={paciente}
          valoracion={valoraciones[0]}
          ejercicios={ejercicios}
          usuario={usuario}
          onClose={() => setModalNuevo(false)}
          onGuardado={() => { onActualizar(); setModalNuevo(false); showToast('Plan guardado ✓'); }}
        />
      )}

      {planEditar && (
        <ModalEditarPlan
          plan={planEditar}
          paciente={paciente}
          ejercicios={ejercicios}
          usuario={usuario}
          onClose={() => setPlanEditar(null)}
          onGuardado={() => { onActualizar(); setPlanEditar(null); showToast('Plan actualizado ✓'); }}
        />
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  );
}

// ── PLAN CARD ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, paciente, ejercicios, onEditar }) {
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

  return (
    <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, marginBottom: 12, borderLeft: `4px solid ${B.navy}`, overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 4px' }}>
            {fmtDate(plan.fecha)} · Fase {plan.fase}
          </p>
          <p style={{ fontSize: 12, color: B.gray, margin: '0 0 6px' }}>
            {plan.terapeuta_nombre || '—'} · {plan.entorno === 'gym' ? '🏋️ Gimnasio' : '🏠 Casa'} · {diasCount} días · {totalEjs} ejercicios
          </p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {DAYS.filter(d => diasActivos[d]).map(d => (
              <span key={d} style={{ background: B.blueLt, color: B.blue, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{d.slice(0, 3)}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
          <button onClick={e => { e.stopPropagation(); imprimirPlan(paciente, plan, ejercicios); }}
            style={{ padding: '5px 12px', background: B.navy + '11', color: B.navy, border: `1px solid ${B.navy}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            🖨 Imprimir
          </button>
          <button onClick={e => { e.stopPropagation(); onEditar && onEditar(); }}
            style={{ padding: '5px 12px', background: B.blue + '11', color: B.blue, border: `1px solid ${B.blue}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            ✏️ Editar plan
          </button>
          <span style={{ color: B.navy, fontSize: 18 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${B.grayLt}` }}>
          {DAYS.filter(d => diasActivos[d]).map(dia => (
            <div key={dia} style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px', borderBottom: `2px solid ${B.blue}`, paddingBottom: 4 }}>{dia}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
                {diasActivos[dia].sort((a, b) => a.orden - b.orden).map(pe => {
                  const ex = exById[pe.ejercicio_id];
                  if (!ex) return null;
                  const col = CAT_COLORS[ex.categoria] || B.teal;
                  return (
                    <div key={pe.id} style={{ background: B.grayLt, borderRadius: 8, padding: '8px 10px', borderLeft: `3px solid ${col}` }}>
                      <p style={{ fontWeight: 600, fontSize: 12, color: B.navy, margin: '0 0 3px' }}>{ex.nombre}</p>
                      <p style={{ fontSize: 11, color: B.gray, margin: '0 0 2px' }}>
                        {pe.series && pe.repeticiones ? `${pe.series} × ${pe.repeticiones} ${ex.unidad}` : ''}
                        {pe.carga ? ` · ${pe.carga}` : ''}
                      </p>
                      {pe.nota && <p style={{ fontSize: 10, color: B.teal, margin: 0, fontStyle: 'italic' }}>{pe.nota}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {plan.notas_generales && (
            <div style={{ marginTop: 14, background: B.blueLt, borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: B.teal, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Notas</p>
              <p style={{ fontSize: 12, color: B.navy, margin: 0 }}>{plan.notas_generales}</p>
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
    fase: '1',
    entorno: 'gym',
    notas_generales: '',
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
        ejercicio_id: ex.id,
        nombre: ex.nombre,
        categoria: ex.categoria,
        unidad: ex.unidad,
        series: '3',
        repeticiones: ex.categoria === 'aerobico' ? '20' : '10',
        carga: ex.categoria === 'aerobico' ? 'Zona 2' : '30% 1RM',
        nota: '',
        orden: current.length,
      }]
    }));
  };

  const removeEx = (day, exId) => {
    setDayExercises(prev => ({ ...prev, [day]: prev[day].filter(e => e.ejercicio_id !== exId) }));
  };

  const updateEx = (day, exId, field, val) => {
    setDayExercises(prev => ({
      ...prev,
      [day]: prev[day].map(e => e.ejercicio_id === exId ? { ...e, [field]: val } : e)
    }));
  };

  const totalEjs = Object.values(dayExercises).flat().length;
  const diasActivos = Object.values(dayExercises).filter(d => d.length > 0).length;

  const guardar = async () => {
    if (totalEjs === 0) return alert('Agrega al menos un ejercicio');
    setGuardando(true);

    // Crear el plan
    const { data: plan, error } = await supabase.from('planes_ejercicio').insert([{
      paciente_id: paciente.id,
      valoracion_id: valoracion?.id,
      terapeuta_id: usuario?.id,
      terapeuta_nombre: config.terapeuta_nombre,
      fecha: config.fecha,
      fase: config.fase,
      entorno: config.entorno,
      notas_generales: config.notas_generales,
      activo: true,
    }]).select().single();

    if (error || !plan) { setGuardando(false); return; }

    // Insertar ejercicios del plan
    const planEjs = Object.entries(dayExercises).flatMap(([dia, exs]) =>
      exs.map((e, idx) => ({
        plan_id: plan.id,
        dia,
        ejercicio_id: e.ejercicio_id,
        orden: idx,
        series: e.series,
        repeticiones: e.repeticiones,
        carga: e.carga,
        nota: e.nota,
      }))
    );

    if (planEjs.length > 0) {
      await supabase.from('plan_ejercicios').insert(planEjs);
    }

    onGuardado();
    setGuardando(false);
  };

  const F = ({ label, value, onChange, opts, half }) => (
    <div style={{ flex: half ? '0 0 48%' : '0 0 100%', marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</label>
      {opts ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
          {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      )}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.8)', display: 'flex', alignItems: 'stretch', zIndex: 1000 }}>
      <div style={{ background: B.white, width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: B.navy, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>Armador de Plan de Ejercicio</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>{paciente.nombre} {paciente.apellido} · {diasActivos} días · {totalEjs} ejercicios</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '8px 20px', background: B.blue, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : '💾 Guardar plan'}
            </button>
            <button onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', borderRadius: 6, padding: '4px 10px' }}>✕</button>
          </div>
        </div>

        {/* Body — dos columnas */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, overflow: 'hidden' }}>

          {/* COLUMNA IZQ — Configuración + Banco */}
          <div style={{ borderRight: `1.5px solid ${B.grayMd}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Config */}
            <div style={{ padding: '14px 16px', borderBottom: `1.5px solid ${B.grayMd}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
                <F label="Fecha" value={config.fecha} onChange={v => setConfig(p => ({ ...p, fecha: v }))} half />
                <F label="Fase" value={config.fase} onChange={v => setConfig(p => ({ ...p, fase: v }))}
                  opts={[{ v: '1', l: 'Fase 1 — Aprendizaje' }, { v: '2', l: 'Fase 2 — Adaptación' }, { v: '3', l: 'Fase 3 — Fuerza' }, { v: '4', l: 'Fase 4 — Hipertrofia' }]} half />
                <F label="Entorno" value={config.entorno} onChange={v => setConfig(p => ({ ...p, entorno: v }))}
                  opts={[{ v: 'gym', l: '🏋️ Gimnasio' }, { v: 'casa', l: '🏠 Casa' }]} half />
                <F label="Terapeuta" value={config.terapeuta_nombre} onChange={v => setConfig(p => ({ ...p, terapeuta_nombre: v }))} half />
              </div>
            </div>

            {/* Banco de ejercicios */}
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${B.grayMd}`, flexShrink: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 11, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
                📚 Banco · Día activo: <span style={{ color: B.blue }}>{selectedDay}</span>
              </p>
              <input value={exSearch} onChange={e => setExSearch(e.target.value)} placeholder="Buscar ejercicio..."
                style={{ width: '100%', padding: '7px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', marginBottom: 6, boxSizing: 'border-box' }} />
              <select value={exCat} onChange={e => setExCat(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}>
                <option value="all">Todas las categorías</option>
                {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {/* Lista ejercicios */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
              {filteredEx.map(ex => {
                const inDay = (dayExercises[selectedDay] || []).find(e => e.ejercicio_id === ex.id);
                const col = CAT_COLORS[ex.categoria] || B.teal;
                return (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, marginBottom: 4, background: inDay ? B.blueLt : B.grayLt, border: `1px solid ${inDay ? B.blue + '44' : B.grayMd}` }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 12, color: B.navy, margin: '0 0 2px' }}>{ex.nombre}</p>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={{ fontSize: 9, background: col + '22', color: col, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>{CAT_LABELS[ex.categoria]?.split(' ')[0]}</span>
                        <span style={{ fontSize: 9, color: B.gray }}>{ex.entorno === 'gym' ? '🏋️' : ex.entorno === 'casa' ? '🏠' : '✓'}</span>
                        <span style={{ fontSize: 9, background: LEVEL_COLORS[ex.nivel] + '22', color: LEVEL_COLORS[ex.nivel], padding: '1px 5px', borderRadius: 8, fontWeight: 600 }}>{ex.nivel}</span>
                      </div>
                    </div>
                    <button onClick={() => addEx(ex)} disabled={!!inDay}
                      style={{ width: 28, height: 28, borderRadius: 14, background: inDay ? B.grayMd : B.blue, color: 'white', border: 'none', cursor: inDay ? 'default' : 'pointer', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {inDay ? '✓' : '+'}
                    </button>
                  </div>
                );
              })}
              {filteredEx.length === 0 && <p style={{ textAlign: 'center', color: B.gray, padding: 20, fontSize: 12 }}>Sin ejercicios para este filtro.</p>}
            </div>
          </div>

          {/* COLUMNA DER — Plan semanal */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Selector de días */}
            <div style={{ padding: '12px 16px', borderBottom: `1.5px solid ${B.grayMd}`, display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
              {DAYS.map(day => {
                const count = (dayExercises[day] || []).length;
                return (
                  <button key={day} onClick={() => setSelectedDay(day)}
                    style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${selectedDay === day ? B.blue : B.grayMd}`, background: selectedDay === day ? B.blue : count > 0 ? B.blueLt : B.white, color: selectedDay === day ? 'white' : count > 0 ? B.blue : B.gray, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', position: 'relative' }}>
                    {day.slice(0, 3)}
                    {count > 0 && (
                      <span style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, background: selectedDay === day ? 'white' : B.blue, color: selectedDay === day ? B.blue : 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Ejercicios del día seleccionado */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 12px' }}>{selectedDay}</p>

              {(dayExercises[selectedDay] || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: B.grayMd, border: `2px dashed ${B.grayMd}`, borderRadius: 12 }}>
                  <p style={{ fontSize: 28, marginBottom: 8 }}>+</p>
                  <p style={{ fontSize: 13 }}>Agrega ejercicios desde el banco</p>
                </div>
              ) : (
                (dayExercises[selectedDay] || []).map(de => {
                  const col = CAT_COLORS[de.categoria] || B.teal;
                  return (
                    <div key={de.ejercicio_id} style={{ background: B.grayLt, borderRadius: 10, padding: '12px 14px', marginBottom: 10, border: `1px solid ${B.grayMd}`, borderLeft: `4px solid ${col}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13, color: B.navy, margin: '0 0 3px' }}>{de.nombre}</p>
                          <span style={{ fontSize: 9, background: col + '22', color: col, padding: '1px 7px', borderRadius: 8, fontWeight: 700 }}>{CAT_LABELS[de.categoria]}</span>
                        </div>
                        <button onClick={() => removeEx(selectedDay, de.ejercicio_id)}
                          style={{ background: B.red + '22', color: B.red, border: `1px solid ${B.red}44`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 700, fontSize: 11, fontFamily: 'inherit' }}>✕</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 8 }}>
                        {[
                          { label: 'Series', field: 'series', placeholder: '3' },
                          { label: de.unidad || 'Reps', field: 'repeticiones', placeholder: '10' },
                          { label: 'Carga/FC', field: 'carga', placeholder: '30%' },
                          { label: 'Nota clínica', field: 'nota', placeholder: 'Observación...' },
                        ].map(({ label, field, placeholder }) => (
                          <div key={field}>
                            <label style={{ fontSize: 9, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>{label}</label>
                            <input value={de[field] || ''} onChange={e => updateEx(selectedDay, de.ejercicio_id, field, e.target.value)} placeholder={placeholder}
                              style={{ width: '100%', padding: '5px 7px', border: `1.5px solid ${B.grayMd}`, borderRadius: 5, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: 'white' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Notas generales */}
            <div style={{ padding: '12px 16px', borderTop: `1.5px solid ${B.grayMd}`, flexShrink: 0 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Notas generales del plan</label>
              <textarea value={config.notas_generales} onChange={e => setConfig(p => ({ ...p, notas_generales: e.target.value }))} rows={2}
                style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
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
    (plan.plan_ejercicios || []).forEach(pe => {
      if (!d[pe.dia]) d[pe.dia] = [];
      d[pe.dia].push({ ...pe });
    });
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

  const addEjercicio = (ej) => {
    setDiasEjercicios(prev => ({
      ...prev,
      [diaActivo]: [...(prev[diaActivo] || []), {
        ejercicio_id: ej.id, dia: diaActivo,
        series: '3', repeticiones: '12', carga: '', nota: '', orden: prev[diaActivo]?.length || 0,
        _nuevo: true
      }]
    }));
  };

  const removeEjercicio = (dia, idx) => {
    setDiasEjercicios(prev => ({ ...prev, [dia]: prev[dia].filter((_, i) => i !== idx) }));
  };

  const updateEjField = (dia, idx, field, val) => {
    setDiasEjercicios(prev => ({
      ...prev,
      [dia]: prev[dia].map((pe, i) => i === idx ? { ...pe, [field]: val } : pe)
    }));
  };

  const guardar = async () => {
    setGuardando(true);
    // Update plan header
    await supabase.from('planes_ejercicio').update({
      fase, entorno, notas_generales: notas || null
    }).eq('id', plan.id);

    // Delete all existing exercises and re-insert
    await supabase.from('plan_ejercicios').delete().eq('plan_id', plan.id);

    const nuevos = [];
    DAYS.forEach(dia => {
      (diasEjercicios[dia] || []).forEach((pe, idx) => {
        nuevos.push({
          plan_id: plan.id,
          dia,
          ejercicio_id: pe.ejercicio_id,
          series: pe.series || '3',
          repeticiones: pe.repeticiones || '12',
          carga: pe.carga || '',
          nota: pe.nota || '',
          orden: idx,
        });
      });
    });

    if (nuevos.length > 0) await supabase.from('plan_ejercicios').insert(nuevos);
    onGuardado();
    setGuardando(false);
  };

  const totalEjs = DAYS.reduce((acc, d) => acc + (diasEjercicios[d]?.length || 0), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.87)', display: 'flex', alignItems: 'stretch', zIndex: 1000 }}>
      <div style={{ background: B.grayLt, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: B.navy, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>✏️ Editar Plan de Ejercicio</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>{paciente.nombre} {paciente.apellido} · {totalEjs} ejercicios</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select value={fase} onChange={e => setFase(e.target.value)}
              style={{ padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, color: 'white', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
              {['1','2','3','4','5'].map(f => <option key={f} value={f} style={{ color: B.navy }}>Fase {f}</option>)}
            </select>
            <select value={entorno} onChange={e => setEntorno(e.target.value)}
              style={{ padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, color: 'white', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
              <option value="gym" style={{ color: B.navy }}>🏋️ Gimnasio</option>
              <option value="casa" style={{ color: B.navy }}>🏠 Casa</option>
              <option value="ambos" style={{ color: B.navy }}>🔄 Ambos</option>
            </select>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '8px 20px', background: B.green, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : '💾 Guardar cambios'}
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', borderRadius: 6, padding: '4px 10px' }}>✕</button>
          </div>
        </div>

        {/* Días */}
        <div style={{ background: B.white, borderBottom: `2px solid ${B.grayMd}`, display: 'flex', paddingLeft: 16, flexShrink: 0, overflowX: 'auto' }}>
          {DAYS.map(dia => {
            const count = diasEjercicios[dia]?.length || 0;
            return (
              <button key={dia} onClick={() => setDiaActivo(dia)}
                style={{ padding: '9px 14px', border: 'none', background: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: diaActivo === dia ? B.navy : B.gray, borderBottom: diaActivo === dia ? `3px solid ${B.navy}` : '3px solid transparent', whiteSpace: 'nowrap', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                {dia.slice(0,3)}
                {count > 0 && <span style={{ background: B.navy, color: 'white', borderRadius: 10, fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 340px' }}>
          {/* Plan del día actual */}
          <div style={{ overflowY: 'auto', padding: '16px 18px' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>
              {diaActivo} — {diasEjercicios[diaActivo]?.length || 0} ejercicios
            </p>
            {(diasEjercicios[diaActivo] || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: B.gray, background: B.white, borderRadius: 10, border: `1.5px dashed ${B.grayMd}` }}>
                <p style={{ fontSize: 24, marginBottom: 6 }}>➕</p>
                <p style={{ fontSize: 12 }}>Agrega ejercicios desde el banco de la derecha</p>
              </div>
            ) : (
              (diasEjercicios[diaActivo] || []).map((pe, idx) => {
                const ex = exById[pe.ejercicio_id];
                if (!ex) return null;
                const col = CAT_COLORS[ex.categoria] || B.teal;
                return (
                  <div key={idx} style={{ background: B.white, borderRadius: 9, border: `1.5px solid ${B.grayMd}`, padding: '12px 14px', marginBottom: 8, borderLeft: `4px solid ${col}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13, color: B.navy, margin: '0 0 2px' }}>{ex.nombre}</p>
                        <span style={{ fontSize: 9, background: col + '22', color: col, padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>{ex.categoria}</span>
                      </div>
                      <button onClick={() => removeEjercicio(diaActivo, idx)}
                        style={{ background: B.red + '22', color: B.red, border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 8 }}>
                      {[['Series', 'series'], ['Reps', 'repeticiones'], ['Carga', 'carga'], ['Nota', 'nota']].map(([l, f]) => (
                        <div key={f}>
                          <label style={{ fontSize: 8, fontWeight: 700, color: B.teal, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>{l}</label>
                          <input value={pe[f] || ''} onChange={e => updateEjField(diaActivo, idx, f, e.target.value)} placeholder={l}
                            style={{ width: '100%', padding: '5px 7px', border: `1.5px solid ${B.grayMd}`, borderRadius: 5, fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            {/* Notas generales */}
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Notas generales del plan</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>

          {/* Banco de ejercicios */}
          <div style={{ background: B.white, borderLeft: `2px solid ${B.grayMd}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${B.grayMd}`, flexShrink: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 11, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Banco de ejercicios</p>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ejercicio..."
                style={{ width: '100%', padding: '7px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 6 }} />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {categorias.slice(0, 6).map(cat => (
                  <button key={cat} onClick={() => setCatFiltro(cat)}
                    style={{ padding: '3px 8px', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: catFiltro === cat ? B.navy : B.grayLt, color: catFiltro === cat ? 'white' : B.gray, fontFamily: 'inherit' }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {ejsFiltrados.map(ej => {
                const inPlan = (diasEjercicios[diaActivo] || []).some(pe => pe.ejercicio_id === ej.id);
                const col = CAT_COLORS[ej.categoria] || B.teal;
                return (
                  <div key={ej.id} onClick={() => !inPlan && addEjercicio(ej)}
                    style={{ padding: '8px 10px', borderRadius: 7, marginBottom: 5, cursor: inPlan ? 'default' : 'pointer', border: `1px solid ${inPlan ? B.green : B.grayMd}`, background: inPlan ? B.green + '11' : B.grayLt, borderLeft: `3px solid ${col}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontWeight: 600, fontSize: 11, color: B.navy, margin: '0 0 2px' }}>{ej.nombre}</p>
                      {inPlan && <span style={{ fontSize: 9, color: B.green, fontWeight: 700 }}>✓ En el día</span>}
                    </div>
                    <p style={{ fontSize: 9, color: B.gray, margin: 0 }}>{ej.categoria} · {ej.nivel} · {ej.entorno}</p>
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
function imprimirPlan(paciente, plan, ejercicios) {
  const exById = {};
  ejercicios.forEach(e => exById[e.id] = e);
  const logoSrc = 'data:image/jpeg;base64,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FNUftFbrdcKyS5VNTHRMc2na+pjiY2JgLSTGREeN3JxLshT0Y9/Mjrya8JffrHSjNTM06/UdsF2fH1raHtLOtLeHiBDc5+jz93NejbrjQXa1wXK2VcNXR1DBJFPC8OZI0+BBHiFD7Nlr1HeGXCC+U9PC2+09zbbWd6FkUcDIscZj6wyDhIHe4cYyM5WZbYae1bpLR1JprUUlklpbfTR09LLb3Sl78ZyZA8ADyxj1VbUrEbiVq2tM6mGcIiLJqIiICIiAiIgIiICIiAiIgIiICIiAiIgIvh8Ucn042u94yvjstN/Ij/KFHccyLh7LTfyI/wAoTstN/Ij/AChO45l0oLxaqmZ8MFxpXyMkMT4xKOJrw7hLSPHOeS7bI2RjDGBo9BheMzSdkjvsV3jpnNqY5XzhxeXd54dnxzgZe84GBk5Uj8qNYaZpK2ppam8U8UlKQJi/IawlzW44sYyC9oIB5ZGcLifrnSjZZmC8wvMHH1pja54ZwOLXZLQQO81w9SOS61Vt7p6tvTrjUtqpMve8U7piYWl7mvkw32Oc0Eg8sk4xkrgdtnpoVU01MyqpBLGYjHTyBjWtzkBox3QDzAHsHig9GXW+lYaVlQ+9U/Vv8CA4kciSSAMgDhPFn6OOeF77XtfGHscHNcMhwOQR7ViUm3VhdFL1U1yp55mvZLVQ1bmyyB+es4nefETk+oGMYWUQUkFPQw0kbB1UTGxsB54AGB/7IOZFw9lpv5Ef5QnZab+RH+UKO45kXD2Wm/kR/lC+2QxRnLI2N9wwncfaIikEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQf/Z';
  const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('es-EC', {day:'2-digit',month:'long',year:'numeric'}) : '—';
  const age = paciente.fecha_nacimiento ? Math.floor((Date.now() - new Date(paciente.fecha_nacimiento).getTime()) / (365.25*24*3600*1000)) : 0;

  const diasEjs = {};
  (plan.plan_ejercicios || []).forEach(pe => {
    if (!diasEjs[pe.dia]) diasEjs[pe.dia] = [];
    diasEjs[pe.dia].push(pe);
  });
  const diasActivos = DAYS.filter(d => diasEjs[d]?.length > 0);

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Plan de Ejercicio — ${paciente.nombre}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:20px;color:#0B1F3B;}
    .page{background:white;max-width:760px;margin:0 auto;border-radius:6px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);}
    .header{background:#0B1F3B;padding:18px 28px;display:flex;justify-content:space-between;align-items:center;}
    .patient-bar{background:#1E7CB5;padding:10px 28px;display:flex;gap:20px;}
    .pb{color:rgba(255,255,255,0.5);font-size:9px;text-transform:uppercase;letter-spacing:1px;}
    .pb strong{color:white;display:block;font-size:12px;margin-bottom:1px;}
    .body{padding:22px 28px;}
    .dia-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#4B647A;border-bottom:2px solid #0B1F3B;padding-bottom:5px;margin:16px 0 10px;}
    table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:12px;}
    th{background:#0B1F3B;color:white;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;}
    td{padding:7px 10px;border-bottom:1px solid #F4F6F8;}
    tr:nth-child(even){background:#F4F6F8;}
    .footer{background:#0B1F3B;padding:10px 28px;display:flex;justify-content:space-between;}
    .footer p{color:rgba(255,255,255,0.4);font-size:9px;}
    .print-btn{position:fixed;bottom:20px;right:20px;background:#0B1F3B;color:white;border:none;padding:10px 22px;border-radius:25px;font-family:inherit;font-weight:700;font-size:13px;cursor:pointer;}
    @media print{body{background:white;padding:0;}.page{box-shadow:none;max-width:100%;}.print-btn{display:none;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}
  </style></head><body><div class="page">
  <div class="header">
    <img src="${logoSrc}" alt="IMC" style="height:48px;width:auto;">
    <div style="text-align:right;color:rgba(255,255,255,0.7);font-size:11px;">
      <strong style="color:white;display:block;font-size:13px;margin-bottom:2px;">Plan de Ejercicio — Fase ${plan.fase}</strong>
      ${fmtD(plan.fecha)} · ${plan.entorno === 'gym' ? 'Gimnasio' : 'Casa'} · ${plan.terapeuta_nombre || '—'}
    </div>
  </div>
  <div class="patient-bar">
    <div class="pb"><strong>${paciente.nombre} ${paciente.apellido}</strong>Paciente</div>
    <div class="pb"><strong>${paciente.historia_clinica || '—'}</strong>Historia</div>
    <div class="pb"><strong>${paciente.cedula || '—'}</strong>Cédula</div>
    <div class="pb"><strong>${age > 0 ? age+' años' : '—'}</strong>Edad</div>
    <div class="pb"><strong>${diasActivos.length} días activos</strong>Distribución</div>
  </div>
  <div class="body">
    ${plan.notas_generales ? `<div style="background:#E8F4FD;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#0B1F3B;"><strong>Notas:</strong> ${plan.notas_generales}</div>` : ''}
    ${diasActivos.map(dia => `
      <div class="dia-title">${dia}</div>
      <table>
        <thead><tr><th>#</th><th>Ejercicio</th><th>Series</th><th>Repeticiones</th><th>Carga</th><th>Nota</th></tr></thead>
        <tbody>
          ${(diasEjs[dia] || []).sort((a,b) => a.orden-b.orden).map((pe, i) => {
            const ex = exById[pe.ejercicio_id];
            if (!ex) return '';
            return `<tr><td>${i+1}</td><td><strong>${ex.nombre}</strong><br><span style="font-size:10px;color:#6E6E70;">${ex.categoria}</span></td><td style="text-align:center;">${pe.series}</td><td style="text-align:center;">${pe.repeticiones} ${ex.unidad}</td><td>${pe.carga || '—'}</td><td style="color:#4B647A;font-style:italic;">${pe.nota || ''}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    `).join('')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;padding-top:16px;border-top:1px solid #DDE3EA;">
      <div><div style="border-bottom:1px solid #DDE3EA;margin-bottom:5px;height:30px;"></div><p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">${plan.terapeuta_nombre || 'Terapeuta'} · IMC</p></div>
      <div><div style="border-bottom:1px solid #DDE3EA;margin-bottom:5px;height:30px;"></div><p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">Firma del paciente</p></div>
    </div>
  </div>
  <div class="footer"><p>IMC – Instituto Metabólico Corporal · by GMEDiQ</p><p>Plan oficial · ${new Date().getFullYear()}</p></div>
  </div><button class="print-btn" onclick="window.print()">🖨 Imprimir</button></body></html>`;

  const blob = new Blob([html], {type:'text/html;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
