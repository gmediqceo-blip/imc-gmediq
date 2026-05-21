// ════════════════════════════════════════════════════════════════════════
// EditorPlanSMAE.js — Editor de plan nutricional SMAE
//
// Permite a la nutri armar un plan asignando porciones de cada categoría
// SMAE (proteína, carbohidrato, grasa, fruta, etc.) a cada tiempo de comida.
// Calcula calorías y macros automáticamente.
//
// Props:
//   - paciente:       {id, nombre, ...}
//   - protocolo:      'manga' | 'balon' | 'glp1' | 'conservador'
//   - usuario:        usuario logueado
//   - planExistente:  plan a editar (null si nuevo)
//   - onVolver:       callback regresar
//   - onGuardado:     callback al guardar
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
  amber: '#F59E0B', purple: '#7C3AED',
  softGreen: '#E6F5EE', softOrange: '#FFF0E0',
};

// Tiempos de comida disponibles (la nutri elige cuáles usar)
const TIEMPOS_DEFAULT = [
  { codigo: 'desayuno',     nombre: 'Desayuno',     hora: '07:00', emoji: '🌅' },
  { codigo: 'media_manana', nombre: 'Media mañana', hora: '10:30', emoji: '🍎' },
  { codigo: 'almuerzo',     nombre: 'Almuerzo',     hora: '13:00', emoji: '🍽️' },
  { codigo: 'pre_entreno',  nombre: 'Pre-entreno',  hora: '16:00', emoji: '🏋️' },
  { codigo: 'post_entreno', nombre: 'Post-entreno', hora: '18:00', emoji: '💪' },
  { codigo: 'cena',         nombre: 'Cena',         hora: '20:00', emoji: '🌙' },
];

const CATEGORIAS = [
  { codigo: 'proteina',     campo: 'porciones_proteina',     nombre: 'Proteína',      emoji: '🍗', kcal: 65,  color: B.red    },
  { codigo: 'carbohidrato', campo: 'porciones_carbohidrato', nombre: 'Carbohidrato',  emoji: '🍞', kcal: 75,  color: B.orange },
  { codigo: 'grasa',        campo: 'porciones_grasa',        nombre: 'Grasa',         emoji: '🥑', kcal: 45,  color: B.green  },
  { codigo: 'fruta',        campo: 'porciones_fruta',        nombre: 'Fruta',         emoji: '🍓', kcal: 60,  color: B.purple },
  { codigo: 'vegetal',      campo: 'porciones_vegetal',      nombre: 'Vegetal',       emoji: '🥕', kcal: 25,  color: B.amber  },
  { codigo: 'lacteo',       campo: 'porciones_lacteo',       nombre: 'Lácteo',        emoji: '🥛', kcal: 90,  color: B.blue   },
  { codigo: 'leguminosa',   campo: 'porciones_leguminosa',   nombre: 'Leguminosa',    emoji: '🫘', kcal: 110, color: B.teal   },
  { codigo: 'azucar',       campo: 'porciones_azucar',       nombre: 'Azúcar',        emoji: '🍬', kcal: 20,  color: B.navy   },
];

export default function EditorPlanSMAE({ paciente, protocolo, usuario, planExistente, onVolver, onGuardado }) {
  const [nombre, setNombre]                 = useState(planExistente?.nombre || 'Plan SMAE Personalizado');
  const [objetivo, setObjetivo]             = useState(planExistente?.objetivo || '');
  const [kcalObjetivo, setKcalObjetivo]     = useState(planExistente?.kcal_objetivo || 2000);
  const [fechaInicio, setFechaInicio]       = useState(planExistente?.fecha_inicio || new Date().toISOString().split('T')[0]);
  const [recomendaciones, setRecomendaciones] = useState(planExistente?.recomendaciones || '');
  const [hidratacion, setHidratacion]       = useState(planExistente?.hidratacion || 'Consumir mínimo 2 litros de agua al día.');
  const [suplementacion, setSuplementacion] = useState(planExistente?.suplementacion || '');
  const [consideracionesGlp1, setConsideracionesGlp1] = useState(planExistente?.consideraciones_glp1 || '');

  // Estructura: { 'desayuno': { porciones_proteina: 4, porciones_carbohidrato: 2, ... }, ... }
  const [porciones, setPorciones] = useState({});
  const [tiemposActivos, setTiemposActivos] = useState(TIEMPOS_DEFAULT.map(t => t.codigo));
  const [intercambios, setIntercambios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { cargarDatos(); }, [planExistente?.id]);

  const showToast = (msg, color = B.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const cargarDatos = async () => {
    setLoading(true);

    // 1. Cargar intercambios SMAE (banco de alimentos para mostrar al pie del editor)
    const { data: ints } = await supabase
      .from('smae_intercambios')
      .select('*, smae_categorias_v2(nombre, emoji, color)')
      .eq('activo', true)
      .order('categoria_codigo')
      .order('orden');
    setIntercambios(ints || []);

    // 2. Si hay plan existente, cargar sus porciones
    if (planExistente?.id) {
      const { data: porcionesData } = await supabase
        .from('plan_smae_porciones')
        .select('*')
        .eq('plan_id', planExistente.id)
        .order('orden');

      // Convertir a estructura indexada por tiempo
      const porcionesObj = {};
      const tiempos = [];
      (porcionesData || []).forEach(p => {
        porcionesObj[p.tiempo_codigo] = {
          tiempo_nombre: p.tiempo_nombre,
          tiempo_hora: p.tiempo_hora,
          tiempo_emoji: p.tiempo_emoji,
          orden: p.orden,
          porciones_proteina: p.porciones_proteina,
          porciones_carbohidrato: p.porciones_carbohidrato,
          porciones_grasa: p.porciones_grasa,
          porciones_fruta: p.porciones_fruta,
          porciones_vegetal: p.porciones_vegetal,
          porciones_lacteo: p.porciones_lacteo,
          porciones_leguminosa: p.porciones_leguminosa,
          porciones_azucar: p.porciones_azucar,
          nota_especial: p.nota_especial,
        };
        tiempos.push(p.tiempo_codigo);
      });
      setPorciones(porcionesObj);
      if (tiempos.length > 0) setTiemposActivos(tiempos);
    } else {
      // Inicializar porciones vacías para los tiempos default
      const init = {};
      TIEMPOS_DEFAULT.forEach(t => {
        init[t.codigo] = {
          tiempo_nombre: t.nombre,
          tiempo_hora: t.hora,
          tiempo_emoji: t.emoji,
          porciones_proteina: 0,
          porciones_carbohidrato: 0,
          porciones_grasa: 0,
          porciones_fruta: 0,
          porciones_vegetal: 0,
          porciones_lacteo: 0,
          porciones_leguminosa: 0,
          porciones_azucar: 0,
          nota_especial: '',
        };
      });
      setPorciones(init);
    }

    setLoading(false);
  };

  // ── Cambiar porciones de una categoría en un tiempo ─────────────────
  const setPorcion = (tiempoCodigo, campo, valor) => {
    setPorciones(prev => ({
      ...prev,
      [tiempoCodigo]: {
        ...prev[tiempoCodigo],
        [campo]: Math.max(0, parseInt(valor) || 0),
      },
    }));
  };

  // ── Calcular totales por categoría ─────────────────────────────────
  const totalPorCategoria = (campo) => {
    return tiemposActivos.reduce((acc, t) => acc + (porciones[t]?.[campo] || 0), 0);
  };

  // ── Calcular kcal total ────────────────────────────────────────────
  const kcalTotal = () => {
    let total = 0;
    CATEGORIAS.forEach(c => {
      total += totalPorCategoria(c.campo) * c.kcal;
    });
    return total;
  };

  // ── Guardar plan ───────────────────────────────────────────────────
  const guardar = async () => {
    setGuardando(true);
    try {
      let planId = planExistente?.id;

      // Crear o actualizar el plan
      if (planId) {
        await supabase
          .from('planes_smae')
          .update({
            nombre, objetivo,
            kcal_objetivo: kcalObjetivo,
            fecha_inicio: fechaInicio,
            recomendaciones, hidratacion, suplementacion,
            consideraciones_glp1: protocolo === 'glp1' ? consideracionesGlp1 : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', planId);

        // Borrar porciones viejas
        await supabase.from('plan_smae_porciones').delete().eq('plan_id', planId);
      } else {
        // Marcar planes anteriores como terminados
        await supabase
          .from('planes_smae')
          .update({ estado: 'terminado' })
          .eq('paciente_id', paciente.id)
          .eq('estado', 'activo');

        // Crear nuevo plan
        const { data: nuevoPlan, error: err } = await supabase
          .from('planes_smae')
          .insert([{
            paciente_id: paciente.id,
            nombre, objetivo,
            kcal_objetivo: kcalObjetivo,
            fecha_inicio: fechaInicio,
            estado: 'activo',
            recomendaciones, hidratacion, suplementacion,
            consideraciones_glp1: protocolo === 'glp1' ? consideracionesGlp1 : null,
            creado_por: usuario?.id,
          }])
          .select()
          .single();

        if (err) throw err;
        planId = nuevoPlan.id;
      }

      // Insertar porciones de los tiempos activos
      const porcionesInsert = tiemposActivos.map((t, idx) => {
        const data = porciones[t] || {};
        return {
          plan_id: planId,
          tiempo_codigo: t,
          tiempo_nombre: data.tiempo_nombre,
          tiempo_hora: data.tiempo_hora,
          tiempo_emoji: data.tiempo_emoji,
          orden: idx,
          porciones_proteina: data.porciones_proteina || 0,
          porciones_carbohidrato: data.porciones_carbohidrato || 0,
          porciones_grasa: data.porciones_grasa || 0,
          porciones_fruta: data.porciones_fruta || 0,
          porciones_vegetal: data.porciones_vegetal || 0,
          porciones_lacteo: data.porciones_lacteo || 0,
          porciones_leguminosa: data.porciones_leguminosa || 0,
          porciones_azucar: data.porciones_azucar || 0,
          nota_especial: data.nota_especial || null,
        };
      });

      if (porcionesInsert.length > 0) {
        const { error: errPorc } = await supabase.from('plan_smae_porciones').insert(porcionesInsert);
        if (errPorc) throw errPorc;
      }

      onGuardado();
    } catch (e) {
      showToast('Error: ' + e.message, B.red);
    } finally {
      setGuardando(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.gray }}>Cargando editor...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={onVolver} style={btnBack()}>← Volver</button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: B.navy, margin: 0 }}>
            🍱 Editor de Plan SMAE
          </h2>
          <p style={{ fontSize: 12, color: B.gray, margin: '2px 0 0' }}>
            {paciente.nombre} {paciente.apellido || ''}
          </p>
        </div>
        <button onClick={guardar} disabled={guardando} style={btnPrimary(B.green, { opacity: guardando ? 0.5 : 1 })}>
          {guardando ? 'Guardando...' : '💾 Guardar plan'}
        </button>
      </div>

      {/* Configuración básica */}
      <div style={cardStyle()}>
        <h3 style={{ fontSize: 13, color: B.navy, marginBottom: 12, fontWeight: 700 }}>⚙️ Configuración del plan</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Campo label="Nombre del plan" valor={nombre} onChange={setNombre} />
          <Campo label="Objetivo" valor={objetivo} onChange={setObjetivo} placeholder="Ej: Pérdida de peso" />
          <Campo label="Kcal objetivo" tipo="number" valor={kcalObjetivo} onChange={setKcalObjetivo} />
          <Campo label="Fecha de inicio" tipo="date" valor={fechaInicio} onChange={setFechaInicio} />
        </div>
      </div>

      {/* Consideraciones GLP-1 (solo si aplica) */}
      {protocolo === 'glp1' && (
        <div style={{
          background: B.softOrange,
          borderLeft: `4px solid ${B.orange}`,
          padding: 14, borderRadius: 10, marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.orange, textTransform: 'uppercase', marginBottom: 6 }}>
            ⚠️ Consideraciones especiales (GLP-1)
          </div>
          <textarea
            value={consideracionesGlp1}
            onChange={e => setConsideracionesGlp1(e.target.value)}
            placeholder="Ej: Paciente con náuseas frecuentes - fraccionar comidas en porciones pequeñas. Baja saciedad - priorizar proteína y fibra."
            style={textareaStyle()}
            rows={3}
          />
        </div>
      )}

      {/* TABLA DE PORCIONES */}
      <div style={cardStyle()}>
        <h3 style={{ fontSize: 13, color: B.navy, marginBottom: 12, fontWeight: 700 }}>
          🥗 Porciones SMAE por tiempo de comida
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
            <thead>
              <tr style={{ background: B.green }}>
                <th style={thStyle(true)}>Tiempo</th>
                {CATEGORIAS.map(c => (
                  <th key={c.codigo} style={thStyle()} title={c.nombre}>
                    {c.emoji}
                  </th>
                ))}
                <th style={thStyle()}>Kcal</th>
              </tr>
            </thead>
            <tbody>
              {tiemposActivos.map(t => {
                const data = porciones[t] || {};
                const tInfo = TIEMPOS_DEFAULT.find(td => td.codigo === t) || {};
                let kcalTiempo = 0;
                CATEGORIAS.forEach(c => { kcalTiempo += (data[c.campo] || 0) * c.kcal; });
                return (
                  <tr key={t} style={{ borderBottom: `1px solid ${B.grayLt}` }}>
                    <td style={tdTiempo()}>
                      <strong>{tInfo.emoji} {tInfo.nombre}</strong>
                      <div style={{ fontSize: 10, color: B.gray }}>{tInfo.hora}</div>
                    </td>
                    {CATEGORIAS.map(c => (
                      <td key={c.codigo} style={tdInput()}>
                        <input
                          type="number"
                          min="0"
                          value={data[c.campo] || 0}
                          onChange={e => setPorcion(t, c.campo, e.target.value)}
                          style={qtyInput(data[c.campo] > 0 ? c.color : null)}
                        />
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: B.navy, padding: '8px 6px' }}>
                      {kcalTiempo}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: B.softGreen, fontWeight: 800 }}>
                <td style={{ ...tdTiempo(), background: B.softGreen }}>📊 TOTAL DIARIO</td>
                {CATEGORIAS.map(c => (
                  <td key={c.codigo} style={{ textAlign: 'center', padding: '10px 6px', color: c.color, fontSize: 14 }}>
                    {totalPorCategoria(c.campo)}
                  </td>
                ))}
                <td style={{ textAlign: 'center', padding: '10px 6px', color: B.green, fontSize: 14 }}>
                  <strong>{kcalTotal()}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Resumen de kcal vs objetivo */}
        <div style={{ marginTop: 14, padding: 12, background: B.softGreen, borderRadius: 8, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: B.teal, fontWeight: 700, textTransform: 'uppercase' }}>Kcal del plan</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: B.green }}>{kcalTotal()}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: B.teal, fontWeight: 700, textTransform: 'uppercase' }}>Objetivo</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: B.navy }}>{kcalObjetivo}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: B.teal, fontWeight: 700, textTransform: 'uppercase' }}>Diferencia</div>
            <div style={{
              fontSize: 18, fontWeight: 800,
              color: Math.abs(kcalTotal() - kcalObjetivo) < 100 ? B.green : B.orange,
            }}>
              {kcalTotal() - kcalObjetivo > 0 ? '+' : ''}{kcalTotal() - kcalObjetivo}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: B.teal, fontWeight: 700, textTransform: 'uppercase' }}>Estado</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: kcalTotal() === 0 ? B.gray : Math.abs(kcalTotal() - kcalObjetivo) < 100 ? B.green : B.amber }}>
              {kcalTotal() === 0 ? 'Sin asignar' : Math.abs(kcalTotal() - kcalObjetivo) < 100 ? '✓ Equilibrado' : 'Ajustar'}
            </div>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div style={cardStyle()}>
        <h3 style={{ fontSize: 13, color: B.navy, marginBottom: 12, fontWeight: 700 }}>📝 Recomendaciones, hidratación y suplementación</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div>
            <label style={miniLabel()}>Recomendaciones generales</label>
            <textarea
              value={recomendaciones}
              onChange={e => setRecomendaciones(e.target.value)}
              placeholder="Ej: Consumir únicamente pollo, pescado, atún en agua, queso fresco. Preparaciones a la plancha..."
              style={textareaStyle()}
              rows={6}
            />
          </div>
          <div>
            <label style={miniLabel()}>Hidratación</label>
            <textarea
              value={hidratacion}
              onChange={e => setHidratacion(e.target.value)}
              style={textareaStyle()}
              rows={3}
            />
            <label style={{ ...miniLabel(), marginTop: 12 }}>Suplementación recetada</label>
            <textarea
              value={suplementacion}
              onChange={e => setSuplementacion(e.target.value)}
              placeholder="Ej: Whey Protein: 1 scoop post-entrenamiento. Creatina: 1 scoop diario."
              style={textareaStyle()}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Banco de intercambios (referencia) */}
      <details style={{ marginTop: 16, background: 'white', padding: 14, borderRadius: 10, border: `1px solid ${B.grayMd}` }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: B.navy }}>
          📚 Ver Banco de Intercambios SMAE ({intercambios.length} alimentos)
        </summary>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {Object.entries(agruparPorCategoria(intercambios)).map(([cat, items]) => {
            const catInfo = CATEGORIAS.find(c => c.codigo === cat);
            return (
              <div key={cat} style={{ background: B.grayLt, borderRadius: 8, padding: 10, borderLeft: `3px solid ${catInfo?.color || B.gray}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: catInfo?.color || B.navy, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {catInfo?.emoji} {catInfo?.nombre || cat}
                </div>
                <div style={{ fontSize: 10, color: B.navy, lineHeight: 1.6 }}>
                  {items.slice(0, 8).map(i => (
                    <div key={i.id}>• <strong>{i.nombre}:</strong> <span style={{ color: B.gray }}>{i.porcion}</span></div>
                  ))}
                  {items.length > 8 && <div style={{ color: B.gray, fontStyle: 'italic' }}>...y {items.length - 8} más</div>}
                </div>
              </div>
            );
          })}
        </div>
      </details>

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
function Campo({ label, valor, onChange, tipo = 'text', placeholder = '' }) {
  return (
    <div>
      <label style={miniLabel()}>{label}</label>
      <input
        type={tipo}
        value={valor || ''}
        onChange={e => onChange(tipo === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        style={inputStyle()}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
function agruparPorCategoria(items) {
  const out = {};
  items.forEach(i => {
    if (!out[i.categoria_codigo]) out[i.categoria_codigo] = [];
    out[i.categoria_codigo].push(i);
  });
  return out;
}

// ────────────────────────────────────────────────────────────────────────
// ESTILOS
// ────────────────────────────────────────────────────────────────────────
const cardStyle = () => ({
  background: 'white',
  border: `1px solid ${B.grayMd}`,
  borderRadius: 12,
  padding: 18,
  marginBottom: 16,
});

const btnBack = () => ({
  padding: '8px 14px',
  background: B.white,
  color: B.navy,
  border: `1.5px solid ${B.grayMd}`,
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const btnPrimary = (color, extra = {}) => ({
  padding: '10px 18px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
  ...extra,
});

const miniLabel = () => ({
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: B.teal,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 6,
});

const inputStyle = () => ({
  width: '100%',
  padding: '9px 12px',
  border: `1.5px solid ${B.grayMd}`,
  borderRadius: 7,
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
});

const textareaStyle = () => ({
  width: '100%',
  padding: '9px 12px',
  border: `1.5px solid ${B.grayMd}`,
  borderRadius: 7,
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  resize: 'vertical',
});

const thStyle = (left = false) => ({
  background: B.green,
  color: 'white',
  padding: '8px 6px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
  textAlign: left ? 'left' : 'center',
  ...(left ? { paddingLeft: 12 } : {}),
});

const tdTiempo = () => ({
  padding: '8px 12px',
  fontSize: 12,
  color: B.navy,
  fontWeight: 700,
  background: 'white',
});

const tdInput = () => ({
  textAlign: 'center',
  padding: '6px',
});

const qtyInput = (color) => ({
  width: 44,
  padding: 5,
  border: `1.5px solid ${color || B.grayMd}`,
  borderRadius: 5,
  textAlign: 'center',
  fontSize: 12,
  fontWeight: 700,
  color: color || B.navy,
  background: color ? `${color}15` : 'white',
  fontFamily: 'inherit',
  outline: 'none',
});
