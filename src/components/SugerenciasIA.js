import { useState } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
};

const calcAge = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
const grupoLabels = { transformacion: 'Transformación Corporal', prequirurgico: 'Pre-quirúrgico', postquirurgico: 'Post-quirúrgico' };
const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

export default function SugerenciasIA({ paciente, valoracion, planes, usuario, onPlanCreado }) {
  const [cargando, setCargando] = useState(false);
  const [sugerencias, setSugerencias] = useState('');
  const [planIA, setPlanIA] = useState(null);
  const [error, setError] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [creandoPlan, setCreandoPlan] = useState(false);
  const [planGuardado, setPlanGuardado] = useState(false);
  const [ejerciciosDB, setEjerciciosDB] = useState([]);

  const age = calcAge(paciente.fecha_nacimiento);
  const lastPlan = planes?.[0];

  const generarSugerencias = async () => {
    setCargando(true);
    setError('');
    setSugerencias('');
    setPlanIA(null);
    setPlanGuardado(false);
    setMostrar(true);

    // Load exercises from DB
    const { data: exs } = await supabase.from('ejercicios').select('*').eq('activo', true);
    setEjerciciosDB(exs || []);

    const ejerciciosList = (exs || []).map(e => `${e.id}|${e.nombre}|${e.categoria}|${e.entorno}|${e.nivel}|${e.unidad}`).join('\n');

    const prompt = `Eres un especialista en medicina deportiva del Instituto Metabólico Corporal (IMC).

DATOS DEL PACIENTE:
- Nombre: ${paciente.nombre} ${paciente.apellido}
- Edad: ${age} años | Sexo: ${paciente.sexo === 'F' ? 'Femenino' : 'Masculino'}
- Grupo: ${grupoLabels[paciente.grupo] || paciente.grupo}
- Diagnóstico: ${paciente.diagnostico_principal || 'No especificado'}
- Cirugía: ${paciente.cirugia || 'Ninguna'}
- Antecedentes: ${paciente.antecedentes_personales || 'Sin antecedentes relevantes'}

VALORACIÓN (${valoracion?.fecha || 'Sin fecha'}):
- Peso: ${valoracion?.peso || '—'}kg | IMC: ${valoracion?.bmi || '—'}
- % Grasa: ${valoracion?.pct_grasa || '—'}% | Músculo: ${valoracion?.masa_muscular || '—'}kg
- VO2max: ${valoracion?.vo2max || '—'} ml/kg/min
- FC reposo: ${valoracion?.fc_reposo || '—'} bpm
- Zona 2: ${valoracion?.zona2_lo || '—'}-${valoracion?.zona2_hi || '—'} bpm
- Sit & Stand: ${valoracion?.sit_stand || '—'} reps
- Dinamometría D: ${valoracion?.dina_d || '—'} kg
- Aptitud: ${valoracion?.aptitud || '—'}
- Limitantes: ${valoracion?.limitantes || 'Ninguna'}
- Diagnóstico terapeuta: ${valoracion?.diagnostico || '—'}

BANCO DE EJERCICIOS DISPONIBLES (id|nombre|categoria|entorno|nivel|unidad):
${ejerciciosList}

TAREA: Genera DOS cosas:

1. Un análisis clínico breve en texto (máximo 200 palabras) con recomendaciones generales.

2. Un plan de ejercicio semanal en formato JSON estricto. Selecciona ejercicios SOLO del banco disponible usando sus IDs exactos. El JSON debe tener esta estructura exacta:

\`\`\`json
{
  "fase": "1",
  "entorno": "gym",
  "notas": "Notas generales del plan para el terapeuta",
  "dias": {
    "Lunes": [
      {"ejercicio_id": "ID_EXACTO_DEL_BANCO", "series": "3", "repeticiones": "15", "carga": "Zona 2", "nota": "nota clínica opcional"}
    ],
    "Martes": [],
    "Miércoles": [
      {"ejercicio_id": "ID_EXACTO_DEL_BANCO", "series": "3", "repeticiones": "10", "carga": "30% 1RM", "nota": ""}
    ],
    "Jueves": [],
    "Viernes": [],
    "Sábado": [],
    "Domingo": []
  }
}
\`\`\`

REGLAS IMPORTANTES:
- Usa SOLO IDs de ejercicios del banco disponible
- Máximo 5 ejercicios por día
- Incluye 3-4 días activos según la aptitud del paciente
- Adapta la carga a las zonas cardíacas del paciente
- Para cardio usa la Zona 2 del paciente
- Para pre-quirúrgico sé conservador, sin alta intensidad
- El JSON debe ser válido y completo`;

    try {
      const groqKey = process.env.REACT_APP_GROQ_KEY;
      if (!groqKey) { setError('Clave IA no configurada.'); setCargando(false); return; }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 2000,
          messages: [
            { role: 'system', content: 'Eres un especialista en medicina deportiva. Respondes en español. Cuando se te pide JSON lo generas exactamente como se especifica, sin texto adicional dentro del bloque JSON.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        setError('Error de IA: ' + (data.error?.message || 'Sin respuesta'));
        setCargando(false);
        return;
      }

      const text = data.choices?.[0]?.message?.content || '';
      setSugerencias(text);

      // Extract JSON plan from response
      const jsonMatch = text.match(/```json\n([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const planData = JSON.parse(jsonMatch[1]);
          setPlanIA(planData);
        } catch (e) {
          console.log('Could not parse plan JSON:', e);
        }
      }
    } catch (err) {
      setError('Error al conectar con la IA: ' + err.message);
    }
    setCargando(false);
  };

  const crearPlanDesdeIA = async () => {
    if (!planIA) return;
    setCreandoPlan(true);

    try {
      // Create plan
      const { data: plan, error: planError } = await supabase
        .from('planes_ejercicio')
        .insert([{
          paciente_id: paciente.id,
          valoracion_id: valoracion?.id,
          terapeuta_id: usuario?.id,
          terapeuta_nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : 'IA IMC',
          fecha: new Date().toISOString().split('T')[0],
          fase: planIA.fase || '1',
          entorno: planIA.entorno || 'gym',
          notas_generales: planIA.notas || 'Plan generado con asistencia de IA — revisar y ajustar según criterio clínico',
          activo: true,
        }])
        .select()
        .single();

      if (planError || !plan) {
        setError('Error al crear plan: ' + planError?.message);
        setCreandoPlan(false);
        return;
      }

      // Insert exercises
      const planEjs = [];
      Object.entries(planIA.dias || {}).forEach(([dia, ejercicios]) => {
        (ejercicios || []).forEach((ej, idx) => {
          if (ej.ejercicio_id) {
            planEjs.push({
              plan_id: plan.id,
              dia,
              ejercicio_id: ej.ejercicio_id,
              orden: idx,
              series: ej.series || '3',
              repeticiones: ej.repeticiones || '10',
              carga: ej.carga || '',
              nota: ej.nota || '',
            });
          }
        });
      });

      if (planEjs.length > 0) {
        await supabase.from('plan_ejercicios').insert(planEjs);
      }

      setPlanGuardado(true);
      if (onPlanCreado) onPlanCreado();
    } catch (err) {
      setError('Error: ' + err.message);
    }
    setCreandoPlan(false);
  };

  const renderSugerencias = (text) => {
    // Remove JSON block from display
    const textSinJSON = text.replace(/```json[\s\S]*?```/g, '').trim();
    return textSinJSON.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: 5 }} />;
      if (line.startsWith('## ') || (line.startsWith('**') && line.endsWith('**'))) {
        return <p key={i} style={{ fontWeight: 800, fontSize: 13, color: B.navy, margin: '12px 0 4px', borderBottom: `2px solid ${B.blue}`, paddingBottom: 3 }}>{line.replace(/^##\s|\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <p key={i} style={{ fontSize: 12, color: B.navy, margin: '3px 0', display: 'flex', gap: 8, paddingLeft: 8 }}>
          <span style={{ color: B.blue, flexShrink: 0 }}>•</span>
          <span dangerouslySetInnerHTML={{ __html: line.replace(/^[-•]\s/, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
        </p>;
      }
      return <p key={i} style={{ fontSize: 12, color: '#333', margin: '3px 0', lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />;
    });
  };

  const exById = {};
  ejerciciosDB.forEach(e => exById[e.id] = e);

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
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>{paciente.nombre} {paciente.apellido} · Valoración {valoracion.fecha}</p>
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

          <div style={{ padding: '18px 20px' }}>
            {cargando && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
                <p style={{ color: B.blue, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Analizando datos y generando plan...</p>
                <p style={{ color: B.gray, fontSize: 12 }}>Procesando valoración y seleccionando ejercicios del banco IMC</p>
              </div>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', color: B.red, fontSize: 13 }}>⚠ {error}</div>
            )}

            {sugerencias && !cargando && (
              <div>
                {/* Análisis textual */}
                <div style={{ background: B.grayLt, borderRadius: 10, padding: '16px 18px', marginBottom: 16, border: `1px solid ${B.grayMd}` }}>
                  {renderSugerencias(sugerencias)}
                </div>

                {/* Plan generado */}
                {planIA && (
                  <div style={{ background: B.white, borderRadius: 10, border: `2px solid ${B.green}`, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ background: B.green, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>
                        🏋️ Plan sugerido por IA — Fase {planIA.fase} · {planIA.entorno === 'gym' ? 'Gimnasio' : 'Casa'}
                      </p>
                      {planGuardado ? (
                        <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          ✓ Plan guardado
                        </span>
                      ) : (
                        <button onClick={crearPlanDesdeIA} disabled={creandoPlan}
                          style={{ padding: '6px 16px', background: 'white', color: B.green, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {creandoPlan ? 'Guardando...' : '💾 Guardar este plan'}
                        </button>
                      )}
                    </div>

                    {/* Vista previa del plan */}
                    <div style={{ padding: '14px 16px' }}>
                      {planIA.notas && (
                        <p style={{ fontSize: 12, color: B.teal, marginBottom: 12, fontStyle: 'italic' }}>📝 {planIA.notas}</p>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 12 }}>
                        {DAYS.map(dia => {
                          const exs = planIA.dias?.[dia] || [];
                          return (
                            <div key={dia} style={{ borderRadius: 7, overflow: 'hidden', border: `1px solid ${B.grayMd}` }}>
                              <div style={{ padding: '4px 3px', textAlign: 'center', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: exs.length > 0 ? B.navy : B.grayMd, color: exs.length > 0 ? 'white' : B.gray }}>
                                {dia.slice(0,3)}
                              </div>
                              <div style={{ padding: '5px 4px', minHeight: 60, background: B.grayLt }}>
                                {exs.length === 0 ? (
                                  <p style={{ fontSize: 8, color: B.grayMd, textAlign: 'center', marginTop: 10 }}>Descanso</p>
                                ) : exs.map((ej, i) => {
                                  const ex = exById[ej.ejercicio_id];
                                  return ex ? (
                                    <p key={i} style={{ fontSize: 8, color: B.navy, margin: '0 0 2px', lineHeight: 1.3 }}>
                                      {ex.nombre.substring(0, 18)}<br/>
                                      <span style={{ color: B.gray }}>{ej.series}×{ej.repeticiones}</span>
                                    </p>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Tabla de ejercicios */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: B.navy }}>
                            {['Día','Ejercicio','Series','Reps','Carga','Nota'].map(h => (
                              <th key={h} style={{ padding: '5px 8px', textAlign: 'left', color: 'white', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {DAYS.flatMap(dia =>
                            (planIA.dias?.[dia] || []).map((ej, i) => {
                              const ex = exById[ej.ejercicio_id];
                              if (!ex) return null;
                              return (
                                <tr key={`${dia}-${i}`} style={{ borderBottom: `1px solid ${B.grayLt}`, background: i % 2 === 0 ? 'white' : B.grayLt }}>
                                  <td style={{ padding: '5px 8px', fontWeight: 600, color: B.navy }}>{i === 0 ? dia : ''}</td>
                                  <td style={{ padding: '5px 8px' }}>{ex.nombre}</td>
                                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>{ej.series}</td>
                                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>{ej.repeticiones} {ex.unidad}</td>
                                  <td style={{ padding: '5px 8px', color: B.teal }}>{ej.carga}</td>
                                  <td style={{ padding: '5px 8px', color: B.gray, fontStyle: 'italic' }}>{ej.nota}</td>
                                </tr>
                              );
                            })
                          ).filter(Boolean)}
                        </tbody>
                      </table>

                      {planGuardado && (
                        <div style={{ background: B.green + '11', border: `1px solid ${B.green}`, borderRadius: 8, padding: '10px 14px', marginTop: 12, textAlign: 'center' }}>
                          <p style={{ color: B.green, fontWeight: 700, fontSize: 13, margin: 0 }}>
                            ✅ Plan guardado correctamente — ve al tab "Plan ejercicio" para verlo y editarlo
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => {
                    const blob = new Blob([`SUGERENCIAS IA — ${paciente.nombre} ${paciente.apellido}\nFecha: ${new Date().toLocaleDateString('es-EC')}\n\n${sugerencias}`], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `Sugerencias_IA_${paciente.apellido}.txt`; a.click();
                    URL.revokeObjectURL(url);
                  }}
                    style={{ padding: '7px 16px', background: B.teal, color: 'white', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ⬇ Descargar análisis
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
