// ═══════════════════════════════════════════════════════════════════════
// HeaderMobileV2 — Topbar para móvil con hamburguesa
// Solo aparece en resoluciones < 768px
// ═══════════════════════════════════════════════════════════════════════

import { Icon, Inicial } from './Icon';

export default function HeaderMobileV2({ usuario, menuAbierto, onToggleMenu, onAbrirPerfil }) {
  return (
    <div
      style={{
        background: 'var(--ink)',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <img
        src="/logo-imc-blanco.png"
        alt="IMC"
        style={{ height: 32, width: 'auto' }}
      />

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {usuario && (
          <div
            onClick={onAbrirPerfil}
            title="Ver mi perfil"
            style={{ cursor: 'pointer' }}
          >
            <Inicial nombre={usuario.nombre} size={32} tone="strong" />
          </div>
        )}
        <button
          onClick={onToggleMenu}
          style={{
            width: 40,
            height: 40,
            border: 'none',
            borderRadius: 9,
            background: 'rgba(255,255,255,.08)',
            color: '#fff',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={menuAbierto ? 'x' : 'menu'} size={20} />
        </button>
      </div>
    </div>
  );
}
