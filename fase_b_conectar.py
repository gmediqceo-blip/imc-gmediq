#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FASE B - PASO 3: Conectar el módulo de cosmetología
Cambios quirúrgicos en: PacienteDetalle.js y ConsultaMedica.js
- Pestaña 💆 Cosmetología (solo cosmetologa, admin, secretaria)
- Sesiones integradas en el Historial unificado (visible para todo el equipo)
Con assertions y respaldo automático (.bak_fase_b)
"""
import os, sys, shutil

RAIZ = os.path.expanduser("~/Desktop/imc-app/src")

def encontrar(nombre):
    for carpeta, _, archivos in os.walk(RAIZ):
        if nombre in archivos:
            return os.path.join(carpeta, nombre)
    sys.exit(f"❌ No encontré {nombre} dentro de {RAIZ}")

# ── Verificar que TabCosmetologia.js esté en su lugar ───────────
tab_cosm = None
for carpeta, _, archivos in os.walk(RAIZ):
    if "TabCosmetologia.js" in archivos:
        tab_cosm = os.path.join(carpeta, "TabCosmetologia.js")
if not tab_cosm:
    sys.exit("❌ ABORTADO: TabCosmetologia.js no está en src/. Cópialo a src/components/ primero.")
print(f"✓ TabCosmetologia.js encontrado en: {tab_cosm}")

CAMBIOS = {
    "PacienteDetalle.js": [
        # 1. Import del nuevo componente
        (
            "import EvolucionAntropometrica from './EvolucionAntropometrica';",
            "import EvolucionAntropometrica from './EvolucionAntropometrica';\nimport TabCosmetologia from './TabCosmetologia';"
        ),
        # 2. Estado para las sesiones
        (
            "  const [ejercicios, setEjercicios] = useState([]);",
            "  const [ejercicios, setEjercicios] = useState([]);\n  const [sesionesCosm, setSesionesCosm] = useState([]);"
        ),
        # 3. Destructuring del Promise.all
        (
            "    const [pacFull, v, m, n, pl, ej] = await Promise.all([",
            "    const [pacFull, v, m, n, pl, ej, cosm] = await Promise.all(["
        ),
        # 4. Query de sesiones de cosmetología
        (
            "      supabase.from('ejercicios').select('*').eq('activo', true).order('categoria').order('nombre'),\n    ]);",
            "      supabase.from('ejercicios').select('*').eq('activo', true).order('categoria').order('nombre'),\n      supabase.from('sesiones_cosmetologia').select('*, tratamientos_cosmetologia(nombre, icono)').eq('paciente_id', paciente.id).order('fecha', { ascending: false }),\n    ]);"
        ),
        # 5. Setter
        (
            "    setEjercicios(ej.data || []);",
            "    setEjercicios(ej.data || []);\n    setSesionesCosm(cosm.data || []);"
        ),
        # 6. Pestaña nueva (solo cosmetologa, admin, secretaria)
        (
            "    { key: 'ejercicio', label: '🏋️ Plan ejercicio', roles: ['admin','secretaria','fisioterapeuta'] },",
            "    { key: 'ejercicio', label: '🏋️ Plan ejercicio', roles: ['admin','secretaria','fisioterapeuta'] },\n    { key: 'cosmetologia', label: '💆 Cosmetología', roles: ['admin','secretaria','cosmetologa'] },"
        ),
        # 7. Pasar sesiones al Historial unificado
        (
            "          <HistorialUnificado\n            valoraciones={valoraciones}\n            consultasMed={consultasMed}\n            consultasNut={consultasNut}\n            planes={planes}\n          />",
            "          <HistorialUnificado\n            valoraciones={valoraciones}\n            consultasMed={consultasMed}\n            consultasNut={consultasNut}\n            planes={planes}\n            sesionesCosm={sesionesCosm}\n          />"
        ),
        # 8. Render de la pestaña
        (
            "        {/* ARCHIVOS */}",
            "        {/* COSMETOLOGÍA */}\n        {tab === 'cosmetologia' && (\n          <TabCosmetologia paciente={paciente} usuario={usuario} />\n        )}\n\n        {/* ARCHIVOS */}"
        ),
    ],
    "ConsultaMedica.js": [
        # 9. Firma de HistorialUnificado acepta las sesiones
        (
            "export function HistorialUnificado({ valoraciones, consultasMed, consultasNut, planes }) {",
            "export function HistorialUnificado({ valoraciones, consultasMed, consultasNut, planes, sesionesCosm = [] }) {"
        ),
        # 10. Sesiones como eventos del timeline (color dorado IMC)
        (
            "      color: '#0B1F3B', icon: '🏋️', data: p })),\n  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));",
            "      color: '#0B1F3B', icon: '🏋️', data: p })),\n"
            "    ...sesionesCosm.map(s => ({ tipo: 'cosmetologia', fecha: s.fecha,\n"
            "      titulo: `Cosmetología · ${s.tratamientos_cosmetologia?.nombre || 'Tratamiento'}`,\n"
            "      sub: `${s.zona_tratada ? s.zona_tratada : ''}${s.duracion_min ? ' · ' + s.duracion_min + ' min' : ''}${s.sesion_numero && s.sesiones_paquete ? ' · Sesión ' + s.sesion_numero + '/' + s.sesiones_paquete : ''}`,\n"
            "      color: '#C9A86A', icon: '💆', data: s })),\n"
            "  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));"
        ),
        # 11. Detalle expandible de la sesión
        (
            "                  {/* MÉDICO */}",
            "                  {/* COSMETOLOGÍA */}\n"
            "                  {ev.tipo === 'cosmetologia' && (\n"
            "                    <div>\n"
            "                      {ev.data.zona_tratada && <p style={{ fontSize: 12, color: '#0B1F3B', marginBottom: 6 }}><strong>Zona tratada:</strong> {ev.data.zona_tratada}</p>}\n"
            "                      {ev.data.parametros && <p style={{ fontSize: 12, color: '#0B1F3B', marginBottom: 6 }}><strong>Parámetros del equipo:</strong> {ev.data.parametros}</p>}\n"
            "                      {ev.data.duracion_min && <p style={{ fontSize: 12, color: '#0B1F3B', marginBottom: 6 }}><strong>Duración:</strong> {ev.data.duracion_min} min</p>}\n"
            "                      {ev.data.sesion_numero && ev.data.sesiones_paquete && <p style={{ fontSize: 12, color: '#C9A86A', fontWeight: 700, marginBottom: 6 }}>Sesión {ev.data.sesion_numero} de {ev.data.sesiones_paquete} del paquete</p>}\n"
            "                      {ev.data.observaciones && <p style={{ fontSize: 12, color: '#6E6E70', margin: 0, fontStyle: 'italic' }}>📝 {ev.data.observaciones}</p>}\n"
            "                    </div>\n"
            "                  )}\n\n"
            "                  {/* MÉDICO */}"
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
            sys.exit(f"❌ ABORTADO: en {nombre} una cadena esperada aparece {n} veces (debe ser 1):\n{viejo[:90]}...")
    rutas[nombre], contenidos[nombre] = ruta, texto
print("✓ Verificación previa OK — las 11 cadenas coinciden exactamente")

# ── Respaldo + aplicación ───────────────────────────────────────
for nombre, reemplazos in CAMBIOS.items():
    shutil.copy2(rutas[nombre], rutas[nombre] + ".bak_fase_b")
    texto = contenidos[nombre]
    for viejo, nuevo in reemplazos:
        texto = texto.replace(viejo, nuevo)
    with open(rutas[nombre], "w", encoding="utf-8") as f:
        f.write(texto)
    print(f"✓ {nombre} modificado ({len(reemplazos)} cambio(s)) — respaldo: {nombre}.bak_fase_b")

# ── Verificación final ──────────────────────────────────────────
errores = 0
with open(rutas["PacienteDetalle.js"], encoding="utf-8") as f:
    pd = f.read()
for clave in ["import TabCosmetologia", "key: 'cosmetologia'", "sesionesCosm={sesionesCosm}", "tab === 'cosmetologia'"]:
    if clave not in pd:
        print(f"❌ PacienteDetalle.js: falta '{clave}'"); errores += 1
with open(rutas["ConsultaMedica.js"], encoding="utf-8") as f:
    cm = f.read()
for clave in ["sesionesCosm = []", "tipo: 'cosmetologia'", "ev.tipo === 'cosmetologia'"]:
    if clave not in cm:
        print(f"❌ ConsultaMedica.js: falta '{clave}'"); errores += 1

if errores == 0:
    print("\n✅ FASE B conectada. Prueba local con npm start y luego ./deploy.sh")
