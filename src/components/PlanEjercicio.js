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
          <PlanCard key={pl.id} plan={pl} ejercicios={ejercicios} />
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

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  );
}

// ── PLAN CARD ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, ejercicios }) {
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
        <span style={{ color: B.navy, fontSize: 18, marginLeft: 12 }}>{open ? '▲' : '▼'}</span>
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
