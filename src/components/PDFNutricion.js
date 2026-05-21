// ════════════════════════════════════════════════════════════════════════
// PDFNutricion.js — Generadores PDF profesionales con marca IMC
//
// Exporta:
//   - generarPDFPlanSMAE(plan, paciente, porciones, ejemplos, intercambios, usuario)
//   - generarPDFGuiaFase(fase, paciente, registroFase, usuario)
//
// Diseño con paleta oficial IMC + logo real + plantilla profesional clínica.
// ════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────
// MARCA IMC
// ────────────────────────────────────────────────────────────────────────
const COLORS = {
  navy:    '#0B1F3B',  // Principal
  blue:    '#1E7CB5',  // Isotipo
  teal:    '#4B647A',  // Turquesa opaco
  gray:    '#6E6E70',  // Gris
  grayLt:  '#F4F6F8',
  grayMd:  '#DDE3EA',
  green:   '#1A7A4A',
  red:     '#B02020',
  orange:  '#C25A00',
  amber:   '#F59E0B',
  gold:    '#C9A86A',  // dorado tipo manual
  white:   '#FFFFFF',
};

const CLINICA = {
  nombre: 'INSTITUTO METABÓLICO CORPORAL',
  tagline: 'by GMEDIQ',
  direccion: 'Nuño Valderrama y Av. Mariana de Jesús, Edificio Citimed, Consultorio 301',
  ciudad: 'Quito, Ecuador',
  telefono: '098 405 8395',
  email: 'info@imc360.ec',
  web: 'imc360.ec',
  slogan: 'De perder peso a rediseñar el cuerpo',
};

const NUTRICIONISTA = {
  nombre: 'Lic. Sofía Galarza',
  titulo: 'Nutricionista Clínica',
  registro: 'Reg. MSP 1234567',
};

// Logo IMC en base64 (sin necesidad de servidor)
const LOGO_BASE64 = "data:image/jpeg;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/9k=";

// ────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

function generarNumero(prefijo) {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefijo}-${year}-${random}`;
}

function escape(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"\']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "\'": '&#39;'
  }[c]));
}

// ────────────────────────────────────────────────────────────────────────
// PLANTILLA BASE (CSS + estructura común)
// ────────────────────────────────────────────────────────────────────────
function baseCSS() {
  return `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;
    color: ${COLORS.navy};
    line-height: 1.45;
    font-size: 10.5px;
    -webkit-font-smoothing: antialiased;
  }
  
  /* ═══ HEADER CORPORATIVO ═══ */
  .header-band {
    background: ${COLORS.navy};
    color: white;
    padding: 10px 14px;
    margin-bottom: 14px;
    border-radius: 6px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 14px;
    align-items: center;
    border-bottom: 3px solid ${COLORS.blue};
  }
  .header-logo {
    background: white;
    padding: 6px 10px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .header-logo img {
    height: 38px;
    width: auto;
    display: block;
  }
  .header-info {
    min-width: 0;
    overflow: hidden;
  }
  .header-name {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .header-tagline {
    font-size: 8px;
    color: ${COLORS.gold};
    letter-spacing: 1.5px;
    margin-top: 1px;
    font-weight: 600;
  }
  .header-contact {
    font-size: 7.5px;
    color: rgba(255,255,255,0.78);
    margin-top: 4px;
    line-height: 1.4;
  }
  .header-doc {
    text-align: right;
    font-size: 7.5px;
    line-height: 1.4;
    padding-left: 12px;
    border-left: 1px solid rgba(255,255,255,0.2);
    white-space: nowrap;
    min-width: 100px;
  }
  .header-doc strong {
    display: block;
    color: white;
    font-size: 9.5px;
    margin-bottom: 2px;
    letter-spacing: 0.4px;
  }
  .header-doc small {
    display: block;
    color: ${COLORS.gold};
    font-size: 7px;
    margin-top: 1px;
    letter-spacing: 0.2px;
    font-weight: 600;
  }
  
  /* ═══ TITULO DEL DOCUMENTO ═══ */
  .doc-title {
    text-align: center;
    margin: 6px 0 12px;
    padding: 0 0 8px;
    border-bottom: 1px solid ${COLORS.grayMd};
    position: relative;
  }
  .doc-title-overline {
    font-size: 8.5px;
    color: ${COLORS.teal};
    letter-spacing: 2.5px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .doc-title h1 {
    font-size: 15px;
    font-weight: 800;
    color: ${COLORS.navy};
    margin-top: 3px;
    letter-spacing: 0.4px;
  }
  .doc-title .accent {
    color: ${COLORS.blue};
  }
  .doc-title::after {
    content: '';
    display: block;
    width: 50px;
    height: 2.5px;
    background: ${COLORS.gold};
    margin: 6px auto 0;
    border-radius: 2px;
  }
  
  /* ═══ DATOS PACIENTE EN GRID ELEGANTE ═══ */
  .patient-card {
    background: ${COLORS.grayLt};
    border-left: 4px solid ${COLORS.blue};
    padding: 10px 14px;
    margin-bottom: 12px;
    border-radius: 0 4px 4px 0;
  }
  .patient-card-title {
    font-size: 8.5px;
    color: ${COLORS.blue};
    text-transform: uppercase;
    letter-spacing: 1.2px;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .patient-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px 18px;
    font-size: 10px;
  }
  .patient-field {
    display: flex;
    flex-direction: column;
  }
  .patient-field .label {
    font-size: 8.5px;
    color: ${COLORS.gray};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .patient-field .value {
    font-size: 11px;
    color: ${COLORS.navy};
    font-weight: 600;
  }
  
  /* ═══ SECCIONES ═══ */
  .section {
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .section-header {
    background: ${COLORS.navy};
    color: white;
    padding: 6px 12px;
    border-radius: 4px 4px 0 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-number {
    background: ${COLORS.blue};
    color: white;
    width: 20px; height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 10px;
    flex-shrink: 0;
  }
  .section-title {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }
  .section-content {
    background: white;
    border: 1px solid ${COLORS.grayMd};
    border-top: none;
    padding: 10px 14px;
    border-radius: 0 0 4px 4px;
  }
  
  /* ═══ LISTA DE PUNTOS (indicaciones / restricciones) ═══ */
  .check-list {
    list-style: none;
    padding: 0;
    font-size: 10.5px;
    line-height: 1.65;
  }
  .check-list li {
    padding: 2px 0 2px 22px;
    position: relative;
  }
  .check-list.ok li::before {
    content: '✓';
    position: absolute;
    left: 4px; top: 3px;
    width: 14px; height: 14px;
    background: ${COLORS.green};
    color: white;
    border-radius: 50%;
    text-align: center;
    line-height: 14px;
    font-size: 9px;
    font-weight: 800;
  }
  .check-list.no li::before {
    content: '✕';
    position: absolute;
    left: 4px; top: 3px;
    width: 14px; height: 14px;
    background: ${COLORS.red};
    color: white;
    border-radius: 50%;
    text-align: center;
    line-height: 14px;
    font-size: 9px;
    font-weight: 800;
  }
  .check-list.dot li::before {
    content: '';
    position: absolute;
    left: 7px; top: 9px;
    width: 5px; height: 5px;
    background: ${COLORS.blue};
    border-radius: 50%;
  }
  
  /* ═══ TABLAS ═══ */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    background: white;
  }
  thead th {
    background: ${COLORS.navy};
    color: white;
    padding: 7px 8px;
    font-weight: 700;
    font-size: 9.5px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    text-align: center;
    border: 1px solid ${COLORS.navy};
  }
  thead th.left { text-align: left; padding-left: 12px; }
  tbody td {
    padding: 6px 8px;
    border: 1px solid ${COLORS.grayMd};
    vertical-align: middle;
  }
  tbody td.center { text-align: center; }
  tbody td.right { text-align: right; font-weight: 600; }
  tbody td.tiempo {
    background: ${COLORS.grayLt};
    font-weight: 700;
    font-size: 10px;
    color: ${COLORS.navy};
    text-align: center;
    border-right: 3px solid ${COLORS.blue};
    width: 110px;
  }
  tbody tr:nth-child(even) td:not(.tiempo) {
    background: #FAFBFC;
  }
  tbody tr.totals td {
    background: ${COLORS.blue};
    color: white;
    font-weight: 800;
    text-align: center;
    border-color: ${COLORS.blue};
  }
  tbody tr.totals td.left { text-align: left; padding-left: 12px; }
  
  /* ═══ CUADROS DE INFO ═══ */
  .info-box {
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 10.5px;
    line-height: 1.6;
    margin-bottom: 8px;
    white-space: pre-wrap;
  }
  .info-box.warn {
    background: #FFF6E5;
    border-left: 4px solid ${COLORS.amber};
  }
  .info-box.danger {
    background: #FFEBEB;
    border-left: 4px solid ${COLORS.red};
  }
  .info-box.success {
    background: #E6F5EE;
    border-left: 4px solid ${COLORS.green};
  }
  .info-box.info {
    background: ${COLORS.grayLt};
    border-left: 4px solid ${COLORS.blue};
  }
  
  /* ═══ ALIMENTOS PERMITIDOS/PROHIBIDOS ═══ */
  .alimentos-cat {
    margin-bottom: 10px;
    page-break-inside: avoid;
    border: 1px solid ${COLORS.grayMd};
    border-radius: 6px;
    overflow: hidden;
  }
  .alimentos-cat-title {
    background: ${COLORS.teal};
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 5px 12px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .alimentos-cat-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    font-size: 9.5px;
  }
  .alimentos-col {
    padding: 8px 12px;
  }
  .alimentos-col.ok {
    background: #F1FAF5;
    border-right: 1px solid ${COLORS.grayMd};
  }
  .alimentos-col.no {
    background: #FFF5F5;
  }
  .alimentos-col-title {
    font-size: 9px;
    font-weight: 800;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding-bottom: 3px;
    border-bottom: 1px dashed ${COLORS.grayMd};
  }
  .alimentos-col.ok .alimentos-col-title { color: ${COLORS.green}; }
  .alimentos-col.no .alimentos-col-title { color: ${COLORS.red}; }
  .alimentos-list { list-style: none; padding: 0; }
  .alimentos-list li {
    padding: 1.5px 0 1.5px 14px;
    position: relative;
    line-height: 1.4;
  }
  .alimentos-list li::before {
    position: absolute;
    left: 2px;
    font-weight: 800;
    font-size: 9px;
  }
  .alimentos-col.ok li::before { content: '✓'; color: ${COLORS.green}; }
  .alimentos-col.no li::before { content: '✕'; color: ${COLORS.red}; }
  
  /* ═══ INTERCAMBIOS SMAE ═══ */
  .intercambios-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .intercambio-card {
    border: 1px solid ${COLORS.grayMd};
    border-radius: 6px;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .intercambio-card-title {
    background: ${COLORS.blue};
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 5px 12px;
    letter-spacing: 0.5px;
  }
  .intercambio-card-body {
    padding: 7px 12px;
    font-size: 9.5px;
  }
  .intercambio-card-body ul { list-style: none; padding: 0; }
  .intercambio-card-body li {
    padding: 1.5px 0 1.5px 12px;
    position: relative;
    line-height: 1.45;
  }
  .intercambio-card-body li::before {
    content: '•';
    position: absolute;
    left: 2px;
    color: ${COLORS.teal};
  }
  .intercambio-card-body li strong {
    color: ${COLORS.navy};
    font-weight: 700;
  }
  .intercambio-card-body em {
    color: ${COLORS.gray};
    font-style: italic;
    font-size: 8.5px;
  }
  
  /* ═══ EJEMPLOS DE MENÚ ═══ */
  .menu-ejemplo {
    background: ${COLORS.grayLt};
    border-left: 3px solid ${COLORS.blue};
    border-radius: 0 4px 4px 0;
    padding: 8px 12px;
    margin-bottom: 6px;
    page-break-inside: avoid;
  }
  .menu-ejemplo-title {
    font-size: 10.5px;
    font-weight: 800;
    color: ${COLORS.navy};
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .menu-ejemplo-tag {
    background: white;
    border: 1px solid ${COLORS.grayMd};
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 8.5px;
    color: ${COLORS.blue};
    font-weight: 700;
    letter-spacing: 0.3px;
  }
  .menu-ejemplo-opcion {
    font-size: 9.5px;
    padding: 2px 0;
    line-height: 1.5;
    color: ${COLORS.navy};
  }
  .menu-ejemplo-opcion strong {
    color: ${COLORS.teal};
    font-weight: 700;
    margin-right: 4px;
  }
  
  /* ═══ FIRMAS ═══ */
  .firmas {
    margin-top: 24px;
    padding-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    page-break-inside: avoid;
  }
  .firma {
    text-align: center;
  }
  .firma-line {
    border-top: 1px solid ${COLORS.navy};
    padding-top: 6px;
    margin-top: 36px;
    font-size: 9px;
    color: ${COLORS.gray};
  }
  .firma-line strong {
    display: block;
    color: ${COLORS.navy};
    font-size: 10.5px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .firma-line .titulo {
    font-style: italic;
    color: ${COLORS.teal};
  }
  
  /* ═══ FOOTER ═══ */
  .footer {
    margin-top: 18px;
    padding-top: 10px;
    border-top: 2px solid ${COLORS.navy};
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8px;
    color: ${COLORS.gray};
  }
  .footer .slogan {
    color: ${COLORS.blue};
    font-style: italic;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .footer .gold-line {
    width: 30px;
    height: 2px;
    background: ${COLORS.gold};
    margin: 0 8px;
    display: inline-block;
  }
  
  /* ═══ IMPRESIÓN ═══ */
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print { display: none !important; }
    .section { page-break-inside: avoid; }
    .alimentos-cat { page-break-inside: avoid; }
    .firmas { page-break-inside: avoid; }
    table { page-break-inside: avoid; }
  }
  /* Ocultar URL y título del navegador en impresión */
  @page {
    margin: 14mm;
  }
  .print-btn {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 999;
    padding: 12px 22px;
    background: ${COLORS.blue};
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(11,31,59,0.3);
    transition: all 0.2s;
  }
  .print-btn:hover {
    background: ${COLORS.navy};
    transform: translateY(-1px);
  }
  `;
}

// ────────────────────────────────────────────────────────────────────────
// HEADER COMÚN
// ────────────────────────────────────────────────────────────────────────
function headerHTML(numeroDoc, tipoDoc, fecha) {
  return `
  <div class="header-band">
    <div class="header-logo">
      <img src="${LOGO_BASE64}" alt="IMC" />
    </div>
    <div class="header-info">
      <div class="header-name">${CLINICA.nombre}</div>
      <div class="header-tagline">${CLINICA.tagline}</div>
      <div class="header-contact">
        ${escape(CLINICA.direccion)}<br>
        ${escape(CLINICA.ciudad)} · ${escape(CLINICA.telefono)} · ${escape(CLINICA.email)}
      </div>
    </div>
    <div class="header-doc">
      <strong>${tipoDoc}</strong>
      ${numeroDoc}<br>
      ${fecha}
      <small>${escape(NUTRICIONISTA.nombre)}</small>
      <small>${escape(NUTRICIONISTA.registro)}</small>
    </div>
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────
// FOOTER COMÚN
// ────────────────────────────────────────────────────────────────────────
function footerHTML(fecha) {
  return `
  <div class="footer">
    <div>
      Documento generado por IMC360
      <span class="gold-line"></span>
      ${fecha}
    </div>
    <div class="slogan">"${CLINICA.slogan}"</div>
    <div>${escape(CLINICA.web)}</div>
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────
// FIRMAS
// ────────────────────────────────────────────────────────────────────────
function firmasHTML(paciente) {
  return `
  <div class="firmas">
    <div class="firma">
      <div class="firma-line">
        <strong>${escape(NUTRICIONISTA.nombre)}</strong>
        <span class="titulo">${escape(NUTRICIONISTA.titulo)}</span><br>
        ${escape(NUTRICIONISTA.registro)}
      </div>
    </div>
    <div class="firma">
      <div class="firma-line">
        <strong>${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</strong>
        ${paciente.cedula ? '<span class="titulo">C.I. ' + escape(paciente.cedula) + '</span>' : ''}<br>
        Paciente
      </div>
    </div>
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────
// ABRIR EN NUEVA VENTANA E IMPRIMIR
// ────────────────────────────────────────────────────────────────────────
function abrirYImprimir(html, titulo) {
  const ventana = window.open('', '_blank');
  if (!ventana) {
    alert('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio e intenta de nuevo.');
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  if (titulo) ventana.document.title = titulo;
}

// ════════════════════════════════════════════════════════════════════════
// PDF 1 — PLAN SMAE
// ════════════════════════════════════════════════════════════════════════
export function generarPDFPlanSMAE({ plan, paciente, porciones, ejemplos, intercambios, usuario }) {
  const edad = calcAge(paciente.fecha_nacimiento);
  const sexo = paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Femenino' : '—';
  const numeroDoc = generarNumero('NUT');
  const fechaHoy = formatDate(new Date().toISOString().split('T')[0]);

  // Agrupar intercambios por categoría
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

  const intercambiosPorCat = {};
  (intercambios || []).forEach(i => {
    if (!intercambiosPorCat[i.categoria_codigo]) intercambiosPorCat[i.categoria_codigo] = [];
    intercambiosPorCat[i.categoria_codigo].push(i);
  });

  // Totales
  const totales = { proteina: 0, carbohidrato: 0, grasa: 0, fruta: 0, vegetal: 0, lacteo: 0, leguminosa: 0, azucar: 0 };
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

  const ejemplosPorTiempo = {};
  (ejemplos || []).forEach(e => {
    if (!ejemplosPorTiempo[e.tiempo_codigo]) ejemplosPorTiempo[e.tiempo_codigo] = [];
    ejemplosPorTiempo[e.tiempo_codigo].push(e);
  });

  let secNum = 0;
  const sec = () => ++secNum;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Plan Nutricional · ${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</title>
<style>${baseCSS()}</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir o Guardar PDF</button>

${headerHTML(numeroDoc, 'PLAN N°', fechaHoy)}

<div class="doc-title">
  <div class="doc-title-overline">Documento Clínico Nutricional</div>
  <h1>PLAN NUTRICIONAL <span class="accent">·</span> SISTEMA DE INTERCAMBIOS SMAE</h1>
</div>

<div class="patient-card">
  <div class="patient-card-title">▸ Información del Paciente</div>
  <div class="patient-grid">
    <div class="patient-field">
      <span class="label">Nombre completo</span>
      <span class="value">${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</span>
    </div>
    <div class="patient-field">
      <span class="label">Cédula</span>
      <span class="value">${escape(paciente.cedula) || '—'}</span>
    </div>
    <div class="patient-field">
      <span class="label">Edad / Sexo</span>
      <span class="value">${edad ? edad + ' años' : '—'} · ${sexo}</span>
    </div>
    <div class="patient-field">
      <span class="label">Objetivo</span>
      <span class="value">${escape(plan.objetivo) || '—'}</span>
    </div>
    <div class="patient-field">
      <span class="label">Kcal objetivo</span>
      <span class="value">${plan.kcal_objetivo ? plan.kcal_objetivo + ' kcal/día' : '—'}</span>
    </div>
    <div class="patient-field">
      <span class="label">Fecha de inicio</span>
      <span class="value">${formatDateShort(plan.fecha_inicio)}</span>
    </div>
  </div>
</div>

<!-- SECCIÓN 1: Intercambios -->
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">Lista de Intercambios — 1 porción equivale a</div>
  </div>
  <div class="section-content">
    <div class="intercambios-grid">
      ${Object.entries(intercambiosPorCat).map(([cat, items]) => {
        const info = catLabels[cat] || { emoji: '•', nombre: cat.toUpperCase() };
        return `
        <div class="intercambio-card">
          <div class="intercambio-card-title">${info.emoji} ${info.nombre}</div>
          <div class="intercambio-card-body">
            <ul>
              ${items.map(i => `<li><strong>${escape(i.porcion)}</strong> ${escape(i.nombre)}${i.notas ? ' <em>(' + escape(i.notas) + ')</em>' : ''}</li>`).join('')}
            </ul>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>
</div>

<!-- SECCIÓN 2: Porciones -->
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">Porciones SMAE por tiempo de comida</div>
  </div>
  <div class="section-content" style="padding: 0;">
    <table>
      <thead>
        <tr>
          <th class="left">Tiempo / Hora</th>
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
            <td class="tiempo">${escape(p.tiempo_emoji || '')} ${escape(p.tiempo_nombre)}${p.tiempo_hora ? '<br><small style="color:#6E6E70;font-weight:400;">' + escape(p.tiempo_hora) + '</small>' : ''}</td>
            <td class="center">${p.porciones_fruta || '—'}</td>
            <td class="center">${p.porciones_vegetal || '—'}</td>
            <td class="center">${p.porciones_carbohidrato || '—'}</td>
            <td class="center">${p.porciones_proteina || '—'}</td>
            <td class="center">${p.porciones_grasa || '—'}</td>
            <td class="center">${p.porciones_lacteo || '—'}</td>
            <td class="center">${p.porciones_leguminosa || '—'}</td>
            <td class="center">${p.porciones_azucar || '—'}</td>
          </tr>
        `).join('')}
        <tr class="totals">
          <td class="left">TOTAL DIARIO</td>
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
</div>

${Object.keys(ejemplosPorTiempo).length > 0 ? `
<!-- SECCIÓN 3: Ejemplos -->
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">Ejemplos de menú</div>
  </div>
  <div class="section-content">
    ${Object.entries(ejemplosPorTiempo).map(([tiempo, opciones]) => {
      const porc = (porciones || []).find(p => p.tiempo_codigo === tiempo);
      const porcionesTxt = porc ? [
        porc.porciones_fruta && porc.porciones_fruta + 'F',
        porc.porciones_vegetal && porc.porciones_vegetal + 'V',
        porc.porciones_carbohidrato && porc.porciones_carbohidrato + 'C',
        porc.porciones_proteina && porc.porciones_proteina + 'P',
        porc.porciones_grasa && porc.porciones_grasa + 'G',
      ].filter(Boolean).join(' · ') : '';
      return `
      <div class="menu-ejemplo">
        <div class="menu-ejemplo-title">
          <span>${escape(porc?.tiempo_emoji || '')} ${escape(porc?.tiempo_nombre || tiempo)}</span>
          ${porcionesTxt ? '<span class="menu-ejemplo-tag">' + porcionesTxt + '</span>' : ''}
        </div>
        ${opciones.map(o => `
          <div class="menu-ejemplo-opcion"><strong>Opción ${o.numero_opcion}:</strong> ${escape(o.texto)}</div>
        `).join('')}
      </div>`;
    }).join('')}
  </div>
</div>
` : ''}

${plan.recomendaciones ? `
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">Recomendaciones generales</div>
  </div>
  <div class="section-content">
    <div class="info-box info">${escape(plan.recomendaciones)}</div>
  </div>
</div>` : ''}

${plan.hidratacion ? `
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">💧 Hidratación</div>
  </div>
  <div class="section-content">
    <div class="info-box info">${escape(plan.hidratacion)}</div>
  </div>
</div>` : ''}

${plan.suplementacion ? `
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">💊 Suplementación</div>
  </div>
  <div class="section-content">
    <div class="info-box success">${escape(plan.suplementacion)}</div>
  </div>
</div>` : ''}

${plan.consideraciones_glp1 ? `
<div class="section">
  <div class="section-header" style="background: linear-gradient(90deg, ${COLORS.orange}, #8B3A00);">
    <div class="section-number" style="background: white; color: ${COLORS.orange};">⚠</div>
    <div class="section-title">Consideraciones especiales (GLP-1)</div>
  </div>
  <div class="section-content">
    <div class="info-box warn">${escape(plan.consideraciones_glp1)}</div>
  </div>
</div>` : ''}

${firmasHTML(paciente)}

${footerHTML(fechaHoy)}

<script>setTimeout(() => window.print(), 600);</script>

</body>
</html>`;

  abrirYImprimir(html, `Plan Nutricional - ${paciente.nombre} ${paciente.apellido || ''}`);
}

// ════════════════════════════════════════════════════════════════════════
// PDF 2 — GUÍA DE FASE
// ════════════════════════════════════════════════════════════════════════
export function generarPDFGuiaFase({ fase, paciente, registroFase, usuario }) {
  const edad = calcAge(paciente.fecha_nacimiento);
  const sexo = paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Femenino' : '—';
  const numeroDoc = generarNumero('FAS');
  const fechaHoy = formatDate(new Date().toISOString().split('T')[0]);

  const tiemposOrden = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'merienda', 'cena'];
  const tiemposLabels = {
    desayuno:     { emoji: '🌅', nombre: 'Desayuno' },
    media_manana: { emoji: '🍎', nombre: 'Media mañana' },
    almuerzo:     { emoji: '🍽️', nombre: 'Almuerzo' },
    media_tarde:  { emoji: '🥜', nombre: 'Media tarde' },
    merienda:     { emoji: '🌙', nombre: 'Merienda' },
    cena:         { emoji: '🌙', nombre: 'Cena' },
  };

  const menu = fase.menu_establecido || {};
  const alimentos = fase.alimentos_permitidos || {};

  // Convertir texto multilínea a items <li>
  const textoALista = (txt) => {
    if (!txt) return '';
    return txt.split(/\n+/).filter(l => l.trim()).map(l => '<li>' + escape(l.trim()) + '</li>').join('');
  };

  let secNum = 0;
  const sec = () => ++secNum;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Guía Fase · ${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</title>
<style>${baseCSS()}</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir o Guardar PDF</button>

${headerHTML(numeroDoc, 'GUÍA N°', fechaHoy)}

<div class="doc-title">
  <div class="doc-title-overline">Guía Nutricional Postquirúrgica</div>
  <h1>${escape(fase.nombre)}</h1>
</div>

<div class="patient-card">
  <div class="patient-card-title">▸ Información del Paciente y Fase</div>
  <div class="patient-grid">
    <div class="patient-field">
      <span class="label">Nombre completo</span>
      <span class="value">${escape(paciente.nombre)} ${escape(paciente.apellido || '')}</span>
    </div>
    <div class="patient-field">
      <span class="label">Cédula</span>
      <span class="value">${escape(paciente.cedula) || '—'}</span>
    </div>
    <div class="patient-field">
      <span class="label">Edad / Sexo</span>
      <span class="value">${edad ? edad + ' años' : '—'} · ${sexo}</span>
    </div>
    <div class="patient-field">
      <span class="label">Fecha del procedimiento</span>
      <span class="value">${formatDateShort(paciente.fecha_procedimiento)}</span>
    </div>
    <div class="patient-field">
      <span class="label">Inicio de fase</span>
      <span class="value">${registroFase?.fecha_inicio ? formatDateShort(registroFase.fecha_inicio) : '—'}</span>
    </div>
    <div class="patient-field">
      <span class="label">Duración sugerida</span>
      <span class="value">${fase.duracion_dias_default || '—'} días · 💧 ${fase.hidratacion_litros || '—'} L/día</span>
    </div>
  </div>
</div>

${fase.indicaciones ? `
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">Indicaciones</div>
  </div>
  <div class="section-content">
    <ul class="check-list ok">${textoALista(fase.indicaciones)}</ul>
  </div>
</div>` : ''}

${fase.restricciones ? `
<div class="section">
  <div class="section-header" style="background: linear-gradient(90deg, ${COLORS.red}, #7E1414);">
    <div class="section-number" style="background: white; color: ${COLORS.red};">!</div>
    <div class="section-title">Restricciones importantes</div>
  </div>
  <div class="section-content">
    <ul class="check-list no">${textoALista(fase.restricciones)}</ul>
  </div>
</div>` : ''}

${fase.recomendaciones ? `
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">Recomendaciones</div>
  </div>
  <div class="section-content">
    <ul class="check-list dot">${textoALista(fase.recomendaciones)}</ul>
  </div>
</div>` : ''}

${fase.suplementacion ? `
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">💊 Suplementación</div>
  </div>
  <div class="section-content">
    <div class="info-box success">${escape(fase.suplementacion)}</div>
  </div>
</div>` : ''}

${Object.keys(menu).length > 0 ? `
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">🍽️ Menú Establecido</div>
  </div>
  <div class="section-content" style="padding: 0;">
    <table>
      <thead>
        <tr>
          <th class="left">Tiempo / Hora</th>
          <th class="left">Alimento</th>
          <th>Cantidad</th>
        </tr>
      </thead>
      <tbody>
        ${tiemposOrden.filter(t => menu[t]).map(t => {
          const data = menu[t];
          const label = tiemposLabels[t] || { emoji: '•', nombre: t };
          const items = data.items || [];
          return items.map((item, idx) => `
            <tr>
              ${idx === 0 ? '<td class="tiempo" rowspan="' + items.length + '">' + label.emoji + ' ' + label.nombre.toUpperCase() + (data.hora ? '<br><small style="font-weight:400;color:' + COLORS.gray + ';">' + escape(data.hora) + '</small>' : '') + '</td>' : ''}
              <td>${escape(item.alimento)}</td>
              <td class="right">${escape(item.cantidad)}</td>
            </tr>
          `).join('');
        }).join('')}
      </tbody>
    </table>
  </div>
</div>
` : ''}

${Object.keys(alimentos).length > 0 ? `
<div class="section">
  <div class="section-header">
    <div class="section-number">${sec()}</div>
    <div class="section-title">✓ Alimentos permitidos y prohibidos</div>
  </div>
  <div class="section-content">
    ${Object.entries(alimentos).map(([cat, data]) => `
      <div class="alimentos-cat">
        <div class="alimentos-cat-title">${escape(cat)}</div>
        <div class="alimentos-cat-body">
          <div class="alimentos-col ok">
            <div class="alimentos-col-title">✓ Permitidos</div>
            <ul class="alimentos-list">
              ${(data.permitidos || []).map(p => '<li>' + escape(p) + '</li>').join('')}
            </ul>
          </div>
          <div class="alimentos-col no">
            <div class="alimentos-col-title">✕ Prohibidos</div>
            <ul class="alimentos-list">
              ${(data.prohibidos || []).map(p => '<li>' + escape(p) + '</li>').join('')}
            </ul>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</div>
` : ''}

${firmasHTML(paciente)}

${footerHTML(fechaHoy)}

<script>setTimeout(() => window.print(), 600);</script>

</body>
</html>`;

  abrirYImprimir(html, `Guía Fase - ${paciente.nombre} ${paciente.apellido || ''}`);
}
