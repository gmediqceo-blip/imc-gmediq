import { supabase } from './supabase';

// =====================================================================
//  Acceso a datos del módulo de caja.
//
//  Todo lo que devuelve depende de quién pregunta: las políticas de la
//  base filtran solas. Si una secretaria pide saldos, la base responde
//  "no autorizado" — no hace falta esconder nada desde aquí.
// =====================================================================

export const EMPRESAS = [
  { value: 'IMC', label: 'IMC' },
  { value: 'GMEDIQ', label: 'Gmediq' },
  { value: 'COMPARTIDO', label: 'Compartido' },
];

export const TIPOS = [
  { value: 'ingreso', label: 'Entró dinero', color: '#1A7A4A' },
  { value: 'egreso', label: 'Salió dinero', color: '#B02020' },
  { value: 'traslado', label: 'Entre cuentas', color: '#1E7CB5' },
];

export const money = (n) =>
  (n === null || n === undefined || isNaN(n))
    ? '—'
    : Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Quién es el usuario dentro del módulo ────────────────────────────
export async function getMiembro(userId) {
  const { data } = await supabase
    .from('caja_usuarios').select('*')
    .eq('id', userId).eq('activo', true).maybeSingle();
  return data;
}

export async function getCuentas() {
  const { data } = await supabase
    .from('caja_cuentas').select('*').eq('activa', true).order('orden');
  return data || [];
}

// Las confidenciales (sueldos, IESS) no llegan si quien pregunta es
// secretaria: las filtra la política, no este código.
export async function getCategorias() {
  const { data } = await supabase
    .from('caja_categorias').select('*').eq('activa', true).order('orden');
  return data || [];
}

export async function getCasosAbiertos() {
  const { data } = await supabase
    .from('caja_casos').select('*')
    .eq('estado', 'abierto').order('fecha_apertura', { ascending: false });
  return data || [];
}

// ── Solo gerentes: la base lanza error si pregunta alguien más ───────
export async function getSaldos() {
  const { data, error } = await supabase.rpc('caja_saldos');
  if (error) return null;
  return data;
}

export async function getPanel() {
  const { data, error } = await supabase.rpc('caja_panel');
  if (error) return null;
  return data?.[0] || null;
}

export async function getResultadoCasos() {
  const { data } = await supabase.rpc('caja_resultado_casos');
  return data || [];
}

// ── Movimientos ──────────────────────────────────────────────────────
export async function getMovimientos({ desde, hasta, limite = 100 } = {}) {
  let q = supabase
    .from('caja_movimientos')
    .select(`*,
             cuenta:cuenta_id (nombre, tipo),
             destino:cuenta_destino_id (nombre),
             categoria:categoria_id (nombre),
             caso:caso_id (paciente),
             liquidacion:liquidacion_id (fecha, monto_recibido)`)
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
    .limit(limite);
  if (desde) q = q.gte('fecha', desde);
  if (hasta) q = q.lte('fecha', hasta);
  const { data } = await q;
  return data || [];
}

export async function crearMovimiento(mov, userId) {
  const fila = { ...mov, creado_por: userId };
  // La comisión la calcula un trigger en la base: si hubiera que
  // escribirla a mano, nadie la escribiría.
  delete fila.comision;
  const { data, error } = await supabase
    .from('caja_movimientos').insert(fila).select().single();
  return { data, error };
}

export async function anularMovimiento(id, motivo, userId) {
  const { error } = await supabase
    .from('caja_movimientos')
    .update({
      anulado: true,
      motivo_anulacion: motivo,
      anulado_por: userId,
      anulado_en: new Date().toISOString(),
    })
    .eq('id', id);
  return error;
}

// ── Cobros con tarjeta ───────────────────────────────────────────────
// Un cobro con tarjeta espera en Datafast, PayPhone o Bendo hasta que
// la plataforma lo deposita. Confirmarlo crea el traslado al banco; la
// comisión sale sola de la diferencia.
export function enTransito(m) {
  return m.tipo === 'ingreso' && !m.anulado
    && m.cuenta?.tipo === 'transito' && !m.liquidacion_id;
}

// Los cobros que siguen esperando depósito, sin importar la fecha: un
// depósito de hoy puede traer consumos de la semana pasada, y si el
// filtro de fechas los escondiera, no se podrían marcar juntos.
export async function getTransitoPendiente() {
  const { data } = await supabase
    .from('caja_movimientos')
    .select(`*, cuenta:cuenta_id (nombre, tipo), categoria:categoria_id (nombre)`)
    .eq('tipo', 'ingreso').eq('anulado', false).is('liquidacion_id', null)
    .order('fecha', { ascending: false });
  return (data || []).filter((m) => m.cuenta?.tipo === 'transito');
}

export async function liquidarCobros({ ingresos, cuentaDestinoId, montoRecibido, fecha }) {
  const { data, error } = await supabase.rpc('caja_liquidar', {
    p_ingresos: ingresos,
    p_cuenta_destino: cuentaDestinoId,
    p_monto_recibido: montoRecibido,
    p_fecha: fecha,
  });
  return { data, error };
}

export async function crearCaso(caso, userId) {
  const { data, error } = await supabase
    .from('caja_casos').insert({ ...caso, creado_por: userId }).select().single();
  return { data, error };
}
