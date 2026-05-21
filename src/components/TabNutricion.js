// ════════════════════════════════════════════════════════════════════════
// TabNutricion.js — Tab principal del módulo de nutrición
//
// Se usa DENTRO de PacienteDetalle.js, reemplazando el placeholder actual.
// Muestra: plan semanal activo + acceso a editor + plantillas + cumplimiento
//
// Props:
//   - paciente: {id, nombre, grupo_nutricional, ...}
//   - usuario: el usuario logueado (admin/nutri)
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import GestionPlantillas from './GestionPlantillas';
import EditorPlanSemanal from './EditorPlanSemanal';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', greenLt: '#4ADE80', red: '#B02020',
  orange: '#C25A00', amber: '#F59E0B', purple: '#7C3AED',
  softGreen: '#E6F5EE', softBlue: '#E8F2FA', softOrange: '#FFF0E0',
  softAmber: '#FEF3C7',
};

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function TabNutricion({ paciente, usuario }) {
  const [vista, setVista] = useState('resumen'); // resumen | editor | plantillas
  const [planActivo, setPlanActivo] = useState(null);
  const [cumplimiento, setCumplimiento] = useState({ promedio: 0, dias: [] });
  const [loading, setLoading] = useState(true);
  const [modalAplicarPlantilla, setModalAplicarPlantilla] = useState(false);
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
    
    // Buscar plan semanal activo
    const { data: plan } = await supabase
      .from('planes_semanales')
      .select('*')
      .eq('paciente_id', paciente.id)
      .in('estado', ['activo', 'borrador'])
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setPlanActivo(plan);
    
    if (plan) {
      // Calcular cumplimiento de cada día de la semana actual
      const diasData = [];
      for (let i = 0; i < 7; i++) {
        const fecha = new Date(plan.fecha_inicio);
        fecha.setDate(fecha.getDate() + i);
        const fechaStr = fecha.toISOString().split('T')[0];
        
        const { data: cumpData } = await supabase
          .rpc('calcular_cumplimiento_dia', {
            p_paciente_id: paciente.id,
            p_fecha: fechaStr,
          });
        
        diasData.push({
          dia: DIAS_LABEL[i],
          fecha: fechaStr,
          porcentaje: cumpData?.porcentaje || 0,
          sinPlan: cumpData?.sin_plan || false,
        });
      }
      
      const promedio = Math.round(
        diasData.reduce((acc, d) => acc + d.porcentaje, 0) / 7
      );
      
      setCumplimiento({ promedio, dias: diasData });
    }
    
    setLoading(false);
  };

  // Si estamos en vista de editor o plantillas, mostramos solo eso
  if (vista === 'editor') {
    return (
      <EditorPlanSemanal
        paciente={paciente}
        usuario={usuario}
        planExistente={planActivo}
        onVolver={() => { setVista('resumen'); cargarDatos(); }}
        onGuardado={() => { setVista('resumen'); cargarDatos(); showToast('Plan guardado ✓'); }}
      />
    );
  }
  
  if (vista === 'plantillas') {
    return (
      <GestionPlantillas
        usuario={usuario}
        onVolver={() => setVista('resumen')}
        onAplicar={async (plantillaId) => {
          // Aplicar plantilla y crear plan
          const lunes = obtenerLunesProximaSemana();
          const { data: planId, error } = await supabase
            .rpc('aplicar_plantilla_paciente', {
              p_plantilla_id: plantillaId,
              p_paciente_id: paciente.id,
              p_fecha_inicio: lunes,
            });
          
          if (error) { showToast('Error: ' + error.message, B.red); return; }
          showToast('Plantilla aplicada ✓');
          setVista('resumen');
          cargarDatos();
        }}
      />
    );
  }

  // VISTA PRINCIPAL: Resumen del módulo de nutrición
  return (
    <div style={{ padding: 20 }}>
      
      {/* Header con datos del grupo */}
      <div style={cardHeader()}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            🥗 Módulo Nutrición
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
            {paciente.nombre} {paciente.apellido || ''}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
            Grupo nutricional: {
              paciente.grupo_nutricional === 'A' 
                ? '🟠 A — Bariátrico / Farmacológico' 
                : paciente.grupo_nutricional === 'B'
                ? '🟢 B — Conservador'
                : '⚪ Sin asignar'
            }
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setVista('plantillas')} style={btnSecondary()}>
            🍱 Plantillas
          </button>
          <button onClick={() => setVista('editor')} style={btnPrimary()}>
            {planActivo ? '✏️ Editar plan' : '+ Crear plan semanal'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: B.gray }}>
          Cargando información nutricional...
        </div>
      ) : !planActivo ? (
        // Estado vacío
        <div style={emptyState()}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🥗</div>
          <h3 style={{ color: B.navy, marginBottom: 8 }}>Sin plan nutricional activo</h3>
          <p style={{ color: B.gray, fontSize: 13, marginBottom: 20 }}>
            Crea un plan semanal personalizado o aplica una de las 6 plantillas pre-armadas.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => setVista('plantillas')} style={btnSecondary()}>
              🍱 Usar plantilla
            </button>
            <button onClick={() => setVista('editor')} style={btnPrimary()}>
              + Crear desde cero
            </button>
          </div>
        </div>
      ) : (
        // Plan activo: mostrar resumen + cumplimiento
        <>
          {/* Tarjeta del plan activo */}
          <div style={planCard()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                  Plan activo · Semana #{planActivo.numero_semana || 1}
                </div>
                <div style={{ fontSize: 16, color: B.navy, fontWeight: 700, marginTop: 4 }}>
                  📅 {formatRange(planActivo.fecha_inicio, planActivo.fecha_fin)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                  Objetivo calórico
                </div>
                <div style={{ fontSize: 22, color: B.green, fontWeight: 800, marginTop: 2 }}>
                  {planActivo.kcal_objetivo || '—'} kcal
                </div>
              </div>
            </div>
            
            {planActivo.recomendaciones && (
              <div style={recomCard()}>
                <strong style={{ color: B.blue }}>📋 Recomendaciones:</strong>
                <p style={{ marginTop: 4, color: B.navy, fontSize: 12 }}>{planActivo.recomendaciones}</p>
              </div>
            )}
            
            {planActivo.suplementacion && (
              <div style={{...recomCard(), background: B.softOrange, borderColor: B.orange}}>
                <strong style={{ color: B.orange }}>💊 Suplementación:</strong>
                <p style={{ marginTop: 4, color: B.navy, fontSize: 12 }}>{planActivo.suplementacion}</p>
              </div>
            )}
          </div>

          {/* Cumplimiento de la semana */}
          <div style={cumplimientoCard()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, color: B.navy, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                📊 Cumplimiento esta semana
              </h3>
              <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: cumplimiento.promedio >= 75 ? B.green : cumplimiento.promedio >= 50 ? B.amber : B.red,
              }}>
                {cumplimiento.promedio}%
              </div>
            </div>
            
            {/* Barras por día */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {cumplimiento.dias.map((d, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    height: 80,
                    background: B.grayLt,
                    borderRadius: 6,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                  }}>
                    <div style={{
                      height: `${d.porcentaje}%`,
                      background: d.porcentaje >= 75 ? B.green : d.porcentaje >= 50 ? B.amber : d.porcentaje > 0 ? B.red : 'transparent',
                      borderRadius: 6,
                      transition: 'height 0.3s',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: B.gray, fontWeight: 700, marginTop: 4, textTransform: 'uppercase' }}>
                    {d.dia}
                  </div>
                  <div style={{ fontSize: 11, color: B.navy, fontWeight: 700 }}>
                    {d.porcentaje}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setVista('editor')} style={btnSecondary()}>
              ✏️ Editar plan semanal
            </button>
            <button style={btnSecondary()} disabled>
              🛒 Ver lista de súper
            </button>
            <button style={btnSecondary()} disabled>
              🖨️ Imprimir reporte
            </button>
          </div>
        </>
      )}
      
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
// HELPERS DE UI
// ─────────────────────────────────────────────────────────────────────────
const cardHeader = () => ({
  background: `linear-gradient(135deg, ${B.green}, #0F5734)`,
  color: 'white',
  padding: 20,
  borderRadius: 12,
  marginBottom: 16,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 12,
});

const emptyState = () => ({
  background: 'white',
  border: `2px dashed ${B.grayMd}`,
  borderRadius: 12,
  padding: 40,
  textAlign: 'center',
});

const planCard = () => ({
  background: 'white',
  border: `1px solid ${B.grayMd}`,
  borderRadius: 12,
  padding: 18,
  marginBottom: 16,
});

const cumplimientoCard = () => ({
  background: 'white',
  border: `1px solid ${B.grayMd}`,
  borderRadius: 12,
  padding: 18,
});

const recomCard = () => ({
  background: B.softBlue,
  border: `1px solid ${B.blue}`,
  borderRadius: 8,
  padding: 10,
  marginTop: 10,
  fontSize: 12,
});

const btnPrimary = () => ({
  padding: '10px 18px',
  background: 'white',
  color: B.green,
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const btnSecondary = () => ({
  padding: '10px 18px',
  background: 'rgba(255,255,255,0.15)',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

// Helpers
function obtenerLunesProximaSemana() {
  const hoy = new Date();
  const dia = hoy.getDay() || 7; // domingo = 7
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + (8 - dia));
  return lunes.toISOString().split('T')[0];
}

function formatRange(inicio, fin) {
  const a = new Date(inicio);
  const b = new Date(fin);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${a.getDate()} ${meses[a.getMonth()]} - ${b.getDate()} ${meses[b.getMonth()]} ${b.getFullYear()}`;
}
