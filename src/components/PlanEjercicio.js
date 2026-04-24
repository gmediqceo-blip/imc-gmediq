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
  const LOGO_SRC = 'data:image/jpeg;base64,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';
  const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('es-EC', {day:'2-digit',month:'long',year:'numeric'}) : '—';
  const age = paciente.fecha_nacimiento ? Math.floor((Date.now() - new Date(paciente.fecha_nacimiento).getTime()) / (365.25*24*3600*1000)) : 0;
  const grupoLabels = { transformacion: 'Transformación Corporal', prequirurgico: 'Pre-Quirúrgico', postquirurgico: 'Post-Quirúrgico' };
  const CAT_COLORS = { aerobico:'#1E7CB5', tren_inferior:'#0B1F3B', tren_superior:'#4B647A', core:'#C25A00', respiratorio:'#7B2D8B', movilidad:'#7B2D8B' };

  const diasEjs = {};
  (plan.plan_ejercicios || []).forEach(pe => {
    if (!diasEjs[pe.dia]) diasEjs[pe.dia] = [];
    diasEjs[pe.dia].push(pe);
  });
  const diasActivos = DAYS.filter(d => diasEjs[d]?.length > 0);
  const totalEjs = diasActivos.reduce((acc, d) => acc + diasEjs[d].length, 0);

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Plan de Ejercicio — ${paciente.nombre} ${paciente.apellido}</title>
  <style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #E8EDF3; color: #0B1F3B; padding: 24px 16px 80px; }
  .page { background: white; max-width: 780px; margin: 0 auto; border-radius: 6px; overflow: hidden; box-shadow: 0 8px 40px rgba(11,31,59,0.14); }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #0B1F3B; color: white; border: none; padding: 12px 28px; border-radius: 30px; font-family: 'Segoe UI',Arial,sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 20px rgba(11,31,59,0.3); z-index: 100; }
  .print-btn:hover { background: #1E7CB5; }
  @media print {
    body { background: white !important; padding: 0 !important; }
    .page { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
    .print-btn { display: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  }

    .sec-title { font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#4B647A;border-bottom:2px solid #0B1F3B;padding-bottom:6px;margin:20px 0 12px; }
    .body { padding:24px 32px; }
    table { width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px; }
    thead tr { background:#0B1F3B; }
    th { color:white;padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:0.5px; }
    td { padding:8px 10px;border-bottom:1px solid #F4F6F8;vertical-align:top; }
    tr:nth-child(even) td { background:#F4F6F8; }
  </style></head><body>
  <div class="page">
    <!-- HEADER -->
    <div style="background:#0B1F3B;padding:28px 36px 24px;position:relative;overflow:hidden;">
      <div style="position:absolute;width:280px;height:280px;border-radius:50%;border:55px solid rgba(30,124,181,0.09);right:-70px;top:-90px;"></div>
      <div style="background:white;border-radius:8px;padding:6px 14px;display:inline-flex;align-items:center;margin-bottom:20px;position:relative;z-index:1;">
        <img src="${LOGO_SRC}" alt="IMC" style="height:40px;width:auto;">
      </div>
      <div style="position:relative;z-index:1;">
        <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:white;line-height:1.2;margin-bottom:8px;">
          Plan de Ejercicio · Fase ${plan.fase},<br><span style="color:#1E7CB5;">${paciente.nombre.split(' ')[0]}.</span>
        </h1>
        <p style="color:rgba(255,255,255,0.55);font-size:12px;margin-bottom:20px;">${fmtD(plan.fecha)} · ${plan.entorno === 'gym' ? '🏋️ Gimnasio' : '🏠 Casa'} · ${grupoLabels[paciente.grupo] || ''} · ${diasActivos.length} días · ${totalEjs} ejercicios</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Paciente</div>
            <div style="font-size:14px;font-weight:600;color:white;">${paciente.nombre} ${paciente.apellido}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);">${age > 0 ? age+' años' : ''} · H.C. ${paciente.historia_clinica || '—'}</div>
          </div>
          <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Terapeuta</div>
            <div style="font-size:14px;font-weight:600;color:white;">${plan.terapeuta_nombre || '—'}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);">Instituto Metabólico Corporal</div>
          </div>
        </div>
      </div>
    </div>

    <div class="body">
      ${plan.notas_generales ? `<div style="background:#E8F4FD;border-left:4px solid #1E7CB5;border-radius:0 8px 8px 0;padding:10px 16px;margin-bottom:20px;font-size:12px;color:#0B1F3B;"><strong>Notas del terapeuta:</strong> ${plan.notas_generales}</div>` : ''}

      ${diasActivos.map(dia => `
        <div class="sec-title">${dia}</div>
        <table>
          <thead><tr>
            <th style="width:30px;">#</th>
            <th>Ejercicio</th>
            <th style="width:60px;text-align:center;">Series</th>
            <th style="width:80px;text-align:center;">Reps / Tiempo</th>
            <th style="width:100px;">Carga</th>
            <th>Indicación clínica</th>
          </tr></thead>
          <tbody>
            ${(diasEjs[dia] || []).sort((a,b) => a.orden-b.orden).map((pe, i) => {
              const ex = exById[pe.ejercicio_id];
              if (!ex) return '';
              const col = CAT_COLORS[ex.categoria] || '#4B647A';
              return `<tr>
                <td style="font-weight:700;color:#0B1F3B;">${i+1}</td>
                <td>
                  <div style="font-weight:700;color:#0B1F3B;margin-bottom:2px;">${ex.nombre}</div>
                  <span style="background:${col}22;color:${col};font-size:9px;font-weight:600;padding:1px 6px;border-radius:8px;">${ex.categoria}</span>
                  <span style="color:#6E6E70;font-size:9px;margin-left:4px;">${ex.entorno}</span>
                </td>
                <td style="text-align:center;font-weight:700;color:#0B1F3B;">${pe.series}</td>
                <td style="text-align:center;">${pe.repeticiones} <span style="color:#6E6E70;font-size:10px;">${ex.unidad}</span></td>
                <td style="color:#4B647A;font-weight:600;">${pe.carga || '—'}</td>
                <td style="color:#4B647A;font-style:italic;font-size:11px;">${pe.nota || ''}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `).join('')}

      <!-- Firma -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px;padding-top:18px;border-top:1px solid #DDE3EA;">
        <div><div style="border-bottom:1px solid #DDE3EA;margin-bottom:6px;height:36px;"></div><p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">${plan.terapeuta_nombre || 'Terapeuta'} · IMC</p></div>
        <div><div style="border-bottom:1px solid #DDE3EA;margin-bottom:6px;height:36px;"></div><p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">Firma y confirmación del paciente</p></div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#0B1F3B;padding:12px 32px;display:flex;justify-content:space-between;align-items:center;">
      <p style="color:rgba(255,255,255,0.4);font-size:9px;">IMC – Instituto Metabólico Corporal · by GMEDiQ</p>
      <p style="color:rgba(255,255,255,0.4);font-size:9px;">Plan oficial · ${new Date().getFullYear()}</p>
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨 Imprimir plan</button>
  </body></html>`;

  const blob = new Blob([html], {type:'text/html;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
