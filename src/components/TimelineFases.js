// ════════════════════════════════════════════════════════════════════════
// TimelineFases.js — Timeline de fases bariátricas (Manga/Balón)
//
// Muestra:
//   - Las fases del protocolo en orden
//   - Cuáles ya completó, cuál está activa, cuáles vienen
//   - Botones para asignar primera fase, avanzar a siguiente, ver detalle
//
// Props:
//   - paciente:  {id, nombre, ...}
//   - protocolo: 'manga' | 'balon'
//   - usuario:   usuario logueado
//   - onVolver:  callback para volver al resumen
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
  amber: '#F59E0B', purple: '#7C3AED',
  softGreen: '#E6F5EE', softBlue: '#E8F2FA', softOrange: '#FFF0E0',
  softPurple: '#F3E8FF',
};

const COLORS = {
  manga: { primary: B.blue,   light: B.softBlue,   gradient: `linear-gradient(135deg, ${B.blue}, #134A75)` },
  balon: { primary: B.purple, light: B.softPurple, gradient: `linear-gradient(135deg, ${B.purple}, #4C1D95)` },
};

export default function TimelineFases({ paciente, protocolo, usuario, onVolver }) {
  const [fasesCatalogo, setFasesCatalogo] = useState([]);    // Todas las fases disponibles del protocolo
  const [fasesPaciente, setFasesPaciente] = useState([]);    // Las que ya están registradas en el timeline del paciente
  const [loading, setLoading] = useState(true);
  const [modalAsignar, setModalAsignar] = useState(null);    // objeto fase si se está asignando
  const [modalDetalle, setModalDetalle] = useState(null);    // fase del paciente que se está viendo
  const [toast, setToast] = useState(null);

  const C = COLORS[protocolo] || COLORS.manga;

  useEffect(() => {
    cargarTodo();
  }, [paciente?.id, protocolo]);

  const showToast = (msg, color = B.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const cargarTodo = async () => {
    setLoading(true);

    // 1. Cargar catálogo de fases del protocolo
    const { data: catalogo } = await supabase
      .from('fases_nutricionales')
      .select('*')
      .eq('protocolo', protocolo)
      .eq('activa', true)
      .order('numero_orden');
    setFasesCatalogo(catalogo || []);

    // 2. Cargar fases del paciente
    const { data: pacFases } = await supabase
      .from('paciente_fases')
      .select('*, fases_nutricionales(*)')
      .eq('paciente_id', paciente.id)
      .order('fecha_inicio', { ascending: true });
    setFasesPaciente(pacFases || []);

    setLoading(false);
  };

  // ── Estado de cada fase del catálogo respecto al paciente ───────────
  const estadoFase = (faseId) => {
    const registros = fasesPaciente.filter(pf => pf.fase_id === faseId);
    if (registros.length === 0) return 'pendiente';
    if (registros.some(r => r.estado === 'activa')) return 'activa';
    if (registros.some(r => r.estado === 'completada')) return 'completada';
    return 'pendiente';
  };

  const faseActivaPaciente = fasesPaciente.find(pf => pf.estado === 'activa');

  // ── Acciones ─────────────────────────────────────────────────────────
  const iniciarFase = async (faseId, fechaInicio) => {
    try {
      // Si hay una activa, primero la marcamos como completada
      if (faseActivaPaciente) {
        await supabase
          .from('paciente_fases')
          .update({
            estado: 'completada',
            fecha_fin: new Date().toISOString().split('T')[0],
            finalizada_por: usuario?.id,
          })
          .eq('id', faseActivaPaciente.id);
      }

      // Insertar la nueva fase como activa
      const { error } = await supabase
        .from('paciente_fases')
        .insert([{
          paciente_id: paciente.id,
          fase_id: faseId,
          fecha_inicio: fechaInicio,
          estado: 'activa',
          iniciada_por: usuario?.id,
        }]);

      if (error) throw error;
      showToast('Fase asignada al paciente ✓');
      setModalAsignar(null);
      cargarTodo();
    } catch (e) {
      showToast('Error: ' + e.message, B.red);
    }
  };

  const completarFase = async () => {
    if (!faseActivaPaciente) return;
    try {
      await supabase
        .from('paciente_fases')
        .update({
          estado: 'completada',
          fecha_fin: new Date().toISOString().split('T')[0],
          finalizada_por: usuario?.id,
        })
        .eq('id', faseActivaPaciente.id);
      showToast('Fase marcada como completada ✓');
      cargarTodo();
    } catch (e) {
      showToast('Error: ' + e.message, B.red);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: B.gray }}>
        Cargando fases...
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={onVolver} style={btnBack()}>← Volver</button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: B.navy, margin: 0 }}>
            🗂 Timeline de Fases · {protocolo === 'manga' ? 'Manga Gástrica' : 'Balón Gástrico'}
          </h2>
          <p style={{ fontSize: 12, color: B.gray, margin: '2px 0 0' }}>
            {paciente.nombre} {paciente.apellido || ''} · {fasesPaciente.length} fases registradas
          </p>
        </div>
      </div>

      {/* Línea de tiempo visual */}
      <div style={{
        background: 'white',
        border: `1px solid ${B.grayMd}`,
        borderRadius: 12,
        padding: 18,
        marginBottom: 18,
        overflowX: 'auto',
      }}>
        <h3 style={{ fontSize: 13, color: B.navy, marginBottom: 16, fontWeight: 700 }}>
          📅 Progresión del protocolo
        </h3>
        
        <div style={{ minWidth: 600, position: 'relative', padding: '20px 0 40px' }}>
          {/* Track */}
          <div style={{
            position: 'absolute', left: 20, right: 20, top: 36,
            height: 6, background: B.grayLt, borderRadius: 3,
          }} />
          {/* Progress (calculado según fases completadas) */}
          <div style={{
            position: 'absolute', left: 20, top: 36,
            height: 6, background: C.gradient, borderRadius: 3,
            width: `${calcularProgreso(fasesCatalogo, fasesPaciente)}%`,
            maxWidth: 'calc(100% - 40px)',
          }} />
          
          {/* Fases */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${fasesCatalogo.length}, 1fr)`,
            gap: 0, position: 'relative',
          }}>
            {fasesCatalogo.map(fase => {
              const est = estadoFase(fase.id);
              return (
                <div key={fase.id} style={{ textAlign: 'center', padding: '20px 4px 0', position: 'relative' }}>
                  <div style={{
                    width: est === 'activa' ? 36 : 28,
                    height: est === 'activa' ? 36 : 28,
                    borderRadius: '50%',
                    background: est === 'completada' ? C.primary : est === 'activa' ? C.primary : B.grayMd,
                    margin: '8px auto 8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 11,
                    border: '3px solid white',
                    boxShadow: est === 'activa' ? `0 0 0 4px ${C.light}` : `0 0 0 2px ${B.grayMd}`,
                  }}>
                    {est === 'completada' ? '✓' : est === 'activa' ? '●' : fase.numero_orden}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700,
                    color: est === 'activa' ? C.primary : est === 'completada' ? B.navy : B.gray,
                    textTransform: 'uppercase', letterSpacing: 0.3,
                    lineHeight: 1.3,
                  }}>
                    {fase.nombre.split('·')[0].trim()}
                  </div>
                  <div style={{ fontSize: 9, color: B.gray, marginTop: 2 }}>
                    {fase.duracion_dias_default}d
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fase activa */}
      {faseActivaPaciente && (
        <div style={{
          background: C.light,
          borderLeft: `4px solid ${C.primary}`,
          padding: 16, borderRadius: 10, marginBottom: 18,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase' }}>
                FASE ACTIVA AHORA
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: B.navy, marginTop: 4 }}>
                {faseActivaPaciente.fases_nutricionales?.nombre}
              </div>
              <div style={{ fontSize: 11, color: B.gray, marginTop: 4 }}>
                📅 Inicio: {formatDate(faseActivaPaciente.fecha_inicio)} · 
                Día {diasDesde(faseActivaPaciente.fecha_inicio)} ·
                Sugerida: {faseActivaPaciente.fases_nutricionales?.duracion_dias_default} días
              </div>
              {faseActivaPaciente.observaciones && (
                <div style={{ fontSize: 11, color: B.navy, marginTop: 8, fontStyle: 'italic' }}>
                  📝 {faseActivaPaciente.observaciones}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModalDetalle(faseActivaPaciente)} style={btnPrimary(C.primary)}>
                👁 Ver detalle
              </button>
              <button onClick={completarFase} style={btnSecondaryDark()}>
                ✓ Marcar completada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catálogo de fases del protocolo */}
      <div style={cardStyle()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontSize: 14, color: B.navy, margin: 0, fontWeight: 700 }}>
            📚 Fases del protocolo
          </h3>
          <span style={{ fontSize: 11, color: B.gray }}>
            Toca cualquier fase para asignarla al paciente
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {fasesCatalogo.map(fase => {
            const est = estadoFase(fase.id);
            return (
              <FaseCard
                key={fase.id}
                fase={fase}
                estado={est}
                color={C.primary}
                colorLight={C.light}
                onAsignar={() => setModalAsignar(fase)}
                onVer={() => {
                  const registro = fasesPaciente.find(pf => pf.fase_id === fase.id && pf.estado !== 'omitida');
                  if (registro) setModalDetalle(registro);
                  else setModalDetalle({ fases_nutricionales: fase, _previa: true });
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Historial de fases del paciente */}
      {fasesPaciente.length > 0 && (
        <div style={cardStyle()}>
          <h3 style={{ fontSize: 14, color: B.navy, marginBottom: 12, fontWeight: 700 }}>
            📋 Historial de fases del paciente
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fasesPaciente.map(pf => (
              <div key={pf.id} style={{
                background: pf.estado === 'activa' ? C.light : B.grayLt,
                borderLeft: `3px solid ${pf.estado === 'activa' ? C.primary : pf.estado === 'completada' ? B.green : B.gray}`,
                padding: '10px 14px',
                borderRadius: 6,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: B.navy }}>
                    {pf.estado === 'activa' ? '●' : pf.estado === 'completada' ? '✓' : '○'} {pf.fases_nutricionales?.nombre}
                  </div>
                  <div style={{ fontSize: 10, color: B.gray, marginTop: 2 }}>
                    {formatDate(pf.fecha_inicio)} {pf.fecha_fin && `→ ${formatDate(pf.fecha_fin)}`} ·
                    Estado: <strong>{pf.estado}</strong>
                  </div>
                </div>
                <button onClick={() => setModalDetalle(pf)} style={btnTiny()}>
                  Ver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Asignar fase */}
      {modalAsignar && (
        <ModalAsignarFase
          fase={modalAsignar}
          color={C.primary}
          onCancel={() => setModalAsignar(null)}
          onConfirmar={(fecha) => iniciarFase(modalAsignar.id, fecha)}
        />
      )}

      {/* Modal Detalle fase */}
      {modalDetalle && (
        <ModalDetalleFase
          registro={modalDetalle}
          color={C.primary}
          onClose={() => setModalDetalle(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.color, color: 'white', padding: '12px 28px',
          borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: Tarjeta de fase
// ────────────────────────────────────────────────────────────────────────
function FaseCard({ fase, estado, color, colorLight, onAsignar, onVer }) {
  const tagText = {
    activa: 'EN CURSO',
    completada: 'COMPLETADA',
    pendiente: 'DISPONIBLE',
  }[estado];

  const tagColor = {
    activa: color,
    completada: B.green,
    pendiente: B.gray,
  }[estado];

  return (
    <div
      style={{
        background: estado === 'activa' ? colorLight : 'white',
        border: `1.5px solid ${estado === 'activa' ? color : B.grayMd}`,
        borderRadius: 10,
        padding: 14,
        cursor: 'pointer',
      }}
      onClick={onVer}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = estado === 'activa' ? color : B.grayMd}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: B.navy, lineHeight: 1.2 }}>
          {fase.nombre}
        </div>
        <span style={{
          background: tagColor, color: 'white',
          padding: '2px 7px', borderRadius: 9,
          fontSize: 9, fontWeight: 700,
          flexShrink: 0, marginLeft: 6,
          textTransform: 'uppercase', letterSpacing: 0.3,
        }}>
          {tagText}
        </span>
      </div>
      <div style={{ fontSize: 10, color: B.gray, marginBottom: 8 }}>
        ⏱ {fase.duracion_dias_default} días sugeridos · 💧 {fase.hidratacion_litros} L/día
      </div>
      {fase.descripcion_corta && (
        <p style={{ fontSize: 10.5, color: B.gray, lineHeight: 1.4, marginBottom: 10 }}>
          {fase.descripcion_corta}
        </p>
      )}
      {estado === 'pendiente' && (
        <button
          onClick={(e) => { e.stopPropagation(); onAsignar(); }}
          style={{ ...btnPrimary(color), width: '100%', fontSize: 11 }}
        >
          🚀 Asignar a paciente
        </button>
      )}
      {estado === 'activa' && (
        <div style={{ fontSize: 10, color, fontWeight: 700, textAlign: 'center', padding: '6px 0' }}>
          ● Fase actualmente activa
        </div>
      )}
      {estado === 'completada' && (
        <button
          onClick={(e) => { e.stopPropagation(); onAsignar(); }}
          style={{ ...btnSecondaryDark(), width: '100%', fontSize: 11 }}
        >
          🔄 Re-asignar
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// MODAL: Asignar fase
// ────────────────────────────────────────────────────────────────────────
function ModalAsignarFase({ fase, color, onCancel, onConfirmar }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  
  return (
    <div style={modalBg()} onClick={onCancel}>
      <div style={modalCard(440)} onClick={e => e.stopPropagation()}>
        <div style={{ background: color, padding: '14px 18px', borderRadius: '16px 16px 0 0', color: 'white' }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>🚀 Asignar fase al paciente</div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{fase.nombre}</div>
        </div>
        <div style={{ padding: 18 }}>
          <p style={{ fontSize: 12, color: B.gray, marginBottom: 14, lineHeight: 1.5 }}>
            Esto creará un nuevo registro en el timeline del paciente. Si hay una fase activa, se marcará automáticamente como completada.
          </p>
          <div style={{ marginBottom: 14 }}>
            <label style={miniLabel()}>📅 Fecha de inicio de esta fase</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              style={inputStyle()}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
            <button onClick={onCancel} style={btnSecondaryDark()}>Cancelar</button>
            <button onClick={() => onConfirmar(fecha)} style={btnPrimary(color)}>
              ✓ Asignar fase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// MODAL: Detalle de fase (muestra contenido completo de la guía)
// ────────────────────────────────────────────────────────────────────────
function ModalDetalleFase({ registro, color, onClose }) {
  const fase = registro.fases_nutricionales;
  if (!fase) return null;

  return (
    <div style={modalBg()} onClick={onClose}>
      <div style={modalCard(720)} onClick={e => e.stopPropagation()}>
        <div style={{
          background: color, padding: '14px 20px',
          borderRadius: '16px 16px 0 0', color: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{fase.nombre}</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
              ⏱ {fase.duracion_dias_default} días · 💧 {fase.hidratacion_litros} L/día
              {!registro._previa && ` · Estado: ${registro.estado}`}
            </div>
          </div>
          <button onClick={onClose} style={btnClose()}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          {fase.descripcion_corta && (
            <p style={{ fontSize: 13, color: B.navy, marginBottom: 16, lineHeight: 1.5, fontStyle: 'italic' }}>
              {fase.descripcion_corta}
            </p>
          )}

          <SeccionGuia titulo="📋 Indicaciones" texto={fase.indicaciones} color={B.blue} />
          <SeccionGuia titulo="⚠️ Restricciones" texto={fase.restricciones} color={B.red} />
          <SeccionGuia titulo="💡 Recomendaciones" texto={fase.recomendaciones} color={B.green} />
          <SeccionGuia titulo="💊 Suplementación" texto={fase.suplementacion} color={B.orange} />

          {fase.menu_establecido && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 12, color: B.navy, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                🍽️ Menú establecido
              </h4>
              <MenuTabla menu={fase.menu_establecido} color={color} />
            </div>
          )}

          {fase.alimentos_permitidos && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 12, color: B.navy, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                🥗 Alimentos permitidos y prohibidos
              </h4>
              <AlimentosTabla alimentos={fase.alimentos_permitidos} />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${B.grayMd}` }}>
            <button onClick={onClose} style={btnSecondaryDark()}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeccionGuia({ titulo, texto, color }) {
  if (!texto) return null;
  return (
    <div style={{ marginBottom: 12, background: B.grayLt, padding: 12, borderRadius: 8, borderLeft: `3px solid ${color}` }}>
      <strong style={{ fontSize: 11, color, textTransform: 'uppercase', letterSpacing: 0.4 }}>{titulo}</strong>
      <p style={{ fontSize: 12, color: B.navy, marginTop: 6, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{texto}</p>
    </div>
  );
}

function MenuTabla({ menu, color }) {
  const tiempos = [
    { codigo: 'desayuno',     label: '🌅 Desayuno' },
    { codigo: 'media_manana', label: '🍎 Media mañana' },
    { codigo: 'almuerzo',     label: '🍽️ Almuerzo' },
    { codigo: 'media_tarde',  label: '🥜 Media tarde' },
    { codigo: 'merienda',     label: '🌙 Merienda' },
    { codigo: 'cena',         label: '🌙 Cena' },
  ];
  
  return (
    <div style={{ background: 'white', border: `1px solid ${B.grayMd}`, borderRadius: 8, overflow: 'hidden' }}>
      {tiempos.map(t => {
        const data = menu[t.codigo];
        if (!data) return null;
        return (
          <div key={t.codigo} style={{ padding: 10, borderBottom: `1px solid ${B.grayLt}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6 }}>
              {t.label} · <span style={{ color: B.gray }}>{data.hora}</span>
            </div>
            {(data.items || []).map((item, idx) => (
              <div key={idx} style={{ fontSize: 11, color: B.navy, padding: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>• {item.alimento}</span>
                <span style={{ color: B.gray }}>{item.cantidad}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AlimentosTabla({ alimentos }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${B.grayMd}`, borderRadius: 8, overflow: 'hidden' }}>
      {Object.entries(alimentos).map(([categoria, data]) => (
        <div key={categoria} style={{ padding: 10, borderBottom: `1px solid ${B.grayLt}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.navy, marginBottom: 6 }}>
            {categoria}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: B.green, marginBottom: 4 }}>✓ PERMITIDOS</div>
              <div style={{ fontSize: 10, color: B.navy, lineHeight: 1.5 }}>
                {(data.permitidos || []).map((p, i) => <div key={i}>• {p}</div>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: B.red, marginBottom: 4 }}>✗ PROHIBIDOS</div>
              <div style={{ fontSize: 10, color: B.navy, lineHeight: 1.5 }}>
                {(data.prohibidos || []).map((p, i) => <div key={i}>• {p}</div>)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// HELPERS DE UI
// ────────────────────────────────────────────────────────────────────────
const cardStyle = () => ({
  background: 'white',
  border: `1px solid ${B.grayMd}`,
  borderRadius: 12,
  padding: 18,
  marginBottom: 16,
});

const btnBack = () => ({
  padding: '8px 14px',
  background: B.white,
  color: B.navy,
  border: `1.5px solid ${B.grayMd}`,
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const btnPrimary = (color) => ({
  padding: '9px 16px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: 7,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const btnSecondaryDark = () => ({
  padding: '9px 16px',
  background: 'white',
  color: B.navy,
  border: `1.5px solid ${B.grayMd}`,
  borderRadius: 7,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const btnTiny = () => ({
  padding: '5px 10px',
  background: 'white',
  border: `1px solid ${B.grayMd}`,
  borderRadius: 5,
  fontSize: 10,
  color: B.navy,
  cursor: 'pointer',
  fontWeight: 600,
  fontFamily: 'inherit',
});

const btnClose = () => ({
  background: 'rgba(255,255,255,0.2)', border: 'none',
  color: 'white', fontSize: 18, fontWeight: 700,
  cursor: 'pointer', borderRadius: 5, padding: '4px 9px',
});

const modalBg = () => ({
  position: 'fixed', inset: 0,
  background: 'rgba(11,31,59,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 16,
});

const modalCard = (width) => ({
  background: 'white',
  borderRadius: 16,
  width: '100%',
  maxWidth: width,
  maxHeight: '92vh',
  overflow: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
});

const miniLabel = () => ({
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: B.teal,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 6,
});

const inputStyle = () => ({
  width: '100%',
  padding: '9px 12px',
  border: `1.5px solid ${B.grayMd}`,
  borderRadius: 7,
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
});

// ────────────────────────────────────────────────────────────────────────
// HELPERS DE LÓGICA
// ────────────────────────────────────────────────────────────────────────
function calcularProgreso(catalogo, pacFases) {
  if (catalogo.length === 0) return 0;
  const completadas = catalogo.filter(f => 
    pacFases.some(pf => pf.fase_id === f.id && pf.estado === 'completada')
  ).length;
  const activas = catalogo.filter(f => 
    pacFases.some(pf => pf.fase_id === f.id && pf.estado === 'activa')
  ).length;
  return Math.round(((completadas + activas * 0.5) / catalogo.length) * 100);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

function diasDesde(iso) {
  if (!iso) return 0;
  const inicio = new Date(iso + 'T12:00:00');
  const hoy = new Date();
  return Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
}
