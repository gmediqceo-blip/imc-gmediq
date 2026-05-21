// ════════════════════════════════════════════════════════════════════════
// EditorPlanSemanal.js — Editor del plan nutricional semanal
//
// Permite al nutricionista:
// - Seleccionar el día (Lun-Dom)
// - Seleccionar el tiempo de comida (Desayuno, Lunch AM, etc.)
// - Asignar equivalentes a cada categoría SMAE
// - Ver resumen calórico del día
// - Guardar y enviar al paciente
//
// Props:
//   - paciente: {id, nombre, ...}
//   - usuario: usuario logueado
//   - planExistente: si hay plan, lo carga para editar
//   - onVolver: callback para regresar
//   - onGuardado: callback al guardar exitosamente
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
  amber: '#F59E0B', purple: '#7C3AED',
  softGreen: '#E6F5EE', softBlue: '#E8F2FA', softOrange: '#FFF0E0',
};

const DIAS = [
  { v: 'lunes',     l: 'Lun', n: 'Lunes' },
  { v: 'martes',    l: 'Mar', n: 'Martes' },
  { v: 'miercoles', l: 'Mié', n: 'Miércoles' },
  { v: 'jueves',    l: 'Jue', n: 'Jueves' },
  { v: 'viernes',   l: 'Vie', n: 'Viernes' },
  { v: 'sabado',    l: 'Sáb', n: 'Sábado' },
  { v: 'domingo',   l: 'Dom', n: 'Domingo' },
];

const TIEMPOS = [
  { v: 'desayuno', l: 'Desayuno', icon: '🌅' },
  { v: 'lunch_am', l: 'Lunch AM', icon: '🍎' },
  { v: 'almuerzo', l: 'Almuerzo', icon: '🍽️' },
  { v: 'lunch_pm', l: 'Lunch PM', icon: '🥜' },
  { v: 'merienda', l: 'Merienda', icon: '🌙' },
];

export default function EditorPlanSemanal({ paciente, usuario, planExistente, onVolver, onGuardado }) {
  const [plan, setPlan] = useState(null);
  const [planDias, setPlanDias] = useState([]); // [{id, dia, fecha, tiempos: {desayuno: {cat_id: equiv}}}]
  const [categorias, setCategorias] = useState([]);
  const [diaActivo, setDiaActivo] = useState('lunes');
  const [tiempoActivo, setTiempoActivo] = useState('desayuno');
  const [fechaInicio, setFechaInicio] = useState(obtenerLunesProximaSemana());
  const [kcalObjetivo, setKcalObjetivo] = useState(1500);
  const [recomendaciones, setRecomendaciones] = useState('');
  const [suplementacion, setSuplementacion] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { cargarTodo(); }, [planExistente?.id]);

  const showToast = (msg, color = B.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const cargarTodo = async () => {
    setLoading(true);
    
    // 1. Cargar categorías SMAE
    const { data: cats } = await supabase
      .from('smae_categorias')
      .select('*')
      .eq('activo', true)
      .order('orden');
    setCategorias(cats || []);
    
    if (planExistente) {
      // Cargar plan existente
      setPlan(planExistente);
      setFechaInicio(planExistente.fecha_inicio);
      setKcalObjetivo(planExistente.kcal_objetivo || 1500);
      setRecomendaciones(planExistente.recomendaciones || '');
      setSuplementacion(planExistente.suplementacion || '');
      
      // Cargar días con sus tiempos
      const { data: dias } = await supabase
        .from('plan_dia')
        .select('*, plan_dia_tiempos(*)')
        .eq('plan_semanal_id', planExistente.id);
      
      // Estructurar en formato fácil de editar
      const diasFormat = dias.map(d => {
        const tiemposObj = {};
        TIEMPOS.forEach(t => { tiemposObj[t.v] = {}; });
        
        d.plan_dia_tiempos.forEach(pt => {
          tiemposObj[pt.tiempo][pt.categoria_id] = pt.equivalentes_asignados;
        });
        
        return { id: d.id, dia: d.dia, fecha: d.fecha, tiempos: tiemposObj };
      });
      
      setPlanDias(diasFormat);
    } else {
      // Plan nuevo: inicializar 7 días vacíos
      const dias = DIAS.map((d, i) => {
        const fecha = new Date(fechaInicio);
        fecha.setDate(fecha.getDate() + i);
        const tiemposObj = {};
        TIEMPOS.forEach(t => { tiemposObj[t.v] = {}; });
        return { dia: d.v, fecha: fecha.toISOString().split('T')[0], tiempos: tiemposObj };
      });
      setPlanDias(dias);
    }
    
    setLoading(false);
  };

  // Cambiar cantidad de equivalentes
  const setEquivalentes = (categoriaId, valor) => {
    const nuevos = [...planDias];
    const diaIdx = nuevos.findIndex(d => d.dia === diaActivo);
    if (diaIdx === -1) return;
    
    nuevos[diaIdx].tiempos[tiempoActivo][categoriaId] = Math.max(0, valor);
    setPlanDias(nuevos);
  };

  const getEquivalentes = (categoriaId) => {
    const dia = planDias.find(d => d.dia === diaActivo);
    if (!dia) return 0;
    return dia.tiempos[tiempoActivo]?.[categoriaId] || 0;
  };

  // Calcular calorías del día activo
  const calcularKcalDia = () => {
    const dia = planDias.find(d => d.dia === diaActivo);
    if (!dia) return 0;
    
    let total = 0;
    Object.values(dia.tiempos).forEach(tiempo => {
      Object.entries(tiempo).forEach(([catId, eq]) => {
        const cat = categorias.find(c => c.id === catId);
        if (cat) total += (cat.kcal_por_equivalente || 0) * eq;
      });
    });
    return Math.round(total);
  };

  // Calcular total de equivalentes del día activo
  const contarEquivalentesDia = () => {
    const dia = planDias.find(d => d.dia === diaActivo);
    if (!dia) return 0;
    
    let total = 0;
    Object.values(dia.tiempos).forEach(tiempo => {
      Object.values(tiempo).forEach(eq => { total += eq; });
    });
    return total;
  };

  // Copiar plan de hoy a otro día
  const copiarDia = (diaOrigen, diaDestino) => {
    const origen = planDias.find(d => d.dia === diaOrigen);
    if (!origen) return;
    
    const nuevos = [...planDias];
    const destinoIdx = nuevos.findIndex(d => d.dia === diaDestino);
    if (destinoIdx === -1) return;
    
    nuevos[destinoIdx].tiempos = JSON.parse(JSON.stringify(origen.tiempos));
    setPlanDias(nuevos);
    showToast(`Copiado de ${diaOrigen} a ${diaDestino} ✓`);
  };

  // GUARDAR el plan completo
  const guardar = async () => {
    setGuardando(true);
    
    try {
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 6);
      
      let planSemanalId = plan?.id;
      
      if (planSemanalId) {
        // Actualizar plan existente
        await supabase
          .from('planes_semanales')
          .update({
            kcal_objetivo: kcalObjetivo,
            recomendaciones,
            suplementacion,
          })
          .eq('id', planSemanalId);
        
        // Borrar tiempos viejos
        const { data: diasViejos } = await supabase
          .from('plan_dia')
          .select('id')
          .eq('plan_semanal_id', planSemanalId);
        
        if (diasViejos?.length) {
          await supabase
            .from('plan_dia_tiempos')
            .delete()
            .in('plan_dia_id', diasViejos.map(d => d.id));
        }
      } else {
        // Buscar programa activo del paciente
        const { data: prog } = await supabase
          .from('programas_paciente')
          .select('id')
          .eq('paciente_id', paciente.id)
          .in('estado', ['activo','por_vencer'])
          .limit(1)
          .maybeSingle();
        
        // Crear plan nuevo
        const { data: nuevoPlan, error: errPlan } = await supabase
          .from('planes_semanales')
          .insert([{
            paciente_id: paciente.id,
            programa_id: prog?.id || null,
            numero_semana: 1,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin.toISOString().split('T')[0],
            kcal_objetivo: kcalObjetivo,
            recomendaciones,
            suplementacion,
            estado: 'activo',
            created_by: usuario?.id,
          }])
          .select()
          .single();
        
        if (errPlan) throw errPlan;
        planSemanalId = nuevoPlan.id;
      }
      
      // Crear/actualizar los 7 días
      for (const dia of planDias) {
        let planDiaId = dia.id;
        
        if (!planDiaId) {
          const { data: nuevoDia, error: errDia } = await supabase
            .from('plan_dia')
            .insert([{
              plan_semanal_id: planSemanalId,
              dia: dia.dia,
              fecha: dia.fecha,
            }])
            .select()
            .single();
          
          if (errDia) throw errDia;
          planDiaId = nuevoDia.id;
        }
        
        // Insertar tiempos del día
        const tiemposInsert = [];
        Object.entries(dia.tiempos).forEach(([tiempo, cats]) => {
          Object.entries(cats).forEach(([catId, eq]) => {
            if (eq > 0) {
              tiemposInsert.push({
                plan_dia_id: planDiaId,
                tiempo,
                categoria_id: catId,
                equivalentes_asignados: eq,
              });
            }
          });
        });
        
        if (tiemposInsert.length > 0) {
          await supabase.from('plan_dia_tiempos').insert(tiemposInsert);
        }
      }
      
      onGuardado();
    } catch (e) {
      showToast('Error: ' + e.message, B.red);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: B.gray }}>
        Cargando editor de plan...
      </div>
    );
  }

  const kcalDia = calcularKcalDia();
  const equivDia = contarEquivalentesDia();
  const diaInfo = DIAS.find(d => d.v === diaActivo);

  return (
    <div style={{ padding: 20 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onVolver} style={btnBack()}>← Volver</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: B.navy, margin: 0 }}>
            ✏️ Editor de plan semanal
          </h2>
          <p style={{ fontSize: 12, color: B.gray, margin: '2px 0 0' }}>
            {paciente.nombre} · Semana del {formatDate(fechaInicio)}
          </p>
        </div>
        <button onClick={guardar} disabled={guardando} style={btnPrimary({ opacity: guardando ? 0.5 : 1 })}>
          {guardando ? 'Guardando...' : '💾 Guardar plan'}
        </button>
      </div>

      {/* Config básica */}
      <div style={configBar()}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={miniLabel()}>Fecha inicio (Lunes)</label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={e => setFechaInicio(e.target.value)}
              style={miniInput()}
            />
          </div>
          <div>
            <label style={miniLabel()}>Kcal objetivo</label>
            <input 
              type="number" 
              value={kcalObjetivo} 
              onChange={e => setKcalObjetivo(parseInt(e.target.value) || 0)}
              style={{...miniInput(), width: 100 }}
            />
          </div>
        </div>
      </div>

      {/* Días de la semana */}
      <div style={{ marginBottom: 16 }}>
        <div style={miniLabel()}>📅 Selecciona el día a editar</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {DIAS.map(d => {
            const tieneAsignaciones = planDias.find(pd => pd.dia === d.v) && 
              Object.values(planDias.find(pd => pd.dia === d.v).tiempos).some(t => Object.values(t).some(eq => eq > 0));
            return (
              <button
                key={d.v}
                onClick={() => setDiaActivo(d.v)}
                style={dayTab(diaActivo === d.v, tieneAsignaciones)}
              >
                <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 700 }}>{d.l}</div>
                {tieneAsignaciones && <div style={{ fontSize: 9, marginTop: 2 }}>✓ Con plan</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tiempos de comida */}
      <div style={{ marginBottom: 16 }}>
        <div style={miniLabel()}>🍽️ Tiempo de comida del {diaInfo?.n}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, background: B.grayLt, padding: 6, borderRadius: 10 }}>
          {TIEMPOS.map(t => (
            <button
              key={t.v}
              onClick={() => setTiempoActivo(t.v)}
              style={mealStep(tiempoActivo === t.v)}
            >
              <span style={{ fontSize: 16, display: 'block', marginBottom: 2 }}>{t.icon}</span>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Categorías SMAE */}
      <div style={{ marginBottom: 16 }}>
        <div style={miniLabel()}>
          🥗 Asigna equivalentes a las categorías para {TIEMPOS.find(t => t.v === tiempoActivo)?.l}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {categorias.map(cat => {
            const eq = getEquivalentes(cat.id);
            return (
              <div key={cat.id} style={catCard(eq > 0)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                  <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: B.navy, lineHeight: 1.2 }}>
                    {cat.nombre}
                  </div>
                </div>
                <div style={{ fontSize: 9, color: B.gray, marginBottom: 6 }}>
                  {cat.kcal_por_equivalente} kcal/eq
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button onClick={() => setEquivalentes(cat.id, eq - 1)} style={qtyBtn()}>−</button>
                  <input
                    type="number"
                    min="0"
                    value={eq}
                    onChange={e => setEquivalentes(cat.id, parseInt(e.target.value) || 0)}
                    style={qtyInput()}
                  />
                  <button onClick={() => setEquivalentes(cat.id, eq + 1)} style={qtyBtn()}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen del día */}
      <div style={summaryBar()}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flex: 1 }}>
          <SummaryCell label="Calorías" valor={`${kcalDia} kcal`} color={B.green} />
          <SummaryCell label="Equivalentes" valor={equivDia} color={B.blue} />
          <SummaryCell label="Diferencia con meta" valor={`${kcalDia - kcalObjetivo > 0 ? '+' : ''}${kcalDia - kcalObjetivo}`} color={Math.abs(kcalDia - kcalObjetivo) < 100 ? B.green : B.amber} />
          <SummaryCell label="Estado" valor={kcalDia === 0 ? 'Sin asignar' : Math.abs(kcalDia - kcalObjetivo) < 100 ? '✓ Equilibrado' : 'Ajustar'} color={B.navy} />
        </div>
      </div>

      {/* Recomendaciones */}
      <details style={{ marginTop: 16, background: 'white', padding: 14, borderRadius: 10, border: `1px solid ${B.grayMd}` }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: B.navy }}>
          📝 Recomendaciones y suplementación (opcional)
        </summary>
        <div style={{ marginTop: 12 }}>
          <label style={miniLabel()}>Recomendaciones para el paciente</label>
          <textarea
            value={recomendaciones}
            onChange={e => setRecomendaciones(e.target.value)}
            placeholder="Ej: Comer cada 3 horas. Beber 2L de agua al día..."
            style={textareaStyle()}
          />
          <label style={miniLabel()}>Suplementación (sobre todo Grupo A)</label>
          <textarea
            value={suplementacion}
            onChange={e => setSuplementacion(e.target.value)}
            placeholder="Ej: Multivitamínico 2x/día. Vit B12 sublingual..."
            style={textareaStyle()}
          />
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

// ─────────────────────────────────────────────────────────────────────────
const SummaryCell = ({ label, valor, color }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: color || 'white', marginTop: 4 }}>{valor}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────
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

const btnPrimary = (extra) => ({
  padding: '10px 18px',
  background: B.green,
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
  ...extra,
});

const configBar = () => ({
  background: B.softGreen,
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
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

const miniInput = () => ({
  padding: '7px 10px',
  border: `1.5px solid ${B.grayMd}`,
  borderRadius: 7,
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
  background: 'white',
});

const dayTab = (activo, conPlan) => ({
  padding: 10,
  textAlign: 'center',
  border: `2px solid ${activo ? B.green : conPlan ? B.greenLt || B.green : B.grayMd}`,
  borderRadius: 8,
  background: activo ? B.green : 'white',
  color: activo ? 'white' : conPlan ? B.green : B.gray,
  cursor: 'pointer',
  fontWeight: 700,
  fontFamily: 'inherit',
});

const mealStep = (activo) => ({
  padding: '10px 4px',
  textAlign: 'center',
  borderRadius: 7,
  background: activo ? B.green : 'white',
  color: activo ? 'white' : B.gray,
  border: 'none',
  fontWeight: 700,
  fontSize: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const catCard = (assigned) => ({
  background: assigned ? B.softGreen : 'white',
  border: `2px solid ${assigned ? B.green : B.grayMd}`,
  borderRadius: 10,
  padding: 10,
  transition: 'all 0.15s',
});

const qtyBtn = () => ({
  width: 26,
  height: 26,
  background: 'white',
  border: `1px solid ${B.grayMd}`,
  borderRadius: 5,
  fontSize: 14,
  cursor: 'pointer',
  color: B.navy,
  fontWeight: 700,
  fontFamily: 'inherit',
});

const qtyInput = () => ({
  flex: 1,
  textAlign: 'center',
  fontWeight: 700,
  color: B.navy,
  border: `1px solid ${B.grayMd}`,
  borderRadius: 5,
  padding: 4,
  fontSize: 13,
  background: 'white',
  outline: 'none',
  fontFamily: 'inherit',
});

const summaryBar = () => ({
  background: `linear-gradient(135deg, ${B.green}, #0F5734)`,
  color: 'white',
  padding: 16,
  borderRadius: 10,
  marginTop: 14,
});

const textareaStyle = () => ({
  width: '100%',
  padding: 10,
  border: `1.5px solid ${B.grayMd}`,
  borderRadius: 7,
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
  background: 'white',
  marginBottom: 10,
  minHeight: 60,
  resize: 'vertical',
});

function obtenerLunesProximaSemana() {
  const hoy = new Date();
  const dia = hoy.getDay() || 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + (8 - dia));
  return lunes.toISOString().split('T')[0];
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]} ${d.getFullYear()}`;
}
