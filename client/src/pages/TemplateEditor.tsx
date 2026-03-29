import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { API_URL } from '../config';
import { QRCodeSVG } from 'qrcode.react';
import { Save, Upload, ImageIcon, Move, Plus, Trash2, Edit2, Calendar, Ticket, LayoutTemplate, Loader2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import EmptyState from '../components/EmptyState';

interface Template {
  id: string;
  name: string;
  imageUrl: string;
  qrX: number;
  qrY: number;
  qrWidth: number;
  qrHeight: number;
  eventId?: string;
  eventName?: string;
  clientCount?: number;
}

const defaultTemplate: Template = {
  id: '', name: '', imageUrl: '', qrX: 10, qrY: 10, qrWidth: 20, qrHeight: 20
};

const TemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<Template>(defaultTemplate);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [containerDims, setContainerDims] = useState({ w: 0, h: 0 });

  // 🛡️ CARGA ULTRA-RÁPIDA V4.14
  const fetchTemplates = async () => {
    // 1. Cargar metadatos inmediatamente (Compact)
    const data = await fetch(`${API_URL}/api/templates?compact=true`).then(r => r.json());
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);

    // 2. Cargar imágenes en segundo plano
    const fullData = await fetch(`${API_URL}/api/templates`).then(r => r.json());
    if (Array.isArray(fullData)) setTemplates(fullData);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleOpenNew = () => {
    setActiveTemplate({ ...defaultTemplate, id: crypto.randomUUID() });
    setImageLoaded(false);
    setSaveStatus('idle');
    setMessage('');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, t: Template) => {
    e.stopPropagation();
    setActiveTemplate({ ...t });
    setImageLoaded(false);
    setSaveStatus('idle');
    setMessage('');
    setIsEditorOpen(true);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setContainerDims({ w: img.offsetWidth, h: img.offsetHeight });
    setImageLoaded(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Borrar diseño?')) return;
    
    // 🚀 ELIMINACIÓN OPTIMISTA
    const prev = [...templates];
    setTemplates(templates.filter(t => t.id !== id));

    try {
      const res = await fetch(`${API_URL}/api/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch (err) {
      alert('Error al eliminar');
      setTemplates(prev);
    }
  };

  const compress = (b64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = b64;
      img.onload = () => {
        const MAX = 1200;
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleSave = async () => {
    if (!activeTemplate.name || !activeTemplate.name.trim()) {
      alert('Nombre obligatorio'); return;
    }
    if (!activeTemplate.imageUrl) {
      alert('Imagen obligatoria'); return;
    }

    setLoading(true);
    const isExisting = templates.some(t => t.id === activeTemplate.id);
    const method = isExisting ? 'PUT' : 'POST';
    const url = isExisting ? `${API_URL}/api/templates/${activeTemplate.id}` : `${API_URL}/api/templates`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeTemplate, name: activeTemplate.name.trim() })
      });
      if (res.ok) {
        setIsEditorOpen(false);
        await fetchTemplates();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (e: any) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const original = ev.target?.result as string;
      const optimized = await compress(original);
      setActiveTemplate(prev => ({ ...prev, imageUrl: optimized }));
      setImageLoaded(false);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Diseños de Boletas</h1>
          <p style={{ color: '#6b7280', fontWeight: 500 }}>Administra los diseños visuales.</p>
        </div>
        <Button onClick={handleOpenNew}><Plus size={18} /> Nueva Boleta</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {loading && templates.length === 0 ? (
          // 💀 SKELETON UI V4.14
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '350px', borderRadius: '1.25rem' }} />
          ))
        ) : templates.length === 0 ? (
          <EmptyState icon={LayoutTemplate} title="Sin Diseños" description="Crea plantillas personalizadas." action={{ label: "Crear Diseño", onClick: handleOpenNew }} />
        ) : (
          templates.map(t => (
            <div key={t.id} className="card" style={{ padding: '0.75rem' }}>
              <div style={{ width: '100%', aspectRatio: '1/1.4', background: '#f3f4f6', borderRadius: '1rem', overflow: 'hidden', position: 'relative', marginBottom: '1rem' }}>
                {t.imageUrl ? (
                  <img src={t.imageUrl} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="skeleton" style={{ width: '100%', height: '100%' }} />
                )}
              </div>
              
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.5rem' }}>{t.name}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 800 }}>
                  <Calendar size={14} /> {t.eventName || 'Borrador'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontSize: '0.8rem', fontWeight: 800 }}>
                  <Ticket size={14} /> {t.clientCount || 0} boletas
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost" onClick={(e) => handleOpenEdit(e, t)} style={{ flex: 1, height: '2.5rem', fontWeight: 800 }}><Edit2 size={14} /> Editar</button>
                <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} style={{ width: '40px', padding: 0, color: '#dc2626', background: '#fef2f2', border: 'none' }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={activeTemplate.id && templates.some(t => t.id === activeTemplate.id) ? 'Editar Boleta' : 'Nueva Boleta'} maxWidth={850}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">Nombre del Diseño</label>
              <input className="input" value={activeTemplate.name} onChange={e => setActiveTemplate({ ...activeTemplate, name: e.target.value })} placeholder="Ej: General, VIP..." />
            </div>
            <button className="btn btn-ghost" onClick={() => document.getElementById('img-up')?.click()} style={{ height: '3.25rem', border: '1px dashed #ccc' }}><Upload size={18} /> Imagen</button>
            <input id="img-up" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f0f9ff', color: '#0369a1', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>
            <Move size={16} /> Arrastra y redimensiona el <b>Código QR</b> sobre tu diseño.
          </div>

          <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} style={{ background: dragOver ? '#eff6ff' : '#f9fafb', border: `2px dashed ${activeTemplate.imageUrl ? 'transparent' : '#cbd5e1'}`, borderRadius: '1.25rem', minHeight: activeTemplate.imageUrl ? 'auto' : 350, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: activeTemplate.imageUrl ? '1rem' : 0 }}>
            {activeTemplate.imageUrl ? (
              <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                <img src={activeTemplate.imageUrl} alt="Template" onLoad={onImageLoad} style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block', borderRadius: '0.5rem', pointerEvents: 'none' }} />
                {imageLoaded && (
                  <Rnd
                    lockAspectRatio={true}
                    size={{ width: (activeTemplate.qrWidth / 100) * containerDims.w, height: (activeTemplate.qrHeight / 100) * containerDims.h }}
                    position={{ x: (activeTemplate.qrX / 100) * containerDims.w, y: (activeTemplate.qrY / 100) * containerDims.h }}
                    onDragStop={(_e, d) => setActiveTemplate(prev => ({ ...prev, qrX: (d.x / containerDims.w) * 100, qrY: (d.y / containerDims.h) * 100 }))}
                    onResizeStop={(_e, _dir, ref, _delta, pos) => {
                      const wPct = (parseInt(ref.style.width) / containerDims.w) * 100;
                      const hPct = (parseInt(ref.style.height) / containerDims.h) * 100;
                      setActiveTemplate(prev => ({ ...prev, qrWidth: wPct, qrHeight: hPct, qrX: (pos.x / containerDims.w) * 100, qrY: (pos.y / containerDims.h) * 100 }));
                    }}
                    bounds="parent"
                    style={{ border: '3px solid #16a34a', background: '#fff', borderRadius: '8px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0px', cursor: 'move', overflow: 'hidden' }}
                  >
                    <QRCodeSVG value="PREVIEW" style={{ width: '100%', height: '100%', display: 'block' }} marginSize={0} />
                  </Rnd>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.5 }} onClick={() => document.getElementById('img-up')?.click()}><ImageIcon size={64} /><p>Sube una imagen para empezar</p></div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-ghost" onClick={() => setIsEditorOpen(false)} style={{ borderRadius: '1rem' }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ minWidth: '150px', borderRadius: '1rem' }}>
              {loading ? 'Guardando...' : <><Save size={18} /> Guardar Diseño</>}
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        .skeleton { background: #f1f5f9; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
};

export default TemplateEditor;
