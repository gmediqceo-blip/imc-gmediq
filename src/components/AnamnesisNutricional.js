// ════════════════════════════════════════════════════════════════════════
// AnamnesisNutricional.js — Formulario de anamnesis inicial
//
// Se completa UNA vez al inicio del seguimiento nutricional.
// Recoge datos socio-demográficos, hábitos alimentarios, historial.
//
// Props:
//   - paciente:    {id, nombre, ...}
//   - usuario:     usuario logueado
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
  softGreen: '#E6F5EE', softBlue: '#E8F2FA',
};

export default function AnamnesisNutricional({ paciente, usuario, onVolver, onGuardado }) {
  const [seccion, setSeccion] = useState('antropometria');
  const [guardando, setGuardando] = useState(false);
  const [anamnesisExistente, setAnamnesisExistente] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    // Antropometría inicial
    peso_kg: '',
    talla_cm: '',
    grasa_pct: '',
    masa_muscular_kg: '',
    cintura_cm: '',
    cadera_cm: '',
    // Subjetivo
    motivo_consulta: '',
    evolucion_paciente: '',
    sintomas_digestivos: '',
    // Bioquímica
    bioquimica: '',
    // Hábitos (los guardamos en evolucion_paciente como texto rico)
    habitos_alimentarios: '',
    apetito: '',
    intolerancias: '',
    suplementos_actuales: '',
    actividad_fisica: '',
    horas_sueno: '',
    consumo_agua: '',
    consumo_alcohol: '',
    fuma: '',
    // Plan
    diagnostico: '',
    recomendaciones_visita: '',
    objetivos_proxima_visita: '',
    proxima_consulta: '',
  });

  useEffect(() => { cargarAnamnesisExistente(); }, [paciente.id]);

  const cargarAnamnesisExistente = async () => {
    const { data } = await supabase
      .from('consultas_nutricion_v2')
      .select('*')
      .eq('paciente_id', paciente.id)
      .eq('tipo', 'anamnesis')
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setAnamnesisExistente(data);
      // Rellenar form con datos existentes
      setForm({
        ...form,
        peso_kg: data.peso_kg || '',
        talla_cm: data.talla_cm || '',
        grasa_pct: data.grasa_pct || '',
        masa_muscular_kg: data.masa_muscular_kg || '',
        cintura_cm: data.cintura_cm || '',
        cadera_cm: data.cadera_cm || '',
        motivo_consulta: data.motivo_consulta || '',
        evolucion_paciente: data.evolucion_paciente || '',
        sintomas_digestivos: data.sintomas_digestivos || '',
        bioquimica: data.bioquimica || '',
        diagnostico: data.diagnostico || '',
        recomendaciones_visita: data.recomendaciones_visita || '',
        objetivos_proxima_visita: data.objetivos_proxima_visita || '',
        proxima_consulta: data.proxima_consulta || '',
      });
    }
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  const calcularIMC = () => {
    const p = parseFloat(form.peso_kg);
    const t = parseFloat(form.talla_cm);
    if (p && t) {
      return (p / Math.pow(t / 100, 2)).toFixed(2);
    }
    return '';
  };

  const showToast = (msg, color = B.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        paciente_id: paciente.id,
        tipo: 'anamnesis',
        numero: 1,
        fecha: new Date().toISOString().split('T')[0],
        peso_kg: form.peso_kg || null,
        talla_cm: form.talla_cm || null,
        imc: calcularIMC() || null,
        grasa_pct: form.grasa_pct || null,
        masa_muscular_kg: form.masa_muscular_kg || null,
        cintura_cm: form.cintura_cm || null,
        cadera_cm: form.cadera_cm || null,
        motivo_consulta: form.motivo_consulta || null,
        evolucion_paciente: `${form.evolucion_paciente || ''}

HÁBITOS ALIMENTARIOS: ${form.habitos_alimentarios || '—'}
APETITO: ${form.apetito || '—'}
INTOLERANCIAS: ${form.intolerancias || '—'}
SUPLEMENTOS ACTUALES: ${form.suplementos_actuales || '—'}
ACTIVIDAD FÍSICA: ${form.actividad_fisica || '—'}
HORAS DE SUEÑO: ${form.horas_sueno || '—'}
CONSUMO DE AGUA: ${form.consumo_agua || '—'}
CONSUMO DE ALCOHOL: ${form.consumo_alcohol || '—'}
FUMA: ${form.fuma || '—'}`.trim(),
        sintomas_digestivos: form.sintomas_digestivos || null,
        bioquimica: form.bioquimica || null,
        diagnostico: form.diagnostico || null,
        recomendaciones_visita: form.recomendaciones_visita || null,
        objetivos_proxima_visita: form.objetivos_proxima_visita || null,
        proxima_consulta: form.proxima_consulta || null,
        creada_por: usuario?.id,
      };

      if (anamnesisExistente) {
        const { error: err } = await supabase
          .from('consultas_nutricion_v2')
          .update(payload)
          .eq('id', anamnesisExistente.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('consultas_nutricion_v2')
          .insert([payload]);
        if (err) throw err;
      }

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
            📋 Anamnesis Nutricional {anamnesisExistente && '(actualizando)'}
          </h2>
          <p style={{ fontSize: 12, color: B.gray, margin: '2px 0 0' }}>
            {paciente.nombre} {paciente.apellido || ''}
          </p>
        </div>
        <button onClick={guardar} disabled={guardando} style={{ ...btnPrimary(B.green), opacity: guardando ? 0.5 : 1 }}>
          {guardando ? 'Guardando...' : '💾 Guardar anamnesis'}
        </button>
      </div>

      {/* Tabs internos */}
      <div style={{ background: 'white', padding: '10px 14px', display: 'flex', gap: 4, border: `1px solid ${B.grayMd}`, borderRadius: '12px 12px 0 0', overflowX: 'auto' }}>
        {[
          { k: 'antropometria',  l: '📏 Antropometría' },
          { k: 'motivo',         l: '💬 Motivo y subjetivo' },
          { k: 'habitos',        l: '🍽️ Hábitos' },
          { k: 'bioquimica',     l: '🧪 Bioquímica' },
          { k: 'plan',           l: '🎯 Plan' },
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

        {/* ANTROPOMETRÍA */}
        {seccion === 'antropometria' && (
          <div>
            <SecHeader titulo="📏 Datos antropométricos iniciales" color={B.blue} />
            <div style={gridForm()}>
              <Field label="Peso (kg)" tipo="number" valor={form.peso_kg} onChange={v => set('peso_kg', v)} placeholder="85.4" />
              <Field label="Talla (cm)" tipo="number" valor={form.talla_cm} onChange={v => set('talla_cm', v)} placeholder="170" />
              <Field label="IMC (calculado)" valor={calcularIMC()} disabled />
              <Field label="% Grasa corporal" tipo="number" valor={form.grasa_pct} onChange={v => set('grasa_pct', v)} placeholder="22.5" />
              <Field label="Masa muscular (kg)" tipo="number" valor={form.masa_muscular_kg} onChange={v => set('masa_muscular_kg', v)} placeholder="38.2" />
              <Field label="Cintura (cm)" tipo="number" valor={form.cintura_cm} onChange={v => set('cintura_cm', v)} placeholder="90" />
              <Field label="Cadera (cm)" tipo="number" valor={form.cadera_cm} onChange={v => set('cadera_cm', v)} placeholder="100" />
            </div>
          </div>
        )}

        {/* MOTIVO Y SUBJETIVO */}
        {seccion === 'motivo' && (
          <div>
            <SecHeader titulo="💬 Motivo de consulta y subjetivo" color={B.blue} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Area label="Motivo de consulta" valor={form.motivo_consulta} onChange={v => set('motivo_consulta', v)} placeholder="¿Por qué viene el paciente?" rows={3} />
              <Area label="Evolución / antecedentes nutricionales" valor={form.evolucion_paciente} onChange={v => set('evolucion_paciente', v)} placeholder="Historia de peso, dietas previas, intentos anteriores..." rows={4} />
              <Area label="Síntomas digestivos" valor={form.sintomas_digestivos} onChange={v => set('sintomas_digestivos', v)} placeholder="Náuseas, reflujo, estreñimiento, dolor abdominal..." rows={3} />
            </div>
          </div>
        )}

        {/* HÁBITOS */}
        {seccion === 'habitos' && (
          <div>
            <SecHeader titulo="🍽️ Hábitos de vida" color={B.green} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Area label="Hábitos alimentarios" valor={form.habitos_alimentarios} onChange={v => set('habitos_alimentarios', v)} placeholder="¿Qué come en un día normal? Frecuencias, picoteos, comidas fuera de casa..." rows={4} />
              <div style={gridForm()}>
                <Field label="Apetito" valor={form.apetito} onChange={v => set('apetito', v)} placeholder="Normal / Aumentado / Disminuido" />
                <Field label="Horas de sueño" valor={form.horas_sueno} onChange={v => set('horas_sueno', v)} placeholder="7-8 horas" />
                <Field label="Consumo de agua" valor={form.consumo_agua} onChange={v => set('consumo_agua', v)} placeholder="2 litros/día" />
                <Field label="Actividad física" valor={form.actividad_fisica} onChange={v => set('actividad_fisica', v)} placeholder="Camina 3 veces/semana" />
                <Field label="Consumo de alcohol" valor={form.consumo_alcohol} onChange={v => set('consumo_alcohol', v)} placeholder="Ocasional, fines de semana" />
                <Field label="¿Fuma?" valor={form.fuma} onChange={v => set('fuma', v)} placeholder="No / Sí (cantidad/día)" />
              </div>
              <Area label="Intolerancias y alergias alimentarias" valor={form.intolerancias} onChange={v => set('intolerancias', v)} placeholder="Lactosa, gluten, frutos secos..." rows={2} />
              <Area label="Suplementos / medicamentos actuales" valor={form.suplementos_actuales} onChange={v => set('suplementos_actuales', v)} placeholder="Whey Protein, multivitamínico, metformina..." rows={2} />
            </div>
          </div>
        )}

        {/* BIOQUÍMICA */}
        {seccion === 'bioquimica' && (
          <div>
            <SecHeader titulo="🧪 Bioquímica relevante" color={B.purple} />
            <Area 
              label="Resultados de exámenes recientes"
              valor={form.bioquimica} 
              onChange={v => set('bioquimica', v)} 
              placeholder="Ej: Glucosa: 95 / HbA1c: 5.4 / Colesterol total: 180 / TG: 120 / TSH: 2.5 / Vit. D: 28 / B12: 350" 
              rows={8} 
            />
            <p style={{ fontSize: 11, color: B.gray, marginTop: 8, fontStyle: 'italic' }}>
              💡 Tip: copia y pega los resultados del laboratorio o anótalos en formato libre.
            </p>
          </div>
        )}

        {/* PLAN */}
        {seccion === 'plan' && (
          <div>
            <SecHeader titulo="🎯 Diagnóstico y plan" color={B.orange} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Area label="Diagnóstico nutricional" valor={form.diagnostico} onChange={v => set('diagnostico', v)} placeholder="Ej: Sobrepeso grado I (E66.9), Dislipidemia mixta..." rows={3} />
              <Area label="Recomendaciones de esta visita" valor={form.recomendaciones_visita} onChange={v => set('recomendaciones_visita', v)} placeholder="Indicaciones generales para el paciente..." rows={4} />
              <Area label="Objetivos para próxima visita" valor={form.objetivos_proxima_visita} onChange={v => set('objetivos_proxima_visita', v)} placeholder="¿Qué esperamos lograr antes del siguiente control?" rows={3} />
              <Field label="📅 Próxima consulta" tipo="date" valor={form.proxima_consulta} onChange={v => set('proxima_consulta', v)} />
            </div>
          </div>
        )}
      </div>

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
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 14,
});

const tabBtn = (active) => ({
  padding: '8px 13px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 6,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  background: active ? B.blue : 'transparent',
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
