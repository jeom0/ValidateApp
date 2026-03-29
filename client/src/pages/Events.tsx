import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { Calendar, Clock, MapPin, Users, Plus, Edit2, Trash2, LayoutTemplate, MoreVertical, Ticket, Loader2 } from 'lucide-react';
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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({ status: 'pendiente' });
  const [isEventBoletasOpen, setIsEventBoletasOpen] = useState(false);
  const [boletaEventContext, setBoletaEventContext] = useState<Event | null>(null);

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

  const openEventBoletas = (event: Event) => {
    setBoletaEventContext(event);
    setIsEventBoletasOpen(true);
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

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost" style={{ flex: 1, height: '2.75rem', borderRadius: '0.75rem' }} onClick={() => handleEdit(event)}><Edit2 size={16} /> Editar</button>
                  <button className="btn btn-ghost" style={{ flex: 1, height: '2.75rem', borderRadius: '0.75rem' }} onClick={() => openEventBoletas(event)}><Users size={16} /> Tickets</button>
                  <button className="btn btn-ghost" style={{ width: '44px', padding: 0, color: '#dc2626', background: '#fef2f2', border: 'none' }} onClick={() => handleDelete(event.id)}><Trash2 size={18} /></button>
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

      {/* BOLETAS Modal */}
      <Modal isOpen={isEventBoletasOpen} onClose={() => setIsEventBoletasOpen(false)} title={`Boletas — ${boletaEventContext?.name || ''}`} maxWidth={460}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '1.5rem', width: '100%', border: '2px solid #f1f5f9' }}>
            <p style={{ margin: 0, color: '#64748b', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Boletas Creadas</p>
            <h2 style={{ margin: '0.5rem 0', fontSize: '3.5rem', fontWeight: 900, color: '#0f172a' }}>
              {(boletaEventContext as any)?.ticketCount || 0}
            </h2>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', height: '4rem', borderRadius: '1.25rem', fontSize: '1.1rem', fontWeight: 800, gap: '0.75rem' }} onClick={() => { setIsEventBoletasOpen(false); if (boletaEventContext) openBoleta(boletaEventContext); }}><Plus size={20} /> Agregar Boletas</button>
        </div>
      </Modal>

      <style>{`
        .skeleton { background: #f1f5f9; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
};

export default Events;
