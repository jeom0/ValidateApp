import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { API_URL } from '../config';
import { QRCodeSVG } from 'qrcode.react';
import { Save, Upload, CheckCircle2, AlertCircle, ImageIcon, Move, Plus, Trash2, Edit2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';

interface Template {
  id: string;
  name: string;
  imageUrl: string;
  qrX: number;
  qrY: number;
  qrWidth: number;
  qrHeight: number;
  eventId?: string;
}

const defaultTemplate: Template = {
  id: '', name: '', imageUrl: '', qrX: 50, qrY: 50, qrWidth: 120, qrHeight: 120
};

const TemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<Template>(defaultTemplate);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/templates`);
      const data = await r.json();
      // Only show templates that have a name (filter out phantom/empty ones)
      setTemplates(Array.isArray(data) ? data.filter((t: Template) => t.name && t.name.trim() !== '') : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleOpenNew = () => {
    setActiveTemplate({ ...defaultTemplate, id: crypto.randomUUID() });
    setSaveStatus('idle');
    setMessage('');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, t: Template) => {
    e.stopPropagation();
    setActiveTemplate({ ...t });
    setSaveStatus('idle');
    setMessage('');
    setIsEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    try {
      const res = await fetch(`${API_URL}/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id));
      } else {
        alert('Error al eliminar la boleta');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleSave = async () => {
    // Validate name
    if (!activeTemplate.name || !activeTemplate.name.trim()) {
      setSaveStatus('error');
      setMessage('El nombre de la boleta es obligatorio');
      return;
    }
    // Validate image
    if (!activeTemplate.imageUrl) {
      setSaveStatus('error');
      setMessage('Debes subir una imagen de fondo');
      return;
    }

    setLoading(true);
    setSaveStatus('idle');

    const isExisting = templates.some(t => t.id === activeTemplate.id);
    const method = isExisting ? 'PUT' : 'POST';
    const url = isExisting
      ? `${API_URL}/api/templates/${activeTemplate.id}`
      : `${API_URL}/api/templates`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeTemplate, name: activeTemplate.name.trim() })
      });
      if (res.ok) {
        setSaveStatus('success');
        setMessage(isExisting ? 'Boleta actualizada' : 'Boleta guardada');
        await fetchTemplates();
        setTimeout(() => setIsEditorOpen(false), 1200);
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Error del servidor');
      }
    } catch (e: any) {
      setSaveStatus('error');
      setMessage(e.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => setActiveTemplate(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Diseños de Boletas
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.375rem', fontWeight: 500 }}>
            Administra los diseños visuales de tus boletas. Crea múltiples estilos para diferentes eventos o categorías.
          </p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus size={18} /> Nueva Boleta
        </Button>
      </div>

      {/* Grid */}
      {loading && templates.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>Cargando boletas...</div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ border: '2px dashed #e5e7eb', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <ImageIcon size={32} style={{ color: '#9ca3af' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Sin diseños de boleta</h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontWeight: 500 }}>Crea tu primer diseño para asignarlo a los asistentes.</p>
          <Button onClick={handleOpenNew}>Crear Ahora</Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Thumbnail */}
              <div style={{ width: '100%', aspectRatio: '1/1.4', background: '#f3f4f6', borderRadius: '0.875rem', overflow: 'hidden', position: 'relative', marginBottom: '0.875rem' }}>
                {t.imageUrl ? (
                  <img src={t.imageUrl} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>

              {/* Name */}
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {t.name}
              </h3>

              {/* Action buttons — clearly separated */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={(e) => handleOpenEdit(e, t)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.625rem', background: '#f3f4f6', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.8125rem', color: '#374151', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
                >
                  <Edit2 size={15} /> Editar
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(t.id); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.625rem', background: '#fef2f2', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', color: '#dc2626', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                  title="Eliminar boleta"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Confirmar Eliminación" maxWidth={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ color: '#374151', fontWeight: 500, lineHeight: 1.6 }}>
            ¿Estás seguro de que deseas eliminar este diseño de boleta? Esta acción <strong>no se puede deshacer</strong> y los clientes que tenían esta boleta asignada no podrán verla.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteConfirmId(null)} type="button" className="btn" style={{ background: '#f3f4f6', color: '#374151', borderRadius: '0.875rem' }}>
              Cancelar
            </button>
            <button onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} type="button" className="btn" style={{ background: '#dc2626', color: '#fff', borderRadius: '0.875rem' }}>
              <Trash2 size={16} /> Eliminar
            </button>
          </div>
        </div>
      </Modal>

      {/* Editor Modal */}
      <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={activeTemplate.id && templates.some(t => t.id === activeTemplate.id) ? 'Editar Boleta' : 'Nueva Boleta'} maxWidth={800}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="input-label">
                Nombre de la Boleta <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                className="input"
                value={activeTemplate.name}
                onChange={e => { setActiveTemplate({ ...activeTemplate, name: e.target.value }); if (saveStatus === 'error') setSaveStatus('idle'); }}
                placeholder="Ej: VIP Noche, Entrada General..."
                style={{ borderColor: saveStatus === 'error' && !activeTemplate.name.trim() ? '#dc2626' : undefined }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingTop: '1.625rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ borderRadius: '0.875rem', padding: '0.875rem 1.25rem', border: '1.5px dashed #d1d5db', gap: '0.625rem', height: '46px' }}
                onClick={() => document.getElementById('img-upload-modal')?.click()}
              >
                <Upload size={18} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: 700, color: '#374151' }}>{activeTemplate.imageUrl ? 'Cambiar Imagen' : 'Subir Imagen'}</span>
              </button>
              <input id="img-upload-modal" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600, background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <Move size={16} style={{ color: '#3b82f6' }} />
            Arrastra el recuadro verde "QR" para posicionarlo en tu boleta. También puedes redimensionarlo desde las esquinas.
          </div>

          {/* Canvas */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              background: dragOver ? '#eff6ff' : '#f9fafb',
              border: `2px dashed ${dragOver ? '#3b82f6' : activeTemplate.imageUrl ? 'transparent' : '#e5e7eb'}`,
              borderRadius: '1.25rem',
              minHeight: activeTemplate.imageUrl ? 'auto' : 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.2s, background 0.2s'
            }}
          >
            {activeTemplate.imageUrl ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={activeTemplate.imageUrl}
                  alt="Fondo Boleta"
                  className="canvas-img"
                  style={{ maxWidth: '100%', maxHeight: '550px', display: 'block', borderRadius: '1rem' }}
                  draggable={false}
                />
                <Rnd
                  size={{ width: activeTemplate.qrWidth, height: activeTemplate.qrHeight }}
                  position={{ x: activeTemplate.qrX, y: activeTemplate.qrY }}
                  onDragStop={(_e, d) => setActiveTemplate(prev => ({ ...prev, qrX: d.x, qrY: d.y }))}
                  onResizeStop={(_e, _dir, ref, _delta, position) =>
                    setActiveTemplate(prev => ({ ...prev, qrWidth: parseInt(ref.style.width), qrHeight: parseInt(ref.style.height), ...position }))
                  }
                  bounds="parent"
                  style={{
                    border: '2.5px solid #16a34a',
                    background: 'rgba(255,255,255,0.92)',
                    borderRadius: '0.625rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ width: '80%', height: '80%' }}>
                    <QRCodeSVG value="MOCK-QR-PREVIEW" style={{ width: '100%', height: '100%' }} />
                  </div>
                </Rnd>
              </div>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', width: '100%' }}
                onClick={() => document.getElementById('img-upload-modal')?.click()}
              >
                <div style={{ width: 72, height: 72, background: '#f3f4f6', borderRadius: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={32} style={{ color: '#9ca3af' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '1.0625rem', color: '#374151', marginBottom: '0.25rem' }}>
                    Arrastra o haz clic para subir el diseño
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', fontWeight: 500 }}>
                    JPG, PNG o WebP. Usa un diseño vertical tipo boleta/ticket.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Feedback */}
          {saveStatus !== 'idle' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1rem', borderRadius: '0.875rem',
              fontWeight: 700, fontSize: '0.875rem',
              background: saveStatus === 'error' ? '#fef2f2' : '#f0fdf4',
              color: saveStatus === 'error' ? '#dc2626' : '#16a34a',
              border: `1px solid ${saveStatus === 'error' ? '#fecaca' : '#bbf7d0'}`
            }}>
              {saveStatus === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              {message}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button onClick={() => setIsEditorOpen(false)} type="button" className="btn" style={{ background: '#f3f4f6', color: '#4b5563', borderRadius: '1rem' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={loading} type="button" className="btn btn-primary" style={{ borderRadius: '1rem', minWidth: '140px' }}>
              {loading ? (
                <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Guardando...</>
              ) : (
                <><Save size={16} /> Guardar Boleta</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default TemplateEditor;
