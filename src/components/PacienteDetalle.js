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
  const logoSrc = 'data:image/jpeg;base64,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FNUftFbrdcKyS5VNTHRMc2na+pjiY2JgLSTGREeN3JxLshT0Y9/Mjrya8JffrHSjNTM06/UdsF2fH1raHtLOtLeHiBDc5+jz93NejbrjQXa1wXK2VcNXR1DBJFPC8OZI0+BBHiFD7Nlr1HeGXCC+U9PC2+09zbbWd6FkUcDIscZj6wyDhIHe4cYyM5WZbYae1bpLR1JprUUlklpbfTR09LLb3Sl78ZyZA8ADyxj1VbUrEbiVq2tM6mGcIiLJqIiICIiAiIgIiICIiAiIgIiICIiAiIgIvh8Ucn042u94yvjstN/Ij/KFHccyLh7LTfyI/wAoTstN/Ij/AChO45l0oLxaqmZ8MFxpXyMkMT4xKOJrw7hLSPHOeS7bI2RjDGBo9BheMzSdkjvsV3jpnNqY5XzhxeXd54dnxzgZe84GBk5Uj8qNYaZpK2ppam8U8UlKQJi/IawlzW44sYyC9oIB5ZGcLifrnSjZZmC8wvMHH1pja54ZwOLXZLQQO81w9SOS61Vt7p6tvTrjUtqpMve8U7piYWl7mvkw32Oc0Eg8sk4xkrgdtnpoVU01MyqpBLGYjHTyBjWtzkBox3QDzAHsHig9GXW+lYaVlQ+9U/Vv8CA4kciSSAMgDhPFn6OOeF77XtfGHscHNcMhwOQR7ViUm3VhdFL1U1yp55mvZLVQ1bmyyB+es4nefETk+oGMYWUQUkFPQw0kbB1UTGxsB54AGB/7IOZFw9lpv5Ef5QnZab+RH+UKO45kXD2Wm/kR/lC+2QxRnLI2N9wwncfaIikEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQf/Z';
  const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('es-EC', {day:'2-digit',month:'long',year:'numeric'}) : '—';
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Valoración — ${paciente.nombre}</title>
  <style>
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
    .sec{margin-bottom:18px;}
    .sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#4B647A;border-bottom:2px solid #1E7CB5;padding-bottom:5px;margin-bottom:10px;}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
    .card{background:#F4F6F8;border-radius:7px;padding:8px 10px;}
    .card-label{font-size:8px;color:#4B647A;font-weight:700;text-transform:uppercase;margin:0 0 2px;}
    .card-value{font-size:15px;font-weight:700;color:#0B1F3B;margin:0;}
    .zona2{background:#E8F5E9;border-radius:8px;padding:10px 14px;display:inline-block;margin-bottom:10px;}
    .footer{background:#0B1F3B;padding:10px 28px;display:flex;justify-content:space-between;}
    .footer p{color:rgba(255,255,255,0.4);font-size:9px;}
    .print-btn{position:fixed;bottom:20px;right:20px;background:#0B1F3B;color:white;border:none;padding:10px 22px;border-radius:25px;font-family:inherit;font-weight:700;font-size:13px;cursor:pointer;}
    @media print{body{background:white;padding:0;}.page{box-shadow:none;max-width:100%;}.print-btn{display:none;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}
  </style></head><body><div class="page">
  <div class="header">
    <img src="${logoSrc}" alt="IMC" style="height:48px;width:auto;">
    <div class="header-right"><strong>Valoración Fisioterapéutica</strong>${fmtD(v.fecha)} · ${v.terapeuta_nombre || '—'}</div>
  </div>
  <div class="patient-bar">
    <div class="pb-item"><strong>${paciente.nombre} ${paciente.apellido}</strong>Paciente</div>
    <div class="pb-item"><strong>${paciente.historia_clinica || '—'}</strong>Historia</div>
    <div class="pb-item"><strong>${paciente.cedula || '—'}</strong>Cédula</div>
    <div class="pb-item"><strong>${age > 0 ? age+' años' : '—'}</strong>Edad</div>
    <div class="pb-item"><strong>${v.aptitud === 'apto' ? '✓ Apto' : v.aptitud === 'apto_rest' ? '⚠ Con restricciones' : '✗ No apto'}</strong>Aptitud</div>
  </div>
  <div class="body">
    <div class="sec">
      <div class="sec-title">Composición corporal</div>
      <div class="grid">
        ${[['Peso','peso','kg'],['Talla','talla','cm'],['IMC','bmi','kg/m²'],['% Grasa','pct_grasa','%'],['Masa muscular','masa_muscular','kg'],['Masa grasa','masa_grasa','kg'],['Agua corporal','agua_corporal','L'],['Cintura','cintura','cm'],['Cadera','cadera','cm']].filter(([,k]) => v[k]).map(([l,k,u]) => `<div class="card"><p class="card-label">${l}</p><p class="card-value">${v[k]} <span style="font-size:9px;color:#6E6E70;">${u}</span></p></div>`).join('')}
      </div>
    </div>
    <div class="sec">
      <div class="sec-title">Signos vitales y aptitud cardiorrespiratoria</div>
      <div class="grid">
        ${[['FC reposo','fc_reposo','bpm'],['SpO2','spo2','%'],['PA','pa_sistolica',null],['VO2max','vo2max','ml/kg/min'],['Sit & Stand','sit_stand','reps'],['Borg','borg',''],['Dina. D','dina_d','kg'],['Dina. I','dina_i','kg']].filter(([,k]) => v[k]).map(([l,k,u]) => `<div class="card"><p class="card-label">${l}</p><p class="card-value">${k==='pa_sistolica' ? (v.pa_sistolica&&v.pa_diastolica ? v.pa_sistolica+'/'+v.pa_diastolica : '—') : v[k]} <span style="font-size:9px;color:#6E6E70;">${u||''}</span></p></div>`).join('')}
      </div>
    </div>
    ${v.zona2_lo && v.zona2_hi ? `<div class="sec">
      <div class="sec-title">Zonas cardíacas (Karvonen)</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${[['Zona 1 (Activa)',v.zona1_lo,v.zona1_hi,'#E3F2FD','#1E7CB5'],['Zona 2 (Aeróbica)',v.zona2_lo,v.zona2_hi,'#E8F5E9','#1A7A4A'],['Zona 3 (Umbral)',v.zona3_lo,v.zona3_hi,'#FFF3E0','#C25A00']].map(([n,lo,hi,bg,col]) => `<div style="background:${bg};border-radius:8px;padding:8px 14px;"><p style="font-size:9px;font-weight:700;color:${col};text-transform:uppercase;margin:0 0 3px;">${n}</p><p style="font-size:18px;font-weight:700;color:${col};font-family:monospace;margin:0;">${lo} – ${hi} <span style="font-size:11px;">bpm</span></p></div>`).join('')}
      </div>
    </div>` : ''}
    ${v.diagnostico ? `<div class="sec"><div class="sec-title">Diagnóstico fisioterapéutico</div><p style="font-size:13px;line-height:1.6;">${v.diagnostico}</p></div>` : ''}
    ${v.limitantes ? `<div class="sec"><div class="sec-title">Limitantes</div><p style="font-size:13px;color:#C25A00;">${v.limitantes}</p></div>` : ''}
    ${v.fortalezas ? `<div class="sec"><div class="sec-title">Fortalezas</div><p style="font-size:13px;color:#1A7A4A;">${v.fortalezas}</p></div>` : ''}
    ${v.notas ? `<div class="sec"><div class="sec-title">Notas</div><p style="font-size:13px;">${v.notas}</p></div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;padding-top:16px;border-top:1px solid #DDE3EA;">
      <div><div style="border-bottom:1px solid #DDE3EA;margin-bottom:5px;height:30px;"></div><p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">${v.terapeuta_nombre || 'Terapeuta'} · IMC</p></div>
      <div><div style="border-bottom:1px solid #DDE3EA;margin-bottom:5px;height:30px;"></div><p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">Firma del paciente</p></div>
    </div>
  </div>
  <div class="footer"><p>IMC – Instituto Metabólico Corporal · by GMEDiQ</p><p>Documento oficial · ${new Date().getFullYear()}</p></div>
  </div><button class="print-btn" onclick="window.print()">🖨 Imprimir</button></body></html>`;
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
