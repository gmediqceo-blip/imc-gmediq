import { Component } from 'react';

// ═══════════════════════════════════════════════════════════════════════
// ErrorBoundary — cerco para una sección.
//
// Sin esto, un error dentro de cualquier componente tumba TODA la app y
// deja la pantalla en blanco. Envolviendo una sección, el daño queda
// encerrado ahí: el resto de la clínica sigue funcionando.
//
// Tiene que ser clase: los hooks no pueden capturar errores de render.
// ═══════════════════════════════════════════════════════════════════════

const B = { navy: '#0B1F3B', gray: '#6E6E70', grayMd: '#DDE3EA', red: '#B02020' };

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Queda en la consola para poder diagnosticarlo después.
    console.error(`[${this.props.seccion || 'sección'}]`, error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ padding: 24, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <div style={{
          background: 'white', border: `1px solid ${B.grayMd}`, borderRadius: 12,
          padding: '24px 22px', maxWidth: 520,
        }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: B.navy }}>
            Esta sección tuvo un problema
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: B.gray, lineHeight: 1.6 }}>
            El resto de la app sigue funcionando con normalidad. Puedes volver a
            intentarlo o cambiar de sección desde el menú.
          </p>
          <p style={{
            margin: '14px 0 0', fontSize: 12, color: B.red,
            fontFamily: 'ui-monospace, Menlo, monospace', wordBreak: 'break-word',
          }}>
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 18, padding: '10px 22px', fontSize: 13, fontWeight: 700,
              color: 'white', background: B.navy, border: 'none', borderRadius: 8,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }
}
