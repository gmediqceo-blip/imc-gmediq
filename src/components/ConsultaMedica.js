import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from './v2/Icon';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#7C8DA1',
  grayLt: '#FAFCFE', grayMd: '#E6EDF6', white: '#FFFFFF',
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
  const [consultaEditar, setConsultaEditar] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  return (
    <div>
      {!modalNueva && (<>
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
        <div style={{ textAlign: 'center', padding: 60, background: B.white, borderRadius: 12, border: `1px solid ${B.grayMd}` }}>
          <span style={{ display:"inline-flex", width:48, height:48, borderRadius:14, background:"var(--accent-wash)", alignItems:"center", justifyContent:"center", marginBottom:12 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1E7CB5" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg></span>
          <p style={{ color: B.gray, marginBottom: 16 }}>No hay consultas médicas registradas.</p>
          <button onClick={() => setModalNueva(true)}
            style={{ padding: '10px 22px', background: B.teal, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Crear primera consulta
          </button>
        </div>
      ) : (
        consultas.map(c => (
          <ConsultaCard
            key={c.id}
            consulta={c}
            paciente={paciente}
            onEditar={() => setConsultaEditar(c)}
          />
        ))
      )}
      </>)}

      {modalNueva && (
        <ModalConsulta
          paciente={paciente}
          usuario={usuario}
          onClose={() => setModalNueva(false)}
          onGuardado={() => { onActualizar(); setModalNueva(false); showToast('Consulta guardada ✓'); }}
        />
      )}

      {consultaEditar && (
        <ModalEditarConsulta
          paciente={paciente}
          consulta={consultaEditar}
          usuario={usuario}
          onClose={() => setConsultaEditar(null)}
          onGuardado={() => { onActualizar(); setConsultaEditar(null); showToast('Consulta actualizada ✓'); }}
        />
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  );
}

// ─── CARD DE CONSULTA ─────────────────────────────────────────────────────────
function ConsultaCard({ consulta: c, paciente, onEditar }) {
  const [open, setOpen] = useState(false);
  const diagnosticos = c.diagnosticos ? JSON.parse(c.diagnosticos) : [];
  const medicamentos = c.medicamentos ? JSON.parse(c.medicamentos) : [];
  const examLab = c.examenes_lab ? JSON.parse(c.examenes_lab) : [];
  const examImg = c.examenes_imagen ? JSON.parse(c.examenes_imagen) : [];

  return (
    <div style={{ background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}`, marginBottom: 12, borderLeft: `4px solid ${B.teal}`, overflow: 'hidden' }}>
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
          <button onClick={e => { e.stopPropagation(); onEditar && onEditar(); }}
            style={{ padding: '5px 12px', background: B.blue + '11', color: B.blue, border: `1px solid ${B.blue}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            Editar
          </button>
          <button onClick={e => { e.stopPropagation(); imprimirConsulta(paciente, c, diagnosticos, medicamentos, examLab, examImg); }}
            style={{ padding: '5px 12px', background: B.navy + '11', color: B.navy, border: `1px solid ${B.navy}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            Imprimir
          </button>
          {medicamentos.length > 0 && (
            <button onClick={e => { e.stopPropagation(); imprimirReceta(paciente, c, medicamentos); }}
              style={{ padding: '5px 12px', background: B.green + '11', color: B.green, border: `1px solid ${B.green}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              Receta
            </button>
          )}
          {(examLab.length > 0 || examImg.length > 0) && (
            <button onClick={e => { e.stopPropagation(); imprimirExamenes(paciente, c, examLab, examImg); }}
              style={{ padding: '5px 12px', background: B.blue + '11', color: B.blue, border: `1px solid ${B.blue}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              Exámenes
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
                {examLab.length > 0 && <p style={{ fontSize: 11, color: B.navy, margin: '0 0 4px' }}>Lab: {examLab.slice(0, 3).join(', ')}{examLab.length > 3 ? ` +${examLab.length - 3}` : ''}</p>}
                {examImg.length > 0 && <p style={{ fontSize: 11, color: B.navy, margin: 0 }}>Imagen: {examImg.slice(0, 3).join(', ')}{examImg.length > 3 ? ` +${examImg.length - 3}` : ''}</p>}
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
      style={{ width: '100%', padding: '8px 10px', border: '1px solid #DDE3EA', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
    {hint && <p style={{ fontSize: 9, color: '#6E6E70', margin: '3px 0 0' }}>{hint}</p>}
  </div>
);

const CTextArea = ({ label, value, onChange, rows = 4, placeholder }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</label>
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={{ width: '100%', padding: '8px 10px', border: '1px solid #DDE3EA', borderRadius: 6, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
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
        Código no encontrado — agregar nuevo CIE-10
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 160px', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>Código *</label>
          <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ej: E66.01"
            style={{ width: '100%', padding: '7px 9px', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }} />
        </div>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>Descripción *</label>
          <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Ej: Obesidad mórbida por exceso de calorías"
            style={{ width: '100%', padding: '7px 9px', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }} />
        </div>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>Categoría</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)}
            style={{ width: '100%', padding: '7px 9px', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }}>
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
  const [nuevoMed, setNuevoMed] = useState({ nombre: '', dosis: '', frecuencia: '', duracion: '', cantidad: '', indicaciones: '' });
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
  // Estado paciente
  const [nuevoEstado, setNuevoEstado] = useState('');
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
    setNuevoMed({ nombre: '', dosis: '', frecuencia: '', duracion: '', cantidad: '', indicaciones: '' });
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
    if (!error) {
      if (nuevoEstado) {
        await supabase.from('pacientes').update({ grupo: nuevoEstado }).eq('id', paciente.id);
      }
      await supabase.from('citas').update({ estado: 'atendida' }).eq('paciente_id', paciente.id).eq('fecha', new Date().toISOString().split('T')[0]).in('estado', ['pendiente', 'preatendido', 'confirmada']);
      onGuardado();
    }
    setGuardando(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <div style={{ background: B.grayLt, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 12, border: `1px solid ${B.grayMd}` }}>

        {/* Header */}
        <div style={{ background: B.teal, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>Nueva Consulta Médica</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>{paciente.nombre} {paciente.apellido} · {paciente.historia_clinica}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '8px 20px', background: B.green, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : 'Guardar consulta'}
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
            {[['Dx', diagnosticos.length, B.teal], ['Rx', medicamentos.length, B.green], ['Lab', examLab.length, B.blue], ['Img', examImg.length, '#7C3AED']].map(([l, n, c]) => (
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
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: B.white, borderRadius: 8, padding: '10px 14px', marginBottom: 6, border: `1px solid ${B.grayMd}`, borderLeft: `4px solid ${B.teal}` }}>
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
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.grayMd}`, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit' }} />
                {buscandoCie && <p style={{ fontSize: 11, color: B.teal, marginBottom: 8 }}>Buscando...</p>}
                {busquedaCie && !buscandoCie && (
                  <div style={{ background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}`, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
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
              <div style={{ background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}`, padding: '14px 18px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarBanco ? 12 : 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, margin: 0 }}>Banco de medicamentos frecuentes</p>
                  <button onClick={() => setMostrarBanco(p => !p)}
                    style={{ padding: '5px 14px', background: mostrarBanco ? B.grayMd : B.blue + '22', color: mostrarBanco ? B.gray : B.blue, border: `1px solid ${mostrarBanco ? B.grayMd : B.blue + '44'}`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {mostrarBanco ? 'Cerrar ▲' : 'Ver banco ▼'}
                  </button>
                </div>
                {mostrarBanco && (
                  <div>
                    <input value={busquedaMed} onChange={e => setBusquedaMed(e.target.value)} placeholder="Buscar medicamento..."
                      style={{ width: '100%', padding: '7px 10px', border: `1px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', marginBottom: 10, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                      {BANCO_MEDICAMENTOS.filter(m => m.nombre.toLowerCase().includes(busquedaMed.toLowerCase()) || m.grupo.toLowerCase().includes(busquedaMed.toLowerCase())).map((m, i) => (
                        <div key={i} onClick={() => { setNuevoMed({ nombre: m.nombre, dosis: m.dosis, frecuencia: m.frecuencia, duracion: '30 días', cantidad: '1', indicaciones: m.indicaciones }); setMostrarBanco(false); setBusquedaMed(''); }}
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

              <div style={{ background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}`, padding: '16px 18px', marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 12, color: B.teal, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>+ Agregar medicamento</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
                  <CInput label="Nombre del medicamento *" value={nuevoMed.nombre} onChange={v => setNuevoMed(p => ({ ...p, nombre: v }))} placeholder="Ej: Metformina 850mg" />
                  <CInput label="Dosis" value={nuevoMed.dosis} onChange={v => setNuevoMed(p => ({ ...p, dosis: v }))} placeholder="Ej: 1 tableta" half />
                  <CInput label="Frecuencia" value={nuevoMed.frecuencia} onChange={v => setNuevoMed(p => ({ ...p, frecuencia: v }))} placeholder="Ej: Cada 8 horas" half />
                  <CInput label="Duración" value={nuevoMed.duracion} onChange={v => setNuevoMed(p => ({ ...p, duracion: v }))} placeholder="Ej: 30 días" half />
                  <CInput label="Cantidad a entregar" value={nuevoMed.cantidad} onChange={v => setNuevoMed(p => ({ ...p, cantidad: v }))} placeholder="Ej: 15" half />
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
                <div style={{ textAlign: 'center', padding: '30px', color: B.gray, background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}` }}>
                  
                  <p style={{ fontSize: 13 }}>No hay medicamentos agregados</p>
                </div>
              ) : (
                medicamentos.map((m, i) => (
                  <div key={m.id} style={{ background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}`, padding: '12px 16px', marginBottom: 8, borderLeft: `4px solid ${B.green}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 4px' }}>{i + 1}. {m.nombre}</p>
                      <p style={{ fontSize: 12, color: B.teal, margin: '0 0 2px' }}>{m.dosis} · {m.frecuencia} · {m.duracion}{m.cantidad ? ' · Cantidad: #' + m.cantidad : ''}</p>
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
                  Laboratorio ({examLab.length})
                </button>
                <button onClick={() => setTabExamen('imagen')}
                  style={{ padding: '8px 20px', background: tabExamen === 'imagen' ? '#7B2D8B' : B.white, color: tabExamen === 'imagen' ? 'white' : '#7B2D8B', border: `2px solid #7B2D8B`, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Imágenes ({examImg.length})
                </button>
              </div>
              {tabExamen === 'lab' && Object.entries(EXAMENES_LAB).map(([grupo, items]) => (
                <div key={grupo} style={{ background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}`, marginBottom: 10, overflow: 'hidden' }}>
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
                <div style={{ background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}`, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ background: B.blue + '11', padding: '10px 14px', borderBottom: `1px solid ${B.grayMd}` }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: B.blue, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Otros exámenes de laboratorio</p>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <textarea value={otrosLab} onChange={e => setOtrosLab(e.target.value)} rows={3}
                      placeholder="Escriba uno por línea: Ej. Vitamina C sérica&#10;Ácido metilmalónico&#10;Péptido YY"
                      style={{ width: '100%', padding: '8px 10px', border: `1px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <p style={{ fontSize: 10, color: B.gray, margin: '4px 0 0' }}>Un examen por línea</p>
                  </div>
                </div>
              )}
              {tabExamen === 'imagen' && Object.entries(EXAMENES_IMAGEN).map(([grupo, items]) => (
                <div key={grupo} style={{ background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}`, marginBottom: 10, overflow: 'hidden' }}>
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
                <div style={{ background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}`, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ background: '#7B2D8B11', padding: '10px 14px', borderBottom: `1px solid ${B.grayMd}` }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: '#7B2D8B', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Otros exámenes de imagen</p>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <textarea value={otrosImg} onChange={e => setOtrosImg(e.target.value)} rows={3}
                      placeholder="Escriba uno por línea: Ej. TAC tórax con contraste&#10;Gammagrafía tiroidea"
                      style={{ width: '100%', padding: '8px 10px', border: `1px solid ${B.grayMd}`, borderRadius: 6, fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Próxima cita</label>
                  <input type="date" value={proximaCita} onChange={e => setProximaCita(e.target.value)}
                    style={{ padding: '8px 10px', border: `1px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Actualizar estado del paciente</label>
                  <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}
                    style={{ padding: '8px 10px', border: `1px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}>
                    <option value="">— Sin cambios —</option>
                    <option value="transformacion">Transformación corporal</option>
                    <option value="prequirurgico">Pre-quirúrgico</option>
                    <option value="postquirurgico">Post-quirúrgico</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 20, background: B.white, borderRadius: 10, border: `1px solid ${B.grayMd}`, padding: '16px 18px' }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: B.navy, margin: '0 0 12px' }}>Resumen de la consulta</p>
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
                    {guardando ? 'Guardando...' : 'Guardar consulta completa'}
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
export function HistorialUnificado({ valoraciones, consultasMed, consultasNut, planes, sesionesCosm = [] }) {
  const [openIdx, setOpenIdx] = useState(null);

  const eventos = [
    ...valoraciones.map(v => ({
      tipo: 'fisio', fecha: v.fecha,
      titulo: 'Valoración fisioterapéutica',
      sub: `${v.terapeuta_nombre || '—'} · Peso: ${v.peso || '—'}kg · VO2max: ${v.vo2max || '—'}`,
      color: '#1E7CB5', icon: 'activity', aptitud: v.aptitud, data: v
    })),
    ...consultasMed.map(c => {
      const diags = c.diagnosticos ? JSON.parse(c.diagnosticos) : [];
      const meds = c.medicamentos ? JSON.parse(c.medicamentos) : [];
      const exLab = c.examenes_lab ? JSON.parse(c.examenes_lab) : [];
      const exImg = c.examenes_imagen ? JSON.parse(c.examenes_imagen) : [];
      return { tipo: 'medico', fecha: c.fecha, titulo: 'Consulta médica',
        sub: `${c.medico_nombre || '—'}${diags.length > 0 ? ' · ' + diags[0].code + ' ' + diags[0].desc?.substring(0,30) : ''}`,
        color: '#4B647A', icon: 'stethoscope', data: c, diags, meds, exLab, exImg };
    }),
    ...consultasNut.map(n => ({ tipo: 'nutricion', fecha: n.fecha,
      titulo: 'Consulta nutricional',
      sub: `${n.nutricionista_nombre || '—'}${n.kcal_objetivo ? ' · ' + n.kcal_objetivo + ' kcal' : ''}`,
      color: '#1A7A4A', icon: 'utensils', data: n })),
    ...planes.map(p => ({ tipo: 'plan', fecha: p.fecha,
      titulo: `Plan de ejercicio · Fase ${p.fase}`,
      sub: `${p.terapeuta_nombre || '—'} · ${p.entorno === 'gym' ? 'Gimnasio' : 'Casa'} · ${p.plan_ejercicios?.length || 0} ejercicios`,
      color: '#0B1F3B', icon: 'dumbbell', data: p })),
    ...sesionesCosm.map(s => ({ tipo: 'cosmetologia', fecha: s.fecha,
      titulo: `Cosmetología · ${s.tratamientos_cosmetologia?.nombre || 'Tratamiento'}`,
      sub: `${s.zona_tratada ? s.zona_tratada : ''}${s.duracion_min ? ' · ' + s.duracion_min + ' min' : ''}${s.sesion_numero && s.sesiones_paquete ? ' · Sesión ' + s.sesion_numero + '/' + s.sesiones_paquete : ''}`,
      color: '#C9A86A', icon: 'sparkles', data: s })),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (eventos.length === 0) return (
    <div style={{ textAlign: 'center', padding: 60, background: '#FFFFFF', borderRadius: 12, border: '1px solid #DDE3EA' }}>
      <span style={{ display:"inline-flex", width:48, height:48, borderRadius:14, background:"#EFF6FC", alignItems:"center", justifyContent:"center", marginBottom:12 }}><Icon name="calendar-days" size={22} color="#1E7CB5" /></span>
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
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 12, position: 'relative' }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: ev.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, zIndex: 1, border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginTop: 2 }}>
              <Icon name={ev.icon} size={17} color={ev.color} />
            </div>
            <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 10, border: '1px solid #DDE3EA', borderLeft: `4px solid ${ev.color}`, overflow: 'hidden' }}>
              {/* Header clickeable */}
              <div onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#0B1F3B', margin: '0 0 3px' }}>{ev.titulo}</p>
                  <p style={{ fontSize: 11, color: '#6E6E70', margin: 0 }}>{ev.sub}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 12, flexShrink: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ev.color, margin: 0 }}>{fmtDate(ev.fecha)}</p>
                  {ev.aptitud && <span style={{ fontSize: 9, background: ev.aptitud === 'apto' ? '#1A7A4A22' : '#C2500022', color: ev.aptitud === 'apto' ? '#1A7A4A' : '#C25A00', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>{ev.aptitud === 'apto' ? '✓ Apto' : '⚠ Restricciones'}</span>}
                  <span style={{ color: ev.color, fontSize: 14 }}>{openIdx === i ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Detalle expandible */}
              {openIdx === i && (
                <div style={{ borderTop: '1px solid #F4F6F8', padding: '14px 16px', background: '#FAFBFC' }}>

                  {/* FISIOTERAPIA */}
                  {ev.tipo === 'fisio' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8, marginBottom: 12 }}>
                        {[['Peso', ev.data.peso, 'kg'], ['% Grasa', ev.data.pct_grasa, '%'], ['Músculo', ev.data.masa_muscular, 'kg'], ['IMC', ev.data.bmi, ''], ['VO2max', ev.data.vo2max, 'ml/kg/min'], ['FC reposo', ev.data.fc_reposo, 'bpm'], ['SpO2', ev.data.spo2, '%'], ['Cintura', ev.data.cintura, 'cm'], ['Sit & Stand', ev.data.sit_stand, 'reps'], ['Dina. D', ev.data.dina_d, 'kg']].filter(([,v]) => v).map(([l,v,u]) => (
                          <div key={l} style={{ background: 'white', borderRadius: 7, padding: '7px 10px', border: '1px solid #DDE3EA' }}>
                            <p style={{ fontSize: 9, color: '#4B647A', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>{l}</p>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#0B1F3B', margin: 0 }}>{v}<span style={{ fontSize: 9, color: '#6E6E70' }}> {u}</span></p>
                          </div>
                        ))}
                      </div>
                      {ev.data.zona2_lo && ev.data.zona2_hi && (
                        <div style={{ background: '#E8F5E9', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'inline-block' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#1A7A4A', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Zona 2 objetivo</p>
                          <p style={{ fontSize: 18, fontWeight: 700, color: '#1A7A4A', fontFamily: 'monospace', margin: 0 }}>{ev.data.zona2_lo} – {ev.data.zona2_hi} bpm</p>
                        </div>
                      )}
                      {ev.data.diagnostico && <p style={{ fontSize: 12, color: '#0B1F3B', marginTop: 8 }}><strong>Diagnóstico:</strong> {ev.data.diagnostico}</p>}
                      {ev.data.limitantes && <p style={{ fontSize: 12, color: '#C25A00', marginTop: 4 }}><strong>Limitantes:</strong> {ev.data.limitantes}</p>}
                    </div>
                  )}

                  {/* COSMETOLOGÍA */}
                  {ev.tipo === 'cosmetologia' && (
                    <div>
                      {ev.data.zona_tratada && <p style={{ fontSize: 12, color: '#0B1F3B', marginBottom: 6 }}><strong>Zona tratada:</strong> {ev.data.zona_tratada}</p>}
                      {ev.data.parametros && <p style={{ fontSize: 12, color: '#0B1F3B', marginBottom: 6 }}><strong>Parámetros del equipo:</strong> {ev.data.parametros}</p>}
                      {ev.data.duracion_min && <p style={{ fontSize: 12, color: '#0B1F3B', marginBottom: 6 }}><strong>Duración:</strong> {ev.data.duracion_min} min</p>}
                      {ev.data.sesion_numero && ev.data.sesiones_paquete && <p style={{ fontSize: 12, color: '#C9A86A', fontWeight: 700, marginBottom: 6 }}>Sesión {ev.data.sesion_numero} de {ev.data.sesiones_paquete} del paquete</p>}
                      {ev.data.observaciones && <p style={{ fontSize: 12, color: '#6E6E70', margin: 0, fontStyle: 'italic' }}>{ev.data.observaciones}</p>}
                    </div>
                  )}

                  {/* MÉDICO */}
                  {ev.tipo === 'medico' && (
                    <div>
                      {/* Signos vitales */}
                      {(ev.data.peso || ev.data.pa_sistolica || ev.data.fc) && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8, marginBottom: 12 }}>
                          {[['Peso', ev.data.peso, 'kg'], ['IMC', ev.data.bmi, ''], ['PA', ev.data.pa_sistolica && ev.data.pa_diastolica ? `${ev.data.pa_sistolica}/${ev.data.pa_diastolica}` : null, 'mmHg'], ['FC', ev.data.fc, 'lpm'], ['SpO2', ev.data.spo2, '%'], ['Temp', ev.data.temperatura, '°C']].filter(([,v]) => v).map(([l,v,u]) => (
                            <div key={l} style={{ background: 'white', borderRadius: 7, padding: '7px 10px', border: '1px solid #DDE3EA' }}>
                              <p style={{ fontSize: 9, color: '#4B647A', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>{l}</p>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#0B1F3B', margin: 0 }}>{v}<span style={{ fontSize: 9, color: '#6E6E70' }}> {u}</span></p>
                            </div>
                          ))}
                        </div>
                      )}
                      {ev.data.motivo_consulta && <p style={{ fontSize: 12, color: '#0B1F3B', marginBottom: 8 }}><strong>Motivo:</strong> {ev.data.motivo_consulta}</p>}
                      {ev.data.evolucion && <p style={{ fontSize: 12, color: '#0B1F3B', marginBottom: 8 }}><strong>Evolución:</strong> {ev.data.evolucion}</p>}
                      {ev.diags?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>Diagnósticos</p>
                          {ev.diags.map((d, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                              <span style={{ background: '#0B1F3B', color: 'white', padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{d.code}</span>
                              <span style={{ fontSize: 12, color: '#0B1F3B' }}>{d.desc}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {ev.meds?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>Medicamentos prescritos</p>
                          {ev.meds.map((m, i) => (
                            <div key={i} style={{ background: '#E8F5EE', borderRadius: 6, padding: '5px 10px', marginBottom: 4, borderLeft: '3px solid #1A7A4A' }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#0B1F3B', margin: '0 0 1px' }}>{m.nombre}</p>
                              <p style={{ fontSize: 11, color: '#4B647A', margin: 0 }}>{m.dosis} · {m.frecuencia} · {m.duracion}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {(ev.exLab?.length > 0 || ev.exImg?.length > 0) && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>Exámenes solicitados</p>
                          {ev.exLab?.length > 0 && <p style={{ fontSize: 11, color: '#0B1F3B', margin: '0 0 2px' }}>Lab: {ev.exLab.join(', ')}</p>}
                          {ev.exImg?.length > 0 && <p style={{ fontSize: 11, color: '#0B1F3B', margin: 0 }}>Imagen: {ev.exImg.join(', ')}</p>}
                        </div>
                      )}
                      {ev.data.indicaciones && <p style={{ fontSize: 12, color: '#0B1F3B', marginTop: 8 }}><strong>Indicaciones:</strong> {ev.data.indicaciones}</p>}
                      {ev.data.proxima_visita && <p style={{ fontSize: 12, color: '#1E7CB5', marginTop: 6, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="calendar-days" size={13} color="#1E7CB5" /> Próxima cita: {fmtDate(ev.data.proxima_visita)}</p>}
                    </div>
                  )}

                  {/* PLAN EJERCICIO */}
                  {ev.tipo === 'plan' && ev.data.plan_ejercicios?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Ejercicios del plan</p>
                      {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(dia => {
                        const exs = ev.data.plan_ejercicios.filter(e => e.dia === dia);
                        if (!exs.length) return null;
                        return (
                          <div key={dia} style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#0B1F3B', margin: '0 0 4px' }}>{dia}</p>
                            {exs.map((e, i) => <p key={i} style={{ fontSize: 11, color: '#4B647A', margin: '0 0 2px' }}>· {e.series}×{e.repeticiones} {e.nota || ''}</p>)}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* NUTRICIÓN */}
                  {ev.tipo === 'nutricion' && (
                    <div>
                      {ev.data.kcal_objetivo && <p style={{ fontSize: 12, color: '#0B1F3B', margin: '0 0 6px' }}><strong>Calorías:</strong> {ev.data.kcal_objetivo} kcal/día</p>}
                      {ev.data.proteina_g && <p style={{ fontSize: 12, color: '#0B1F3B', margin: '0 0 4px' }}><strong>Proteína:</strong> {ev.data.proteina_g}g · <strong>Carbohidratos:</strong> {ev.data.carbohidratos_g}g · <strong>Grasas:</strong> {ev.data.grasas_g}g</p>}
                      {ev.data.plan_nutricional && <p style={{ fontSize: 12, color: '#0B1F3B', marginTop: 6 }}><strong>Plan:</strong> {ev.data.plan_nutricional}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── MODAL EDITAR CONSULTA ────────────────────────────────────────────────────
function ModalEditarConsulta({ paciente, consulta, usuario, onClose, onGuardado }) {
  const [motivoConsulta, setMotivoConsulta] = useState(consulta.motivo_consulta || '');
  const [evolucion, setEvolucion] = useState(consulta.evolucion || '');
  const [examenFisico, setExamenFisico] = useState(consulta.examen_fisico || '');
  const [peso, setPeso] = useState(consulta.peso || '');
  const [talla, setTalla] = useState(consulta.talla || '');
  const [paSis, setPaSis] = useState(consulta.pa_sistolica || '');
  const [paDia, setPaDia] = useState(consulta.pa_diastolica || '');
  const [fc, setFc] = useState(consulta.fc || '');
  const [fr, setFr] = useState(consulta.fr || '');
  const [spo2, setSpo2] = useState(consulta.spo2 || '');
  const [temperatura, setTemperatura] = useState(consulta.temperatura || '');
  const [diagnosticos, setDiagnosticos] = useState(consulta.diagnosticos ? JSON.parse(consulta.diagnosticos) : []);
  const [medicamentos, setMedicamentos] = useState(consulta.medicamentos ? JSON.parse(consulta.medicamentos) : []);
  const [examLab, setExamLab] = useState(consulta.examenes_lab ? JSON.parse(consulta.examenes_lab) : []);
  const [examImg, setExamImg] = useState(consulta.examenes_imagen ? JSON.parse(consulta.examenes_imagen) : []);
  const [indicaciones, setIndicaciones] = useState(consulta.indicaciones || '');
  const [proximaCita, setProximaCita] = useState(consulta.proxima_visita || '');
  const [notaSeguimiento, setNotaSeguimiento] = useState('');
  const [busquedaCie, setBusquedaCie] = useState('');
  const [cie10Results, setCie10Results] = useState([]);
  const [buscandoCie, setBuscandoCie] = useState(false);
  const [nuevoMed, setNuevoMed] = useState({ nombre: '', dosis: '', frecuencia: '', duracion: '', cantidad: '', indicaciones: '' });
  const [tab, setTab] = useState('resumen');
  const [guardando, setGuardando] = useState(false);

  const buscarCie10 = async (q) => {
    setBusquedaCie(q);
    if (!q || q.length < 2) { setCie10Results([]); return; }
    setBuscandoCie(true);
    const { data } = await supabase.from('cie10').select('codigo,descripcion,categoria').or(`codigo.ilike.${q}%,descripcion.ilike.%${q}%`).limit(12);
    setCie10Results(data || []);
    setBuscandoCie(false);
  };

  const addDiag = (d) => { if (!diagnosticos.find(x => x.code === d.code)) setDiagnosticos(p => [...p, d]); setBusquedaCie(''); setCie10Results([]); };
  const addMed = () => { if (!nuevoMed.nombre.trim()) return; setMedicamentos(p => [...p, { ...nuevoMed, id: Date.now() }]); setNuevoMed({ nombre: '', dosis: '', frecuencia: '', duracion: '', cantidad: '', indicaciones: '' }); };

  const guardar = async () => {
    setGuardando(true);
    const updates = {
      motivo_consulta: motivoConsulta || null,
      evolucion: (evolucion + (notaSeguimiento ? '\n\n[Nota de seguimiento ' + new Date().toLocaleDateString('es-EC') + '] ' + notaSeguimiento : '')) || null,
      examen_fisico: examenFisico || null,
      peso: peso ? parseFloat(peso) : null,
      talla: talla ? parseFloat(talla) : null,
      bmi: peso && talla ? parseFloat((parseFloat(peso) / ((parseFloat(talla)/100)**2)).toFixed(1)) : null,
      pa_sistolica: paSis ? parseInt(paSis) : null,
      pa_diastolica: paDia ? parseInt(paDia) : null,
      fc: fc ? parseInt(fc) : null,
      fr: fr ? parseInt(fr) : null,
      spo2: spo2 ? parseFloat(spo2) : null,
      temperatura: temperatura ? parseFloat(temperatura) : null,
      diagnosticos: JSON.stringify(diagnosticos),
      medicamentos: JSON.stringify(medicamentos),
      examenes_lab: JSON.stringify(examLab),
      examenes_imagen: JSON.stringify(examImg),
      indicaciones: indicaciones || null,
      proxima_visita: proximaCita || null,
    };
    Object.keys(updates).forEach(k => { if (updates[k] === undefined) delete updates[k]; });
    const { error } = await supabase.from('consultas_medicas').update(updates).eq('id', consulta.id);
    if (!error) onGuardado();
    else console.error(error);
    setGuardando(false);
  };

  const tabs = [
    { key: 'resumen', label: 'Motivo/Evolución' },
    { key: 'signos', label: 'Signos vitales' },
    { key: 'diagnosticos', label: 'Diagnósticos' },
    { key: 'medicamentos', label: 'Medicamentos' },
    { key: 'indicaciones', label: 'Indicaciones' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.85)', display: 'flex', alignItems: 'stretch', zIndex: 1000 }}>
      <div style={{ background: B.grayLt, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: B.blue, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>Editar Consulta Médica</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>{paciente.nombre} {paciente.apellido} · {consulta.fecha}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '8px 20px', background: B.green, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', borderRadius: 6, padding: '4px 10px' }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: B.white, borderBottom: `2px solid ${B.grayMd}`, display: 'flex', paddingLeft: 20, flexShrink: 0, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '10px 16px', border: 'none', background: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: tab === t.key ? B.blue : B.gray, borderBottom: tab === t.key ? `3px solid ${B.blue}` : '3px solid transparent', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', maxWidth: 800, margin: '0 auto', width: '100%' }}>

          {tab === 'resumen' && (
            <div>
              <CTextArea label="Motivo de consulta" value={motivoConsulta} onChange={setMotivoConsulta} rows={3} />
              <CTextArea label="Evolución" value={evolucion} onChange={setEvolucion} rows={4} />
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '14px 16px', marginTop: 8 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  ➕ Agregar nota de seguimiento
                </label>
                <textarea value={notaSeguimiento} onChange={e => setNotaSeguimiento(e.target.value)} rows={3}
                  placeholder="Escribe una nota de seguimiento que se añadirá al registro de evolución..."
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }} />
              </div>
              <CTextArea label="Examen físico" value={examenFisico} onChange={setExamenFisico} rows={4} />
            </div>
          )}

          {tab === 'signos' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
                {[['Peso (kg)', peso, setPeso], ['Talla (cm)', talla, setTalla], ['PA sistólica', paSis, setPaSis], ['PA diastólica', paDia, setPaDia], ['FC (lpm)', fc, setFc], ['FR (rpm)', fr, setFr], ['SpO2 (%)', spo2, setSpo2], ['Temperatura (°C)', temperatura, setTemperatura]].map(([l, v, s]) => (
                  <div key={l} style={{ flex: '0 0 48%', marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{l}</label>
                    <input type="number" value={v} onChange={e => s(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: `1px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'diagnosticos' && (
            <div>
              {diagnosticos.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', background: B.white, borderRadius: 8, padding: '10px 14px', marginBottom: 6, border: `1px solid ${B.grayMd}`, borderLeft: `4px solid ${B.teal}` }}>
                  <span style={{ background: B.navy, color: 'white', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{d.code}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{d.desc}</span>
                  <button onClick={() => setDiagnosticos(p => p.filter((_, j) => j !== i))}
                    style={{ background: B.red + '22', color: B.red, border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                </div>
              ))}
              <input value={busquedaCie} onChange={e => buscarCie10(e.target.value)} placeholder="Buscar CIE-10..."
                style={{ width: '100%', padding: '10px 14px', border: `1px solid ${B.grayMd}`, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginTop: 10, fontFamily: 'inherit' }} />
              {buscandoCie && <p style={{ fontSize: 11, color: B.teal, margin: '6px 0' }}>Buscando...</p>}
              {busquedaCie && !buscandoCie && (
                <div style={{ background: B.white, borderRadius: 8, border: `1px solid ${B.grayMd}`, maxHeight: 250, overflowY: 'auto', marginTop: 4 }}>
                  {cie10Results.length === 0 ? (
                    <div style={{ padding: '10px 14px' }}>
                      <p style={{ fontSize: 12, color: B.gray, margin: '0 0 6px' }}>No encontrado.</p>
                      <button onClick={() => addDiag({ code: busquedaCie.toUpperCase(), desc: busquedaCie })}
                        style={{ padding: '5px 12px', background: B.teal, color: 'white', border: 'none', borderRadius: 5, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>+ Agregar manualmente</button>
                    </div>
                  ) : cie10Results.map((d, i) => (
                    <div key={i} onClick={() => addDiag({ code: d.codigo, desc: d.descripcion })}
                      style={{ display: 'flex', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${B.grayLt}` }}
                      onMouseEnter={e => e.currentTarget.style.background = B.grayLt}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <span style={{ background: B.navy, color: 'white', padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{d.codigo}</span>
                      <span style={{ fontSize: 12 }}>{d.descripcion}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'medicamentos' && (
            <div>
              {medicamentos.map((m, i) => (
                <div key={m.id || i} style={{ background: B.white, borderRadius: 8, border: `1px solid ${B.grayMd}`, padding: '10px 14px', marginBottom: 8, borderLeft: `4px solid ${B.green}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: B.navy, margin: '0 0 3px' }}>{m.nombre}</p>
                    <p style={{ fontSize: 11, color: B.teal, margin: 0 }}>{m.dosis} · {m.frecuencia} · {m.duracion}</p>
                  </div>
                  <button onClick={() => setMedicamentos(p => p.filter((_, j) => j !== i))}
                    style={{ background: B.red + '22', color: B.red, border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                </div>
              ))}
              <div style={{ background: B.white, borderRadius: 8, border: `1px solid ${B.grayMd}`, padding: '14px 16px', marginTop: 10 }}>
                <p style={{ fontWeight: 600, fontSize: 11, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>+ Agregar medicamento</p>
                {[['Nombre *', 'nombre', '100%'], ['Dosis', 'dosis', '48%'], ['Frecuencia', 'frecuencia', '48%'], ['Duración', 'duracion', '48%'], ['Indicaciones', 'indicaciones', '48%']].map(([l, k, w]) => (
                  <div key={k} style={{ flex: `0 0 ${w}`, marginBottom: 10, display: 'inline-block', width: w, paddingRight: w === '48%' ? '2%' : 0, boxSizing: 'border-box' }}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: B.teal, textTransform: 'uppercase', marginBottom: 3 }}>{l}</label>
                    <input value={nuevoMed[k]} onChange={e => setNuevoMed(p => ({ ...p, [k]: e.target.value }))} placeholder={l}
                      style={{ width: '100%', padding: '7px 9px', border: `1px solid ${B.grayMd}`, borderRadius: 5, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button onClick={addMed} style={{ padding: '7px 18px', background: B.green, color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>+ Agregar</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'indicaciones' && (
            <div>
              <CTextArea label="Indicaciones y recomendaciones" value={indicaciones} onChange={setIndicaciones} rows={6} />
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Próxima cita</label>
                <input type="date" value={proximaCita} onChange={e => setProximaCita(e.target.value)}
                  style={{ padding: '8px 10px', border: `1px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={guardar} disabled={guardando}
                  style={{ padding: '10px 28px', background: guardando ? '#9AA5B1' : B.teal, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GENERADORES DE DOCUMENTOS IMPRIMIBLES ────────────────────────────────────
const LOGO_HTML = `<img src="data:image/png;base64,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" alt="IMC — Instituto Metabólico Corporal" style="height:46px;width:auto;display:block;">`;

const BASE_DOC_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Poppins','Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:20px;color:#0B1F3B;}
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
    ${consulta.proxima_visita ? `<p style="font-size:12px;color:#1E7CB5;font-weight:600;">Próxima cita: ${fmtDate(consulta.proxima_visita)}</p>` : ''}
  </div>
  ${docFooter(consulta.medico_nombre)}
  </div><button class="print-btn" onclick="window.print()">Imprimir</button></body></html>`;
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
  const logoSrc = 'data:image/png;base64,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';

  const numeroALetras = c => {
    const n = Math.min(99, parseInt(c) || 1);
    const u = ['CERO','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISEIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE'];
    if (n <= 20) return u[n];
    const dec = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
    const d = Math.floor(n / 10), r = n % 10;
    if (n < 30) return r ? 'VEINTI' + u[r] : 'VEINTE';
    return r ? dec[d] + ' Y ' + u[r] : dec[d];
  };
  const cantidadNum = m => Math.min(99, parseInt(m.cantidad) || 1);
  const posologia = m => [m.dosis, m.frecuencia, m.duracion].filter(Boolean).join(', ').toUpperCase();

  const datosPaciente = `
    <div style="background:#F4F6F8;border-radius:10px;padding:10px 14px;margin-bottom:10px;display:grid;grid-template-columns:1.5fr 1fr;gap:3px 14px;">
      <div style="font-size:10.5px;color:#0B1F3B;"><strong>Paciente:</strong> ${paciente.apellido?.toUpperCase()} ${paciente.nombre?.toUpperCase()}</div>
      <div style="font-size:10.5px;color:#0B1F3B;"><strong>Código:</strong> ${codigo}</div>
      <div style="font-size:10.5px;color:#0B1F3B;"><strong>Cédula:</strong> ${paciente.cedula || '—'}</div>
      <div style="font-size:10.5px;color:#0B1F3B;"><strong>Fecha:</strong> Quito ${fmtV(fechaConsulta)}</div>
      <div style="font-size:10.5px;color:#0B1F3B;"><strong>Edad:</strong> ${age} año(s)</div>
      <div style="font-size:10.5px;color:#0B1F3B;"><strong>Válida hasta:</strong> ${fmtV(validaHasta)}</div>
    </div>
    ${diags.length > 0 ? `<div style="font-size:10.5px;margin-bottom:12px;padding:7px 12px;border-left:3px solid #C9A86A;background:#FBF7F0;border-radius:0 8px 8px 0;color:#0B1F3B;"><strong>Diagnóstico:</strong> ${diags.map(d => d.code + ' ' + d.desc).join(' - ')}</div>` : ''}`;

  const observaciones = `
    <div style="border-top:1px solid #DDE3EA;padding-top:8px;margin-top:6px;">
      <div style="font-size:9.5px;font-weight:800;letter-spacing:1.5px;color:#4B647A;margin-bottom:5px;">OBSERVACIONES</div>
      <div style="font-size:10.5px;margin-bottom:3px;color:#0B1F3B;"><strong>Recomendaciones:</strong> ${consulta.indicaciones || ''}</div>
      <div style="font-size:10.5px;margin-bottom:3px;color:#0B1F3B;"><strong>Signos de alarma:</strong></div>
      <div style="font-size:10.5px;margin-bottom:6px;color:#0B1F3B;"><strong>Alergias:</strong> ${paciente.alergias || ''}</div>
      <div style="font-size:10.5px;margin-bottom:8px;color:#0B1F3B;"><strong>Próxima cita:</strong> ${consulta.proxima_visita ? fmtV(new Date(consulta.proxima_visita + 'T12:00:00')) : ''}</div>
    </div>`;

  const nombreMedico = (() => {
    const n = consulta.medico_nombre || 'Diego Alejandro Díaz Salcedo';
    return /^dr\.?\s/i.test(n) ? n : 'Dr. ' + n;
  })();

  const firma = `
    <div style="text-align:center;margin-top:auto;padding-top:34px;">
      <div style="width:210px;border-top:1px solid #0B1F3B;margin:0 auto 6px;"></div>
      <div style="font-size:11px;font-weight:800;color:#0B1F3B;">${nombreMedico}</div>
      <div style="font-size:9.5px;color:#4B647A;">Cirugía General y Laparoscópica</div>
      <div style="font-size:9.5px;color:#4B647A;">Registro Profesional: 1804536876 · Contacto: 0984075703</div>
    </div>`;

  const observacionesFirma = `${observaciones}${firma}`;

  const tituloSeccion = txt => `
    <div style="text-align:center;margin-bottom:10px;">
      <div style="font-weight:800;font-size:13px;letter-spacing:3px;color:#0B1F3B;">${txt}</div>
      <div style="width:56px;height:3px;background:#C9A86A;border-radius:2px;margin:4px auto 0;"></div>
    </div>`;

  const recetaIzq = `${datosPaciente}
    ${tituloSeccion('RECETA')}
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <thead><tr>
        <th style="text-align:left;padding:6px 10px;font-size:9.5px;letter-spacing:1.5px;background:#0B1F3B;color:white;border-radius:7px 0 0 7px;">MEDICAMENTOS</th>
        <th style="text-align:center;padding:6px 10px;font-size:9.5px;letter-spacing:1.5px;background:#0B1F3B;color:white;width:90px;border-radius:0 7px 7px 0;">CANTIDAD</th>
      </tr></thead>
      <tbody>
        ${medicamentos.map((m, i) => `
          <tr style="background:${i % 2 === 0 ? 'white' : '#F4F6F8'};">
            <td style="padding:8px 10px;font-size:11px;vertical-align:top;color:#0B1F3B;">
              ${i+1}. <strong>${m.nombre}</strong><br>
              <span style="font-size:10px;color:#4B647A;">${posologia(m)}</span>
            </td>
            <td style="padding:8px 10px;font-size:11px;text-align:center;vertical-align:top;font-weight:700;color:#0B1F3B;"># ${cantidadNum(m)}<br><span style="font-weight:400;font-size:9.5px;color:#6E6E70;">(${numeroALetras(m.cantidad)})</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${firma}`;

  const instruccion = m => [m.dosis, m.frecuencia, m.duracion ? 'POR ' + m.duracion : ''].filter(Boolean).join(' ').toUpperCase();

  const recetaDer = `${datosPaciente}
    ${tituloSeccion('INDICACIONES')}
    ${medicamentos.map((m, i) => `
      <div style="margin-bottom:8px;font-size:11px;line-height:1.6;padding:8px 12px;background:${i % 2 === 0 ? '#F4F6F8' : 'white'};border-radius:8px;color:#0B1F3B;">
        ${i+1}. <strong>${m.nombre}</strong> — # ${cantidadNum(m)} (${numeroALetras(m.cantidad)}) ${instruccion(m)}${m.indicaciones ? '. ' + m.indicaciones.toUpperCase() : ''}
      </div>
    `).join('')}
    ${observacionesFirma}`;

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Receta MSP — ${paciente.nombre}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Poppins','Segoe UI',Arial,sans-serif;background:white;padding:10px;}
    .page{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:1050px;margin:0 auto;}
    @page{size:A4 landscape;margin:5mm;}
    @media print{.page{max-width:100%;gap:12px;}.copy{min-height:198mm;}}
    .copy{border:1px solid #DDE3EA;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;}
    .copy-body{padding:14px 16px;display:flex;flex-direction:column;flex:1;}
    .header{display:flex;justify-content:space-between;align-items:center;background:#0B1F3B;padding:12px 16px;gap:12px;}
    .header-info{font-size:9.5px;color:rgba(255,255,255,0.92);line-height:1.55;}
    .print-btn{position:fixed;bottom:20px;right:20px;background:#0B1F3B;color:white;border:none;padding:10px 22px;border-radius:25px;font-family:inherit;font-weight:700;font-size:13px;cursor:pointer;}
    @media print{body{padding:0;}.print-btn{display:none;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}
  </style></head><body>
  <div class="page">
    <div class="copy">
      <div class="header">
        <img src="${logoSrc}" alt="IMC — Instituto Metabólico Corporal" style="height:54px;width:auto;display:block;">
        <div class="header-info" style="text-align:right;">
          Av. Mariana de Jesús OE702 y Nuño de Valderrama,<br>
          Edificio Citimed, 3er Piso, Consultorio 301.<br>
          <strong style="color:#C9A86A;">Correo:</strong> imc_info@institutometabolicoec.com<br>
          <strong style="color:#C9A86A;">Telef.:</strong> 0992552205 - 025100835
        </div>
      </div>
      <div class="copy-body">${recetaIzq}</div>
    </div>
    <div class="copy">
      <div class="header">
        <img src="${logoSrc}" alt="IMC — Instituto Metabólico Corporal" style="height:54px;width:auto;display:block;">
        <div class="header-info" style="text-align:right;">
          Av. Mariana de Jesús OE702 y Nuño de Valderrama,<br>
          Edificio Citimed, 3er Piso, Consultorio 301.<br>
          <strong style="color:#C9A86A;">Correo:</strong> imc_info@institutometabolicoec.com<br>
          <strong style="color:#C9A86A;">Telef.:</strong> 0992552205 - 025100835
        </div>
      </div>
      <div class="copy-body">${recetaDer}</div>
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">Imprimir receta</button>
  </body></html>`;
  abrirDoc(html);
}

export function imprimirExamenes(paciente, consulta, examLab, examImg) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Solicitud Exámenes — ${paciente.nombre}</title>
  <style>${BASE_DOC_STYLE}
    .exam-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F4F6F8;font-size:13px;}
    .check{width:14px;height:14px;border:1px solid #DDE3EA;border-radius:3px;flex-shrink:0;}
    .group-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1E7CB5;margin:12px 0 6px;padding-bottom:4px;border-bottom:1px solid #1E7CB5;}
  </style></head><body><div class="page">
  ${docHeader('Solicitud de Exámenes', paciente, consulta.fecha, consulta.medico_nombre)}
  <div class="body">
    <p style="font-size:12px;color:#6E6E70;margin-bottom:16px;">Por favor realizar los siguientes exámenes al paciente indicado:</p>
    ${examLab.length > 0 ? `
      <div class="section">
        <div class="section-title">Exámenes de Laboratorio</div>
        ${examLab.map(e => `<div class="exam-item"><div class="check"></div>${e}</div>`).join('')}
      </div>` : ''}
    ${examImg.length > 0 ? `
      <div class="section" style="margin-top:16px;">
        <div class="section-title">Exámenes de Imagen</div>
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
  </div><button class="print-btn" onclick="window.print()">Imprimir solicitud</button></body></html>`;
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
