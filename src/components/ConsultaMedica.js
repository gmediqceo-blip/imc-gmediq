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
  // Medicamentos
  const [medicamentos, setMedicamentos] = useState([]);
  const [nuevoMed, setNuevoMed] = useState({ nombre: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
  // Exámenes
  const [examLab, setExamLab] = useState([]);
  const [examImg, setExamImg] = useState([]);
  const [tabExamen, setTabExamen] = useState('lab');
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

  const cie10Filtrados = CIE10_IMC.filter(d =>
    d.code.toLowerCase().includes(busquedaCie.toLowerCase()) ||
    d.desc.toLowerCase().includes(busquedaCie.toLowerCase())
  ).slice(0, 15);

  const addDiagnostico = (d) => {
    if (!diagnosticos.find(x => x.code === d.code)) {
      setDiagnosticos(p => [...p, d]);
    }
    setBusquedaCie('');
  };

  const removeDiagnostico = (code) => setDiagnosticos(p => p.filter(d => d.code !== code));

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
      examenes_lab: JSON.stringify(examLab),
      examenes_imagen: JSON.stringify(examImg),
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
                <input value={busquedaCie} onChange={e => setBusquedaCie(e.target.value)}
                  placeholder="Ej: E66 u 'obesidad' o 'diabetes'..."
                  style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${B.grayMd}`, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit' }} />
                {busquedaCie && (
                  <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
                    {cie10Filtrados.length === 0 ? (
                      <div style={{ padding: '12px 14px' }}>
                        <p style={{ fontSize: 12, color: B.gray, margin: '0 0 8px' }}>No encontrado en la lista. ¿Agregar manualmente?</p>
                        <button onClick={() => { addDiagnostico({ code: busquedaCie.toUpperCase(), desc: 'Diagnóstico personalizado' }); }}
                          style={{ padding: '6px 14px', background: B.teal, color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                          + Agregar "{busquedaCie}"
                        </button>
                      </div>
                    ) : cie10Filtrados.map((d, i) => (
                      <div key={i} onClick={() => addDiagnostico(d)}
                        style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${B.grayLt}`, background: diagnosticos.find(x => x.code === d.code) ? B.teal + '11' : 'white' }}
                        onMouseEnter={e => e.currentTarget.style.background = B.grayLt}
                        onMouseLeave={e => e.currentTarget.style.background = diagnosticos.find(x => x.code === d.code) ? B.teal + '11' : 'white'}>
                        <span style={{ background: B.navy, color: 'white', padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{d.code}</span>
                        <span style={{ fontSize: 13, color: B.navy }}>{d.desc}</span>
                        {diagnosticos.find(x => x.code === d.code) && <span style={{ marginLeft: 'auto', color: B.teal, fontSize: 12 }}>✓</span>}
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

// ─── GENERADORES DE DOCUMENTOS IMPRIMIBLES ────────────────────────────────────
const LOGO_HTML = `<div style="display:inline-flex;align-items:center;background:white;border-radius:6px;padding:4px 12px;">
  <svg width="150" height="44" viewBox="0 0 220 80" fill="none">
    <circle cx="28" cy="10" r="8" fill="#1E7CB5"/>
    <path d="M28 18 C22 25 14 27 11 35 C8 42 13 50 19 47 C25 44 27 38 32 34 C37 30 43 34 41 42" stroke="#1E7CB5" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    <path d="M28 18 C33 21 40 20 43 25 C46 30 41 36 36 33" stroke="#1E7CB5" stroke-width="5" stroke-linecap="round" fill="none"/>
    <text x="52" y="46" font-family="Arial Black,Arial" font-weight="900" font-size="44" fill="#0B1F3B">IMC</text>
    <text x="52" y="63" font-family="Arial" font-weight="700" font-size="9" fill="#4B647A" letter-spacing="1">INSTITUTO METABÓLICO CORPORAL</text>
    <text x="52" y="74" font-family="Arial" font-size="8" fill="#9AA5B1">by GMEDiQ</text>
  </svg>
</div>`;

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
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Receta — ${paciente.nombre}</title>
  <style>${BASE_DOC_STYLE}
    .rx{font-size:48px;font-weight:900;color:#1E7CB5;font-style:italic;margin-bottom:4px;}
    .med{border:1px solid #DDE3EA;border-radius:8px;padding:12px 14px;margin-bottom:10px;border-left:4px solid #1A7A4A;}
    .med-nombre{font-size:15px;font-weight:700;color:#0B1F3B;margin-bottom:4px;}
    .med-detalle{font-size:12px;color:#4B647A;}
  </style></head><body><div class="page">
  ${docHeader('Receta Médica', paciente, consulta.fecha, consulta.medico_nombre)}
  <div class="body">
    <div class="rx">Rx</div>
    <p style="font-size:11px;color:#6E6E70;margin-bottom:20px;">Fecha: ${fmtDate(consulta.fecha)}</p>
    ${medicamentos.map((m, i) => `
      <div class="med">
        <div class="med-nombre">${i + 1}. ${m.nombre}</div>
        <div class="med-detalle">
          ${m.dosis ? `<strong>Dosis:</strong> ${m.dosis} &nbsp;` : ''}
          ${m.frecuencia ? `<strong>Frecuencia:</strong> ${m.frecuencia} &nbsp;` : ''}
          ${m.duracion ? `<strong>Duración:</strong> ${m.duracion}` : ''}
        </div>
        ${m.indicaciones ? `<div class="med-detalle" style="margin-top:3px;font-style:italic;">${m.indicaciones}</div>` : ''}
      </div>`).join('')}
    <div style="margin-top:24px;padding:14px;background:#F4F6F8;border-radius:8px;font-size:11px;color:#6E6E70;">
      <strong style="color:#0B1F3B;">Indicaciones generales:</strong> Seguir el tratamiento según lo indicado. En caso de reacción adversa, suspender y consultar de inmediato.
    </div>
  </div>
  ${docFooter(consulta.medico_nombre)}
  </div><button class="print-btn" onclick="window.print()">🖨 Imprimir receta</button></body></html>`;
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
