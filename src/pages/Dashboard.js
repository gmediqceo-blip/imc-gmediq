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
import { Icon } from '../components/v2/Icon';

const B = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020', orange: '#C25A00' };

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
          titulo={`¡Bienvenido/a, ${paciente.nombre}! 🎉`}
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
      <div style={{ minHeight: '100vh', background: B.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', Arial, sans-serif", padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '32px 28px', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
          <h2 style={{ color: B.navy, fontSize: 18, margin: '0 0 8px' }}>Tu cuenta aún no está configurada</h2>
          <p style={{ color: B.gray, fontSize: 13, lineHeight: 1.6, margin: '0 0 20px' }}>
            Tu acceso existe pero no está vinculado a un perfil. Por favor comunícate con el equipo de IMC para completar la activación.
          </p>
          <button onClick={handleLogout} style={{ background: B.navy, color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const rolColor = { admin: B.navy, fisioterapeuta: B.blue, medico: B.teal, nutricionista: B.green, secretaria: B.orange, cosmetologa: '#C9A86A' };
  const rolLabel = { admin: 'Administrador', fisioterapeuta: 'Fisioterapeuta', medico: 'Médico', nutricionista: 'Nutricionista', secretaria: 'Secretaria', cosmetologa: 'Cosmetóloga' };

  const navItems = [
    { key: 'pacientes', label: '👥 Pacientes' },
    { key: 'banco_ejercicios', label: '🏋️ Ejercicios' },
    { key: 'agenda', label: '📅 Agenda' },
    ...(usuario?.rol === 'admin' ? [{ key: 'usuarios', label: '👤 Usuarios' }] : []),
  ];

  return (
    <div className="v2" style={{ 
      fontFamily: "'Poppins', 'Segoe UI', Arial, sans-serif", 
      minHeight: '100vh', 
      background: 'var(--canvas)', 
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
      
      {/* ═══════════════ NAVBAR VIEJA (OCULTA) ═══════════════ */}
      <div style={{ display: 'none' }}>
      <nav style={{ 
        background: B.navy, 
        padding: isMobile ? '0 12px' : '0 24px', 
        display: 'flex', 
        alignItems: 'center', 
        height: 56, 
        flexShrink: 0,
        justifyContent: 'space-between',
        gap: 10,
      }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ background: 'white', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo-imc.jpg" alt="IMC" style={{ height: 34, width: 'auto', display: 'block' }} />
          </div>
        </div>

        {/* Nav links - DESKTOP */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 4, flex: 1, marginLeft: 24 }}>
            {navItems.map(item => (
              <button key={item.key} onClick={() => setScreen(item.key)}
                style={{ padding: '8px 16px', background: screen === item.key ? 'rgba(255,255,255,0.15)' : 'transparent', color: 'white', border: 'none', borderRadius: 6, fontWeight: screen === item.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* User info - DESKTOP */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {usuario && (
              <>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0 }}>{usuario.nombre} {usuario.apellido}</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{rolLabel[usuario.rol]}</p>
                </div>
                <div onClick={() => setModalPerfil(true)}
                  title="Ver mi perfil"
                  style={{ width: 34, height: 34, borderRadius: 17, background: rolColor[usuario.rol] || B.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.3)' }}>
                  {usuario.nombre?.charAt(0)?.toUpperCase()}
                </div>
              </>
            )}
            <button onClick={handleLogout}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Salir
            </button>
          </div>
        )}

        {/* Hamburger button - MÓVIL */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {usuario && (
              <div onClick={() => setModalPerfil(true)}
                title="Ver mi perfil"
                style={{ width: 34, height: 34, borderRadius: 17, background: rolColor[usuario.rol] || B.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.3)' }}>
                {usuario.nombre?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <button onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', borderRadius: 6, padding: '4px 10px', fontFamily: 'inherit' }}>
              {menuMovilAbierto ? '✕' : '☰'}
            </button>
          </div>
        )}
      </nav>
      </div>

      {/* Menú móvil desplegable V2 */}
      {isMobile && menuMovilAbierto && (
        <div style={{ background: 'var(--ink)', borderTop: '1px solid rgba(255,255,255,.1)', padding: '10px 12px 14px' }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => irA(item.key)}
              style={{ 
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px', 
                background: screen === item.key ? 'rgba(255,255,255,0.15)' : 'transparent', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6, 
                fontWeight: screen === item.key ? 700 : 500, 
                fontSize: 14, 
                cursor: 'pointer', 
                fontFamily: 'inherit',
                marginBottom: 4,
              }}>
              {item.label}
            </button>
          ))}
          {usuario && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 8, paddingTop: 8 }}>
              <div style={{ padding: '8px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                <strong style={{ color: 'white', fontSize: 13 }}>{usuario.nombre} {usuario.apellido}</strong><br/>
                {rolLabel[usuario.rol]}
              </div>
              <button onClick={handleLogout}
                style={{ 
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px', 
                  background: 'rgba(255,255,255,0.05)', 
                  color: 'rgba(255,255,255,0.8)', 
                  border: 'none', 
                  borderRadius: 6, 
                  fontSize: 13, 
                  cursor: 'pointer', 
                  fontFamily: 'inherit',
                }}>
                🚪 Cerrar sesión
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

  const rolLabels = { admin: 'Administrador', fisioterapeuta: 'Fisioterapeuta', medico: 'Médico', nutricionista: 'Nutricionista', secretaria: 'Secretaria', cosmetologa: 'Cosmetóloga' };
  const rolColor2 = { admin: B.navy, fisioterapeuta: B.blue, medico: B.teal, nutricionista: B.green, secretaria: B.orange, cosmetologa: '#C9A86A' };
  const col = rolColor2[usuario.rol] || B.teal;

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

  const Field = ({ label, value, onChange, placeholder }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${B.grayMd}`, borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: B.white, borderRadius: 14, width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ background: B.navy, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 21, background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18 }}>
              {usuario.nombre?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>Mi perfil</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>{rolLabels[usuario.rol] || usuario.rol}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', borderRadius: 6, padding: '3px 9px' }}>✕</button>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {/* Email no editable */}
          <div style={{ background: B.grayLt, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 2px' }}>Email</p>
              <p style={{ fontSize: 13, color: B.navy, margin: 0 }}>{usuario.email}</p>
            </div>
            <span style={{ background: col + '22', color: col, padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{rolLabels[usuario.rol]}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Nombre *" value={nombre} onChange={setNombre} />
            <Field label="Apellido *" value={apellido} onChange={setApellido} />
          </div>
          <Field label="Teléfono de contacto" value={telefono} onChange={setTelefono} placeholder="Ej: 0984075703" />
          <Field label="Especialidad" value={especialidad} onChange={setEspecialidad} placeholder="Ej: Cirugía General y Laparoscópica" />
          <Field label="Registro MSP / Número profesional" value={registroMsp} onChange={setRegistroMsp} placeholder="Ej: 1804536876" />

          <p style={{ fontSize: 11, color: B.gray, marginBottom: 16, fontStyle: 'italic' }}>
            Estos datos aparecerán en las recetas médicas y documentos clínicos.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose}
              style={{ padding: '9px 18px', background: B.grayLt, color: B.gray, border: `1px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '9px 22px', background: guardando ? '#9AA5B1' : B.teal, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : '💾 Guardar perfil'}
            </button>
          </div>
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

  const B2 = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020', orange: '#C25A00' };
  const CAT_LABELS = { aerobico: 'Aeróbico', tren_inferior: 'Tren Inferior', tren_superior: 'Tren Superior', core: 'Core', respiratorio: 'Respiratorio', movilidad: 'Movilidad' };
  const CAT_COLORS = { aerobico: B2.blue, tren_inferior: B2.navy, tren_superior: B2.teal, core: B2.orange, respiratorio: '#7B2D8B', movilidad: '#7B2D8B' };

  useEffect(() => { fetchEjercicios(); }, []);

  const fetchEjercicios = async () => {
    const { data } = await supabase.from('ejercicios').select('*').eq('activo', true).order('categoria').order('nombre');
    setEjercicios(data || []);
    setLoading(false);
  };

  const showToast = (msg, color = B2.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  const filtrados = ejercicios.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
    (catFiltro === 'all' || e.categoria === catFiltro)
  );

  const eliminarEjercicio = async (id) => {
    await supabase.from('ejercicios').update({ activo: false }).eq('id', id);
    fetchEjercicios();
    showToast('Ejercicio eliminado', B2.red);
  };

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: B2.navy, margin: 0 }}>🏋️ Banco de Ejercicios</h2>
        <button onClick={() => setModalNuevo(true)}
          style={{ padding: '9px 20px', background: B2.teal, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Nuevo ejercicio
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar ejercicio..."
          style={{ flex: 1, minWidth: 180, padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${B2.grayMd}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${B2.grayMd}`, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
          <option value="all">Todas las categorías</option>
          {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span style={{ padding: '9px 14px', background: B2.grayLt, borderRadius: 8, fontSize: 12, color: B2.gray, fontWeight: 600 }}>
          {filtrados.length} ejercicios
        </span>
      </div>

      {/* Grid de ejercicios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: B2.gray }}>Cargando ejercicios...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {filtrados.map(ex => {
            const col = CAT_COLORS[ex.categoria] || B2.teal;
            return (
              <div key={ex.id} style={{ background: B2.white, borderRadius: 10, border: `1.5px solid ${B2.grayMd}`, overflow: 'hidden', borderTop: `3px solid ${col}` }}>
                {/* Imagen */}
                {ex.imagen_url ? (
                  <img src={ex.imagen_url} alt={ex.nombre}
                    style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: '100%', height: 100, background: col + '11', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                    {ex.categoria === 'aerobico' ? '🚴' : ex.categoria === 'core' ? '💪' : ex.categoria === 'movilidad' ? '🧘' : ex.categoria === 'respiratorio' ? '🫁' : ex.categoria === 'tren_inferior' ? '🦵' : '💪'}
                  </div>
                )}
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: B2.navy, margin: '0 0 6px' }}>{ex.nombre}</p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, background: col + '22', color: col, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>{CAT_LABELS[ex.categoria]}</span>
                    <span style={{ fontSize: 9, color: B2.gray, background: B2.grayLt, padding: '2px 6px', borderRadius: 8 }}>{ex.entorno === 'gym' ? '🏋️ Gym' : ex.entorno === 'casa' ? '🏠 Casa' : '✓ Ambos'}</span>
                    <span style={{ fontSize: 9, color: B2.gray, background: B2.grayLt, padding: '2px 6px', borderRadius: 8 }}>{ex.nivel}</span>
                  </div>
                  {ex.descripcion && <p style={{ fontSize: 10, color: B2.gray, margin: '0 0 8px', lineHeight: 1.4 }}>{ex.descripcion.substring(0, 80)}...</p>}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEjercicioEditar(ex)}
                      style={{ padding: '4px 10px', background: B2.blue + '11', color: B2.blue, border: `1px solid ${B2.blue}33`, borderRadius: 5, fontWeight: 600, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalNuevo && (
        <ModalEjercicio
          onClose={() => setModalNuevo(false)}
          onGuardado={() => { fetchEjercicios(); setModalNuevo(false); showToast('Ejercicio agregado ✓'); }}
        />
      )}

      {ejercicioEditar && (
        <ModalEjercicio
          ejercicio={ejercicioEditar}
          onClose={() => setEjercicioEditar(null)}
          onGuardado={() => { fetchEjercicios(); setEjercicioEditar(null); showToast('Ejercicio actualizado ✓'); }}
          onEliminar={() => { eliminarEjercicio(ejercicioEditar.id); setEjercicioEditar(null); }}
        />
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
    </div>
  );
}

function ModalEjercicio({ ejercicio, onClose, onGuardado, onEliminar }) {
  const isEdit = !!ejercicio;
  const B2 = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020', orange: '#C25A00' };
  const CAT_LABELS = { aerobico: 'Aeróbico', tren_inferior: 'Tren Inferior', tren_superior: 'Tren Superior', core: 'Core', respiratorio: 'Respiratorio', movilidad: 'Movilidad' };

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

  const handleImagen = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagenFile(file);
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

  const Field = ({ label, value, onChange, type = 'text', opts, full }) => (
    <div style={{ gridColumn: full ? '1 / -1' : undefined, marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B2.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</label>
      {opts ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B2.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
          {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B2.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      )}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: B2.white, borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: B2.navy, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>{isEdit ? '✏️ Editar ejercicio' : '+ Nuevo ejercicio'}</p>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', borderRadius: 6, padding: '3px 9px' }}>✕</button>
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto' }}>
          {/* Imagen */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B2.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Imagen de referencia
            </label>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {preview ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={preview} alt="Preview" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: `1.5px solid ${B2.grayMd}` }}
                    onError={e => { e.target.style.display = 'none'; }} />
                  <button onClick={() => { setPreview(''); setImagenFile(null); setImagenUrl(''); }}
                    style={{ position: 'absolute', top: -6, right: -6, background: B2.red, color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✕</button>
                </div>
              ) : (
                <div style={{ width: 120, height: 90, background: B2.grayLt, borderRadius: 8, border: `2px dashed ${B2.grayMd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 28 }}>🏋️</span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', padding: '9px 14px', background: B2.blue, color: 'white', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer', textAlign: 'center', marginBottom: 8 }}>
                  📁 Subir imagen
                  <input type="file" accept="image/*" onChange={handleImagen} style={{ display: 'none' }} />
                </label>
                <p style={{ fontSize: 10, color: B2.gray, margin: '0 0 6px' }}>JPG, PNG o WebP. Máx 2MB.</p>
                <p style={{ fontSize: 9, color: B2.gray, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>O pega una URL:</p>
                <input value={imagenUrl} onChange={e => { setImagenUrl(e.target.value); setPreview(e.target.value); setImagenFile(null); }}
                  placeholder="https://..."
                  style={{ width: '100%', padding: '6px 9px', border: `1.5px solid ${B2.grayMd}`, borderRadius: 6, fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Nombre *" value={nombre} onChange={setNombre} full />
            <Field label="Categoría" value={categoria} onChange={setCategoria} opts={Object.entries(CAT_LABELS).map(([k, v]) => ({ v: k, l: v }))} />
            <Field label="Entorno" value={entorno} onChange={setEntorno} opts={[{ v: 'gym', l: '🏋️ Gimnasio' }, { v: 'casa', l: '🏠 Casa' }, { v: 'ambos', l: '✓ Ambos' }]} />
            <Field label="Nivel" value={nivel} onChange={setNivel} opts={[{ v: 'bajo', l: 'Bajo' }, { v: 'medio', l: 'Medio' }, { v: 'alto', l: 'Alto' }]} />
            <Field label="Músculos trabajados" value={musculos} onChange={setMusculos} full />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B2.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Descripción / Instrucciones</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3}
              placeholder="Describe cómo ejecutar el ejercicio correctamente..."
              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B2.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            {isEdit && !confirmEliminar && (
              <button onClick={() => setConfirmEliminar(true)}
                style={{ padding: '8px 14px', background: B2.red + '11', color: B2.red, border: `1px solid ${B2.red}33`, borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑 Eliminar
              </button>
            )}
            {isEdit && confirmEliminar && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: B2.red, fontWeight: 600 }}>¿Confirmar?</span>
                <button onClick={onEliminar} style={{ padding: '6px 12px', background: B2.red, color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Sí</button>
                <button onClick={() => setConfirmEliminar(false)} style={{ padding: '6px 12px', background: B2.grayLt, color: B2.gray, border: `1px solid ${B2.grayMd}`, borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>No</button>
              </div>
            )}
            {!isEdit && <div />}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose}
                style={{ padding: '9px 18px', background: B2.grayLt, color: B2.gray, border: `1px solid ${B2.grayMd}`, borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando || subiendo}
                style={{ padding: '9px 22px', background: guardando || subiendo ? '#9AA5B1' : B2.green, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                {subiendo ? 'Subiendo imagen...' : guardando ? 'Guardando...' : isEdit ? '💾 Guardar cambios' : '+ Agregar ejercicio'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
