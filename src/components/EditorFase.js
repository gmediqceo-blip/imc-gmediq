// ════════════════════════════════════════════════════════════════════════
// EditorFase.js — Editor de fase nutricional
//
// Permite editar:
//   - Modo "global":         actualiza fases_nutricionales (plantilla)
//   - Modo "personalizada":  guarda overrides en paciente_fases para 1 paciente
//
// Props:
//   - fase:               objeto fase completo
//   - paciente:           paciente actual (solo si modo='personalizada')
//   - registroFase:       paciente_fases row (solo si modo='personalizada')
//   - modo:               'global' | 'personalizada'
//   - usuario:            usuario logueado
//   - onClose:            callback cerrar sin guardar
//   - onGuardado:         callback al guardar exitoso
// ════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
  amber: '#F59E0B', purple: '#7C3AED',
  softGreen: '#E6F5EE', softBlue: '#E8F2FA', softOrange: '#FFF0E0',
};

const TIEMPOS_DEFAULT = [
  { codigo: 'desayuno',     nombre: 'Desayuno',     hora: '07:00', emoji: '🌅' },
  { codigo: 'media_manana', nombre: 'Media mañana', hora: '10:00', emoji: '🍎' },
  { codigo: 'almuerzo',     nombre: 'Almuerzo',     hora: '13:00', emoji: '🍽️' },
  { codigo: 'media_tarde',  nombre: 'Media tarde',  hora: '16:00', emoji: '🥜' },
  { codigo: 'merienda',     nombre: 'Merienda',     hora: '19:00', emoji: '🌙' },
  { codigo: 'cena',         nombre: 'Cena',         hora: '20:00', emoji: '🌙' },
];

export default function EditorFase({ fase, paciente, registroFase, modo = 'global', usuario, onClose, onGuardado }) {
  const [seccion, setSeccion] = useState('texto');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Si es personalizada, usar overrides existentes o valores de plantilla
  const valorInicial = (campoOverride, campoPlantilla) => {
    if (modo === 'personalizada' && registroFase && registroFase[campoOverride] !== null && registroFase[campoOverride] !== undefined) {
      return registroFase[campoOverride];
    }
    return fase[campoPlantilla] || '';
  };

  const [form, setForm] = useState({
    indicaciones:           valorInicial('override_indicaciones', 'indicaciones'),
    restricciones:          valorInicial('override_restricciones', 'restricciones'),
    recomendaciones:        valorInicial('override_recomendaciones', 'recomendaciones'),
    suplementacion:         valorInicial('override_suplementacion', 'suplementacion'),
    duracion_dias_default:  valorInicial('override_duracion_dias', 'duracion_dias_default') || 7,
    hidratacion_litros:     valorInicial('override_hidratacion', 'hidratacion_litros') || 1.5,
    menu_establecido:       valorInicial('override_menu', 'menu_establecido') || {},
    alimentos_permitidos:   valorInicial('override_alimentos', 'alimentos_permitidos') || {},
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      if (modo === 'global') {
        // Actualizar plantilla en fases_nutricionales
        const { error: err } = await supabase
          .from('fases_nutricionales')
          .update({
            indicaciones: form.indicaciones || null,
            restricciones: form.restricciones || null,
            recomendaciones: form.recomendaciones || null,
            suplementacion: form.suplementacion || null,
            duracion_dias_default: parseInt(form.duracion_dias_default) || null,
            hidratacion_litros: parseFloat(form.hidratacion_litros) || null,
            menu_establecido: form.menu_establecido,
            alimentos_permitidos: form.alimentos_permitidos,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fase.id);
        if (err) throw err;
      } else {
        // Guardar overrides en paciente_fases
        if (!registroFase?.id) throw new Error('No hay registro de fase del paciente para personalizar');
        const { error: err } = await supabase
          .from('paciente_fases')
          .update({
            personalizada: true,
            override_indicaciones: form.indicaciones || null,
            override_restricciones: form.restricciones || null,
            override_recomendaciones: form.recomendaciones || null,
            override_suplementacion: form.suplementacion || null,
            override_duracion_dias: parseInt(form.duracion_dias_default) || null,
            override_hidratacion: parseFloat(form.hidratacion_litros) || null,
            override_menu: form.menu_establecido,
            override_alimentos: form.alimentos_permitidos,
          })
          .eq('id', registroFase.id);
        if (err) throw err;
      }
      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = async () => {
    if (modo !== 'personalizada') return;
    if (!confirm('¿Quitar personalización y volver a la plantilla global?')) return;
    setGuardando(true);
    try {
      await supabase
        .from('paciente_fases')
        .update({
          personalizada: false,
          override_indicaciones: null,
          override_restricciones: null,
          override_recomendaciones: null,
          override_suplementacion: null,
          override_duracion_dias: null,
          override_hidratacion: null,
          override_menu: null,
          override_alimentos: null,
        })
        .eq('id', registroFase.id);
      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const accentColor = modo === 'global' ? B.blue : B.purple;
  const accentLabel = modo === 'global' ? '🌐 PLANTILLA GLOBAL' : '👤 PERSONALIZADA PARA ' + (paciente?.nombre?.toUpperCase() || 'PACIENTE');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER */}
        <div style={{ background: accentColor, color: 'white', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9.5, opacity: 0.9, letterSpacing: 1, fontWeight: 700 }}>
              ✏️ EDITAR FASE · {accentLabel}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>{fase.nombre}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', borderRadius: 5, padding: '4px 10px' }}>✕</button>
        </div>

        {/* Aviso */}
        <div style={{ background: modo === 'global' ? B.softBlue : '#F3E8FF', padding: '8px 18px', fontSize: 11, color: modo === 'global' ? B.blue : B.purple, fontWeight: 600, borderBottom: `1px solid ${B.grayMd}` }}>
          {modo === 'global' ? (
            <>⚠️ Los cambios afectarán a TODOS los pacientes futuros que usen esta fase.</>
          ) : (
            <>✓ Los cambios solo afectan a <strong>{paciente?.nombre} {paciente?.apellido || ''}</strong> y no modifican la plantilla global.</>
          )}
        </div>

        {/* TABS */}
        <div style={{ background: B.grayLt, padding: '10px 14px', display: 'flex', gap: 4, borderBottom: `1px solid ${B.grayMd}`, overflowX: 'auto', flexShrink: 0 }}>
          {[
            { k: 'texto',     l: '📝 Texto (4 bloques)' },
            { k: 'datos',     l: '⚙️ Datos generales' },
            { k: 'menu',      l: '🍽️ Menú establecido' },
            { k: 'alimentos', l: '🥗 Alimentos permitidos' },
          ].map(t => (
            <button key={t.k} onClick={() => setSeccion(t.k)} style={tabBtn(seccion === t.k, accentColor)}>
              {t.l}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ background: '#FFEBEB', color: B.red, padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 12 }}>
              ⚠️ {error}
            </div>
          )}

          {seccion === 'texto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Area label="📋 Indicaciones" valor={form.indicaciones} onChange={v => set('indicaciones', v)} rows={5} />
              <Area label="⚠️ Restricciones" valor={form.restricciones} onChange={v => set('restricciones', v)} rows={5} />
              <Area label="💡 Recomendaciones" valor={form.recomendaciones} onChange={v => set('recomendaciones', v)} rows={4} />
              <Area label="💊 Suplementación" valor={form.suplementacion} onChange={v => set('suplementacion', v)} rows={4} />
            </div>
          )}

          {seccion === 'datos' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="⏱️ Duración sugerida (días)" tipo="number" valor={form.duracion_dias_default} onChange={v => set('duracion_dias_default', v)} />
              <Field label="💧 Hidratación (litros/día)" tipo="number" step="0.1" valor={form.hidratacion_litros} onChange={v => set('hidratacion_litros', v)} />
            </div>
          )}

          {seccion === 'menu' && (
            <EditorMenu menu={form.menu_establecido} onChange={v => set('menu_establecido', v)} />
          )}

          {seccion === 'alimentos' && (
            <EditorAlimentos alimentos={form.alimentos_permitidos} onChange={v => set('alimentos_permitidos', v)} />
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '14px 20px', background: B.grayLt, borderTop: `1px solid ${B.grayMd}`, display: 'flex', justifyContent: 'space-between', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <div>
            {modo === 'personalizada' && registroFase?.personalizada && (
              <button onClick={restaurar} disabled={guardando} style={btnSecondary(B.amber)}>
                🔄 Quitar personalización
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={btnSecondary(B.navy)}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ ...btnPrimary(accentColor), opacity: guardando ? 0.5 : 1 }}>
              {guardando ? 'Guardando...' : `💾 Guardar ${modo === 'global' ? 'plantilla' : 'personalización'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// EDITOR DE MENÚ — editar los 5 tiempos con items
// ────────────────────────────────────────────────────────────────────────
function EditorMenu({ menu, onChange }) {
  const setTiempo = (codigo, data) => {
    onChange({ ...menu, [codigo]: data });
  };

  const eliminarTiempo = (codigo) => {
    if (!confirm('¿Eliminar este tiempo de comida del menú?')) return;
    const nuevo = { ...menu };
    delete nuevo[codigo];
    onChange(nuevo);
  };

  const agregarTiempo = (tiempo) => {
    setTiempo(tiempo.codigo, { hora: tiempo.hora, items: [{ alimento: '', cantidad: '' }] });
  };

  const tiemposExistentes = Object.keys(menu);
  const tiemposDisponibles = TIEMPOS_DEFAULT.filter(t => !tiemposExistentes.includes(t.codigo));

  return (
    <div>
      <p style={{ fontSize: 11, color: B.gray, marginBottom: 14 }}>
        Define los tiempos de comida con sus alimentos y cantidades. Estos aparecerán en la tabla del PDF.
      </p>

      {TIEMPOS_DEFAULT.filter(t => menu[t.codigo]).map(tiempo => {
        const data = menu[tiempo.codigo] || { items: [] };
        return (
          <div key={tiempo.codigo} style={{ marginBottom: 14, background: B.grayLt, borderRadius: 10, padding: 14, borderLeft: `4px solid ${B.blue}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 12, color: B.navy }}>
                {tiempo.emoji} {tiempo.nombre}
              </strong>
              <button onClick={() => eliminarTiempo(tiempo.codigo)} style={{ background: 'none', border: 'none', color: B.red, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>🗑️ Eliminar</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={miniLabel()}>Hora</label>
                <input
                  type="text"
                  value={data.hora || ''}
                  onChange={e => setTiempo(tiempo.codigo, { ...data, hora: e.target.value })}
                  placeholder="07:00"
                  style={inputStyle()}
                />
              </div>
            </div>

            {(data.items || []).map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 30px', gap: 6, marginBottom: 6 }}>
                <input
                  type="text"
                  value={item.alimento || ''}
                  placeholder="Ej: Agua aromática"
                  onChange={e => {
                    const nuevos = [...data.items];
                    nuevos[idx] = { ...nuevos[idx], alimento: e.target.value };
                    setTiempo(tiempo.codigo, { ...data, items: nuevos });
                  }}
                  style={inputStyle()}
                />
                <input
                  type="text"
                  value={item.cantidad || ''}
                  placeholder="200 ml"
                  onChange={e => {
                    const nuevos = [...data.items];
                    nuevos[idx] = { ...nuevos[idx], cantidad: e.target.value };
                    setTiempo(tiempo.codigo, { ...data, items: nuevos });
                  }}
                  style={inputStyle()}
                />
                <button
                  onClick={() => {
                    const nuevos = data.items.filter((_, i) => i !== idx);
                    setTiempo(tiempo.codigo, { ...data, items: nuevos });
                  }}
                  style={{ background: 'none', border: `1px solid ${B.grayMd}`, color: B.red, borderRadius: 5, cursor: 'pointer', fontSize: 12 }}
                  title="Eliminar"
                >✕</button>
              </div>
            ))}

            <button
              onClick={() => {
                const nuevos = [...(data.items || []), { alimento: '', cantidad: '' }];
                setTiempo(tiempo.codigo, { ...data, items: nuevos });
              }}
              style={btnSmall(B.blue)}
            >+ Agregar alimento</button>
          </div>
        );
      })}

      {tiemposDisponibles.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: B.softBlue, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.blue, marginBottom: 8 }}>Agregar tiempo de comida:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tiemposDisponibles.map(t => (
              <button key={t.codigo} onClick={() => agregarTiempo(t)} style={btnSmall(B.blue)}>
                + {t.emoji} {t.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// EDITOR DE ALIMENTOS — categorías con permitidos/prohibidos
// ────────────────────────────────────────────────────────────────────────
function EditorAlimentos({ alimentos, onChange }) {
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  const setCategoria = (cat, data) => {
    onChange({ ...alimentos, [cat]: data });
  };

  const eliminarCategoria = (cat) => {
    if (!confirm(`¿Eliminar la categoría "${cat}" y todos sus alimentos?`)) return;
    const nuevo = { ...alimentos };
    delete nuevo[cat];
    onChange(nuevo);
  };

  const agregarCategoria = () => {
    if (!nuevaCategoria.trim()) return;
    setCategoria(nuevaCategoria.trim(), { permitidos: [], prohibidos: [] });
    setNuevaCategoria('');
  };

  return (
    <div>
      <p style={{ fontSize: 11, color: B.gray, marginBottom: 14 }}>
        Define las categorías de alimentos con sus listas de permitidos y prohibidos.
      </p>

      {Object.entries(alimentos).map(([cat, data]) => (
        <div key={cat} style={{ marginBottom: 14, background: B.grayLt, borderRadius: 10, padding: 14, borderLeft: `4px solid ${B.teal}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: 12, color: B.navy }}>📂 {cat}</strong>
            <button onClick={() => eliminarCategoria(cat)} style={{ background: 'none', border: 'none', color: B.red, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>🗑️ Eliminar categoría</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ListaAlimentos
              titulo="✓ Permitidos"
              color={B.green}
              items={data.permitidos || []}
              onChange={(items) => setCategoria(cat, { ...data, permitidos: items })}
            />
            <ListaAlimentos
              titulo="✕ Prohibidos"
              color={B.red}
              items={data.prohibidos || []}
              onChange={(items) => setCategoria(cat, { ...data, prohibidos: items })}
            />
          </div>
        </div>
      ))}

      <div style={{ marginTop: 16, padding: 12, background: B.softBlue, borderRadius: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: B.blue, marginBottom: 8 }}>Agregar nueva categoría:</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={nuevaCategoria}
            onChange={e => setNuevaCategoria(e.target.value)}
            placeholder="Ej: Lácteos, Frutas, Vegetales..."
            style={inputStyle()}
            onKeyPress={e => e.key === 'Enter' && agregarCategoria()}
          />
          <button onClick={agregarCategoria} style={btnPrimary(B.blue)}>+ Agregar</button>
        </div>
      </div>
    </div>
  );
}

function ListaAlimentos({ titulo, color, items, onChange }) {
  const setItem = (idx, valor) => {
    const nuevos = [...items];
    nuevos[idx] = valor;
    onChange(nuevos);
  };

  const eliminar = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const agregar = () => {
    onChange([...items, '']);
  };

  return (
    <div style={{ background: 'white', borderRadius: 8, padding: 10, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {titulo}
      </div>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            type="text"
            value={item}
            onChange={e => setItem(idx, e.target.value)}
            placeholder="Ej: Pollo a la plancha"
            style={{ ...inputStyle(), padding: '6px 8px', fontSize: 11 }}
          />
          <button onClick={() => eliminar(idx)} style={{ background: 'none', border: `1px solid ${B.grayMd}`, color: B.red, borderRadius: 5, cursor: 'pointer', padding: '0 8px', fontSize: 11 }}>✕</button>
        </div>
      ))}
      <button onClick={agregar} style={{ ...btnSmall(color), marginTop: 4 }}>+ Agregar</button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// HELPERS UI
// ────────────────────────────────────────────────────────────────────────
function Area({ label, valor, onChange, rows = 4 }) {
  return (
    <div>
      <label style={miniLabel()}>{label}</label>
      <textarea
        value={valor || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        style={{ ...inputStyle(), resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
      />
      <p style={{ fontSize: 9, color: B.gray, marginTop: 3, fontStyle: 'italic' }}>
        💡 Separa cada punto con un Enter (líneas nuevas). Cada línea será un ítem en el PDF.
      </p>
    </div>
  );
}

function Field({ label, valor, onChange, tipo = 'text', step }) {
  return (
    <div>
      <label style={miniLabel()}>{label}</label>
      <input
        type={tipo}
        value={valor || ''}
        onChange={e => onChange(e.target.value)}
        step={step}
        style={inputStyle()}
      />
    </div>
  );
}

const miniLabel = () => ({
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: B.teal,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 5,
});

const inputStyle = () => ({
  width: '100%',
  padding: '8px 11px',
  border: `1.5px solid ${B.grayMd}`,
  borderRadius: 6,
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: 'white',
});

const tabBtn = (active, color) => ({
  padding: '8px 13px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 6,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  background: active ? color : 'transparent',
  color: active ? 'white' : B.gray,
  border: 'none',
  fontFamily: 'inherit',
});

const btnPrimary = (color) => ({
  padding: '9px 18px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: 7,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const btnSecondary = (color) => ({
  padding: '9px 16px',
  background: 'white',
  color: color,
  border: `1.5px solid ${color}`,
  borderRadius: 7,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const btnSmall = (color) => ({
  padding: '5px 10px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: 5,
  fontWeight: 700,
  fontSize: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
});
