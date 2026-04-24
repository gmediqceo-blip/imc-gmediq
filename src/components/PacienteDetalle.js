import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PlanEjercicio from './PlanEjercicio';
import { BotonesDocumentos } from './Documentos';
import { Field, TextArea, SectionTitle, FieldRow } from './FormFields';
import BancoArchivos from './BancoArchivos';
import ConsultaMedica, { HistorialUnificado } from './ConsultaMedica';
import Parametros from './Parametros';
import SugerenciasIA from './SugerenciasIA';

const B = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020', orange: '#C25A00' };

const calcAge = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const planLabels = { starter: 'Starter $80', standard: 'Standard $250/mes', imc360: 'IMC 360 $400/mes' };
const grupoLabels = { transformacion: 'Transformación', prequirurgico: 'Pre-quirúrgico', postquirurgico: 'Post-quirúrgico' };
const grupoColors = { transformacion: B.blue, prequirurgico: B.orange, postquirurgico: B.green };

export default function PacienteDetalle({ paciente, onVolver, usuario }) {
  const [tab, setTab] = useState('resumen');
  const [valoraciones, setValoraciones] = useState([]);
  const [consultasMed, setConsultasMed] = useState([]);
  const [consultasNut, setConsultasNut] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ejercicios, setEjercicios] = useState([]);

  const age = calcAge(paciente.fecha_nacimiento);

  useEffect(() => {
    fetchTodo();
  }, [paciente.id]);

  const fetchTodo = async () => {
    const [v, m, n, pl, ej] = await Promise.all([
      supabase.from('valoraciones').select('*').eq('paciente_id', paciente.id).order('fecha', { ascending: false }),
      supabase.from('consultas_medicas').select('*').eq('paciente_id', paciente.id).order('fecha', { ascending: false }),
      supabase.from('consultas_nutricion').select('*').eq('paciente_id', paciente.id).order('fecha', { ascending: false }),
      supabase.from('planes_ejercicio').select('*, plan_ejercicios(*)').eq('paciente_id', paciente.id).order('fecha', { ascending: false }),
      supabase.from('ejercicios').select('*').eq('activo', true).order('categoria').order('nombre'),
    ]);
    setValoraciones(v.data || []);
    setConsultasMed(m.data || []);
    setConsultasNut(n.data || []);
    setPlanes(pl.data || []);
    setEjercicios(ej.data || []);
    setLoading(false);
  };

  const lastV = valoraciones[0];

  const tabs = [
    { key: 'resumen', label: '📋 Resumen' },
    { key: 'historial', label: '📅 Historial' },
    { key: 'parametros', label: '📈 Parámetros' },
    { key: 'fisioterapia', label: '🏃 Fisioterapia' },
    { key: 'medico', label: '🩺 Médico' },
    { key: 'nutricion', label: '🥗 Nutrición' },
    { key: 'ejercicio', label: '🏋️ Plan ejercicio' },
    { key: 'archivos', label: '📁 Archivos' },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", minHeight: '100vh', background: B.grayLt }}>
      {/* Header paciente */}
      <div style={{ background: B.navy, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVolver} style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: B.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
          {paciente.nombre?.charAt(0)?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 17, margin: '0 0 3px' }}>{paciente.nombre} {paciente.apellido}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {paciente.historia_clinica && <span style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>📋 {paciente.historia_clinica}</span>}
            {paciente.cedula && <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '2px 10px', borderRadius: 20, fontSize: 11 }}>🪪 {paciente.cedula}</span>}
            <span style={{ background: (grupoColors[paciente.grupo] || B.blue) + '44', color: 'white', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{grupoLabels[paciente.grupo]}</span>
            {age > 0 && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{age} años</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: B.white, borderBottom: `2px solid ${B.grayMd}`, display: 'flex', paddingLeft: 20, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '12px 18px', border: 'none', background: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: tab === t.key ? B.blue : B.gray, borderBottom: tab === t.key ? `3px solid ${B.blue}` : '3px solid transparent', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', maxWidth: 960, margin: '0 auto' }}>

        {/* RESUMEN */}
        {tab === 'resumen' && (
          <div>
            {/* Documentos */}
            <BotonesDocumentos
              paciente={paciente}
              valoracion={valoraciones[0] || null}
              plan={planes[0] || null}
              planEjercicios={planes[0]?.plan_ejercicios || []}
              ejercicios={ejercicios}
            />

            {/* Stats rápidos */}
            {lastV && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Última valoración — {fmtDate(lastV.fecha)}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
                  {[['Peso', lastV.peso, 'kg', B.blue], ['% Grasa', lastV.pct_grasa, '%', B.orange], ['Músculo', lastV.masa_muscular, 'kg', B.green], ['IMC', lastV.bmi, '', B.navy], ['VO2max', lastV.vo2max, 'ml/kg/min', B.teal], ['Sit & Stand', lastV.sit_stand, 'reps', B.orange]].map(([l, v, u, c]) => (
                    <div key={l} style={{ background: B.white, border: `1.5px solid ${B.grayMd}`, borderRadius: 10, padding: '12px 14px', borderTop: `3px solid ${c}` }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>{l}</p>
                      <p style={{ fontSize: 22, fontWeight: 800, color: c, margin: 0 }}>{v || '—'}<span style={{ fontSize: 10, fontWeight: 400, color: B.gray }}>{v ? ' ' + u : ''}</span></p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Info del paciente */}
            <div style={{ background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}`, padding: '18px 20px', marginBottom: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 12, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px' }}>Información del paciente</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                {[
                  ['Plan IMC', planLabels[paciente.plan]],
                  ['Diagnóstico', paciente.diagnostico_principal],
                  ['Cirugía', paciente.cirugia],
                  ['Fecha cirugía', fmtDate(paciente.fecha_cirugia)],
                  ['Médico tratante', paciente.medico_tratante],
                  ['Teléfono', paciente.telefono],
                  ['Email', paciente.email],
                  ['Ocupación', paciente.ocupacion],
                  ['Antecedentes personales', paciente.antecedentes_personales],
                  ['Antecedentes familiares', paciente.antecedentes_familiares],
                  ['Alergias', paciente.alergias],
                  ['Medicamentos', paciente.medicamentos_actuales],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 2px' }}>{k}</p>
                    <p style={{ fontSize: 13, color: B.navy, margin: 0 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen de sesiones */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { label: 'Valoraciones', count: valoraciones.length, last: valoraciones[0]?.fecha, color: B.blue, icon: '📋' },
                { label: 'Consultas médicas', count: consultasMed.length, last: consultasMed[0]?.fecha, color: B.teal, icon: '🩺' },
                { label: 'Consultas nutrición', count: consultasNut.length, last: consultasNut[0]?.fecha, color: B.green, icon: '🥗' },
              ].map(m => (
                <div key={m.label} style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, padding: '14px 16px', borderTop: `3px solid ${m.color}` }}>
                  <p style={{ fontSize: 20, margin: '0 0 6px' }}>{m.icon}</p>
                  <p style={{ fontWeight: 700, fontSize: 13, color: B.navy, margin: '0 0 3px' }}>{m.label}</p>
                  <p style={{ fontSize: 11, color: B.gray, margin: 0 }}>{m.count} sesión{m.count !== 1 ? 'es' : ''}{m.last ? ` · ${fmtDate(m.last)}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {tab === 'historial' && (
          <HistorialUnificado
            valoraciones={valoraciones}
            consultasMed={consultasMed}
            consultasNut={consultasNut}
            planes={planes}
          />
        )}

        {/* PARÁMETROS */}
        {tab === 'parametros' && (
          <Parametros valoraciones={valoraciones} consultasMed={consultasMed} paciente={paciente} />
        )}

        {/* FISIOTERAPIA */}
        {tab === 'fisioterapia' && (
          <TabFisioterapia paciente={paciente} valoraciones={valoraciones} planes={planes} onActualizar={fetchTodo} usuario={usuario} />
        )}

        {/* MÉDICO */}
        {tab === 'medico' && (
          <ConsultaMedica
            paciente={paciente}
            consultas={consultasMed}
            onActualizar={fetchTodo}
            usuario={usuario}
          />
        )}

        {/* NUTRICIÓN */}
        {tab === 'nutricion' && (
          <TabNutricion paciente={paciente} consultas={consultasNut} onActualizar={fetchTodo} usuario={usuario} />
        )}

        {/* EJERCICIO */}
        {tab === 'ejercicio' && (
          <PlanEjercicio
            paciente={paciente}
            planes={planes}
            valoraciones={valoraciones}
            onActualizar={fetchTodo}
            usuario={usuario}
          />
        )}

        {/* ARCHIVOS */}
        {tab === 'archivos' && (
          <BancoArchivos
            paciente={paciente}
            usuario={usuario}
          />
        )}
      </div>
    </div>
  );
}

// ── TAB FISIOTERAPIA ──────────────────────────────────────────────────────────
function TabFisioterapia({ paciente, valoraciones, planes, onActualizar, usuario }) {
  const [modalNueva, setModalNueva] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>{valoraciones.length} valoración{valoraciones.length !== 1 ? 'es' : ''}</p>
        <button onClick={() => setModalNueva(true)}
          style={{ padding: '9px 20px', background: B.blue, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Nueva valoración
        </button>
      </div>

      {valoraciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}` }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>📋</p>
          <p style={{ color: B.gray }}>No hay valoraciones registradas.</p>
        </div>
      ) : (
        valoraciones.map((v, i) => <ValoracionCard key={v.id} v={v} />)
      )}

      {/* IA Sugerencias */}
      {valoraciones.length > 0 && (
        <SugerenciasIA
          paciente={paciente}
          valoracion={valoraciones[0]}
          planes={planes || []}
        />
      )}

      {modalNueva && (
        <ModalValoracion
          paciente={paciente}
          usuario={usuario}
          onClose={() => setModalNueva(false)}
          onGuardado={() => { onActualizar(); setModalNueva(false); showToast('Valoración guardada ✓'); }}
        />
      )}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  );
}

function ValoracionCard({ v }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, marginBottom: 10, borderLeft: `4px solid ${B.blue}` }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '13px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 2px' }}>{fmtDate(v.fecha)}</p>
          <p style={{ fontSize: 11, color: B.gray, margin: 0 }}>{v.terapeuta_nombre || '—'} · Peso: {v.peso || '—'} kg · VO2max: {v.vo2max || '—'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: v.aptitud === 'apto' ? B.green + '22' : v.aptitud === 'apto_rest' ? B.orange + '22' : B.red + '22', color: v.aptitud === 'apto' ? B.green : v.aptitud === 'apto_rest' ? B.orange : B.red, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            {v.aptitud === 'apto' ? '✓ Apto' : v.aptitud === 'apto_rest' ? '⚠ Con restricciones' : '✗ No apto'}
          </span>
          <span style={{ color: B.blue, fontSize: 16 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${B.grayLt}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginTop: 12 }}>
            {[['Peso', v.peso, 'kg'], ['% Grasa', v.pct_grasa, '%'], ['Músculo', v.masa_muscular, 'kg'], ['IMC', v.bmi, ''], ['VO2max', v.vo2max, 'ml/kg/min'], ['FC reposo', v.fc_reposo, 'bpm'], ['SpO2', v.spo2, '%'], ['Cintura', v.cintura, 'cm'], ['Sit & Stand', v.sit_stand, 'reps'], ['Dina. D', v.dina_d, 'kg']].filter(([, val]) => val).map(([l, val, u]) => (
              <div key={l} style={{ background: B.grayLt, borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: B.teal, textTransform: 'uppercase', margin: '0 0 2px' }}>{l}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: B.navy, margin: 0 }}>{val} <span style={{ fontSize: 9, color: B.gray }}>{u}</span></p>
              </div>
            ))}
          </div>
          {v.zona2_lo && v.zona2_hi && (
            <div style={{ marginTop: 10, background: '#E8F5E9', borderRadius: 8, padding: '8px 12px', display: 'inline-block' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: B.green, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Zona 2 objetivo</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: B.green, fontFamily: 'monospace', margin: 0 }}>{v.zona2_lo} – {v.zona2_hi} bpm</p>
            </div>
          )}
          {v.diagnostico && <p style={{ fontSize: 12, color: B.navy, marginTop: 10 }}><strong>Diagnóstico:</strong> {v.diagnostico}</p>}
        </div>
      )}
    </div>
  );
}

// ── MODAL VALORACIÓN ──────────────────────────────────────────────────────────
function ModalValoracion({ paciente, usuario, onClose, onGuardado }) {
  const age = calcAge(paciente.fecha_nacimiento);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    terapeuta_nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : '',
    fc_reposo: '', pa_sistolica: '', pa_diastolica: '', spo2: '', fr: '',
    peso: '', talla: '', pct_grasa: '', masa_muscular: '', masa_grasa: '', agua_corporal: '',
    cintura: '', cadera: '', inbody_score_muscular: '', inbody_score_grasa: '',
    dina_d: '', dina_i: '', orm_superior: '', orm_inferior: '',
    sit_stand: '', borg: '', fc_pre: '', fc_post: '', spo2_pre: '', spo2_post: '',
    vo2max: '', vo2max_clasificacion: '',
    zona1_lo: '', zona1_hi: '', zona2_lo: '', zona2_hi: '', zona3_lo: '', zona3_hi: '',
    diagnostico: '', fortalezas: '', limitantes: '', aptitud: 'apto', notas: ''
  });
  const [guardando, setGuardando] = useState(false);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const bmi = form.peso && form.talla ? (parseFloat(form.peso) / ((parseFloat(form.talla) / 100) ** 2)).toFixed(1) : '';
  const fcmax = age > 0 ? 220 - age : '';
  const reserve = fcmax && form.fc_reposo ? fcmax - parseInt(form.fc_reposo) : '';
  const autoZona = (pctLow, pctHigh) => reserve && form.fc_reposo ? { lo: Math.round(reserve * pctLow / 100 + parseFloat(form.fc_reposo)), hi: Math.round(reserve * pctHigh / 100 + parseFloat(form.fc_reposo)) } : { lo: '', hi: '' };
  const z1 = autoZona(35, 47); const z2 = autoZona(48, 67); const z3 = autoZona(68, 74);

  const guardar = async () => {
    setGuardando(true);
    // Excluir nuevo_estado — es solo para actualizar pacientes, no va en valoraciones
    const { nuevo_estado, ...formData } = form;
    const data = {
      ...formData, paciente_id: paciente.id, terapeuta_id: usuario?.id,
      bmi: bmi || null, fc_max: fcmax || null, fc_reserva: reserve || null,
      zona1_lo: form.zona1_lo || z1.lo || null, zona1_hi: form.zona1_hi || z1.hi || null,
      zona2_lo: form.zona2_lo || z2.lo || null, zona2_hi: form.zona2_hi || z2.hi || null,
      zona3_lo: form.zona3_lo || z3.lo || null, zona3_hi: form.zona3_hi || z3.hi || null,
    };
    // Convert empty strings to null
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    const { error } = await supabase.from('valoraciones').insert([data]);
    if (!error) {
      // Update patient estado if changed
      if (form.nuevo_estado) {
        await supabase.from('pacientes').update({ grupo: form.nuevo_estado }).eq('id', paciente.id);
      }
      onGuardado();
    }
    setGuardando(false);
  };

  // Using shared Field, TextArea, SectionTitle from FormFields.js

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: B.white, borderRadius: 16, width: '100%', maxWidth: 740, maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ background: B.blue, padding: '16px 24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>Nueva Valoración — {paciente.nombre} {paciente.apellido}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={guardar} disabled={guardando} style={{ padding: '7px 18px', background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : 'Guardar ✓'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
        <div style={{ padding: '20px 28px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="Fecha" value={form.fecha} onChange={set('fecha')} type="date" half />
            <Field label="Terapeuta" value={form.terapeuta_nombre} onChange={set('terapeuta_nombre')} half />
          </div>
          <SectionTitle>Signos Vitales en Reposo</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="FC reposo (bpm)" value={form.fc_reposo} onChange={set('fc_reposo')} type="number" half hint="Normal: 60–100" />
            <Field label="SpO2 (%)" value={form.spo2} onChange={set('spo2')} type="number" half hint="Normal: ≥95%" />
            <Field label="PA sistólica (mmHg)" value={form.pa_sistolica} onChange={set('pa_sistolica')} type="number" half hint="Normal: <120" />
            <Field label="PA diastólica (mmHg)" value={form.pa_diastolica} onChange={set('pa_diastolica')} type="number" half hint="Normal: <80" />
          </div>
          <SectionTitle>Composición Corporal — InBody 270S</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="Peso (kg)" value={form.peso} onChange={set('peso')} type="number" half />
            <Field label="Talla (cm)" value={form.talla} onChange={set('talla')} type="number" half />
            <Field label="IMC (auto)" value={bmi} readOnly half hint={bmi ? `Calculado: ${bmi}` : 'Ingresa peso y talla'} />
            <Field label="% Grasa corporal" value={form.pct_grasa} onChange={set('pct_grasa')} type="number" half hint="H: 10–20% · M: 18–28%" />
            <Field label="Masa muscular (kg)" value={form.masa_muscular} onChange={set('masa_muscular')} type="number" half />
            <Field label="Masa grasa (kg)" value={form.masa_grasa} onChange={set('masa_grasa')} type="number" half />
            <Field label="Cintura (cm)" value={form.cintura} onChange={set('cintura')} type="number" half hint="Riesgo H>94 · M>80" />
            <Field label="Cadera (cm)" value={form.cadera} onChange={set('cadera')} type="number" half />
          </div>
          <SectionTitle>Dinamometría y Fuerza</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="Dinamometría derecha (kg)" value={form.dina_d} onChange={set('dina_d')} type="number" half hint="H: 35–55 · M: 20–35" />
            <Field label="Dinamometría izquierda (kg)" value={form.dina_i} onChange={set('dina_i')} type="number" half />
            <Field label="1RM tren superior (kg)" value={form.orm_superior} onChange={set('orm_superior')} type="number" half />
            <Field label="1RM tren inferior (kg)" value={form.orm_inferior} onChange={set('orm_inferior')} type="number" half />
          </div>
          <SectionTitle>Test Sit to Stand (1 minuto)</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="Repeticiones" value={form.sit_stand} onChange={set('sit_stand')} type="number" half hint="≥20 normal · <14 bajo" />
            <Field label="Borg post-test (0–10)" value={form.borg} onChange={set('borg')} type="number" half />
            <Field label="FC pre-test (bpm)" value={form.fc_pre} onChange={set('fc_pre')} type="number" half />
            <Field label="FC post-test (bpm)" value={form.fc_post} onChange={set('fc_post')} type="number" half />
            <Field label="SpO2 pre (%)" value={form.spo2_pre} onChange={set('spo2_pre')} type="number" half />
            <Field label="SpO2 post (%)" value={form.spo2_post} onChange={set('spo2_post')} type="number" half hint="No debe bajar >4%" />
          </div>
          <SectionTitle>VO2max y Zonas Cardíacas</SectionTitle>
          {form.fc_reposo && (
            <div style={{ background: '#E8F4FD', borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[['FC máx teórica', `${fcmax} bpm`], ['FC de reserva', `${reserve || '—'} bpm`], ['Zona 2 auto', `${z2.lo || '—'}–${z2.hi || '—'} bpm`]].map(([l, v]) => (
                <div key={l}><p style={{ fontSize: 9, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 2px' }}>{l}</p><p style={{ fontSize: 16, fontWeight: 700, color: B.navy, fontFamily: 'monospace', margin: 0 }}>{v}</p></div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="VO2max (ml/kg/min)" value={form.vo2max} onChange={set('vo2max')} type="number" half />
            <Field label="Clasificación VO2max" value={form.vo2max_clasificacion} onChange={set('vo2max_clasificacion')} opts={[{ v: '', l: '—' }, { v: 'muy_pobre', l: 'Muy pobre' }, { v: 'pobre', l: 'Pobre' }, { v: 'regular', l: 'Regular' }, { v: 'bueno', l: 'Bueno' }, { v: 'excelente', l: 'Excelente' }]} half />
            <Field label="Zona 1 — desde (bpm)" value={form.zona1_lo || String(z1.lo || '')} onChange={set('zona1_lo')} type="number" half />
            <Field label="Zona 1 — hasta (bpm)" value={form.zona1_hi || String(z1.hi || '')} onChange={set('zona1_hi')} type="number" half />
            <Field label="Zona 2 — desde (bpm)" value={form.zona2_lo || String(z2.lo || '')} onChange={set('zona2_lo')} type="number" half />
            <Field label="Zona 2 — hasta (bpm)" value={form.zona2_hi || String(z2.hi || '')} onChange={set('zona2_hi')} type="number" half />
            <Field label="Zona 3 — desde (bpm)" value={form.zona3_lo || String(z3.lo || '')} onChange={set('zona3_lo')} type="number" half />
            <Field label="Zona 3 — hasta (bpm)" value={form.zona3_hi || String(z3.hi || '')} onChange={set('zona3_hi')} type="number" half />
          </div>
          <SectionTitle>Diagnóstico y Aptitud</SectionTitle>
          <TextArea label="Diagnóstico fisioterapéutico" value={form.diagnostico} onChange={set('diagnostico')} rows={3} />
          <TextArea label="Fortalezas del paciente" value={form.fortalezas} onChange={set('fortalezas')} />
          <TextArea label="Limitantes y factores de riesgo" value={form.limitantes} onChange={set('limitantes')} />
          <div style={{ flex: '0 0 100%', marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Aptitud</label>
            <select value={form.aptitud} onChange={e => set('aptitud')(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none' }}>
              <option value="apto">✓ Apto — sin restricciones</option>
              <option value="apto_rest">⚠ Apto con restricciones</option>
              <option value="no_apto">✗ No apto — requiere evaluación médica</option>
            </select>
          </div>
          <div style={{ flex: '0 0 100%', marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Actualizar estado del paciente</label>
            <select value={form.nuevo_estado || ''} onChange={e => set('nuevo_estado')(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none' }}>
              <option value="">— Sin cambios —</option>
              <option value="transformacion">Transformación corporal</option>
              <option value="prequirurgico">Pre-quirúrgico</option>
              <option value="postquirurgico">Post-quirúrgico</option>
            </select>
          </div>
          <TextArea label="Notas adicionales" value={form.notas} onChange={set('notas')} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button onClick={onClose} style={{ padding: '9px 20px', background: 'transparent', color: B.gray, border: `2px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ padding: '9px 22px', background: guardando ? '#9AA5B1' : B.blue, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : 'Guardar valoración ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB MÉDICO ────────────────────────────────────────────────────────────────
function TabMedico({ paciente, consultas, onActualizar, usuario }) {
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>{consultas.length} consulta{consultas.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setModal(true)} style={{ padding: '9px 20px', background: B.teal, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nueva consulta</button>
      </div>
      {consultas.length === 0 ? <div style={{ textAlign: 'center', padding: 60, background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}` }}><p style={{ fontSize: 36 }}>🩺</p><p style={{ color: B.gray }}>No hay consultas médicas.</p></div>
        : consultas.map(c => (
          <div key={c.id} style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, padding: '14px 16px', marginBottom: 10, borderLeft: `4px solid ${B.teal}` }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 4px' }}>{fmtDate(c.fecha)}</p>
            <p style={{ fontSize: 12, color: B.gray, margin: '0 0 8px' }}>{c.medico_nombre || '—'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 6 }}>
              {[['Peso', c.peso, 'kg'], ['Glucosa', c.glucosa, 'mg/dL'], ['HbA1c', c.hba1c, '%'], ['PA', c.pa_sistolica && c.pa_diastolica ? `${c.pa_sistolica}/${c.pa_diastolica}` : null, 'mmHg']].filter(([, v]) => v).map(([l, v, u]) => (
                <div key={l} style={{ background: B.grayLt, borderRadius: 6, padding: '6px 8px' }}>
                  <p style={{ fontSize: 9, color: B.teal, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>{l}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: B.navy, margin: 0 }}>{v} <span style={{ fontSize: 9, color: B.gray }}>{u}</span></p>
                </div>
              ))}
            </div>
            {c.diagnostico && <p style={{ fontSize: 12, color: B.navy, marginTop: 8 }}><strong>Dx:</strong> {c.diagnostico}</p>}
          </div>
        ))}
      {modal && <ModalMedico paciente={paciente} usuario={usuario} onClose={() => setModal(false)} onGuardado={() => { onActualizar(); setModal(false); showToast('Consulta médica guardada ✓'); }} />}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  );
}

function ModalMedico({ paciente, usuario, onClose, onGuardado }) {
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], medico_nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : '', peso: '', bmi: '', cintura: '', pa_sistolica: '', pa_diastolica: '', fc: '', glucosa: '', hba1c: '', colesterol_total: '', colesterol_ldl: '', colesterol_hdl: '', trigliceridos: '', insulina: '', tsh: '', glp1: '', metformina: '', otros_medicamentos: '', diagnostico: '', plan_tratamiento: '', proxima_visita: '', notas: '' });
  const [guardando, setGuardando] = useState(false);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));
  const guardar = async () => {
    setGuardando(true);
    const data = { ...form, paciente_id: paciente.id, medico_id: usuario?.id };
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    const { error } = await supabase.from('consultas_medicas').insert([data]);
    if (!error) onGuardado();
    setGuardando(false);
  };
  // Using shared Field, TextArea, SectionTitle from FormFields.js
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: B.white, borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ background: B.teal, padding: '16px 24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>Consulta Médica — {paciente.nombre}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={guardar} disabled={guardando} style={{ padding: '7px 18px', background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{guardando ? 'Guardando...' : 'Guardar ✓'}</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
        <div style={{ padding: '20px 28px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="Fecha" value={form.fecha} onChange={set('fecha')} type="date" half />
            <Field label="Médico" value={form.medico_nombre} onChange={set('medico_nombre')} half />
          </div>
          <SectionTitle>Medidas</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="Peso (kg)" value={form.peso} onChange={set('peso')} type="number" half />
            <Field label="IMC" value={form.bmi} onChange={set('bmi')} type="number" half />
            <Field label="Cintura (cm)" value={form.cintura} onChange={set('cintura')} type="number" half />
            <Field label="PA sistólica" value={form.pa_sistolica} onChange={set('pa_sistolica')} type="number" half hint="Normal: <120" />
            <Field label="PA diastólica" value={form.pa_diastolica} onChange={set('pa_diastolica')} type="number" half hint="Normal: <80" />
            <Field label="FC (bpm)" value={form.fc} onChange={set('fc')} type="number" half />
          </div>
          <SectionTitle>Laboratorios</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="Glucosa (mg/dL)" value={form.glucosa} onChange={set('glucosa')} type="number" half hint="Normal: 70–100" />
            <Field label="HbA1c (%)" value={form.hba1c} onChange={set('hba1c')} type="number" half hint="Normal: <5.7%" />
            <Field label="Colesterol total" value={form.colesterol_total} onChange={set('colesterol_total')} type="number" half hint="Normal: <200" />
            <Field label="LDL" value={form.colesterol_ldl} onChange={set('colesterol_ldl')} type="number" half hint="Normal: <100" />
            <Field label="HDL" value={form.colesterol_hdl} onChange={set('colesterol_hdl')} type="number" half hint="H:>40 M:>50" />
            <Field label="Triglicéridos" value={form.trigliceridos} onChange={set('trigliceridos')} type="number" half hint="Normal: <150" />
            <Field label="Insulina (µU/mL)" value={form.insulina} onChange={set('insulina')} type="number" half />
            <Field label="TSH (mU/L)" value={form.tsh} onChange={set('tsh')} type="number" half />
          </div>
          <SectionTitle>Medicamentos</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>
            <Field label="GLP-1 (nombre/dosis)" value={form.glp1} onChange={set('glp1')} half />
            <Field label="Metformina (dosis)" value={form.metformina} onChange={set('metformina')} half />
          </div>
          <TextArea label="Otros medicamentos" value={form.otros_medicamentos} onChange={set('otros_medicamentos')} />
          <SectionTitle>Diagnóstico y Plan</SectionTitle>
          <TextArea label="Diagnóstico médico" value={form.diagnostico} onChange={set('diagnostico')} />
          <TextArea label="Plan de tratamiento" value={form.plan_tratamiento} onChange={set('plan_tratamiento')} />
          <Field label="Próxima visita" value={form.proxima_visita} onChange={set('proxima_visita')} type="date" half />
          <TextArea label="Notas" value={form.notas} onChange={set('notas')} />
        </div>
      </div>
    </div>
  );
}

// ── TAB NUTRICIÓN ─────────────────────────────────────────────────────────────
function TabNutricion({ paciente, consultas, onActualizar, usuario }) {
  const [toast, setToast] = useState(null);
  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };
  return (
    <div>
      <div style={{ textAlign: 'center', padding: 60, background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}` }}>
        <p style={{ fontSize: 36, marginBottom: 10 }}>🥗</p>
        <p style={{ color: B.navy, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Módulo de Nutrición</p>
        <p style={{ color: B.gray, fontSize: 13 }}>En desarrollo — próximamente disponible cuando se defina el protocolo nutricional de IMC.</p>
      </div>
    </div>
  );
}


