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
              valoraciones={valoraciones}
              planes={planes}
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
  const [valoracionEditar, setValoracionEditar] = useState(null);
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
        valoraciones.map((v, i) => <ValoracionCard key={v.id} v={v} paciente={paciente} onEditar={() => setValoracionEditar(v)} />)
      )}

      {/* IA Sugerencias */}
      {valoraciones.length > 0 && (
        <SugerenciasIA
          paciente={paciente}
          valoracion={valoraciones[0]}
          planes={planes || []}
          usuario={usuario}
          onPlanCreado={onActualizar}
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

      {valoracionEditar && (
        <ModalEditarValoracion
          paciente={paciente}
          valoracion={valoracionEditar}
          usuario={usuario}
          onClose={() => setValoracionEditar(null)}
          onGuardado={() => { onActualizar(); setValoracionEditar(null); showToast('Valoración actualizada ✓'); }}
        />
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  );
}

function ValoracionCard({ v, paciente, onEditar }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, marginBottom: 10, borderLeft: `4px solid ${B.blue}` }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '13px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: B.navy, margin: '0 0 2px' }}>{fmtDate(v.fecha)}</p>
          <p style={{ fontSize: 11, color: B.gray, margin: 0 }}>{v.terapeuta_nombre || '—'} · Peso: {v.peso || '—'} kg · VO2max: {v.vo2max || '—'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={e => { e.stopPropagation(); onEditar && onEditar(); }}
            style={{ padding: '4px 10px', background: B.blue + '11', color: B.blue, border: `1px solid ${B.blue}33`, borderRadius: 5, fontWeight: 600, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
            ✏️ Editar
          </button>
          <button onClick={e => { e.stopPropagation(); imprimirValoracion(paciente, v); }}
            style={{ padding: '4px 10px', background: B.navy + '11', color: B.navy, border: `1px solid ${B.navy}33`, borderRadius: 5, fontWeight: 600, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
            🖨 Imprimir
          </button>
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



// ─── IMPRIMIR VALORACIÓN ─────────────────────────────────────────────────────
function imprimirValoracion(paciente, v) {
  const age = paciente.fecha_nacimiento ? Math.floor((Date.now() - new Date(paciente.fecha_nacimiento).getTime()) / (365.25*24*3600*1000)) : 0;
  const LOGO_SRC = 'data:image/jpeg;base64,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';
  const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('es-EC', {day:'2-digit',month:'long',year:'numeric'}) : '—';
  const grupoLabels = { transformacion: 'Transformación Corporal', prequirurgico: 'Pre-Quirúrgico', postquirurgico: 'Post-Quirúrgico' };
  const planLabels = { starter: 'Starter Plan $80', standard: 'Standard IMC $250/mes', imc360: 'IMC 360 $400/mes' };

  const card = (label, val, unit, ref, desc, status) => {
    const colors = {
      good: { top: '#E8F5EE', label: '#1A7A4A', val: '#1A7A4A', bot: '#D1FAE5', text: '#064E2E' },
      warn: { top: '#FFF3E0', label: '#C25A00', val: '#C25A00', bot: '#FDDCB5', text: '#7A3300' },
      alert: { top: '#FEF2F2', label: '#B02020', val: '#B02020', bot: '#FECACA', text: '#7F1D1D' },
      neutral: { top: '#F4F6F8', label: '#4B647A', val: '#0B1F3B', bot: '#DDE3EA', text: '#4B647A' },
    };
    const c = colors[status] || colors.neutral;
    return `<div style="border-radius:10px;overflow:hidden;border:1.5px solid #DDE3EA;">
      <div style="padding:12px 14px 8px;background:${c.top};">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${c.label};margin-bottom:5px;">${label}</div>
        <div style="font-size:24px;font-weight:700;color:${c.val};line-height:1;">${val || '—'}<span style="font-size:11px;font-weight:400;"> ${val ? unit : ''}</span></div>
        <div style="font-size:9px;color:${c.label};opacity:.7;margin-top:2px;">${ref}</div>
      </div>
      <div style="padding:8px 14px;background:${c.bot};font-size:11px;color:${c.text};line-height:1.45;">${desc}</div>
    </div>`;
  };

  const bmiStatus = v.bmi ? (parseFloat(v.bmi) > 35 ? 'alert' : parseFloat(v.bmi) > 30 ? 'warn' : parseFloat(v.bmi) > 25 ? 'warn' : 'good') : 'neutral';
  const fatStatus = v.pct_grasa ? (parseFloat(v.pct_grasa) > 35 ? 'alert' : parseFloat(v.pct_grasa) > 25 ? 'warn' : 'good') : 'neutral';
  const muscleStatus = v.masa_muscular ? (parseFloat(v.masa_muscular) > 32 ? 'good' : 'warn') : 'neutral';
  const vo2Status = v.vo2max ? (parseFloat(v.vo2max) > 35 ? 'good' : parseFloat(v.vo2max) > 25 ? 'warn' : 'alert') : 'neutral';
  const ssStatus = v.sit_stand ? (parseInt(v.sit_stand) >= 20 ? 'good' : parseInt(v.sit_stand) >= 15 ? 'warn' : 'alert') : 'neutral';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Valoración Fisioterapéutica — ${paciente.nombre} ${paciente.apellido}</title>
  <style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #E8EDF3; color: #0B1F3B; padding: 24px 16px 80px; }
  .page { background: white; max-width: 780px; margin: 0 auto; border-radius: 6px; overflow: hidden; box-shadow: 0 8px 40px rgba(11,31,59,0.14); }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #0B1F3B; color: white; border: none; padding: 12px 28px; border-radius: 30px; font-family: 'Segoe UI',Arial,sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 20px rgba(11,31,59,0.3); z-index: 100; }
  .print-btn:hover { background: #1E7CB5; }
  @media print {
    body { background: white !important; padding: 0 !important; }
    .page { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
    .print-btn { display: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  }

    .sec-title { font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#4B647A;border-bottom:2px solid #1E7CB5;padding-bottom:6px;margin:20px 0 12px; }
    .grid2 { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
    .grid3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px; }
    .grid4 { display:grid;grid-template-columns:repeat(4,1fr);gap:10px; }
    .zona { border-radius:8px;padding:10px 14px;display:inline-flex;flex-direction:column; }
    .body { padding:24px 32px; }
  </style></head><body>
  <div class="page">
    <!-- HEADER -->
    <div style="background:#0B1F3B;padding:28px 36px 24px;position:relative;overflow:hidden;">
      <div style="position:absolute;width:280px;height:280px;border-radius:50%;border:55px solid rgba(30,124,181,0.09);right:-70px;top:-90px;"></div>
      <div style="background:white;border-radius:8px;padding:6px 14px;display:inline-flex;align-items:center;margin-bottom:20px;position:relative;z-index:1;">
        <img src="${LOGO_SRC}" alt="IMC" style="height:40px;width:auto;">
      </div>
      <div style="position:relative;z-index:1;">
        <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:white;line-height:1.2;margin-bottom:8px;">Valoración Fisioterapéutica,<br><span style="color:#1E7CB5;">${paciente.nombre.split(' ')[0]}.</span></h1>
        <p style="color:rgba(255,255,255,0.55);font-size:12px;margin-bottom:20px;">${fmtD(v.fecha)} · ${grupoLabels[paciente.grupo] || ''}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Paciente</div>
            <div style="font-size:14px;font-weight:600;color:white;">${paciente.nombre} ${paciente.apellido}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);">${age > 0 ? age+' años' : ''} · ${paciente.sexo === 'F' ? 'Femenino' : paciente.sexo === 'M' ? 'Masculino' : ''}</div>
          </div>
          <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Historia Clínica</div>
            <div style="font-size:14px;font-weight:600;color:white;">${paciente.historia_clinica || '—'}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);">Terapeuta: ${v.terapeuta_nombre || '—'}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="body">
      <!-- Aptitud badge -->
      <div style="margin-bottom:20px;">
        <span style="background:${v.aptitud==='apto'?'#E8F5EE':v.aptitud==='apto_rest'?'#FFF3E0':'#FEF2F2'};color:${v.aptitud==='apto'?'#1A7A4A':v.aptitud==='apto_rest'?'#C25A00':'#B02020'};padding:8px 18px;border-radius:20px;font-size:13px;font-weight:700;">
          ${v.aptitud==='apto'?'✓ Apto — sin restricciones':v.aptitud==='apto_rest'?'⚠ Apto con restricciones':'✗ No apto'}
        </span>
      </div>

      <!-- Composición corporal -->
      <div class="sec-title">Composición Corporal</div>
      <div class="grid4" style="margin-bottom:10px;">
        ${card('IMC', v.bmi, 'kg/m²', 'Normal: 18.5–24.9', v.bmi > 30 ? 'Indica exceso de adiposidad. Meta: reducir.' : v.bmi > 25 ? 'Sobrepeso leve. Trabajo en progreso.' : 'Dentro del rango saludable.', bmiStatus)}
        ${card('% Grasa corporal', v.pct_grasa, '%', paciente.sexo==='F'?'Normal: 18–28%':'Normal: 10–20%', v.pct_grasa > 35 ? 'Grasa elevada. Priorizar cardio.' : 'Composición en proceso de mejora.', fatStatus)}
        ${card('Masa muscular', v.masa_muscular, 'kg', 'Meta: >32 kg', v.masa_muscular > 32 ? 'Buena masa muscular.' : 'Enfocarse en entrenamiento de fuerza.', muscleStatus)}
        ${card('Peso', v.peso, 'kg', v.talla ? 'Talla: '+v.talla+' cm' : '', 'Referencia para seguimiento de progreso.', 'neutral')}
      </div>
      ${(v.cintura || v.cadera) ? `<div class="grid4">
        ${v.cintura ? card('Cintura', v.cintura, 'cm', paciente.sexo==='F'?'Meta: <80 cm':'Meta: <94 cm', v.cintura > (paciente.sexo==='F'?88:102) ? 'Riesgo cardiovascular elevado.' : 'Dentro de rango aceptable.', v.cintura > (paciente.sexo==='F'?88:102)?'alert':v.cintura>(paciente.sexo==='F'?80:94)?'warn':'good') : ''}
        ${v.cadera ? card('Cadera', v.cadera, 'cm', '—', 'Medición de referencia.', 'neutral') : ''}
        ${v.masa_grasa ? card('Masa grasa', v.masa_grasa, 'kg', '—', 'Masa adiposa total.', 'neutral') : ''}
        ${v.agua_corporal ? card('Agua corporal', v.agua_corporal, 'L', 'Normal: 55–65%', 'Hidratación celular.', 'neutral') : ''}
      </div>` : ''}

      <!-- Signos vitales -->
      <div class="sec-title">Signos Vitales y Capacidad Cardiorrespiratoria</div>
      <div class="grid4" style="margin-bottom:10px;">
        ${v.vo2max ? card('VO2max', v.vo2max, 'ml/kg/min', 'Normal: ≥35', v.vo2max > 35 ? 'Capacidad aeróbica buena.' : v.vo2max > 25 ? 'Capacidad moderada. Mejorar con cardio Z2.' : 'Capacidad baja. Iniciar progresión gradual.', vo2Status) : ''}
        ${v.fc_reposo ? card('FC Reposo', v.fc_reposo, 'bpm', 'Normal: 60–100', v.fc_reposo < 60 ? 'Bradicardia. Evaluar.' : v.fc_reposo < 80 ? 'Frecuencia cardíaca saludable.' : 'Algo elevada. El ejercicio la mejorará.', parseInt(v.fc_reposo) < 80 ? 'good' : 'warn') : ''}
        ${v.spo2 ? card('SpO2', v.spo2, '%', 'Normal: ≥95%', v.spo2 >= 95 ? 'Saturación normal.' : 'Saturación baja. Evaluar.', parseFloat(v.spo2) >= 95 ? 'good' : 'alert') : ''}
        ${v.sit_stand ? card('Sit & Stand', v.sit_stand, 'reps', 'Meta: ≥20 reps', v.sit_stand >= 20 ? 'Fuerza funcional buena.' : v.sit_stand >= 15 ? 'Fuerza funcional moderada.' : 'Fuerza funcional baja. Trabajar resistencia.', ssStatus) : ''}
      </div>

      <!-- Zonas cardíacas -->
      ${v.zona2_lo && v.zona2_hi ? `<div class="sec-title">Zonas Cardíacas de Entrenamiento (Karvonen)</div>
      <div style="display:flex;gap:10px;margin-bottom:20px;">
        ${[['ZONA 1 — Activa',v.zona1_lo,v.zona1_hi,'Calentamiento / Recuperación','#E3F2FD','#1E7CB5'],['ZONA 2 — Aeróbica',v.zona2_lo,v.zona2_hi,'Quema de grasa óptima 🎯','#E8F5E9','#1A7A4A'],['ZONA 3 — Umbral',v.zona3_lo,v.zona3_hi,'Resistencia aeróbica alta','#FFF3E0','#C25A00']].map(([n,lo,hi,desc,bg,col]) => `
          <div style="flex:1;background:${bg};border-radius:10px;padding:12px 16px;">
            <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${col};margin-bottom:4px;">${n}</div>
            <div style="font-size:22px;font-weight:700;color:${col};font-family:monospace;">${lo} – ${hi}</div>
            <div style="font-size:10px;color:${col};opacity:.75;margin-top:2px;">bpm · ${desc}</div>
          </div>`).join('')}
      </div>` : ''}

      <!-- Diagnóstico -->
      ${v.diagnostico ? `<div class="sec-title">Diagnóstico Fisioterapéutico</div>
      <div style="background:#F4F6F8;border-radius:10px;padding:14px 18px;margin-bottom:16px;font-size:13px;line-height:1.7;color:#0B1F3B;">${v.diagnostico}</div>` : ''}
      ${v.limitantes ? `<div class="sec-title">Limitantes</div>
      <div style="background:#FEF2F2;border-left:4px solid #B02020;border-radius:0 8px 8px 0;padding:10px 16px;margin-bottom:16px;font-size:13px;color:#7F1D1D;">${v.limitantes}</div>` : ''}
      ${v.fortalezas ? `<div class="sec-title">Fortalezas</div>
      <div style="background:#E8F5EE;border-left:4px solid #1A7A4A;border-radius:0 8px 8px 0;padding:10px 16px;margin-bottom:16px;font-size:13px;color:#064E2E;">${v.fortalezas}</div>` : ''}

      <!-- Firma -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px;padding-top:18px;border-top:1px solid #DDE3EA;">
        <div><div style="border-bottom:1px solid #DDE3EA;margin-bottom:6px;height:36px;"></div><p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">${v.terapeuta_nombre || 'Terapeuta'} · IMC</p></div>
        <div><div style="border-bottom:1px solid #DDE3EA;margin-bottom:6px;height:36px;"></div><p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">Firma del paciente</p></div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#0B1F3B;padding:12px 32px;display:flex;justify-content:space-between;align-items:center;">
      <p style="color:rgba(255,255,255,0.4);font-size:9px;">IMC – Instituto Metabólico Corporal · by GMEDiQ</p>
      <p style="color:rgba(255,255,255,0.4);font-size:9px;">Documento oficial · ${new Date().getFullYear()}</p>
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨 Imprimir valoración</button>
  </body></html>`;

  const blob = new Blob([html], {type:'text/html;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ─── MODAL EDITAR VALORACIÓN ─────────────────────────────────────────────────
function ModalEditarValoracion({ paciente, valoracion, usuario, onClose, onGuardado }) {
  const v = valoracion;
  const fields = [
    ['fc_reposo','FC reposo (bpm)','number'],['pa_sistolica','PA sistólica','number'],['pa_diastolica','PA diastólica','number'],
    ['spo2','SpO2 (%)','number'],['fr','FR (rpm)','number'],
    ['peso','Peso (kg)','number'],['talla','Talla (cm)','number'],
    ['pct_grasa','% Grasa corporal','number'],['masa_muscular','Masa muscular (kg)','number'],
    ['masa_grasa','Masa grasa (kg)','number'],['agua_corporal','Agua corporal (L)','number'],
    ['cintura','Cintura (cm)','number'],['cadera','Cadera (cm)','number'],
    ['sit_stand','Sit & Stand (reps)','number'],['borg','Borg','number'],
    ['dina_d','Dinamometría D (kg)','number'],['dina_i','Dinamometría I (kg)','number'],
    ['vo2max','VO2max (ml/kg/min)','number'],
  ];

  const [form, setForm] = useState(() => {
    const f = {};
    fields.forEach(([k]) => { f[k] = v[k] || ''; });
    f.diagnostico = v.diagnostico || '';
    f.limitantes = v.limitantes || '';
    f.fortalezas = v.fortalezas || '';
    f.notas = v.notas || '';
    f.aptitud = v.aptitud || 'apto';
    return f;
  });

  const [guardando, setGuardando] = useState(false);
  const set = k => val => setForm(p => ({...p, [k]: val}));

  const guardar = async () => {
    setGuardando(true);
    const data = {};
    Object.keys(form).forEach(k => {
      const val = form[k];
      data[k] = val === '' ? null : (typeof val === 'string' && !isNaN(val) && val !== '' && fields.find(f => f[0] === k) ? parseFloat(val) : val);
    });

    // Recalculate BMI if peso/talla changed
    if (data.peso && data.talla) {
      data.bmi = parseFloat((data.peso / ((data.talla/100)**2)).toFixed(1));
    }

    const { error } = await supabase.from('valoraciones').update(data).eq('id', v.id);
    if (!error) onGuardado();
    setGuardando(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.85)', display: 'flex', alignItems: 'stretch', zIndex: 1000 }}>
      <div style={{ background: B.grayLt, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: B.blue, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>✏️ Editar Valoración Fisioterapéutica</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>{paciente.nombre} {paciente.apellido} · {v.fecha}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '8px 20px', background: B.green, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : '💾 Guardar cambios'}
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', borderRadius: 6, padding: '4px 10px' }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', maxWidth: 860, margin: '0 auto', width: '100%' }}>
          <p style={{ fontWeight: 700, fontSize: 11, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px', borderLeft: `4px solid ${B.blue}`, paddingLeft: 10 }}>Medidas y signos vitales</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 3%' }}>
            {fields.map(([k, label, type]) => (
              <div key={k} style={{ flex: '0 0 22%', marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</label>
                <input type={type} value={form[k]} onChange={e => set(k)(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Aptitud</label>
            <select value={form.aptitud} onChange={e => set('aptitud')(e.target.value)}
              style={{ padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit', minWidth: 280 }}>
              <option value="apto">✓ Apto — sin restricciones</option>
              <option value="apto_rest">⚠ Apto con restricciones</option>
              <option value="no_apto">✗ No apto</option>
            </select>
          </div>

          {[['diagnostico','Diagnóstico fisioterapéutico',4],['limitantes','Limitantes',3],['fortalezas','Fortalezas',3],['notas','Notas adicionales',3]].map(([k, label, rows]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</label>
              <textarea value={form[k]} onChange={e => set(k)(e.target.value)} rows={rows}
                style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '10px 28px', background: guardando ? '#9AA5B1' : B.blue, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
