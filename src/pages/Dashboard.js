import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Pacientes from '../components/PanelGestionPacientes';
import PacienteDetalle from '../components/PacienteDetalle';
import Usuarios from './Usuarios';
import Agenda from './Agenda';
import DashboardPaciente from '../components/DashboardPaciente';
import CambiarPassword from '../components/CambiarPassword';
import SidebarV2 from '../components/v2/SidebarV2';
import HeaderMobileV2 from '../components/v2/HeaderMobileV2';
import { Icon, Inicial } from '../components/v2/Icon';

// ═══════════════════════════════════════════════════════════════════════
// Dashboard — capa visual v2 ("clínico premium", aprobada 04/08/2026)
//
// El cascarón ya estaba migrado (SidebarV2 + HeaderMobileV2). Esta pasada
// termina el interior:
//   · se elimina la navbar vieja que quedó envuelta en display:none (código muerto);
//   · el menú móvil y "cuenta sin configurar" pasan a tokens e iconos Lucide;
//   · ModalMiPerfil, BancoEjercicios y ModalEjercicio dejan la constante B y los emoji.
//
// Lo que NO cambió: props, la bifurcación staff / paciente / desconocida, el fetch de
// usuario y paciente, activar_mi_cuenta, el enrutado por `screen`, las queries de
// ejercicios, la subida al bucket `ejercicios` con nombre `${Date.now()}.${ext}`, y el
// update de usuarios con sus cinco campos.
//
// Corrección de raíz, no cosmética: `Field` estaba declarado DENTRO de ModalMiPerfil y
// ModalEjercicio, así que React lo remontaba en cada tecla y el input perdía el foco.
// Ahora vive fuera, como ya se hacía en Pacientes.js.
// ═══════════════════════════════════════════════════════════════════════

const ROJO = '#B02020';
const VERDE = '#1A7A4A';

const ROL_LABEL = {
  admin: 'Administrador', fisioterapeuta: 'Fisioterapeuta', medico: 'Médico',
  nutricionista: 'Nutricionista', secretaria: 'Secretaria', cosmetologa: 'Cosmetóloga',
};

// Mismas claves y orden que NAV en SidebarV2, para que el menú móvil no se desincronice.
const NAV_ITEMS = [
  { key: 'pacientes', label: 'Pacientes', icon: 'users' },
  { key: 'agenda', label: 'Agenda', icon: 'calendar-days' },
  { key: 'banco_ejercicios', label: 'Ejercicios', icon: 'dumbbell' },
  { key: 'usuarios', label: 'Equipo', icon: 'user-cog', soloAdmin: true },
];

const CAT_LABELS = { aerobico: 'Aeróbico', tren_inferior: 'Tren Inferior', tren_superior: 'Tren Superior', core: 'Core', respiratorio: 'Respiratorio', movilidad: 'Movilidad' };
const CAT_COLORS = { aerobico: '#1E7CB5', tren_inferior: '#0B1F3B', tren_superior: '#4B647A', core: '#C25A00', respiratorio: '#7B2D8B', movilidad: '#7B2D8B' };
const CAT_ICONS = { aerobico: 'activity', tren_inferior: 'dumbbell', tren_superior: 'dumbbell', core: 'target', respiratorio: 'activity', movilidad: 'refresh-cw' };
const ENTORNO = { gym: { label: 'Gimnasio', icon: 'building' }, casa: { label: 'Casa', icon: 'home' }, ambos: { label: 'Ambos', icon: 'check-circle-2' } };

// ── Estilos compartidos (v2) ──────────────────────────────────────────────────
const FUENTE = "'Poppins', 'Segoe UI', Arial, sans-serif";
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.06em', marginBottom: 6 };
const inputStyle = { width: '100%', height: 40, padding: '0 11px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const areaStyle = { width: '100%', padding: '10px 11px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 };
const btnPrimario = { height: 40, padding: '0 20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(180deg,#14355F,var(--ink))', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px -10px rgba(11,31,59,.55)' };
const btnFantasma = { height: 40, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' };

// Declarado fuera de los modales a propósito: dentro, React lo remonta en cada tecla.
const Field = ({ label, value, onChange, placeholder, type = 'text', opts, full }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined, marginBottom: 14 }}>
    <label style={labelStyle}>{label}</label>
    {opts ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    )}
  </div>
);

const Overlay = ({ children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: FUENTE, color: 'var(--ink)' }}>
    {children}
  </div>
);

const Toast = ({ toast }) => (
  <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ink)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 500, fontSize: 13.5, zIndex: 9999, boxShadow: '0 18px 40px -24px rgba(11,31,59,.55)', fontFamily: FUENTE }}>
    <Icon name="check-circle-2" size={16} color={toast.color === ROJO ? '#FCA5A5' : '#6EE7A8'} />
    {toast.msg}
  </div>
);

// Hook para detectar móvil
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export default function Dashboard({ session }) {
  const [usuario, setUsuario] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [cuenta, setCuenta] = useState('cargando'); // cargando | staff | paciente | desconocida
  const [screen, setScreen] = useState('pacientes');
  const [pacienteActivo, setPacienteActivo] = useState(null);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchUsuario = async () => {
      // 1) ¿Es personal de la clínica?
      const { data } = await supabase.from('usuarios').select('*').eq('id', session.user.id).maybeSingle();
      if (data) { setUsuario(data); setCuenta('staff'); return; }
      // 2) ¿Es un paciente con acceso?
      const { data: pac } = await supabase.from('pacientes').select('*').eq('user_id', session.user.id).maybeSingle();
      if (pac) { setPaciente(pac); setCuenta('paciente'); return; }
      // 3) Cuenta sin configurar
      setCuenta('desconocida');
    };
    fetchUsuario();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const abrirPaciente = (paciente) => {
    setPacienteActivo(paciente);
    setScreen('paciente_detalle');
  };

  const volverAPacientes = () => {
    setPacienteActivo(null);
    setScreen('pacientes');
  };

  const irA = (key) => {
    setScreen(key);
    setMenuMovilAbierto(false);
  };

  // ── BIFURCACIÓN: vista del paciente o cuenta sin configurar ──────────
  if (cuenta === 'paciente' && paciente) {
    // Primer ingreso: obligar a crear contraseña personal (doubles como pantalla de bienvenida)
    if (!paciente.app_activado) {
      return (
        <CambiarPassword
          titulo={`Bienvenido/a, ${paciente.nombre}`}
          subtitulo="Tu cuenta está activa. Para tu seguridad, crea tu contraseña personal antes de continuar — la temporal que recibiste dejará de funcionar."
          textoBoton="Crear mi contraseña y entrar"
          onCompletado={async () => {
            await supabase.rpc('activar_mi_cuenta');
            setPaciente({ ...paciente, app_activado: true });
          }}
        />
      );
    }
    return <DashboardPaciente paciente={paciente} onLogout={handleLogout} />;
  }

  if (cuenta === 'desconocida') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FUENTE, padding: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% -10%, rgba(30,124,181,.42), transparent 62%)' }} />
        <div style={{ position: 'relative', background: 'var(--surface)', borderRadius: 18, padding: '34px 30px', maxWidth: 430, textAlign: 'center', boxShadow: '0 40px 90px -30px rgba(0,0,0,.6)' }}>
          <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: 'var(--accent-wash)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name="settings" size={22} color="var(--accent)" />
          </span>
          <h2 style={{ color: 'var(--ink)', fontSize: 18, fontWeight: 600, letterSpacing: '-.01em', margin: '0 0 8px' }}>Tu cuenta aún no está configurada</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.65, margin: '0 0 22px' }}>
            Tu acceso existe pero no está vinculado a un perfil. Comunícate con el equipo de IMC para completar la activación.
          </p>
          <button onClick={handleLogout} style={{ ...btnPrimario, width: '100%' }}>
            <Icon name="log-out" size={16} color="#fff" /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const navItems = NAV_ITEMS.filter(it => !it.soloAdmin || usuario?.rol === 'admin');

  return (
    <div className="v2" style={{
      fontFamily: FUENTE,
      minHeight: '100vh',
      background: 'var(--canvas)',
      color: 'var(--ink)',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      width: '100%',
      overflowX: 'hidden',
    }}>

      {/* ═══════════════ SIDEBAR V2 (Desktop) ═══════════════ */}
      {!isMobile && (
        <SidebarV2
          active={screen}
          onSelect={irA}
          usuario={usuario}
          onLogout={handleLogout}
          onAbrirPerfil={() => setModalPerfil(true)}
        />
      )}

      {/* ═══════════════ HEADER MOBILE V2 ═══════════════ */}
      {isMobile && (
        <HeaderMobileV2
          usuario={usuario}
          menuAbierto={menuMovilAbierto}
          onToggleMenu={() => setMenuMovilAbierto(!menuMovilAbierto)}
          onAbrirPerfil={() => setModalPerfil(true)}
        />
      )}

      {/* Menú móvil desplegable V2 */}
      {isMobile && menuMovilAbierto && (
        <div style={{ background: 'var(--ink)', borderTop: '1px solid rgba(255,255,255,.1)', padding: '10px 12px 14px' }}>
          {navItems.map(item => {
            const on = screen === item.key;
            return (
              <button key={item.key} onClick={() => irA(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
                  minHeight: 44, padding: '0 13px', marginBottom: 3,
                  background: on ? 'rgba(255,255,255,.10)' : 'transparent',
                  color: on ? '#fff' : 'rgba(255,255,255,.62)',
                  border: 'none', borderRadius: 10,
                  fontWeight: on ? 600 : 500, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                <Icon name={item.icon} size={17} strokeWidth={on ? 2 : 1.7} color={on ? '#7FC0EC' : 'rgba(255,255,255,.5)'} />
                {item.label}
              </button>
            );
          })}
          {usuario && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,.12)', marginTop: 10, paddingTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div onClick={() => { setModalPerfil(true); setMenuMovilAbierto(false); }} style={{ cursor: 'pointer' }}>
                <Inicial nombre={usuario.nombre} size={34} tone="strong" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: 12.5, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {usuario.nombre} {usuario.apellido}
                </p>
                <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, margin: 0 }}>{ROL_LABEL[usuario.rol] || usuario.rol}</p>
              </div>
              <button onClick={handleLogout} title="Cerrar sesión"
                style={{ width: 40, height: 40, border: 'none', borderRadius: 10, background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="log-out" size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ CONTENT ═══════════════ */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        width: '100%',
        background: 'var(--canvas)',
      }}>
        {screen === 'pacientes' && <Pacientes onAbrirPaciente={abrirPaciente} usuario={usuario} />}
        {screen === 'paciente_detalle' && pacienteActivo && (
          <PacienteDetalle paciente={pacienteActivo} onVolver={volverAPacientes} usuario={usuario} />
        )}
        {screen === 'banco_ejercicios' && <BancoEjercicios usuario={usuario} />}
        {screen === 'agenda' && <Agenda usuario={usuario} onAbrirPaciente={abrirPaciente} />}
        {screen === 'usuarios' && <Usuarios usuarioActual={usuario} />}
      </div>

      {/* Modal Mi Perfil */}
      {modalPerfil && usuario && (
        <ModalMiPerfil
          usuario={usuario}
          onClose={() => setModalPerfil(false)}
          onGuardado={async () => {
            const { data } = await supabase.from('usuarios').select('*').eq('id', session.user.id).single();
            setUsuario(data);
            setModalPerfil(false);
          }}
        />
      )}
    </div>
  );
}

// ── MODAL MI PERFIL ──────────────────────────────────────────────────────────
function ModalMiPerfil({ usuario, onClose, onGuardado }) {
  const [nombre, setNombre] = useState(usuario.nombre || '');
  const [apellido, setApellido] = useState(usuario.apellido || '');
  const [telefono, setTelefono] = useState(usuario.telefono || '');
  const [especialidad, setEspecialidad] = useState(usuario.especialidad || '');
  const [registroMsp, setRegistroMsp] = useState(usuario.registro_msp || '');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    await supabase.from('usuarios').update({
      nombre, apellido,
      telefono: telefono || null,
      especialidad: especialidad || null,
      registro_msp: registroMsp || null,
    }).eq('id', usuario.id);
    await onGuardado();
    setGuardando(false);
  };

  return (
    <Overlay>
      <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 40px 90px -30px rgba(11,31,59,.6)' }}>
        <div style={{ background: 'linear-gradient(180deg,#14355F,var(--ink))', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Inicial nombre={usuario.nombre} size={40} tone="strong" />
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: 0, letterSpacing: '-.01em' }}>Mi perfil</p>
              <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 11.5, margin: '2px 0 0' }}>{ROL_LABEL[usuario.rol] || usuario.rol}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
            <Icon name="x" size={16} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: '20px 22px 24px' }}>
          {/* Email no editable */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.12em', margin: '0 0 4px' }}>Email</p>
            <p style={{ fontSize: 13.5, color: 'var(--ink)', margin: 0, wordBreak: 'break-all' }}>{usuario.email}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Nombre" value={nombre} onChange={setNombre} />
            <Field label="Apellido" value={apellido} onChange={setApellido} />
          </div>
          <Field label="Teléfono de contacto" value={telefono} onChange={setTelefono} placeholder="Ej: 0984075703" />
          <Field label="Especialidad" value={especialidad} onChange={setEspecialidad} placeholder="Ej: Cirugía General y Laparoscópica" />
          <Field label="Registro MSP / Número profesional" value={registroMsp} onChange={setRegistroMsp} placeholder="Ej: 1804536876" />

          <p style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 20 }}>
            <Icon name="info" size={13} color="var(--ink-3)" style={{ marginTop: 1 }} />
            Estos datos aparecen en las recetas médicas y documentos clínicos.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={btnFantasma}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ ...btnPrimario, opacity: guardando ? .6 : 1 }}>
              {guardando ? 'Guardando…' : <><Icon name="save" size={16} color="#fff" /> Guardar perfil</>}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// Tarjeta de ejercicio. Vive fuera del banco para tener su propio estado de fallo de
// imagen: una URL muerta sigue siendo un string, así que ramificar sólo por `imagen_url`
// dejaba el marco gris vacío y el icono de respaldo nunca aparecía.
function TarjetaEjercicio({ ex, onEditar }) {
  const [falla, setFalla] = useState(false);
  const col = CAT_COLORS[ex.categoria] || '#4B647A';
  const ent = ENTORNO[ex.entorno] || ENTORNO.ambos;
  const conImagen = !!ex.imagen_url && !falla;

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', boxShadow: '0 1px 2px rgba(11,31,59,.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Imagen del bucket `ejercicios`; si falta o no carga, icono de la categoría */}
      {conImagen ? (
        <div style={{ height: 140, background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
          <img src={ex.imagen_url} alt={ex.nombre} onError={() => setFalla(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ) : (
        <div style={{ height: 100, background: col + '0D', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={CAT_ICONS[ex.categoria] || 'dumbbell'} size={26} color={col} strokeWidth={1.6} />
        </div>
      )}

      <div style={{ padding: '14px 15px 15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: 13.5, margin: '0 0 9px', lineHeight: 1.35 }}>{ex.nombre}</p>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 9px', borderRadius: 7, background: col + '14', color: col, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {CAT_LABELS[ex.categoria] || ex.categoria}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 8px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
            <Icon name={ent.icon} size={11} color="var(--ink-3)" /> {ent.label}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-2)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
            {ex.nivel}
          </span>
        </div>

        {ex.descripcion && (
          <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '0 0 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {ex.descripcion}
          </p>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {ex.musculos
            ? <span style={{ fontSize: 11.5, color: 'var(--ink-3)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.musculos}</span>
            : <span />}
          <button onClick={onEditar}
            style={{ height: 30, padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 9, fontWeight: 500, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            <Icon name="edit" size={13} color="var(--ink-3)" /> Editar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BANCO DE EJERCICIOS ────────────────────────────────────────────────────────
function BancoEjercicios({ usuario }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [catFiltro, setCatFiltro] = useState('all');
  const [modalNuevo, setModalNuevo] = useState(false);
  const [ejercicioEditar, setEjercicioEditar] = useState(null);
  const [toast, setToast] = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => { fetchEjercicios(); }, []);

  const fetchEjercicios = async () => {
    const { data } = await supabase.from('ejercicios').select('*').eq('activo', true).order('categoria').order('nombre');
    setEjercicios(data || []);
    setLoading(false);
  };

  const showToast = (msg, color = VERDE) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  const filtrados = ejercicios.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
    (catFiltro === 'all' || e.categoria === catFiltro)
  );

  const eliminarEjercicio = async (id) => {
    await supabase.from('ejercicios').update({ activo: false }).eq('id', id);
    fetchEjercicios();
    showToast('Ejercicio eliminado', ROJO);
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1180, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 5px' }}>Banco de ejercicios</h2>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0 }}>
            {ejercicios.length} ejercicio{ejercicios.length !== 1 ? 's' : ''} activo{ejercicios.length !== 1 ? 's' : ''}
            {filtrados.length !== ejercicios.length && ` · ${filtrados.length} en el filtro actual`}
          </p>
        </div>
        <button onClick={() => setModalNuevo(true)} style={btnPrimario}>
          <Icon name="plus" size={16} color="#fff" /> Nuevo ejercicio
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 12, display: 'flex', pointerEvents: 'none' }}>
            <Icon name="search" size={16} color="var(--ink-3)" />
          </span>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ejercicio"
            style={{ ...inputStyle, paddingLeft: 37 }} />
        </div>
        <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 190 }}>
          <option value="all">Todas las categorías</option>
          {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Grid de ejercicios */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)', fontSize: 13.5 }}>Cargando ejercicios…</p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: '0 1px 2px rgba(11,31,59,.05)' }}>
          <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: 'var(--accent-wash)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Icon name="dumbbell" size={22} color="var(--accent)" />
          </span>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
            {ejercicios.length === 0 ? 'El banco está vacío' : 'Sin resultados'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 0' }}>
            {ejercicios.length === 0 ? 'Agrega el primer ejercicio para empezar.' : 'Prueba con otro término o quita los filtros.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(244px,1fr))', gap: 14 }}>
          {filtrados.map(ex => (
            <TarjetaEjercicio key={ex.id} ex={ex} onEditar={() => setEjercicioEditar(ex)} />
          ))}
        </div>
      )}

      {modalNuevo && (
        <ModalEjercicio
          onClose={() => setModalNuevo(false)}
          onGuardado={() => { fetchEjercicios(); setModalNuevo(false); showToast('Ejercicio agregado'); }}
        />
      )}

      {ejercicioEditar && (
        <ModalEjercicio
          ejercicio={ejercicioEditar}
          onClose={() => setEjercicioEditar(null)}
          onGuardado={() => { fetchEjercicios(); setEjercicioEditar(null); showToast('Ejercicio actualizado'); }}
          onEliminar={() => { eliminarEjercicio(ejercicioEditar.id); setEjercicioEditar(null); }}
        />
      )}

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function ModalEjercicio({ ejercicio, onClose, onGuardado, onEliminar }) {
  const isEdit = !!ejercicio;

  const [nombre, setNombre] = useState(ejercicio?.nombre || '');
  const [categoria, setCategoria] = useState(ejercicio?.categoria || 'aerobico');
  const [entorno, setEntorno] = useState(ejercicio?.entorno || 'gym');
  const [nivel, setNivel] = useState(ejercicio?.nivel || 'bajo');
  const [musculos, setMusculos] = useState(ejercicio?.musculos || '');
  const [descripcion, setDescripcion] = useState(ejercicio?.descripcion || '');
  const [imagenUrl, setImagenUrl] = useState(ejercicio?.imagen_url || '');
  const [imagenFile, setImagenFile] = useState(null);
  const [preview, setPreview] = useState(ejercicio?.imagen_url || '');
  const [guardando, setGuardando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [previewFalla, setPreviewFalla] = useState(false);

  const handleImagen = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagenFile(file);
    setPreviewFalla(false);
    setPreview(URL.createObjectURL(file));
  };

  const guardar = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);

    let urlFinal = imagenUrl;

    if (imagenFile) {
      setSubiendo(true);
      const ext = imagenFile.name.split('.').pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('ejercicios')
        .upload(path, imagenFile, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('ejercicios').getPublicUrl(path);
        urlFinal = urlData.publicUrl;
      }
      setSubiendo(false);
    }

    const data = {
      nombre: nombre.trim(),
      categoria,
      entorno,
      nivel,
      musculos: musculos || null,
      descripcion: descripcion || null,
      imagen_url: urlFinal || null,
      activo: true,
    };

    if (isEdit) {
      await supabase.from('ejercicios').update(data).eq('id', ejercicio.id);
    } else {
      await supabase.from('ejercicios').insert([data]);
    }

    onGuardado();
    setGuardando(false);
  };

  return (
    <Overlay>
      <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 90px -30px rgba(11,31,59,.6)' }}>
        <div style={{ background: 'linear-gradient(180deg,#14355F,var(--ink))', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>
            {isEdit ? 'Editar ejercicio' : 'Nuevo ejercicio'}
          </p>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer' }}>
            <Icon name="x" size={16} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: '20px 24px 24px', overflowY: 'auto' }}>
          {/* Imagen */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Imagen de referencia</label>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {preview && !previewFalla ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={preview} alt="Vista previa" onError={() => setPreviewFalla(true)}
                    style={{ width: 128, height: 96, objectFit: 'cover', borderRadius: 11, border: '1px solid var(--line)', display: 'block' }} />
                  <button onClick={() => { setPreview(''); setImagenFile(null); setImagenUrl(''); setPreviewFalla(false); }} aria-label="Quitar imagen"
                    style={{ position: 'absolute', top: -7, right: -7, background: ROJO, color: '#fff', border: '2px solid var(--surface)', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="x" size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <div style={{ width: 128, height: 96, background: 'var(--surface-2)', borderRadius: 11, border: '1px dashed var(--line)', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', justifyContent: 'center', flexShrink: 0, textAlign: 'center', padding: 8 }}>
                  <Icon name={previewFalla ? 'alert-triangle' : 'dumbbell'} size={22} color="var(--ink-3)" strokeWidth={1.6} />
                  {previewFalla && <span style={{ fontSize: 10.5, color: 'var(--ink-3)', lineHeight: 1.3 }}>La URL no carga</span>}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ ...btnFantasma, width: '100%', justifyContent: 'center', marginBottom: 8 }}>
                  <Icon name="upload" size={15} color="var(--ink-3)" /> Subir imagen
                  <input type="file" accept="image/*" onChange={handleImagen} style={{ display: 'none' }} />
                </label>
                <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '0 0 10px' }}>JPG, PNG o WebP. Máximo 2 MB.</p>
                <input value={imagenUrl} onChange={e => { setImagenUrl(e.target.value); setPreview(e.target.value); setImagenFile(null); setPreviewFalla(false); }}
                  placeholder="O pega una URL: https://…"
                  style={{ ...inputStyle, height: 36, fontSize: 12.5 }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Nombre" value={nombre} onChange={setNombre} full />
            <Field label="Categoría" value={categoria} onChange={setCategoria} opts={Object.entries(CAT_LABELS).map(([k, v]) => ({ v: k, l: v }))} />
            <Field label="Entorno" value={entorno} onChange={setEntorno} opts={[{ v: 'gym', l: 'Gimnasio' }, { v: 'casa', l: 'Casa' }, { v: 'ambos', l: 'Ambos' }]} />
            <Field label="Nivel" value={nivel} onChange={setNivel} opts={[{ v: 'bajo', l: 'Bajo' }, { v: 'medio', l: 'Medio' }, { v: 'alto', l: 'Alto' }]} />
            <Field label="Músculos trabajados" value={musculos} onChange={setMusculos} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Descripción / Instrucciones</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3}
              placeholder="Describe cómo ejecutar el ejercicio correctamente…" style={areaStyle} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            {isEdit && !confirmEliminar && (
              <button onClick={() => setConfirmEliminar(true)}
                style={{ height: 36, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 7, background: ROJO + '0F', color: ROJO, border: 'none', borderRadius: 9, fontWeight: 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Icon name="trash" size={14} color={ROJO} /> Eliminar
              </button>
            )}
            {isEdit && confirmEliminar && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: ROJO, fontWeight: 500 }}>¿Eliminar el ejercicio?</span>
                <button onClick={onEliminar}
                  style={{ height: 32, padding: '0 12px', background: ROJO, color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>Sí</button>
                <button onClick={() => setConfirmEliminar(false)}
                  style={{ height: 32, padding: '0 12px', background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 9, fontWeight: 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>No</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
              <button onClick={onClose} style={btnFantasma}>Cancelar</button>
              <button onClick={guardar} disabled={guardando || subiendo}
                style={{ ...btnPrimario, opacity: (guardando || subiendo) ? .6 : 1, cursor: (guardando || subiendo) ? 'not-allowed' : 'pointer' }}>
                {subiendo ? 'Subiendo imagen…' : guardando ? 'Guardando…' : isEdit
                  ? <><Icon name="save" size={16} color="#fff" /> Guardar cambios</>
                  : <><Icon name="plus" size={16} color="#fff" /> Agregar ejercicio</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
