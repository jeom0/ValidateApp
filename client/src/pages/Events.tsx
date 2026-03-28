import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Clock, CheckCircle2, AlertCircle, ImageIcon, Upload, Ticket, Minus } from 'lucide-react';
import { API_URL } from '../config';
import { Modal } from '../components/Modal';

interface Event {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  imageUrl: string;
}

const emptyForm = { name: '', date: '', startTime: '', endTime: '', imageUrl: '' };

/* Drag/drop image uploader */
const ImageUploader = ({ value, onChange }: { value: string; onChange: (b64: string) => void }) => {
  const [drag, setDrag] = useState(false);

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); loadFile(e.dataTransfer.files[0]); }}
      onClick={() => document.getElementById('event-img-input')?.click()}
      style={{
        border: `2px dashed ${drag ? '#3b82f6' : '#d1d5db'}`,
        borderRadius: '1rem',
        background: drag ? '#eff6ff' : '#f9fafb',
        cursor: 'pointer',
        transition: 'all 0.2s',
        overflow: 'hidden',
        minHeight: value ? 'auto' : 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <input
        id="event-img-input"
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
      />
      {value ? (
        <div style={{ position: 'relative', width: '100%' }}>
          <img src={value} alt="Portada" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
          >
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '99px', display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              <Upload size={14} /> Cambiar imagen
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem', textAlign: 'center' }}>
          <ImageIcon size={28} style={{ color: '#9ca3af' }} />
          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#6b7280' }}>Arrastra o haz clic para subir imagen</p>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>JPG, PNG, WebP</p>
        </div>
      )}
    </div>
  );
};

const Stepper = ({ value, onChange, min = 1, max = 100 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: '1.5px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden', height: '3rem' }}>
    <button type="button" onClick={() => onChange(Math.max(min, value - 1))} style={{ width: 44, height: '100%', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#374151' }}>
      <Minus size={16} />
    </button>
    <span style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{value}</span>
    <button type="button" onClick={() => onChange(Math.min(max, value + 1))} style={{ width: 44, height: '100%', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#374151' }}>
      <Plus size={16} />
    </button>
  </div>
);

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Quick Boleta gen
  const [isBoletaModalOpen, setIsBoletaModalOpen] = useState(false);
  const [boletaEvent, setBoletaEvent] = useState<Event | null>(null);
  const [boletaName, setBoletaName] = useState('');
  const [boletaCedula, setBoletaCedula] = useState('');
  const [boletaEmail, setBoletaEmail] = useState('');
  const [boletaCount, setBoletaCount] = useState(1);
  const [boletaTemplateId, setBoletaTemplateId] = useState('');
  const [boletaCreating, setBoletaCreating] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/events`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchEvents(); 
    fetch(`${API_URL}/api/templates`).then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : [];
      setTemplates(arr);
      if (arr.length > 0) setBoletaTemplateId(arr[0].id);
    });
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setIsModalOpen(true); };
  const openEdit = (e: Event) => { setEditing(e); setForm({ name: e.name, date: e.date, startTime: e.startTime, endTime: e.endTime, imageUrl: e.imageUrl }); setIsModalOpen(true); };
  const close = () => { setIsModalOpen(false); setEditing(null); };

  const openBoleta = (e: Event) => {
    setBoletaEvent(e);
    setBoletaName('');
    setBoletaCedula('');
    setBoletaEmail('');
    setBoletaCount(1);
    
    // Auto-select template for this event if it exists
    const eventTpl = templates.find(t => t.eventId === e.id);
    if (eventTpl) {
      setBoletaTemplateId(eventTpl.id);
    } else if (templates.length > 0) {
      setBoletaTemplateId(templates[0].id);
    }
    
    setIsBoletaModalOpen(true);
  };

  const handleBoletaSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!boletaEvent) return;
    setBoletaCreating(true);
    try {
      await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: boletaName, email: boletaEmail, cedula: boletaCedula, ticketCount: boletaCount, templateId: boletaTemplateId, eventId: boletaEvent.id })
      });
      setIsBoletaModalOpen(false);
      alert(`¡Se generaron ${boletaCount} boletas para ${boletaName}!`);
    } finally { setBoletaCreating(false); }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `${API_URL}/api/events/${editing.id}` : `${API_URL}/api/events`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { close(); fetchEvents(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este evento?')) return;
    await fetch(`${API_URL}/api/events/${id}`, { method: 'DELETE' });
    fetchEvents();
  };

  const getStatus = (event: Event) => {
    const now = new Date();
    const start = new Date(`${event.date}T${event.startTime}`);
    const end = new Date(`${event.date}T${event.endTime}`);
    if (now > end) return { label: 'Terminado', cls: 'badge badge-gray', icon: <AlertCircle size={11} /> };
    if (now >= start) return { label: 'En Curso', cls: 'badge badge-green', icon: <CheckCircle2 size={11} /> };
    return { label: 'Pendiente', cls: 'badge badge-blue', icon: <Clock size={11} /> };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Gestión de Eventos
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.375rem', fontWeight: 500 }}>
            Crea y administra tus shows y fechas de evento.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: '1.25rem', padding: '0.875rem 1.5rem' }} type="button">
          <Plus size={20} /> Crear Evento
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '4rem', fontWeight: 600 }}>Cargando eventos...</p>
      ) : (
        <div className="events-grid">
          {events.map(event => {
            const s = getStatus(event);
            return (
              <div key={event.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Cover image */}
                <div style={{ height: 156, background: '#f3f4f6', position: 'relative', overflow: 'hidden' }}>
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={40} style={{ color: '#d1d5db' }} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <span className={s.cls} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '1.125rem' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-0.02em', marginBottom: '0.625rem' }}>{event.name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.8125rem', fontWeight: 600 }}>
                      <Calendar size={13} /> {event.date}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.8125rem', fontWeight: 600 }}>
                      <Clock size={13} /> {event.startTime} – {event.endTime}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8125rem', padding: '0.5625rem 0', borderRadius: '0.875rem' }} type="button" onClick={() => openBoleta(event)}>
                      <Ticket size={14} /> Boletas
                    </button>
                    <a href={`/admin/plantilla?eventId=${event.id}&eventName=${encodeURIComponent(event.name)}`} className="btn btn-ghost" style={{ padding: '0.5625rem 0.625rem', borderRadius: '0.875rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', color: '#d97706', fontWeight: 700 }} title="Diseñar Plantilla">
                       🎨 Diseño
                    </a>
                    <button className="btn btn-ghost" style={{ padding: '0.5625rem', borderRadius: '0.875rem' }} type="button" onClick={() => openEdit(event)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-danger" style={{ padding: '0.5625rem', borderRadius: '0.875rem' }} type="button" onClick={() => handleDelete(event.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '5rem 2rem', textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: '1.5rem', color: '#9ca3af', fontWeight: 600 }}>
              No hay eventos. Pulsa "Crear Evento" para comenzar.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={close} title={editing ? 'Editar Evento' : 'Nuevo Evento'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div>
            <label className="input-label">Imagen de Portada</label>
            <ImageUploader value={form.imageUrl} onChange={v => setForm({ ...form, imageUrl: v })} />
          </div>
          <div>
            <label className="input-label">Nombre del Evento</label>
            <input className="input" placeholder="Ej: Concierto de Rock" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="input-label">Fecha</label>
            <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">Hora inicio</label>
              <input className="input" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
            </div>
            <div>
              <label className="input-label">Hora fin</label>
              <input className="input" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ borderRadius: '1rem', height: '3.125rem', marginTop: '0.25rem' }} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Evento'}
          </button>
        </form>
      </Modal>

      {/* BOLETA QUICK CREATE MODAL */}
      <Modal isOpen={isBoletaModalOpen && !!boletaEvent} onClose={() => setIsBoletaModalOpen(false)} title="Generar Boletas">
        {boletaEvent && (
          <form onSubmit={handleBoletaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '1rem', border: '1px solid #e5e7eb', marginBottom: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280', fontWeight: 600 }}>Evento Seleccionado</p>
              <h3 style={{ margin: '0.25rem 0 0', fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{boletaEvent.name}</h3>
            </div>

            <div>
              <label className="input-label">Nombre del Titular</label>
              <input className="input" placeholder="Ej. Carlos Pérez" value={boletaName} onChange={e => setBoletaName(e.target.value)} required />
            </div>
            <div>
              <label className="input-label">Cédula</label>
              <input className="input" placeholder="Ej. 123456789" value={boletaCedula} onChange={e => setBoletaCedula(e.target.value)} required />
            </div>
            <div>
              <label className="input-label">Correo Electrónico (Opcional)</label>
              <input className="input" type="email" placeholder="correo@ejemplo.com" value={boletaEmail} onChange={e => setBoletaEmail(e.target.value)} />
            </div>

            <div>
              <label className="input-label" style={{ marginBottom: '0.625rem', display: 'block' }}>Cantidad de Boletas</label>
              <Stepper value={boletaCount} onChange={setBoletaCount} min={1} max={100} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ borderRadius: '1rem', height: '3.125rem', marginTop: '0.25rem' }} disabled={boletaCreating || templates.length === 0}>
              {boletaCreating ? 'Generando...' : `Generar ${boletaCount} Boleta${boletaCount !== 1 ? 's' : ''}`}
            </button>

            {templates.length === 0 && (
              <p style={{ color: '#dc2626', fontSize: '0.8125rem', fontWeight: 700, textAlign: 'center' }}>
                Primero crea una plantilla en "Plantilla Boletas".
              </p>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Events;
