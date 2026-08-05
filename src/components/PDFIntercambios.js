import { LOGO_SRC } from './Documentos';

// ═══════════════════════════════════════════════════════════════════════════
// PDF — PLAN NUTRICIONAL POR INTERCAMBIOS (branding IMC)
// Genera HTML en ventana nueva con auto-print, mismo patrón que Documentos.js
// ═══════════════════════════════════════════════════════════════════════════

const C = { navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70', grayLt: '#F4F6F8', grayMd: '#DDE3EA', gold: '#C9A86A' };

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const fmtNum = n => {
  const v = parseFloat(n);
  if (!v) return '';
  return Number.isInteger(v) ? String(v) : String(v).replace('.5', '½').replace('0½', '½');
};

// Encabezado de sección con línea decorativa (mismo estilo del informe de condición)
const secTitle = (txt) => `
  <div style="display:flex;align-items:center;gap:10px;margin:26px 0 14px;">
    <div style="width:3px;height:20px;background:${C.blue};border-radius:2px;flex-shrink:0;"></div>
    <h2 style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:${C.navy};font-weight:700;margin:0;">${txt}</h2>
    <div style="flex:1;height:1px;background:${C.grayMd};"></div>
  </div>`;

export function generarPDFIntercambios(paciente, plan) {
  const lista = plan.lista_intercambios || [];
  const tiempos = plan.tiempos_comida || [];
  const recos = plan.recomendaciones || {};
  const nombresGrupos = lista.map(g => g.grupo);

  // Total diario
  const totales = {};
  tiempos.forEach(t => Object.entries(t.porciones || {}).forEach(([g, v]) => {
    const n = parseFloat(v) || 0;
    if (n > 0) totales[g] = (totales[g] || 0) + n;
  }));

  // ── Lista de intercambios: tarjetas de grupos en 2 columnas ──────────────
  const gruposHtml = lista.map(g => `
    <div style="break-inside:avoid;border:1px solid ${C.grayMd};border-radius:10px;overflow:hidden;margin-bottom:12px;">
      <div style="background:${C.navy};padding:8px 14px;">
        <p style="margin:0;color:white;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:2px;">${esc(g.grupo)}</p>
      </div>
      <div style="padding:10px 14px;">
        ${(g.items || []).map(it => `
          <div style="display:flex;gap:8px;margin-bottom:4px;">
            <span style="color:${C.gold};font-size:10px;line-height:1.7;">●</span>
            <span style="font-size:10.5px;color:${C.navy};line-height:1.5;">${esc(it)}</span>
          </div>`).join('')}
        ${g.nota ? `
          <div style="margin-top:8px;background:${C.gold}22;border:1px solid ${C.gold};border-radius:6px;padding:6px 10px;">
            <p style="margin:0;font-size:9.5px;color:${C.navy};font-weight:600;">${esc(g.nota)}</p>
          </div>` : ''}
      </div>
    </div>`).join('');

  // ── Tabla de porciones por tiempo de comida ──────────────────────────────
  const filasPorciones = tiempos.map((t, i) => {
    const porcs = Object.entries(t.porciones || {}).filter(([, v]) => parseFloat(v) > 0);
    const detalle = porcs.length === 0
      ? `<span style="color:${C.gray};font-style:italic;font-size:10px;">—</span>`
      : porcs.map(([g, v]) => `
          <span style="display:inline-block;background:${C.grayLt};border:1px solid ${C.grayMd};border-radius:12px;padding:3px 10px;margin:2px 3px 2px 0;font-size:10px;color:${C.navy};">
            <strong style="color:${C.blue};">${fmtNum(v)}</strong> ${esc(g.toLowerCase())}
          </span>`).join('');
    return `
      <tr style="background:${i % 2 === 0 ? 'white' : C.grayLt};">
        <td style="padding:10px 14px;border-bottom:1px solid ${C.grayMd};font-weight:700;font-size:11px;color:${C.navy};text-transform:uppercase;letter-spacing:1px;white-space:nowrap;vertical-align:top;">${esc(t.nombre)}</td>
        <td style="padding:8px 14px;border-bottom:1px solid ${C.grayMd};">${detalle}</td>
      </tr>`;
  }).join('');

  const totalHtml = Object.entries(totales).map(([g, v]) => `
    <span style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:12px;padding:4px 12px;margin:3px 4px 3px 0;font-size:10.5px;color:white;">
      <strong style="color:${C.gold};">${fmtNum(v)}</strong> ${esc(g.toLowerCase())}
    </span>`).join('');

  // ── Ejemplos de comidas ───────────────────────────────────────────────────
  const tiemposConEjemplos = tiempos.filter(t => (t.ejemplos || []).length > 0);
  const ejemplosHtml = tiemposConEjemplos.map(t => `
    <div style="break-inside:avoid;border:1px solid ${C.grayMd};border-radius:10px;overflow:hidden;margin-bottom:12px;">
      <div style="background:${C.teal};padding:8px 14px;">
        <p style="margin:0;color:white;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:2px;">${esc(t.nombre)} ${t.ejemplos.length > 1 ? '<span style="font-weight:400;opacity:0.7;font-size:9px;">· elige 1 opción</span>' : ''}</p>
      </div>
      <div style="padding:10px 14px;">
        ${t.ejemplos.map((ej, j) => `
          <div style="display:flex;gap:10px;margin-bottom:7px;">
            <span style="flex-shrink:0;background:${C.blue};color:white;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;margin-top:1px;">${j + 1}</span>
            <span style="font-size:10.5px;color:${C.navy};line-height:1.55;">${esc(ej)}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  // ── Recomendaciones ───────────────────────────────────────────────────────
  const recoBloque = (titulo, icono, items) => {
    if (!items || items.length === 0) return '';
    return `
      <div style="break-inside:avoid;border:1px solid ${C.grayMd};border-left:4px solid ${C.gold};border-radius:10px;padding:12px 16px;margin-bottom:12px;">
        <p style="margin:0 0 8px;font-weight:700;font-size:11px;color:${C.navy};text-transform:uppercase;letter-spacing:2px;">${titulo}</p>
        ${items.map(it => `
          <div style="display:flex;gap:8px;margin-bottom:5px;">
            <span style="color:${C.blue};font-size:10px;line-height:1.7;">●</span>
            <span style="font-size:10.5px;color:${C.navy};line-height:1.55;">${esc(it)}</span>
          </div>`).join('')}
      </div>`;
  };

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Plan Nutricional — ${esc(paciente.nombre)} ${esc(paciente.apellido)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  body { font-family:'Poppins','Segoe UI', Arial, sans-serif; color:${C.navy}; background:white; }
  @page { size:A4; margin:0; }
  @media print { .no-print { display:none; } }
</style>
</head>
<body>

<!-- BARRA NO IMPRIMIBLE -->
<div class="no-print" style="background:${C.navy};padding:10px 20px;text-align:center;">
  <button onclick="window.print()" style="background:${C.gold};color:${C.navy};border:none;border-radius:6px;padding:8px 24px;font-weight:700;font-size:13px;cursor:pointer;">Imprimir / Guardar como PDF</button>
</div>

<!-- ═══ PORTADA / HEADER ═══ -->
<div style="background:linear-gradient(135deg, ${C.navy} 0%, #123059 100%);padding:36px 40px 30px;">
  <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;margin-bottom:26px;">
    <img src="${LOGO_SRC}" alt="IMC — Instituto Metabólico Corporal" style="height:58px;width:auto;display:block;" />
    <div>
      <p style="color:${C.gold};font-size:10px;text-transform:uppercase;letter-spacing:3px;margin-bottom:4px;">Instituto Metabólico Corporal</p>
      <h1 style="color:white;font-size:26px;font-weight:700;letter-spacing:1px;">PLAN NUTRICIONAL MENSUAL</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:11px;margin-top:4px;">Programa por intercambios de alimentos</p>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
    <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Paciente</div>
      <div style="font-size:14px;font-weight:600;color:white;">${esc(paciente.nombre)} ${esc(paciente.apellido)}</div>
    </div>
    <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Fecha del plan</div>
      <div style="font-size:14px;font-weight:600;color:white;">${fmtDate(plan.fecha)}</div>
    </div>
    <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Nutricionista</div>
      <div style="font-size:14px;font-weight:600;color:white;">${esc(plan.nutricionista_nombre || '—')}</div>
    </div>
  </div>
</div>

<!-- INTRO -->
<div style="background:${C.blue};padding:14px 40px;display:flex;align-items:center;gap:12px;">
  <p style="font-size:12px;color:white;line-height:1.5;"><strong>Este plan es flexible.</strong> Los alimentos de un mismo grupo pueden intercambiarse entre sí respetando la porción indicada — tú eliges qué comer cada día dentro de tus porciones asignadas.</p>
</div>

<div style="padding:8px 40px 36px;">

  <!-- ═══ PORCIONES POR TIEMPO DE COMIDA ═══ -->
  ${secTitle('Tus porciones por tiempo de comida')}
  <table style="width:100%;border-collapse:collapse;border:1px solid ${C.grayMd};border-radius:10px;overflow:hidden;">
    <thead>
      <tr>
        <th style="background:${C.navy};color:white;padding:9px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:2px;width:150px;">Comida</th>
        <th style="background:${C.navy};color:white;padding:9px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:2px;">Porciones</th>
      </tr>
    </thead>
    <tbody>${filasPorciones}</tbody>
  </table>
  <div style="background:${C.navy};border-radius:10px;padding:14px 18px;margin-top:12px;">
    <p style="color:${C.gold};font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:6px;">Total diario</p>
    <div>${totalHtml || '<span style="color:rgba(255,255,255,0.5);font-size:11px;">Sin porciones asignadas</span>'}</div>
  </div>

  <!-- ═══ LISTA DE INTERCAMBIOS ═══ -->
  <div style="break-before:page;"></div>
  ${secTitle('Lista de intercambios — 1 porción equivale a:')}
  <div style="column-count:2;column-gap:14px;">${gruposHtml}</div>
  <div style="background:${C.grayLt};border:1px solid ${C.grayMd};border-radius:8px;padding:10px 16px;margin-top:4px;">
    <p style="font-size:10.5px;color:${C.teal};line-height:1.5;">Los alimentos dentro de un mismo grupo de intercambio <strong>pueden ser reemplazados entre sí</strong> respetando la porción indicada.</p>
  </div>

  ${tiemposConEjemplos.length > 0 ? `
  <!-- ═══ EJEMPLOS DE COMIDAS ═══ -->
  <div style="break-before:page;"></div>
  ${secTitle('Ejemplos de comidas')}
  ${ejemplosHtml}` : ''}

  ${(recos.generales?.length || recos.agua?.length || recos.suplementos?.length) ? `
  <!-- ═══ RECOMENDACIONES ═══ -->
  ${secTitle('Recomendaciones')}
  ${recoBloque('Recomendaciones generales', '', recos.generales)}
  ${recoBloque('Recomendaciones de agua', '', recos.agua)}
  ${recoBloque('Recomendaciones de suplemento', '', recos.suplementos)}` : ''}

</div>

<!-- FOOTER -->
<div style="background:${C.navy};padding:16px 40px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <p style="color:white;font-weight:700;font-size:11px;letter-spacing:1px;">INSTITUTO METABÓLICO CORPORAL</p>
    <p style="color:rgba(255,255,255,0.45);font-size:9.5px;margin-top:2px;">imc_info@institutometabolicoec.com</p>
  </div>
  <p style="color:${C.gold};font-size:9.5px;letter-spacing:1px;">${esc(plan.nutricionista_nombre || '')} · Nutrición</p>
</div>

<script>window.onload = () => setTimeout(() => window.print(), 500);</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
