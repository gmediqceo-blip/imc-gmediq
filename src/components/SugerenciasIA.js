import { useState } from 'react';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
};

const calcAge = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
const grupoLabels = { transformacion: 'Transformación Corporal', prequirurgico: 'Pre-quirúrgico', postquirurgico: 'Post-quirúrgico' };

export default function SugerenciasIA({ paciente, valoracion, planes }) {
  const [cargando, setCargando] = useState(false);
  const [sugerencias, setSugerencias] = useState('');
  const [error, setError] = useState('');
  const [mostrar, setMostrar] = useState(false);

  const age = calcAge(paciente.fecha_nacimiento);
  const lastPlan = planes?.[0];

  const generarSugerencias = async () => {
    setCargando(true);
    setError('');
    setSugerencias('');
    setMostrar(true);

    const prompt = `Eres un especialista en medicina deportiva y ejercicio terapéutico del Instituto Metabólico Corporal (IMC). 
Basándote en los datos clínicos de este paciente, genera sugerencias específicas de entrenamiento.

DATOS DEL PACIENTE:
- Nombre: ${paciente.nombre} ${paciente.apellido}
- Edad: ${age} años
- Sexo: ${paciente.sexo === 'F' ? 'Femenino' : 'Masculino'}
- Grupo: ${grupoLabels[paciente.grupo] || paciente.grupo}
- Diagnóstico principal: ${paciente.diagnostico_principal || 'No especificado'}
- Cirugía: ${paciente.cirugia || 'Ninguna'}
- Antecedentes: ${paciente.antecedentes_personales || 'Sin antecedentes relevantes'}

VALORACIÓN FISIOTERAPÉUTICA (${valoracion?.fecha || 'Sin fecha'}):
- Peso: ${valoracion?.peso || '—'} kg | IMC: ${valoracion?.bmi || '—'}
- % Grasa: ${valoracion?.pct_grasa || '—'}% | Músculo: ${valoracion?.masa_muscular || '—'} kg
- Cintura: ${valoracion?.cintura || '—'} cm | Cadera: ${valoracion?.cadera || '—'} cm
- FC reposo: ${valoracion?.fc_reposo || '—'} bpm | SpO2: ${valoracion?.spo2 || '—'}%
- PA: ${valoracion?.pa_sistolica || '—'}/${valoracion?.pa_diastolica || '—'} mmHg
- VO2max: ${valoracion?.vo2max || '—'} ml/kg/min (${valoracion?.vo2max_clasificacion || '—'})
- Zona 1: ${valoracion?.zona1_lo || '—'}-${valoracion?.zona1_hi || '—'} bpm
- Zona 2: ${valoracion?.zona2_lo || '—'}-${valoracion?.zona2_hi || '—'} bpm  
- Zona 3: ${valoracion?.zona3_lo || '—'}-${valoracion?.zona3_hi || '—'} bpm
- Sit & Stand: ${valoracion?.sit_stand || '—'} reps | Borg: ${valoracion?.borg || '—'}
- Dinamometría D: ${valoracion?.dina_d || '—'} kg | I: ${valoracion?.dina_i || '—'} kg
- Diagnóstico terapeuta: ${valoracion?.diagnostico || '—'}
- Limitantes: ${valoracion?.limitantes || 'Ninguna'}
- Aptitud: ${valoracion?.aptitud || '—'}

${lastPlan ? `PLAN ACTUAL:
- Fase: ${lastPlan.fase} | Entorno: ${lastPlan.entorno === 'gym' ? 'Gimnasio' : 'Casa'}
- Ejercicios: ${lastPlan.plan_ejercicios?.length || 0}` : 'Sin plan de ejercicio previo'}

Por favor genera:

1. **ANÁLISIS DEL PERFIL** (2-3 líneas): Estado actual del paciente y principales hallazgos.

2. **TIPO DE ENTRENAMIENTO RECOMENDADO**: Describe el enfoque general (cardio, fuerza, combinado, rehabilitación).

3. **DISTRIBUCIÓN SEMANAL SUGERIDA**: Número de días y tipo por día (Ej: Lunes-Miércoles-Viernes cardio + Martes-Jueves fuerza).

4. **PARÁMETROS DE INTENSIDAD**:
   - Cardio: zona objetivo, duración, progresión
   - Fuerza: % 1RM inicial, series, repeticiones recomendadas
   - Descanso entre series

5. **EJERCICIOS PRIORITARIOS** (5-8 ejercicios): Los más importantes para este paciente con justificación clínica.

6. **PROGRESIÓN A 4 SEMANAS**: Cómo evolucionar el plan.

7. **SEÑALES DE ALARMA**: Qué síntomas deben detener el ejercicio inmediatamente.

8. **RECOMENDACIONES ADICIONALES**: Nutrición peri-entrenamiento, hidratación, recuperación.

Sé específico, clínico y práctico. Usa los datos reales del paciente en tus recomendaciones.`;

    try {
      // Llamada directa a Groq sin proxy
      const groqKey = process.env.REACT_APP_GROQ_KEY;
      if (!groqKey) { setError('Clave IA no configurada. Contacta al administrador.'); setCargando(false); return; }
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1500,
          messages: [
            {
              role: 'system',
              content: 'Eres un especialista en medicina deportiva y ejercicio terapéutico del Instituto Metabólico Corporal (IMC) by GMEDiQ. Generas recomendaciones clínicas precisas y personalizadas. Respondes en español con formato claro.'
            },
            { role: 'user', content: prompt }
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError('Error de IA: ' + (data.error?.message || JSON.stringify(data.error) || 'Sin respuesta'));
      } else {
        const text = data.choices?.[0]?.message?.content || '';
        setSugerencias(text);
      }
    } catch (err) {
      setError('Error al conectar con la IA: ' + err.message);
    }
    setCargando(false);
  };

  // Parse markdown-like text to styled JSX
  const renderSugerencias = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} style={{ fontWeight: 800, fontSize: 13, color: B.navy, margin: '14px 0 4px', borderBottom: `2px solid ${B.blue}`, paddingBottom: 4 }}>{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('## ') || line.startsWith('**')) {
        return <p key={i} style={{ fontWeight: 700, fontSize: 13, color: B.blue, margin: '12px 0 4px' }}>{line.replace(/##\s|^\*\*|\*\*$/g, '')}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <p key={i} style={{ fontSize: 12, color: B.navy, margin: '3px 0', paddingLeft: 16, display: 'flex', gap: 8 }}>
          <span style={{ color: B.blue, flexShrink: 0 }}>•</span>
          <span dangerouslySetInnerHTML={{ __html: line.replace(/^[-•]\s/, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
        </p>;
      }
      if (line.match(/^\d+\./)) {
        return <p key={i} style={{ fontSize: 12, color: B.navy, margin: '4px 0', paddingLeft: 4, fontWeight: 600 }}
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#0B1F3B">$1</strong>') }} />;
      }
      if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
      return <p key={i} style={{ fontSize: 12, color: '#333', margin: '3px 0', lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />;
    });
  };

  if (!valoracion) return null;

  return (
    <div style={{ marginTop: 16 }}>
      {!mostrar ? (
        <button onClick={generarSugerencias}
          style={{ width: '100%', padding: '13px 20px', background: `linear-gradient(135deg, ${B.navy}, ${B.blue})`, color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>✨</span>
          Generar sugerencias de entrenamiento con IA
        </button>
      ) : (
        <div style={{ background: B.white, borderRadius: 12, border: `1.5px solid ${B.blue}`, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: `linear-gradient(135deg, ${B.navy}, ${B.blue})`, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>✨</span>
              <div>
                <p style={{ color: 'white', fontWeight: 800, fontSize: 14, margin: 0 }}>Sugerencias IA — IMC</p>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>{paciente.nombre} {paciente.apellido} · Basado en valoración del {valoracion.fecha}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={generarSugerencias} disabled={cargando}
                style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                🔄 Regenerar
              </button>
              <button onClick={() => setMostrar(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', borderRadius: 6, padding: '4px 8px' }}>✕</button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '18px 20px' }}>
            {cargando && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
                <p style={{ color: B.blue, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Analizando datos del paciente...</p>
                <p style={{ color: B.gray, fontSize: 12 }}>La IA está procesando la valoración y generando un plan personalizado</p>
                <div style={{ marginTop: 16, height: 3, background: B.grayLt, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: `linear-gradient(90deg, ${B.blue}, ${B.teal})`, borderRadius: 2, animation: 'loading 1.5s infinite', width: '60%' }} />
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', color: B.red, fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}

            {sugerencias && !cargando && (
              <div>
                <div style={{ background: B.grayLt, borderRadius: 10, padding: '16px 18px', marginBottom: 14, border: `1px solid ${B.grayMd}` }}>
                  {renderSugerencias(sugerencias)}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => {
                    const text = sugerencias;
                    const blob = new Blob([`SUGERENCIAS IA — ${paciente.nombre} ${paciente.apellido}\nFecha: ${new Date().toLocaleDateString('es-EC')}\n\n${text}`], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `Sugerencias_IA_${paciente.apellido}.txt`; a.click();
                    URL.revokeObjectURL(url);
                  }}
                    style={{ padding: '7px 16px', background: B.teal, color: 'white', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ⬇ Descargar sugerencias
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
