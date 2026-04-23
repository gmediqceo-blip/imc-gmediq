// ─── COMPONENTES DE FORMULARIO COMPARTIDOS ────────────────────────────────────
// IMPORTANTE: Estos componentes DEBEN estar definidos en este archivo separado.
// Si se definen dentro de otro componente, React los recrea en cada render
// y los inputs pierden el foco al escribir.

const B = {
  teal: '#4B647A', grayMd: '#DDE3EA', navy: '#0B1F3B',
  grayLt: '#F4F6F8', red: '#B02020', white: '#FFFFFF',
};

export const Field = ({ label, value, onChange, type = 'text', opts, half, hint, readOnly, required }) => (
  <div style={{ flex: half ? '0 0 48%' : '0 0 100%', marginBottom: 13 }}>
    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
      {label}{required && <span style={{ color: B.red }}> *</span>}
    </label>
    {opts ? (
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, color: B.navy, background: B.white, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, color: B.navy, background: readOnly ? B.grayLt : B.white, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
    )}
    {hint && <p style={{ fontSize: 10, color: B.teal, margin: '3px 0 0', opacity: 0.8 }}>{hint}</p>}
  </div>
);

export const TextArea = ({ label, value, onChange, rows = 3 }) => (
  <div style={{ flex: '0 0 100%', marginBottom: 13 }}>
    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, color: B.navy, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
    />
  </div>
);

export const SectionTitle = ({ children, color = '#0B1F3B' }) => (
  <div style={{ borderLeft: '4px solid #1E7CB5', paddingLeft: 10, marginBottom: 14, marginTop: 22 }}>
    <p style={{ fontWeight: 800, fontSize: 11, color, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>{children}</p>
  </div>
);

export const FieldRow = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>{children}</div>
);
