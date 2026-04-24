import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
};

const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const fmtDateShort = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const calcAge = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;

// ─── CIE-10 DIAGNÓSTICOS RELEVANTES PARA IMC ─────────────────────────────────
const CIE10_IMC = [
  // Obesidad y sobrepeso
  { code: 'E66', desc: 'Obesidad' },
  { code: 'E66.0', desc: 'Obesidad debida a exceso de calorías' },
  { code: 'E66.01', desc: 'Obesidad mórbida (IMC ≥40)' },
  { code: 'E66.09', desc: 'Otras obesidades debidas a exceso de calorías' },
  { code: 'E66.1', desc: 'Obesidad inducida por medicamentos' },
  { code: 'E66.9', desc: 'Obesidad, no especificada' },
  { code: 'E65', desc: 'Adiposidad localizada' },
  { code: 'Z68.3', desc: 'Sobrepeso (IMC 25-29.9)' },
  // Metabólico
  { code: 'E11', desc: 'Diabetes mellitus tipo 2' },
  { code: 'E11.9', desc: 'Diabetes mellitus tipo 2 sin complicaciones' },
  { code: 'E14', desc: 'Diabetes mellitus, no especificada' },
  { code: 'E78.0', desc: 'Hipercolesterolemia pura' },
  { code: 'E78.1', desc: 'Hipertrigliceridemia pura' },
  { code: 'E78.2', desc: 'Hiperlipidemia mixta' },
  { code: 'E78.5', desc: 'Hiperlipidemia, no especificada' },
  { code: 'E88.81', desc: 'Síndrome metabólico' },
  { code: 'E16.0', desc: 'Hipoglucemia sin coma' },
  { code: 'R73.0', desc: 'Glucosa anormal en pruebas' },
  { code: 'R73.09', desc: 'Prediabetes / Intolerancia a la glucosa' },
  // Cardiovascular
  { code: 'I10', desc: 'Hipertensión esencial (primaria)' },
  { code: 'I25.1', desc: 'Enfermedad coronaria aterosclerótica' },
  { code: 'I50', desc: 'Insuficiencia cardíaca' },
  { code: 'I73.9', desc: 'Enfermedad vascular periférica' },
  // Tiroideo
  { code: 'E03.9', desc: 'Hipotiroidismo, no especificado' },
  { code: 'E05.90', desc: 'Hipertiroidismo, no especificado' },
  { code: 'E06.3', desc: 'Tiroiditis autoinmune (Hashimoto)' },
  // Musculoesquelético
  { code: 'M79.3', desc: 'Paniculitis' },
  { code: 'M62.84', desc: 'Sarcopenia' },
  { code: 'M54.5', desc: 'Dolor lumbar' },
  { code: 'M17.9', desc: 'Gonartritis, no especificada' },
  // Respiratorio
  { code: 'G47.33', desc: 'Apnea obstructiva del sueño' },
  { code: 'J45.909', desc: 'Asma, no especificada' },
  { code: 'E66.2', desc: 'Obesidad con hipoventilación alveolar' },
  // Digestivo
  { code: 'K76.0', desc: 'Hígado graso no alcohólico (NAFLD)' },
  { code: 'K21.0', desc: 'Enfermedad por reflujo gastroesofágico' },
  { code: 'K80.20', desc: 'Colelitiasis sin colecistitis' },
  // Post-bariátrico
  { code: 'Z98.84', desc: 'Estado post-cirugía bariátrica' },
  { code: 'K91.1', desc: 'Síndrome post-gastrectomía' },
  { code: 'E64', desc: 'Secuelas de desnutrición' },
  { code: 'E50', desc: 'Deficiencia de vitamina A' },
  { code: 'E53.8', desc: 'Deficiencia de otras vitaminas B' },
  { code: 'E55.9', desc: 'Deficiencia de vitamina D' },
  { code: 'D50.9', desc: 'Anemia por deficiencia de hierro' },
  // Hormonal
  { code: 'E28.2', desc: 'Síndrome de ovario poliquístico' },
  { code: 'E24.9', desc: 'Síndrome de Cushing, no especificado' },
  { code: 'E23.0', desc: 'Hipopituitarismo' },
  // Psicológico/conductual
  { code: 'F50.9', desc: 'Trastorno de la conducta alimentaria' },
  { code: 'F32.9', desc: 'Episodio depresivo, no especificado' },
  { code: 'F41.1', desc: 'Trastorno de ansiedad generalizada' },
  // Consulta y seguimiento
  { code: 'Z71.3', desc: 'Consulta dietética' },
  { code: 'Z76.0', desc: 'Emisión de receta repetida' },
  { code: 'Z71.89', desc: 'Consejería, otra' },
];

// ─── LISTA DE EXÁMENES ────────────────────────────────────────────────────────
const EXAMENES_LAB = {
  'Hematología': [
    'Biometría hemática completa', 'Hematócrito', 'Hemoglobina', 'Leucocitos',
    'Plaquetas', 'Reticulocitos', 'VSG (velocidad de sedimentación)',
  ],
  'Bioquímica metabólica': [
    'Glucosa en ayunas', 'Glucosa post-prandial 2h', 'Curva tolerancia glucosa',
    'Insulina en ayunas', 'Índice HOMA-IR', 'Hemoglobina glicosilada (HbA1c)',
    'Fructosamina', 'Péptido C',
  ],
  'Panel lipídico': [
    'Colesterol total', 'HDL colesterol', 'LDL colesterol',
    'VLDL colesterol', 'Triglicéridos', 'Lipoproteína (a)',
    'Índice aterogénico', 'ApoB / ApoA1',
  ],
  'Panel tiroideo': [
    'TSH', 'T3 libre', 'T3 total', 'T4 libre', 'T4 total',
    'Anticuerpos anti-TPO', 'Anticuerpos anti-tiroglobulina',
  ],
  'Panel hepático': [
    'TGO (AST)', 'TGP (ALT)', 'GGT', 'Fosfatasa alcalina',
    'Bilirrubina total', 'Bilirrubina directa', 'Bilirrubina indirecta',
    'Proteínas totales', 'Albúmina',
  ],
  'Función renal': [
    'Creatinina', 'Urea', 'BUN', 'Ácido úrico',
    'Depuración creatinina 24h', 'Microalbuminuria', 'TFG estimada',
  ],
  'Panel hormonal': [
    'Insulina basal', 'Cortisol AM (8:00)', 'Cortisol PM (16:00)',
    'DHEA-S', 'Testosterona total', 'Testosterona libre',
    'FSH', 'LH', 'Estradiol', 'Progesterona',
    'Hormona de crecimiento (GH)', 'IGF-1', 'Prolactina',
  ],
  'Vitaminas y minerales': [
    'Vitamina D (25-OH)', 'Vitamina B12', 'Ácido fólico',
    'Zinc', 'Magnesio', 'Ferritina', 'Hierro sérico', 'TIBC',
    'Vitamina A', 'Vitamina E', 'Calcio', 'Fósforo',
  ],
  'Inflamación': [
    'Proteína C reactiva (PCR)', 'PCR ultrasensible', 'Interleucina-6',
    'Fibrinógeno', 'Homocisteína',
  ],
  'Electrolitos': [
    'Sodio', 'Potasio', 'Cloro', 'Calcio iónico', 'Magnesio',
    'Fósforo', 'Bicarbonato',
  ],
};

const EXAMENES_IMAGEN = {
  'Ecografía': [
    'Ecografía abdominal', 'Ecografía hepática (hígado graso)',
    'Ecografía tiroidea', 'Ecografía pélvica',
    'Ecografía de ovarios (SOP)', 'Ecografía renal',
    'Doppler carotídeo', 'Doppler venoso miembros inferiores',
  ],
  'Radiología': [
    'Radiografía de tórax PA', 'Radiografía columna lumbosacra',
    'Radiografía rodillas bilateral', 'Radiografía de cadera',
    'Radiografía de manos y muñecas',
  ],
  'Cardiología': [
    'Electrocardiograma (ECG)', 'Ecocardiograma',
    'Prueba de esfuerzo (ergometría)', 'Holter 24h',
    'MAPA (monitoreo ambulatorio PA 24h)',
  ],
  'Otras imágenes': [
    'Densitometría ósea (DEXA)', 'Tomografía abdominal',
    'Resonancia magnética abdominal', 'Endoscopía digestiva alta',
    'Colonoscopía', 'Polisomnografía (apnea del sueño)',
  ],
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function ConsultaMedica({ paciente, consultas, onActualizar, usuario }) {
  const [modalNueva, setModalNueva] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
          {consultas.length} consulta{consultas.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setModalNueva(true)}
          style={{ padding: '9px 20px', background: B.teal, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Nueva consulta médica
        </button>
      </div>

      {consultas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}` }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>🩺</p>
          <p style={{ color: B.gray, marginBottom: 16 }}>No hay consultas médicas registradas.</p>
          <button onClick={() => setModalNueva(true)}
            style={{ padding: '10px 22px', background: B.teal, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Crear primera consulta
          </button>
        </div>
      ) : (
        consultas.map(c => <ConsultaCard key={c.id} consulta={c} paciente={paciente} />)
      )}

      {modalNueva && (
        <ModalConsulta
          paciente={paciente}
          usuario={usuario}
          onClose={() => setModalNueva(false)}
          onGuardado={() => { onActualizar(); setModalNueva(false); showToast('Consulta guardada ✓'); }}
        />
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  );
}

// ─── CARD DE CONSULTA ─────────────────────────────────────────────────────────
function ConsultaCard({ consulta: c, paciente }) {
  const [open, setOpen] = useState(false);
  const diagnosticos = c.diagnosticos ? JSON.parse(c.diagnosticos) : [];
  const medicamentos = c.medicamentos ? JSON.parse(c.medicamentos) : [];
  const examLab = c.examenes_lab ? JSON.parse(c.examenes_lab) : [];
  const examImg = c.examenes_imagen ? JSON.parse(c.examenes_imagen) : [];

  return (
    <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, marginBottom: 12, borderLeft: `4px solid ${B.teal}`, overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 4px' }}>
            {fmtDateShort(c.fecha)} · {c.medico_nombre || '—'}
          </p>
          <p style={{ fontSize: 12, color: B.gray, margin: '0 0 6px' }}>
            {c.motivo_consulta ? c.motivo_consulta.substring(0, 80) + (c.motivo_consulta.length > 80 ? '...' : '') : '—'}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {diagnosticos.slice(0, 2).map((d, i) => (
              <span key={i} style={{ background: B.teal + '22', color: B.teal, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                {d.code} {d.desc?.substring(0, 25)}
              </span>
            ))}
            {diagnosticos.length > 2 && <span style={{ fontSize: 10, color: B.gray }}>+{diagnosticos.length - 2} más</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
          <button onClick={e => { e.stopPropagation(); imprimirConsulta(paciente, c, diagnosticos, medicamentos, examLab, examImg); }}
            style={{ padding: '5px 12px', background: B.navy + '11', color: B.navy, border: `1px solid ${B.navy}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            🖨 Imprimir
          </button>
          {medicamentos.length > 0 && (
            <button onClick={e => { e.stopPropagation(); imprimirReceta(paciente, c, medicamentos); }}
              style={{ padding: '5px 12px', background: B.green + '11', color: B.green, border: `1px solid ${B.green}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              💊 Receta
            </button>
          )}
          {(examLab.length > 0 || examImg.length > 0) && (
            <button onClick={e => { e.stopPropagation(); imprimirExamenes(paciente, c, examLab, examImg); }}
              style={{ padding: '5px 12px', background: B.blue + '11', color: B.blue, border: `1px solid ${B.blue}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              🔬 Exámenes
            </button>
          )}
          <span style={{ color: B.navy, fontSize: 18 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${B.grayLt}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
            {/* Signos vitales */}
            {(c.peso || c.pa_sistolica || c.fc || c.spo2) && (
              <div>
                <p style={{ fontWeight: 700, fontSize: 11, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Signos vitales</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {[['Peso', c.peso, 'kg'], ['PA', c.pa_sistolica && c.pa_diastolica ? `${c.pa_sistolica}/${c.pa_diastolica}` : null, 'mmHg'], ['FC', c.fc, 'lpm'], ['FR', c.fr, 'rpm'], ['SpO2', c.spo2, '%'], ['Temp', c.temperatura, '°C']].filter(([, v]) => v).map(([l, v, u]) => (
                    <div key={l} style={{ background: B.grayLt, borderRadius: 7, padding: '6px 8px' }}>
                      <p style={{ fontSize: 9, color: B.teal, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>{l}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: B.navy, margin: 0 }}>{v}<span style={{ fontSize: 9, color: B.gray }}> {u}</span></p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Diagnósticos */}
            {diagnosticos.length > 0 && (
              <div>
                <p style={{ fontWeight: 700, fontSize: 11, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Diagnósticos CIE-10</p>
                {diagnosticos.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <span style={{ background: B.navy, color: 'white', padding: '2px 6px', borderRadius: 5, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{d.code}</span>
                    <span style={{ fontSize: 12, color: B.navy }}>{d.desc}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Motivo y evolución */}
            {c.motivo_consulta && (
              <div>
                <p style={{ fontWeight: 700, fontSize: 11, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>Motivo de consulta</p>
                <p style={{ fontSize: 12, color: B.navy, lineHeight: 1.5 }}>{c.motivo_consulta}</p>
              </div>
            )}
            {c.evolucion && (
              <div>
                <p style={{ fontWeight: 700, fontSize: 11, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>Evolución</p>
                <p style={{ fontSize: 12, color: B.navy, lineHeight: 1.5 }}>{c.evolucion}</p>
              </div>
            )}
            {/* Medicamentos */}
            {medicamentos.length > 0 && (
              <div>
                <p style={{ fontWeight: 700, fontSize: 11, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Medicamentos prescritos</p>
                {medicamentos.map((m, i) => (
                  <div key={i} style={{ background: B.green + '11', borderRadius: 7, padding: '6px 10px', marginBottom: 5, borderLeft: `3px solid ${B.green}` }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, margin: '0 0 1px' }}>{m.nombre}</p>
                    <p style={{ fontSize: 11, color: B.gray, margin: 0 }}>{m.dosis} · {m.frecuencia} · {m.duracion}</p>
                  </div>
                ))}
              </div>
            )}
            {/* Exámenes */}
            {(examLab.length > 0 || examImg.length > 0) && (
              <div>
                <p style={{ fontWeight: 700, fontSize: 11, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Exámenes solicitados</p>
                {examLab.length > 0 && <p style={{ fontSize: 11, color: B.navy, margin: '0 0 4px' }}>🧪 Lab: {examLab.slice(0, 3).join(', ')}{examLab.length > 3 ? ` +${examLab.length - 3}` : ''}</p>}
                {examImg.length > 0 && <p style={{ fontSize: 11, color: B.navy, margin: 0 }}>🩻 Imagen: {examImg.slice(0, 3).join(', ')}{examImg.length > 3 ? ` +${examImg.length - 3}` : ''}</p>}
              </div>
            )}
          </div>
          {c.indicaciones && (
            <div style={{ marginTop: 14, background: B.grayLt, borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ fontWeight: 700, fontSize: 11, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 5px' }}>Indicaciones</p>
              <p style={{ fontSize: 12, color: B.navy, lineHeight: 1.5, margin: 0 }}>{c.indicaciones}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── BANCO DE MEDICAMENTOS FRECUENTES EN IMC ─────────────────────────────────
const BANCO_MEDICAMENTOS = [
  // GLP-1
  { grupo: 'GLP-1', nombre: 'Semaglutida (Ozempic) 0.5mg/2ml', dosis: '0.25mg subcutáneo', frecuencia: 'Semanal x 4 sem, luego 0.5mg', indicaciones: 'Aplicar en abdomen, muslo o brazo. Rotar sitio.' },
  { grupo: 'GLP-1', nombre: 'Semaglutida (Wegovy) 2.4mg', dosis: '0.25mg subcutáneo', frecuencia: 'Semanal, incremento progresivo', indicaciones: 'Iniciar con dosis baja y titular mensualmente.' },
  { grupo: 'GLP-1', nombre: 'Liraglutida (Victoza) 6mg/ml', dosis: '0.6mg subcutáneo', frecuencia: 'Diaria, incrementar a 1.2mg sem 2', indicaciones: 'Aplicar a la misma hora cada día.' },
  { grupo: 'GLP-1', nombre: 'Dulaglutida (Trulicity) 1.5mg', dosis: '0.75mg subcutáneo', frecuencia: 'Semanal', indicaciones: 'Puede tomarse cualquier día de la semana.' },
  { grupo: 'GLP-1', nombre: 'Exenatida (Byetta) 5mcg', dosis: '5mcg subcutáneo', frecuencia: '2 veces al día antes comidas', indicaciones: 'Iniciar 60 min antes de comidas principales.' },
  // Metformina
  { grupo: 'Metformina', nombre: 'Metformina 500mg', dosis: '500mg', frecuencia: 'Cada 8 horas con alimentos', indicaciones: 'Tomar con alimentos para reducir molestias GI.' },
  { grupo: 'Metformina', nombre: 'Metformina 850mg', dosis: '850mg', frecuencia: 'Cada 12 horas con alimentos', indicaciones: 'Tomar con alimentos. No partir ni masticar.' },
  { grupo: 'Metformina', nombre: 'Metformina XR 1000mg', dosis: '1000mg', frecuencia: 'Una vez al día con cena', indicaciones: 'Liberación extendida. No partir.' },
  // Vitaminas y suplementos
  { grupo: 'Vitaminas', nombre: 'Vitamina D3 50.000 UI', dosis: '1 cápsula', frecuencia: 'Semanal', indicaciones: 'Tomar con alimento que contenga grasa.' },
  { grupo: 'Vitaminas', nombre: 'Vitamina D3 2000 UI', dosis: '1 cápsula', frecuencia: 'Diaria', indicaciones: 'Tomar con alimentos.' },
  { grupo: 'Vitaminas', nombre: 'Vitamina B12 1000mcg', dosis: '1 tableta sublingual', frecuencia: 'Diaria', indicaciones: 'Dejar disolver bajo la lengua.' },
  { grupo: 'Vitaminas', nombre: 'Ácido fólico 5mg', dosis: '1 tableta', frecuencia: 'Diaria', indicaciones: 'Tomar preferiblemente en la mañana.' },
  { grupo: 'Vitaminas', nombre: 'Hierro fumarato 200mg', dosis: '1 tableta', frecuencia: 'En ayunas', indicaciones: 'Tomar con vitamina C para mejor absorción. Puede oscurecer heces.' },
  { grupo: 'Vitaminas', nombre: 'Zinc 50mg', dosis: '1 tableta', frecuencia: 'Diaria con alimentos', indicaciones: 'No tomar con lácteos.' },
  { grupo: 'Vitaminas', nombre: 'Magnesio glicinato 400mg', dosis: '1 cápsula', frecuencia: 'En la noche', indicaciones: 'Puede mejorar calidad del sueño.' },
  { grupo: 'Vitaminas', nombre: 'Omega 3 1000mg', dosis: '2 cápsulas', frecuencia: 'Diaria con alimentos', indicaciones: 'Tomar con comidas para reducir sabor a pescado.' },
  { grupo: 'Vitaminas', nombre: 'Complejo B', dosis: '1 tableta', frecuencia: 'Diaria con desayuno', indicaciones: 'Puede colorear orina de amarillo intenso (normal).' },
  // Antihipertensivos
  { grupo: 'HTA', nombre: 'Losartán 50mg', dosis: '50mg', frecuencia: 'Diaria', indicaciones: 'Monitorear PA semanalmente al inicio.' },
  { grupo: 'HTA', nombre: 'Amlodipino 5mg', dosis: '5mg', frecuencia: 'Diaria', indicaciones: 'Puede causar edema en tobillos.' },
  { grupo: 'HTA', nombre: 'Enalapril 10mg', dosis: '10mg', frecuencia: 'Cada 12 horas', indicaciones: 'Suspender si aparece tos seca persistente.' },
  // Lípidos
  { grupo: 'Lípidos', nombre: 'Atorvastatina 20mg', dosis: '20mg', frecuencia: 'En la noche', indicaciones: 'Evitar con jugo de toronja. Reportar dolor muscular.' },
  { grupo: 'Lípidos', nombre: 'Rosuvastatina 10mg', dosis: '10mg', frecuencia: 'En la noche', indicaciones: 'Reportar dolor o debilidad muscular.' },
  { grupo: 'Lípidos', nombre: 'Fenofibrato 160mg', dosis: '160mg', frecuencia: 'Diaria con alimentos', indicaciones: 'Para triglicéridos elevados. Con alimentos.' },
  // Tiroides
  { grupo: 'Tiroides', nombre: 'Levotiroxina 50mcg', dosis: '50mcg', frecuencia: 'En ayunas 30 min antes desayuno', indicaciones: 'No tomar con calcio, hierro o antiácidos.' },
  { grupo: 'Tiroides', nombre: 'Levotiroxina 100mcg', dosis: '100mcg', frecuencia: 'En ayunas 30 min antes desayuno', indicaciones: 'Tomar siempre a la misma hora.' },
  // Digestivo post-bariátrico
  { grupo: 'Post-bariátrico', nombre: 'Omeprazol 20mg', dosis: '20mg', frecuencia: '30 min antes del desayuno', indicaciones: 'Protector gástrico. No partir ni masticar.' },
  { grupo: 'Post-bariátrico', nombre: 'Sucralfato 1g', dosis: '1g', frecuencia: '30 min antes de comidas', indicaciones: 'Disolver en agua. Protector de mucosa gástrica.' },
  { grupo: 'Post-bariátrico', nombre: 'Calcio citrato 500mg + D3', dosis: '500mg', frecuencia: 'Cada 8 horas', indicaciones: 'Preferir citrato sobre carbonato en post-bariátrico.' },
  // Otros
  { grupo: 'Otros', nombre: 'Espironolactona 25mg', dosis: '25mg', frecuencia: 'Diaria en la mañana', indicaciones: 'Monitorear potasio. Puede causar irregularidades menstruales.' },
  { grupo: 'Otros', nombre: 'Topiramato 25mg', dosis: '25mg', frecuencia: 'En la noche', indicaciones: 'Incrementar gradualmente. Hidratarse bien.' },
  { grupo: 'Otros', nombre: 'Naltrexona/Bupropión (Contrave)', dosis: '8mg/90mg', frecuencia: 'Incremento progresivo semanal', indicaciones: 'Iniciar con 1 tableta/día. No en epilepsia.' },
];

// ─── FORM COMPONENTS — definidos FUERA del modal para evitar pérdida de foco ──
const CInput = ({ label, value, onChange, type = 'text', half, hint, placeholder }) => (
  <div style={{ flex: half ? '0 0 48%' : '0 0 100%', marginBottom: 12 }}>
    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #DDE3EA', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
    {hint && <p style={{ fontSize: 9, color: '#6E6E70', margin: '3px 0 0' }}>{hint}</p>}
  </div>
);

const CTextArea = ({ label, value, onChange, rows = 4, placeholder }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</label>
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #DDE3EA', borderRadius: 6, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
  </div>
);


// ─── NUEVO CIE-10 — guarda en Supabase y agrega al diagnóstico ───────────────
function NuevoCie10({ busqueda, onAgregar }) {
  const [codigo, setCodigo] = useState(busqueda.toUpperCase());
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Otro');
  const [guardando, setGuardando] = useState(false);

  const categorias = ['Endocrino/Metabólico','Cardiovascular','Digestivo','Musculoesquelético',
    'Neurológico','Respiratorio','Genitourinario','Mental','Preventivo/Seguimiento',
    'Síntomas/Signos','Piel','Sangre','Neoplasias','Infecciosas','Otro'];

  const agregar = async () => {
    if (!codigo.trim() || !descripcion.trim()) return;
    setGuardando(true);
    // Save to Supabase CIE-10 table
    await supabase.from('cie10').upsert([{
      codigo: codigo.trim().toUpperCase(),
      descripcion: descripcion.trim(),
      categoria,
    }], { onConflict: 'codigo' });
    // Add to current consultation
    onAgregar({ code: codigo.trim().toUpperCase(), desc: descripcion.trim() });
    setGuardando(false);
  };

  return (
    <div style={{ padding: '14px 16px', background: '#FFFBEB', borderTop: '1px solid #FDE68A' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#B45309', margin: '0 0 10px' }}>
        ⚠ Código no encontrado — agregar nuevo CIE-10
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 160px', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>Código *</label>
          <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ej: E66.01"
            style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #FDE68A', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }} />
        </div>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>Descripción *</label>
          <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Ej: Obesidad mórbida por exceso de calorías"
            style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #FDE68A', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }} />
        </div>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>Categoría</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)}
            style={{ width: '100%', padding: '7px 9px', border: '1.5px solid #FDE68A', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }}>
            {['Endocrino/Metabólico','Cardiovascular','Digestivo','Musculoesquelético',
              'Neurológico','Respiratorio','Genitourinario','Mental','Preventivo/Seguimiento',
              'Síntomas/Signos','Piel','Sangre','Neoplasias','Infecciosas','Otro'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={agregar} disabled={guardando || !codigo.trim() || !descripcion.trim()}
          style={{ padding: '7px 18px', background: guardando ? '#9AA5B1' : '#B45309', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          {guardando ? 'Guardando...' : '+ Agregar y guardar en CIE-10'}
        </button>
      </div>
      <p style={{ fontSize: 10, color: '#92400E', margin: '6px 0 0' }}>
        Este código quedará guardado permanentemente en la base de datos para futuras búsquedas.
      </p>
    </div>
  );
}

// ─── MODAL NUEVA CONSULTA ─────────────────────────────────────────────────────
function ModalConsulta({ paciente, usuario, onClose, onGuardado }) {
  // Datos generales
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [medicoNombre, setMedicoNombre] = useState(usuario ? `${usuario.nombre} ${usuario.apellido}` : '');
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [evolucion, setEvolucion] = useState('');
  const [examenFisico, setExamenFisico] = useState('');
  // Signos vitales
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [paSis, setPaSis] = useState('');
  const [paDia, setPaDia] = useState('');
  const [fc, setFc] = useState('');
  const [fr, setFr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temperatura, setTemperatura] = useState('');
  // Diagnósticos
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [busquedaCie, setBusquedaCie] = useState('');
  const [cie10Results, setCie10Results] = useState([]);
  const [buscandoCie, setBuscandoCie] = useState(false);
  // Medicamentos
  const [medicamentos, setMedicamentos] = useState([]);
  const [nuevoMed, setNuevoMed] = useState({ nombre: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
  // Exámenes
  const [examLab, setExamLab] = useState([]);
  const [examImg, setExamImg] = useState([]);
  const [tabExamen, setTabExamen] = useState('lab');
  const [otrosLab, setOtrosLab] = useState('');
  const [otrosImg, setOtrosImg] = useState('');
  // Banco de medicamentos
  const [mostrarBanco, setMostrarBanco] = useState(false);
  const [busquedaMed, setBusquedaMed] = useState('');
  // Indicaciones
  const [indicaciones, setIndicaciones] = useState('');
  const [proximaCita, setProximaCita] = useState('');
  // UI
  const [seccion, setSeccion] = useState('motivo');
  const [guardando, setGuardando] = useState(false);

  const secciones = [
    { key: 'motivo', label: '1. Motivo y Evolución' },
    { key: 'examen', label: '2. Examen Físico' },
    { key: 'diagnostico', label: '3. Diagnósticos CIE-10' },
    { key: 'prescripcion', label: '4. Prescripción' },
    { key: 'examenes', label: '5. Exámenes' },
    { key: 'indicaciones', label: '6. Indicaciones' },
  ];

  const addDiagnostico = (d) => {
    if (!diagnosticos.find(x => x.code === d.code)) {
      setDiagnosticos(p => [...p, d]);
    }
    setBusquedaCie('');
  };

  const removeDiagnostico = (code) => setDiagnosticos(p => p.filter(d => d.code !== code));

  const buscarCie10 = async (q) => {
    setBusquedaCie(q);
    if (!q || q.length < 2) { setCie10Results([]); return; }
    setBuscandoCie(true);
    const { data } = await supabase.from('cie10')
      .select('codigo, descripcion, categoria')
      .or(`codigo.ilike.${q}%,descripcion.ilike.%${q}%`)
      .limit(15);
    setCie10Results(data || []);
    setBuscandoCie(false);
  };

  const addMedicamento = () => {
    if (!nuevoMed.nombre.trim()) return;
    setMedicamentos(p => [...p, { ...nuevoMed, id: Date.now() }]);
    setNuevoMed({ nombre: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
  };

  const removeMedicamento = (id) => setMedicamentos(p => p.filter(m => m.id !== id));

  const toggleExamLab = (exam) => setExamLab(p => p.includes(exam) ? p.filter(x => x !== exam) : [...p, exam]);
  const toggleExamImg = (exam) => setExamImg(p => p.includes(exam) ? p.filter(x => x !== exam) : [...p, exam]);

  const guardar = async () => {
    setGuardando(true);
    const bmi = peso && talla ? (parseFloat(peso) / ((parseFloat(talla) / 100) ** 2)).toFixed(1) : null;
    const data = {
      paciente_id: paciente.id,
      medico_id: usuario?.id || null,
      medico_nombre: medicoNombre || null,
      fecha: fecha || new Date().toISOString().split('T')[0],
      motivo_consulta: motivoConsulta || null,
      evolucion: evolucion || null,
      examen_fisico: examenFisico || null,
      peso: peso ? parseFloat(peso) : null,
      talla: talla ? parseFloat(talla) : null,
      bmi: bmi ? parseFloat(bmi) : null,
      pa_sistolica: paSis ? parseInt(paSis) : null,
      pa_diastolica: paDia ? parseInt(paDia) : null,
      fc: fc ? parseInt(fc) : null,
      fr: fr ? parseInt(fr) : null,
      spo2: spo2 ? parseFloat(spo2) : null,
      temperatura: temperatura ? parseFloat(temperatura) : null,
      diagnosticos: JSON.stringify(diagnosticos),
      medicamentos: JSON.stringify(medicamentos),
      examenes_lab: JSON.stringify([...examLab, ...(otrosLab.trim() ? otrosLab.split('\n').map(x=>x.trim()).filter(Boolean) : [])]),
      examenes_imagen: JSON.stringify([...examImg, ...(otrosImg.trim() ? otrosImg.split('\n').map(x=>x.trim()).filter(Boolean) : [])]),
      indicaciones: indicaciones || null,
      proxima_visita: proximaCita || null,
    };
    // Remove any undefined values
    Object.keys(data).forEach(k => { if (data[k] === undefined) delete data[k]; });
    const { error } = await supabase.from('consultas_medicas').insert([data]);
    if (!error) onGuardado();
    setGuardando(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.82)', display: 'flex', alignItems: 'stretch', zIndex: 1000 }}>
      <div style={{ background: B.grayLt, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: B.teal, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>Nueva Consulta Médica</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>{paciente.nombre} {paciente.apellido} · {paciente.historia_clinica}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '8px 20px', background: B.green, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : '💾 Guardar consulta'}
            </button>
            <button onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', borderRadius: 6, padding: '4px 10px' }}>✕</button>
          </div>
        </div>

        {/* Datos generales */}
        <div style={{ background: B.navy, padding: '10px 20px', display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 2 }}>Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                style={{ padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, color: 'white', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 2 }}>Médico</label>
              <input value={medicoNombre} onChange={e => setMedicoNombre(e.target.value)}
                style={{ padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, color: 'white', fontSize: 12, outline: 'none', fontFamily: 'inherit', width: 200 }} />
            </div>
          </div>
          {/* Contadores */}
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
            {[['Dx', diagnosticos.length, B.teal], ['💊', medicamentos.length, B.green], ['🧪', examLab.length, B.blue], ['🩻', examImg.length, '#7B2D8B']].map(([l, n, c]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: n > 0 ? c : 'rgba(255,255,255,0.3)' }}>{n}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Navegación secciones */}
        <div style={{ background: B.white, borderBottom: `2px solid ${B.grayMd}`, display: 'flex', paddingLeft: 20, overflowX: 'auto', flexShrink: 0 }}>
          {secciones.map(s => (
            <button key={s.key} onClick={() => setSeccion(s.key)}
              style={{ padding: '10px 16px', border: 'none', background: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: seccion === s.key ? B.teal : B.gray, borderBottom: seccion === s.key ? `3px solid ${B.teal}` : '3px solid transparent', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Contenido de secciones */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', maxWidth: 860, margin: '0 auto', width: '100%' }}>

          {/* MOTIVO Y EVOLUCIÓN */}
          {seccion === 'motivo' && (
            <div>
              <CTextArea label="Motivo de consulta" value={motivoConsulta} onChange={setMotivoConsulta} rows={3}
                placeholder="Describa el motivo principal por el que consulta el paciente..." />
              <CTextArea label="Evolución" value={evolucion} onChange={setEvolucion} rows={4}
                placeholder="Evolución desde la última consulta, respuesta al tratamiento, cambios en síntomas..." />
            </div>
          )}

          {/* EXAMEN FÍSICO */}
          {seccion === 'examen' && (
            <div>
              <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px', borderLeft: `4px solid ${B.teal}`, paddingLeft: 10 }}>Signos Vitales</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
                <CInput label="Peso (kg)" value={peso} onChange={setPeso} type="number" half />
                <CInput label="Talla (cm)" value={talla} onChange={setTalla} type="number" half />
                <CInput label="PA sistólica (mmHg)" value={paSis} onChange={setPaSis} type="number" half hint="Normal: <120" />
                <CInput label="PA diastólica (mmHg)" value={paDia} onChange={setPaDia} type="number" half hint="Normal: <80" />
                <CInput label="FC (lpm)" value={fc} onChange={setFc} type="number" half hint="Normal: 60–100" />
                <CInput label="FR (rpm)" value={fr} onChange={setFr} type="number" half hint="Normal: 12–20" />
                <CInput label="SpO2 (%)" value={spo2} onChange={setSpo2} type="number" half hint="Normal: ≥95%" />
                <CInput label="Temperatura (°C)" value={temperatura} onChange={setTemperatura} type="number" half hint="Normal: 36–37.5" />
              </div>
              {peso && talla && (
                <div style={{ background: B.blueLt || '#E8F4FD', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <p style={{ fontSize: 11, color: B.teal, margin: 0 }}>
                    IMC calculado: <strong style={{ color: B.navy, fontSize: 14 }}>{(parseFloat(peso) / ((parseFloat(talla) / 100) ** 2)).toFixed(1)} kg/m²</strong>
                  </p>
                </div>
              )}
              <div style={{ borderLeft: `4px solid ${B.teal}`, paddingLeft: 10, marginBottom: 14, marginTop: 20 }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Examen Físico</p>
              </div>
              <CTextArea label="Hallazgos del examen físico" value={examenFisico} onChange={setExamenFisico} rows={5}
                placeholder="Descripción del examen físico: general, cardiopulmonar, abdominal, extremidades, piel y faneras, neurológico..." />
            </div>
          )}

          {/* DIAGNÓSTICOS CIE-10 */}
          {seccion === 'diagnostico' && (
            <div>
              <div style={{ borderLeft: `4px solid ${B.teal}`, paddingLeft: 10, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Diagnósticos CIE-10</p>
              </div>
              {/* Diagnósticos seleccionados */}
              {diagnosticos.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {diagnosticos.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: B.white, borderRadius: 8, padding: '10px 14px', marginBottom: 6, border: `1.5px solid ${B.grayMd}`, borderLeft: `4px solid ${B.teal}` }}>
                      <span style={{ background: B.navy, color: 'white', padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{d.code}</span>
                      <span style={{ flex: 1, fontSize: 13, color: B.navy, fontWeight: 500 }}>{d.desc}</span>
                      <button onClick={() => removeDiagnostico(d.code)}
                        style={{ background: B.red + '22', color: B.red, border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Buscador CIE-10 */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Buscar diagnóstico por código o nombre
                </label>
                <input value={busquedaCie} onChange={e => buscarCie10(e.target.value)}
                  placeholder="Ej: E66, 'obesidad', 'diabetes', 'hipertensión'..."
                  style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${B.grayMd}`, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit' }} />
                {buscandoCie && <p style={{ fontSize: 11, color: B.teal, marginBottom: 8 }}>Buscando...</p>}
                {busquedaCie && !buscandoCie && (
                  <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
                    {cie10Results.length === 0 ? (
                      <NuevoCie10
                        busqueda={busquedaCie}
                        onAgregar={(d) => { addDiagnostico(d); setBusquedaCie(''); setCie10Results([]); }}
                      />
                    ) : cie10Results.map((d, i) => (
                      <div key={i} onClick={() => { addDiagnostico({ code: d.codigo, desc: d.descripcion }); setBusquedaCie(''); setCie10Results([]); }}
                        style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${B.grayLt}`, background: diagnosticos.find(x => x.code === d.codigo) ? B.teal + '11' : 'white' }}
                        onMouseEnter={e => e.currentTarget.style.background = B.grayLt}
                        onMouseLeave={e => e.currentTarget.style.background = diagnosticos.find(x => x.code === d.codigo) ? B.teal + '11' : 'white'}>
                        <span style={{ background: B.navy, color: 'white', padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{d.codigo}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, color: B.navy }}>{d.descripcion}</span>
                          {d.categoria && <span style={{ fontSize: 10, color: B.gray, marginLeft: 8 }}>{d.categoria}</span>}
                        </div>
                        {diagnosticos.find(x => x.code === d.codigo) && <span style={{ color: B.teal, fontSize: 12 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRESCRIPCIÓN */}
          {seccion === 'prescripcion' && (
            <div>
              <div style={{ borderLeft: `4px solid ${B.green}`, paddingLeft: 10, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Prescripción de medicamentos</p>
              </div>
              {/* Agregar medicamento */}
              {/* Banco de medicamentos */}
              <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, padding: '14px 18px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarBanco ? 12 : 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, margin: 0 }}>💊 Banco de medicamentos frecuentes</p>
                  <button onClick={() => setMostrarBanco(p => !p)}
                    style={{ padding: '5px 14px', background: mostrarBanco ? B.grayMd : B.blue + '22', color: mostrarBanco ? B.gray : B.blue, border: `1px solid ${mostrarBanco ? B.grayMd : B.blue + '44'}`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {mostrarBanco ? 'Cerrar ▲' : 'Ver banco ▼'}
                  </button>
                </div>
                {mostrarBanco && (
                  <div>
                    <input value={busquedaMed} onChange={e => setBusquedaMed(e.target.value)} placeholder="Buscar medicamento..."
                      style={{ width: '100%', padding: '7px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', marginBottom: 10, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                      {BANCO_MEDICAMENTOS.filter(m => m.nombre.toLowerCase().includes(busquedaMed.toLowerCase()) || m.grupo.toLowerCase().includes(busquedaMed.toLowerCase())).map((m, i) => (
                        <div key={i} onClick={() => { setNuevoMed({ nombre: m.nombre, dosis: m.dosis, frecuencia: m.frecuencia, duracion: '30 días', indicaciones: m.indicaciones }); setMostrarBanco(false); setBusquedaMed(''); }}
                          style={{ padding: '8px 10px', background: B.grayLt, borderRadius: 7, cursor: 'pointer', border: `1px solid ${B.grayMd}`, borderLeft: `3px solid ${B.green}` }}
                          onMouseEnter={e => e.currentTarget.style.background = B.green + '11'}
                          onMouseLeave={e => e.currentTarget.style.background = B.grayLt}>
                          <p style={{ fontWeight: 600, fontSize: 12, color: B.navy, margin: '0 0 2px' }}>{m.nombre}</p>
                          <p style={{ fontSize: 10, color: B.gray, margin: 0 }}>{m.dosis} · {m.frecuencia}</p>
                          <span style={{ fontSize: 9, background: B.green + '22', color: B.green, padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>{m.grupo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, padding: '16px 18px', marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 12, color: B.teal, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>+ Agregar medicamento</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
                  <CInput label="Nombre del medicamento *" value={nuevoMed.nombre} onChange={v => setNuevoMed(p => ({ ...p, nombre: v }))} placeholder="Ej: Metformina 850mg" />
                  <CInput label="Dosis" value={nuevoMed.dosis} onChange={v => setNuevoMed(p => ({ ...p, dosis: v }))} placeholder="Ej: 1 tableta" half />
                  <CInput label="Frecuencia" value={nuevoMed.frecuencia} onChange={v => setNuevoMed(p => ({ ...p, frecuencia: v }))} placeholder="Ej: Cada 8 horas" half />
                  <CInput label="Duración" value={nuevoMed.duracion} onChange={v => setNuevoMed(p => ({ ...p, duracion: v }))} placeholder="Ej: 30 días" half />
                  <CInput label="Indicaciones adicionales" value={nuevoMed.indicaciones} onChange={v => setNuevoMed(p => ({ ...p, indicaciones: v }))} placeholder="Ej: Tomar con alimentos" half />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={addMedicamento}
                    style={{ padding: '8px 20px', background: B.green, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    + Agregar a la receta
                  </button>
                </div>
              </div>
              {/* Lista de medicamentos */}
              {medicamentos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: B.gray, background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}` }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>💊</p>
                  <p style={{ fontSize: 13 }}>No hay medicamentos agregados</p>
                </div>
              ) : (
                medicamentos.map((m, i) => (
                  <div key={m.id} style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, padding: '12px 16px', marginBottom: 8, borderLeft: `4px solid ${B.green}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 4px' }}>{i + 1}. {m.nombre}</p>
                      <p style={{ fontSize: 12, color: B.teal, margin: '0 0 2px' }}>{m.dosis} · {m.frecuencia} · {m.duracion}</p>
                      {m.indicaciones && <p style={{ fontSize: 11, color: B.gray, margin: 0 }}>{m.indicaciones}</p>}
                    </div>
                    <button onClick={() => removeMedicamento(m.id)}
                      style={{ background: B.red + '22', color: B.red, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>✕</button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* EXÁMENES */}
          {seccion === 'examenes' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setTabExamen('lab')}
                  style={{ padding: '8px 20px', background: tabExamen === 'lab' ? B.blue : B.white, color: tabExamen === 'lab' ? 'white' : B.blue, border: `2px solid ${B.blue}`, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🧪 Laboratorio ({examLab.length})
                </button>
                <button onClick={() => setTabExamen('imagen')}
                  style={{ padding: '8px 20px', background: tabExamen === 'imagen' ? '#7B2D8B' : B.white, color: tabExamen === 'imagen' ? 'white' : '#7B2D8B', border: `2px solid #7B2D8B`, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🩻 Imágenes ({examImg.length})
                </button>
              </div>
              {tabExamen === 'lab' && Object.entries(EXAMENES_LAB).map(([grupo, items]) => (
                <div key={grupo} style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ background: B.blue + '11', padding: '10px 14px', borderBottom: `1px solid ${B.grayMd}` }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: B.blue, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>{grupo}</p>
                  </div>
                  <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 6 }}>
                    {items.map(item => (
                      <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 8px', borderRadius: 6, background: examLab.includes(item) ? B.blue + '11' : 'transparent' }}>
                        <input type="checkbox" checked={examLab.includes(item)} onChange={() => toggleExamLab(item)}
                          style={{ width: 14, height: 14, accentColor: B.blue, cursor: 'pointer' }} />
                        <span style={{ fontSize: 12, color: B.navy, fontWeight: examLab.includes(item) ? 600 : 400 }}>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {tabExamen === 'lab' && (
                <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ background: B.blue + '11', padding: '10px 14px', borderBottom: `1px solid ${B.grayMd}` }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: B.blue, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Otros exámenes de laboratorio</p>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <textarea value={otrosLab} onChange={e => setOtrosLab(e.target.value)} rows={3}
                      placeholder="Escriba uno por línea: Ej. Vitamina C sérica&#10;Ácido metilmalónico&#10;Péptido YY"
                      style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <p style={{ fontSize: 10, color: B.gray, margin: '4px 0 0' }}>Un examen por línea</p>
                  </div>
                </div>
              )}
              {tabExamen === 'imagen' && Object.entries(EXAMENES_IMAGEN).map(([grupo, items]) => (
                <div key={grupo} style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ background: '#7B2D8B11', padding: '10px 14px', borderBottom: `1px solid ${B.grayMd}` }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: '#7B2D8B', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>{grupo}</p>
                  </div>
                  <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 6 }}>
                    {items.map(item => (
                      <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 8px', borderRadius: 6, background: examImg.includes(item) ? '#7B2D8B11' : 'transparent' }}>
                        <input type="checkbox" checked={examImg.includes(item)} onChange={() => toggleExamImg(item)}
                          style={{ width: 14, height: 14, accentColor: '#7B2D8B', cursor: 'pointer' }} />
                        <span style={{ fontSize: 12, color: B.navy, fontWeight: examImg.includes(item) ? 600 : 400 }}>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {tabExamen === 'imagen' && (
                <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ background: '#7B2D8B11', padding: '10px 14px', borderBottom: `1px solid ${B.grayMd}` }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: '#7B2D8B', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Otros exámenes de imagen</p>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <textarea value={otrosImg} onChange={e => setOtrosImg(e.target.value)} rows={3}
                      placeholder="Escriba uno por línea: Ej. TAC tórax con contraste&#10;Gammagrafía tiroidea"
                      style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <p style={{ fontSize: 10, color: B.gray, margin: '4px 0 0' }}>Un examen por línea</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INDICACIONES */}
          {seccion === 'indicaciones' && (
            <div>
              <CTextArea label="Indicaciones y recomendaciones" value={indicaciones} onChange={setIndicaciones} rows={6}
                placeholder="Indicaciones para el paciente: dieta, actividad física, cuidados, señales de alarma, próximos pasos..." />
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Próxima cita</label>
                <input type="date" value={proximaCita} onChange={e => setProximaCita(e.target.value)}
                  style={{ padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginTop: 20, background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, padding: '16px 18px' }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, margin: '0 0 12px' }}>📋 Resumen de la consulta</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Diagnósticos', diagnosticos.length],
                    ['Medicamentos', medicamentos.length],
                    ['Exámenes de lab', examLab.length],
                    ['Exámenes de imagen', examImg.length],
                  ].map(([l, n]) => (
                    <div key={l} style={{ background: B.grayLt, borderRadius: 7, padding: '8px 12px' }}>
                      <p style={{ fontSize: 11, color: B.gray, margin: '0 0 2px' }}>{l}</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: n > 0 ? B.navy : B.gray, margin: 0 }}>{n}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                  <button onClick={guardar} disabled={guardando}
                    style={{ padding: '10px 28px', background: guardando ? '#9AA5B1' : B.teal, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {guardando ? 'Guardando...' : '💾 Guardar consulta completa'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── HISTORIAL UNIFICADO ──────────────────────────────────────────────────────
export function HistorialUnificado({ valoraciones, consultasMed, consultasNut, planes }) {
  const eventos = [
    ...valoraciones.map(v => ({ tipo: 'fisio', fecha: v.fecha, titulo: 'Valoración fisioterapéutica', sub: `${v.terapeuta_nombre || '—'} · Peso: ${v.peso || '—'}kg · VO2max: ${v.vo2max || '—'}`, color: '#1E7CB5', icon: '🏃', aptitud: v.aptitud, data: v })),
    ...consultasMed.map(c => {
      const diags = c.diagnosticos ? JSON.parse(c.diagnosticos) : [];
      return { tipo: 'medico', fecha: c.fecha, titulo: 'Consulta médica', sub: `${c.medico_nombre || '—'}${diags.length > 0 ? ' · ' + diags[0].code : ''}`, color: '#4B647A', icon: '🩺', data: c };
    }),
    ...consultasNut.map(n => ({ tipo: 'nutricion', fecha: n.fecha, titulo: 'Consulta nutricional', sub: `${n.nutricionista_nombre || '—'}${n.kcal_objetivo ? ' · ' + n.kcal_objetivo + ' kcal' : ''}`, color: '#1A7A4A', icon: '🥗', data: n })),
    ...planes.map(p => ({ tipo: 'plan', fecha: p.fecha, titulo: `Plan de ejercicio · Fase ${p.fase}`, sub: `${p.terapeuta_nombre || '—'} · ${p.entorno === 'gym' ? 'Gimnasio' : 'Casa'} · ${p.plan_ejercicios?.length || 0} ejercicios`, color: '#0B1F3B', icon: '🏋️', data: p })),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const fmtDateShort = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (eventos.length === 0) return (
    <div style={{ textAlign: 'center', padding: 60, background: '#FFFFFF', borderRadius: 12, border: '1.5px solid #DDE3EA' }}>
      <p style={{ fontSize: 36, marginBottom: 10 }}>📅</p>
      <p style={{ color: '#6E6E70' }}>No hay registros en el historial aún.</p>
    </div>
  );

  return (
    <div>
      <p style={{ fontWeight: 700, fontSize: 13, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px' }}>
        {eventos.length} registro{eventos.length !== 1 ? 's' : ''} en el historial
      </p>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: '#DDE3EA' }} />
        {eventos.map((ev, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14, position: 'relative' }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: ev.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, zIndex: 1, border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {ev.icon}
            </div>
            <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 10, border: '1.5px solid #DDE3EA', padding: '12px 16px', borderLeft: `4px solid ${ev.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#0B1F3B', margin: '0 0 3px' }}>{ev.titulo}</p>
                  <p style={{ fontSize: 11, color: '#6E6E70', margin: 0 }}>{ev.sub}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ev.color, margin: 0 }}>{fmtDateShort(ev.fecha)}</p>
                  {ev.aptitud && <span style={{ fontSize: 9, background: ev.aptitud === 'apto' ? '#1A7A4A22' : '#C2500022', color: ev.aptitud === 'apto' ? '#1A7A4A' : '#C25A00', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>{ev.aptitud === 'apto' ? '✓ Apto' : '⚠ Con restricciones'}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GENERADORES DE DOCUMENTOS IMPRIMIBLES ────────────────────────────────────
const LOGO_HTML = `<img src="data:image/jpeg;base64,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FNUftFbrdcKyS5VNTHRMc2na+pjiY2JgLSTGREeN3JxLshT0Y9/Mjrya8JffrHSjNTM06/UdsF2fH1raHtLOtLeHiBDc5+jz93NejbrjQXa1wXK2VcNXR1DBJFPC8OZI0+BBHiFD7Nlr1HeGXCC+U9PC2+09zbbWd6FkUcDIscZj6wyDhIHe4cYyM5WZbYae1bpLR1JprUUlklpbfTR09LLb3Sl78ZyZA8ADyxj1VbUrEbiVq2tM6mGcIiLJqIiICIiAiIgIiICIiAiIgIiICIiAiIgIvh8Ucn042u94yvjstN/Ij/KFHccyLh7LTfyI/wAoTstN/Ij/AChO45l0oLxaqmZ8MFxpXyMkMT4xKOJrw7hLSPHOeS7bI2RjDGBo9BheMzSdkjvsV3jpnNqY5XzhxeXd54dnxzgZe84GBk5Uj8qNYaZpK2ppam8U8UlKQJi/IawlzW44sYyC9oIB5ZGcLifrnSjZZmC8wvMHH1pja54ZwOLXZLQQO81w9SOS61Vt7p6tvTrjUtqpMve8U7piYWl7mvkw32Oc0Eg8sk4xkrgdtnpoVU01MyqpBLGYjHTyBjWtzkBox3QDzAHsHig9GXW+lYaVlQ+9U/Vv8CA4kciSSAMgDhPFn6OOeF77XtfGHscHNcMhwOQR7ViUm3VhdFL1U1yp55mvZLVQ1bmyyB+es4nefETk+oGMYWUQUkFPQw0kbB1UTGxsB54AGB/7IOZFw9lpv5Ef5QnZab+RH+UKO45kXD2Wm/kR/lC+2QxRnLI2N9wwncfaIikEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQf/Z" alt="IMC Logo" style="height:52px;width:auto;display:block;">`;

const BASE_DOC_STYLE = `
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:20px;color:#0B1F3B;}
  .page{background:white;max-width:720px;margin:0 auto;border-radius:6px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);}
  .header{background:#0B1F3B;padding:18px 28px;display:flex;justify-content:space-between;align-items:center;}
  .header-right{text-align:right;color:rgba(255,255,255,0.7);font-size:11px;}
  .header-right strong{color:white;display:block;font-size:13px;margin-bottom:2px;}
  .patient-bar{background:#1E7CB5;padding:10px 28px;display:flex;gap:20px;}
  .pb-item{color:rgba(255,255,255,0.5);font-size:9px;text-transform:uppercase;letter-spacing:1px;}
  .pb-item strong{color:white;display:block;font-size:12px;margin-bottom:1px;}
  .body{padding:22px 28px;}
  .section{margin-bottom:20px;}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#4B647A;border-bottom:2px solid #1E7CB5;padding-bottom:5px;margin-bottom:12px;}
  .print-btn{position:fixed;bottom:20px;right:20px;background:#0B1F3B;color:white;border:none;padding:10px 22px;border-radius:25px;font-family:inherit;font-weight:700;font-size:13px;cursor:pointer;}
  .print-btn:hover{background:#1E7CB5;}
  .footer{background:#0B1F3B;padding:10px 28px;display:flex;justify-content:space-between;align-items:center;}
  .footer p{color:rgba(255,255,255,0.4);font-size:9px;}
  @media print{body{background:white;padding:0;}.page{box-shadow:none;border-radius:0;max-width:100%;}.print-btn{display:none;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}
`;

function docHeader(titulo, paciente, fecha, medico) {
  const age = calcAge(paciente.fecha_nacimiento);
  return `
  <div class="header">
    ${LOGO_HTML}
    <div class="header-right">
      <strong>${titulo}</strong>
      ${fmtDate(fecha)} · ${medico || '—'}
    </div>
  </div>
  <div class="patient-bar">
    <div class="pb-item"><strong>${paciente.nombre} ${paciente.apellido}</strong>Paciente</div>
    <div class="pb-item"><strong>${paciente.historia_clinica || '—'}</strong>Historia clínica</div>
    <div class="pb-item"><strong>${paciente.cedula || '—'}</strong>Cédula</div>
    <div class="pb-item"><strong>${age > 0 ? age + ' años' : '—'}</strong>Edad</div>
    <div class="pb-item"><strong>${paciente.sexo === 'F' ? 'Femenino' : paciente.sexo === 'M' ? 'Masculino' : '—'}</strong>Sexo</div>
  </div>`;
}

function docFooter(medico) {
  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:20px 28px;border-top:1px solid #DDE3EA;">
    <div>
      <div style="border-bottom:1px solid #DDE3EA;margin-bottom:5px;height:30px;"></div>
      <p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">${medico || 'Médico tratante'} · IMC</p>
    </div>
    <div>
      <div style="border-bottom:1px solid #DDE3EA;margin-bottom:5px;height:30px;"></div>
      <p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">Firma del paciente</p>
    </div>
  </div>
  <div class="footer">
    <p>IMC – Instituto Metabólico Corporal · by GMEDiQ</p>
    <p>Documento oficial · ${new Date().getFullYear()}</p>
  </div>`;
}

export function imprimirConsulta(paciente, consulta, diagnosticos, medicamentos, examLab, examImg) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Resumen Consulta — ${paciente.nombre}</title>
  <style>${BASE_DOC_STYLE}</style></head><body><div class="page">
  ${docHeader('Resumen de Consulta Médica', paciente, consulta.fecha, consulta.medico_nombre)}
  <div class="body">
    ${consulta.motivo_consulta ? `<div class="section"><div class="section-title">Motivo de consulta</div><p style="font-size:13px;line-height:1.6;">${consulta.motivo_consulta}</p></div>` : ''}
    ${consulta.evolucion ? `<div class="section"><div class="section-title">Evolución</div><p style="font-size:13px;line-height:1.6;">${consulta.evolucion}</p></div>` : ''}
    ${(consulta.peso || consulta.pa_sistolica) ? `<div class="section"><div class="section-title">Signos vitales</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
        ${[['Peso', consulta.peso, 'kg'], ['PA', consulta.pa_sistolica && consulta.pa_diastolica ? `${consulta.pa_sistolica}/${consulta.pa_diastolica}` : null, 'mmHg'], ['FC', consulta.fc, 'lpm'], ['SpO2', consulta.spo2, '%'], ['FR', consulta.fr, 'rpm'], ['Temp', consulta.temperatura, '°C'], ['IMC', consulta.bmi, 'kg/m²']].filter(([, v]) => v).map(([l, v, u]) => `<div style="background:#F4F6F8;border-radius:7px;padding:8px 10px;"><p style="font-size:8px;color:#4B647A;font-weight:700;text-transform:uppercase;margin:0 0 2px;">${l}</p><p style="font-size:16px;font-weight:700;color:#0B1F3B;margin:0;">${v}<span style="font-size:9px;"> ${u}</span></p></div>`).join('')}
      </div></div>` : ''}
    ${diagnosticos.length > 0 ? `<div class="section"><div class="section-title">Diagnósticos CIE-10</div>
      ${diagnosticos.map(d => `<div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;"><span style="background:#0B1F3B;color:white;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;">${d.code}</span><span style="font-size:13px;">${d.desc}</span></div>`).join('')}
    </div>` : ''}
    ${consulta.examen_fisico ? `<div class="section"><div class="section-title">Examen físico</div><p style="font-size:13px;line-height:1.6;">${consulta.examen_fisico}</p></div>` : ''}
    ${consulta.indicaciones ? `<div class="section"><div class="section-title">Indicaciones</div><p style="font-size:13px;line-height:1.6;">${consulta.indicaciones}</p></div>` : ''}
    ${consulta.proxima_visita ? `<p style="font-size:12px;color:#1E7CB5;font-weight:600;">📅 Próxima cita: ${fmtDate(consulta.proxima_visita)}</p>` : ''}
  </div>
  ${docFooter(consulta.medico_nombre)}
  </div><button class="print-btn" onclick="window.print()">🖨 Imprimir</button></body></html>`;
  abrirDoc(html);
}

export function imprimirReceta(paciente, consulta, medicamentos) {
  const calcAge = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
  const age = calcAge(paciente.fecha_nacimiento);
  const fechaConsulta = new Date(consulta.fecha + 'T12:00:00');
  const validaHasta = new Date(fechaConsulta.getTime() + 3 * 24 * 3600 * 1000);
  const fmtV = d => d.toLocaleDateString('es-EC', {day:'2-digit',month:'2-digit',year:'numeric'});
  const diags = consulta.diagnosticos ? JSON.parse(consulta.diagnosticos) : [];
  const codigo = String(Math.floor(Math.random() * 9000) + 1000);
  const logoSrc = 'data:image/jpeg;base64,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FNUftFbrdcKyS5VNTHRMc2na+pjiY2JgLSTGREeN3JxLshT0Y9/Mjrya8JffrHSjNTM06/UdsF2fH1raHtLOtLeHiBDc5+jz93NejbrjQXa1wXK2VcNXR1DBJFPC8OZI0+BBHiFD7Nlr1HeGXCC+U9PC2+09zbbWd6FkUcDIscZj6wyDhIHe4cYyM5WZbYae1bpLR1JprUUlklpbfTR09LLb3Sl78ZyZA8ADyxj1VbUrEbiVq2tM6mGcIiLJqIiICIiAiIgIiICIiAiIgIiICIiAiIgIvh8Ucn042u94yvjstN/Ij/KFHccyLh7LTfyI/wAoTstN/Ij/AChO45l0oLxaqmZ8MFxpXyMkMT4xKOJrw7hLSPHOeS7bI2RjDGBo9BheMzSdkjvsV3jpnNqY5XzhxeXd54dnxzgZe84GBk5Uj8qNYaZpK2ppam8U8UlKQJi/IawlzW44sYyC9oIB5ZGcLifrnSjZZmC8wvMHH1pja54ZwOLXZLQQO81w9SOS61Vt7p6tvTrjUtqpMve8U7piYWl7mvkw32Oc0Eg8sk4xkrgdtnpoVU01MyqpBLGYjHTyBjWtzkBox3QDzAHsHig9GXW+lYaVlQ+9U/Vv8CA4kciSSAMgDhPFn6OOeF77XtfGHscHNcMhwOQR7ViUm3VhdFL1U1yp55mvZLVQ1bmyyB+es4nefETk+oGMYWUQUkFPQw0kbB1UTGxsB54AGB/7IOZFw9lpv5Ef5QnZab+RH+UKO45kXD2Wm/kR/lC+2QxRnLI2N9wwncfaIikEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQf/Z';

  const recetaBody = `
    <div style="font-size:11px;margin-bottom:8px;"><strong>Código:</strong> ${codigo}</div>
    <div style="font-size:11px;margin-bottom:4px;"><strong>Fecha:</strong> Quito ${fmtV(fechaConsulta)} | <strong>Válida hasta:</strong> ${fmtV(validaHasta)}</div>
    <div style="font-size:11px;margin-bottom:4px;"><strong>Paciente:</strong> ${paciente.apellido?.toUpperCase()} ${paciente.nombre?.toUpperCase()}</div>
    <div style="font-size:11px;margin-bottom:4px;"><strong>Cédula:</strong> ${paciente.cedula || '—'}</div>
    <div style="font-size:11px;margin-bottom:8px;"><strong>Edad:</strong> ${age} año(s)</div>
    ${diags.length > 0 ? `<div style="font-size:11px;margin-bottom:12px;"><strong>Diagnóstico:</strong> ${diags.map(d => d.code + ' ' + d.desc).join(' - ')}</div>` : ''}
    <hr style="border:1px solid #ccc;margin:10px 0;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <thead><tr style="border-bottom:2px solid #000;">
        <th style="text-align:left;padding:4px;font-size:11px;">MEDICAMENTOS.-</th>
        <th style="text-align:center;padding:4px;font-size:11px;width:80px;">CANTIDAD.-</th>
        <th style="text-align:left;padding:4px;font-size:11px;">INDICACIONES.-</th>
      </tr></thead>
      <tbody>
        ${medicamentos.map((m, i) => `
          <tr><td style="padding:6px 4px;font-size:11px;vertical-align:top;">
            ${i+1}. <strong>${m.nombre}</strong>
          </td>
          <td style="padding:6px 4px;font-size:11px;text-align:center;vertical-align:top;"># 1<br>(UN0)</td>
          <td style="padding:6px 4px;font-size:11px;vertical-align:top;">${m.dosis || ''}${m.frecuencia ? ', ' + m.frecuencia : ''}${m.duracion ? '. ' + m.duracion : ''}</td></tr>
          ${m.indicaciones ? `<tr><td colspan="3" style="padding:0 4px 6px;font-size:10px;color:#555;font-style:italic;">${m.indicaciones}</td></tr>` : ''}
        `).join('')}
      </tbody>
    </table>
    <div style="margin-bottom:6px;font-size:11px;"><strong>OBSERVACIONES:</strong></div>
    <div style="margin-bottom:4px;font-size:11px;">Recomendaciones:</div>
    <div style="margin-bottom:4px;font-size:11px;">Signos de Alarma:</div>
    <div style="margin-bottom:16px;font-size:11px;">Alergias: ${paciente.alergias || ''}</div>
    <div style="font-size:11px;margin-bottom:30px;"><strong>Próxima Cita:</strong> ${consulta.proxima_visita ? fmtV(new Date(consulta.proxima_visita + 'T12:00:00')) : ''}</div>
    <div style="text-align:center;margin-top:20px;">
      <div style="font-size:11px;font-weight:700;">${consulta.medico_nombre || 'Dr. Diego Alejandro Díaz Salcedo'}</div>
      <div style="font-size:10px;">Cirugía General y Laparoscópica</div>
      <div style="font-size:10px;">Registro Profesional: 1804536876</div>
      <div style="font-size:10px;">Contacto: 0984075703</div>
    </div>`;

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Receta MSP — ${paciente.nombre}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:white;padding:10px;}
    .page{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:760px;margin:0 auto;}
    .copy{border:1px solid #ccc;padding:14px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #ccc;padding-bottom:10px;margin-bottom:10px;}
    .header-info{font-size:10px;color:#333;line-height:1.5;}
    .print-btn{position:fixed;bottom:20px;right:20px;background:#0B1F3B;color:white;border:none;padding:10px 22px;border-radius:25px;font-family:inherit;font-weight:700;font-size:13px;cursor:pointer;}
    @media print{body{padding:0;}.print-btn{display:none;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}
  </style></head><body>
  <div class="page">
    <div class="copy">
      <div class="header">
        <img src="${logoSrc}" alt="IMC" style="height:40px;width:auto;">
        <div class="header-info" style="text-align:right;">
          Av. Mariana de Jesús OE702 y Nuño de Valderrama,<br>
          Edificio Citimed, 3er Piso, Consultorio 313.<br>
          <strong>Correo:</strong> gmediqceo@gmail.com<br>
          <strong>Telef.:</strong> 0984075703
        </div>
      </div>
      ${recetaBody}
    </div>
    <div class="copy">
      <div class="header">
        <img src="${logoSrc}" alt="IMC" style="height:40px;width:auto;">
        <div class="header-info" style="text-align:right;">
          Av. Mariana de Jesús OE702 y Nuño de Valderrama,<br>
          Edificio Citimed, 3er Piso, Consultorio 313.<br>
          <strong>Correo:</strong> gmediqceo@gmail.com<br>
          <strong>Telef.:</strong> 0984075703
        </div>
      </div>
      ${recetaBody}
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨 Imprimir receta</button>
  </body></html>`;
  abrirDoc(html);
}

export function imprimirExamenes(paciente, consulta, examLab, examImg) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Solicitud Exámenes — ${paciente.nombre}</title>
  <style>${BASE_DOC_STYLE}
    .exam-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F4F6F8;font-size:13px;}
    .check{width:14px;height:14px;border:1.5px solid #DDE3EA;border-radius:3px;flex-shrink:0;}
    .group-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1E7CB5;margin:12px 0 6px;padding-bottom:4px;border-bottom:1.5px solid #1E7CB5;}
  </style></head><body><div class="page">
  ${docHeader('Solicitud de Exámenes', paciente, consulta.fecha, consulta.medico_nombre)}
  <div class="body">
    <p style="font-size:12px;color:#6E6E70;margin-bottom:16px;">Por favor realizar los siguientes exámenes al paciente indicado:</p>
    ${examLab.length > 0 ? `
      <div class="section">
        <div class="section-title">🧪 Exámenes de Laboratorio</div>
        ${examLab.map(e => `<div class="exam-item"><div class="check"></div>${e}</div>`).join('')}
      </div>` : ''}
    ${examImg.length > 0 ? `
      <div class="section" style="margin-top:16px;">
        <div class="section-title">🩻 Exámenes de Imagen</div>
        ${examImg.map(e => `<div class="exam-item"><div class="check"></div>${e}</div>`).join('')}
      </div>` : ''}
    ${consulta.diagnosticos ? (() => {
      const diags = JSON.parse(consulta.diagnosticos);
      return diags.length > 0 ? `
        <div style="margin-top:16px;padding:12px 14px;background:#F4F6F8;border-radius:8px;">
          <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#4B647A;margin:0 0 8px;">Diagnósticos de referencia</p>
          ${diags.map(d => `<p style="font-size:12px;margin:0 0 3px;"><strong>${d.code}</strong> ${d.desc}</p>`).join('')}
        </div>` : '';
    })() : ''}
  </div>
  ${docFooter(consulta.medico_nombre)}
  </div><button class="print-btn" onclick="window.print()">🖨 Imprimir solicitud</button></body></html>`;
  abrirDoc(html);
}

function abrirDoc(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
