// ════════════════════════════════════════════════════════════════════════
// AccesoPacienteModal.js — Generar acceso a la app para un paciente
//
// Flujo:
//   1. Verifica si el paciente ya tiene cuenta (pacientes.user_id)
//   2. Si no: crea la cuenta de acceso con contraseña temporal usando un
//      cliente secundario de Supabase (NO afecta la sesión del admin)
//   3. Vincula user_id al paciente y registra invitado_at
//   4. Muestra credenciales con botones Copiar y Enviar por WhatsApp
//
// Requisito: "Confirm email" desactivado en Supabase Auth (ya configurado)
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const B = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF', green: '#1A7A4A', red: '#B02020', orange: '#C25A00', gold: '#C9A86A' };

const APP_URL = 'https://imc-gmediq.vercel.app';

// ── Cliente secundario: crea cuentas sin tocar la sesión actual ──────────
let _clienteSec = null;
function clienteSecundario() {
  if (_clienteSec) return _clienteSec;
  const url = supabase.supabaseUrl;
  const key = supabase.supabaseKey;
  if (!url || !key) throw new Error('No se pudo obtener la configuración de Supabase');
  _clienteSec = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'imc-acceso-paciente' },
  });
  return _clienteSec;
}

// ── Contraseña temporal legible (sin caracteres ambiguos) ─────────────────
function generarPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return `IMC-${p}`;
}

// ── Teléfono Ecuador → formato wa.me ──────────────────────────────────────
function telefonoWhatsApp(tel) {
  if (!tel) return null;
  let d = String(tel).replace(/\D/g, '');
  if (d.startsWith('593')) return d;
  if (d.startsWith('0')) return '593' + d.slice(1);
  if (d.length === 9) return '593' + d;
  return d;
}

function mensajeBienvenida(nombre, email, password) {
  return (
    `Hola ${nombre} 👋\n\n` +
    `Te damos la bienvenida a la app de *IMC – Instituto Metabólico Corporal*. ` +
    `Ahí podrás ver tu plan de alimentación y entrenamiento, registrar tu avance diario y consultar tu próxima cita.\n\n` +
    `🔗 Ingresa en: ${APP_URL}\n` +
    `📧 Usuario: ${email}\n` +
    `🔑 Contraseña temporal: ${password}\n\n` +
    `Cualquier duda escríbenos por aquí. ¡Empezamos! 💪`
  );
}

// ════════════════════════════════════════════════════════════════════════
// COMPONENTE
// Props: paciente {paciente_id | id, nombre, apellido, email, telefono}, onClose, onActualizado?
// ════════════════════════════════════════════════════════════════════════
export default function AccesoPacienteModal({ paciente, onClose, onActualizado }) {
  const pacienteId = paciente.paciente_id || paciente.id;
  const [cargando, setCargando] = useState(true);
  const [pacFull, setPacFull] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [credenciales, setCredenciales] = useState(null); // {email, password}
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const { data, error: err } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido, email, telefono, user_id, invitado_at, app_activado')
        .eq('id', pacienteId)
        .single();
      if (err) setError('No se pudo cargar el paciente: ' + err.message);
      setPacFull(data || null);
      setCargando(false);
    };
    cargar();
  }, [pacienteId]);

  const generarAcceso = async () => {
    setError('');
    if (!pacFull?.email || !pacFull.email.includes('@')) {
      setError('El paciente no tiene un email válido registrado. Edita su ficha primero.');
      return;
    }
    setGenerando(true);
    try {
      const password = generarPassword();
      const sec = clienteSecundario();

      // 1. Crear la cuenta de acceso (no afecta la sesión del admin)
      const { data, error: errAuth } = await sec.auth.signUp({
        email: pacFull.email.trim().toLowerCase(),
        password,
      });
      if (errAuth) {
        if (/already|registered|exists/i.test(errAuth.message)) {
          throw new Error('Ya existe una cuenta con este email. Si es de este paciente, vincúlala desde Supabase o usa otro email.');
        }
        throw errAuth;
      }
      const nuevoUserId = data?.user?.id;
      if (!nuevoUserId) throw new Error('La cuenta no devolvió un identificador. Verifica en Supabase → Authentication.');

      // 2. Vincular la cuenta al paciente
      const { error: errUpd } = await supabase
        .from('pacientes')
        .update({ user_id: nuevoUserId, invitado_at: new Date().toISOString() })
        .eq('id', pacienteId);
      if (errUpd) throw new Error('Cuenta creada pero no se pudo vincular al paciente: ' + errUpd.message);

      setCredenciales({ email: pacFull.email.trim().toLowerCase(), password });
      setPacFull(p => ({ ...p, user_id: nuevoUserId, invitado_at: new Date().toISOString() }));
      if (onActualizado) onActualizado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerando(false);
    }
  };

  const copiarCredenciales = async () => {
    if (!credenciales) return;
    const texto = `App IMC: ${APP_URL}\nUsuario: ${credenciales.email}\nContraseña temporal: ${credenciales.password}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar automáticamente. Copia manualmente los datos.');
    }
  };

  const abrirWhatsApp = (conCredenciales) => {
    const tel = telefonoWhatsApp(pacFull?.telefono);
    const nombre = pacFull?.nombre || 'paciente';
    const msg = conCredenciales && credenciales
      ? mensajeBienvenida(nombre, credenciales.email, credenciales.password)
      : `Hola ${nombre} 👋 Te recordamos que ya tienes acceso a la app de IMC en ${APP_URL} — ingresa con tu correo ${pacFull?.email || ''}. Si olvidaste tu contraseña, avísanos por aquí.`;
    const base = tel ? `https://wa.me/${tel}` : 'https://wa.me/';
    window.open(`${base}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const yaTieneAcceso = !!pacFull?.user_id;

  const btn = (bg, color = 'white') => ({ padding: '10px 20px', background: bg, color, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ background: B.navy, padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>🔑 Acceso a la app</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '2px 0 0' }}>
              {pacFull ? `${pacFull.nombre} ${pacFull.apellido || ''}` : '...'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: 'none', borderRadius: 6, width: 30, height: 30, fontSize: 15, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {cargando ? (
            <p style={{ color: B.gray, fontSize: 13, textAlign: 'center', padding: 20 }}>Cargando...</p>
          ) : credenciales ? (
            /* ── Credenciales generadas ── */
            <div>
              <div style={{ background: '#E6F5EE', border: `1.5px solid ${B.green}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: B.green, fontWeight: 700 }}>✓ Cuenta creada y vinculada al paciente</p>
              </div>
              <div style={{ background: B.grayLt, borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontFamily: 'monospace', fontSize: 13, lineHeight: 2, color: B.navy }}>
                <div>🔗 {APP_URL}</div>
                <div>📧 {credenciales.email}</div>
                <div>🔑 <strong>{credenciales.password}</strong></div>
              </div>
              <div style={{ background: '#FFF8E7', border: `1px solid ${B.gold}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 12, color: B.navy }}>
                  ⚠️ <strong>Guarda o envía estas credenciales ahora</strong> — por seguridad, la contraseña no se puede volver a consultar después de cerrar esta ventana.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={copiarCredenciales} style={btn(B.teal)}>
                  {copiado ? '✓ Copiado' : '📋 Copiar'}
                </button>
                <button onClick={() => abrirWhatsApp(true)} style={btn('#25D366')}>
                  📲 Enviar por WhatsApp
                </button>
                <button onClick={onClose} style={btn(B.grayLt, B.gray)}>Cerrar</button>
              </div>
            </div>
          ) : yaTieneAcceso ? (
            /* ── Ya tiene cuenta ── */
            <div>
              <div style={{ background: '#E8F2FA', border: `1.5px solid ${B.blue}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: B.navy }}>
                  ✓ Este paciente <strong>ya tiene acceso</strong> a la app con el correo <strong>{pacFull.email}</strong>
                  {pacFull.invitado_at ? ` (generado el ${new Date(pacFull.invitado_at).toLocaleDateString('es-EC')})` : ''}.
                </p>
              </div>
              <p style={{ fontSize: 12, color: B.gray, marginBottom: 16 }}>
                Si el paciente olvidó su contraseña, restablécela desde Supabase → Authentication → Users → (⋯) Reset password, o elimina esa cuenta y genera el acceso de nuevo.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => abrirWhatsApp(false)} style={btn('#25D366')}>
                  📲 Reenviar recordatorio
                </button>
                <button onClick={onClose} style={btn(B.grayLt, B.gray)}>Cerrar</button>
              </div>
            </div>
          ) : (
            /* ── Aún sin cuenta: generar ── */
            <div>
              <p style={{ fontSize: 13, color: B.navy, marginBottom: 6 }}>
                Se creará una cuenta de acceso a la app del paciente con:
              </p>
              <div style={{ background: B.grayLt, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: B.navy, lineHeight: 1.9 }}>
                <div>📧 <strong>{pacFull?.email || '— sin email registrado —'}</strong></div>
                <div>📱 {pacFull?.telefono || '— sin teléfono —'} {pacFull?.telefono ? '(para el envío por WhatsApp)' : ''}</div>
              </div>
              {!pacFull?.email && (
                <div style={{ background: '#FFEBEB', border: `1px solid ${B.red}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 12, color: B.red }}>Este paciente no tiene email registrado. Edita su ficha y agrega uno antes de generar el acceso.</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={btn(B.grayLt, B.gray)}>Cancelar</button>
                <button onClick={generarAcceso} disabled={generando || !pacFull?.email} style={{ ...btn(B.navy), opacity: (generando || !pacFull?.email) ? 0.6 : 1 }}>
                  {generando ? 'Creando cuenta...' : '🔑 Generar acceso ahora'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#FFEBEB', border: `1px solid ${B.red}`, borderRadius: 8, padding: '10px 14px', marginTop: 14 }}>
              <p style={{ margin: 0, fontSize: 12, color: B.red }}>⚠️ {error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
