// ─── COMPONENTES DE FORMULARIO COMPARTIDOS ────────────────────────────────────
// IMPORTANTE: Estos componentes DEBEN estar definidos en este archivo separado.
// Si se definen dentro de otro componente, React los recrea en cada render
// y los inputs pierden el foco al escribir.
//
// Capa visual v2 ("clínico premium", aprobada 04/08/2026):
//   · la etiqueta deja las MAYÚSCULAS de 10px con tracking y queda en 11px normal;
//   · el control sube a 40px de alto con radio de 10 y borde de 1px;
//   · el foco se marca con anillo de acento, que antes no existía (outline: none
//     dejaba los campos sin ninguna señal de foco — un problema de accesibilidad);
//   · el encabezado de sección deja el filete azul de 4px por una línea inferior.

const FOCO = '0 0 0 3px rgba(30,124,181,.12)';

const baseControl = {
  width: '100%', height: 40, padding: '0 11px',
  border: '1px solid var(--line)', borderRadius: 10,
  fontSize: 13.5, color: 'var(--ink)', background: 'var(--surface)',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color .14s ease, box-shadow .14s ease',
};

const etiqueta = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
  letterSpacing: '.06em', marginBottom: 6,
};

const alFoco = e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = FOCO; };
const alSalir = e => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; };

export const Field = ({ label, value, onChange, type = 'text', opts, half, hint, readOnly, required }) => (
  <div style={{ flex: half ? '0 0 48%' : '0 0 100%', marginBottom: 14 }}>
    <label style={etiqueta}>
      {label}{required && <span style={{ color: '#B02020' }}> *</span>}
    </label>
    {opts ? (
      <select value={value} onChange={e => onChange(e.target.value)}
        onFocus={alFoco} onBlur={alSalir} style={baseControl}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        onFocus={readOnly ? undefined : alFoco}
        onBlur={readOnly ? undefined : alSalir}
        style={{
          ...baseControl,
          background: readOnly ? 'var(--surface-2)' : 'var(--surface)',
          color: readOnly ? 'var(--ink-2)' : 'var(--ink)',
          cursor: readOnly ? 'default' : 'text',
          // Las cifras clínicas se comparan en columna: ancho de dígito fijo.
          fontVariantNumeric: type === 'number' ? 'tabular-nums' : 'normal',
        }}
      />
    )}
    {hint && <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '5px 0 0', lineHeight: 1.4 }}>{hint}</p>}
  </div>
);

export const TextArea = ({ label, value, onChange, rows = 3 }) => (
  <div style={{ flex: '0 0 100%', marginBottom: 14 }}>
    <label style={etiqueta}>{label}</label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      onFocus={alFoco} onBlur={alSalir}
      style={{ ...baseControl, height: 'auto', padding: '10px 11px', resize: 'vertical', lineHeight: 1.55 }}
    />
  </div>
);

export const SectionTitle = ({ children, color }) => (
  <div style={{ marginBottom: 16, marginTop: 24, paddingBottom: 8, borderBottom: '1px solid var(--line-soft)' }}>
    <p style={{ fontWeight: 600, fontSize: 10.5, color: color || 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.12em', margin: 0 }}>
      {children}
    </p>
  </div>
);

export const FieldRow = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4%' }}>{children}</div>
);
