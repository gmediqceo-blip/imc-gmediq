import { useState, useEffect, useRef, useCallback } from 'react';
import {
  EMPRESAS, TIPOS, money, enTransito,
  getCuentas, getCategorias, getCasosAbiertos,
  getPanel, getSaldos, getMovimientos, crearMovimiento, anularMovimiento,
  liquidarCobros,
} from '../lib/caja';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
};

function useIsMobile() {
  const [m, setM] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const r = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  return m;
}

const hoy = () => new Date().toISOString().slice(0, 10);

// =====================================================================
//  PANEL — solo gerentes
// =====================================================================
function Panel({ isMobile }) {
  const [panel, setPanel] = useState(null);
  const [saldos, setSaldos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([getPanel(), getSaldos()]);
      setPanel(p); setSaldos(s || []); setCargando(false);
    })();
  }, []);

  if (cargando) return <p style={{ color: B.gray }}>Cargando saldos…</p>;
  if (!panel) return <p style={{ color: B.gray }}>No se pudieron leer los saldos.</p>;

  const tile = (label, valor, color, nota) => (
    <div key={label} style={{
      background: B.white, borderRadius: 12, padding: '16px 18px',
      border: `1px solid ${B.grayMd}`, flex: '1 1 180px', minWidth: 160,
    }}>
      <p style={{ margin: 0, fontSize: 11, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 800, color }}>$ {money(valor)}</p>
      {nota && <p style={{ margin: '4px 0 0', fontSize: 11, color: B.gray }}>{nota}</p>}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        {tile('Disponible', panel.disponible, B.navy, 'Bancos + efectivo')}
        {tile('En tránsito', panel.en_transito, B.teal, 'Cobrado, sin depositar')}
        {tile('Comprometido', Number(panel.abonos_comprometidos) + Number(panel.costos_apartados), B.orange,
              `Abonos ${money(panel.abonos_comprometidos)} · apartado ${money(panel.costos_apartados)}`)}
        {tile('Libre de verdad', panel.libre, Number(panel.libre) < 0 ? B.red : B.green, 'Se puede gastar')}
      </div>

      <p style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
        Saldo por cuenta
      </p>
      <div style={{ background: B.white, borderRadius: 12, border: `1px solid ${B.grayMd}`, overflow: 'hidden' }}>
        {saldos.map((s, i) => (
          <div key={s.cuenta} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderTop: i ? `1px solid ${B.grayLt}` : 'none',
          }}>
            <span style={{ fontSize: 14, color: B.navy }}>
              {s.cuenta}
              {s.tipo === 'transito' && (
                <span style={{ fontSize: 10, color: B.teal, marginLeft: 8, textTransform: 'uppercase' }}>en tránsito</span>
              )}
            </span>
            <strong style={{ fontSize: 15, color: B.navy }}>$ {money(s.saldo)}</strong>
          </div>
        ))}
      </div>
      {!isMobile && (
        <p style={{ fontSize: 11, color: B.gray, marginTop: 12 }}>
          El dinero en tránsito no entra en “disponible”: está cobrado pero la plataforma todavía no lo deposita.
        </p>
      )}
    </div>
  );
}

// =====================================================================
//  REGISTRAR
// =====================================================================
function Formulario({ miembro, cuentas, categorias, casos, onRegistrado, isMobile }) {
  const esGerente = miembro.rol === 'gerente';
  const vacio = {
    tipo: 'ingreso', fecha: hoy(), monto: '', cuenta_id: '', cuenta_destino_id: '',
    monto_recibido: '', categoria_id: '', caso_id: '', contraparte: '', descripcion: '',
    interbancaria: false,
    empresa: esGerente ? 'GMEDIQ' : miembro.empresa,
  };
  const [f, setF] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const montoRef = useRef(null);

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  const tipos = esGerente ? TIPOS : TIPOS.filter((t) => t.value !== 'traslado');
  const cats = categorias.filter((c) => c.tipo === f.tipo);
  const catSel = categorias.find((c) => c.id === f.categoria_id);
  const cuentaSel = cuentas.find((c) => c.id === f.cuenta_id);
  const esTraslado = f.tipo === 'traslado';
  // Solo tiene sentido ligar a un caso un ingreso o un costo directo.
  const puedeLigarCaso = !esTraslado && (f.tipo === 'ingreso' || catSel?.costo_directo);

  const guardar = async () => {
    setError(null);
    const monto = parseFloat(String(f.monto).replace(',', '.'));
    if (!monto || monto <= 0) return setError('Pon un monto mayor que cero.');
    if (!f.cuenta_id) return setError('Elige la cuenta.');
    if (esTraslado) {
      if (!f.cuenta_destino_id) return setError('Elige la cuenta de destino.');
      if (f.cuenta_destino_id === f.cuenta_id) return setError('El origen y el destino no pueden ser la misma cuenta.');
    } else if (!f.categoria_id) {
      return setError(f.tipo === 'ingreso' ? 'Elige el servicio.' : 'Elige la categoría.');
    }

    const recibido = esTraslado
      ? (f.monto_recibido === '' ? monto : parseFloat(String(f.monto_recibido).replace(',', '.')))
      : null;
    if (esTraslado && (recibido > monto || recibido <= 0)) {
      return setError('Lo que llega no puede ser mayor que lo que sale.');
    }

    setGuardando(true);
    const { error: err } = await crearMovimiento({
      tipo: f.tipo,
      fecha: f.fecha,
      monto,
      monto_recibido: recibido,
      cuenta_id: f.cuenta_id,
      cuenta_destino_id: esTraslado ? f.cuenta_destino_id : null,
      categoria_id: esTraslado ? null : f.categoria_id,
      caso_id: puedeLigarCaso && f.caso_id ? f.caso_id : null,
      empresa: esTraslado ? null : f.empresa,
      contraparte: f.contraparte || null,
      descripcion: f.descripcion || null,
      interbancaria: f.tipo === 'egreso' && f.interbancaria,
    }, miembro.id);
    setGuardando(false);

    if (err) return setError(err.message);
    // Se conserva tipo, fecha y cuenta: lo normal es cargar varios seguidos.
    setF((prev) => ({ ...prev, monto: '', monto_recibido: '', contraparte: '', descripcion: '', caso_id: '' }));
    onRegistrado();
    montoRef.current?.focus();
  };

  const label = (t) => (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{t}</label>
  );
  const input = {
    width: '100%', padding: isMobile ? '14px 12px' : '9px 11px', fontSize: isMobile ? 16 : 14,
    border: `1px solid ${B.grayMd}`, borderRadius: 8, background: B.white, color: B.navy,
    boxSizing: 'border-box',
  };
  const campo = (ancho = '1 1 180px') => ({ flex: ancho, minWidth: 140, marginBottom: 12 });

  return (
    <div style={{ background: B.white, borderRadius: 12, border: `1px solid ${B.grayMd}`, padding: isMobile ? 16 : 20 }}>
      {/* Tipo de movimiento */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tipos.map((t) => (
          <button key={t.value} onClick={() => setF({ ...vacio, tipo: t.value, fecha: f.fecha })}
            style={{
              flex: isMobile ? '1 1 45%' : '0 0 auto',
              padding: isMobile ? '14px 16px' : '9px 18px', fontSize: 14, fontWeight: 700,
              borderRadius: 8, cursor: 'pointer',
              border: `2px solid ${f.tipo === t.value ? t.color : B.grayMd}`,
              background: f.tipo === t.value ? t.color : B.white,
              color: f.tipo === t.value ? B.white : B.gray,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <div style={campo('0 0 140px')}>
            {label('Fecha')}
            <input type="date" style={input} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />
          </div>

          <div style={campo('0 0 140px')}>
            {label(esTraslado ? 'Sale' : 'Monto')}
            <input ref={montoRef} autoFocus inputMode="decimal" placeholder="0.00" style={input}
              value={f.monto} onChange={(e) => set('monto', e.target.value)} />
          </div>

          {esTraslado && (
            <div style={campo('0 0 140px')}>
              {label('Llega')}
              <input inputMode="decimal" placeholder="igual que sale" style={input}
                value={f.monto_recibido} onChange={(e) => set('monto_recibido', e.target.value)} />
            </div>
          )}

          <div style={campo()}>
            {label(esTraslado ? 'Desde' : f.tipo === 'ingreso' ? 'Entra a' : 'Sale de')}
            <select style={input} value={f.cuenta_id} onChange={(e) => set('cuenta_id', e.target.value)}>
              <option value="">Elegir…</option>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {esTraslado && (
            <div style={campo()}>
              {label('Hacia')}
              <select style={input} value={f.cuenta_destino_id} onChange={(e) => set('cuenta_destino_id', e.target.value)}>
                <option value="">Elegir…</option>
                {cuentas.filter((c) => c.id !== f.cuenta_id).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          {!esTraslado && (
            <div style={campo('1 1 220px')}>
              {label(f.tipo === 'ingreso' ? 'Servicio' : 'Categoría')}
              <select style={input} value={f.categoria_id} onChange={(e) => set('categoria_id', e.target.value)}>
                <option value="">Elegir…</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          {!esTraslado && esGerente && (
            <div style={campo('0 0 150px')}>
              {label('Empresa')}
              <select style={input} value={f.empresa} onChange={(e) => set('empresa', e.target.value)}>
                {EMPRESAS.map((e2) => <option key={e2.value} value={e2.value}>{e2.label}</option>)}
              </select>
            </div>
          )}

          {!esTraslado && (
            <div style={campo()}>
              {label(f.tipo === 'ingreso' ? 'Quién paga' : 'A quién')}
              <input style={input} value={f.contraparte} onChange={(e) => set('contraparte', e.target.value)} />
            </div>
          )}

          {puedeLigarCaso && casos.length > 0 && (
            <div style={campo('1 1 220px')}>
              {label('¿Es de un paciente en proceso?')}
              <select style={input} value={f.caso_id} onChange={(e) => set('caso_id', e.target.value)}>
                <option value="">No — movimiento suelto</option>
                {casos.map((k) => <option key={k.id} value={k.id}>{k.paciente} — {k.servicio}</option>)}
              </select>
            </div>
          )}

          <div style={campo('1 1 100%')}>
            {label('Nota')}
            <input style={input} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)}
              placeholder={catSel?.nombre === 'Otros' ? 'Obligatoria en “Otros”: ¿en qué se gastó?' : 'Opcional'} />
          </div>
        </div>

        {f.tipo === 'egreso' && cuentaSel?.tipo === 'banco' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: B.navy, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.interbancaria} onChange={(e) => set('interbancaria', e.target.checked)} />
            Transferencia a otro banco — se descuentan $0,41 de comisión automáticamente
          </label>
        )}

        {error && (
          <div style={{ background: '#FDECEC', color: B.red, padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={guardando}
          style={{
            width: isMobile ? '100%' : 'auto', padding: isMobile ? '16px 20px' : '11px 28px',
            fontSize: 15, fontWeight: 800, color: B.white, background: guardando ? B.gray : B.navy,
            border: 'none', borderRadius: 8, cursor: guardando ? 'default' : 'pointer',
          }}>
          {guardando ? 'Guardando…' : 'Registrar'}
        </button>
        {!isMobile && (
          <span style={{ fontSize: 11, color: B.gray, marginLeft: 12 }}>
            Enter también guarda. Quedan la fecha y la cuenta para el siguiente.
          </span>
        )}
      </form>
    </div>
  );
}

// =====================================================================
//  MOVIMIENTOS
// =====================================================================
// Totales de lo que se está mirando. Los traslados quedan fuera a
// propósito: mover dinero de una cuenta a otra no es ingreso ni gasto.
function Totales({ movimientos, isMobile }) {
  const vivos = movimientos.filter((m) => !m.anulado);
  const entro = vivos.filter((m) => m.tipo === 'ingreso')
    .reduce((s, m) => s + Number(m.monto), 0);
  const salio = vivos.filter((m) => m.tipo === 'egreso')
    .reduce((s, m) => s + Number(m.monto) + Number(m.comision), 0);
  const dif = entro - salio;

  const celda = (label, valor, color) => (
    <div style={{ flex: 1, minWidth: 100 }}>
      <p style={{ margin: 0, fontSize: 10, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: isMobile ? 16 : 18, fontWeight: 800, color }}>$ {money(valor)}</p>
    </div>
  );

  return (
    <div style={{
      display: 'flex', gap: 12, flexWrap: 'wrap',
      background: B.white, border: `1px solid ${B.grayMd}`, borderRadius: 12,
      padding: '12px 16px', marginBottom: 12,
    }}>
      {celda('Entró', entro, B.green)}
      {celda('Salió', salio, B.red)}
      {celda('Diferencia', dif, dif < 0 ? B.red : B.navy)}
    </div>
  );
}

// =====================================================================
//  BALANCE — qué entró, qué salió y en qué se fue
// =====================================================================
const PERIODOS = [
  { key: 'mes', label: 'Este mes' },
  { key: 'anterior', label: 'Mes pasado' },
  { key: 'anio', label: 'Este año' },
  { key: 'todo', label: 'Todo' },
];

function rangoDe(periodo) {
  const h = new Date();
  const p = (d) => d.toISOString().slice(0, 10);
  if (periodo === 'mes') {
    return { desde: p(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: p(h), titulo: 'Este mes' };
  }
  if (periodo === 'anterior') {
    return {
      desde: p(new Date(h.getFullYear(), h.getMonth() - 1, 1)),
      hasta: p(new Date(h.getFullYear(), h.getMonth(), 0)),
      titulo: 'Mes pasado',
    };
  }
  if (periodo === 'anio') {
    return { desde: p(new Date(h.getFullYear(), 0, 1)), hasta: p(h), titulo: `Año ${h.getFullYear()}` };
  }
  return { desde: null, hasta: null, titulo: 'Desde el inicio' };
}

function Balance({ isMobile }) {
  const [periodo, setPeriodo] = useState('mes');
  const [empresa, setEmpresa] = useState('todas');
  const [movs, setMovs] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      setCargando(true);
      const { desde, hasta } = rangoDe(periodo);
      setMovs(await getMovimientos({ desde, hasta, limite: 2000 }));
      setCargando(false);
    })();
  }, [periodo]);

  const rango = rangoDe(periodo);
  const vivos = movs.filter((m) => !m.anulado && m.tipo !== 'traslado'
    && (empresa === 'todas' || m.empresa === empresa));

  const ingresos = vivos.filter((m) => m.tipo === 'ingreso');
  const egresos = vivos.filter((m) => m.tipo === 'egreso');
  const totalIn = ingresos.reduce((s, m) => s + Number(m.monto), 0);
  const totalEg = egresos.reduce((s, m) => s + Number(m.monto) + Number(m.comision), 0);

  // Agrupa por categoría y ordena de mayor a menor: lo primero que se
  // quiere ver de un gasto es cuál se está comiendo el mes.
  const agrupar = (lista, conComision) => {
    const mapa = {};
    for (const m of lista) {
      const k = m.categoria?.nombre || 'Sin categoría';
      mapa[k] = (mapa[k] || 0) + Number(m.monto) + (conComision ? Number(m.comision) : 0);
    }
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  };
  const porServicio = agrupar(ingresos, false);
  const porCategoria = agrupar(egresos, true);

  const descargarCSV = () => {
    const filas = [['Fecha', 'Tipo', 'Empresa', 'Categoría', 'Contraparte', 'Cuenta', 'Nota', 'Monto', 'Comisión']];
    for (const m of vivos) {
      filas.push([
        m.fecha, m.tipo, m.empresa || '', m.categoria?.nombre || '',
        m.contraparte || '', m.cuenta?.nombre || '', m.descripcion || '',
        Number(m.monto).toFixed(2), Number(m.comision).toFixed(2),
      ]);
    }
    const csv = filas.map((f) =>
      f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    // BOM para que Excel abra bien las tildes
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `balance-${empresa.toLowerCase()}-${rango.desde || 'inicio'}-a-${rango.hasta || 'hoy'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const chip = (activo) => ({
    padding: isMobile ? '9px 14px' : '7px 14px', fontSize: 12, fontWeight: 700,
    borderRadius: 8, cursor: 'pointer',
    border: `1px solid ${activo ? B.navy : B.grayMd}`,
    background: activo ? B.navy : B.white, color: activo ? B.white : B.gray,
  });

  const tabla = (titulo, filas, total, color) => (
    <div style={{ flex: '1 1 320px', minWidth: 280 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
        {titulo}
      </p>
      <div style={{ background: B.white, borderRadius: 12, border: `1px solid ${B.grayMd}`, overflow: 'hidden' }}>
        {filas.length === 0 && (
          <p style={{ padding: '14px 16px', margin: 0, fontSize: 13, color: B.gray }}>Nada en este periodo.</p>
        )}
        {filas.map(([nombre, monto], i) => (
          <div key={nombre} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderTop: i ? `1px solid ${B.grayLt}` : 'none',
          }}>
            <span style={{ fontSize: 13, color: B.navy }}>{nombre}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: B.navy, whiteSpace: 'nowrap' }}>
              $ {money(monto)}
              <span style={{ color: B.gray, fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
                {total > 0 ? `${Math.round((monto / total) * 100)}%` : ''}
              </span>
            </span>
          </div>
        ))}
        {filas.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '11px 16px', borderTop: `2px solid ${B.grayMd}`, background: B.grayLt,
          }}>
            <strong style={{ fontSize: 13, color: B.navy }}>Total</strong>
            <strong style={{ fontSize: 14, color }}>$ {money(total)}</strong>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {PERIODOS.map((p) => (
          <button key={p.key} onClick={() => setPeriodo(p.key)} style={chip(periodo === p.key)}>{p.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ key: 'todas', label: 'Las dos' }, { key: 'IMC', label: 'IMC' },
          { key: 'GMEDIQ', label: 'Gmediq' }, { key: 'COMPARTIDO', label: 'Compartido' }].map((e) => (
          <button key={e.key} onClick={() => setEmpresa(e.key)} style={{
            ...chip(empresa === e.key),
            border: `1px solid ${empresa === e.key ? B.blue : B.grayMd}`,
            background: empresa === e.key ? B.blue : B.white,
          }}>{e.label}</button>
        ))}
      </div>

      {cargando ? <p style={{ color: B.gray }}>Calculando…</p> : (
        <>
          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', background: B.white,
            border: `1px solid ${B.grayMd}`, borderRadius: 12, padding: '14px 18px', marginBottom: 16,
          }}>
            <div style={{ flex: 1, minWidth: 110 }}>
              <p style={{ margin: 0, fontSize: 10, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.6 }}>Ingresos</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: B.green }}>$ {money(totalIn)}</p>
            </div>
            <div style={{ flex: 1, minWidth: 110 }}>
              <p style={{ margin: 0, fontSize: 10, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.6 }}>Egresos</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: B.red }}>$ {money(totalEg)}</p>
            </div>
            <div style={{ flex: 1, minWidth: 110 }}>
              <p style={{ margin: 0, fontSize: 10, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.6 }}>Diferencia</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: totalIn - totalEg < 0 ? B.red : B.navy }}>
                $ {money(totalIn - totalEg)}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={descargarCSV} style={{
                padding: '10px 18px', fontSize: 13, fontWeight: 700, color: B.white,
                background: B.navy, border: 'none', borderRadius: 8, cursor: 'pointer',
              }}>
                Descargar Excel
              </button>
            </div>
          </div>

          <p style={{ fontSize: 12, color: B.gray, margin: '0 0 12px' }}>
            {rango.titulo}{rango.desde ? ` · del ${rango.desde} al ${rango.hasta}` : ''} ·
            {' '}{vivos.length} movimiento{vivos.length === 1 ? '' : 's'}.
            Los traslados entre cuentas no entran: mover dinero no es ingreso ni gasto.
          </p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            {tabla('Qué entró, por servicio', porServicio, totalIn, B.green)}
            {tabla('En qué se gastó', porCategoria, totalEg, B.red)}
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
            Detalle de gastos
          </p>
          <div style={{ background: B.white, borderRadius: 12, border: `1px solid ${B.grayMd}`, overflow: 'hidden' }}>
            {egresos.length === 0 && (
              <p style={{ padding: '14px 16px', margin: 0, fontSize: 13, color: B.gray }}>No hay gastos en este periodo.</p>
            )}
            {egresos.map((m, i) => (
              <div key={m.id} style={{
                display: 'flex', justifyContent: 'space-between', gap: 12,
                padding: '10px 16px', borderTop: i ? `1px solid ${B.grayLt}` : 'none',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: B.navy, fontWeight: 600 }}>
                    {m.categoria?.nombre || '—'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: B.gray }}>
                    {m.fecha}
                    {m.contraparte ? ` · ${m.contraparte}` : ''}
                    {m.empresa ? ` · ${m.empresa}` : ''}
                    {m.descripcion ? ` · ${m.descripcion}` : ''}
                    {Number(m.comision) > 0 ? ` · comisión $${money(m.comision)}` : ''}
                  </p>
                </div>
                <strong style={{ fontSize: 13, color: B.red, whiteSpace: 'nowrap' }}>
                  $ {money(Number(m.monto) + Number(m.comision))}
                </strong>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================================
//  CONFIRMAR EL DEPÓSITO DE UN COBRO CON TARJETA
//
//  Se abre con un cobro, pero deja marcar los demás de la misma
//  plataforma: Datafast no deposita consumo por consumo, deposita el
//  lote. Y lo que llega casi nunca es lo cobrado — por eso el monto se
//  puede corregir, y la diferencia queda registrada como comisión.
// =====================================================================
function ConfirmarDeposito({ cobro, todos, cuentas, onCerrar, onHecho, isMobile }) {
  const hermanos = todos.filter((m) =>
    enTransito(m) && m.cuenta_id === cobro.cuenta_id && m.id !== cobro.id);
  const candidatos = [cobro, ...hermanos];
  const totalDe = (ids) => candidatos
    .filter((m) => ids.includes(m.id))
    .reduce((s, m) => s + Number(m.monto), 0);

  const bancos = cuentas.filter((c) => c.tipo !== 'transito');
  const [marcados, setMarcados] = useState([cobro.id]);
  const [recibido, setRecibido] = useState(Number(cobro.monto).toFixed(2));
  const [destino, setDestino] = useState(bancos[0]?.id || '');
  const [fecha, setFecha] = useState(hoy());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const esperado = totalDe(marcados);
  const recibidoNum = parseFloat(String(recibido).replace(',', '.'));
  const diferencia = esperado - (isNaN(recibidoNum) ? esperado : recibidoNum);

  // Lo que se espera es el punto de partida de lo que llegó: si cambia
  // lo que entra al depósito, el monto tiene que seguirlo.
  const alternar = (id) => {
    const sig = marcados.includes(id)
      ? marcados.filter((x) => x !== id)
      : [...marcados, id];
    setMarcados(sig);
    setRecibido(totalDe(sig).toFixed(2));
  };

  const confirmar = async () => {
    setError(null);
    if (!marcados.length) return setError('Marca al menos un cobro.');
    if (!destino) return setError('Elige a qué cuenta llegó el depósito.');
    if (!recibidoNum || recibidoNum <= 0) return setError('Pon cuánto llegó a la cuenta.');
    if (recibidoNum > esperado + 0.005) {
      return setError('Llegó más de lo que suman los cobros marcados. Si el depósito traía otros consumos, márcalos también aquí.');
    }
    setGuardando(true);
    const { error: err } = await liquidarCobros({
      ingresos: marcados, cuentaDestinoId: destino, montoRecibido: recibidoNum, fecha,
    });
    setGuardando(false);
    if (err) return setError(err.message);
    onHecho(marcados.length);
  };

  const label = (t) => (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{t}</label>
  );
  const input = {
    width: '100%', padding: isMobile ? '14px 12px' : '9px 11px', fontSize: isMobile ? 16 : 14,
    border: `1px solid ${B.grayMd}`, borderRadius: 8, background: B.white, color: B.navy,
    boxSizing: 'border-box',
  };

  return (
    <div onClick={onCerrar} style={{
      position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: B.white, borderRadius: 14, width: '100%', maxWidth: 460,
        maxHeight: '88vh', overflowY: 'auto', padding: isMobile ? 18 : 22,
        boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
      }}>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: B.navy }}>Confirmar depósito</p>
        <p style={{ margin: '4px 0 16px', fontSize: 12, color: B.gray }}>
          {cobro.cuenta?.nombre} deposita en el banco. Lo que se quedó la plataforma
          se calcula solo con la diferencia.
        </p>

        <p style={{ fontSize: 11, fontWeight: 700, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 6px' }}>
          {hermanos.length ? '¿Qué cobros venían en ese depósito?' : 'Cobro'}
        </p>
        <div style={{ border: `1px solid ${B.grayMd}`, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
          {candidatos.map((m, i) => (
            <label key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              padding: '10px 12px', borderTop: i ? `1px solid ${B.grayLt}` : 'none',
              background: marcados.includes(m.id) ? '#F2F8FC' : B.white,
            }}>
              <input type="checkbox" checked={marcados.includes(m.id)} onChange={() => alternar(m.id)} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: B.navy }}>
                {m.categoria?.nombre || '—'}
                <span style={{ display: 'block', fontSize: 11, color: B.gray }}>
                  {m.fecha}{m.contraparte ? ` · ${m.contraparte}` : ''}{m.empresa ? ` · ${m.empresa}` : ''}
                </span>
              </span>
              <strong style={{ fontSize: 13, color: B.navy, whiteSpace: 'nowrap' }}>$ {money(m.monto)}</strong>
            </label>
          ))}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: B.grayLt, borderRadius: 10, padding: '10px 14px', marginBottom: 14,
        }}>
          <span style={{ fontSize: 12, color: B.gray, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
            Se cobró
          </span>
          <strong style={{ fontSize: 17, color: B.navy }}>$ {money(esperado)}</strong>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: '1 1 150px', marginBottom: 12 }}>
            {label('¿Cuánto llegó?')}
            <input inputMode="decimal" autoFocus style={input}
              value={recibido} onChange={(e) => setRecibido(e.target.value)} />
          </div>
          <div style={{ flex: '0 0 140px', marginBottom: 12 }}>
            {label('Fecha del depósito')}
            <input type="date" style={input} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 100%', marginBottom: 12 }}>
            {label('Entra a')}
            <select style={input} value={destino} onChange={(e) => setDestino(e.target.value)}>
              {bancos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        <p style={{ fontSize: 12, color: diferencia > 0 ? B.orange : B.gray, margin: '0 0 14px' }}>
          {isNaN(recibidoNum) || recibidoNum <= 0
            ? 'Si llegó completo, deja el valor como está.'
            : diferencia > 0.005
              ? `La plataforma se quedó $ ${money(diferencia)}. Queda registrado como comisión.`
              : 'Llegó completo: sin comisión.'}
        </p>

        {error && (
          <div style={{ background: '#FDECEC', color: B.red, padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={confirmar} disabled={guardando} style={{
            flex: 1, minWidth: 160, padding: isMobile ? '15px 20px' : '11px 22px',
            fontSize: 15, fontWeight: 800, color: B.white,
            background: guardando ? B.gray : B.green,
            border: 'none', borderRadius: 8, cursor: guardando ? 'default' : 'pointer',
          }}>
            {guardando ? 'Confirmando…' : 'Pago confirmado'}
          </button>
          <button onClick={onCerrar} style={{
            padding: isMobile ? '15px 20px' : '11px 22px', fontSize: 14, fontWeight: 700,
            color: B.gray, background: B.white, border: `1px solid ${B.grayMd}`,
            borderRadius: 8, cursor: 'pointer',
          }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function Lista({ movimientos, todos, cuentas, miembro, onCambio, onAviso, isMobile }) {
  const esGerente = miembro.rol === 'gerente';
  const [confirmando, setConfirmando] = useState(null);

  const anular = async (m) => {
    const motivo = window.prompt(`¿Por qué se anula este movimiento de $${money(m.monto)}?`);
    if (!motivo) return;
    const err = await anularMovimiento(m.id, motivo, miembro.id);
    if (err) window.alert('No se pudo anular: ' + err.message);
    else onCambio();
  };

  if (!movimientos.length) {
    return <p style={{ color: B.gray, fontSize: 14 }}>Todavía no hay movimientos registrados.</p>;
  }

  const signo = (m) => m.tipo === 'ingreso' ? '+' : m.tipo === 'egreso' ? '−' : '→';
  const color = (m) => m.tipo === 'ingreso' ? B.green : m.tipo === 'egreso' ? B.red : B.blue;
  const esTarjeta = (m) => m.tipo === 'ingreso' && !m.anulado && m.cuenta?.tipo === 'transito';
  const sello = {
    display: 'inline-block', marginTop: 5, padding: '3px 9px', borderRadius: 20,
    fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
  };

  return (
    <>
    <div style={{ background: B.white, borderRadius: 12, border: `1px solid ${B.grayMd}`, overflow: 'hidden' }}>
      {movimientos.map((m, i) => (
        <div key={m.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
          padding: isMobile ? '12px 14px' : '11px 16px',
          borderTop: i ? `1px solid ${B.grayLt}` : 'none',
          opacity: m.anulado ? 0.45 : 1,
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: 14, color: B.navy, fontWeight: 600,
              textDecoration: m.anulado ? 'line-through' : 'none',
            }}>
              {m.tipo === 'traslado'
                ? `${m.cuenta?.nombre} → ${m.destino?.nombre}`
                : (m.categoria?.nombre || '—')}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: B.gray }}>
              {m.fecha}
              {m.contraparte ? ` · ${m.contraparte}` : ''}
              {m.tipo !== 'traslado' ? ` · ${m.cuenta?.nombre}` : ''}
              {m.empresa ? ` · ${m.empresa}` : ''}
              {m.caso?.paciente ? ` · paciente: ${m.caso.paciente}` : ''}
              {Number(m.comision) > 0 ? ` · comisión $${money(m.comision)}` : ''}
            </p>
            {m.descripcion && <p style={{ margin: '2px 0 0', fontSize: 12, color: B.teal }}>{m.descripcion}</p>}
            {esTarjeta(m) && (
              enTransito(m)
                ? <span style={{ ...sello, background: '#FFF1E3', color: B.orange }}>En tránsito</span>
                : <span style={{ ...sello, background: '#E9F6EF', color: B.green }}>
                    Depositado{m.liquidacion?.fecha ? ` el ${m.liquidacion.fecha}` : ''}
                  </span>
            )}
            {m.anulado && <p style={{ margin: '2px 0 0', fontSize: 11, color: B.red }}>Anulado: {m.motivo_anulacion}</p>}
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <strong style={{ fontSize: 15, color: color(m) }}>
              {signo(m)} $ {money(m.monto)}
            </strong>
            {enTransito(m) && esGerente && (
              <button onClick={() => setConfirmando(m)}
                style={{
                  display: 'block', marginLeft: 'auto', marginTop: 6,
                  padding: isMobile ? '9px 12px' : '6px 12px', fontSize: 12, fontWeight: 700,
                  color: B.white, background: B.green, border: 'none', borderRadius: 7, cursor: 'pointer',
                }}>
                Pago confirmado
              </button>
            )}
            {!m.anulado && (esGerente || m.creado_por === miembro.id) && (
              <button onClick={() => anular(m)}
                style={{ display: 'block', marginLeft: 'auto', marginTop: 4, background: 'none', border: 'none', color: B.gray, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
                anular
              </button>
            )}
          </div>
        </div>
      ))}
    </div>

    {confirmando && (
      <ConfirmarDeposito
        cobro={confirmando}
        todos={todos}
        cuentas={cuentas}
        isMobile={isMobile}
        onCerrar={() => setConfirmando(null)}
        onHecho={(cuantos) => {
          setConfirmando(null);
          onAviso(cuantos === 1
            ? 'Depósito confirmado: el dinero ya está en la cuenta'
            : `${cuantos} cobros depositados en la cuenta`);
          onCambio();
        }}
      />
    )}
    </>
  );
}

// =====================================================================
//  PÁGINA
// =====================================================================
export default function Caja({ miembro }) {
  const isMobile = useIsMobile();
  const esGerente = miembro?.rol === 'gerente';
  const [vista, setVista] = useState(esGerente ? 'panel' : 'registrar');
  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [casos, setCasos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [toast, setToast] = useState(null);
  const [version, setVersion] = useState(0);
  // Los gerentes ven las dos empresas, así que necesitan separarlas.
  // Las secretarias solo reciben las suyas: la base ya las filtró.
  const [empresaFiltro, setEmpresaFiltro] = useState('IMC');

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    (async () => {
      const [cu, ca, ks, ms] = await Promise.all([
        getCuentas(), getCategorias(), getCasosAbiertos(), getMovimientos({ limite: 100 }),
      ]);
      setCuentas(cu); setCategorias(ca); setCasos(ks); setMovimientos(ms);
    })();
  }, [version]);

  const avisar = (texto) => {
    setToast(texto);
    setTimeout(() => setToast(null), 2500);
  };

  const registrado = () => {
    avisar('Movimiento registrado');
    recargar();
  };

  const vistas = [
    ...(esGerente ? [{ key: 'panel', label: 'Panel' }] : []),
    { key: 'registrar', label: 'Registrar' },
    { key: 'movimientos', label: 'Movimientos' },
    ...(esGerente ? [{ key: 'balance', label: 'Balance' }] : []),
  ];

  return (
    <div style={{ padding: isMobile ? 16 : 24, background: B.grayLt, minHeight: '100%', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: B.navy }}>Caja</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: B.gray }}>
          {esGerente
            ? 'IMC y Gmediq · saldos, registro y movimientos'
            : `Registro de ${miembro.empresa === 'IMC' ? 'IMC' : 'Gmediq'}`}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {vistas.map((v) => (
          <button key={v.key} onClick={() => setVista(v.key)}
            style={{
              padding: isMobile ? '10px 16px' : '8px 16px', fontSize: 13, fontWeight: 700,
              borderRadius: 20, cursor: 'pointer', border: `1px solid ${vista === v.key ? B.navy : B.grayMd}`,
              background: vista === v.key ? B.navy : B.white,
              color: vista === v.key ? B.white : B.gray,
            }}>
            {v.label}
          </button>
        ))}
      </div>

      {vista === 'panel' && esGerente && <Panel isMobile={isMobile} />}

      {vista === 'balance' && esGerente && <Balance isMobile={isMobile} />}

      {vista === 'registrar' && (
        <Formulario
          miembro={miembro} cuentas={cuentas} categorias={categorias} casos={casos}
          onRegistrado={registrado} isMobile={isMobile}
        />
      )}

      {vista === 'movimientos' && (() => {
        const filtros = [
          { key: 'IMC', label: 'IMC' },
          { key: 'GMEDIQ', label: 'Gmediq' },
          { key: 'COMPARTIDO', label: 'Compartido' },
          { key: 'todas', label: 'Todo junto' },
        ];
        const lista = (esGerente && empresaFiltro !== 'todas')
          ? movimientos.filter((m) => m.empresa === empresaFiltro)
          : movimientos;
        return (
          <>
            {esGerente && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {filtros.map((f) => (
                  <button key={f.key} onClick={() => setEmpresaFiltro(f.key)}
                    style={{
                      padding: isMobile ? '9px 14px' : '7px 14px', fontSize: 12, fontWeight: 700,
                      borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${empresaFiltro === f.key ? B.blue : B.grayMd}`,
                      background: empresaFiltro === f.key ? B.blue : B.white,
                      color: empresaFiltro === f.key ? B.white : B.gray,
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            <Totales movimientos={lista} isMobile={isMobile} />
            <Lista
              movimientos={lista} todos={movimientos} cuentas={cuentas}
              miembro={miembro} onCambio={recargar} onAviso={avisar} isMobile={isMobile}
            />
          </>
        );
      })()}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: B.green, color: B.white, padding: '12px 22px', borderRadius: 24,
          fontSize: 14, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 999,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
