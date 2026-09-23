// ════════════════════════════════════════════════════════════════════════
// EvolucionAntropometrica.js — evolución con gráficos SVG nativos, capa v2.
//
// Lo que NO cambió: props (paciente, compacto), cargarMediciones (mezcla
// consultas_nutricion_v2 + valoraciones), la normalización a formato común,
// el marcado de mejora por métrica (peso/imc/grasa bajan = bien; músculo sube
// = bien), los dos modos (compacto en Resumen / completo en su pestaña), y los
// gráficos SVG hechos a mano con su tooltip.
//
// Cambia la presentación: tokens, iconos Lucide en vez de emoji, tabular-nums.
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from './v2/Icon';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#7C8DA1',
  grayLt: '#FAFCFE', grayMd: '#E6EDF6', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
  amber: '#B87503', purple: '#7C3AED', gold: '#9FB6CC',
  softGreen: '#EDF9F2', softBlue: '#EFF6FC', softOrange: '#FFF4EA',
  softRed: '#FBEAEA', softPurple: '#F5EEFF',
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
    const { data: consultas } = await supabase
      .from('consultas_nutricion_v2')
      .select('id, fecha, peso_kg, talla_cm, imc, grasa_pct, masa_muscular_kg, cintura_cm, cadera_cm, tipo')
      .eq('paciente_id', paciente.id)
      .order('fecha', { ascending: true });
    const { data: valoraciones } = await supabase
      .from('valoraciones')
      .select('id, fecha, peso, talla, bmi, pct_grasa, masa_muscular, cintura, cadera')
      .eq('paciente_id', paciente.id)
      .order('fecha', { ascending: true });

    const normalizadas = [
      ...(consultas || []).map(c => ({
        id: 'nut-' + c.id, fecha: c.fecha, peso: c.peso_kg, talla: c.talla_cm, imc: c.imc,
        grasa: c.grasa_pct, masa_muscular: c.masa_muscular_kg, cintura: c.cintura_cm, cadera: c.cadera_cm,
        origen: c.tipo === 'anamnesis' ? 'Anamnesis' : 'Consulta nutri',
      })),
      ...(valoraciones || []).map(v => ({
        id: 'val-' + v.id, fecha: v.fecha, peso: v.peso, talla: v.talla, imc: v.bmi,
        grasa: v.pct_grasa, masa_muscular: v.masa_muscular, cintura: v.cintura, cadera: v.cadera,
        origen: 'Valoración',
      })),
    ]
      .filter(m => m.peso || m.imc || m.grasa || m.masa_muscular)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    setMediciones(normalizadas);
    setLoading(false);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: B.gray, fontSize: 13, fontFamily: FUENTE }}>Cargando mediciones…</div>;
  }

  if (mediciones.length === 0) {
    return (
      <div style={{ ...cardStyle(), padding: 48, textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: B.softBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Icon name="trending-up" size={22} color={B.blue} />
        </span>
        <h4 style={{ color: B.navy, margin: '0 0 6px', fontSize: 15, fontWeight: 600 }}>Sin mediciones registradas</h4>
        <p style={{ color: B.gray, fontSize: 13, margin: 0 }}>
          Aparecerán aquí cuando registres consultas nutricionales o valoraciones.
        </p>
      </div>
    );
  }

  const primera = mediciones[0];
  const ultima = mediciones[mediciones.length - 1];
  const metricas = [
    { key: 'peso', label: 'Peso', unidad: 'kg', color: B.blue, mejor: 'menos' },
    { key: 'imc', label: 'IMC', unidad: '', color: B.purple, mejor: 'menos' },
    { key: 'grasa', label: '% Grasa', unidad: '%', color: B.orange, mejor: 'menos' },
    { key: 'masa_muscular', label: 'Masa muscular', unidad: 'kg', color: B.green, mejor: 'mas' },
  ];

  // === VISTA COMPACTA ===
  if (compacto) {
    return (
      <div style={cardStyle()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <p style={eyebrow}>Evolución antropométrica</p>
          <span style={{ fontSize: 11.5, color: B.gray }}>
            {mediciones.length} mediciones · {formatDate(primera.fecha)} → {formatDate(ultima.fecha)}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {metricas.map(m => {
            const valIni = primera[m.key], valAct = ultima[m.key];
            const dif = valAct && valIni ? (parseFloat(valAct) - parseFloat(valIni)).toFixed(2) : null;
            const esMejora = dif !== null && ((m.mejor === 'menos' && parseFloat(dif) < 0) || (m.mejor === 'mas' && parseFloat(dif) > 0));
            return <MiniCard key={m.key} label={m.label} valor={valAct} unidad={m.unidad} color={m.color} diferencia={dif} esMejora={esMejora} />;
          })}
        </div>
        {mediciones.filter(m => m.peso).length >= 2 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ ...eyebrow, marginBottom: 6 }}>Tendencia de peso</p>
            <GraficoMini mediciones={mediciones.filter(m => m.peso)} campo="peso" color={B.blue} />
          </div>
        )}
      </div>
    );
  }

  // === VISTA COMPLETA ===
  const metricaSeleccionada = metricas.find(m => m.key === metricaActiva) || metricas[0];

  return (
    <div style={{ padding: 4, fontFamily: FUENTE, color: B.navy }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, color: B.navy, fontWeight: 600, letterSpacing: '-.01em', margin: 0 }}>Evolución antropométrica</h2>
        <p style={{ fontSize: 12.5, color: B.gray, margin: '4px 0 0' }}>
          {paciente.nombre} {paciente.apellido || ''} · {mediciones.length} mediciones desde {formatDate(primera.fecha)} hasta {formatDate(ultima.fecha)}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        {metricas.map(m => {
          const valIni = primera[m.key], valAct = ultima[m.key];
          const dif = valAct && valIni ? (parseFloat(valAct) - parseFloat(valIni)).toFixed(2) : null;
          const difPct = valAct && valIni && parseFloat(valIni) !== 0 ? ((parseFloat(valAct) - parseFloat(valIni)) / parseFloat(valIni) * 100).toFixed(1) : null;
          const esMejora = dif !== null && ((m.mejor === 'menos' && parseFloat(dif) < 0) || (m.mejor === 'mas' && parseFloat(dif) > 0));
          return <BigCard key={m.key} label={m.label} valorInicial={valIni} valorActual={valAct} unidad={m.unidad} color={m.color} diferencia={dif} difPct={difPct} esMejora={esMejora} activa={metricaActiva === m.key} onClick={() => setMetricaActiva(m.key)} />;
        })}
      </div>

      <div style={cardStyle()}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, color: B.navy, margin: 0, fontWeight: 600, letterSpacing: '-.01em' }}>{metricaSeleccionada.label} en el tiempo</h3>
          <p style={{ fontSize: 12, color: B.gray, marginTop: 3 }}>Selecciona otra métrica en las tarjetas de arriba</p>
        </div>
        <GraficoGrande mediciones={mediciones.filter(m => m[metricaActiva])} campo={metricaActiva} color={metricaSeleccionada.color} unidad={metricaSeleccionada.unidad} label={metricaSeleccionada.label} />
      </div>

      <div style={cardStyle()}>
        <h3 style={{ fontSize: 15, color: B.navy, margin: '0 0 14px', fontWeight: 600, letterSpacing: '-.01em' }}>Historial completo de mediciones</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 600 }}>
            <thead>
              <tr>
                {['Fecha', 'Origen', 'Peso (kg)', 'IMC', '% Grasa', 'Músculo (kg)', 'Cintura (cm)'].map((h, i) => (
                  <th key={h} style={{ ...thStyle(), textAlign: i < 2 ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mediciones.slice().reverse().map((m) => (
                <tr key={m.id} className="v2-row" style={{ borderBottom: `1px solid ${B.grayMd}` }}>
                  <td style={{ ...tdStyle(), fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDate(m.fecha)}</td>
                  <td style={tdStyle()}><OrigenTag origen={m.origen} /></td>
                  {['peso', 'imc', 'grasa', 'masa_muscular', 'cintura'].map(k => (
                    <td key={k} style={{ ...tdStyle(), textAlign: 'right', color: B.teal, fontVariantNumeric: 'tabular-nums' }}>{m[k] || '—'}</td>
                  ))}
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
const FUENTE = "'Poppins', system-ui, sans-serif";
const eyebrow = { fontSize: 10.5, fontWeight: 600, color: B.gray, textTransform: 'uppercase', letterSpacing: '.12em', margin: 0 };

function OrigenTag({ origen }) {
  const map = {
    'Valoración': { bg: B.softBlue, fg: B.blue },
    'Anamnesis': { bg: B.softPurple, fg: B.purple },
    'Consulta nutri': { bg: B.softGreen, fg: B.green },
  };
  const t = map[origen] || map['Consulta nutri'];
  return <span style={{ display: 'inline-flex', height: 22, alignItems: 'center', background: t.bg, color: t.fg, padding: '0 9px', borderRadius: 7, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>{origen}</span>;
}

function MiniCard({ label, valor, unidad, color, diferencia, esMejora }) {
  return (
    <div style={{ background: B.white, border: `1px solid ${B.grayMd}`, borderRadius: 12, padding: '13px 14px' }}>
      <div style={{ fontSize: 11, color: B.gray, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: B.navy, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>
        {valor || '—'}{valor && <span style={{ fontSize: 11, fontWeight: 400, color: B.gray }}> {unidad}</span>}
      </div>
      {diferencia !== null && parseFloat(diferencia) !== 0 && (
        <div style={{ fontSize: 11, marginTop: 5, fontWeight: 600, color: esMejora ? B.green : B.red }}>
          {parseFloat(diferencia) > 0 ? '↑ +' : '↓ '}{Math.abs(parseFloat(diferencia))} {unidad}
        </div>
      )}
    </div>
  );
}

function BigCard({ label, valorInicial, valorActual, unidad, color, diferencia, difPct, esMejora, activa, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: B.white, border: activa ? `1px solid ${color}` : `1px solid ${B.grayMd}`, borderRadius: 14,
      padding: '15px 17px', cursor: 'pointer', boxShadow: activa ? `0 0 0 3px ${color}1F` : 'var(--sh-1)', transition: 'all .16s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
        <span style={{ fontSize: 12, color: B.gray }}>{label}</span>
        {activa && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color, fontWeight: 500 }}><span style={{ width: 5, height: 5, borderRadius: 3, background: color }} /> Mostrando</span>}
      </div>
      <div style={{ fontSize: 23, fontWeight: 600, color: B.navy, letterSpacing: '-.02em', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
        {valorActual || '—'}{valorActual && <span style={{ fontSize: 12, fontWeight: 400, color: B.gray, marginLeft: 4 }}>{unidad}</span>}
      </div>
      {diferencia !== null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: B.gray }}>Inicio: <strong style={{ color: B.navy, fontWeight: 600 }}>{valorInicial || '—'} {unidad}</strong></span>
          {parseFloat(diferencia) !== 0 && (
            <span style={{ fontWeight: 600, color: esMejora ? B.green : B.red, background: esMejora ? B.softGreen : B.softRed, padding: '3px 8px', borderRadius: 8 }}>
              {parseFloat(diferencia) > 0 ? '↑ +' : '↓ '}{Math.abs(parseFloat(diferencia))} {unidad}{difPct && ` (${parseFloat(difPct) > 0 ? '+' : ''}${difPct}%)`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function GraficoMini({ mediciones, campo, color }) {
  if (mediciones.length < 2) return null;
  const w = 600, h = 80, pad = 8;
  const valores = mediciones.map(m => parseFloat(m[campo])).filter(v => !isNaN(v));
  const min = Math.min(...valores), max = Math.max(...valores), range = max - min || 1;
  const puntos = mediciones.map((m, i) => ({
    x: pad + (i / (mediciones.length - 1)) * (w - 2 * pad),
    y: h - pad - ((parseFloat(m[campo]) - min) / range) * (h - 2 * pad),
  }));
  const path = puntos.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const areaPath = `${path} L${puntos[puntos.length - 1].x},${h - pad} L${puntos[0].x},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="miniGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#miniGradient)" />
      <path d={path} stroke={color} strokeWidth="2" fill="none" />
      {puntos.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="2" />)}
    </svg>
  );
}

function GraficoGrande({ mediciones, campo, color, unidad, label }) {
  const [hover, setHover] = useState(null);
  if (mediciones.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: B.gray, fontSize: 13 }}>No hay mediciones de {label} registradas.</div>;
  }
  if (mediciones.length === 1) {
    const m = mediciones[0];
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 11.5, color: B.gray, marginBottom: 6 }}>Única medición disponible:</div>
        <div style={{ fontSize: 28, fontWeight: 600, color }}>{m[campo]} {unidad}</div>
        <div style={{ fontSize: 11.5, color: B.gray, marginTop: 4 }}>{formatDate(m.fecha)}</div>
        <div style={{ fontSize: 11.5, color: B.gray, marginTop: 12 }}>Se necesitan al menos 2 mediciones para ver evolución gráfica.</div>
      </div>
    );
  }
  const w = 800, h = 320, padX = 50, padY = 30;
  const valores = mediciones.map(m => parseFloat(m[campo])).filter(v => !isNaN(v));
  const minVal = Math.min(...valores), maxVal = Math.max(...valores), range = (maxVal - minVal) || 1;
  const yMin = minVal - range * 0.1, yMax = maxVal + range * 0.1, yRange = yMax - yMin;
  const puntos = mediciones.map((m, i) => ({
    x: padX + (i / (mediciones.length - 1)) * (w - 2 * padX),
    y: h - padY - ((parseFloat(m[campo]) - yMin) / yRange) * (h - 2 * padY),
    valor: m[campo], fecha: m.fecha,
  }));
  const yLines = [];
  for (let i = 0; i <= 4; i++) {
    const valor = yMin + (yRange * i / 4);
    yLines.push({ y: h - padY - ((valor - yMin) / yRange) * (h - 2 * padY), valor: valor.toFixed(1) });
  }
  const path = puntos.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const areaPath = `${path} L${puntos[puntos.length - 1].x},${h - padY} L${puntos[0].x},${h - padY} Z`;
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="auto" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="bigGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yLines.map((line, i) => (
          <g key={i}>
            <line x1={padX} y1={line.y} x2={w - padX} y2={line.y} stroke={B.grayMd} strokeWidth="1" strokeDasharray="3,4" opacity="0.7" />
            <text x={padX - 8} y={line.y + 4} fontSize="10" fill={B.gray} textAnchor="end" fontFamily="inherit">{line.valor}</text>
          </g>
        ))}
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke={B.grayMd} strokeWidth="1.5" />
        <path d={areaPath} fill="url(#bigGradient)" />
        <path d={path} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {puntos.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
            <circle cx={p.x} cy={p.y} r={hover === p ? 6 : 4} fill="white" stroke={color} strokeWidth="2.5" />
          </g>
        ))}
        {hover && (
          <g>
            <rect x={Math.min(Math.max(hover.x - 60, 5), w - 125)} y={hover.y - 56} width="120" height="46" rx="9" fill={B.navy} opacity="0.96" />
            <text x={Math.min(Math.max(hover.x, 65), w - 65)} y={hover.y - 36} fontSize="13" fontWeight="700" fill="white" textAnchor="middle" fontFamily="inherit">{hover.valor} {unidad}</text>
            <text x={Math.min(Math.max(hover.x, 65), w - 65)} y={hover.y - 19} fontSize="10" fill={B.gold} textAnchor="middle" fontFamily="inherit">{formatDate(hover.fecha)}</text>
          </g>
        )}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 50, paddingRight: 30, marginTop: -8 }}>
        <span style={{ fontSize: 10, color: B.gray }}>{formatDate(mediciones[0].fecha)}</span>
        {mediciones.length > 2 && <span style={{ fontSize: 10, color: B.gray }}>{mediciones.length} mediciones</span>}
        <span style={{ fontSize: 10, color: B.gray }}>{formatDate(mediciones[mediciones.length - 1].fecha)}</span>
      </div>
    </div>
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────────
const cardStyle = () => ({ background: B.white, border: `1px solid ${B.grayMd}`, borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: 'var(--sh-1)', fontFamily: FUENTE });
const thStyle = () => ({ padding: '10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: B.gray, borderBottom: `1px solid ${B.grayMd}` });
const tdStyle = () => ({ padding: '10px', fontSize: 12.5, color: B.navy });

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}
