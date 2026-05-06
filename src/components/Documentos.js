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

// Logo IMC real (JPG embebido en base64)
const LOGO_SRC = 'data:image/jpeg;base64,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';
const LOGO_HTML = `<img src="${LOGO_SRC}" alt="IMC Logo" style="height:52px;width:auto;">`;

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
  const z1 = valoracion.zona1_lo ? { lo: valoracion.zona1_lo, hi: valoracion.zona1_hi } : getZona(35, 47);
  const z2 = valoracion.zona2_lo ? { lo: valoracion.zona2_lo, hi: valoracion.zona2_hi } : getZona(48, 67);
  const z3 = valoracion.zona3_lo ? { lo: valoracion.zona3_lo, hi: valoracion.zona3_hi } : getZona(68, 74);

  const bmiVal = valoracion.bmi || (valoracion.peso && valoracion.talla
    ? (parseFloat(valoracion.peso) / ((parseFloat(valoracion.talla) / 100) ** 2)).toFixed(1) : null);
  const nombre1 = paciente.nombre.split(' ')[0];
  const esMujer = paciente.sexo === 'F';

  // ── CÁLCULOS CLÍNICOS ────────────────────────────────────────────────────────
  const tmb = (() => {
    if (!valoracion.peso || !valoracion.talla || !age) return null;
    const p = parseFloat(valoracion.peso), t = parseFloat(valoracion.talla);
    return esMujer
      ? Math.round(447.6 + 9.25 * p + 3.1 * t - 4.33 * age)
      : Math.round(88.36 + 13.4 * p + 4.8 * t - 5.7 * age);
  })();

  const edadMetab = (() => {
    if (!valoracion.vo2max || !age) return null;
    return Math.max(18, Math.min(80, Math.round((65 - parseFloat(valoracion.vo2max)) / 0.55)));
  })();

  const riesgoCV = (() => {
    let p = 0;
    if (bmiVal) p += parseFloat(bmiVal) > 35 ? 3 : parseFloat(bmiVal) > 30 ? 2 : parseFloat(bmiVal) > 25 ? 1 : 0;
    if (valoracion.vo2max) p += parseFloat(valoracion.vo2max) < 20 ? 3 : parseFloat(valoracion.vo2max) < 28 ? 2 : parseFloat(valoracion.vo2max) < 35 ? 1 : 0;
    if (valoracion.fc_reposo) p += parseInt(valoracion.fc_reposo) > 90 ? 2 : parseInt(valoracion.fc_reposo) > 80 ? 1 : 0;
    if (age > 55) p += 2; else if (age > 45) p += 1;
    if (valoracion.limitantes && /diab|hipert/i.test(valoracion.limitantes)) p += 2;
    if (p <= 2) return { nivel: 'Bajo', color: '#1A7A4A', bg: '#E8F5EE' };
    if (p <= 5) return { nivel: 'Moderado', color: '#C25A00', bg: '#FFF3E0' };
    return { nivel: 'Alto', color: '#B02020', bg: '#FEF2F2' };
  })();

  // ── NARRATIVA PERSONALIZADA POR DATO ────────────────────────────────────────
  const seccionGrasa = () => {
    if (!valoracion.pct_grasa) return '';
    const g = parseFloat(valoracion.pct_grasa);
    const normal = esMujer ? 28 : 20;
    const exceso = g > normal ? (g - normal).toFixed(1) : 0;
    const kgGrasa = valoracion.peso && g ? ((g / 100) * parseFloat(valoracion.peso)).toFixed(1) : null;
    const kgExceso = kgGrasa && exceso ? ((exceso / 100) * parseFloat(valoracion.peso)).toFixed(1) : null;
    return `
    <div style="background:#FFF3E0;border-radius:12px;padding:18px 20px;margin-bottom:14px;border-left:4px solid #C25A00;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#C25A00;margin-bottom:4px;">% Grasa corporal</div>
          <div style="font-size:32px;font-weight:800;color:#C25A00;line-height:1;">${g}%</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:#7A3300;margin-bottom:2px;">Rango normal (mujeres): 18–28%</div>
          <div style="font-size:11px;color:#7A3300;">Tu meta: 28% · Diferencia: <strong>+${exceso}%</strong></div>
          ${kgExceso ? `<div style="font-size:10px;color:#C25A00;margin-top:2px;">≈ ${kgExceso} kg de grasa a transformar</div>` : ''}
        </div>
      </div>
      <p style="font-size:13px;color:#7A3300;line-height:1.7;margin-bottom:8px;">
        <strong>¿Qué significa esto para ti?</strong> Tu cuerpo tiene más grasa de la que necesita para funcionar bien. Esto no es estético — la grasa en exceso, especialmente en la zona abdominal, afecta directamente tu metabolismo, tus niveles de azúcar en sangre y tu energía diaria. Con tu condición de pre-diabetes, esto es el punto más importante a trabajar.
      </p>
      <p style="font-size:12px;color:#92400E;line-height:1.6;">
        <strong>Lo que va a pasar:</strong> Con el entrenamiento en Zona 2 (tu zona cardíaca principal) y la alimentación adecuada, tu cuerpo comenzará a usar esa grasa como combustible. En 4 semanas ya verás una diferencia en cómo te sientes. En 12 semanas, en los números.
      </p>
    </div>`;
  };

  const seccionMusculo = () => {
    if (!valoracion.masa_muscular) return '';
    const m = parseFloat(valoracion.masa_muscular);
    const deficit = m < 30 ? (30 - m).toFixed(1) : 0;
    return `
    <div style="background:#EFF6FF;border-radius:12px;padding:18px 20px;margin-bottom:14px;border-left:4px solid #1E7CB5;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1E7CB5;margin-bottom:4px;">Masa muscular</div>
          <div style="font-size:32px;font-weight:800;color:#1E7CB5;line-height:1;">${m} kg</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:#1E40AF;margin-bottom:2px;">Rango ideal: 30–40 kg</div>
          ${deficit > 0 ? `<div style="font-size:11px;color:#1565C0;">Necesitas ganar: <strong>+${deficit} kg</strong></div>` : '<div style="font-size:11px;color:#15803D;">En rango óptimo ✓</div>'}
        </div>
      </div>
      <p style="font-size:13px;color:#1E40AF;line-height:1.7;margin-bottom:8px;">
        <strong>¿Qué significa esto para ti?</strong> El músculo es tu aliado más poderoso. No solo te da fuerza — cada kilogramo de músculo quema entre 13 y 20 calorías al día en reposo. Más músculo significa que tu cuerpo trabaja más incluso cuando estás sentada. Para ti, que tienes pre-diabetes, el músculo también mejora la sensibilidad a la insulina.
      </p>
      <p style="font-size:12px;color:#1E40AF;line-height:1.6;">
        <strong>Lo que va a pasar:</strong> El entrenamiento de fuerza que harás en IMC construirá músculo de forma progresiva. No te preocupes — no vas a voluminizarte. Vas a tonificar, mejorar tu postura y acelerar tu metabolismo.
      </p>
    </div>`;
  };

  const seccionVo2 = () => {
    if (!valoracion.vo2max) return '';
    const v = parseFloat(valoracion.vo2max);
    const clasificacion = v >= 42 ? 'Excelente' : v >= 35 ? 'Buena' : v >= 28 ? 'Moderada' : v >= 20 ? 'Baja' : 'Muy baja';
    const color = v >= 35 ? '#1A7A4A' : v >= 25 ? '#C25A00' : '#B02020';
    const bg = v >= 35 ? '#E8F5EE' : v >= 25 ? '#FFF3E0' : '#FEF2F2';
    return `
    <div style="background:${bg};border-radius:12px;padding:18px 20px;margin-bottom:14px;border-left:4px solid ${color};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${color};margin-bottom:4px;">Capacidad cardiorrespiratoria (VO2max)</div>
          <div style="font-size:32px;font-weight:800;color:${color};line-height:1;">${v} <span style="font-size:14px;">ml/kg/min</span></div>
        </div>
        <div style="text-align:right;">
          <div style="background:${color};color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;">${clasificacion}</div>
          <div style="font-size:9px;color:#6E6E70;margin-top:4px;">Normal: ≥ 35 ml/kg/min</div>
          ${edadMetab ? `<div style="font-size:10px;color:${color};margin-top:2px;">Edad metabólica: ~${edadMetab} años</div>` : ''}
        </div>
      </div>
      <p style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:8px;">
        <strong>¿Qué significa esto para ti?</strong> El VO2max mide qué tan bien tu corazón y pulmones llevan oxígeno a tus músculos. Una capacidad ${clasificacion.toLowerCase()} significa que tu cuerpo trabaja con mayor esfuerzo para hacer actividades cotidianas — subir escaleras, caminar rápido, cargar cosas. Esto también se relaciona con tu metabolismo y cómo procesas el azúcar en sangre.
      </p>
      <p style="font-size:12px;color:#374151;line-height:1.6;">
        <strong>Lo que va a pasar:</strong> El entrenamiento aeróbico en Zona 2 es la herramienta más poderosa para mejorar esto. Con 3 sesiones por semana, en 8–12 semanas tu VO2max puede subir 3–5 puntos. Eso se traduce en más energía, menos fatiga y mejor control del azúcar en sangre.
      </p>
    </div>`;
  };

  const seccionZonas = () => `
    <div style="background:#F4F6F8;border-radius:12px;padding:18px 20px;margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4B647A;margin-bottom:12px;">❤️ Tus zonas cardíacas personales · FC reposo: ${valoracion.fc_reposo || '—'} bpm${fcmax ? ' · FC máx teórica: ' + fcmax + ' bpm' : ''}</div>
      <p style="font-size:12px;color:#374151;line-height:1.6;margin-bottom:14px;">Tu banda cardíaca es tu herramienta de trabajo. Estas zonas están calculadas específicamente para ti — entrenar en la zona correcta es lo que hace que cada sesión valga.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <div style="background:#EFF6FF;border-radius:8px;padding:12px 14px;border:1.5px solid #BFDBFE;">
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#1D4ED8;margin-bottom:3px;">Zona 1 · Calentamiento</div>
          <div style="font-size:18px;font-weight:800;color:#1D4ED8;font-family:'Courier New',monospace;">${z1.lo}–${z1.hi}</div>
          <div style="font-size:9px;color:#1E40AF;">bpm</div>
          <div style="font-size:10px;color:#1E40AF;margin-top:6px;line-height:1.4;">Conversación fluida. Para entrar en calor y los últimos minutos.</div>
        </div>
        <div style="background:#F0FDF4;border-radius:8px;padding:12px 14px;border:2px solid #15803D;">
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#15803D;margin-bottom:3px;">Zona 2 · Tu zona 🎯</div>
          <div style="font-size:18px;font-weight:800;color:#15803D;font-family:'Courier New',monospace;">${z2.lo}–${z2.hi}</div>
          <div style="font-size:9px;color:#166534;">bpm</div>
          <div style="font-size:10px;color:#166534;margin-top:6px;line-height:1.4;">Aquí pasan las cosas. Quema grasa + mejora aeróbica + controla el azúcar.</div>
        </div>
        <div style="background:#FFFBEB;border-radius:8px;padding:12px 14px;border:1.5px solid #FDE68A;">
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#B45309;margin-bottom:3px;">Zona 3 · Alta intensidad</div>
          <div style="font-size:18px;font-weight:800;color:#B45309;font-family:'Courier New',monospace;">${z3.lo}–${z3.hi}</div>
          <div style="font-size:9px;color:#92400E;">bpm</div>
          <div style="font-size:10px;color:#92400E;margin-top:6px;line-height:1.4;">Por ahora, mantente en Zona 2. Zona 3 llegará cuando tu base esté lista.</div>
        </div>
      </div>
    </div>`;

  const seccionObjetivos = () => {
    const semanas12 = new Date(); semanas12.setDate(semanas12.getDate() + 84);
    const fmtMeta = d => d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long' });
    const items = [];
    if (valoracion.pct_grasa && parseFloat(valoracion.pct_grasa) > 28) {
      const g = parseFloat(valoracion.pct_grasa);
      const meta = (g - Math.min(6, g - 26)).toFixed(1);
      items.push({ icono: '🎯', titulo: 'Grasa corporal', actual: `${g}%`, meta: `${meta}%`, nota: '0.8–1 kg de grasa/mes con entrenamiento constante', color: '#C25A00' });
    }
    if (valoracion.masa_muscular && parseFloat(valoracion.masa_muscular) < 32) {
      const m = parseFloat(valoracion.masa_muscular);
      items.push({ icono: '💪', titulo: 'Masa muscular', actual: `${m} kg`, meta: `${(m + 1.5).toFixed(1)} kg`, nota: 'Con fuerza 2–3 veces por semana', color: '#1E7CB5' });
    }
    if (valoracion.vo2max && parseFloat(valoracion.vo2max) < 40) {
      const v = parseFloat(valoracion.vo2max);
      items.push({ icono: '❤️', titulo: 'Capacidad aeróbica', actual: `${v} ml/kg/min`, meta: `${(v + 4)} ml/kg/min`, nota: '+3–5 puntos en 12 semanas de cardio Z2', color: '#7B2D8B' });
    }
    if (items.length === 0) return '';
    return `
    <div style="background:#0B1F3B;border-radius:12px;padding:20px;margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1E7CB5;margin-bottom:14px;">🎯 Tus metas concretas para el ${fmtMeta(semanas12)}</div>
      <div style="display:grid;grid-template-columns:${items.length === 1 ? '1fr' : 'repeat(' + Math.min(items.length, 3) + ',1fr)'};gap:10px;">
        ${items.map(o => `
        <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:12px 14px;border:1px solid rgba(255,255,255,0.1);">
          <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:6px;">${o.icono} ${o.titulo}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:14px;color:rgba(255,255,255,0.4);font-family:'Courier New',monospace;">${o.actual}</span>
            <span style="color:#1E7CB5;">→</span>
            <span style="font-size:18px;font-weight:800;color:white;font-family:'Courier New',monospace;">${o.meta}</span>
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,0.35);line-height:1.4;">${o.nota}</div>
        </div>`).join('')}
      </div>
    </div>`;
  };

  const seccionAlertas = () => {
    const alertas = [];
    if (valoracion.limitantes && /diab|prediab/i.test(valoracion.limitantes))
      alertas.push({ icono: '🩸', titulo: 'Pre-diabetes detectada', desc: 'Tu entrenamiento en Zona 2 es especialmente importante — el ejercicio aeróbico mejora directamente la sensibilidad a la insulina. Monitorea tu glucemia antes y después del ejercicio. Evita entrenar con glucemia < 80 o > 250 mg/dL.', color: '#C25A00', bg: '#FFF3E0' });
    if (valoracion.spo2 && parseFloat(valoracion.spo2) < 94)
      alertas.push({ icono: '🫁', titulo: `SpO2 baja: ${valoracion.spo2}%`, desc: 'Tu saturación de oxígeno está por debajo del rango normal. Comunica esto a tu médico tratante antes de iniciar el programa de ejercicios.', color: '#B02020', bg: '#FEF2F2' });
    if (valoracion.fc_reposo && parseInt(valoracion.fc_reposo) > 90)
      alertas.push({ icono: '❤️', titulo: `FC en reposo elevada: ${valoracion.fc_reposo} bpm`, desc: 'Una frecuencia cardíaca en reposo alta puede indicar estrés, deshidratación o condición cardiovascular a evaluar. A medida que mejore tu condición aeróbica, este número bajará.', color: '#B02020', bg: '#FEF2F2' });
    if (alertas.length === 0) return '';
    return `
    <div style="margin-bottom:14px;">
      ${alertas.map(a => `
      <div style="background:${a.bg};border-radius:10px;padding:14px 16px;margin-bottom:8px;border-left:4px solid ${a.color};">
        <div style="font-size:12px;font-weight:700;color:${a.color};margin-bottom:6px;">${a.icono} ${a.titulo}</div>
        <p style="font-size:12px;color:#374151;line-height:1.6;">${a.desc}</p>
      </div>`).join('')}
    </div>`;
  };

  const seccionMetabolismo = () => {
    if (!tmb) return '';
    return `
    <div style="background:#F4F6F8;border-radius:12px;padding:16px 20px;margin-bottom:14px;display:flex;gap:16px;align-items:flex-start;">
      <div style="flex-shrink:0;text-align:center;min-width:100px;">
        <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#4B647A;letter-spacing:1px;margin-bottom:4px;">🔥 Metabolismo basal</div>
        <div style="font-size:28px;font-weight:800;color:#0B1F3B;">${tmb}</div>
        <div style="font-size:10px;color:#6E6E70;">kcal/día</div>
      </div>
      <div style="flex:1;border-left:1.5px solid #DDE3EA;padding-left:16px;">
        <p style="font-size:12px;color:#374151;line-height:1.6;margin-bottom:6px;">Tu cuerpo quema <strong>${tmb} calorías al día solo para vivir</strong> — respirar, bombear sangre, mantener la temperatura. Este es tu piso energético.</p>
        <p style="font-size:12px;color:#374151;line-height:1.6;">Con tu nivel de actividad actual (3–4 días de ejercicio), tu gasto total es de <strong>${Math.round(tmb * 1.55)}–${Math.round(tmb * 1.65)} kcal/día</strong>. Tu nutricionista usará este dato para diseñar tu plan alimentario.</p>
      </div>
    </div>`;
  };

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
      ${LOGO_HTML}
    </div>
    <div style="position:relative;z-index:1;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:white;line-height:1.3;margin-bottom:8px;">Tu punto de <span style="color:#1E7CB5;">partida</span>,<br>${nombre1}.</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:12px;margin-bottom:20px;">Valoración inicial del ${fmtDate(valoracion.fecha)} · ${grupoLabels[paciente.grupo] || ''}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Paciente</div>
          <div style="font-size:13px;font-weight:600;color:white;">${paciente.nombre} ${paciente.apellido}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">${age > 0 ? age + ' años' : ''} · ${esMujer ? 'Femenino' : 'Masculino'}</div>
        </div>
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">${paciente.cirugia ? 'Procedimiento' : 'Historia Clínica'}</div>
          <div style="font-size:13px;font-weight:600;color:white;">${paciente.cirugia || paciente.historia_clinica || '—'}</div>
          ${paciente.fecha_cirugia ? `<div style="font-size:10px;color:rgba(255,255,255,0.4);">Fecha: ${fmtDate(paciente.fecha_cirugia)}</div>` : `<div style="font-size:10px;color:rgba(255,255,255,0.4);">Terapeuta: ${valoracion.terapeuta_nombre || '—'}</div>`}
        </div>
        <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Riesgo cardiovascular</div>
          <div style="font-size:15px;font-weight:700;color:${riesgoCV.color.replace('#', '#')};" >${riesgoCV.nivel}</div>
          <div style="display:flex;gap:3px;margin-top:4px;">${['Bajo','Moderado','Alto'].map(n => `<div style="flex:1;height:4px;border-radius:2px;background:${n===riesgoCV.nivel?riesgoCV.color:'rgba(255,255,255,0.15)'};"></div>`).join('')}</div>
        </div>
        ${edadMetab ? `<div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Edad metabólica</div>
          <div style="font-size:15px;font-weight:700;color:${edadMetab > age + 5 ? '#FCA5A5' : edadMetab > age ? '#FDE68A' : '#86EFAC'};">${edadMetab} años</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">Tu edad real: ${age} años</div>
        </div>` : `<div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:3px;">Historia Clínica</div>
          <div style="font-size:13px;font-weight:600;color:white;">${paciente.historia_clinica || '—'}</div>
        </div>`}
      </div>
    </div>
  </div>

  <!-- INTRO PERSONALIZADA -->
  <div style="background:#1E7CB5;padding:16px 36px;">
    <p style="font-size:13px;color:white;line-height:1.6;">
      <strong>${nombre1}, este documento es tuyo.</strong> No es un reporte médico lleno de términos que nadie entiende. Es una explicación clara de <em>cómo está tu cuerpo hoy</em>, qué significa cada número y qué va a cambiar con el programa IMC. Léelo con calma — es tu punto de partida.
    </p>
  </div>

  <div style="padding:24px 36px;">

    <!-- SEPARADOR -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <div style="width:3px;height:20px;background:#1E7CB5;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">Tu composición corporal explicada</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>

    ${seccionGrasa()}
    ${seccionMusculo()}
    ${seccionVo2()}

    <!-- METABOLISMO -->
    ${seccionMetabolismo()}

    <!-- ZONAS -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;margin-top:8px;">
      <div style="width:3px;height:20px;background:#1E7CB5;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">Cómo entrenar en tu rango correcto</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    ${seccionZonas()}

    <!-- ALERTAS -->
    ${((valoracion.limitantes && /diab|prediab/i.test(valoracion.limitantes)) || (valoracion.spo2 && parseFloat(valoracion.spo2) < 94) || (valoracion.fc_reposo && parseInt(valoracion.fc_reposo) > 90)) ? `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:20px;background:#B02020;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#B02020;font-weight:700;">Lo que debes saber sobre tu salud</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    ${seccionAlertas()}` : ''}

    <!-- OBJETIVOS -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:20px;background:#0B1F3B;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">A dónde vamos</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    ${seccionObjetivos()}

    <!-- DIAGNÓSTICO -->
    ${valoracion.diagnostico ? `
    <div style="background:#F4F6F8;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4B647A;margin-bottom:8px;">📋 Diagnóstico fisioterapéutico</div>
      <p style="font-size:13px;color:#0B1F3B;line-height:1.7;">${valoracion.diagnostico}</p>
      ${valoracion.fortalezas ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #DDE3EA;"><span style="font-size:10px;font-weight:700;color:#1A7A4A;text-transform:uppercase;">✓ Tus fortalezas: </span><span style="font-size:12px;color:#1A7A4A;">${valoracion.fortalezas}</span></div>` : ''}
    </div>` : ''}

    <!-- FIRMAS -->
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
      ${LOGO_HTML}
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

    <!-- Ejercicios con imágenes -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:18px;background:#1E7CB5;border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#0B1F3B;font-weight:700;">Ejercicios prescritos</h2>
      <div style="flex:1;height:1px;background:#DDE3EA;"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      ${todosEjs.map((pe, i) => {
        const ex = exById[pe.ejercicio_id];
        if (!ex) return '';
        const col = CAT_COLORS[ex.categoria] || '#4B647A';
        return `
        <div style="border:1.5px solid #DDE3EA;border-radius:10px;overflow:hidden;border-top:3px solid ${col};">
          <div style="display:flex;gap:0;">
            ${ex.imagen_url ? `<img src="${ex.imagen_url}" alt="${ex.nombre}"
              style="width:110px;height:110px;object-fit:cover;flex-shrink:0;"
              onerror="this.style.display='none'">` : ''}
            <div style="padding:10px 12px;flex:1;">
              <div style="font-size:12px;font-weight:700;color:#0B1F3B;margin-bottom:4px;">${ex.nombre}</div>
              <span style="background:${col}22;color:${col};padding:2px 7px;border-radius:10px;font-size:8px;font-weight:700;text-transform:uppercase;display:inline-block;margin-bottom:6px;">${CAT_LABELS[ex.categoria]?.split(' ')[0] || ex.categoria}</span>
              <div style="display:flex;gap:6px;margin-bottom:6px;">
                <div style="background:#F4F6F8;border-radius:6px;padding:4px 8px;text-align:center;flex:1;">
                  <div style="font-size:8px;color:#6E6E70;text-transform:uppercase;letter-spacing:.5px;">Series</div>
                  <div style="font-size:14px;font-weight:700;color:#0B1F3B;">${pe.series || '—'}</div>
                </div>
                <div style="background:#F4F6F8;border-radius:6px;padding:4px 8px;text-align:center;flex:1;">
                  <div style="font-size:8px;color:#6E6E70;text-transform:uppercase;letter-spacing:.5px;">Reps</div>
                  <div style="font-size:14px;font-weight:700;color:#0B1F3B;">${pe.repeticiones || '—'}</div>
                </div>
                ${pe.carga ? `<div style="background:${col}11;border-radius:6px;padding:4px 8px;text-align:center;flex:1;">
                  <div style="font-size:8px;color:${col};text-transform:uppercase;letter-spacing:.5px;">Carga</div>
                  <div style="font-size:11px;font-weight:700;color:${col};">${pe.carga}</div>
                </div>` : ''}
              </div>
              ${pe.nota ? `<div style="font-size:9px;color:#4B647A;font-style:italic;line-height:1.4;">${pe.nota}</div>` : ''}
            </div>
          </div>
          ${ex.descripcion ? `<div style="padding:7px 12px;background:#F9FAFB;border-top:1px solid #EEF0F2;font-size:9px;color:#4B647A;line-height:1.5;">${ex.descripcion}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
    <!-- Tabla resumen -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:11px;">
      <thead>
        <tr style="background:#0B1F3B;">
          <th style="padding:6px 10px;text-align:left;color:white;font-size:9px;text-transform:uppercase;letter-spacing:.8px;">Ejercicio</th>
          <th style="padding:6px 10px;text-align:center;color:white;font-size:9px;text-transform:uppercase;letter-spacing:.8px;">Series</th>
          <th style="padding:6px 10px;text-align:center;color:white;font-size:9px;text-transform:uppercase;letter-spacing:.8px;">Reps/Tiempo</th>
          <th style="padding:6px 10px;text-align:center;color:white;font-size:9px;text-transform:uppercase;letter-spacing:.8px;">Carga/FC</th>
          <th style="padding:6px 10px;text-align:left;color:white;font-size:9px;text-transform:uppercase;letter-spacing:.8px;">Nota</th>
        </tr>
      </thead>
      <tbody>
        ${todosEjs.map((pe, i) => {
          const ex = exById[pe.ejercicio_id];
          if (!ex) return '';
          const col = CAT_COLORS[ex.categoria] || '#4B647A';
          const bg = i % 2 === 0 ? 'white' : '#F4F6F8';
          return `<tr style="border-bottom:1px solid #F4F6F8;background:${bg};">
            <td style="padding:6px 10px;font-weight:600;color:#0B1F3B;">${ex.nombre}</td>
            <td style="padding:6px 10px;text-align:center;">${pe.series || '—'}</td>
            <td style="padding:6px 10px;text-align:center;">${pe.repeticiones || '—'} ${ex.unidad}</td>
            <td style="padding:6px 10px;text-align:center;color:#4B647A;">${pe.carga || '—'}</td>
            <td style="padding:6px 10px;color:#555;font-size:10px;">${pe.nota || ''}</td>
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
export function BotonesDocumentos({ paciente, valoraciones, planes, ejercicios }) {
  const { useState } = require('react');
  const [valIdx, setValIdx] = useState(0);
  const [planIdx, setPlanIdx] = useState(0);

  const valoracion = valoraciones?.[valIdx] || null;
  const planSeleccionado = planes?.[planIdx] || null;
  const planEjercicios = planSeleccionado?.plan_ejercicios || [];

  const descargar = (html, nombre) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fmtShort = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div style={{ background: 'white', border: '1.5px solid #DDE3EA', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
      <p style={{ fontWeight: 700, fontSize: 12, color: '#0B1F3B', margin: '0 0 4px' }}>📄 Documentos para el paciente</p>
      <p style={{ fontSize: 11, color: '#6E6E70', margin: '0 0 14px' }}>
        Descarga el HTML → ábrelo en el navegador → Ctrl+P → Guardar como PDF
      </p>

      {/* Selectores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Valoración a usar</label>
          <select value={valIdx} onChange={e => setValIdx(Number(e.target.value))}
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #DDE3EA', borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
            {(valoraciones || []).map((v, i) => (
              <option key={v.id} value={i}>{fmtShort(v.fecha)} · {v.terapeuta_nombre || '—'}</option>
            ))}
            {!valoraciones?.length && <option value={0}>Sin valoraciones</option>}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#4B647A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Plan a incluir</label>
          <select value={planIdx} onChange={e => setPlanIdx(Number(e.target.value))}
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #DDE3EA', borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
            {(planes || []).map((p, i) => (
              <option key={p.id} value={i}>{fmtShort(p.fecha)} · Fase {p.fase} · {p.entorno === 'gym' ? 'Gimnasio' : 'Casa'}</option>
            ))}
            {!planes?.length && <option value={0}>Sin planes</option>}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {valoracion ? (
          <button onClick={() => descargar(generarInforme(paciente, valoracion), `IMC_Informe_${paciente.nombre}_${paciente.apellido}.html`)}
            style={{ padding: '9px 18px', background: '#1E7CB5', color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            📋 Informe de condición
          </button>
        ) : (
          <p style={{ fontSize: 11, color: '#C25A00' }}>⚠ Registra una valoración para habilitar los documentos</p>
        )}
        {planSeleccionado && valoracion ? (
          <button onClick={() => descargar(generarGuia(paciente, valoracion, planSeleccionado, planEjercicios, ejercicios), `IMC_Guia_${paciente.nombre}_${paciente.apellido}.html`)}
            style={{ padding: '9px 18px', background: '#0B1F3B', color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            🏋️ Guía de entrenamiento
          </button>
        ) : (
          valoracion && <p style={{ fontSize: 11, color: '#6E6E70' }}>Crea un plan de ejercicio para habilitar la guía</p>
        )}
      </div>
    </div>
  );
}
