#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MEJORA UX - Consulta médica en pestaña navegable
1. El formulario de Nueva Consulta deja de ser pantalla completa
2. La pestaña Médico queda siempre montada (oculta) para no perder
   el borrador al ir a Historial o Parámetros y volver
Con assertions y respaldo automático (.bak_inline)
"""
import os, sys, shutil

RAIZ = os.path.expanduser("~/Desktop/imc-app/src")

def encontrar(nombre):
    for carpeta, _, archivos in os.walk(RAIZ):
        if nombre in archivos:
            return os.path.join(carpeta, nombre)
    sys.exit(f"❌ No encontré {nombre} dentro de {RAIZ}")

CAMBIOS = {
    "ConsultaMedica.js": [
        # 1. El formulario deja el modo pantalla completa y pasa a tarjeta inline
        (
            "    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.82)', display: 'flex', alignItems: 'stretch', zIndex: 1000 }}>\n"
            "      <div style={{ background: B.grayLt, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>",
            "    <div style={{ display: 'flex', alignItems: 'stretch' }}>\n"
            "      <div style={{ background: B.grayLt, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 12, border: `1.5px solid ${B.grayMd}` }}>"
        ),
    ],
    "PacienteDetalle.js": [
        # 2. Pestaña Médico siempre montada (oculta cuando no está activa)
        #    para conservar el borrador de la consulta al cambiar de pestaña
        (
            "        {/* MÉDICO */}\n"
            "        {tab === 'medico' && (\n"
            "          <ConsultaMedica\n"
            "            paciente={paciente}\n"
            "            consultas={consultasMed}\n"
            "            onActualizar={fetchTodo}\n"
            "            usuario={usuario}\n"
            "          />\n"
            "        )}",
            "        {/* MÉDICO — siempre montado para conservar el borrador al navegar entre pestañas */}\n"
            "        {tabs.some(t => t.key === 'medico') && (\n"
            "          <div style={{ display: tab === 'medico' ? 'block' : 'none' }}>\n"
            "            <ConsultaMedica\n"
            "              paciente={paciente}\n"
            "              consultas={consultasMed}\n"
            "              onActualizar={fetchTodo}\n"
            "              usuario={usuario}\n"
            "            />\n"
            "          </div>\n"
            "        )}"
        ),
    ],
}

# ── Verificación previa ─────────────────────────────────────────
rutas, contenidos = {}, {}
for nombre, reemplazos in CAMBIOS.items():
    ruta = encontrar(nombre)
    with open(ruta, encoding="utf-8") as f:
        texto = f.read()
    for viejo, _ in reemplazos:
        n = texto.count(viejo)
        if n != 1:
            sys.exit(f"❌ ABORTADO: en {nombre} la cadena esperada aparece {n} veces (debe ser 1):\n{viejo[:90]}...")
    rutas[nombre], contenidos[nombre] = ruta, texto
print("✓ Verificación previa OK — las 2 cadenas coinciden exactamente")

# ── Respaldo + aplicación ───────────────────────────────────────
for nombre, reemplazos in CAMBIOS.items():
    shutil.copy2(rutas[nombre], rutas[nombre] + ".bak_inline")
    texto = contenidos[nombre]
    for viejo, nuevo in reemplazos:
        texto = texto.replace(viejo, nuevo)
    with open(rutas[nombre], "w", encoding="utf-8") as f:
        f.write(texto)
    print(f"✓ {nombre} modificado — respaldo: {nombre}.bak_inline")

# ── Verificación final ──────────────────────────────────────────
with open(rutas["PacienteDetalle.js"], encoding="utf-8") as f:
    pd = f.read()
with open(rutas["ConsultaMedica.js"], encoding="utf-8") as f:
    cm = f.read()
errores = 0
if "tab === 'medico' ? 'block' : 'none'" not in pd:
    print("❌ PacienteDetalle.js: falta el montaje persistente"); errores += 1
if "position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.82)'" in cm:
    print("❌ ConsultaMedica.js: el formulario sigue en pantalla completa"); errores += 1
if errores == 0:
    print("\n✅ Consulta médica ahora navegable por pestañas. ./deploy.sh cuando quieras")
