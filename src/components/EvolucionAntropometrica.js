// ════════════════════════════════════════════════════════════════════════
// EvolucionAntropometrica.js — Vista de evolución con gráficos SVG
//
// Mezcla mediciones de:
//   - consultas_nutricion_v2 (nuevas)
//   - valoraciones (medicas/fisio existentes)
//
// Genera gráficos de línea nativos en SVG (sin librerías).
//
// Props:
//   - paciente:  {id, nombre, ...}
//   - compacto:  boolean (true = vista resumen, false = vista completa)
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
  amber: '#F59E0B', purple: '#7C3AED', gold: '#C9A86A',
  softGreen: '#E6F5EE', softBlue: '#E8F2FA', softOrange: '#FFF0E0',
  softRed: '#FFEBEB', softPurple: '#F3E8FF',
};

export default function EvolucionAntropometrica({ paciente, compacto = false }) {
  const [mediciones, setMediciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricaActiva, setMetricaActiva] = useState('peso');

  useEffect(() => {
    if (paciente?.id) cargarMediciones();
  }, [paciente?.id]);

  const cargarMediciones = async () => {
    setLoading(true);

    // 1. Consultas nutricionales
    const { data: consultas } = await supabase
      .from('consultas_nutricion_v2')
      .select('id, fecha, peso_kg, talla_cm, imc, grasa_pct, masa_muscular_kg, cintura_cm, cadera_cm, tipo')
      .eq('paciente_id', paciente.id)
      .order('fecha', { ascending: true });

    // 2. Valoraciones médicas/fisio
    const { data: valoraciones } = await supabase
      .from('valoraciones')
      .select('id, fecha, peso, talla, bmi, pct_grasa, masa_muscular, cintura, cadera')
      .eq('paciente_id', paciente.id)
      .order('fecha', { ascending: true });

    // Normalizar a un formato común
    const normalizadas = [
      ...(consultas || []).map(c => ({
        id: 'nut-' + c.id,
        fecha: c.fecha,
        peso: c.peso_kg,
        talla: c.talla_cm,
        imc: c.imc,
        grasa: c.grasa_pct,
        masa_muscular: c.masa_muscular_kg,
        cintura: c.cintura_cm,
        cadera: c.cadera_cm,
        origen: c.tipo === 'anamnesis' ? 'Anamnesis' : 'Consulta nutri',
      })),
      ...(valoraciones || []).map(v => ({
        id: 'val-' + v.id,
        fecha: v.fecha,
        peso: v.peso,
        talla: v.talla,
        imc: v.bmi,
        grasa: v.pct_grasa,
        masa_muscular: v.masa_muscular,
        cintura: v.cintura,
        cadera: v.cadera,
        origen: 'Valoración',
      })),
    ]
      .filter(m => m.peso || m.imc || m.grasa || m.masa_muscular)  // al menos un dato
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    setMediciones(normalizadas);
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: B.gray, fontSize: 13 }}>
        Cargando mediciones...
      </div>
    );
  }

  // Si no hay mediciones suficientes
  if (mediciones.length === 0) {
    return (
      <div style={{
        background: 'white', borderRadius: 12, padding: 40, textAlign: 'center',
        border: `1px solid ${B.grayMd}`,
      }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>📊</div>
        <h4 style={{ color: B.navy, marginBottom: 6, fontSize: 14 }}>Sin mediciones registradas</h4>
        <p style={{ color: B.gray, fontSize: 12 }}>
          Las mediciones aparecerán aquí cuando registres consultas nutricionales o valoraciones.
        </p>
      </div>
    );
  }

  // Calcular comparativas
  const primera = mediciones[0];
  const ultima = mediciones[mediciones.length - 1];

  const metricas = [
    { key: 'peso',          label: 'Peso',          unidad: 'kg', color: B.blue,   mejor: 'menos' },
    { key: 'imc',           label: 'IMC',           unidad: '',   color: B.purple, mejor: 'menos' },
    { key: 'grasa',         label: '% Grasa',       unidad: '%',  color: B.orange, mejor: 'menos' },
    { key: 'masa_muscular', label: 'Masa muscular', unidad: 'kg', color: B.green,  mejor: 'mas' },
  ];

  // === VISTA COMPACTA (para resumen) ===
  if (compacto) {
    return (
      <div style={cardStyle()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontSize: 14, color: B.navy, margin: 0, fontWeight: 700 }}>
            📈 Evolución antropométrica
          </h3>
          <span style={{ fontSize: 11, color: B.gray }}>
            {mediciones.length} mediciones · {formatDate(primera.fecha)} → {formatDate(ultima.fecha)}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {metricas.map(m => {
            const valIni = primera[m.key];
            const valAct = ultima[m.key];
            const dif = valAct && valIni ? (parseFloat(valAct) - parseFloat(valIni)).toFixed(2) : null;
            const esMejora = dif !== null && (
              (m.mejor === 'menos' && parseFloat(dif) < 0) ||
              (m.mejor === 'mas' && parseFloat(dif) > 0)
            );
            return (
              <MiniCard
                key={m.key}
                label={m.label}
                valor={valAct}
                unidad={m.unidad}
                color={m.color}
                diferencia={dif}
                esMejora={esMejora}
              />
            );
          })}
        </div>

        {/* Mini gráfico de peso */}
        {mediciones.filter(m => m.peso).length >= 2 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 10, color: B.gray, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              📉 Tendencia de peso
            </p>
            <GraficoMini mediciones={mediciones.filter(m => m.peso)} campo="peso" color={B.blue} />
          </div>
        )}
      </div>
    );
  }

  // === VISTA COMPLETA ===
  const metricaSeleccionada = metricas.find(m => m.key === metricaActiva) || metricas[0];

  return (
    <div style={{ padding: 4 }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, color: B.navy, fontWeight: 800, margin: 0 }}>
          📈 Evolución Antropométrica
        </h2>
        <p style={{ fontSize: 12, color: B.gray, margin: '4px 0 0' }}>
          {paciente.nombre} {paciente.apellido || ''} · 
          {mediciones.length} mediciones desde {formatDate(primera.fecha)} hasta {formatDate(ultima.fecha)}
        </p>
      </div>

      {/* Tarjetas de comparativas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        {metricas.map(m => {
          const valIni = primera[m.key];
          const valAct = ultima[m.key];
          const dif = valAct && valIni ? (parseFloat(valAct) - parseFloat(valIni)).toFixed(2) : null;
          const difPct = valAct && valIni && parseFloat(valIni) !== 0
            ? ((parseFloat(valAct) - parseFloat(valIni)) / parseFloat(valIni) * 100).toFixed(1)
            : null;
          const esMejora = dif !== null && (
            (m.mejor === 'menos' && parseFloat(dif) < 0) ||
            (m.mejor === 'mas' && parseFloat(dif) > 0)
          );
          return (
            <BigCard
              key={m.key}
              label={m.label}
              valorInicial={valIni}
              valorActual={valAct}
              unidad={m.unidad}
              color={m.color}
              diferencia={dif}
              difPct={difPct}
              esMejora={esMejora}
              activa={metricaActiva === m.key}
              onClick={() => setMetricaActiva(m.key)}
            />
          );
        })}
      </div>

      {/* Gráfico grande de la métrica seleccionada */}
      <div style={cardStyle()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: 14, color: B.navy, margin: 0, fontWeight: 700 }}>
              {metricaSeleccionada.label} en el tiempo
            </h3>
            <p style={{ fontSize: 11, color: B.gray, marginTop: 2 }}>
              Selecciona otra métrica con las tarjetas de arriba ↑
            </p>
          </div>
        </div>
        <GraficoGrande
          mediciones={mediciones.filter(m => m[metricaActiva])}
          campo={metricaActiva}
          color={metricaSeleccionada.color}
          unidad={metricaSeleccionada.unidad}
          label={metricaSeleccionada.label}
        />
      </div>

      {/* Tabla de todas las mediciones */}
      <div style={cardStyle()}>
        <h3 style={{ fontSize: 14, color: B.navy, margin: '0 0 12px', fontWeight: 700 }}>
          📋 Historial completo de mediciones
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
            <thead>
              <tr style={{ background: B.navy, color: 'white' }}>
                <th style={thStyle()}>Fecha</th>
                <th style={thStyle()}>Origen</th>
                <th style={thStyle()}>Peso (kg)</th>
                <th style={thStyle()}>IMC</th>
                <th style={thStyle()}>% Grasa</th>
                <th style={thStyle()}>Músculo (kg)</th>
                <th style={thStyle()}>Cintura</th>
              </tr>
            </thead>
            <tbody>
              {mediciones.map((m, idx) => (
                <tr key={m.id} style={{ background: idx % 2 === 0 ? 'white' : B.grayLt, borderBottom: `1px solid ${B.grayMd}` }}>
                  <td style={tdStyle()}><strong style={{ color: B.navy }}>{formatDate(m.fecha)}</strong></td>
                  <td style={tdStyle()}>
                    <span style={{
                      background: m.origen === 'Valoración' ? B.softBlue : m.origen === 'Anamnesis' ? B.softPurple : B.softGreen,
                      color: m.origen === 'Valoración' ? B.blue : m.origen === 'Anamnesis' ? B.purple : B.green,
                      padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                    }}>{m.origen}</span>
                  </td>
                  <td style={tdStyle()}>{m.peso || '—'}</td>
                  <td style={tdStyle()}>{m.imc || '—'}</td>
                  <td style={tdStyle()}>{m.grasa || '—'}</td>
                  <td style={tdStyle()}>{m.masa_muscular || '—'}</td>
                  <td style={tdStyle()}>{m.cintura || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ════════════════════════════════════════════════════════════════════════

function MiniCard({ label, valor, unidad, color, diferencia, esMejora }) {
  return (
    <div style={{
      background: 'white',
      border: `1px solid ${B.grayMd}`,
      borderRadius: 8,
      padding: 10,
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 9, color: B.gray, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: B.navy, marginTop: 4 }}>
        {valor || '—'}{valor && <span style={{ fontSize: 10, fontWeight: 500, color: B.gray }}> {unidad}</span>}
      </div>
      {diferencia !== null && parseFloat(diferencia) !== 0 && (
        <div style={{
          fontSize: 10, marginTop: 3, fontWeight: 700,
          color: esMejora ? B.green : B.red,
        }}>
          {parseFloat(diferencia) > 0 ? '↑ +' : '↓ '}{Math.abs(parseFloat(diferencia))} {unidad}
        </div>
      )}
    </div>
  );
}

function BigCard({ label, valorInicial, valorActual, unidad, color, diferencia, difPct, esMejora, activa, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        border: activa ? `2px solid ${color}` : `1px solid ${B.grayMd}`,
        borderRadius: 12,
        padding: 14,
        borderTop: `4px solid ${color}`,
        cursor: 'pointer',
        boxShadow: activa ? `0 4px 14px ${color}33` : 'none',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: B.gray, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
        {activa && (
          <span style={{ fontSize: 9, color: color, fontWeight: 700, background: color + '15', padding: '2px 7px', borderRadius: 8 }}>
            ● Mostrando
          </span>
        )}
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, color: B.navy, marginBottom: 6 }}>
        {valorActual || '—'}
        {valorActual && <span style={{ fontSize: 12, fontWeight: 500, color: B.gray, marginLeft: 4 }}>{unidad}</span>}
      </div>

      {diferencia !== null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
          <span style={{ color: B.gray }}>Inicio: <strong style={{ color: B.navy }}>{valorInicial || '—'} {unidad}</strong></span>
          {parseFloat(diferencia) !== 0 && (
            <span style={{
              fontWeight: 700,
              color: esMejora ? B.green : B.red,
              background: esMejora ? B.softGreen : B.softRed,
              padding: '3px 8px', borderRadius: 10,
            }}>
              {parseFloat(diferencia) > 0 ? '↑ +' : '↓ '}{Math.abs(parseFloat(diferencia))} {unidad}
              {difPct && ` (${parseFloat(difPct) > 0 ? '+' : ''}${difPct}%)`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// GRÁFICO MINI — para vista resumen
// ────────────────────────────────────────────────────────────────────────
function GraficoMini({ mediciones, campo, color }) {
  if (mediciones.length < 2) return null;

  const w = 600, h = 80, pad = 8;
  const valores = mediciones.map(m => parseFloat(m[campo])).filter(v => !isNaN(v));
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const range = max - min || 1;

  const puntos = mediciones.map((m, i) => {
    const x = pad + (i / (mediciones.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((parseFloat(m[campo]) - min) / range) * (h - 2 * pad);
    return { x, y, valor: m[campo], fecha: m.fecha };
  });

  const path = puntos.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const areaPath = `${path} L${puntos[puntos.length - 1].x},${h - pad} L${puntos[0].x},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="miniGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#miniGradient)" />
      <path d={path} stroke={color} strokeWidth="2" fill="none" />
      {puntos.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────
// GRÁFICO GRANDE — interactivo con tooltip
// ────────────────────────────────────────────────────────────────────────
function GraficoGrande({ mediciones, campo, color, unidad, label }) {
  const [hover, setHover] = useState(null);

  if (mediciones.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: B.gray, fontSize: 13 }}>
        No hay mediciones de {label} registradas.
      </div>
    );
  }

  if (mediciones.length === 1) {
    const m = mediciones[0];
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: B.gray, marginBottom: 6 }}>Única medición disponible:</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: color }}>{m[campo]} {unidad}</div>
        <div style={{ fontSize: 11, color: B.gray, marginTop: 4 }}>{formatDate(m.fecha)}</div>
        <div style={{ fontSize: 11, color: B.gray, marginTop: 12, fontStyle: 'italic' }}>
          💡 Necesitas al menos 2 mediciones para ver evolución gráfica.
        </div>
      </div>
    );
  }

  const w = 800, h = 320;
  const padX = 50, padY = 30;
  const valores = mediciones.map(m => parseFloat(m[campo])).filter(v => !isNaN(v));
  const minVal = Math.min(...valores);
  const maxVal = Math.max(...valores);
  const range = (maxVal - minVal) || 1;
  // Agregar margen visual al rango
  const yMin = minVal - range * 0.1;
  const yMax = maxVal + range * 0.1;
  const yRange = yMax - yMin;

  const puntos = mediciones.map((m, i) => {
    const x = padX + (i / (mediciones.length - 1)) * (w - 2 * padX);
    const y = h - padY - ((parseFloat(m[campo]) - yMin) / yRange) * (h - 2 * padY);
    return { x, y, valor: m[campo], fecha: m.fecha, origen: m.origen };
  });

  // Líneas guía Y (4 líneas)
  const yLines = [];
  for (let i = 0; i <= 4; i++) {
    const valor = yMin + (yRange * i / 4);
    const y = h - padY - ((valor - yMin) / yRange) * (h - 2 * padY);
    yLines.push({ y, valor: valor.toFixed(1) });
  }

  const path = puntos.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const areaPath = `${path} L${puntos[puntos.length - 1].x},${h - padY} L${puntos[0].x},${h - padY} Z`;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="auto" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="bigGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid Y */}
        {yLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padX} y1={line.y} x2={w - padX} y2={line.y}
              stroke={B.grayMd} strokeWidth="1" strokeDasharray="3,4" opacity="0.6"
            />
            <text x={padX - 8} y={line.y + 4} fontSize="10" fill={B.gray} textAnchor="end" fontFamily="inherit">
              {line.valor}
            </text>
          </g>
        ))}

        {/* Eje X bottom line */}
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke={B.grayMd} strokeWidth="1.5" />

        {/* Área */}
        <path d={areaPath} fill="url(#bigGradient)" />

        {/* Línea */}
        <path d={path} stroke={color} strokeWidth="2.5" fill="none" />

        {/* Puntos */}
        {puntos.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
            <circle cx={p.x} cy={p.y} r={hover === p ? 6 : 4} fill="white" stroke={color} strokeWidth="2.5" />
          </g>
        ))}

        {/* Tooltip */}
        {hover && (
          <g>
            <rect
              x={Math.min(Math.max(hover.x - 60, 5), w - 125)}
              y={hover.y - 56}
              width="120" height="46" rx="6"
              fill={B.navy} opacity="0.95"
            />
            <text
              x={Math.min(Math.max(hover.x, 65), w - 65)}
              y={hover.y - 36}
              fontSize="13" fontWeight="700" fill="white" textAnchor="middle" fontFamily="inherit"
            >
              {hover.valor} {unidad}
            </text>
            <text
              x={Math.min(Math.max(hover.x, 65), w - 65)}
              y={hover.y - 19}
              fontSize="10" fill={B.gold} textAnchor="middle" fontFamily="inherit"
            >
              {formatDate(hover.fecha)}
            </text>
          </g>
        )}
      </svg>

      {/* Labels de fecha en eje X */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 50, paddingRight: 30, marginTop: -8 }}>
        <span style={{ fontSize: 10, color: B.gray }}>{formatDate(mediciones[0].fecha)}</span>
        {mediciones.length > 2 && (
          <span style={{ fontSize: 10, color: B.gray }}>
            {mediciones.length} mediciones
          </span>
        )}
        <span style={{ fontSize: 10, color: B.gray }}>{formatDate(mediciones[mediciones.length - 1].fecha)}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────
const cardStyle = () => ({
  background: 'white',
  border: `1px solid ${B.grayMd}`,
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
});

const thStyle = () => ({
  padding: '8px 10px',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  textAlign: 'left',
});

const tdStyle = () => ({
  padding: '8px 10px',
  fontSize: 11,
  color: B.navy,
});

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}
