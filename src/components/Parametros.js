import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
};

const PARAMETROS = [
  { key: 'peso', label: 'Peso (kg)', color: '#1E7CB5', normal: '50–90 kg' },
  { key: 'bmi', label: 'IMC (kg/m²)', color: '#0B1F3B', normal: '18.5–24.9' },
  { key: 'pct_grasa', label: '% Grasa corporal', color: '#C25A00', normal: 'H:10–20% M:18–28%' },
  { key: 'masa_muscular', label: 'Masa muscular (kg)', color: '#1A7A4A', normal: '>32 kg' },
  { key: 'cintura', label: 'Cintura (cm)', color: '#B02020', normal: 'H:<94 M:<80' },
  { key: 'cadera', label: 'Cadera (cm)', color: '#7B2D8B', normal: '—' },
  { key: 'fc_reposo', label: 'FC reposo (bpm)', color: '#1E7CB5', normal: '60–100' },
  { key: 'spo2', label: 'SpO2 (%)', color: '#1A7A4A', normal: '≥95%' },
  { key: 'pa_sistolica', label: 'PA sistólica (mmHg)', color: '#B02020', normal: '<120' },
  { key: 'pa_diastolica', label: 'PA diastólica (mmHg)', color: '#C25A00', normal: '<80' },
  { key: 'vo2max', label: 'VO2max (ml/kg/min)', color: '#4B647A', normal: '≥35' },
  { key: 'sit_stand', label: 'Sit & Stand (reps)', color: '#1A7A4A', normal: '≥20' },
  { key: 'dina_d', label: 'Dinamometría D (kg)', color: '#0B1F3B', normal: 'H:35–55 M:20–35' },
  { key: 'masa_grasa', label: 'Masa grasa (kg)', color: '#C25A00', normal: '—' },
  { key: 'agua_corporal', label: 'Agua corporal (L)', color: '#1E7CB5', normal: '—' },
];

const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) : '';

export default function Parametros({ valoraciones, paciente }) {
  const [param1, setParam1] = useState('peso');
  const [param2, setParam2] = useState('bmi');

  // Sort by date ascending for chart
  const sorted = [...valoraciones].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const chartData = sorted.map(v => ({
    fecha: fmtDate(v.fecha),
    fechaFull: v.fecha,
    [param1]: v[param1] ? parseFloat(v[param1]) : null,
    [param2]: param2 !== 'none' && v[param2] ? parseFloat(v[param2]) : null,
  }));

  const p1 = PARAMETROS.find(p => p.key === param1);
  const p2 = PARAMETROS.find(p => p.key === param2);

  // Stats
  const getStats = (key) => {
    const vals = sorted.map(v => v[key] ? parseFloat(v[key]) : null).filter(Boolean);
    if (vals.length === 0) return null;
    const first = vals[0];
    const last = vals[vals.length - 1];
    const diff = last - first;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { first, last, diff, min, max, count: vals.length };
  };

  const stats1 = getStats(param1);
  const stats2 = param2 !== 'none' ? getStats(param2) : null;

  const diffColor = (diff, key) => {
    const negative = ['peso', 'pct_grasa', 'cintura', 'masa_grasa', 'pa_sistolica', 'pa_diastolica', 'bmi'];
    if (diff === 0) return B.gray;
    if (negative.includes(key)) return diff < 0 ? B.green : B.red;
    return diff > 0 ? B.green : B.red;
  };

  return (
    <div>
      <div style={{ background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}`, padding: '20px 22px', marginBottom: 16 }}>
        <p style={{ fontWeight: 800, fontSize: 13, color: B.navy, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1 }}>
          📈 Control de Parámetros
        </p>

        {valoraciones.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: B.gray }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>📊</p>
            <p>Necesitas al menos 2 valoraciones para ver la evolución en el tiempo.</p>
          </div>
        ) : (
          <>
            {/* Selectores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Dato 1
                </label>
                <select value={param1} onChange={e => setParam1(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: `2px solid ${p1?.color || B.blue}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: p1?.color || B.blue, fontWeight: 600 }}>
                  {PARAMETROS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Dato 2 (comparar)
                </label>
                <select value={param2} onChange={e => setParam2(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: `2px solid ${param2 !== 'none' ? (p2?.color || B.orange) : B.grayMd}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: param2 !== 'none' ? (p2?.color || B.orange) : B.gray, fontWeight: 600 }}>
                  <option value="none">— Sin comparar —</option>
                  {PARAMETROS.filter(p => p.key !== param1).map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Gráfica */}
            <div style={{ background: B.grayLt, borderRadius: 10, padding: '16px 8px' }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={B.grayMd} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: B.gray }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: p1?.color || B.blue }} />
                  {param2 !== 'none' && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: p2?.color || B.orange }} />}
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: `1px solid ${B.grayMd}`, fontSize: 12 }}
                    formatter={(value, name) => {
                      const param = PARAMETROS.find(p => p.key === name);
                      return [value, param?.label || name];
                    }}
                  />
                  <Legend formatter={(value) => {
                    const param = PARAMETROS.find(p => p.key === value);
                    return param?.label || value;
                  }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={param1}
                    stroke={p1?.color || B.blue}
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: p1?.color || B.blue }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                  {param2 !== 'none' && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={param2}
                      stroke={p2?.color || B.orange}
                      strokeWidth={2.5}
                      strokeDasharray="5 3"
                      dot={{ r: 5, fill: p2?.color || B.orange }}
                      activeDot={{ r: 7 }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stats comparativas */}
            <div style={{ display: 'grid', gridTemplateColumns: param2 !== 'none' ? '1fr 1fr' : '1fr', gap: 16, marginTop: 16 }}>
              {[
                { stats: stats1, param: p1, key: param1 },
                ...(param2 !== 'none' && stats2 ? [{ stats: stats2, param: p2, key: param2 }] : []),
              ].map(({ stats, param, key }) => stats ? (
                <div key={key} style={{ background: B.grayLt, borderRadius: 10, padding: '14px 16px', borderTop: `3px solid ${param?.color || B.blue}` }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: param?.color || B.blue, margin: '0 0 10px' }}>{param?.label}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[
                      ['Inicial', stats.first, ''],
                      ['Actual', stats.last, ''],
                      ['Cambio', (stats.diff > 0 ? '+' : '') + stats.diff.toFixed(1), diffColor(stats.diff, key)],
                      ['Sesiones', stats.count, ''],
                    ].map(([l, v, c]) => (
                      <div key={l} style={{ background: B.white, borderRadius: 7, padding: '8px 10px', textAlign: 'center' }}>
                        <p style={{ fontSize: 9, color: B.teal, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 3px' }}>{l}</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: c || B.navy, margin: 0 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: B.gray, margin: '8px 0 0' }}>Normal: {param?.normal}</p>
                </div>
              ) : null)}
            </div>
          </>
        )}
      </div>

      {/* Tabla de todas las valoraciones */}
      {valoraciones.length > 0 && (
        <div style={{ background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}`, overflow: 'hidden' }}>
          <div style={{ background: B.navy, padding: '12px 18px' }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
              Tabla de evolución completa
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: B.grayLt }}>
                  {['Fecha', 'Peso', 'IMC', '% Grasa', 'Músculo', 'Cintura', 'SpO2', 'FC rep.', 'VO2max', 'Sit&Stand'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${B.grayMd}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((v, i) => {
                  const prev = i > 0 ? sorted[i-1] : null;
                  const cell = (val, prevVal, key) => {
                    const diff = val && prevVal ? parseFloat(val) - parseFloat(prevVal) : null;
                    const negative = ['peso', 'pct_grasa', 'cintura', 'bmi'].includes(key);
                    const color = diff === null ? B.navy : (diff === 0 ? B.gray : (negative ? (diff < 0 ? B.green : B.red) : (diff > 0 ? B.green : B.red)));
                    return (
                      <td key={key} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${B.grayLt}`, fontSize: 12 }}>
                        <span style={{ color, fontWeight: val ? 600 : 400 }}>{val || '—'}</span>
                        {diff !== null && diff !== 0 && (
                          <span style={{ fontSize: 9, color, display: 'block' }}>{diff > 0 ? '▲' : '▼'}{Math.abs(diff).toFixed(1)}</span>
                        )}
                      </td>
                    );
                  };
                  return (
                    <tr key={v.id} style={{ background: i % 2 === 0 ? 'white' : B.grayLt }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: B.navy, borderBottom: `1px solid ${B.grayLt}` }}>
                        {fmtDate(v.fecha)}
                      </td>
                      {cell(v.peso, prev?.peso, 'peso')}
                      {cell(v.bmi, prev?.bmi, 'bmi')}
                      {cell(v.pct_grasa, prev?.pct_grasa, 'pct_grasa')}
                      {cell(v.masa_muscular, prev?.masa_muscular, 'masa_muscular')}
                      {cell(v.cintura, prev?.cintura, 'cintura')}
                      {cell(v.spo2, prev?.spo2, 'spo2')}
                      {cell(v.fc_reposo, prev?.fc_reposo, 'fc_reposo')}
                      {cell(v.vo2max, prev?.vo2max, 'vo2max')}
                      {cell(v.sit_stand, prev?.sit_stand, 'sit_stand')}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
