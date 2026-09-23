// ════════════════════════════════════════════════════════════════════════
// TabCosmetologia.js — Cosmetología / Aparatología, capa visual v2.
//
// Lo que NO cambió: props, cargarTodo (sesiones + catálogo de tratamientos),
// el cálculo de progreso de paquetes, eliminarSesion, y el insert/update de
// sesión con su update de citas a 'atendida'. El campo `icono` de cada
// tratamiento viene del catálogo en la base (dato configurable), así que se
// conserva tal cual.
//
// Cambia: tokens, Poppins, iconos Lucide en la interfaz (los 📅📍⏱⚙️📝✏️🗑),
// barra de progreso del paquete con el dorado de marca, y cifras tabulares.
// ════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from './v2/Icon';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#7C8DA1',
  grayLt: '#FAFCFE', grayMd: '#E6EDF6', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00', gold: '#C9A86A',
};
const FUENTE = "'Poppins', system-ui, sans-serif";
const ZONAS = ['Abdomen', 'Glúteos', 'Brazos', 'Piernas', 'Espalda', 'Cuerpo completo', 'Otra'];
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function TabCosmetologia({ paciente, usuario }) {
  const [sesiones, setSesiones] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [sesionEditar, setSesionEditar] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => { cargarTodo(); }, [paciente.id]);

  const cargarTodo = async () => {
    setLoading(true);
    const [ses, trat] = await Promise.all([
      supabase.from('sesiones_cosmetologia').select('*, tratamientos_cosmetologia(nombre, icono)').eq('paciente_id', paciente.id).order('fecha', { ascending: false }).order('creado_en', { ascending: false }),
      supabase.from('tratamientos_cosmetologia').select('*').eq('activo', true).order('orden'),
    ]);
    setSesiones(ses.data || []);
    setTratamientos(trat.data || []);
    setLoading(false);
  };

  const eliminarSesion = async (s) => {
    if (!window.confirm('¿Eliminar esta sesión? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('sesiones_cosmetologia').delete().eq('id', s.id);
    if (error) showToast('Error: ' + error.message, B.red);
    else { showToast('Sesión eliminada'); cargarTodo(); }
  };

  const progresoPaquetes = tratamientos.map(t => {
    const sesTrat = sesiones.filter(s => s.tratamiento_id === t.id);
    const conPaquete = sesTrat.find(s => s.sesion_numero && s.sesiones_paquete);
    return { tratamiento: t, total: sesTrat.length, ultima: sesTrat[0]?.fecha, numero: conPaquete?.sesion_numero, paquete: conPaquete?.sesiones_paquete };
  }).filter(p => p.total > 0);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: B.gray, fontFamily: FUENTE }}>Cargando sesiones…</div>;

  const num = { fontVariantNumeric: 'tabular-nums' };

  return (
    <div style={{ fontFamily: FUENTE, color: B.navy }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ fontSize: 13.5, color: B.teal, margin: 0 }}>{sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''} de cosmetología</p>
        <button onClick={() => setModalNueva(true)} style={{ height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, background: B.gold, color: B.navy, border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px -12px rgba(201,168,106,.9)' }}>
          <Icon name="plus" size={16} color={B.navy} /> Nueva sesión
        </button>
      </div>

      {progresoPaquetes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 18 }}>
          {progresoPaquetes.map(p => (
            <div key={p.tratamiento.id} style={{ background: B.white, border: `1px solid ${B.grayMd}`, borderRadius: 14, padding: '15px 16px', boxShadow: 'var(--sh-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: B.gold + '22', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{p.tratamiento.icono}</span>
                <p style={{ fontWeight: 600, fontSize: 13, color: B.navy, margin: 0 }}>{p.tratamiento.nombre}</p>
              </div>
              <p style={{ fontSize: 11.5, color: B.gray, margin: '0 0 9px' }}>
                {p.total} sesión{p.total !== 1 ? 'es' : ''}{p.ultima ? ` · última ${fmtDate(p.ultima)}` : ''}
              </p>
              {p.numero && p.paquete && (
                <div>
                  <p style={{ fontSize: 11.5, fontWeight: 600, color: '#8A6A2E', margin: '0 0 5px', ...num }}>Sesión {p.numero} de {p.paquete}</p>
                  <div style={{ height: 6, background: B.grayMd, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (p.numero / p.paquete) * 100)}%`, background: B.gold, borderRadius: 3 }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sesiones.length === 0 ? (
        <div style={{ background: B.white, border: `1px solid ${B.grayMd}`, borderRadius: 14, padding: 48, textAlign: 'center', boxShadow: 'var(--sh-1)' }}>
          <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: B.gold + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name="sparkles" size={22} color="#8A6A2E" />
          </span>
          <h4 style={{ color: B.navy, margin: '0 0 6px', fontSize: 15, fontWeight: 600 }}>Sin sesiones registradas</h4>
          <p style={{ color: B.gray, fontSize: 13, margin: 0 }}>Las sesiones de aparatología y masajes aparecerán aquí cuando las registres.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sesiones.map(s => (
            <div key={s.id} className="v2-row" style={{ background: B.white, border: `1px solid ${B.grayMd}`, borderRadius: 12, padding: 15, boxShadow: 'var(--sh-1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: B.gold + '22', color: '#6E541F', padding: '3px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600 }}>
                      {s.tratamientos_cosmetologia?.icono} {s.tratamientos_cosmetologia?.nombre}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: B.gray }}><Icon name="calendar-days" size={12} color={B.gray} /> {fmtDate(s.fecha)}</span>
                    {s.sesion_numero && s.sesiones_paquete && (
                      <span style={{ background: B.navy, color: 'white', padding: '2px 8px', borderRadius: 7, fontSize: 10.5, fontWeight: 600, ...num }}>Sesión {s.sesion_numero}/{s.sesiones_paquete}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: s.observaciones ? 6 : 0 }}>
                    {s.zona_tratada && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: B.navy }}><Icon name="map-pin" size={13} color={B.gray} /> {s.zona_tratada}</span>}
                    {s.duracion_min && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: B.navy }}><Icon name="clock" size={13} color={B.gray} /> {s.duracion_min} min</span>}
                    {s.parametros && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: B.teal }}><Icon name="settings-2" size={13} color={B.teal} /> {s.parametros}</span>}
                  </div>
                  {s.observaciones && <p style={{ fontSize: 12.5, color: B.gray, margin: 0 }}>{s.observaciones}</p>}
                </div>
                <div className="v2-actions" style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setSesionEditar(s)} style={{ height: 30, padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 6, background: B.white, color: B.blue, border: `1px solid ${B.grayMd}`, borderRadius: 9, fontWeight: 500, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Icon name="pencil" size={13} /> Editar
                  </button>
                  <button onClick={() => eliminarSesion(s)} title="Eliminar" style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#FBEAEA', color: B.red, border: 'none', borderRadius: 9, cursor: 'pointer' }}>
                    <Icon name="trash-2" size={14} color={B.red} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(modalNueva || sesionEditar) && (
        <ModalSesion paciente={paciente} usuario={usuario} tratamientos={tratamientos} sesion={sesionEditar}
          onClose={() => { setModalNueva(false); setSesionEditar(null); }}
          onGuardado={() => { setModalNueva(false); setSesionEditar(null); showToast('Sesión guardada'); cargarTodo(); }} />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 9, background: B.navy, color: 'white', padding: '12px 20px', borderRadius: 12, fontWeight: 500, fontSize: 13.5, zIndex: 3000, boxShadow: 'var(--sh-nav)', fontFamily: FUENTE }}>
          <Icon name={toast.color === B.red ? 'alert-circle' : 'check-circle-2'} size={16} color={toast.color === B.red ? '#FCA5A5' : '#6EE7A8'} /> {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── MODAL NUEVA / EDITAR SESIÓN ──────────────────────────────────────────────
function ModalSesion({ paciente, usuario, tratamientos, sesion, onClose, onGuardado }) {
  const [tratamientoId, setTratamientoId] = useState(sesion?.tratamiento_id || tratamientos[0]?.id || '');
  const [fecha, setFecha] = useState(sesion?.fecha || new Date().toISOString().split('T')[0]);
  const [zona, setZona] = useState(sesion?.zona_tratada || '');
  const [zonaOtra, setZonaOtra] = useState('');
  const [parametros, setParametros] = useState(sesion?.parametros || '');
  const [duracion, setDuracion] = useState(sesion?.duracion_min || '');
  const [sesionNum, setSesionNum] = useState(sesion?.sesion_numero || '');
  const [sesionesPaq, setSesionesPaq] = useState(sesion?.sesiones_paquete || '');
  const [observaciones, setObservaciones] = useState(sesion?.observaciones || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const zonaEsOtra = zona === 'Otra';
  const zonaFinal = zonaEsOtra ? zonaOtra : zona;

  const guardar = async () => {
    if (!tratamientoId) { setError('Selecciona un tratamiento'); return; }
    setGuardando(true);
    setError('');
    const registro = {
      paciente_id: paciente.id, tratamiento_id: tratamientoId, fecha, zona_tratada: zonaFinal || null,
      parametros: parametros || null, duracion_min: duracion ? parseInt(duracion) : null,
      sesion_numero: sesionNum ? parseInt(sesionNum) : null, sesiones_paquete: sesionesPaq ? parseInt(sesionesPaq) : null,
      observaciones: observaciones || null,
    };
    let resp;
    if (sesion) resp = await supabase.from('sesiones_cosmetologia').update(registro).eq('id', sesion.id);
    else resp = await supabase.from('sesiones_cosmetologia').insert([{ ...registro, creado_por: usuario?.id || null }]);
    if (resp.error) { setError('Error al guardar: ' + resp.error.message); setGuardando(false); }
    else {
      await supabase.from('citas').update({ estado: 'atendida' }).eq('paciente_id', paciente.id).eq('fecha', new Date().toISOString().split('T')[0]).in('estado', ['pendiente', 'preatendido', 'confirmada']);
      onGuardado();
    }
  };

  const inputStyle = { width: '100%', height: 40, padding: '0 11px', border: `1px solid ${B.grayMd}`, borderRadius: 10, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: B.white, color: B.navy };
  const areaStyle = { ...inputStyle, height: 'auto', padding: '10px 11px', resize: 'vertical', lineHeight: 1.5 };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: B.gray, letterSpacing: '.06em', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16, fontFamily: FUENTE, color: B.navy }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 40px 90px -30px rgba(11,31,59,.6)' }}>
        <div style={{ background: 'linear-gradient(180deg,#14355F,#0B1F3B)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(201,168,106,.28)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="sparkles" size={16} color="#E7C98A" />
            </span>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 15, margin: 0, letterSpacing: '-.01em' }}>
              {sesion ? 'Editar sesión' : 'Nueva sesión'} · {paciente.nombre} {paciente.apellido || ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 9, cursor: 'pointer', flexShrink: 0 }}>
            <Icon name="x" size={16} strokeWidth={2} color="#fff" />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Tratamiento *</label>
              <select value={tratamientoId} onChange={e => setTratamientoId(e.target.value)} style={inputStyle}>
                {tratamientos.map(t => <option key={t.id} value={t.id}>{t.icono} {t.nombre}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Fecha *</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Duración (min)</label><input type="number" min="0" value={duracion} onChange={e => setDuracion(e.target.value)} placeholder="Ej: 30" style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>Zona tratada</label>
              <select value={zona} onChange={e => setZona(e.target.value)} style={inputStyle}>
                <option value="">— Seleccionar —</option>
                {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            {zonaEsOtra && (
              <div><label style={labelStyle}>Especificar zona</label><input value={zonaOtra} onChange={e => setZonaOtra(e.target.value)} placeholder="Ej: Papada" style={inputStyle} /></div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Parámetros del equipo</label>
              <input value={parametros} onChange={e => setParametros(e.target.value)} placeholder="Ej: Programa 3, intensidad 70%" style={inputStyle} />
            </div>
            <div><label style={labelStyle}>Sesión N°</label><input type="number" min="1" value={sesionNum} onChange={e => setSesionNum(e.target.value)} placeholder="Ej: 4" style={inputStyle} /></div>
            <div><label style={labelStyle}>Total del paquete</label><input type="number" min="1" value={sesionesPaq} onChange={e => setSesionesPaq(e.target.value)} placeholder="Ej: 10" style={inputStyle} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Observaciones</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} placeholder="Tolerancia del paciente, reacciones, recomendaciones…" style={areaStyle} />
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#FBEAEA', border: '1px solid #F3C2C2', borderRadius: 10, padding: '10px 13px', color: B.red, fontSize: 12.5, marginTop: 14 }}>
              <Icon name="alert-circle" size={15} color={B.red} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button onClick={onClose} style={{ height: 40, padding: '0 18px', background: B.white, color: B.teal, border: `1px solid ${B.grayMd}`, borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ height: 40, padding: '0 20px', display: 'inline-flex', alignItems: 'center', gap: 8, background: guardando ? '#C9C3B4' : B.gold, color: B.navy, border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando…' : sesion ? <><Icon name="save" size={16} color={B.navy} /> Guardar cambios</> : <><Icon name="plus" size={16} color={B.navy} /> Registrar sesión</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
