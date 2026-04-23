import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const B = {
  navy: '#0B1F3B', blue: '#1E7CB5', teal: '#4B647A', gray: '#6E6E70',
  grayLt: '#F4F6F8', grayMd: '#DDE3EA', white: '#FFFFFF',
  green: '#1A7A4A', red: '#B02020', orange: '#C25A00',
};

const CATEGORIAS = {
  laboratorio: { label: 'Laboratorio', icon: '🧪', color: B.blue },
  imagen: { label: 'Imagen médica', icon: '🩻', color: B.teal },
  radiografia: { label: 'Radiografía', icon: '📡', color: B.navy },
  ecografia: { label: 'Ecografía', icon: '🔊', color: '#7B2D8B' },
  foto_progreso: { label: 'Foto de progreso', icon: '📸', color: B.green },
  documento: { label: 'Documento', icon: '📄', color: B.orange },
  otro: { label: 'Otro', icon: '📁', color: B.gray },
};

const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtSize = bytes => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function BancoArchivos({ paciente, usuario }) {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filtrocat, setFiltrocat] = useState('all');
  const [toast, setToast] = useState(null);
  const [visor, setVisor] = useState(null); // archivo a visualizar
  const [form, setForm] = useState({
    nombre: '', descripcion: '', categoria: 'laboratorio',
    fecha: new Date().toISOString().split('T')[0], archivo: null,
  });

  const showToast = (msg, color = B.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { fetchArchivos(); }, [paciente.id]);

  const fetchArchivos = async () => {
    const { data } = await supabase
      .from('archivos_paciente')
      .select('*')
      .eq('paciente_id', paciente.id)
      .order('fecha', { ascending: false });
    setArchivos(data || []);
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Auto-fill nombre if empty
    if (!form.nombre) {
      setForm(p => ({ ...p, archivo: file, nombre: file.name.replace(/\.[^.]+$/, '') }));
    } else {
      setForm(p => ({ ...p, archivo: file }));
    }
  };

  const subirArchivo = async () => {
    if (!form.archivo) { showToast('Selecciona un archivo', B.orange); return; }
    if (!form.nombre.trim()) { showToast('Ingresa un nombre', B.orange); return; }

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const ext = form.archivo.name.split('.').pop();
      const fileName = `${paciente.id}/${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('expedientes')
        .upload(fileName, form.archivo, { cacheControl: '3600', upsert: false });

      if (uploadError) { showToast('Error al subir archivo: ' + uploadError.message, B.red); setUploading(false); return; }

      // Get public URL
      const { data: urlData } = supabase.storage.from('expedientes').getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase.from('archivos_paciente').insert([{
        paciente_id: paciente.id,
        nombre: form.nombre,
        descripcion: form.descripcion,
        categoria: form.categoria,
        fecha: form.fecha,
        archivo_url: uploadData.path,
        archivo_nombre: form.archivo.name,
        archivo_tipo: form.archivo.type,
        archivo_tamanio: form.archivo.size,
        subido_por: usuario?.id,
      }]);

      if (dbError) { showToast('Error al guardar: ' + dbError.message, B.red); setUploading(false); return; }

      await fetchArchivos();
      setForm({ nombre: '', descripcion: '', categoria: 'laboratorio', fecha: new Date().toISOString().split('T')[0], archivo: null });
      // Reset file input
      document.getElementById('file-input').value = '';
      showToast('Archivo subido correctamente ✓');
    } catch (err) {
      showToast('Error inesperado: ' + err.message, B.red);
    }
    setUploading(false);
  };

  const verArchivo = async (archivo) => {
    const { data } = await supabase.storage.from('expedientes').createSignedUrl(archivo.archivo_url, 3600);
    if (data?.signedUrl) {
      setVisor({ ...archivo, signedUrl: data.signedUrl });
    }
  };

  const descargarArchivo = async (archivo) => {
    const { data } = await supabase.storage.from('expedientes').createSignedUrl(archivo.archivo_url, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = archivo.archivo_nombre || archivo.nombre;
      a.click();
    }
  };

  const eliminarArchivo = async (archivo) => {
    if (!window.confirm(`¿Eliminar "${archivo.nombre}"? Esta acción no se puede deshacer.`)) return;
    await supabase.storage.from('expedientes').remove([archivo.archivo_url]);
    await supabase.from('archivos_paciente').delete().eq('id', archivo.id);
    await fetchArchivos();
    showToast('Archivo eliminado', B.red);
  };

  const filtrados = archivos.filter(a => filtrocat === 'all' || a.categoria === filtrocat);

  const isImage = (tipo) => tipo && tipo.startsWith('image/');
  const isPDF = (tipo) => tipo === 'application/pdf';

  return (
    <div>
      {/* Formulario de subida */}
      <div style={{ background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}`, padding: '20px 22px', marginBottom: 20 }}>
        <p style={{ fontWeight: 800, fontSize: 12, color: B.navy, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px' }}>
          ⬆ Subir archivo al expediente
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 4%' }}>
          {/* Nombre */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Nombre del archivo *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Laboratorio enero 2026"
              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          {/* Fecha */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Fecha</label>
            <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          {/* Categoría */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Categoría</label>
            <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}>
              {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          {/* Descripción */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Descripción (opcional)</label>
            <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Ej: Glucosa en ayunas, panel lipídico"
              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${B.grayMd}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
        </div>
        {/* File input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Archivo (PDF, JPG, PNG) *</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: B.grayLt, border: `1.5px solid ${B.grayMd}`, borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: B.navy }}>
              📎 Elegir archivo
              <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            {form.archivo && (
              <div style={{ flex: 1, background: B.grayLt, borderRadius: 7, padding: '8px 12px', fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: B.navy }}>{form.archivo.name}</span>
                <span style={{ color: B.gray, marginLeft: 8 }}>{fmtSize(form.archivo.size)}</span>
              </div>
            )}
          </div>
          <p style={{ fontSize: 10, color: B.gray, margin: '4px 0 0' }}>Máximo 10MB · PDF, JPG, PNG</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={subirArchivo} disabled={uploading}
            style={{ padding: '10px 24px', background: uploading ? '#9AA5B1' : B.blue, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {uploading ? '⏳ Subiendo...' : '⬆ Subir archivo'}
          </button>
        </div>
      </div>

      {/* Filtros y lista */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: B.teal, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
          {archivos.length} archivo{archivos.length !== 1 ? 's' : ''} en el expediente
        </p>
        <select value={filtrocat} onChange={e => setFiltrocat(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 7, border: `1.5px solid ${B.grayMd}`, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
          <option value="all">Todas las categorías</option>
          {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: B.gray, padding: 40 }}>Cargando archivos...</p>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}` }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>📁</p>
          <p style={{ color: B.gray }}>{archivos.length === 0 ? 'No hay archivos en el expediente.' : 'Sin archivos para esta categoría.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
          {filtrados.map(a => {
            const cat = CATEGORIAS[a.categoria] || CATEGORIAS.otro;
            const esImagen = isImage(a.archivo_tipo);
            const esPDF = isPDF(a.archivo_tipo);
            return (
              <div key={a.id} style={{ background: B.white, borderRadius: 12, border: `1.5px solid ${B.grayMd}`, overflow: 'hidden', borderTop: `3px solid ${cat.color}` }}>
                {/* Preview area */}
                <div style={{ height: 100, background: B.grayLt, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => verArchivo(a)}>
                  {esPDF ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 40 }}>📄</div>
                      <p style={{ fontSize: 10, color: B.teal, margin: '4px 0 0', fontWeight: 600 }}>PDF</p>
                    </div>
                  ) : esImagen ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 40 }}>🖼</div>
                      <p style={{ fontSize: 10, color: B.teal, margin: '4px 0 0', fontWeight: 600 }}>Imagen</p>
                    </div>
                  ) : (
                    <div style={{ fontSize: 40 }}>{cat.icon}</div>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: B.navy, margin: 0, flex: 1, marginRight: 8 }}>{a.nombre}</p>
                    <span style={{ background: cat.color + '22', color: cat.color, padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{cat.icon}</span>
                  </div>
                  {a.descripcion && <p style={{ fontSize: 11, color: B.gray, margin: '0 0 4px', lineHeight: 1.4 }}>{a.descripcion}</p>}
                  <p style={{ fontSize: 10, color: B.teal, margin: '0 0 10px' }}>{fmtDate(a.fecha)} · {fmtSize(a.archivo_tamanio)}</p>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => verArchivo(a)}
                      style={{ flex: 1, padding: '6px 0', background: B.blue + '11', color: B.blue, border: `1px solid ${B.blue}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      👁 Ver
                    </button>
                    <button onClick={() => descargarArchivo(a)}
                      style={{ flex: 1, padding: '6px 0', background: B.green + '11', color: B.green, border: `1px solid ${B.green}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ⬇ Bajar
                    </button>
                    <button onClick={() => eliminarArchivo(a)}
                      style={{ padding: '6px 10px', background: B.red + '11', color: B.red, border: `1px solid ${B.red}33`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visor de archivos */}
      {visor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,59,0.92)', display: 'flex', flexDirection: 'column', zIndex: 2000 }}>
          {/* Header del visor */}
          <div style={{ background: B.navy, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>{visor.nombre}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>{fmtDate(visor.fecha)} · {visor.archivo_nombre}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => descargarArchivo(visor)}
                style={{ padding: '7px 16px', background: B.blue, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                ⬇ Descargar
              </button>
              <button onClick={() => setVisor(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', borderRadius: 6, padding: '4px 12px' }}>✕</button>
            </div>
          </div>
          {/* Contenido */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            {isImage(visor.archivo_tipo) ? (
              <img src={visor.signedUrl} alt={visor.nombre}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
            ) : isPDF(visor.archivo_tipo) ? (
              <iframe src={visor.signedUrl} style={{ width: '100%', height: '100%', minHeight: '70vh', border: 'none', borderRadius: 8 }} title={visor.nombre} />
            ) : (
              <div style={{ textAlign: 'center', color: 'white' }}>
                <p style={{ fontSize: 60, marginBottom: 16 }}>📄</p>
                <p style={{ fontSize: 16, marginBottom: 20 }}>{visor.archivo_nombre}</p>
                <button onClick={() => descargarArchivo(visor)}
                  style={{ padding: '12px 28px', background: B.blue, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ⬇ Descargar archivo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.color, color: 'white', padding: '12px 28px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
