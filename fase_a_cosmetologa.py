#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FASE A - Rol cosmetóloga (agendamiento)
Cambios quirúrgicos en: Usuarios.js, Agenda.js, Dashboard.js
Con assertions y respaldo automático (.bak_fase_a)
"""
import os, sys, shutil

RAIZ = os.path.expanduser("~/Desktop/imc-app/src")
GOLD = "#C9A86A"  # dorado IMC

# ── Localizar archivos ──────────────────────────────────────────
def encontrar(nombre):
    for carpeta, _, archivos in os.walk(RAIZ):
        if nombre in archivos:
            return os.path.join(carpeta, nombre)
    sys.exit(f"❌ No encontré {nombre} dentro de {RAIZ}")

CAMBIOS = {
    "Usuarios.js": [
        (
            "  { value: 'secretaria', label: 'Secretaria / Admin', color: B.orange, icon: '📋' },\n];",
            "  { value: 'secretaria', label: 'Secretaria / Admin', color: B.orange, icon: '📋' },\n"
            f"  {{ value: 'cosmetologa', label: 'Cosmetóloga', color: '{GOLD}', icon: '💆' }},\n];"
        ),
    ],
    "Agenda.js": [
        (
            "const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'secretaria';",
            "const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'secretaria' || usuario?.rol === 'cosmetologa';"
        ),
        (
            "  { value: 'aparatologia', label: 'Aparatología EmZero', color: B.purple, icon: '⚡' },",
            "  { value: 'aparatologia', label: 'Aparatología EmZero', color: B.purple, icon: '⚡' },\n"
            f"  {{ value: 'masaje_tonificante', label: 'Masaje Tonificante', color: '{GOLD}', icon: '💆' }},"
        ),
    ],
    "Dashboard.js": [
        (
            "const rolColor = { admin: B.navy, fisioterapeuta: B.blue, medico: B.teal, nutricionista: B.green };",
            f"const rolColor = {{ admin: B.navy, fisioterapeuta: B.blue, medico: B.teal, nutricionista: B.green, secretaria: B.orange, cosmetologa: '{GOLD}' }};"
        ),
        (
            "const rolLabel = { admin: 'Administrador', fisioterapeuta: 'Fisioterapeuta', medico: 'Médico', nutricionista: 'Nutricionista' };",
            "const rolLabel = { admin: 'Administrador', fisioterapeuta: 'Fisioterapeuta', medico: 'Médico', nutricionista: 'Nutricionista', secretaria: 'Secretaria', cosmetologa: 'Cosmetóloga' };"
        ),
        (
            "  const rolLabels = { admin: 'Administrador', fisioterapeuta: 'Fisioterapeuta', medico: 'Médico', nutricionista: 'Nutricionista', secretaria: 'Secretaria' };",
            "  const rolLabels = { admin: 'Administrador', fisioterapeuta: 'Fisioterapeuta', medico: 'Médico', nutricionista: 'Nutricionista', secretaria: 'Secretaria', cosmetologa: 'Cosmetóloga' };"
        ),
        (
            "  const rolColor2 = { admin: B.navy, fisioterapeuta: B.blue, medico: B.teal, nutricionista: B.green, secretaria: B.orange };",
            f"  const rolColor2 = {{ admin: B.navy, fisioterapeuta: B.blue, medico: B.teal, nutricionista: B.green, secretaria: B.orange, cosmetologa: '{GOLD}' }};"
        ),
    ],
}

# ── Verificación previa (no toca nada si algo falla) ────────────
rutas, contenidos = {}, {}
for nombre, reemplazos in CAMBIOS.items():
    ruta = encontrar(nombre)
    with open(ruta, encoding="utf-8") as f:
        texto = f.read()
    for viejo, _ in reemplazos:
        n = texto.count(viejo)
        if n != 1:
            sys.exit(f"❌ ABORTADO: en {nombre} la cadena esperada aparece {n} veces (debe ser 1):\n{viejo[:80]}...")
    rutas[nombre], contenidos[nombre] = ruta, texto
print("✓ Verificación previa OK — las 6 cadenas coinciden exactamente")

# ── Respaldo + aplicación ───────────────────────────────────────
for nombre, reemplazos in CAMBIOS.items():
    shutil.copy2(rutas[nombre], rutas[nombre] + ".bak_fase_a")
    texto = contenidos[nombre]
    for viejo, nuevo in reemplazos:
        texto = texto.replace(viejo, nuevo)
    with open(rutas[nombre], "w", encoding="utf-8") as f:
        f.write(texto)
    print(f"✓ {nombre} modificado ({len(reemplazos)} cambio(s)) — respaldo: {nombre}.bak_fase_a")

# ── Verificación final ──────────────────────────────────────────
errores = 0
for nombre in CAMBIOS:
    with open(rutas[nombre], encoding="utf-8") as f:
        t = f.read()
    if "cosmetologa" not in t:
        print(f"❌ {nombre}: no contiene 'cosmetologa'"); errores += 1
if errores == 0:
    print("\n✅ FASE A aplicada. Prueba local con npm start y luego ./deploy.sh")
