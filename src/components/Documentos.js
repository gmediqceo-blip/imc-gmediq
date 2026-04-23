// ─── GENERADORES DE DOCUMENTOS IMC ───────────────────────────────────────────
// Genera HTML completo con estilos inline para impresión perfecta

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', white: '#FFFFFF', green: '#1A7A4A',
  red: '#B02020', orange: '#C25A00',
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CAT_LABELS = { aerobico: 'Aeróbico', tren_inferior: 'Tren Inferior', tren_superior: 'Tren Superior', core: 'Core', respiratorio: 'Respiratorio', movilidad: 'Movilidad' };
const CAT_COLORS = { aerobico: B.blue, tren_inferior: B.navy, tren_superior: B.teal, core: B.orange, respiratorio: '#7B2D8B', movilidad: '#7B2D8B' };

const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const calcAge = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
const planLabels = { starter: 'Starter Plan $80', standard: 'Standard IMC $250/mes', imc360: 'IMC 360 $400/mes' };
const grupoLabels = { transformacion: 'Transformación Corporal', prequirurgico: 'Pre-Quirúrgico', postquirurgico: 'Post-Quirúrgico' };

// SVG Logo IMC
const LOGO_SVG = `<svg width="180" height="56" viewBox="0 0 220 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="28" cy="10" r="8" fill="#1E7CB5"/>
  <path d="M28 18 C22 25 14 27 11 35 C8 42 13 50 19 47 C25 44 27 38 32 34 C37 30 43 34 41 42" stroke="#1E7CB5" stroke-width="5.5" stroke-linecap="round" fill="none"/>
  <path d="M28 18 C33 21 40 20 43 25 C46 30 41 36 36 33" stroke="#1E7CB5" stroke-width="5" stroke-linecap="round" fill="none"/>
  <text x="52" y="46" font-family="Arial Black,Arial" font-weight="900" font-size="44" fill="#0B1F3B">IMC</text>
  <text x="52" y="63" font-family="Arial" font-weight="700" font-size="9" fill="#4B647A" letter-spacing="1">INSTITUTO METABÓLICO CORPORAL</text>
  <text x="52" y="75" font-family="Arial" font-size="8" fill="#9AA5B1" letter-spacing="0.5">by GMEDiQ</text>
</svg>`;

// ─── ESTILOS BASE PARA DOCUMENTOS ─────────────────────────────────────────────
const BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #E8EDF3; color: #0B1F3B; padding: 24px 16px 80px; }
  .page { background: white; max-width: 780px; margin: 0 auto; border-radius: 6px; overflow: hidden; box-shadow: 0 8px 40px rgba(11,31,59,0.14); }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #0B1F3B; color: white; border: none; padding: 12px 28px; border-radius: 30px; font-family: 'Segoe UI',Arial,sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 20px rgba(11,31,59,0.3); z-index: 100; }
  .print-btn:hover { background: #1E7CB5; }
  @media print {
    body { background: white !important; padding: 0 !important; }
    .page { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
    .print-btn { display: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  }
`;

// ─── INFORME DE CONDICIÓN ─────────────────────────────────────────────────────
export function generarInforme(paciente, valoracion) {
  const age = calcAge(paciente.fecha_nacimiento);
  const fcmax = age > 0 ? 220 - age : null;
  const reserve = fcmax && valoracion.fc_reposo ? fcmax - parseInt(valoracion.fc_reposo) : null;

  const getZona = (pctLo, pctHi) => {
    if (!reserve || !valoracion.fc_reposo) return { lo: '—', hi: '—' };
    return {
      lo: Math.round(reserve * pctLo / 100 + parseFloat(valoracion.fc_reposo)),
      hi: Math.round(reserve * pctHi / 100 + parseFloat(valoracion.fc_reposo)),
    };
  };

  const z1 = { lo: valoracion.zona1_lo, hi: valoracion.zona1_hi } || getZona(35, 47);
  const z2 = { lo: valoracion.zona2_lo, hi: valoracion.zona2_hi } || getZona(48, 67);
  const z3 = { lo: valoracion.zona3_lo, hi: valoracion.zona3_hi } || getZona(68, 74);

  const card = (label, val, unit, ref, desc, status) => {
    const colors = {
      good: { top: '#E8F5EE', label: B.green, val: B.green, bot: '#D1FAE5', text: '#064E2E' },
      warn: { top: '#FFF3E0', label: B.orange, val: B.orange, bot: '#FDDCB5', text: '#7A3300' },
      alert: { top: '#FEF2F2', label: B.red, val: B.red, bot: '#FECACA', text: '#7F1D1D' },
      neutral: { top: B.grayLt, label: B.teal, val: B.navy, bot: '#DDE3EA', text: B.teal },
    };
    const c = colors[status] || colors.neutral;
    return `
      <div style="border-radius:10px;overflow:hidden;border:1.5px solid #DDE3EA;">
        <div style="padding:12px 14px 8px;background:${c.top};">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${c.label};margin-bottom:5px;">${label}</div>
          <div style="font-size:24px;font-weight:700;color:${c.val};line-height:1;">${val || '—'}<span style="font-size:11px;font-weight:400;"> ${val ? unit : ''}</span></div>
          <div style="font-size:9px;color:${c.label};opacity:.7;margin-top:2px;">${ref}</div>
        </div>
        <div style="padding:8px 14px;background:${c.bot};font-size:11px;color:${c.text};line-height:1.45;">${desc}</div>
      </div>`;
  };

  const bmiVal = valoracion.bmi || (valoracion.peso && valoracion.talla ? (parseFloat(valoracion.peso) / ((parseFloat(valoracion.talla) / 100) ** 2)).toFixed(1) : null);
  const bmiStatus = bmiVal ? (parseFloat(bmiVal) > 35 ? 'alert' : parseFloat(bmiVal) > 30 ? 'warn' : parseFloat(bmiVal) > 25 ? 'warn' : 'good') : 'neutral';
  const fatStatus = valoracion.pct_grasa ? (parseFloat(valoracion.pct_grasa) > 35 ? 'alert' : parseFloat(valoracion.pct_grasa) > 25 ? 'warn' : 'good') : 'neutral';
  const muscleStatus = valoracion.masa_muscular ? (parseFloat(valoracion.masa_muscular) > 32 ? 'good' : 'warn') : 'neutral';
  const vo2Status = valoracion.vo2max ? (parseFloat(valoracion.vo2max) > 35 ? 'good' : parseFloat(valoracion.vo2max) > 25 ? 'warn' : 'alert') : 'neutral';
  const ssStatus = valoracion.sit_stand ? (parseInt(valoracion.sit_stand) >= 20 ? 'good' : parseInt(valoracion.sit_stand) >= 15 ? 'warn' : 'alert') : 'neutral';
  const dynaStatus = valoracion.dina_d ? (parseFloat(valoracion.dina_d) > 35 ? 'good' : 'warn') : 'neutral';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe de Condición — ${paciente.nombre} ${paciente.apellido}</title>
<style>${BASE_STYLES}</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div style="background:#0B1F3B;padding:28px 36px 24px;position:relative;overflow:hidden;">
    <div style="position:absolute;width:280px;height:280px;border-radius:50%;border:55px solid rgba(30,124,181,0.09);right:-70px;top:-90px;"></div>
    <div style="background:white;border-radius:8px;padding:6px 14px;display:inline-flex;align-items:center;margin-bottom:20px;position:relative;z-index:1;">
      ${LOGO_SVG}
    </div>
    <div style="position:relative;z-index:1;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:white;line-height:1.2;margin-bottom:8px;">Tu punto de <span style="color:#1E7CB5;">partida</span>,<br>${paciente.nombre.split(' ')[0]}.</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:12px;margin-bottom:20px;">Valoración inicial del ${fmtDate(valoracion.fecha)} · ${grupoLabels[paciente.grupo] || ''}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Paciente</div>
          <div style="font-size:14px;font-weight:600;color:white;">${paciente.nombre} ${paciente.apellido}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">${age > 0 ? age + ' años' : ''} · ${paciente.sexo === 'F' ? 'Femenino' : paciente.sexo === 'M' ? 'Masculino' : ''}</div>
        </div>
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">${paciente.cirugia ? 'Procedimiento' : 'Plan IMC'}</div>
          <div style="font-size:14px;font-weight:600;color:white;">${paciente.cirugia || planLabels[paciente.plan] || ''}</div>
          ${paciente.fecha_cirugia ? `<div style="font-size:10px;color:rgba(255,255,255,0.4);">Fecha: ${fmtDate(paciente.fecha_cirugia)}</div>` : ''}
        </div>
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Historia Clínica</div>
          <div style="font-size:14px;font-weight:600;color:white;">${paciente.historia_clinica || '—'}</div>
        </div>
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Terapeuta</div>
          <div style="font-size:14px;font-weight:600;color:white;">${valoracion.terapeuta_nombre || '—'}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- INTRO -->
  <div style="background:#1E7CB5;padding:14px 36px;display:flex;align-items:center;gap:12px;">
    <span style="font-size:20px;flex-shrink:0;">💬</span>
    <p style="font-size:12px;color:white;line-height:1.5;"><strong>Este documento es tuyo.</strong> Está escrito para que entiendas exactamente cómo está tu cuerpo hoy — sin tecnicismos. Los números son tu punto de partida. Lo que importa es hacia dónde vamos juntos.</p>
  </div>

  <!-- BODY -->
  <div style="padding:28px 36px;">

    <!-- Resultados principales -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <div style="width:3px;height:20px;background:#1E7CB5;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">Tus resultados principales</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px;">
      ${card('Peso corporal', valoracion.peso, 'kg', `IMC: ${bmiVal || '—'}`, bmiVal && parseFloat(bmiVal) > 30 ? 'Tu peso actual genera carga extra en articulaciones y corazón. Es el principal objetivo del programa.' : 'Peso en seguimiento. El foco será mejorar la composición corporal.', bmiStatus)}
      ${card('% Grasa corporal', valoracion.pct_grasa, '%', 'H: 10–20% · M: 18–28%', valoracion.pct_grasa ? (parseFloat(valoracion.pct_grasa) > 30 ? 'Alta proporción de grasa. Afecta el metabolismo. Cambiará con el entrenamiento.' : 'Grasa por encima del óptimo. Mejorable con ejercicio y nutrición.') : 'Dato por completar.', fatStatus)}
      ${card('Masa muscular', valoracion.masa_muscular, 'kg', 'Músculo esquelético', valoracion.masa_muscular ? (parseFloat(valoracion.masa_muscular) > 32 ? 'Buena masa muscular. El entrenamiento la preservará y aumentará.' : 'Músculo por debajo del rango ideal. Construirlo es prioridad del programa.') : 'Dato por completar.', muscleStatus)}
      ${card('Capacidad cardiorrespiratoria', valoracion.vo2max, 'ml/kg/min', 'Normal: ≥ 35 ml/kg/min', valoracion.vo2max ? (parseFloat(valoracion.vo2max) < 25 ? 'Corazón y pulmones trabajan al límite. Mejorar esto reduce riesgo quirúrgico.' : 'Capacidad aeróbica moderada. El cardio progresivo la elevará.') : 'Dato por completar.', vo2Status)}
      ${card('Test funcional (Sit & Stand)', valoracion.sit_stand, 'reps/min', 'Normal: ≥ 20 repeticiones', valoracion.sit_stand ? (parseInt(valoracion.sit_stand) >= 20 ? 'Buena fuerza funcional de piernas.' : 'Fuerza funcional por debajo del rango. El entrenamiento lo mejora rápido.') : 'Dato por completar.', ssStatus)}
      ${card('Fuerza de agarre', valoracion.dina_d, 'kg', 'H: 35–55 · M: 20–35 kg', valoracion.dina_d ? (parseFloat(valoracion.dina_d) > 35 ? 'Fuerza de agarre normal. Indicador positivo de fuerza general.' : 'Por debajo del rango. Mejorable con entrenamiento de fuerza.') : 'Dato por completar.', dynaStatus)}
    </div>

    <!-- Zonas cardíacas -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;margin-top:24px;">
      <div style="width:3px;height:20px;background:#1E7CB5;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">Tus zonas cardíacas personales</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    <p style="font-size:12px;color:#6E6E70;margin-bottom:14px;line-height:1.5;">Calculadas específicamente para ti. Son tu guía de intensidad — ni tan suave que no sirva, ni tan fuerte que sea riesgoso.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px;">
      <div style="background:#F4F6F8;border-radius:10px;padding:12px 14px;border:1.5px solid #DDE3EA;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#4B647A;margin-bottom:3px;">FC en reposo</div>
        <div style="font-size:20px;font-weight:600;font-family:'Courier New',monospace;color:#0B1F3B;">${valoracion.fc_reposo || '—'} bpm</div>
        <div style="font-size:10px;color:#6E6E70;margin-top:3px;">FC máxima teórica: ${fcmax || '—'} bpm · Reserva: ${reserve || '—'} bpm</div>
      </div>
      <div style="background:#EFF6FF;border-radius:10px;padding:12px 14px;border:1.5px solid #BFDBFE;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1D4ED8;margin-bottom:3px;">Zona 1 — Quema de grasa</div>
        <div style="font-size:20px;font-weight:600;font-family:'Courier New',monospace;color:#1D4ED8;">${z1.lo} – ${z1.hi} bpm</div>
        <div style="font-size:10px;color:#1E40AF;margin-top:3px;">35–47% VO2max · Calentamiento y caminatas</div>
      </div>
      <div style="background:#F0FDF4;border-radius:10px;padding:12px 14px;border:1.5px solid #BBF7D0;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#15803D;margin-bottom:3px;">Zona 2 — Objetivo principal</div>
        <div style="font-size:20px;font-weight:600;font-family:'Courier New',monospace;color:#15803D;">${z2.lo} – ${z2.hi} bpm</div>
        <div style="font-size:10px;color:#166534;margin-top:3px;">48–67% VO2max · Bloque principal de cardio</div>
      </div>
      <div style="background:#FFFBEB;border-radius:10px;padding:12px 14px;border:1.5px solid #FDE68A;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#B45309;margin-bottom:3px;">Zona 3 — ${paciente.grupo === 'prequirurgico' ? 'No superar en esta fase' : 'Umbral aeróbico'}</div>
        <div style="font-size:20px;font-weight:600;font-family:'Courier New',monospace;color:#B45309;">${z3.lo} – ${z3.hi} bpm</div>
        <div style="font-size:10px;color:#92400E;margin-top:3px;">${paciente.grupo === 'prequirurgico' ? 'Reducir intensidad si alcanza esta zona' : '68–74% VO2max · Intervalos y HIIT'}</div>
      </div>
    </div>

    <!-- Diagnóstico -->
    ${valoracion.diagnostico ? `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;margin-top:24px;">
      <div style="width:3px;height:20px;background:#1E7CB5;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">Diagnóstico fisioterapéutico</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    <div style="background:#F4F6F8;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
      <p style="font-size:13px;color:#0B1F3B;line-height:1.6;">${valoracion.diagnostico}</p>
      ${valoracion.limitantes ? `<p style="font-size:12px;color:#C25A00;margin-top:8px;"><strong>Limitantes:</strong> ${valoracion.limitantes}</p>` : ''}
    </div>` : ''}

    <!-- Compromiso -->
    <div style="background:#0B1F3B;border-radius:10px;padding:20px 22px;margin-bottom:24px;position:relative;overflow:hidden;">
      <div style="position:absolute;width:160px;height:160px;border-radius:50%;border:36px solid rgba(30,124,181,0.1);right:-30px;bottom:-50px;"></div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#1E7CB5;margin-bottom:8px;">Nuestro compromiso contigo</div>
      <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:white;line-height:1.5;position:relative;z-index:1;">Llegaste aquí habiendo dado <span style="color:#1E7CB5;">el paso más difícil</span>. Nuestro trabajo es acompañarte con ciencia, tecnología y un plan real — para que cada sesión valga.</p>
    </div>

    <!-- Firmas -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding-top:20px;border-top:1.5px solid #DDE3EA;">
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#4B647A;font-weight:600;margin-bottom:28px;">Terapeuta Física IMC</div>
        <div style="border-bottom:1.5px solid #DDE3EA;margin-bottom:5px;"></div>
        <div style="font-size:11px;color:#6E6E70;">${valoracion.terapeuta_nombre || '________________________'}</div>
      </div>
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#4B647A;font-weight:600;margin-bottom:28px;">Recibido y entendido por</div>
        <div style="border-bottom:1.5px solid #DDE3EA;margin-bottom:5px;"></div>
        <div style="font-size:11px;color:#6E6E70;">${paciente.nombre} ${paciente.apellido} · ${fmtDate(valoracion.fecha)}</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background:#0B1F3B;padding:12px 36px;display:flex;justify-content:space-between;align-items:center;">
    <div style="color:rgba(255,255,255,0.5);font-size:10px;"><strong style="color:rgba(255,255,255,0.9);display:block;font-size:11px;margin-bottom:1px;">IMC – Instituto Metabólico Corporal</strong>Documento confidencial · Uso exclusivo del paciente</div>
    <div style="text-align:right;color:rgba(255,255,255,0.35);font-size:9px;">by GMEDiQ · ${new Date().getFullYear()}<br>HC: ${paciente.historia_clinica || '—'}</div>
  </div>
</div>
<button class="print-btn" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
</body></html>`;
}

// ─── GUÍA DE ENTRENAMIENTO ────────────────────────────────────────────────────
export function generarGuia(paciente, valoracion, plan, planEjercicios, ejercicios) {
  const age = calcAge(paciente.fecha_nacimiento);
  const fcmax = age > 0 ? 220 - age : null;
  const reserve = fcmax && valoracion?.fc_reposo ? fcmax - parseInt(valoracion.fc_reposo) : null;

  const getZona = (pctLo, pctHi) => {
    if (!reserve || !valoracion?.fc_reposo) return { lo: '—', hi: '—' };
    return {
      lo: Math.round(reserve * pctLo / 100 + parseFloat(valoracion.fc_reposo)),
      hi: Math.round(reserve * pctHi / 100 + parseFloat(valoracion.fc_reposo)),
    };
  };

  const z1 = { lo: valoracion?.zona1_lo, hi: valoracion?.zona1_hi } || getZona(35, 47);
  const z2 = { lo: valoracion?.zona2_lo, hi: valoracion?.zona2_hi } || getZona(48, 67);

  const exById = {};
  ejercicios.forEach(e => exById[e.id] = e);

  // Agrupar ejercicios por día
  const porDia = {};
  (planEjercicios || []).forEach(pe => {
    if (!porDia[pe.dia]) porDia[pe.dia] = [];
    porDia[pe.dia].push(pe);
  });
  Object.values(porDia).forEach(arr => arr.sort((a, b) => a.orden - b.orden));

  // Todos los ejercicios únicos del plan
  const todosEjs = (planEjercicios || []).filter((pe, i, arr) => arr.findIndex(x => x.ejercicio_id === pe.ejercicio_id) === i);

  const dayCell = (day) => {
    const exs = porDia[day] || [];
    if (exs.length === 0) return `
      <div style="border-radius:8px;overflow:hidden;">
        <div style="padding:5px 3px;text-align:center;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:#DDE3EA;color:#6E6E70;">${day.slice(0, 3)}</div>
        <div style="min-height:70px;background:#F4F6F8;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:8px;color:#DDE3EA;font-weight:600;text-transform:uppercase;writing-mode:vertical-rl;letter-spacing:1px;">Descanso</span>
        </div>
      </div>`;

    const cats = [...new Set(exs.map(e => exById[e.ejercicio_id]?.categoria).filter(Boolean))];
    const mainCat = cats[0];
    const hColor = mainCat === 'aerobico' ? B.blue : mainCat === 'core' ? B.teal : B.navy;
    const tagColor = CAT_COLORS[mainCat] || B.teal;

    return `
      <div style="border-radius:8px;overflow:hidden;">
        <div style="padding:5px 3px;text-align:center;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:${hColor};color:white;">${day.slice(0, 3)}</div>
        <div style="padding:7px 5px;min-height:70px;background:#F4F6F8;">
          <span style="display:block;font-size:8px;font-weight:700;text-transform:uppercase;color:${tagColor};margin-bottom:3px;">${CAT_LABELS[mainCat] || ''}</span>
          ${exs.slice(0, 3).map(pe => {
            const ex = exById[pe.ejercicio_id];
            return ex ? `<div style="font-size:9px;color:#0B1F3B;line-height:1.3;margin-bottom:1px;">${ex.nombre}<br><span style="color:#6E6E70;font-size:8px;">${pe.series || ''}×${pe.repeticiones || ''} ${ex.unidad}</span></div>` : '';
          }).join('')}
          ${exs.length > 3 ? `<div style="font-size:8px;color:#6E6E70;">+${exs.length - 3} más</div>` : ''}
        </div>
      </div>`;
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Guía de Entrenamiento — ${paciente.nombre} ${paciente.apellido}</title>
<style>${BASE_STYLES}</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div style="background:#0B1F3B;padding:26px 36px 22px;position:relative;overflow:hidden;">
    <div style="position:absolute;width:240px;height:240px;border-radius:50%;border:45px solid rgba(30,124,181,0.09);right:-60px;top:-70px;"></div>
    <div style="background:white;border-radius:8px;padding:5px 13px;display:inline-flex;align-items:center;margin-bottom:18px;position:relative;z-index:1;">
      ${LOGO_SVG}
    </div>
    <div style="position:relative;z-index:1;">
      <h1 style="font-size:22px;font-weight:700;color:white;margin-bottom:5px;">Guía de Entrenamiento Personalizada</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:11px;margin-bottom:18px;">${paciente.nombre} ${paciente.apellido} · Fase ${plan.fase} · ${fmtDate(plan.fecha)} · ${plan.entorno === 'gym' ? '🏋️ Gimnasio' : '🏠 Casa'}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:9px 13px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:2px;">Paciente</div>
          <div style="font-size:13px;font-weight:600;color:white;">${paciente.nombre} ${paciente.apellido}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">HC: ${paciente.historia_clinica || '—'} · ${age > 0 ? age + ' años' : ''}</div>
        </div>
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:9px 13px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:2px;">Protocolo</div>
          <div style="font-size:13px;font-weight:600;color:white;">${grupoLabels[paciente.grupo] || ''}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">Fase ${plan.fase} · ${plan.entorno === 'gym' ? 'Gimnasio' : 'Casa'}</div>
        </div>
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:9px 13px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:2px;">Entorno</div>
          <div style="font-size:13px;font-weight:600;color:white;">${plan.entorno === 'gym' ? '🏋️ Gimnasio' : '🏠 Casa'}</div>
        </div>
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:9px 13px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:2px;">Terapeuta</div>
          <div style="font-size:13px;font-weight:600;color:white;">${plan.terapeuta_nombre || '—'}</div>
        </div>
      </div>
    </div>
  </div>

  ${paciente.grupo === 'prequirurgico' && paciente.fecha_cirugia ? `
  <div style="background:#FFF3E0;border-left:4px solid #C25A00;padding:10px 36px;display:flex;align-items:center;gap:10px;">
    <span style="font-size:14px;">⚠</span>
    <p style="font-size:11px;color:#C25A00;font-weight:600;">Protocolo pre-quirúrgico — <span style="font-weight:400;color:#7A3300;">Cirugía: ${fmtDate(paciente.fecha_cirugia)}. Sin alta intensidad. Monitorear FC y SpO2 en cada sesión.</span></p>
  </div>` : ''}

  <!-- BODY -->
  <div style="padding:24px 36px;">

    <!-- Indicadores actuales -->
    ${valoracion ? `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:18px;background:#1E7CB5;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">Indicadores actuales</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:#DDE3EA;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      ${[
        ['Peso', valoracion.peso, 'kg', `IMC: ${valoracion.bmi || '—'}`],
        ['% Grasa', valoracion.pct_grasa, '%', ''],
        ['VO2max', valoracion.vo2max, 'ml/kg/min', ''],
        ['FC reposo', valoracion.fc_reposo, 'bpm', `FC máx: ${fcmax || '—'}`],
        ['Sit & Stand', valoracion.sit_stand, 'reps', ''],
      ].map(([l, v, u, r]) => `
        <div style="background:white;padding:10px 8px;text-align:center;">
          <div style="font-size:8px;text-transform:uppercase;letter-spacing:1.5px;color:#4B647A;font-weight:600;margin-bottom:3px;">${l}</div>
          <div style="font-size:18px;font-weight:700;color:#0B1F3B;line-height:1;">${v || '—'}<span style="font-size:9px;color:#6E6E70;font-weight:400;"> ${v ? u : ''}</span></div>
          ${r ? `<div style="font-size:8px;color:#6E6E70;margin-top:2px;">${r}</div>` : ''}
        </div>`).join('')}
    </div>` : ''}

    <!-- Zonas cardíacas -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:18px;background:#1E7CB5;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">Tus zonas cardíacas</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:22px;">
      <div style="background:#E3F2FD;border-radius:8px;padding:10px 12px;border:1.5px solid #BBDEFB;">
        <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1565C0;margin-bottom:2px;">Zona 1 — Quema de grasa</div>
        <div style="font-size:16px;font-weight:500;font-family:'Courier New',monospace;color:#1565C0;">${z1.lo || valoracion?.zona1_lo || '—'} – ${z1.hi || valoracion?.zona1_hi || '—'} bpm</div>
        <div style="font-size:9px;color:#1565C0;opacity:.7;margin-top:2px;">35–47% VO2max</div>
      </div>
      <div style="background:#E8F5E9;border-radius:8px;padding:10px 12px;border:1.5px solid #C8E6C9;">
        <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1B5E20;margin-bottom:2px;">Zona 2 — Objetivo principal</div>
        <div style="font-size:16px;font-weight:500;font-family:'Courier New',monospace;color:#1B5E20;">${z2.lo || valoracion?.zona2_lo || '—'} – ${z2.hi || valoracion?.zona2_hi || '—'} bpm</div>
        <div style="font-size:9px;color:#1B5E20;opacity:.7;margin-top:2px;">48–67% VO2max</div>
      </div>
      <div style="background:#FFF8E1;border-radius:8px;padding:10px 12px;border:1.5px solid #FFECB3;">
        <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#E65100;margin-bottom:2px;">Zona 3 — ${paciente.grupo === 'prequirurgico' ? 'No superar' : 'Umbral'}</div>
        <div style="font-size:16px;font-weight:500;font-family:'Courier New',monospace;color:#E65100;">${valoracion?.zona3_lo || '—'} – ${valoracion?.zona3_hi || '—'} bpm</div>
        <div style="font-size:9px;color:#E65100;opacity:.7;margin-top:2px;">${paciente.grupo === 'prequirurgico' ? 'Evitar en esta fase' : '68–74% VO2max'}</div>
      </div>
    </div>

    <!-- Plan semanal -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:18px;background:#1E7CB5;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">Distribución semanal</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:22px;">
      ${DAYS.map(d => dayCell(d)).join('')}
    </div>

    <!-- Tabla de ejercicios -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:18px;background:#1E7CB5;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">Ejercicios prescritos</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#0B1F3B;">
          <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:600;color:white;text-transform:uppercase;letter-spacing:.8px;border-radius:6px 0 0 0;width:28%;">Ejercicio</th>
          <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:600;color:white;text-transform:uppercase;letter-spacing:.8px;width:12%;">Categoría</th>
          <th style="padding:7px 10px;text-align:center;font-size:9px;font-weight:600;color:white;text-transform:uppercase;letter-spacing:.8px;width:8%;">Series</th>
          <th style="padding:7px 10px;text-align:center;font-size:9px;font-weight:600;color:white;text-transform:uppercase;letter-spacing:.8px;width:12%;">Reps/Tiempo</th>
          <th style="padding:7px 10px;text-align:center;font-size:9px;font-weight:600;color:white;text-transform:uppercase;letter-spacing:.8px;width:12%;">Carga/FC</th>
          <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:600;color:white;text-transform:uppercase;letter-spacing:.8px;border-radius:0 6px 0 0;width:28%;">Nota</th>
        </tr>
      </thead>
      <tbody>
        ${todosEjs.map((pe, i) => {
          const ex = exById[pe.ejercicio_id];
          if (!ex) return '';
          const col = CAT_COLORS[ex.categoria] || B.teal;
          const bg = i % 2 === 0 ? 'white' : '#F4F6F8';
          return `
          <tr style="border-bottom:1px solid #F4F6F8;background:${bg};">
            <td style="padding:8px 10px;font-size:11px;font-weight:600;color:#0B1F3B;">${ex.nombre}</td>
            <td style="padding:8px 10px;"><span style="background:${col}22;color:${col};padding:2px 7px;border-radius:10px;font-size:8px;font-weight:700;text-transform:uppercase;">${CAT_LABELS[ex.categoria]?.split(' ')[0] || ''}</span></td>
            <td style="padding:8px 10px;text-align:center;font-size:11px;">${pe.series || '—'}</td>
            <td style="padding:8px 10px;text-align:center;font-size:11px;">${pe.repeticiones || '—'} ${ex.unidad}</td>
            <td style="padding:8px 10px;text-align:center;font-size:10px;color:#4B647A;">${pe.carga || '—'}</td>
            <td style="padding:8px 10px;font-size:10px;color:#555;">${pe.nota || ex.musculos || ''}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>

    <!-- Señales de alarma -->
    <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:8px;padding:12px 14px;margin-bottom:18px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#B02020;margin-bottom:6px;">⚠ Detener ejercicio inmediatamente si:</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;">
        ${['FC supera la zona prescrita', 'SpO2 baja de 92%', 'Dolor en el pecho o presión', 'Mareo o visión borrosa', 'Dificultad para hablar caminando', 'Dolor articular agudo'].map(a => `<div style="font-size:10px;color:#7F1D1D;display:flex;align-items:flex-start;gap:5px;"><span style="color:#B02020;font-weight:700;font-size:9px;flex-shrink:0;margin-top:1px;">✕</span>${a}</div>`).join('')}
      </div>
    </div>

    <!-- Recomendaciones -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">
      ${[
        ['💧', 'Hidratación', '200 ml antes del ejercicio. Sorbos frecuentes durante. 2+ litros al día.'],
        ['🥩', 'Proteína', 'Mínimo 1.2–1.6 g/kg/día distribuida en 5–6 tomas.'],
        ['😴', 'Sueño', '7–8 horas mínimo para recuperación muscular óptima.'],
        ['📊', 'Monitoreo', 'Banda cardíaca en cada sesión. Registrar FC y Borg al finalizar.'],
      ].map(([ic, t, b]) => `
        <div style="display:flex;gap:8px;align-items:flex-start;padding:10px 12px;background:#F4F6F8;border-radius:8px;">
          <div style="font-size:14px;flex-shrink:0;">${ic}</div>
          <div><div style="font-size:10px;font-weight:700;color:#0B1F3B;margin-bottom:2px;">${t}</div><div style="font-size:10px;color:#6E6E70;line-height:1.4;">${b}</div></div>
        </div>`).join('')}
    </div>

    ${plan.notas_generales ? `<div style="background:#E8F4FD;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:12px;color:#0B1F3B;line-height:1.5;"><strong>Notas del terapeuta:</strong> ${plan.notas_generales}</div>` : ''}

    <!-- Firmas -->
    <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;border-top:1.5px solid #DDE3EA;padding-top:14px;">
      <div style="font-size:10px;color:#6E6E70;"><strong style="color:#0B1F3B;display:block;margin-bottom:2px;font-size:11px;">${plan.terapeuta_nombre || 'Terapeuta IMC'}</strong>Terapeuta Física · IMC</div>
      <div style="text-align:center;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#4B647A;font-weight:600;">Próxima evaluación</div><div style="font-size:13px;font-weight:700;color:#0B1F3B;">En 4 semanas</div></div>
      <div style="text-align:right;"><div style="border-bottom:1px solid #DDE3EA;width:130px;margin-left:auto;margin-bottom:4px;height:24px;"></div><div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#6E6E70;">Firma del paciente</div></div>
    </div>
  </div>
</div>
<button class="print-btn" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
</body></html>`;
}

// ─── COMPONENTE BOTONES DE DOCUMENTOS ────────────────────────────────────────
export function BotonesDocumentos({ paciente, valoracion, plan, planEjercicios, ejercicios }) {
  const descargar = (html, nombre) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: 'white', border: `1.5px solid #DDE3EA`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
      <p style={{ fontWeight: 700, fontSize: 12, color: '#0B1F3B', margin: '0 0 6px' }}>📄 Documentos para el paciente</p>
      <p style={{ fontSize: 11, color: '#6E6E70', margin: '0 0 12px' }}>
        Descarga el HTML → ábrelo en el navegador → Ctrl+P → Guardar como PDF
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {valoracion && (
          <button
            onClick={() => descargar(generarInforme(paciente, valoracion), `IMC_Informe_${paciente.nombre}_${paciente.apellido}.html`)}
            style={{ padding: '9px 18px', background: '#1E7CB5', color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            📋 Informe de condición
          </button>
        )}
        {plan && valoracion && (
          <button
            onClick={() => descargar(generarGuia(paciente, valoracion, plan, planEjercicios, ejercicios), `IMC_Guia_${paciente.nombre}_${paciente.apellido}.html`)}
            style={{ padding: '9px 18px', background: '#0B1F3B', color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            🏋️ Guía de entrenamiento
          </button>
        )}
        {!valoracion && <p style={{ fontSize: 11, color: '#C25A00' }}>⚠ Registra una valoración para habilitar los documentos</p>}
        {valoracion && !plan && <p style={{ fontSize: 11, color: '#6E6E70' }}>Crea un plan de ejercicio para habilitar la guía</p>}
      </div>
    </div>
  );
}
