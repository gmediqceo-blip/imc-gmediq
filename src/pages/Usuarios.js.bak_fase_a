import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
};

const ROLES = [
  { value: 'admin', label: 'Administrador', color: B.navy, icon: '👑' },
  { value: 'medico', label: 'Médico', color: B.teal, icon: '🩺' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta', color: B.blue, icon: '🏃' },
  { value: 'nutricionista', label: 'Nutricionista', color: B.green, icon: '🥗' },
  { value: 'secretaria', label: 'Secretaria / Admin', color: B.orange, icon: '📋' },
];

const TIPOS = [
  { value: 'profesional', label: 'Profesional de salud' },
  { value: 'administrativo', label: 'Administrativo' },
];

const getRolInfo = (rol) => ROLES.find(r => r.value === rol) || { label: rol, color: B.gray, icon: '👤' };

export default function Usuarios({ usuarioActual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = B.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const fetchUsuarios = async () => {
    setCargando(true);
    const { data } = await supabase.from('usuarios').select('*').order('nombre');
    setUsuarios(data || []);
    setCargando(false);
  };

  const isAdmin = usuarioActual?.rol === 'admin';

  return (
    <div style={{ minHeight: '100vh', background: B.grayLt, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: B.navy, padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>👥 Gestión de Usuarios</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>Instituto Metabólico Corporal · IMC</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModalNuevo(true)}
            style={{ padding: '9px 20px', background: B.blue, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Nuevo usuario
          </button>
        )}
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 60, color: B.gray }}>Cargando usuarios...</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {usuarios.map(u => (
              <UsuarioCard
                key={u.id}
                usuario={u}
                isAdmin={isAdmin}
                esMiPerfil={u.id === usuarioActual?.id}
                onEditar={() => setUsuarioEditar(u)}
              />
            ))}
            {usuarios.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}` }}>
                <p style={{ fontSize: 36, marginBottom: 10 }}>👥</p>
                <p style={{ color: B.gray }}>No hay usuarios registrados.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {modalNuevo && (
        <ModalUsuario
          onClose={() => setModalNuevo(false)}
          onGuardado={() => { fetchUsuarios(); setModalNuevo(false); showToast('Usuario creado ✓'); }}
        />
      )}

      {usuarioEditar && (
        <ModalEditarUsuario
          usuario={usuarioEditar}
          onClose={() => setUsuarioEditar(null)}
          onGuardado={() => { fetchUsuarios(); setUsuarioEditar(null); showToast('Perfil actualizado ✓'); }}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── CARD DE USUARIO ──────────────────────────────────────────────────────────
function UsuarioCard({ usuario: u, isAdmin, esMiPerfil, onEditar }) {
  const rol = getRolInfo(u.rol);
  return (
    <div style={{ background: B.white, borderRadius: 10, border: `1.5px solid ${B.grayMd}`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${rol.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 23, background: rol.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {rol.icon}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: B.navy, margin: 0 }}>{u.nombre} {u.apellido}</p>
            {esMiPerfil && <span style={{ background: B.blue + '22', color: B.blue, fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 8 }}>Mi perfil</span>}
            {!u.activo && <span style={{ background: B.red + '22', color: B.red, fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 8 }}>Inactivo</span>}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: B.gray }}>{u.email}</span>
            {u.telefono && <span style={{ fontSize: 11, color: B.gray }}>📞 {u.telefono}</span>}
            {u.especialidad && <span style={{ fontSize: 11, color: B.teal }}>🏥 {u.especialidad}</span>}
            {u.registro_msp && <span style={{ fontSize: 11, color: B.navy }}>🪪 Reg. MSP: {u.registro_msp}</span>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ background: rol.color + '22', color: rol.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          {rol.icon} {rol.label}
        </span>
        {(isAdmin || esMiPerfil) && (
          <button onClick={onEditar}
            style={{ padding: '6px 14px', background: B.blue + '11', color: B.blue, border: `1px solid ${B.blue}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            ✏️ Editar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MODAL NUEVO USUARIO ──────────────────────────────────────────────────────
function ModalUsuario({ onClose, onGuardado }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [rol, setRol] = useState('fisioterapeuta');
  const [tipo, setTipo] = useState('profesional');
  const [telefono, setTelefono] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [registroMsp, setRegistroMsp] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    if (!email || !password || !nombre || !apellido) {
      setError('Email, contraseña, nombre y apellido son obligatorios');
      return;
    }
    setGuardando(true);
    setError('');

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (authError) {
      setError('Error al crear usuario: ' + authError.message);
      setGuardando(false);
      return;
    }

    const userId = authData?.user?.id;
    if (!userId) {
      setError('Error: no se obtuvo ID de usuario');
      setGuardando(false);
      return;
    }

    // Insert profile in usuarios table
    const { error: profileError } = await supabase.from('usuarios').insert([{
      id: userId,
      email,
      nombre,
      apellido,
      rol,
      tipo,
      telefono: telefono || null,
      especialidad: especialidad || null,
      registro_msp: registroMsp || null,
      activo: true,
    }]);

    if (profileError) {
      setError('Error al guardar perfil: ' + profileError.message);
    } else {
      onGuardado();
    }
    setGuardando(false);
  };

  return (
    <ModalBase titulo="Nuevo Usuario" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <CField label="Nombre *" value={nombre} onChange={setNombre} />
        <CField label="Apellido *" value={apellido} onChange={setApellido} />
        <CField label="Email *" value={email} onChange={setEmail} type="email" full />
        <CField label="Contraseña *" value={password} onChange={setPassword} type="password" full hint="Mínimo 6 caracteres" />
      </div>

      <div style={{ borderTop: `1px solid ${B.grayMd}`, paddingTop: 14, marginTop: 6 }}>
        <p style={{ fontWeight: 700, fontSize: 11, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>Perfil profesional</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Rol *</label>
            <select value={rol} onChange={e => setRol(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <CField label="Teléfono" value={telefono} onChange={setTelefono} placeholder="Ej: 0984075703" />
          <CField label="Especialidad" value={especialidad} onChange={setEspecialidad} placeholder="Ej: Cirugía General" />
          <CField label="Registro MSP / Nro. profesional" value={registroMsp} onChange={setRegistroMsp} placeholder="Ej: 1804536876" full />
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', color: B.red, fontSize: 13, marginTop: 8 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={onClose}
          style={{ padding: '9px 20px', background: B.grayLt, color: B.gray, border: `1px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancelar
        </button>
        <button onClick={guardar} disabled={guardando}
          style={{ padding: '9px 24px', background: guardando ? '#9AA5B1' : B.green, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          {guardando ? 'Creando...' : '+ Crear usuario'}
        </button>
      </div>
    </ModalBase>
  );
}

// ─── MODAL EDITAR USUARIO ─────────────────────────────────────────────────────
function ModalEditarUsuario({ usuario, onClose, onGuardado }) {
  const [nombre, setNombre] = useState(usuario.nombre || '');
  const [apellido, setApellido] = useState(usuario.apellido || '');
  const [rol, setRol] = useState(usuario.rol || 'fisioterapeuta');
  const [tipo, setTipo] = useState(usuario.tipo || 'profesional');
  const [telefono, setTelefono] = useState(usuario.telefono || '');
  const [especialidad, setEspecialidad] = useState(usuario.especialidad || '');
  const [registroMsp, setRegistroMsp] = useState(usuario.registro_msp || '');
  const [activo, setActivo] = useState(usuario.activo !== false);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    const { error } = await supabase.from('usuarios').update({
      nombre, apellido, rol, tipo,
      telefono: telefono || null,
      especialidad: especialidad || null,
      registro_msp: registroMsp || null,
      activo,
    }).eq('id', usuario.id);

    if (!error) onGuardado();
    setGuardando(false);
  };

  return (
    <ModalBase titulo={`Editar perfil — ${usuario.nombre} ${usuario.apellido}`} onClose={onClose}>
      <div style={{ background: B.grayLt, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: B.gray }}>
        📧 {usuario.email}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <CField label="Nombre *" value={nombre} onChange={setNombre} />
        <CField label="Apellido *" value={apellido} onChange={setApellido} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Rol</label>
          <select value={rol} onChange={e => setRol(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <CField label="Teléfono" value={telefono} onChange={setTelefono} placeholder="Ej: 0984075703" />
        <CField label="Especialidad" value={especialidad} onChange={setEspecialidad} placeholder="Ej: Cirugía General" />
        <CField label="Registro MSP / Nro. profesional" value={registroMsp} onChange={setRegistroMsp} placeholder="Ej: 1804536876" full />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 4 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: B.green, cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: B.navy, fontWeight: 500 }}>Usuario activo</span>
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={onClose}
          style={{ padding: '9px 20px', background: B.grayLt, color: B.gray, border: `1px solid ${B.grayMd}`, borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancelar
        </button>
        <button onClick={guardar} disabled={guardando}
          style={{ padding: '9px 24px', background: guardando ? '#9AA5B1' : B.teal, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          {guardando ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
      </div>
    </ModalBase>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ModalBase({ titulo, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: B.white, borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: B.navy, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>{titulo}</p>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', borderRadius: 6, padding: '3px 9px' }}>✕</button>
        </div>
        <div style={{ padding: '20px 22px', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const B2 = B;
function CField({ label, value, onChange, type = 'text', full, hint, placeholder }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined, marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B2.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B2.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      {hint && <p style={{ fontSize: 9, color: B2.gray, margin: '3px 0 0' }}>{hint}</p>}
    </div>
  );
}
