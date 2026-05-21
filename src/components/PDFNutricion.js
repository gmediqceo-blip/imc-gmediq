// ════════════════════════════════════════════════════════════════════════
// PDFNutricion.js — Generadores de PDF para módulo nutricional
//
// Exporta 2 funciones:
//   - generarPDFPlanSMAE(plan, paciente, porciones, ejemplos, intercambios, usuario)
//   - generarPDFGuiaFase(fase, paciente, registroFase, usuario)
//
// Usa window.print con HTML estilizado (sin librerías externas).
// Genera una ventana nueva con el PDF listo para imprimir o guardar.
// ════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE LA CLÍNICA (editable)
// ────────────────────────────────────────────────────────────────────────
const CLINICA = {
  nombre: 'Instituto Metabólico Corporal',
  shortName: 'IMC',
  direccion: 'Quito, Ecuador',
  telefono: '+593 99 999 9999',
  email: 'info@imc360.ec',
  web: 'imc360.ec',
};

const NUTRICIONISTA = {
  nombre: 'Lic. Sofía Galarza',
  titulo: 'Nutricionista Clínica',
  registro: 'Reg. MSP 1234567',
};

// ────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

function generarNumero(prefijo) {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `${prefijo}-${year}-${random}`;
}

function escape(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ────────────────────────────────────────────────────────────────────────
// PDF 1 — PLAN SMAE (estilo Juanpi)
// ────────────────────────────────────────────────────────────────────────
export function generarPDFPlanSMAE({ plan, paciente, porciones, ejemplos, intercambios, usuario }) {
  const edad = calcAge(paciente.fecha_nacimiento);
  const sexo = paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Femenino' : '—';
  const numeroDoc = generarNumero('NUT');
  const fechaHoy = formatDate(new Date().toISOString().split('T')[0]);

  // Agrupar intercambios por categoría
  const intercambiosPorCat = {};
  (intercambios || []).forEach(i => {
    if (!intercambiosPorCat[i.categoria_codigo]) intercambiosPorCat[i.categoria_codigo] = [];
    intercambiosPorCat[i.categoria_codigo].push(i);
  });

  const catLabels = {
    proteina: { emoji: '🍗', nombre: 'PROTEÍNAS' },
    carbohidrato: { emoji: '🍞', nombre: 'CARBOHIDRATOS' },
    grasa: { emoji: '🥑', nombre: 'GRASAS' },
    fruta: { emoji: '🍓', nombre: 'FRUTAS' },
    vegetal: { emoji: '🥕', nombre: 'VEGETALES' },
    lacteo: { emoji: '🥛', nombre: 'LÁCTEOS' },
    leguminosa: { emoji: '🫘', nombre: 'LEGUMINOSAS' },
    azucar: { emoji: '🍬', nombre: 'AZÚCARES' },
  };

  // Totales diarios
  const totales = {
    proteina: 0, carbohidrato: 0, grasa: 0, fruta: 0,
    vegetal: 0, lacteo: 0, leguminosa: 0, azucar: 0
  };
  (porciones || []).forEach(p => {
    totales.proteina      += p.porciones_proteina || 0;
    totales.carbohidrato  += p.porciones_carbohidrato || 0;
    totales.grasa         += p.porciones_grasa || 0;
    totales.fruta         += p.porciones_fruta || 0;
    totales.vegetal       += p.porciones_vegetal || 0;
    totales.lacteo        += p.porciones_lacteo || 0;
    totales.leguminosa    += p.porciones_leguminosa || 0;
    totales.azucar        += p.porciones_azucar || 0;
  });

  // Agrupar ejemplos por tiempo
  const ejemplosPorTiempo = {};
  (ejemplos || []).forEach(e => {
    if (!ejemplosPorTiempo[e.tiempo_codigo]) ejemplosPorTiempo[e.tiempo_codigo] = [];
    ejemplosPorTiempo[e.tiempo_codigo].push(e);
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Plan Nutricional - ${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #0B1F3B;
    line-height: 1.5;
    font-size: 11px;
  }
  .header {
    border-bottom: 3px solid #1A7A4A;
    padding-bottom: 12px;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .logo {
    width: 56px; height: 56px;
    background: linear-gradient(135deg, #1A7A4A, #0F5734);
    border-radius: 10px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 18px;
    flex-shrink: 0;
  }
  .header-info { flex: 1; }
  .clinic-name { font-size: 15px; font-weight: 800; }
  .clinic-sub { font-size: 9px; color: #6E6E70; margin-top: 2px; }
  .doc-info {
    text-align: right;
    font-size: 9px;
    color: #6E6E70;
  }
  .doc-info strong {
    display: block;
    color: #0B1F3B;
    font-size: 10px;
    margin-bottom: 2px;
  }
  .title {
    font-size: 15px;
    font-weight: 800;
    color: #1A7A4A;
    text-align: center;
    margin: 16px 0 12px;
    padding: 8px;
    border-top: 1px solid #DDE3EA;
    border-bottom: 1px solid #DDE3EA;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .patient-box {
    background: #E6F5EE;
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 16px;
    font-size: 10px;
  }
  .patient-box strong {
    display: inline-block;
    min-width: 90px;
    color: #4B647A;
    font-weight: 600;
  }
  .section { margin-bottom: 14px; page-break-inside: avoid; }
  .section-title {
    font-size: 11px;
    font-weight: 800;
    color: #1A7A4A;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-left: 4px solid #1A7A4A;
    padding-left: 8px;
    margin-bottom: 8px;
  }
  .cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .interlist { font-size: 10px; }
  .interlist strong {
    font-size: 10px;
    color: #1A7A4A;
    display: block;
    margin-bottom: 4px;
    border-bottom: 1px solid #DDE3EA;
    padding-bottom: 2px;
  }
  .interlist ul {
    list-style: none;
    padding: 0;
  }
  .interlist li {
    padding: 2px 0 2px 14px;
    position: relative;
    font-size: 9.5px;
    line-height: 1.4;
  }
  .interlist li::before {
    content: '•';
    position: absolute;
    left: 4px;
    color: #6E6E70;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5px;
  }
  th {
    background: #E6F5EE;
    color: #0B1F3B;
    font-weight: 700;
    font-size: 9px;
    text-align: center;
    padding: 6px 4px;
    border: 1px solid #DDE3EA;
    text-transform: uppercase;
  }
  th.first {
    text-align: left;
    padding-left: 10px;
  }
  td {
    border: 1px solid #DDE3EA;
    padding: 5px 6px;
    text-align: center;
    vertical-align: middle;
  }
  td.first {
    text-align: left;
    padding-left: 10px;
    font-weight: 600;
  }
  tr.totals {
    background: #C5E5D4;
    font-weight: 800;
  }
  .menu-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .menu-block {
    background: #F4F6F8;
    border-radius: 6px;
    padding: 8px 12px;
    border-left: 3px solid #1A7A4A;
  }
  .menu-block-title {
    font-size: 10px;
    font-weight: 800;
    color: #1A7A4A;
    margin-bottom: 4px;
  }
  .menu-block-tag {
    display: inline-block;
    background: white;
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 8px;
    color: #6E6E70;
    margin-left: 6px;
  }
  .menu-opcion {
    font-size: 9.5px;
    padding: 3px 0;
    line-height: 1.5;
  }
  .menu-opcion strong { color: #0B1F3B; }
  .recomendaciones-list {
    list-style: none;
    padding: 0;
    font-size: 10px;
  }
  .recomendaciones-list li {
    padding: 2px 0 2px 18px;
    position: relative;
    line-height: 1.5;
  }
  .recomendaciones-list li::before {
    content: '✓';
    position: absolute;
    left: 4px;
    color: #1A7A4A;
    font-weight: 800;
  }
  .text-block {
    background: #F4F6F8;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 10px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .firma {
    margin-top: 24px;
    padding-top: 14px;
    border-top: 1px solid #DDE3EA;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    page-break-inside: avoid;
  }
  .sig {
    text-align: center;
  }
  .sig-line {
    border-top: 1px solid #0B1F3B;
    padding-top: 6px;
    margin-top: 30px;
    font-size: 9px;
  }
  .sig-line strong {
    display: block;
    margin-bottom: 2px;
    font-size: 10px;
    color: #0B1F3B;
  }
  .footer {
    text-align: center;
    font-size: 8px;
    color: #9CA3AF;
    margin-top: 16px;
    padding-top: 8px;
    border-top: 1px solid #DDE3EA;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
  .print-btn {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 999;
    padding: 10px 18px;
    background: #1A7A4A;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir o Guardar como PDF</button>

<!-- Header -->
<div class="header">
  <div class="logo">${escape(CLINICA.shortName)}</div>
  <div class="header-info">
    <div class="clinic-name">${escape(CLINICA.nombre)}</div>
    <div class="clinic-sub">
      ${escape(CLINICA.direccion)} · ${escape(CLINICA.telefono)}<br>
      ${escape(CLINICA.email)} · ${escape(CLINICA.web)}
    </div>
  </div>
  <div class="doc-info">
    <strong>Plan N°: ${numeroDoc}</strong>
    Fecha: ${fechaHoy}<br>
    ${escape(NUTRICIONISTA.nombre)}<br>
    ${escape(NUTRICIONISTA.registro)}
  </div>
</div>

<!-- Title -->
<div class="title">PLAN NUTRICIONAL · SISTEMA DE INTERCAMBIOS (SMAE)</div>

<!-- Patient -->
<div class="patient-box">
  <div><strong>Nombre:</strong> ${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</div>
  <div><strong>C.I.:</strong> ${escape(paciente.cedula) || '—'}</div>
  <div><strong>Edad:</strong> ${edad ? edad + ' años' : '—'}</div>
  <div><strong>Sexo:</strong> ${sexo}</div>
  <div><strong>Objetivo:</strong> ${escape(plan.objetivo) || '—'}</div>
  <div><strong>Kcal/día:</strong> ${plan.kcal_objetivo || '—'}</div>
</div>

<!-- 1. Lista de intercambios -->
<div class="section">
  <div class="section-title">1. Lista de Intercambios — 1 porción equivale a:</div>
  <div class="cols-2">
    ${Object.entries(intercambiosPorCat).map(([cat, items]) => {
      const info = catLabels[cat] || { emoji: '•', nombre: cat.toUpperCase() };
      return `
      <div class="interlist">
        <strong>${info.emoji} ${info.nombre}</strong>
        <ul>
          ${items.map(i => `<li>${escape(i.porcion)} ${escape(i.nombre)}${i.notas ? ` <em style="color:#6E6E70;">(${escape(i.notas)})</em>` : ''}</li>`).join('')}
        </ul>
      </div>`;
    }).join('')}
  </div>
</div>

<!-- 2. Tabla de porciones -->
<div class="section">
  <div class="section-title">2. Porciones por tiempo de comida</div>
  <table>
    <thead>
      <tr>
        <th class="first">Tiempo</th>
        <th>🍓 Fr</th>
        <th>🥕 Vg</th>
        <th>🍞 CHO</th>
        <th>🍗 Prot</th>
        <th>🥑 Gr</th>
        <th>🥛 Lác</th>
        <th>🫘 Leg</th>
        <th>🍬 Az</th>
      </tr>
    </thead>
    <tbody>
      ${(porciones || []).map(p => `
        <tr>
          <td class="first">${escape(p.tiempo_emoji || '')} ${escape(p.tiempo_nombre)}${p.tiempo_hora ? ' <span style="color:#6E6E70;font-weight:400;">(' + escape(p.tiempo_hora) + ')</span>' : ''}</td>
          <td>${p.porciones_fruta || '—'}</td>
          <td>${p.porciones_vegetal || '—'}</td>
          <td>${p.porciones_carbohidrato || '—'}</td>
          <td>${p.porciones_proteina || '—'}</td>
          <td>${p.porciones_grasa || '—'}</td>
          <td>${p.porciones_lacteo || '—'}</td>
          <td>${p.porciones_leguminosa || '—'}</td>
          <td>${p.porciones_azucar || '—'}</td>
        </tr>
      `).join('')}
      <tr class="totals">
        <td class="first">TOTAL DIARIO</td>
        <td>${totales.fruta}</td>
        <td>${totales.vegetal}</td>
        <td>${totales.carbohidrato}</td>
        <td>${totales.proteina}</td>
        <td>${totales.grasa}</td>
        <td>${totales.lacteo}</td>
        <td>${totales.leguminosa}</td>
        <td>${totales.azucar}</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- 3. Ejemplos de menú -->
${Object.keys(ejemplosPorTiempo).length > 0 ? `
<div class="section">
  <div class="section-title">3. Ejemplos de menú</div>
  ${Object.entries(ejemplosPorTiempo).map(([tiempo, opciones]) => {
    const porc = (porciones || []).find(p => p.tiempo_codigo === tiempo);
    const porcionesTxt = porc ? [
      porc.porciones_fruta && `${porc.porciones_fruta}F`,
      porc.porciones_vegetal && `${porc.porciones_vegetal}V`,
      porc.porciones_carbohidrato && `${porc.porciones_carbohidrato}C`,
      porc.porciones_proteina && `${porc.porciones_proteina}P`,
      porc.porciones_grasa && `${porc.porciones_grasa}G`,
    ].filter(Boolean).join('·') : '';
    return `
    <div class="menu-block" style="margin-bottom: 8px;">
      <div class="menu-block-title">
        ${escape(porc?.tiempo_emoji || '')} ${escape(porc?.tiempo_nombre || tiempo)}
        ${porcionesTxt ? `<span class="menu-block-tag">${porcionesTxt}</span>` : ''}
      </div>
      ${opciones.map(o => `
        <div class="menu-opcion"><strong>Opción ${o.numero_opcion}:</strong> ${escape(o.texto)}</div>
      `).join('')}
    </div>`;
  }).join('')}
</div>
` : ''}

<!-- 4. Recomendaciones -->
${plan.recomendaciones ? `
<div class="section">
  <div class="section-title">4. Recomendaciones generales</div>
  <div class="text-block">${escape(plan.recomendaciones)}</div>
</div>` : ''}

<!-- 5. Hidratación -->
${plan.hidratacion ? `
<div class="section">
  <div class="section-title">5. Hidratación</div>
  <div class="text-block">${escape(plan.hidratacion)}</div>
</div>` : ''}

<!-- 6. Suplementación -->
${plan.suplementacion ? `
<div class="section">
  <div class="section-title">6. Suplementación</div>
  <div class="text-block">${escape(plan.suplementacion)}</div>
</div>` : ''}

<!-- 7. Consideraciones especiales GLP-1 -->
${plan.consideraciones_glp1 ? `
<div class="section">
  <div class="section-title" style="color:#C25A00;border-color:#C25A00;">⚠️ Consideraciones especiales (GLP-1)</div>
  <div class="text-block" style="background:#FFF0E0;border-left:3px solid #C25A00;">${escape(plan.consideraciones_glp1)}</div>
</div>` : ''}

<!-- Firma -->
<div class="firma">
  <div class="sig">
    <div class="sig-line">
      <strong>${escape(NUTRICIONISTA.nombre)}</strong>
      ${escape(NUTRICIONISTA.titulo)}<br>
      ${escape(NUTRICIONISTA.registro)}
    </div>
  </div>
  <div class="sig">
    <div class="sig-line">
      <strong>${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</strong>
      ${paciente.cedula ? 'C.I. ' + escape(paciente.cedula) : ''}<br>
      Paciente
    </div>
  </div>
</div>

<div class="footer">
  Generado por IMC360 · ${fechaHoy} · ${escape(CLINICA.web)}
</div>

<script>
  setTimeout(() => window.print(), 500);
</script>

</body>
</html>`;

  // Abrir en nueva ventana
  const ventana = window.open('', '_blank');
  if (!ventana) {
    alert('Bloquea de ventanas emergentes activo. Permite ventanas emergentes para este sitio.');
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
}

// ────────────────────────────────────────────────────────────────────────
// PDF 2 — GUÍA DE FASE BARIÁTRICA
// ────────────────────────────────────────────────────────────────────────
export function generarPDFGuiaFase({ fase, paciente, registroFase, usuario }) {
  const edad = calcAge(paciente.fecha_nacimiento);
  const sexo = paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Femenino' : '—';
  const numeroDoc = generarNumero('FAS');
  const fechaHoy = formatDate(new Date().toISOString().split('T')[0]);

  // Diccionarios de tiempos
  const tiemposOrden = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'merienda', 'cena'];
  const tiemposLabels = {
    desayuno:     { emoji: '🌅', nombre: 'DESAYUNO' },
    media_manana: { emoji: '🍎', nombre: 'MEDIA MAÑANA' },
    almuerzo:     { emoji: '🍽️', nombre: 'ALMUERZO' },
    media_tarde:  { emoji: '🥜', nombre: 'MEDIA TARDE' },
    merienda:     { emoji: '🌙', nombre: 'MERIENDA' },
    cena:         { emoji: '🌙', nombre: 'CENA' },
  };

  const menu = fase.menu_establecido || {};
  const alimentos = fase.alimentos_permitidos || {};

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Guía Fase - ${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #0B1F3B;
    line-height: 1.5;
    font-size: 11px;
  }
  .header {
    border-bottom: 3px solid #C25A00;
    padding-bottom: 12px;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .logo {
    width: 56px; height: 56px;
    background: linear-gradient(135deg, #C25A00, #8B3A00);
    border-radius: 10px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 18px;
    flex-shrink: 0;
  }
  .header-info { flex: 1; }
  .clinic-name { font-size: 15px; font-weight: 800; }
  .clinic-sub { font-size: 9px; color: #6E6E70; margin-top: 2px; }
  .doc-info {
    text-align: right;
    font-size: 9px;
    color: #6E6E70;
  }
  .doc-info strong {
    display: block;
    color: #0B1F3B;
    font-size: 10px;
    margin-bottom: 2px;
  }
  .title {
    font-size: 14px;
    font-weight: 800;
    color: #C25A00;
    text-align: center;
    margin: 16px 0 12px;
    padding: 10px;
    border-top: 1px solid #DDE3EA;
    border-bottom: 1px solid #DDE3EA;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .title .fase-name {
    display: block;
    font-size: 16px;
    margin-top: 4px;
  }
  .patient-box {
    background: #FFF0E0;
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 16px;
    font-size: 10px;
  }
  .patient-box strong {
    display: inline-block;
    min-width: 100px;
    color: #4B647A;
    font-weight: 600;
  }
  .section { margin-bottom: 14px; page-break-inside: avoid; }
  .section-title {
    font-size: 11px;
    font-weight: 800;
    color: #C25A00;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-left: 4px solid #C25A00;
    padding-left: 8px;
    margin-bottom: 8px;
  }
  .text-block {
    background: #F4F6F8;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 10px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .text-block.warn {
    background: #FFEBEB;
    border-left: 3px solid #B02020;
  }
  .text-block.info {
    background: #FFF0E0;
    border-left: 3px solid #C25A00;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5px;
  }
  th {
    background: #FFF0E0;
    color: #0B1F3B;
    font-weight: 700;
    font-size: 9px;
    text-align: center;
    padding: 6px 8px;
    border: 1px solid #DDE3EA;
    text-transform: uppercase;
  }
  th.first { text-align: left; padding-left: 10px; }
  td {
    border: 1px solid #DDE3EA;
    padding: 5px 8px;
    vertical-align: middle;
  }
  td.tiempo {
    background: #FFF0E0;
    font-weight: 700;
    font-size: 9px;
    color: #C25A00;
    text-transform: uppercase;
    width: 95px;
  }
  td.cant {
    text-align: right;
    font-weight: 600;
    color: #4B647A;
    width: 100px;
  }
  .cols-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .alimentos-cat {
    margin-bottom: 8px;
    page-break-inside: avoid;
  }
  .alimentos-cat-title {
    font-size: 10px;
    font-weight: 800;
    color: #0B1F3B;
    margin-bottom: 4px;
    border-bottom: 1px solid #DDE3EA;
    padding-bottom: 2px;
  }
  .alimentos-cat-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 9.5px;
  }
  .alimentos-list {
    list-style: none;
    padding: 0;
  }
  .alimentos-list li {
    padding: 1px 0 1px 14px;
    position: relative;
    line-height: 1.4;
  }
  .alimentos-list.ok li::before {
    content: '✓';
    position: absolute;
    left: 2px;
    color: #1A7A4A;
    font-weight: 800;
  }
  .alimentos-list.no li::before {
    content: '✗';
    position: absolute;
    left: 2px;
    color: #B02020;
    font-weight: 800;
  }
  .col-ok-title {
    font-size: 9px;
    font-weight: 800;
    color: #1A7A4A;
    margin-bottom: 3px;
  }
  .col-no-title {
    font-size: 9px;
    font-weight: 800;
    color: #B02020;
    margin-bottom: 3px;
  }
  .firma {
    margin-top: 24px;
    padding-top: 14px;
    border-top: 1px solid #DDE3EA;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    page-break-inside: avoid;
  }
  .sig { text-align: center; }
  .sig-line {
    border-top: 1px solid #0B1F3B;
    padding-top: 6px;
    margin-top: 30px;
    font-size: 9px;
  }
  .sig-line strong {
    display: block;
    margin-bottom: 2px;
    font-size: 10px;
    color: #0B1F3B;
  }
  .footer {
    text-align: center;
    font-size: 8px;
    color: #9CA3AF;
    margin-top: 16px;
    padding-top: 8px;
    border-top: 1px solid #DDE3EA;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
  .print-btn {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 999;
    padding: 10px 18px;
    background: #C25A00;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir o Guardar como PDF</button>

<!-- Header -->
<div class="header">
  <div class="logo">${escape(CLINICA.shortName)}</div>
  <div class="header-info">
    <div class="clinic-name">${escape(CLINICA.nombre)}</div>
    <div class="clinic-sub">
      ${escape(CLINICA.direccion)} · ${escape(CLINICA.telefono)}<br>
      ${escape(CLINICA.email)} · ${escape(CLINICA.web)}
    </div>
  </div>
  <div class="doc-info">
    <strong>Guía N°: ${numeroDoc}</strong>
    Fecha: ${fechaHoy}<br>
    ${escape(NUTRICIONISTA.nombre)}<br>
    ${escape(NUTRICIONISTA.registro)}
  </div>
</div>

<!-- Title -->
<div class="title">
  GUÍA NUTRICIONAL POSTQUIRÚRGICA
  <span class="fase-name">${escape(fase.nombre)}</span>
</div>

<!-- Patient -->
<div class="patient-box">
  <div><strong>Nombre:</strong> ${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</div>
  <div><strong>C.I.:</strong> ${escape(paciente.cedula) || '—'}</div>
  <div><strong>Edad:</strong> ${edad ? edad + ' años' : '—'}</div>
  <div><strong>Sexo:</strong> ${sexo}</div>
  <div><strong>Fecha procedimiento:</strong> ${formatDate(paciente.fecha_procedimiento)}</div>
  <div><strong>Duración de la fase:</strong> ${fase.duracion_dias_default || '—'} días</div>
  ${registroFase?.fecha_inicio ? `<div><strong>Inicio de fase:</strong> ${formatDate(registroFase.fecha_inicio)}</div>` : ''}
  ${fase.hidratacion_litros ? `<div><strong>Hidratación:</strong> ${fase.hidratacion_litros} litros/día</div>` : ''}
</div>

<!-- 1. Indicaciones -->
${fase.indicaciones ? `
<div class="section">
  <div class="section-title">1. Indicaciones</div>
  <div class="text-block info">${escape(fase.indicaciones)}</div>
</div>` : ''}

<!-- 2. Restricciones -->
${fase.restricciones ? `
<div class="section">
  <div class="section-title">2. Restricciones</div>
  <div class="text-block warn">${escape(fase.restricciones)}</div>
</div>` : ''}

<!-- 3. Recomendaciones -->
${fase.recomendaciones ? `
<div class="section">
  <div class="section-title">3. Recomendaciones</div>
  <div class="text-block">${escape(fase.recomendaciones)}</div>
</div>` : ''}

<!-- 4. Suplementación -->
${fase.suplementacion ? `
<div class="section">
  <div class="section-title">4. Suplementación</div>
  <div class="text-block">${escape(fase.suplementacion)}</div>
</div>` : ''}

<!-- 5. Menú establecido -->
${Object.keys(menu).length > 0 ? `
<div class="section">
  <div class="section-title">5. Menú establecido</div>
  <table>
    <thead>
      <tr>
        <th class="first">Tiempo / Hora</th>
        <th class="first">Alimento</th>
        <th>Cantidad</th>
      </tr>
    </thead>
    <tbody>
      ${tiemposOrden.filter(t => menu[t]).map(t => {
        const data = menu[t];
        const label = tiemposLabels[t] || { emoji: '•', nombre: t.toUpperCase() };
        const items = data.items || [];
        return items.map((item, idx) => `
          <tr>
            ${idx === 0 ? `<td class="tiempo" rowspan="${items.length}">${label.emoji} ${label.nombre}<br><span style="color:#6E6E70;font-weight:400;">${escape(data.hora || '')}</span></td>` : ''}
            <td>${escape(item.alimento)}</td>
            <td class="cant">${escape(item.cantidad)}</td>
          </tr>
        `).join('');
      }).join('')}
    </tbody>
  </table>
</div>
` : ''}

<!-- 6. Alimentos permitidos y prohibidos -->
${Object.keys(alimentos).length > 0 ? `
<div class="section">
  <div class="section-title">6. Alimentos permitidos y prohibidos</div>
  ${Object.entries(alimentos).map(([cat, data]) => `
    <div class="alimentos-cat">
      <div class="alimentos-cat-title">${escape(cat)}</div>
      <div class="alimentos-cat-cols">
        <div>
          <div class="col-ok-title">✓ PERMITIDOS</div>
          <ul class="alimentos-list ok">
            ${(data.permitidos || []).map(p => `<li>${escape(p)}</li>`).join('')}
          </ul>
        </div>
        <div>
          <div class="col-no-title">✗ PROHIBIDOS</div>
          <ul class="alimentos-list no">
            ${(data.prohibidos || []).map(p => `<li>${escape(p)}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `).join('')}
</div>
` : ''}

<!-- Firma -->
<div class="firma">
  <div class="sig">
    <div class="sig-line">
      <strong>${escape(NUTRICIONISTA.nombre)}</strong>
      ${escape(NUTRICIONISTA.titulo)}<br>
      ${escape(NUTRICIONISTA.registro)}
    </div>
  </div>
  <div class="sig">
    <div class="sig-line">
      <strong>${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</strong>
      ${paciente.cedula ? 'C.I. ' + escape(paciente.cedula) : ''}<br>
      Paciente
    </div>
  </div>
</div>

<div class="footer">
  Generado por IMC360 · ${fechaHoy} · ${escape(CLINICA.web)}
</div>

<script>
  setTimeout(() => window.print(), 500);
</script>

</body>
</html>`;

  const ventana = window.open('', '_blank');
  if (!ventana) {
    alert('Bloquea de ventanas emergentes activo. Permite ventanas emergentes para este sitio.');
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
}
