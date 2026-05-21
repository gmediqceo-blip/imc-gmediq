// ════════════════════════════════════════════════════════════════════════
// GestionPlantillas.js — Catálogo de plantillas nutricionales
//
// Muestra todas las plantillas con filtros por grupo (A/B) y permite:
// - Ver detalles
// - Aplicar a un paciente (callback onAplicar)
// - Editar (próximamente)
// - Crear nueva (próximamente)
//
// Props:
//   - usuario: el usuario logueado
//   - onVolver: callback para volver al tab principal
//   - onAplicar: callback al aplicar plantilla (recibe plantillaId)
// ════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
  amber: '#F59E0B', purple: '#7C3AED',
  softGreen: '#E6F5EE', softBlue: '#E8F2FA', softOrange: '#FFF0E0',
};

const TIEMPOS_LABEL = {
  desayuno: '🌅 Desayuno',
  lunch_am: '🍎 Lunch AM',
  almuerzo: '🍽️ Almuerzo',
  lunch_pm: '🥜 Lunch PM',
  merienda: '🌙 Merienda',
};

export default function GestionPlantillas({ usuario, onVolver, onAplicar }) {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroGrupo, setFiltroGrupo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState(null);
  
  useEffect(() => { cargar(); }, []);
  
  const cargar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('plantillas_nutricion')
      .select('*')
      .eq('activa', true)
      .order('grupo_nutricional')
      .order('nombre');
    setPlantillas(data || []);
    setLoading(false);
  };

  const filtradas = plantillas.filter(p => {
    if (filtroGrupo !== 'todos' && p.grupo_nutricional !== filtroGrupo) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const txt = `${p.nombre} ${p.descripcion || ''} ${p.tipo_tratamiento || ''}`.toLowerCase();
      if (!txt.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: plantillas.length,
    grupoA: plantillas.filter(p => p.grupo_nutricional === 'A').length,
    grupoB: plantillas.filter(p => p.grupo_nutricional === 'B').length,
  };

  return (
    <div style={{ padding: 20 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onVolver} style={btnBack()}>← Volver</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: B.navy, margin: 0 }}>
            🍱 Plantillas Nutricionales
          </h2>
          <p style={{ fontSize: 12, color: B.gray, margin: '2px 0 0' }}>
            {stats.total} plantillas disponibles para aplicar a tus pacientes
          </p>
        </div>
        <button style={btnPrimary({ opacity: 0.5 })} disabled title="Próximamente">
          + Nueva plantilla
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterChip 
          activa={filtroGrupo === 'todos'} 
          onClick={() => setFiltroGrupo('todos')}
        >
          🔵 Todas ({stats.total})
        </FilterChip>
        <FilterChip 
          activa={filtroGrupo === 'A'} 
          onClick={() => setFiltroGrupo('A')}
          color={B.orange}
        >
          🟠 Grupo A · Bariátrico ({stats.grupoA})
        </FilterChip>
        <FilterChip 
          activa={filtroGrupo === 'B'} 
          onClick={() => setFiltroGrupo('B')}
          color={B.green}
        >
          🟢 Grupo B · Conservador ({stats.grupoB})
        </FilterChip>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar plantilla..."
          style={{
            flex: 1,
            minWidth: 200,
            padding: '8px 14px',
            border: `1px solid ${B.grayMd}`,
            borderRadius: 20,
            fontSize: 12,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Grid de plantillas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: B.gray }}>
          Cargando plantillas...
        </div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: B.gray }}>
          No hay plantillas con esos filtros.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {filtradas.map(p => (
            <PlantillaCard 
              key={p.id} 
              plantilla={p}
              onVer={() => setDetalle(p)}
              onAplicar={() => onAplicar(p.id)}
            />
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      {detalle && (
        <ModalDetallePlantilla 
          plantilla={detalle}
          onClose={() => setDetalle(null)}
          onAplicar={() => { onAplicar(detalle.id); setDetalle(null); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: Tarjeta de plantilla
// ─────────────────────────────────────────────────────────────────────────
function PlantillaCard({ plantilla, onVer, onAplicar }) {
  const esBariatrico = plantilla.grupo_nutricional === 'A';
  const esBariFase = plantilla.fase_postop;
  const esDiabetes = plantilla.tipo_tratamiento === 'diabetes';
  const esGLP1 = plantilla.tipo_tratamiento === 'farmacologico';
  
  let gradient = `linear-gradient(135deg, ${B.green}, #0F5734)`;
  let icono = '🥗';
  let tagText = 'Grupo B';
  let tagColor = B.green;
  
  if (esBariatrico) {
    gradient = `linear-gradient(135deg, ${B.orange}, #8B3A00)`;
    icono = esBariFase === 3 ? '🥄' : esBariFase === 4 ? '🍲' : '🟠';
    tagText = `Grupo A · Fase ${esBariFase || '—'}`;
    tagColor = B.orange;
  }
  if (esGLP1) {
    gradient = `linear-gradient(135deg, ${B.purple}, #4C1D95)`;
    icono = '💊';
    tagText = 'Grupo A · GLP-1';
    tagColor = B.purple;
  }
  if (esDiabetes) {
    gradient = `linear-gradient(135deg, ${B.red}, #7F1D1D)`;
    icono = '💉';
    tagText = 'Grupo B · DM2';
    tagColor = B.red;
  }
  
  return (
    <div style={{
      background: 'white',
      border: `1px solid ${B.grayMd}`,
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'all 0.2s',
      cursor: 'pointer',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    onClick={onVer}
    >
      {/* Imagen de portada */}
      <div style={{
        height: 100,
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 38,
        color: 'white',
        position: 'relative',
      }}>
        {icono}
        <span style={{
          position: 'absolute',
          top: 8, right: 8,
          background: 'rgba(255,255,255,0.95)',
          color: B.navy,
          padding: '3px 8px',
          borderRadius: 10,
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}>
          {tagText}
        </span>
      </div>
      
      {/* Body */}
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: B.navy, marginBottom: 4 }}>
          {plantilla.nombre}
        </div>
        {plantilla.descripcion && (
          <div style={{ fontSize: 11, color: B.gray, lineHeight: 1.4, marginBottom: 10, minHeight: 32 }}>
            {plantilla.descripcion.length > 90 
              ? plantilla.descripcion.substring(0, 90) + '...'
              : plantilla.descripcion}
          </div>
        )}
        
        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: B.gray,
          borderTop: `1px solid ${B.grayLt}`,
          paddingTop: 10,
        }}>
          <span><strong style={{ color: B.navy }}>{plantilla.kcal_objetivo || '—'}</strong> kcal</span>
          <span><strong style={{ color: B.navy }}>{plantilla.proteina_objetivo_g || '—'}g</strong> prot</span>
          <span><strong style={{ color: B.navy }}>5</strong> tiempos</span>
        </div>
        
        {/* Acciones */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onVer(); }}
            style={btnTiny()}
          >
            👁️ Ver
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onAplicar(); }}
            style={{...btnTiny(), background: B.green, color: 'white', borderColor: B.green }}
          >
            ✓ Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MODAL: Detalle de plantilla
// ─────────────────────────────────────────────────────────────────────────
function ModalDetallePlantilla({ plantilla, onClose, onAplicar }) {
  const [tiempos, setTiempos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    supabase.from('plantilla_tiempos')
      .select('*, smae_categorias(nombre, emoji)')
      .eq('plantilla_id', plantilla.id)
      .then(({ data }) => {
        setTiempos(data || []);
        setLoading(false);
      });
  }, [plantilla.id]);
  
  // Agrupar por tiempo
  const porTiempo = {};
  tiempos.forEach(t => {
    if (!porTiempo[t.tiempo]) porTiempo[t.tiempo] = [];
    porTiempo[t.tiempo].push(t);
  });
  
  return (
    <div style={modalBg()} onClick={onClose}>
      <div style={modalCard(640)} onClick={e => e.stopPropagation()}>
        <div style={modalHeader()}>
          <div>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>
              {plantilla.nombre}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>
              {plantilla.grupo_nutricional === 'A' ? '🟠 Grupo A' : '🟢 Grupo B'} · {plantilla.kcal_objetivo} kcal · {plantilla.proteina_objetivo_g}g proteína
            </div>
          </div>
          <button onClick={onClose} style={btnClose()}>✕</button>
        </div>
        
        <div style={{ padding: 24 }}>
          {plantilla.descripcion && (
            <p style={{ fontSize: 13, color: B.gray, marginBottom: 16, lineHeight: 1.5 }}>
              {plantilla.descripcion}
            </p>
          )}
          
          {plantilla.recomendaciones && (
            <div style={{ background: B.softBlue, borderLeft: `4px solid ${B.blue}`, padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <strong style={{ color: B.blue, fontSize: 12 }}>📋 Recomendaciones:</strong>
              <p style={{ marginTop: 4, color: B.navy, fontSize: 12 }}>{plantilla.recomendaciones}</p>
            </div>
          )}
          
          {plantilla.suplementacion && (
            <div style={{ background: B.softOrange, borderLeft: `4px solid ${B.orange}`, padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <strong style={{ color: B.orange, fontSize: 12 }}>💊 Suplementación:</strong>
              <p style={{ marginTop: 4, color: B.navy, fontSize: 12 }}>{plantilla.suplementacion}</p>
            </div>
          )}
          
          <h4 style={{ fontSize: 12, color: B.navy, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            🍽️ Distribución por tiempo de comida
          </h4>
          
          {loading ? (
            <div style={{ color: B.gray, fontSize: 13 }}>Cargando distribución...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['desayuno','lunch_am','almuerzo','lunch_pm','merienda'].map(t => (
                <div key={t} style={{
                  background: B.grayLt,
                  padding: '10px 12px',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: B.navy, minWidth: 110 }}>
                    {TIEMPOS_LABEL[t]}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                    {(porTiempo[t] || []).map(item => (
                      <span key={item.id} style={{
                        background: 'white',
                        border: `1px solid ${B.grayMd}`,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        color: B.navy,
                        fontWeight: 600,
                      }}>
                        {item.smae_categorias?.emoji} {item.equivalentes} eq
                      </span>
                    ))}
                    {!porTiempo[t]?.length && (
                      <span style={{ fontSize: 11, color: B.gray, fontStyle: 'italic' }}>
                        Sin asignaciones
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={onClose} style={btnSecondaryDark()}>Cerrar</button>
            <button onClick={onAplicar} style={btnPrimaryGreen()}>✓ Aplicar a este paciente</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HELPERS DE UI
// ─────────────────────────────────────────────────────────────────────────
const FilterChip = ({ activa, onClick, color = B.blue, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '7px 14px',
      background: activa ? color : 'white',
      color: activa ? 'white' : B.gray,
      border: `1.5px solid ${activa ? color : B.grayMd}`,
      borderRadius: 18,
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'inherit',
    }}
  >
    {children}
  </button>
);

const btnBack = () => ({
  padding: '8px 14px',
  background: B.white,
  color: B.navy,
  border: `1.5px solid ${B.grayMd}`,
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const btnPrimary = (extra) => ({
  padding: '9px 16px',
  background: B.green,
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  ...extra,
});

const btnTiny = () => ({
  flex: 1,
  padding: '6px 8px',
  background: B.grayLt,
  border: `1px solid ${B.grayMd}`,
  borderRadius: 6,
  fontSize: 11,
  color: B.navy,
  cursor: 'pointer',
  fontWeight: 600,
  fontFamily: 'inherit',
});

const btnSecondaryDark = () => ({
  padding: '9px 18px',
  background: 'transparent',
  color: B.gray,
  border: `2px solid ${B.grayMd}`,
  borderRadius: 7,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const btnPrimaryGreen = () => ({
  padding: '9px 18px',
  background: B.green,
  color: 'white',
  border: 'none',
  borderRadius: 7,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const modalBg = () => ({
  position: 'fixed', inset: 0,
  background: 'rgba(11,31,59,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000, padding: 20,
});

const modalCard = (width) => ({
  background: 'white',
  borderRadius: 16,
  width: '100%',
  maxWidth: width,
  maxHeight: '92vh',
  overflow: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
});

const modalHeader = () => ({
  background: `linear-gradient(135deg, ${B.green}, #0F5734)`,
  padding: '16px 24px',
  borderRadius: '16px 16px 0 0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky', top: 0, zIndex: 10,
});

const btnClose = () => ({
  background: 'none', border: 'none',
  color: 'white', fontSize: 22,
  cursor: 'pointer', lineHeight: 1, padding: 4,
});
