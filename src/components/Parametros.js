import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const fmtShort = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) : '';
const fmtFull = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const toF = v => v ? parseFloat(v) : null;

export default function Parametros({ valoraciones, consultasMed, paciente }) {
  const [param1, setParam1] = useState('peso');
  const [param2, setParam2] = useState('bmi');

  const todas = [
    ...valoraciones.map(v => ({
      fecha: v.fecha, fuente: 'Fisioterapia',
      peso: toF(v.peso), bmi: toF(v.bmi), pct_grasa: toF(v.pct_grasa),
      masa_muscular: toF(v.masa_muscular), masa_grasa: toF(v.masa_grasa),
      agua_corporal: toF(v.agua_corporal), cintura: toF(v.cintura), cadera: toF(v.cadera),
      fc_reposo: toF(v.fc_reposo), spo2: toF(v.spo2),
      pa_sistolica: toF(v.pa_sistolica), pa_diastolica: toF(v.pa_diastolica),
      vo2max: toF(v.vo2max), sit_stand: toF(v.sit_stand), dina_d: toF(v.dina_d),
    })),
    ...(consultasMed || []).map(c => ({
      fecha: c.fecha, fuente: 'Médico',
      peso: toF(c.peso), bmi: toF(c.bmi), cintura: toF(c.cintura),
      pa_sistolica: toF(c.pa_sistolica), pa_diastolica: toF(c.pa_diastolica),
      fc_reposo: toF(c.fc), spo2: toF(c.spo2),
      pct_grasa: null, masa_muscular: null, masa_grasa: null,
      agua_corporal: null, cadera: null, vo2max: null, sit_stand: null, dina_d: null,
    })),
  ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const chartData = todas.map(m => ({
    fecha: fmtShort(m.fecha), fuente: m.fuente,
    [param1]: m[param1],
    ...(param2 !== 'none' ? { [param2]: m[param2] } : {}),
  }));

  const p1 = PARAMETROS.find(p => p.key === param1);
  const p2 = PARAMETROS.find(p => p.key === param2);

  const getStats = key => {
    const vals = todas.map(m => m[key]).filter(v => v !== null && v !== undefined && !isNaN(v));
    if (!vals.length) return null;
    return { first: vals[0], last: vals[vals.length-1], diff: vals[vals.length-1] - vals[0], count: vals.length };
  };

  const stats1 = getStats(param1);
  const stats2 = param2 !== 'none' ? getStats(param2) : null;

  const negKeys = ['peso','pct_grasa','cintura','masa_grasa','pa_sistolica','pa_diastolica','bmi'];
  const diffColor = (diff, key) => !diff || diff === 0 ? B.gray : (negKeys.includes(key) ? (diff < 0 ? B.green : B.red) : (diff > 0 ? B.green : B.red));

  return (
    <div>
      <div style={{ background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}`, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontWeight: 800, fontSize: 13, color: B.navy, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>📈 Control de Parámetros</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ background: B.blue+'22', color: B.blue, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>🏃 {valoraciones.length} fisio</span>
            <span style={{ background: B.teal+'22', color: B.teal, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>🩺 {(consultasMed||[]).length} médico</span>
          </div>
        </div>

        {todas.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: B.gray }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>📊</p>
            <p>Necesitas al menos 2 registros para ver la evolución.</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Actualmente: {todas.length} registro{todas.length !== 1 ? 's' : ''} (fisioterapia + médico)</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[{ val: param1, set: setParam1, label: 'Dato 1', color: p1?.color || B.blue, other: null },
                { val: param2, set: setParam2, label: 'Dato 2 (comparar)', color: param2 !== 'none' ? (p2?.color || B.orange) : B.grayMd, other: param1 }
              ].map(({ val, set, label, color, other }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</label>
                  <select value={val} onChange={e => set(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: `2px solid ${color}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', color, fontWeight: 600 }}>
                    {other !== null && <option value="none">— Sin comparar —</option>}
                    {PARAMETROS.filter(p => p.key !== other).map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ background: B.grayLt, borderRadius: 10, padding: '16px 8px' }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={B.grayMd} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: p1?.color || B.blue }} />
                  {param2 !== 'none' && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: p2?.color || B.orange }} />}
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [v, PARAMETROS.find(p => p.key === n)?.label || n]} />
                  <Legend formatter={n => PARAMETROS.find(p => p.key === n)?.label || n} />
                  <Line yAxisId="left" type="monotone" dataKey={param1} stroke={p1?.color || B.blue} strokeWidth={2.5} dot={{ r: 5 }} connectNulls />
                  {param2 !== 'none' && <Line yAxisId="right" type="monotone" dataKey={param2} stroke={p2?.color || B.orange} strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 5 }} connectNulls />}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: param2 !== 'none' ? '1fr 1fr' : '1fr', gap: 16, marginTop: 16 }}>
              {[{ stats: stats1, param: p1, key: param1 }, ...(param2 !== 'none' && stats2 ? [{ stats: stats2, param: p2, key: param2 }] : [])].map(({ stats, param, key }) => !stats ? null : (
                <div key={key} style={{ background: B.grayLt, borderRadius: 10, padding: '14px 16px', borderTop: `3px solid ${param?.color || B.blue}` }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: param?.color || B.blue, margin: '0 0 10px' }}>{param?.label}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[['Inicial', stats.first?.toFixed(1)], ['Actual', stats.last?.toFixed(1)],
                      ['Cambio', (stats.diff > 0 ? '+' : '') + stats.diff?.toFixed(1)], ['Registros', stats.count]].map(([l, v], i) => (
                      <div key={l} style={{ background: B.white, borderRadius: 7, padding: '8px 10px', textAlign: 'center' }}>
                        <p style={{ fontSize: 9, color: B.teal, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 3px' }}>{l}</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: i === 2 ? diffColor(stats.diff, key) : B.navy, margin: 0 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: B.gray, margin: '8px 0 0' }}>Referencia: {param?.normal}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tabla completa */}
      {todas.length > 0 && (
        <div style={{ background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}`, overflow: 'hidden' }}>
          <div style={{ background: B.navy, padding: '12px 18px' }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Tabla de evolución completa</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: B.grayLt }}>
                  {['Fecha','Fuente','Peso','IMC','% Grasa','Músculo','Cintura','SpO2','FC','PA','VO2max'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', borderBottom: `2px solid ${B.grayMd}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todas.map((m, i) => {
                  const prev = i > 0 ? todas[i-1] : null;
                  const cell = (val, prevVal, key) => {
                    const diff = val && prevVal ? val - prevVal : null;
                    const c = diffColor(diff, key);
                    return (
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${B.grayLt}`, fontSize: 12 }}>
                        <span style={{ color: val ? c : B.gray, fontWeight: val ? 600 : 400 }}>{val ? val.toFixed(1) : '—'}</span>
                        {diff !== null && Math.abs(diff) > 0.01 && <span style={{ fontSize: 9, color: c, display: 'block' }}>{diff > 0 ? '▲' : '▼'}{Math.abs(diff).toFixed(1)}</span>}
                      </td>
                    );
                  };
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'white' : B.grayLt }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: B.navy, borderBottom: `1px solid ${B.grayLt}` }}>{fmtFull(m.fecha)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${B.grayLt}` }}>
                        <span style={{ fontSize: 10, background: m.fuente === 'Fisioterapia' ? B.blue+'22' : B.teal+'22', color: m.fuente === 'Fisioterapia' ? B.blue : B.teal, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                          {m.fuente === 'Fisioterapia' ? '🏃' : '🩺'} {m.fuente}
                        </span>
                      </td>
                      {cell(m.peso, prev?.peso, 'peso')}
                      {cell(m.bmi, prev?.bmi, 'bmi')}
                      {cell(m.pct_grasa, prev?.pct_grasa, 'pct_grasa')}
                      {cell(m.masa_muscular, prev?.masa_muscular, 'masa_muscular')}
                      {cell(m.cintura, prev?.cintura, 'cintura')}
                      {cell(m.spo2, prev?.spo2, 'spo2')}
                      {cell(m.fc_reposo, prev?.fc_reposo, 'fc_reposo')}
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${B.grayLt}`, fontSize: 12 }}>
                        {m.pa_sistolica && m.pa_diastolica ? `${m.pa_sistolica}/${m.pa_diastolica}` : '—'}
                      </td>
                      {cell(m.vo2max, prev?.vo2max, 'vo2max')}
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
