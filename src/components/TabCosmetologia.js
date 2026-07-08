// ════════════════════════════════════════════════════════════════════════
// TabCosmetologia.js — Módulo de Cosmetología / Aparatología
// Registro de sesiones (EMZero, masajes, etc.) con catálogo configurable
// desde la tabla tratamientos_cosmetologia (agregar máquinas sin tocar código)
// ════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00', gold: '#C9A86A',
};

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
      supabase.from('sesiones_cosmetologia')
        .select('*, tratamientos_cosmetologia(nombre, icono)')
        .eq('paciente_id', paciente.id)
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false }),
      supabase.from('tratamientos_cosmetologia')
        .select('*')
        .eq('activo', true)
        .order('orden'),
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

  // Progreso del paquete por tratamiento (según la sesión más reciente con paquete)
  const progresoPaquetes = tratamientos.map(t => {
    const sesTrat = sesiones.filter(s => s.tratamiento_id === t.id);
    const conPaquete = sesTrat.find(s => s.sesion_numero && s.sesiones_paquete);
    return {
      tratamiento: t,
      total: sesTrat.length,
      ultima: sesTrat[0]?.fecha,
      numero: conPaquete?.sesion_numero,
      paquete: conPaquete?.sesiones_paquete,
    };
  }).filter(p => p.total > 0);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: B.gray }}>Cargando sesiones...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
          {sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''} de cosmetología
        </p>
        <button onClick={() => setModalNueva(true)}
          style={{ padding: '9px 20px', background: B.gold, color: B.navy, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Nueva sesión
        </button>
      </div>

      {/* Progreso de paquetes */}
      {progresoPaquetes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginBottom: 18 }}>
          {progresoPaquetes.map(p => (
            <div key={p.tratamiento.id} style={{ background: B.white, border: `1.5px solid ${B.grayMd}`, borderTop: `3px solid ${B.gold}`, borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 20, margin: '0 0 6px' }}>{p.tratamiento.icono}</p>
              <p style={{ fontWeight: 700, fontSize: 13, color: B.navy, margin: '0 0 3px' }}>{p.tratamiento.nombre}</p>
              <p style={{ fontSize: 11, color: B.gray, margin: '0 0 8px' }}>
                {p.total} sesión{p.total !== 1 ? 'es' : ''}{p.ultima ? ` · última ${fmtDate(p.ultima)}` : ''}
              </p>
              {p.numero && p.paquete && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: B.gold, margin: '0 0 4px' }}>
                    Sesión {p.numero} de {p.paquete}
                  </p>
                  <div style={{ height: 6, background: B.grayLt, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (p.numero / p.paquete) * 100)}%`, background: B.gold, borderRadius: 3 }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lista de sesiones */}
      {sesiones.length === 0 ? (
        <div style={{ background: B.white, border: `1px solid ${B.grayMd}`, borderRadius: 12, padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>💆</div>
          <h4 style={{ color: B.navy, marginBottom: 6, fontSize: 14 }}>Sin sesiones registradas</h4>
          <p style={{ color: B.gray, fontSize: 12 }}>Las sesiones de aparatología y masajes aparecerán aquí cuando las registres.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sesiones.map(s => (
            <div key={s.id} style={{ background: B.white, border: `1px solid ${B.grayMd}`, borderLeft: `4px solid ${B.gold}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ background: B.gold + '22', color: B.navy, padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                      {s.tratamientos_cosmetologia?.icono} {s.tratamientos_cosmetologia?.nombre}
                    </span>
                    <span style={{ fontSize: 11, color: B.gray, fontWeight: 600 }}>📅 {fmtDate(s.fecha)}</span>
                    {s.sesion_numero && s.sesiones_paquete && (
                      <span style={{ background: B.navy, color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                        Sesión {s.sesion_numero}/{s.sesiones_paquete}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: s.observaciones ? 6 : 0 }}>
                    {s.zona_tratada && <span style={{ fontSize: 12, color: B.navy }}>📍 {s.zona_tratada}</span>}
                    {s.duracion_min && <span style={{ fontSize: 12, color: B.navy }}>⏱ {s.duracion_min} min</span>}
                    {s.parametros && <span style={{ fontSize: 12, color: B.teal }}>⚙️ {s.parametros}</span>}
                  </div>
                  {s.observaciones && <p style={{ fontSize: 12, color: B.gray, margin: 0, fontStyle: 'italic' }}>📝 {s.observaciones}</p>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setSesionEditar(s)}
                    style={{ padding: '5px 12px', background: B.blue + '11', color: B.blue, border: `1px solid ${B.blue}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => eliminarSesion(s)}
                    style={{ padding: '5px 12px', background: B.red + '11', color: B.red, border: `1px solid ${B.red}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nueva / editar sesión */}
      {(modalNueva || sesionEditar) && (
        <ModalSesion
          paciente={paciente}
          usuario={usuario}
          tratamientos={tratamientos}
          sesion={sesionEditar}
          onClose={() => { setModalNueva(false); setSesionEditar(null); }}
          onGuardado={() => { setModalNueva(false); setSesionEditar(null); showToast('Sesión guardada ✓'); cargarTodo(); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.color, color: 'white', padding: '12px 22px', borderRadius: 10, fontWeight: 700, fontSize: 13, zIndex: 3000, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
          {toast.msg}
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
      paciente_id: paciente.id,
      tratamiento_id: tratamientoId,
      fecha,
      zona_tratada: zonaFinal || null,
      parametros: parametros || null,
      duracion_min: duracion ? parseInt(duracion) : null,
      sesion_numero: sesionNum ? parseInt(sesionNum) : null,
      sesiones_paquete: sesionesPaq ? parseInt(sesionesPaq) : null,
      observaciones: observaciones || null,
    };

    let resp;
    if (sesion) {
      resp = await supabase.from('sesiones_cosmetologia').update(registro).eq('id', sesion.id);
    } else {
      resp = await supabase.from('sesiones_cosmetologia').insert([{ ...registro, creado_por: usuario?.id || null }]);
    }

    if (resp.error) { setError('Error al guardar: ' + resp.error.message); setGuardando(false); }
    else onGuardado();
  };

  const inputStyle = { width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
        {/* Header */}
        <div style={{ background: B.navy, padding: '14px 22px', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>
            💆 {sesion ? 'Editar sesión' : 'Nueva sesión'} · {paciente.nombre} {paciente.apellido || ''}
          </p>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, width: 30, height: 30, fontSize: 15, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Tratamiento *</label>
              <select value={tratamientoId} onChange={e => setTratamientoId(e.target.value)} style={inputStyle}>
                {tratamientos.map(t => <option key={t.id} value={t.id}>{t.icono} {t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fecha *</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Duración (min)</label>
              <input type="number" min="0" value={duracion} onChange={e => setDuracion(e.target.value)} placeholder="Ej: 30" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Zona tratada</label>
              <select value={zona} onChange={e => setZona(e.target.value)} style={inputStyle}>
                <option value="">— Seleccionar —</option>
                {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            {zonaEsOtra && (
              <div>
                <label style={labelStyle}>Especificar zona</label>
                <input value={zonaOtra} onChange={e => setZonaOtra(e.target.value)} placeholder="Ej: Papada" style={inputStyle} />
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Parámetros del equipo</label>
              <input value={parametros} onChange={e => setParametros(e.target.value)} placeholder="Ej: Programa 3, intensidad 70%" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Sesión N°</label>
              <input type="number" min="1" value={sesionNum} onChange={e => setSesionNum(e.target.value)} placeholder="Ej: 4" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Total del paquete</label>
              <input type="number" min="1" value={sesionesPaq} onChange={e => setSesionesPaq(e.target.value)} placeholder="Ej: 10" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Observaciones</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3}
                placeholder="Tolerancia del paciente, reacciones, recomendaciones..."
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', color: B.red, fontSize: 13, marginTop: 14 }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button onClick={onClose}
              style={{ padding: '9px 20px', background: B.grayLt, color: B.gray, border: `1px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '9px 24px', background: guardando ? '#9AA5B1' : B.gold, color: B.navy, border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : sesion ? '💾 Guardar cambios' : '+ Registrar sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
