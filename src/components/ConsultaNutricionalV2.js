// ════════════════════════════════════════════════════════════════════════
// ConsultaNutricionalV2.js — Nueva consulta de seguimiento (SOAP)
//
// Para los controles periódicos (mensuales en SMAE, según fase en bariátricos).
// Estructura SOAP: Subjetivo · Objetivo · Análisis · Plan
//
// Props:
//   - paciente:    {id, nombre, ...}
//   - usuario:     usuario logueado
//   - protocolo:   protocolo del paciente
//   - modo:        'nueva' | 'editar'
//   - consultaExistente: si modo=editar
//   - onVolver:    callback regresar
//   - onGuardado:  callback al guardar
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

export default function ConsultaNutricionalV2({ paciente, usuario, protocolo, modo = 'nueva', consultaExistente, onVolver, onGuardado }) {
  const [seccion, setSeccion] = useState('subjetivo');
  const [guardando, setGuardando] = useState(false);
  const [ultimaConsulta, setUltimaConsulta] = useState(null);
  const [error, setError] = useState(null);
  const [numeroConsulta, setNumeroConsulta] = useState(1);

  const [form, setForm] = useState({
    fecha: consultaExistente?.fecha || new Date().toISOString().split('T')[0],
    // S — Subjetivo
    motivo_consulta: consultaExistente?.motivo_consulta || '',
    evolucion_paciente: consultaExistente?.evolucion_paciente || '',
    adherencia_pct: consultaExistente?.adherencia_pct || 80,
    sintomas_digestivos: consultaExistente?.sintomas_digestivos || '',
    // O — Objetivo (Antropometría)
    peso_kg: consultaExistente?.peso_kg || '',
    talla_cm: consultaExistente?.talla_cm || '',
    grasa_pct: consultaExistente?.grasa_pct || '',
    masa_muscular_kg: consultaExistente?.masa_muscular_kg || '',
    cintura_cm: consultaExistente?.cintura_cm || '',
    cadera_cm: consultaExistente?.cadera_cm || '',
    bioquimica: consultaExistente?.bioquimica || '',
    // A — Análisis
    diagnostico: consultaExistente?.diagnostico || '',
    // P — Plan
    recomendaciones_visita: consultaExistente?.recomendaciones_visita || '',
    objetivos_proxima_visita: consultaExistente?.objetivos_proxima_visita || '',
    proxima_consulta: consultaExistente?.proxima_consulta || '',
  });

  useEffect(() => { 
    cargarContexto();
  }, [paciente.id]);

  const cargarContexto = async () => {
    // Cargar última consulta para mostrar evolución
    const { data: ult } = await supabase
      .from('consultas_nutricion_v2')
      .select('*')
      .eq('paciente_id', paciente.id)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    setUltimaConsulta(ult || null);

    // Calcular número de consulta
    const { count } = await supabase
      .from('consultas_nutricion_v2')
      .select('*', { count: 'exact', head: true })
      .eq('paciente_id', paciente.id);

    setNumeroConsulta((count || 0) + 1);

    // Pre-llenar talla si no fue cambiada
    if (ult && !form.talla_cm) {
      setForm(prev => ({ ...prev, talla_cm: ult.talla_cm || '' }));
    }
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  const calcularIMC = () => {
    const p = parseFloat(form.peso_kg);
    const t = parseFloat(form.talla_cm);
    if (p && t) return (p / Math.pow(t / 100, 2)).toFixed(2);
    return '';
  };

  // Diferencia con consulta anterior
  const diff = (campo) => {
    if (!ultimaConsulta || !ultimaConsulta[campo] || !form[campo]) return null;
    const actual = parseFloat(form[campo]);
    const anterior = parseFloat(ultimaConsulta[campo]);
    if (isNaN(actual) || isNaN(anterior)) return null;
    const d = (actual - anterior).toFixed(2);
    return d;
  };

  const renderDiff = (campo, unidad = 'kg', esMejor = 'menos') => {
    const d = diff(campo);
    if (d === null || d === '0.00') return null;
    const positivo = parseFloat(d) > 0;
    const esBueno = esMejor === 'menos' ? !positivo : positivo;
    return (
      <div style={{ fontSize: 10, color: esBueno ? B.green : B.red, marginTop: 3, fontWeight: 700 }}>
        {positivo ? '↑ +' : '↓ '}{Math.abs(parseFloat(d))} {unidad}
      </div>
    );
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        paciente_id: paciente.id,
        tipo: 'seguimiento',
        numero: numeroConsulta,
        fecha: form.fecha,
        peso_kg: form.peso_kg || null,
        talla_cm: form.talla_cm || null,
        imc: calcularIMC() || null,
        grasa_pct: form.grasa_pct || null,
        masa_muscular_kg: form.masa_muscular_kg || null,
        cintura_cm: form.cintura_cm || null,
        cadera_cm: form.cadera_cm || null,
        motivo_consulta: form.motivo_consulta || null,
        evolucion_paciente: form.evolucion_paciente || null,
        adherencia_pct: form.adherencia_pct || null,
        sintomas_digestivos: form.sintomas_digestivos || null,
        bioquimica: form.bioquimica || null,
        diagnostico: form.diagnostico || null,
        recomendaciones_visita: form.recomendaciones_visita || null,
        objetivos_proxima_visita: form.objetivos_proxima_visita || null,
        proxima_consulta: form.proxima_consulta || null,
        creada_por: usuario?.id,
      };

      if (modo === 'editar' && consultaExistente) {
        const { error: err } = await supabase
          .from('consultas_nutricion_v2')
          .update(payload)
          .eq('id', consultaExistente.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('consultas_nutricion_v2')
          .insert([payload]);
        if (err) throw err;
      }

      await supabase.from('citas').update({ estado: 'atendida' }).eq('paciente_id', paciente.id).eq('fecha', new Date().toISOString().split('T')[0]).in('estado', ['pendiente', 'preatendido', 'confirmada']);

      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={onVolver} style={btnBack()}>← Volver</button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: B.navy, margin: 0 }}>
            🩺 Consulta Nutricional #{numeroConsulta}
          </h2>
          <p style={{ fontSize: 12, color: B.gray, margin: '2px 0 0' }}>
            {paciente.nombre} {paciente.apellido || ''}
            {ultimaConsulta && ` · Última: ${formatDate(ultimaConsulta.fecha)}`}
          </p>
        </div>
        <button onClick={guardar} disabled={guardando} style={{ ...btnPrimary(B.green), opacity: guardando ? 0.5 : 1 }}>
          {guardando ? 'Guardando...' : '💾 Guardar consulta'}
        </button>
      </div>

      {/* Fecha de la consulta */}
      <div style={{ background: B.softBlue, padding: '10px 14px', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: B.blue, textTransform: 'uppercase' }}>📅 Fecha de la consulta</span>
        <input
          type="date"
          value={form.fecha}
          onChange={e => set('fecha', e.target.value)}
          style={{ padding: '6px 10px', border: `1px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }}
        />
      </div>

      {/* Tabs SOAP */}
      <div style={{ background: 'white', padding: '10px 14px', display: 'flex', gap: 4, border: `1px solid ${B.grayMd}`, borderRadius: '12px 12px 0 0', overflowX: 'auto' }}>
        {[
          { k: 'subjetivo', l: '💬 S — Subjetivo' },
          { k: 'objetivo',  l: '📏 O — Objetivo' },
          { k: 'analisis',  l: '🩺 A — Análisis' },
          { k: 'plan',      l: '🎯 P — Plan' },
        ].map(t => (
          <button key={t.k} onClick={() => setSeccion(t.k)} style={tabBtn(seccion === t.k)}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ background: 'white', border: `1px solid ${B.grayMd}`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 22 }}>
        {error && (
          <div style={{ background: '#FFEBEB', color: B.red, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {/* S — SUBJETIVO */}
        {seccion === 'subjetivo' && (
          <div>
            <SecHeader titulo="💬 Subjetivo — Lo que el paciente reporta" color={B.blue} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Area label="Motivo de esta consulta" valor={form.motivo_consulta} onChange={v => set('motivo_consulta', v)} placeholder="Control mensual, consulta por molestia, ajuste de plan..." rows={2} />
              <Area label="Evolución desde la última visita" valor={form.evolucion_paciente} onChange={v => set('evolucion_paciente', v)} placeholder="¿Cómo se siente? ¿Cumplió el plan? ¿Cambios físicos o emocionales?" rows={4} />
              <div>
                <label style={miniLabel()}>Adherencia al plan: <strong style={{ color: B.navy }}>{form.adherencia_pct}%</strong></label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={form.adherencia_pct}
                  onChange={e => set('adherencia_pct', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: form.adherencia_pct >= 70 ? B.green : form.adherencia_pct >= 40 ? B.orange : B.red }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: B.gray, marginTop: 2 }}>
                  <span>Baja (0%)</span><span>Buena (70%)</span><span>Excelente (100%)</span>
                </div>
              </div>
              <Area label="Síntomas digestivos" valor={form.sintomas_digestivos} onChange={v => set('sintomas_digestivos', v)} placeholder="Náuseas, reflujo, estreñimiento, dolor..." rows={2} />
            </div>
          </div>
        )}

        {/* O — OBJETIVO */}
        {seccion === 'objetivo' && (
          <div>
            <SecHeader titulo="📏 Objetivo — Datos medidos" color={B.green} />
            
            {ultimaConsulta && ultimaConsulta.peso_kg && (
              <div style={{ background: B.softGreen, padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 12, color: B.navy }}>
                💡 Última medición ({formatDate(ultimaConsulta.fecha)}): 
                Peso <strong>{ultimaConsulta.peso_kg} kg</strong>
                {ultimaConsulta.imc && ` · IMC ${ultimaConsulta.imc}`}
                {ultimaConsulta.grasa_pct && ` · ${ultimaConsulta.grasa_pct}% grasa`}
              </div>
            )}

            <h4 style={{ fontSize: 12, color: B.navy, marginBottom: 10 }}>Antropometría</h4>
            <div style={gridForm()}>
              <FieldDiff label="Peso (kg)" tipo="number" valor={form.peso_kg} onChange={v => set('peso_kg', v)} diff={renderDiff('peso_kg', 'kg', 'menos')} />
              <FieldDiff label="Talla (cm)" tipo="number" valor={form.talla_cm} onChange={v => set('talla_cm', v)} />
              <Field label="IMC (calculado)" valor={calcularIMC()} disabled />
              <FieldDiff label="% Grasa corporal" tipo="number" valor={form.grasa_pct} onChange={v => set('grasa_pct', v)} diff={renderDiff('grasa_pct', '%', 'menos')} />
              <FieldDiff label="Masa muscular (kg)" tipo="number" valor={form.masa_muscular_kg} onChange={v => set('masa_muscular_kg', v)} diff={renderDiff('masa_muscular_kg', 'kg', 'mas')} />
              <FieldDiff label="Cintura (cm)" tipo="number" valor={form.cintura_cm} onChange={v => set('cintura_cm', v)} diff={renderDiff('cintura_cm', 'cm', 'menos')} />
              <FieldDiff label="Cadera (cm)" tipo="number" valor={form.cadera_cm} onChange={v => set('cadera_cm', v)} diff={renderDiff('cadera_cm', 'cm', 'menos')} />
            </div>

            <h4 style={{ fontSize: 12, color: B.navy, marginTop: 22, marginBottom: 10 }}>Bioquímica</h4>
            <Area 
              label="Resultados de exámenes (si aplica)"
              valor={form.bioquimica} 
              onChange={v => set('bioquimica', v)} 
              placeholder="Glu: 95 / HbA1c: 5.4 / Colesterol: 180 / TG: 120 / Ácido úrico: 5.2 ..." 
              rows={5} 
            />
          </div>
        )}

        {/* A — ANÁLISIS */}
        {seccion === 'analisis' && (
          <div>
            <SecHeader titulo="🩺 Análisis — Diagnóstico nutricional" color={B.orange} />
            <Area 
              label="Diagnóstico / Evaluación"
              valor={form.diagnostico} 
              onChange={v => set('diagnostico', v)} 
              placeholder="Ej: Paciente con sobrepeso grado I en evolución favorable. Adherencia buena al plan SMAE. Disminución del 3% del peso corporal en 4 semanas..." 
              rows={8} 
            />
          </div>
        )}

        {/* P — PLAN */}
        {seccion === 'plan' && (
          <div>
            <SecHeader titulo="🎯 Plan — Indicaciones y próximos pasos" color={B.purple} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Area label="Recomendaciones de esta visita" valor={form.recomendaciones_visita} onChange={v => set('recomendaciones_visita', v)} placeholder="Continuar plan SMAE actual, ajustar porciones, recomendar suplementación..." rows={4} />
              <Area label="Objetivos para la próxima visita" valor={form.objetivos_proxima_visita} onChange={v => set('objetivos_proxima_visita', v)} placeholder="¿Qué esperamos lograr antes del siguiente control?" rows={3} />
              <Field label="📅 Próxima consulta" tipo="date" valor={form.proxima_consulta} onChange={v => set('proxima_consulta', v)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
function SecHeader({ titulo, color }) {
  return (
    <h3 style={{ fontSize: 13, color: B.navy, marginBottom: 16, paddingBottom: 8, borderBottom: `2px solid ${color}`, fontWeight: 700 }}>
      {titulo}
    </h3>
  );
}

function Field({ label, valor, onChange, tipo = 'text', placeholder = '', disabled = false }) {
  return (
    <div>
      <label style={miniLabel()}>{label}</label>
      <input
        type={tipo}
        value={valor || ''}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ ...inputStyle(), background: disabled ? B.grayLt : 'white' }}
      />
    </div>
  );
}

function FieldDiff({ label, valor, onChange, tipo = 'text', diff, disabled = false }) {
  return (
    <div>
      <label style={miniLabel()}>{label}</label>
      <input
        type={tipo}
        value={valor || ''}
        onChange={e => onChange && onChange(e.target.value)}
        disabled={disabled}
        style={{ ...inputStyle(), background: disabled ? B.grayLt : 'white' }}
      />
      {diff}
    </div>
  );
}

function Area({ label, valor, onChange, placeholder = '', rows = 3 }) {
  return (
    <div>
      <label style={miniLabel()}>{label}</label>
      <textarea
        value={valor || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ ...inputStyle(), resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
      />
    </div>
  );
}

const gridForm = () => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: 14,
});

const tabBtn = (active) => ({
  padding: '8px 13px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 6,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  background: active ? B.green : 'transparent',
  color: active ? 'white' : B.gray,
  border: 'none',
  fontFamily: 'inherit',
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

const btnPrimary = (color) => ({
  padding: '10px 18px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}
