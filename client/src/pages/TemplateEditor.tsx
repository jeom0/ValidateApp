import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { API_URL } from '../config';
import { QRCodeSVG } from 'qrcode.react';
import { Save, Upload, CheckCircle2, AlertCircle, ImageIcon, Move } from 'lucide-react';

const TemplateEditor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const eventName = searchParams.get('eventName');

  const [template, setTemplate] = useState<any>({
    id: '', name: eventName ? `Plantilla: ${eventName}` : 'Plantilla Base', imageUrl: '', qrX: 50, qrY: 50, qrWidth: 120, qrHeight: 120, eventId: eventId || null
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const url = eventId ? `${API_URL}/api/templates?eventId=${eventId}` : `${API_URL}/api/templates`;
    fetch(url)
      .then(r => r.json())
      .then(data => { if (data?.length > 0) setTemplate(data[0]); });
  }, [eventId]);

  const handleSave = async () => {
    setLoading(true); setSaveStatus('idle');
    try {
      const res = await fetch(`${API_URL}/api/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      const data = await res.json();
      if (res.ok) {
        setTemplate(data);
        setSaveStatus('success'); setMessage('Diseño guardado correctamente');
        setTimeout(() => { setSaveStatus('idle'); setMessage(''); }, 3000);
      } else { throw new Error(); }
    } catch {
      setSaveStatus('error'); setMessage('Error al guardar');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally { setLoading(false); }
  };

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => setTemplate({ ...template, imageUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            {template.name}
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.375rem', fontWeight: 500 }}>
            {eventId ? 'Sube la imagen de tu boleto para este evento y posiciona el QR arrastrándolo.' : 'Sube la imagen del boleto por defecto y posiciona el QR.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          {saveStatus === 'success' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f0fdf4', color: '#16a34a', padding: '0.625rem 1rem', borderRadius: '0.875rem', border: '1px solid #bbf7d0', fontWeight: 700, fontSize: '0.875rem' }}>
              <CheckCircle2 size={16} /> {message}
            </div>
          )}
          {saveStatus === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', color: '#dc2626', padding: '0.625rem 1rem', borderRadius: '0.875rem', border: '1px solid #fecaca', fontWeight: 700, fontSize: '0.875rem' }}>
              <AlertCircle size={16} /> {message}
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ borderRadius: '1rem', padding: '0.875rem 1.5rem' }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading
              ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Guardando...</>
              : <><Save size={18} /> Guardar Diseño</>
            }
          </button>
        </div>
      </div>

      {/* Upload Zone + Editor */}
      <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Upload button row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ borderRadius: '0.875rem', padding: '0.875rem 1.25rem', border: '1.5px dashed #d1d5db', gap: '0.625rem' }}
            onClick={() => document.getElementById('img-upload')?.click()}
          >
            <Upload size={18} style={{ color: '#6b7280' }} />
            <span style={{ fontWeight: 700, color: '#374151' }}>Cargar Imagen</span>
            <span style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>JPG, PNG, WebP</span>
          </button>
          <input id="img-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          {template.imageUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
              <Move size={15} />
              Arrastra el cuadro QR para reposicionarlo
            </div>
          )}
        </div>

        {/* Canvas */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            background: dragOver ? '#eff6ff' : '#f9fafb',
            border: `2px dashed ${dragOver ? '#3b82f6' : '#e5e7eb'}`,
            borderRadius: '1.25rem',
            minHeight: 480,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            transition: 'border-color 0.2s, background 0.2s'
          }}
        >
          {template.imageUrl ? (
            <div style={{ position: 'relative', display: 'inline-block', margin: '1.5rem' }}>
              <img
                src={template.imageUrl}
                alt="Plantilla"
                style={{ maxWidth: '100%', maxHeight: 560, display: 'block', borderRadius: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                draggable={false}
              />
              <Rnd
                size={{ width: template.qrWidth, height: template.qrHeight }}
                position={{ x: template.qrX, y: template.qrY }}
                onDragStop={(_e, d) => setTemplate({ ...template, qrX: d.x, qrY: d.y })}
                onResizeStop={(_e, _dir, ref, _delta, position) =>
                  setTemplate({ ...template, qrWidth: parseInt(ref.style.width), qrHeight: parseInt(ref.style.height), ...position })
                }
                bounds="parent"
                style={{
                  border: '2.5px solid #16a34a',
                  background: 'rgba(255,255,255,0.92)',
                  borderRadius: '0.625rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{ width: '80%', height: '80%' }}>
                  <QRCodeSVG value="MOCK-QR" style={{ width: '100%', height: '100%' }} />
                </div>
                <div style={{ position: 'absolute', top: -10, right: -10, background: '#16a34a', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                  ↔
                </div>
              </Rnd>
            </div>
          ) : (
            /* Drop zone */
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem 2rem', textAlign: 'center', cursor: 'pointer' }}
              onClick={() => document.getElementById('img-upload')?.click()}
            >
              <div style={{ width: 80, height: 80, background: '#f3f4f6', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <ImageIcon size={36} style={{ color: '#9ca3af' }} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: '1.125rem', color: '#374151', marginBottom: '0.375rem' }}>
                  Arrastra o haz clic para subir una imagen
                </p>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', fontWeight: 500 }}>
                  Soporta JPG, PNG y WebP · Máx. 10MB
                </p>
              </div>
              <button type="button" className="btn btn-ghost" style={{ borderRadius: '0.875rem' }} onClick={e => { e.stopPropagation(); document.getElementById('img-upload')?.click(); }}>
                <Upload size={16} /> Seleccionar archivo
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default TemplateEditor;
