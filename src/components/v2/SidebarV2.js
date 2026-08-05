// ═══════════════════════════════════════════════════════════════════════
// Sidebar V2 — Navegación lateral izquierda con trama hexagonal
// Adaptado del mockup Sidebar.jsx (sin selector demo)
// ═══════════════════════════════════════════════════════════════════════

import { Icon, Inicial } from './Icon';

const NAV = [
  { grupo: 'Clínica', items: [
    { key: 'pacientes', label: 'Pacientes', icon: 'users' },
    { key: 'agenda', label: 'Agenda', icon: 'calendar-days' },
  ]},
  { grupo: 'Recursos', items: [
    { key: 'banco_ejercicios', label: 'Ejercicios', icon: 'dumbbell' },
    { key: 'usuarios', label: 'Equipo', icon: 'user-cog' },
  ]},
];

const ROL_LABEL = {
  admin: 'Administrador',
  fisioterapeuta: 'Fisioterapeuta',
  medico: 'Médico',
  nutricionista: 'Nutricionista',
  secretaria: 'Secretaria',
  cosmetologa: 'Cosmetóloga',
};

export default function SidebarV2({ active, onSelect, usuario, onLogout, onAbrirPerfil }) {
  // Filtrar items según rol (Equipo solo para admin)
  const navFiltered = NAV.map(g => ({
    ...g,
    items: g.items.filter(it => {
      if (it.key === 'usuarios' && usuario?.rol !== 'admin') return false;
      return true;
    }),
  })).filter(g => g.items.length > 0);

  return (
    <aside
      style={{
        width: 236,
        flexShrink: 0,
        background: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
      }}
    >
      {/* Trama hexagonal decorativa */}
      <div
        style={{
          position: 'absolute',
          left: -20,
          bottom: -30,
          width: 280,
          height: 320,
          opacity: 0.13,
          pointerEvents: 'none',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0l30 17.32v34.64L30 69.28 0 51.96V17.32z' fill='none' stroke='%231E7CB5' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: '60px 52px',
        }}
      />

      {/* Logo arriba */}
      <div style={{ padding: '22px 20px 26px', position: 'relative' }}>
        <img
          src="/logo-imc-blanco.png"
          alt="IMC — Instituto Metabólico Corporal"
          style={{ width: 132, display: 'block' }}
        />
      </div>

      {/* Navegación */}
      <nav style={{ padding: '0 12px', position: 'relative', flex: 1 }}>
        {navFiltered.map(g => (
          <div key={g.grupo} style={{ marginBottom: 22 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,.34)',
                padding: '0 10px 9px',
              }}
            >
              {g.grupo}
            </p>
            {g.items.map(it => {
              const on = active === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => onSelect(it.key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '10px 11px',
                    marginBottom: 3,
                    background: on ? 'rgba(255,255,255,.10)' : 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    color: on ? '#fff' : 'rgba(255,255,255,.62)',
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    fontWeight: on ? 600 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .14s ease',
                  }}
                >
                  <Icon
                    name={it.icon}
                    size={17}
                    strokeWidth={on ? 2 : 1.7}
                    color={on ? '#7FC0EC' : 'rgba(255,255,255,.5)'}
                  />
                  {it.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Card de usuario abajo */}
      {usuario && (
        <div style={{ padding: 14, position: 'relative' }}>
          <div
            style={{
              background: 'rgba(255,255,255,.07)',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 12,
              padding: '11px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              onClick={onAbrirPerfil}
              title="Ver mi perfil"
              style={{ cursor: onAbrirPerfil ? 'pointer' : 'default' }}
            >
              <Inicial nombre={usuario.nombre} size={34} tone="strong" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: 0,
                }}
              >
                {usuario.nombre} {usuario.apellido}
              </p>
              <p
                style={{
                  color: 'rgba(255,255,255,.45)',
                  fontSize: 11,
                  margin: 0,
                }}
              >
                {ROL_LABEL[usuario.rol] || usuario.rol}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              style={{
                width: 28,
                height: 28,
                border: 'none',
                borderRadius: 8,
                background: 'rgba(255,255,255,.08)',
                color: 'rgba(255,255,255,.6)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="log-out" size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
