#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RECETA MSP FORMATO PROFESIONAL (estilo Orpheus)
- Mitad izquierda: RECETA (medicamento + posología | cantidad) para farmacia
- Mitad derecha: INDICACIONES (explicación para el paciente)
- Campo "Cantidad" nuevo en el formulario de prescripción (# 15 → QUINCE)
- Impresión forzada en horizontal (A4 landscape)
Todo en ConsultaMedica.js — con assertions y respaldo (.bak_receta)
"""
import os, sys, shutil

RAIZ = os.path.expanduser("~/Desktop/imc-app/src")

def encontrar(nombre):
    for carpeta, _, archivos in os.walk(RAIZ):
        if nombre in archivos:
            return os.path.join(carpeta, nombre)
    sys.exit(f"❌ No encontré {nombre} dentro de {RAIZ}")

ruta = encontrar("ConsultaMedica.js")
with open(ruta, encoding="utf-8") as f:
    texto = f.read()

# (descripcion, viejo, nuevo, ocurrencias_esperadas)
REEMPLAZOS = [

("Estado nuevoMed con cantidad (nueva + editar)",
"useState({ nombre: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' })",
"useState({ nombre: '', dosis: '', frecuencia: '', duracion: '', cantidad: '', indicaciones: '' })",
2),

("Reset nuevoMed con cantidad (nueva + editar)",
"setNuevoMed({ nombre: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' })",
"setNuevoMed({ nombre: '', dosis: '', frecuencia: '', duracion: '', cantidad: '', indicaciones: '' })",
2),

("Banco de medicamentos sugiere cantidad 1",
"setNuevoMed({ nombre: m.nombre, dosis: m.dosis, frecuencia: m.frecuencia, duracion: '30 días', indicaciones: m.indicaciones })",
"setNuevoMed({ nombre: m.nombre, dosis: m.dosis, frecuencia: m.frecuencia, duracion: '30 días', cantidad: '1', indicaciones: m.indicaciones })",
1),

("Campo Cantidad en el formulario",
"""                  <CInput label="Duración" value={nuevoMed.duracion} onChange={v => setNuevoMed(p => ({ ...p, duracion: v }))} placeholder="Ej: 30 días" half />""",
"""                  <CInput label="Duración" value={nuevoMed.duracion} onChange={v => setNuevoMed(p => ({ ...p, duracion: v }))} placeholder="Ej: 30 días" half />
                  <CInput label="Cantidad a entregar" value={nuevoMed.cantidad} onChange={v => setNuevoMed(p => ({ ...p, cantidad: v }))} placeholder="Ej: 15" half />""",
1),

("Mostrar cantidad en la lista de medicamentos",
"""color: B.teal, margin: '0 0 2px' }}>{m.dosis} · {m.frecuencia} · {m.duracion}</p>""",
"""color: B.teal, margin: '0 0 2px' }}>{m.dosis} · {m.frecuencia} · {m.duracion}{m.cantidad ? ' · Cantidad: #' + m.cantidad : ''}</p>""",
1),

("Cuerpo de la receta: izquierda RECETA / derecha INDICACIONES",
"""  const recetaBody = `
    <div style="font-size:11px;margin-bottom:8px;"><strong>Código:</strong> ${codigo}</div>
    <div style="font-size:11px;margin-bottom:4px;"><strong>Fecha:</strong> Quito ${fmtV(fechaConsulta)} | <strong>Válida hasta:</strong> ${fmtV(validaHasta)}</div>
    <div style="font-size:11px;margin-bottom:4px;"><strong>Paciente:</strong> ${paciente.apellido?.toUpperCase()} ${paciente.nombre?.toUpperCase()}</div>
    <div style="font-size:11px;margin-bottom:4px;"><strong>Cédula:</strong> ${paciente.cedula || '—'}</div>
    <div style="font-size:11px;margin-bottom:8px;"><strong>Edad:</strong> ${age} año(s)</div>
    ${diags.length > 0 ? `<div style="font-size:11px;margin-bottom:12px;"><strong>Diagnóstico:</strong> ${diags.map(d => d.code + ' ' + d.desc).join(' - ')}</div>` : ''}
    <hr style="border:1px solid #ccc;margin:10px 0;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <thead><tr style="border-bottom:2px solid #000;">
        <th style="text-align:left;padding:4px;font-size:11px;">MEDICAMENTOS.-</th>
        <th style="text-align:center;padding:4px;font-size:11px;width:80px;">CANTIDAD.-</th>
        <th style="text-align:left;padding:4px;font-size:11px;">INDICACIONES.-</th>
      </tr></thead>
      <tbody>
        ${medicamentos.map((m, i) => `
          <tr><td style="padding:6px 4px;font-size:11px;vertical-align:top;">
            ${i+1}. <strong>${m.nombre}</strong>
          </td>
          <td style="padding:6px 4px;font-size:11px;text-align:center;vertical-align:top;"># 1<br>(UN0)</td>
          <td style="padding:6px 4px;font-size:11px;vertical-align:top;">${m.dosis || ''}${m.frecuencia ? ', ' + m.frecuencia : ''}${m.duracion ? '. ' + m.duracion : ''}</td></tr>
          ${m.indicaciones ? `<tr><td colspan="3" style="padding:0 4px 6px;font-size:10px;color:#555;font-style:italic;">${m.indicaciones}</td></tr>` : ''}
        `).join('')}
      </tbody>
    </table>
    <div style="margin-bottom:6px;font-size:11px;"><strong>OBSERVACIONES:</strong></div>
    <div style="margin-bottom:4px;font-size:11px;">Recomendaciones:</div>
    <div style="margin-bottom:4px;font-size:11px;">Signos de Alarma:</div>
    <div style="margin-bottom:16px;font-size:11px;">Alergias: ${paciente.alergias || ''}</div>
    <div style="font-size:11px;margin-bottom:30px;"><strong>Próxima Cita:</strong> ${consulta.proxima_visita ? fmtV(new Date(consulta.proxima_visita + 'T12:00:00')) : ''}</div>
    <div style="text-align:center;margin-top:20px;">
      <div style="font-size:11px;font-weight:700;">${consulta.medico_nombre || 'Dr. Diego Alejandro Díaz Salcedo'}</div>
      <div style="font-size:10px;">Cirugía General y Laparoscópica</div>
      <div style="font-size:10px;">Registro Profesional: 1804536876</div>
      <div style="font-size:10px;">Contacto: 0984075703</div>
    </div>`;""",
"""  const numeroALetras = c => {
    const n = Math.min(99, parseInt(c) || 1);
    const u = ['CERO','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISEIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE'];
    if (n <= 20) return u[n];
    const dec = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
    const d = Math.floor(n / 10), r = n % 10;
    if (n < 30) return r ? 'VEINTI' + u[r] : 'VEINTE';
    return r ? dec[d] + ' Y ' + u[r] : dec[d];
  };
  const cantidadNum = m => Math.min(99, parseInt(m.cantidad) || 1);
  const posologia = m => [m.dosis, m.frecuencia, m.duracion].filter(Boolean).join(', ').toUpperCase();

  const datosPaciente = `
    <div style="font-size:11px;margin-bottom:8px;"><strong>Código:</strong> ${codigo}</div>
    <div style="font-size:11px;margin-bottom:4px;"><strong>Fecha:</strong> Quito ${fmtV(fechaConsulta)} | <strong>Válida hasta:</strong> ${fmtV(validaHasta)}</div>
    <div style="font-size:11px;margin-bottom:4px;"><strong>Paciente:</strong> ${paciente.apellido?.toUpperCase()} ${paciente.nombre?.toUpperCase()}</div>
    <div style="font-size:11px;margin-bottom:4px;"><strong>Cédula:</strong> ${paciente.cedula || '—'}</div>
    <div style="font-size:11px;margin-bottom:8px;"><strong>Edad:</strong> ${age} año(s)</div>
    ${diags.length > 0 ? `<div style="font-size:11px;margin-bottom:12px;"><strong>Diagnóstico:</strong> ${diags.map(d => d.code + ' ' + d.desc).join(' - ')}</div>` : ''}
    <hr style="border:1px solid #ccc;margin:10px 0;">`;

  const observacionesFirma = `
    <div style="margin-bottom:6px;font-size:11px;"><strong>OBSERVACIONES:</strong></div>
    <div style="margin-bottom:4px;font-size:11px;">Recomendaciones: ${consulta.indicaciones || ''}</div>
    <div style="margin-bottom:4px;font-size:11px;">Signos de Alarma:</div>
    <div style="margin-bottom:16px;font-size:11px;">Alergias: ${paciente.alergias || ''}</div>
    <div style="font-size:11px;margin-bottom:30px;"><strong>Próxima Cita:</strong> ${consulta.proxima_visita ? fmtV(new Date(consulta.proxima_visita + 'T12:00:00')) : ''}</div>
    <div style="text-align:center;margin-top:20px;">
      <div style="font-size:11px;font-weight:700;">${consulta.medico_nombre || 'Dr. Diego Alejandro Díaz Salcedo'}</div>
      <div style="font-size:10px;">Cirugía General y Laparoscópica</div>
      <div style="font-size:10px;">Registro Profesional: 1804536876</div>
      <div style="font-size:10px;">Contacto: 0984075703</div>
    </div>`;

  const recetaIzq = `${datosPaciente}
    <div style="text-align:center;font-weight:700;font-size:12px;letter-spacing:2px;margin-bottom:8px;">RECETA</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <thead><tr style="border-bottom:2px solid #000;">
        <th style="text-align:left;padding:4px;font-size:11px;">MEDICAMENTOS.-</th>
        <th style="text-align:center;padding:4px;font-size:11px;width:90px;">CANTIDAD.-</th>
      </tr></thead>
      <tbody>
        ${medicamentos.map((m, i) => `
          <tr><td style="padding:6px 4px;font-size:11px;vertical-align:top;">
            ${i+1}. <strong>${m.nombre}</strong><br>
            <span style="font-size:10px;">${posologia(m)}</span>
          </td>
          <td style="padding:6px 4px;font-size:11px;text-align:center;vertical-align:top;"># ${cantidadNum(m)}<br>(${numeroALetras(m.cantidad)})</td></tr>
        `).join('')}
      </tbody>
    </table>
    ${observacionesFirma}`;

  const recetaDer = `${datosPaciente}
    <div style="text-align:center;font-weight:700;font-size:12px;letter-spacing:2px;margin-bottom:8px;">INDICACIONES</div>
    <div style="border-bottom:2px solid #000;padding:4px;font-size:11px;font-weight:700;margin-bottom:6px;">INDICACIONES.-</div>
    ${medicamentos.map((m, i) => `
      <div style="margin-bottom:12px;font-size:11px;">
        ${i+1}. <strong>${m.nombre}</strong> — # ${cantidadNum(m)} (${numeroALetras(m.cantidad)})<br>
        <span style="font-size:10px;">${posologia(m)}</span>
        ${m.indicaciones ? `<br><span style="font-size:10px;color:#555;font-style:italic;">${m.indicaciones}</span>` : ''}
      </div>
    `).join('')}
    ${observacionesFirma}`;""",
1),

("Página con dos mitades distintas (receta | indicaciones)",
"""  <div class="page">
    <div class="copy">
      <div class="header">
        <img src="${logoSrc}" alt="IMC" style="height:40px;width:auto;">
        <div class="header-info" style="text-align:right;">
          Av. Mariana de Jesús OE702 y Nuño de Valderrama,<br>
          Edificio Citimed, 3er Piso, Consultorio 313.<br>
          <strong>Correo:</strong> gmediqceo@gmail.com<br>
          <strong>Telef.:</strong> 0984075703
        </div>
      </div>
      ${recetaBody}
    </div>
    <div class="copy">
      <div class="header">
        <img src="${logoSrc}" alt="IMC" style="height:40px;width:auto;">
        <div class="header-info" style="text-align:right;">
          Av. Mariana de Jesús OE702 y Nuño de Valderrama,<br>
          Edificio Citimed, 3er Piso, Consultorio 313.<br>
          <strong>Correo:</strong> gmediqceo@gmail.com<br>
          <strong>Telef.:</strong> 0984075703
        </div>
      </div>
      ${recetaBody}
    </div>
  </div>""",
"""  <div class="page">
    <div class="copy">
      <div class="header">
        <img src="${logoSrc}" alt="IMC" style="height:60px;width:auto;">
        <div class="header-info" style="text-align:right;">
          Av. Mariana de Jesús OE702 y Nuño de Valderrama,<br>
          Edificio Citimed, 3er Piso, Consultorio 313.<br>
          <strong>Correo:</strong> gmediqceo@gmail.com<br>
          <strong>Telef.:</strong> 0984075703
        </div>
      </div>
      ${recetaIzq}
    </div>
    <div class="copy">
      <div class="header">
        <img src="${logoSrc}" alt="IMC" style="height:60px;width:auto;">
        <div class="header-info" style="text-align:right;">
          Av. Mariana de Jesús OE702 y Nuño de Valderrama,<br>
          Edificio Citimed, 3er Piso, Consultorio 313.<br>
          <strong>Correo:</strong> gmediqceo@gmail.com<br>
          <strong>Telef.:</strong> 0984075703
        </div>
      </div>
      ${recetaDer}
    </div>
  </div>""",
1),

("Impresión horizontal (A4 landscape)",
"    .page{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:760px;margin:0 auto;}",
"""    .page{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:1050px;margin:0 auto;}
    @page{size:A4 landscape;margin:8mm;}
    @media print{.page{max-width:100%;gap:12px;}}""",
1),
]

# ── Verificación previa ─────────────────────────────────────────
for desc, viejo, _, esperado in REEMPLAZOS:
    n = texto.count(viejo)
    if n != esperado:
        sys.exit(f"❌ ABORTADO en '{desc}': la cadena aparece {n} veces (se esperaban {esperado}).")
print(f"✓ Verificación previa OK — {len(REEMPLAZOS)} anclas con los conteos esperados")

# ── Respaldo + aplicación ───────────────────────────────────────
shutil.copy2(ruta, ruta + ".bak_receta")
for desc, viejo, nuevo, _ in REEMPLAZOS:
    texto = texto.replace(viejo, nuevo)
    print(f"✓ {desc}")
with open(ruta, "w", encoding="utf-8") as f:
    f.write(texto)

# ── Verificación final ──────────────────────────────────────────
with open(ruta, encoding="utf-8") as f:
    t = f.read()
errores = 0
for clave in ["numeroALetras", "recetaIzq", "recetaDer", "A4 landscape", "Cantidad a entregar"]:
    if clave not in t:
        print(f"❌ Falta '{clave}' en el resultado"); errores += 1
for prohibido in ["recetaBody", "(UN0)"]:
    if prohibido in t:
        print(f"❌ Todavía existe '{prohibido}' (debería haber desaparecido)"); errores += 1
if errores == 0:
    print(f"\n✅ Receta MSP rediseñada (respaldo: ConsultaMedica.js.bak_receta). ./deploy.sh cuando quieras")
