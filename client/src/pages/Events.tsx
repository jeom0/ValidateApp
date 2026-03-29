import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Plus, Minus, Edit2, Trash2, LayoutTemplate, MoreVertical, Ticket, Loader2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import EmptyState from '../components/EmptyState';
import { QRCodeSVG } from 'qrcode.react';

interface Event {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pendiente' | 'en curso' | 'terminado';
  imageUrl: string;
  location?: string;
  ticketCount?: number;
}

const TemplateGallery = ({ 
  templates, 
  selectedIds, 
  onSelect, 
  multi = false 
}: { 
  templates: any[]; 
  selectedIds: string[]; 
  onSelect: (id: string) => void;
  multi?: boolean;
}) => {
  if (templates.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No hay diseños disponibles.</p>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
      gap: '1rem',
      maxHeight: '400px',
      overflowY: 'auto',
      padding: '0.5rem'
    }}>
      {templates.map(t => {
        const isSelected = selectedIds.includes(t.id);
        return (
          <div 
            key={t.id} 
            onClick={() => onSelect(t.id)}
            style={{ 
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              border: `3px solid ${isSelected ? '#2563eb' : 'transparent'}`,
              boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ width: '100%', height: '100px', background: '#f1f5f9' }}>
              <img src={t.imageUrl} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ 
              padding: '0.5rem', 
              background: isSelected ? '#eff6ff' : '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {t.name}
            </div>
            {isSelected && (
              <div style={{ 
                position: 'absolute', top: '0.5rem', right: '0.5rem', 
                background: '#2563eb', color: '#fff', borderRadius: '50%', 
                width: '1.25rem', height: '1.25rem', display: 'flex', 
                alignItems: 'center', justifyContent: 'center' 
              }}>
                <CheckCircle2 size={12} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ImageUploader = ({ value, onChange }: { value: string; onChange: (b64: string) => void }) => {
  const [dragging, setDragging] = useState(false);
  
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

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const original = e.target?.result as string;
      const optimized = await compress(original);
      onChange(optimized);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
      style={{
        width: '100%', height: '160px', borderRadius: '1rem', border: `2px dashed ${dragging ? '#3b82f6' : '#e5e7eb'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: dragging ? '#eff6ff' : '#f9fafb'
      }}
      onClick={() => document.getElementById('event-img-up')?.click()}
    >
      {value ? (
        <img src={value} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ textAlign: 'center', color: '#6b7280' }}><Plus size={24} /><p style={{ fontSize: '0.875rem' }}>Subir imagen del evento</p></div>
      )}
      <input id="event-img-up" type="file" hidden accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
};

const Events: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({ status: 'pendiente' });
  const [isEventBoletasOpen, setIsEventBoletasOpen] = useState(false);
  const [boletaEventContext, setBoletaEventContext] = useState<Event | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [linking, setLinking] = useState(false);

  // Form states for generation
  const [genName, setGenName] = useState('');
  const [genCedula, setGenCedula] = useState('');
  const [genEmail, setGenEmail] = useState('');
  const [genQty, setGenQty] = useState(1);
  const [genTemplateId, setGenTemplateId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 🛡️ CARGA ULTRA-RÁPIDA V4.14
  const fetchEvents = async () => {
    // 1. Cargar metadatos inmediatamente (Compact)
    const compactPromise = fetch(`${API_URL}/api/events?compact=true`).then(r => r.json());
    const data = await compactPromise;
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);

    // 2. Cargar imágenes en segundo plano para las tarjetas
    const fullData = await fetch(`${API_URL}/api/events`).then(r => r.json());
    if (Array.isArray(fullData)) {
      setEvents(fullData);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleOpenNew = () => {
    setCurrentEvent({ id: crypto.randomUUID(), status: 'pendiente', name: '', date: '', startTime: '', endTime: '', location: '', imageUrl: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setCurrentEvent({ ...event });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este evento y TODOS sus datos?')) return;
    
    // 🚀 ELIMINACIÓN OPTIMISTA
    const prev = [...events];
    setEvents(events.filter(e => e.id !== id));

    try {
      const res = await fetch(`${API_URL}/api/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch (err) {
      alert('Error al eliminar');
      setEvents(prev);
    }
  };

  const handleSave = async () => {
    if (!currentEvent.name || !currentEvent.date) {
      alert('Nombre y fecha son obligatorios');
      return;
    }

    setLoading(true);
    const isNew = !events.some(e => e.id === currentEvent.id);
    const method = isNew ? 'POST' : 'PUT';
    const url = isNew ? `${API_URL}/api/events` : `${API_URL}/api/events/${currentEvent.id}`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentEvent)
      });
      if (res.ok) {
        setIsModalOpen(false);
        await fetchEvents();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const openEventBoletas = async (event: Event) => {
    setBoletaEventContext(event);
    setIsEventBoletasOpen(true);
    // Fetch full templates (not compact) to show images in the gallery
    try {
      const res = await fetch(`${API_URL}/api/templates`);
      const data = await res.json();
      setAllTemplates(Array.isArray(data) ? data : []);
    } catch { 
      setAllTemplates([]); 
    }
  };
  
  const openLinkModal = async (event: Event) => {
    setBoletaEventContext(event);
    setLinking(false);
    setIsLinkModalOpen(true);
    try {
      const res = await fetch(`${API_URL}/api/templates`);
      const data = await res.json();
      const templates = Array.isArray(data) ? data : [];
      setAllTemplates(templates);
      
      // Mark templates currently linked to this event
      const linked = templates.filter(t => t.eventId === event.id).map(t => t.id);
      setSelectedTemplateIds(linked);
    } catch { 
      setAllTemplates([]); 
    }
  };

  const handleBatchLink = async () => {
    if (!boletaEventContext) return;
    setLinking(true);
    try {
      const res = await fetch(`${API_URL}/api/templates/batch-link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId: boletaEventContext.id,
          templateIds: selectedTemplateIds 
        })
      });
      if (res.ok) {
        setIsLinkModalOpen(false);
        fetchEvents();
        alert('🎉 Galería de diseños actualizada con éxito.');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`❌ Error al vincular diseños: ${errData.error || 'Problema en el servidor'}`);
      }
    } catch (e) {
      console.error('Error de conexión:', e);
      alert('⚠️ Error de conexión. El servidor no respondió.');
    } finally {
      setLinking(false);
    }
  };

  const handleGenerateBoletas = async () => {
    if (!boletaEventContext || !genName || !genCedula || !genEmail || !genTemplateId) {
      alert('Todos los campos (Nombre, Cédula, Correo y Diseño) son obligatorios.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: genName,
          cedula: genCedula,
          email: genEmail,
          eventId: boletaEventContext.id,
          templateId: genTemplateId,
          ticketCount: genQty
        })
      });
      if (res.ok) {
        alert('Boletas generadas con éxito');
        setIsEventBoletasOpen(false);
        setGenName(''); setGenCedula(''); setGenEmail(''); setGenQty(1); setGenTemplateId('');
        fetchEvents();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setIsGenerating(false);
    }
  };

  const openBoleta = (event: Event) => {
    window.location.href = `/boletas?eventId=${event.id}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Eventos</h1>
          <p style={{ color: '#6b7280', fontWeight: 500 }}>Gestiona tus eventos y monitorea las ventas.</p>
        </div>
        <Button onClick={handleOpenNew}><Plus size={18} /> Crear Evento</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {loading && events.length === 0 ? (
          // 💀 SKELETON UI V4.14
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '400px', borderRadius: '1.5rem' }} />
          ))
        ) : events.length === 0 ? (
          <EmptyState icon={Calendar} title="No hay eventos" description="Comienza creando tu primer evento para emitir boletas." action={{ label: "Crear Evento", onClick: handleOpenNew }} />
        ) : (
          events.map(event => (
            <div key={event.id} className="card" style={{ padding: '0.75rem', position: 'relative' }}>
              <div style={{ width: '100%', height: '200px', borderRadius: '1rem', overflow: 'hidden', background: '#f1f5f9', position: 'relative' }}>
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="skeleton" style={{ width: '100%', height: '100%' }} />
                )}
                <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.4rem 0.8rem', borderRadius: '2rem', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: event.status === 'en curso' ? '#16a34a' : '#2563eb' }}>
                  {event.status}
                </div>
              </div>

              <div style={{ padding: '1rem 0.5rem 0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.75rem', letterSpacing: '-0.02em' }}>{event.name}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>
                    <Calendar size={16} /> {new Date(event.date).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>
                    <Clock size={16} /> {event.startTime} - {event.endTime}
                  </div>
                  {event.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>
                      <MapPin size={16} /> {event.location}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563eb', fontSize: '0.875rem', fontWeight: 800 }}>
                    <Ticket size={16} /> {event.ticketCount || 0} boletas emitidas
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost" style={{ flex: '1 1 45%', height: '2.5rem', borderRadius: '0.6rem', fontSize: '0.75rem', padding: '0 0.5rem' }} onClick={() => handleEdit(event)}><Edit2 size={14} /> Editar</button>
                  <button className="btn btn-ghost" style={{ flex: '1 1 45%', height: '2.5rem', borderRadius: '0.6rem', fontSize: '0.75rem', padding: '0 0.5rem' }} onClick={() => openLinkModal(event)}><LayoutTemplate size={14} /> Diseño</button>
                  <button className="btn btn-ghost" style={{ flex: '1 1 45%', height: '2.5rem', borderRadius: '0.6rem', fontSize: '0.75rem', padding: '0 0.5rem' }} onClick={() => openEventBoletas(event)}><Users size={14} /> Generar Boletos</button>
                  <button className="btn btn-ghost" style={{ width: '40px', padding: 0, color: '#dc2626', background: '#fef2f2', border: 'none' }} onClick={() => handleDelete(event.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* EVENT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentEvent.id ? 'Editar Evento' : 'Nuevo Evento'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div><label className="input-label">Nombre del Evento</label><input className="input" value={currentEvent.name} onChange={e => setCurrentEvent({ ...currentEvent, name: e.target.value })} /></div>
          <ImageUploader value={currentEvent.imageUrl || ''} onChange={b64 => setCurrentEvent({ ...currentEvent, imageUrl: b64 })} />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}><label className="input-label">Fecha</label><input type="date" className="input" value={currentEvent.date} onChange={e => setCurrentEvent({ ...currentEvent, date: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label className="input-label">Lugar (Opcional)</label><input className="input" value={currentEvent.location} onChange={e => setCurrentEvent({ ...currentEvent, location: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}><label className="input-label">Inicio</label><input type="time" className="input" value={currentEvent.startTime} onChange={e => setCurrentEvent({ ...currentEvent, startTime: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label className="input-label">Fin</label><input type="time" className="input" value={currentEvent.endTime} onChange={e => setCurrentEvent({ ...currentEvent, endTime: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <Button onClick={handleSave} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Evento'}</Button>
          </div>
        </div>
      </Modal>

      {/* BOLETAS / GENERATE Modal — RESTAURADO V4.15 */}
      <Modal isOpen={isEventBoletasOpen} onClose={() => setIsEventBoletasOpen(false)} title={`Boletas — ${boletaEventContext?.name || ''}`} maxWidth={550}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
          
          {/* Contador de Boletas (Resumen Visual) */}
          <div style={{ 
            background: '#f8fafc', 
            padding: '1.5rem', 
            borderRadius: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            border: '2px solid #f1f5f9',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Boletas Creadas</span>
            <span style={{ fontSize: '3rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{(boletaEventContext as any)?.ticketCount || 0}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="input-label">Nombre del Invitado</label>
                <input className="input" placeholder="Nombre completo" value={genName} onChange={e => setGenName(e.target.value)} required />
              </div>
              <div>
                <label className="input-label">Identificación (Cédula)</label>
                <input className="input" placeholder="Requerido" value={genCedula} onChange={e => setGenCedula(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label className="input-label">Correo Electrónico</label>
                <input type="email" className="input" placeholder="ejemplo@correo.com" value={genEmail} onChange={e => setGenEmail(e.target.value)} required />
              </div>
              <div>
                <label className="input-label">Cantidad</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f9fafb', padding: '0.25rem', borderRadius: '0.75rem', border: '1.5px solid #e5e7eb' }}>
                  <button className="btn btn-ghost" style={{ padding: '0.5rem', minWidth: 'auto', height: 'auto', background: 'transparent' }} onClick={() => setGenQty(Math.max(1, genQty - 1))}><Minus size={16} /></button>
                  <input className="input" style={{ textAlign: 'center', padding: '0', border: 'none', background: 'transparent', width: '30px', fontWeight: 700 }} value={genQty} readOnly />
                  <button className="btn btn-ghost" style={{ padding: '0.5rem', minWidth: 'auto', height: 'auto', background: 'transparent' }} onClick={() => setGenQty(genQty + 1)}><Plus size={16} /></button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              ELEGIR DISEÑO 
              <span style={{ fontSize: '0.7rem', color: '#2563eb', background: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Solo vinculados</span>
            </p>
            <TemplateGallery 
              templates={allTemplates.filter(t => t.eventId === boletaEventContext?.id)} 
              selectedIds={genTemplateId ? [genTemplateId] : []} 
              onSelect={id => setGenTemplateId(id)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-ghost" style={{ flex: 1, height: '3.5rem' }} onClick={() => openBoleta(boletaEventContext!)}>Ver Listado</button>
            <Button onClick={handleGenerateBoletas} disabled={isGenerating} style={{ flex: 2, height: '3.5rem' }}>
              {isGenerating ? <Loader2 className="spin" size={20} /> : <Plus size={20} />}
              Generar Boletas
            </Button>
          </div>
        </div>
      </Modal>


      {/* LINK TEMPLATE MODAL */}
      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Vincular Diseños al Evento" maxWidth={500}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Selecciona los artes que quieres usar en este evento. Solo las que marques aparecerán al generar boletas.
          </p>

          <TemplateGallery 
            templates={allTemplates} 
            selectedIds={selectedTemplateIds} 
            multi={true}
            onSelect={id => {
              if (selectedTemplateIds.includes(id)) {
                setSelectedTemplateIds(selectedTemplateIds.filter(v => v !== id));
              } else {
                setSelectedTemplateIds([...selectedTemplateIds, id]);
              }
            }}
          />

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsLinkModalOpen(false)}>Cancelar</button>
            <Button onClick={handleBatchLink} disabled={linking} style={{ flex: 2 }}>
              {linking ? <Loader2 className="spin" size={20} /> : <Plus size={20} />}
              Guardar Galería del Evento
            </Button>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <button 
              className="btn btn-ghost" 
              style={{ width: '100%', border: '1px dashed #cbd5e1' }}
              onClick={() => navigate('/admin/plantilla')}
            >
              Ir al Editor de Diseños
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Events;
