import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generarPDFIntercambios } from './PDFIntercambios';

const B = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020', orange: '#C25A00', gold: '#C9A86A' };
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TIEMPOS_DEFAULT = ['Pre entreno', 'Desayuno', 'Medio día', 'Almuerzo', 'Media tarde', 'Cena'];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — Lista de planes por intercambios del paciente
// ═══════════════════════════════════════════════════════════════════════════
export default function PlanIntercambios({ paciente, usuario }) {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => { fetchPlanes(); }, [paciente.id]);

  const fetchPlanes = async () => {
    setLoading(true);
    const { data } = await supabase.from('planes_intercambio')
      .select('*').eq('paciente_id', paciente.id).order('fecha', { ascending: false });
    setPlanes(data || []);
    setLoading(false);
  };

  // Crear plan nuevo: copia el catálogo maestro dentro del plan (personalizable)
  const nuevoPlan = async () => {
    setCreando(true);
    const { data: catalogo, error } = await supabase.from('catalogo_intercambios')
      .select('*').eq('activo', true).order('orden');
    setCreando(false);
    if (error || !catalogo || catalogo.length === 0) {
      showToast('⚠ No se pudo cargar el catálogo de intercambios', B.red);
      return;
    }
    const lista = catalogo.map(g => ({ grupo: g.grupo, orden: g.orden, items: g.items || [], nota: g.nota || '' }));
    const tiempos = TIEMPOS_DEFAULT.map(nombre => ({ nombre, porciones: {}, ejemplos: [] }));
    setEditando({
      id: null,
      paciente_id: paciente.id,
      fecha: new Date().toISOString().split('T')[0],
      titulo: 'Plan Nutricional Mensual',
      nutricionista_nombre: 'Sofía Galarza',
      lista_intercambios: lista,
      tiempos_comida: tiempos,
      recomendaciones: { generales: [], agua: [], suplementos: [] },
      notas: '',
    });
  };

  const eliminarPlan = async (plan) => {
    if (!window.confirm(`¿Eliminar el plan del ${fmtDate(plan.fecha)}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('planes_intercambio').delete().eq('id', plan.id);
    if (error) { showToast('⚠ Error al eliminar', B.red); return; }
    showToast('🗑 Plan eliminado');
    fetchPlanes();
  };

  const duplicarPlan = async (plan) => {
    setEditando({
      ...plan,
      id: null,
      fecha: new Date().toISOString().split('T')[0],
      titulo: plan.titulo || 'Plan Nutricional Mensual',
    });
  };

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: toast.color, color: 'white', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, zIndex: 3000, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
          🔄 Planes por Intercambios · {planes.length}
        </p>
        <button onClick={nuevoPlan} disabled={creando}
          style={{ padding: '8px 18px', background: creando ? '#9AA5B1' : B.navy, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: creando ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          {creando ? 'Cargando catálogo...' : '➕ Nuevo plan por intercambios'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: B.gray, fontSize: 13, textAlign: 'center', padding: 30 }}>Cargando planes...</p>
      ) : planes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: B.white, borderRadius: 12, border: `1.5px dashed ${B.grayMd}` }}>
          <p style={{ fontSize: 30, marginBottom: 8 }}>🔄</p>
          <p style={{ color: B.navy, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Sin planes por intercambios</p>
          <p style={{ color: B.gray, fontSize: 12 }}>Crea el primero — la lista de intercambios se copia del catálogo estándar y puedes personalizarla para este paciente.</p>
        </div>
      ) : (
        planes.map(plan => {
          const numTiempos = (plan.tiempos_comida || []).length;
          const totales = calcularTotales(plan);
          const resumen = Object.entries(totales).filter(([, v]) => v > 0).slice(0, 4)
            .map(([g, v]) => `${v} ${g.toLowerCase()}`).join(' · ');
          return (
            <div key={plan.id} style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, borderLeft: `4px solid ${B.blue}`, padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 3px' }}>
                  {plan.titulo || 'Plan Nutricional Mensual'} — {fmtDate(plan.fecha)}
                </p>
                <p style={{ fontSize: 11, color: B.gray, margin: 0 }}>
                  {plan.nutricionista_nombre || '—'} · {numTiempos} tiempos de comida{resumen ? ` · Total diario: ${resumen}...` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => generarPDFIntercambios(paciente, plan)}
                  style={{ padding: '7px 14px', background: B.gold, color: B.navy, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>🖨 PDF</button>
                <button onClick={() => duplicarPlan(plan)}
                  style={{ padding: '7px 14px', background: B.grayLt, color: B.teal, border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>⧉ Duplicar</button>
                <button onClick={() => setEditando(plan)}
                  style={{ padding: '7px 14px', background: B.blue, color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Editar</button>
                <button onClick={() => eliminarPlan(plan)}
                  style={{ padding: '7px 12px', background: B.red + '15', color: B.red, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
              </div>
            </div>
          );
        })
      )}

      {editando && (
        <EditorPlanIntercambios
          plan={editando}
          paciente={paciente}
          onClose={() => setEditando(null)}
          onGuardado={() => { setEditando(null); fetchPlanes(); showToast('✓ Plan guardado correctamente'); }}
        />
      )}
    </div>
  );
}

// Suma de porciones por grupo en todos los tiempos de comida
function calcularTotales(plan) {
  const totales = {};
  (plan.tiempos_comida || []).forEach(t => {
    Object.entries(t.porciones || {}).forEach(([grupo, num]) => {
      const n = parseFloat(num) || 0;
      if (n > 0) totales[grupo] = (totales[grupo] || 0) + n;
    });
  });
  return totales;
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR — Modal de edición completa del plan
// ═══════════════════════════════════════════════════════════════════════════
function EditorPlanIntercambios({ plan, paciente, onClose, onGuardado }) {
  const [fecha, setFecha] = useState(plan.fecha || new Date().toISOString().split('T')[0]);
  const [titulo, setTitulo] = useState(plan.titulo || 'Plan Nutricional Mensual');
  const [nutricionista, setNutricionista] = useState(plan.nutricionista_nombre || 'Sofía Galarza');
  const [lista, setLista] = useState(JSON.parse(JSON.stringify(plan.lista_intercambios || [])));
  const [tiempos, setTiempos] = useState(JSON.parse(JSON.stringify(plan.tiempos_comida || [])));
  const [recos, setRecos] = useState({
    generales: (plan.recomendaciones?.generales || []).join('\n'),
    agua: (plan.recomendaciones?.agua || []).join('\n'),
    suplementos: (plan.recomendaciones?.suplementos || []).join('\n'),
  });
  const [notas, setNotas] = useState(plan.notas || '');
  const [seccion, setSeccion] = useState('porciones');
  const [grupoAbierto, setGrupoAbierto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const nombresGrupos = lista.map(g => g.grupo);

  const secciones = [
    { key: 'porciones', label: '1. Porciones por comida' },
    { key: 'ejemplos', label: '2. Ejemplos de comidas' },
    { key: 'lista', label: '3. Lista de intercambios' },
    { key: 'recos', label: '4. Recomendaciones' },
  ];

  // ── Porciones ──────────────────────────────────────────────────────────────
  const setPorcion = (idxTiempo, grupo, valor) => {
    setTiempos(ts => ts.map((t, i) => i !== idxTiempo ? t : {
      ...t, porciones: { ...t.porciones, [grupo]: valor }
    }));
  };
  const renombrarTiempo = (idx, nombre) => setTiempos(ts => ts.map((t, i) => i === idx ? { ...t, nombre } : t));
  const agregarTiempo = () => setTiempos(ts => [...ts, { nombre: 'Nuevo tiempo', porciones: {}, ejemplos: [] }]);
  const eliminarTiempo = (idx) => {
    if (!window.confirm(`¿Eliminar "${tiempos[idx].nombre}" del plan?`)) return;
    setTiempos(ts => ts.filter((_, i) => i !== idx));
  };
  const moverTiempo = (idx, dir) => {
    setTiempos(ts => {
      const arr = [...ts];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
  };

  const totales = {};
  tiempos.forEach(t => Object.entries(t.porciones || {}).forEach(([g, v]) => {
    const n = parseFloat(v) || 0;
    if (n > 0) totales[g] = (totales[g] || 0) + n;
  }));

  // ── Ejemplos ───────────────────────────────────────────────────────────────
  const setEjemplo = (idxTiempo, idxEj, texto) => {
    setTiempos(ts => ts.map((t, i) => i !== idxTiempo ? t : {
      ...t, ejemplos: t.ejemplos.map((e, j) => j === idxEj ? texto : e)
    }));
  };
  const agregarEjemplo = (idxTiempo) => {
    setTiempos(ts => ts.map((t, i) => i !== idxTiempo ? t : { ...t, ejemplos: [...(t.ejemplos || []), ''] }));
  };
  const eliminarEjemplo = (idxTiempo, idxEj) => {
    setTiempos(ts => ts.map((t, i) => i !== idxTiempo ? t : { ...t, ejemplos: t.ejemplos.filter((_, j) => j !== idxEj) }));
  };

  // ── Lista de intercambios ──────────────────────────────────────────────────
  const setItemGrupo = (idxG, idxI, texto) => {
    setLista(ls => ls.map((g, i) => i !== idxG ? g : { ...g, items: g.items.map((it, j) => j === idxI ? texto : it) }));
  };
  const agregarItem = (idxG) => setLista(ls => ls.map((g, i) => i !== idxG ? g : { ...g, items: [...g.items, ''] }));
  const eliminarItem = (idxG, idxI) => setLista(ls => ls.map((g, i) => i !== idxG ? g : { ...g, items: g.items.filter((_, j) => j !== idxI) }));
  const setNotaGrupo = (idxG, nota) => setLista(ls => ls.map((g, i) => i === idxG ? { ...g, nota } : g));
  const eliminarGrupo = (idxG) => {
    if (!window.confirm(`¿Quitar el grupo "${lista[idxG].grupo}" de este plan? (No afecta el catálogo estándar ni otros pacientes)`)) return;
    setLista(ls => ls.filter((_, i) => i !== idxG));
  };
  const agregarGrupo = () => {
    const nombre = window.prompt('Nombre del nuevo grupo (ej: Bebidas):');
    if (!nombre || !nombre.trim()) return;
    setLista(ls => [...ls, { grupo: nombre.trim(), orden: ls.length + 1, items: [], nota: '' }]);
    setGrupoAbierto(lista.length);
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const guardar = async () => {
    setError('');
    if (!fecha) { setError('La fecha es obligatoria.'); return; }
    if (lista.length === 0) { setError('El plan debe tener al menos un grupo de intercambios.'); return; }
    if (tiempos.length === 0) { setError('El plan debe tener al menos un tiempo de comida.'); return; }
    setGuardando(true);

    const aLineas = txt => txt.split('\n').map(s => s.trim()).filter(Boolean);
    const payload = {
      paciente_id: paciente.id,
      fecha,
      titulo: titulo.trim() || 'Plan Nutricional Mensual',
      nutricionista_nombre: nutricionista.trim(),
      lista_intercambios: lista.map(g => ({ ...g, items: g.items.map(it => it.trim()).filter(Boolean) })),
      tiempos_comida: tiempos.map(t => ({
        nombre: t.nombre.trim(),
        porciones: Object.fromEntries(Object.entries(t.porciones || {}).filter(([, v]) => parseFloat(v) > 0).map(([g, v]) => [g, parseFloat(v)])),
        ejemplos: (t.ejemplos || []).map(e => e.trim()).filter(Boolean),
      })),
      recomendaciones: {
        generales: aLineas(recos.generales),
        agua: aLineas(recos.agua),
        suplementos: aLineas(recos.suplementos),
      },
      notas: notas.trim(),
    };

    const res = plan.id
      ? await supabase.from('planes_intercambio').update(payload).eq('id', plan.id)
      : await supabase.from('planes_intercambio').insert(payload);

    setGuardando(false);
    if (res.error) { setError('Error al guardar: ' + res.error.message); return; }
    onGuardado();
  };

  const inputStyle = { width: '100%', padding: '7px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', color: B.navy, boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: B.grayLt, borderRadius: 14, width: '100%', maxWidth: 980, maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ background: B.navy, padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>
              🔄 {plan.id ? 'Editar' : 'Nuevo'} Plan por Intercambios
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '2px 0 0' }}>
              {paciente.nombre} {paciente.apellido}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: 'none', borderRadius: 6, width: 30, height: 30, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
        </div>

        {/* Datos generales */}
        <div style={{ padding: '12px 22px 0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 150px' }}>
            <label style={labelStyle}>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>Título</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: '0 0 200px' }}>
            <label style={labelStyle}>Nutricionista</label>
            <input value={nutricionista} onChange={e => setNutricionista(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Tabs de sección */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 22px 0', overflowX: 'auto' }}>
          {secciones.map(s => (
            <button key={s.key} onClick={() => setSeccion(s.key)}
              style={{ padding: '9px 16px', background: seccion === s.key ? B.white : 'transparent', color: seccion === s.key ? B.navy : B.gray, border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', borderBottom: seccion === s.key ? `3px solid ${B.blue}` : '3px solid transparent' }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: 'auto', background: B.white, padding: '18px 22px' }}>

          {/* ── SECCIÓN 1: PORCIONES ── */}
          {seccion === 'porciones' && (
            <div>
              <p style={{ fontSize: 12, color: B.gray, margin: '0 0 12px' }}>
                Define cuántas porciones de cada grupo lleva cada tiempo de comida. El total diario se calcula automáticamente.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 650 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'white', background: B.navy, borderRadius: '6px 0 0 0', minWidth: 160 }}>Tiempo de comida</th>
                      {nombresGrupos.map(g => (
                        <th key={g} style={{ padding: '8px 6px', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: 'white', background: B.navy, minWidth: 62 }}>{g}</th>
                      ))}
                      <th style={{ background: B.navy, borderRadius: '0 6px 0 0', width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiempos.map((t, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? B.white : B.grayLt }}>
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${B.grayMd}` }}>
                          <input value={t.nombre} onChange={e => renombrarTiempo(i, e.target.value)}
                            style={{ ...inputStyle, fontWeight: 700, fontSize: 12, padding: '5px 8px' }} />
                        </td>
                        {nombresGrupos.map(g => (
                          <td key={g} style={{ padding: '6px 4px', borderBottom: `1px solid ${B.grayMd}`, textAlign: 'center' }}>
                            <input type="number" min="0" step="0.5" value={t.porciones?.[g] ?? ''}
                              onChange={e => setPorcion(i, g, e.target.value)}
                              placeholder="—"
                              style={{ width: 52, padding: '5px 4px', border: `1.5px solid ${(parseFloat(t.porciones?.[g]) > 0) ? B.blue : B.grayMd}`, borderRadius: 6, fontSize: 12, textAlign: 'center', fontFamily: 'inherit', color: B.navy, background: (parseFloat(t.porciones?.[g]) > 0) ? '#EFF7FC' : 'white' }} />
                          </td>
                        ))}
                        <td style={{ padding: '6px 6px', borderBottom: `1px solid ${B.grayMd}`, whiteSpace: 'nowrap' }}>
                          <button onClick={() => moverTiempo(i, -1)} title="Subir" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: B.teal }}>▲</button>
                          <button onClick={() => moverTiempo(i, 1)} title="Bajar" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: B.teal }}>▼</button>
                          <button onClick={() => eliminarTiempo(i)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: B.red }}>✕</button>
                        </td>
                      </tr>
                    ))}
                    {/* Total diario */}
                    <tr>
                      <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12, color: 'white', background: B.blue, borderRadius: '0 0 0 6px' }}>TOTAL DIARIO</td>
                      {nombresGrupos.map(g => (
                        <td key={g} style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 700, fontSize: 13, color: 'white', background: B.blue }}>
                          {totales[g] || '—'}
                        </td>
                      ))}
                      <td style={{ background: B.blue, borderRadius: '0 0 6px 0' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button onClick={agregarTiempo}
                style={{ marginTop: 12, padding: '8px 16px', background: B.grayLt, color: B.navy, border: `1.5px dashed ${B.grayMd}`, borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                ➕ Agregar tiempo de comida
              </button>
            </div>
          )}

          {/* ── SECCIÓN 2: EJEMPLOS ── */}
          {seccion === 'ejemplos' && (
            <div>
              <p style={{ fontSize: 12, color: B.gray, margin: '0 0 12px' }}>
                Opciones concretas de comida para cada tiempo (el paciente elige una). Puedes dejar tiempos sin ejemplos.
              </p>
              {tiempos.map((t, i) => (
                <div key={i} style={{ marginBottom: 16, background: B.grayLt, borderRadius: 10, border: `1px solid ${B.grayMd}`, overflow: 'hidden' }}>
                  <div style={{ background: B.navy, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 12, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{t.nombre}</p>
                    <button onClick={() => agregarEjemplo(i)}
                      style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>➕ Opción</button>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    {(t.ejemplos || []).length === 0 ? (
                      <p style={{ fontSize: 11, color: B.gray, fontStyle: 'italic', margin: 0 }}>Sin ejemplos para este tiempo.</p>
                    ) : (
                      t.ejemplos.map((ej, j) => (
                        <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: B.blue, paddingTop: 9, flexShrink: 0, width: 60 }}>{j + 1}ª opción:</span>
                          <textarea value={ej} onChange={e => setEjemplo(i, j, e.target.value)} rows={2}
                            placeholder="Ej: 4 huevos revueltos + 1/2 maduro cocido y 1/2 aguacate + 1 taza de fruta picada"
                            style={{ ...inputStyle, resize: 'vertical', fontSize: 12 }} />
                          <button onClick={() => eliminarEjemplo(i, j)}
                            style={{ background: B.red + '15', color: B.red, border: 'none', borderRadius: 5, width: 26, height: 26, cursor: 'pointer', fontSize: 12, flexShrink: 0, marginTop: 5 }}>✕</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── SECCIÓN 3: LISTA DE INTERCAMBIOS ── */}
          {seccion === 'lista' && (
            <div>
              <div style={{ background: '#FFF8E7', border: `1px solid ${B.gold}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: B.navy, margin: 0 }}>
                  ✏️ Esta lista es <strong>solo de este paciente</strong>. Puedes quitar grupos (ej: lácteos por intolerancia), eliminar o agregar alimentos, sin afectar el catálogo estándar ni a otros pacientes.
                </p>
              </div>
              {lista.map((g, idxG) => (
                <div key={idxG} style={{ marginBottom: 10, background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, overflow: 'hidden' }}>
                  <div onClick={() => setGrupoAbierto(grupoAbierto === idxG ? null : idxG)}
                    style={{ background: grupoAbierto === idxG ? B.navy : B.grayLt, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: grupoAbierto === idxG ? 'white' : B.navy, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {g.grupo} <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.7 }}>· {g.items.length} items</span>
                    </p>
                    <span style={{ color: grupoAbierto === idxG ? 'white' : B.teal, fontSize: 12 }}>{grupoAbierto === idxG ? '▲' : '▼'}</span>
                  </div>
                  {grupoAbierto === idxG && (
                    <div style={{ padding: '12px 14px' }}>
                      {g.items.map((item, idxI) => (
                        <div key={idxI} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <input value={item} onChange={e => setItemGrupo(idxG, idxI, e.target.value)}
                            style={{ ...inputStyle, fontSize: 12 }} />
                          <button onClick={() => eliminarItem(idxG, idxI)}
                            style={{ background: B.red + '15', color: B.red, border: 'none', borderRadius: 5, width: 26, height: 26, cursor: 'pointer', fontSize: 12, flexShrink: 0, alignSelf: 'center' }}>✕</button>
                        </div>
                      ))}
                      <button onClick={() => agregarItem(idxG)}
                        style={{ marginTop: 4, padding: '6px 14px', background: B.grayLt, color: B.navy, border: `1.5px dashed ${B.grayMd}`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>➕ Agregar alimento</button>
                      <div style={{ marginTop: 12 }}>
                        <label style={labelStyle}>Nota del grupo (opcional)</label>
                        <input value={g.nota || ''} onChange={e => setNotaGrupo(idxG, e.target.value)}
                          placeholder="Ej: 1 scoop de whey protein = 3 porciones de proteína"
                          style={{ ...inputStyle, fontSize: 12 }} />
                      </div>
                      <button onClick={() => eliminarGrupo(idxG)}
                        style={{ marginTop: 12, padding: '6px 14px', background: B.red + '10', color: B.red, border: `1px solid ${B.red}44`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                        🗑 Quitar grupo "{g.grupo}" de este plan
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={agregarGrupo}
                style={{ marginTop: 6, padding: '8px 16px', background: B.grayLt, color: B.navy, border: `1.5px dashed ${B.grayMd}`, borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                ➕ Agregar grupo nuevo
              </button>
            </div>
          )}

          {/* ── SECCIÓN 4: RECOMENDACIONES ── */}
          {seccion === 'recos' && (
            <div>
              <p style={{ fontSize: 12, color: B.gray, margin: '0 0 14px' }}>
                Escribe una recomendación por línea — cada línea aparecerá como un punto en el PDF.
              </p>
              {[
                { key: 'generales', label: '📋 Recomendaciones generales', ph: 'Consumir carbohidratos integrales, priorizar avena, quinoa y arroz integral\nCamina 10-15 minutos después de comer' },
                { key: 'agua', label: '💧 Recomendaciones de agua', ph: 'Consumir mínimo 2 litros de agua al día\nDurante el día consume agua de canela' },
                { key: 'suplementos', label: '💊 Recomendaciones de suplemento', ph: 'Continuar con creatina después de ejercicio\nOmega 3: 2 pastillas en el desayuno' },
              ].map(sec => (
                <div key={sec.key} style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>{sec.label}</label>
                  <textarea value={recos[sec.key]} onChange={e => setRecos(r => ({ ...r, [sec.key]: e.target.value }))}
                    rows={5} placeholder={sec.ph}
                    style={{ ...inputStyle, resize: 'vertical', fontSize: 12, lineHeight: 1.6 }} />
                </div>
              ))}
              <div style={{ marginBottom: 4 }}>
                <label style={labelStyle}>Notas internas (no salen en el PDF)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontSize: 12 }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 22px', background: B.grayLt, borderTop: `1px solid ${B.grayMd}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: B.red, fontWeight: 600 }}>{error}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose}
              style={{ padding: '9px 20px', background: 'transparent', color: B.gray, border: `2px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '9px 24px', background: guardando ? '#9AA5B1' : B.green, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : '💾 Guardar plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
