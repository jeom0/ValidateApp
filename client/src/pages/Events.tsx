import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Clock, CheckCircle2, AlertCircle, ImageIcon, Upload, Ticket, Minus, Palette, Users, QrCode, X } from 'lucide-react';
import { API_URL } from '../config';
import { Modal } from '../components/Modal';
import TicketPreview from '../components/TicketPreview';
import { QRCodeSVG } from 'qrcode.react';

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
      style={{ border: `2px dashed ${drag ? '#3b82f6' : '#d1d5db'}`, borderRadius: '1rem', background: drag ? '#eff6ff' : '#f9fafb', cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden', minHeight: value ? 'auto' : 120, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <input id="event-img-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
      {value ? (
        <div style={{ position: 'relative', width: '100%' }}>
          <img src={value} alt="Portada" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
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
    <button type="button" onClick={() => onChange(Math.max(min, value - 1))} style={{ width: 44, height: '100%', background: '#f9fafb', border: 'none', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')} onMouseLeave={e => (e.currentTarget.style.background = '#f9fafb')}>
      <Minus size={16} />
    </button>
    <span style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', background: 'white', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 48 }}>{value}</span>
    <button type="button" onClick={() => onChange(Math.min(max, value + 1))} style={{ width: 44, height: '100%', background: '#f9fafb', border: 'none', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')} onMouseLeave={e => (e.currentTarget.style.background = '#f9fafb')}>
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
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);

  // Quick Boleta gen (create new client+boletas)
  const [isBoletaModalOpen, setIsBoletaModalOpen] = useState(false);
  const [boletaEvent, setBoletaEvent] = useState<Event | null>(null);
  const [boletaName, setBoletaName] = useState('');
  const [boletaCedula, setBoletaCedula] = useState('');
  const [boletaEmail, setBoletaEmail] = useState('');
  const [boletaCount, setBoletaCount] = useState(1);
  const [boletaTemplateId, setBoletaTemplateId] = useState('');
  const [boletaCreating, setBoletaCreating] = useState(false);

  // View boletas of event
  const [isEventBoletasOpen, setIsEventBoletasOpen] = useState(false);
  const [eventBoletasData, setEventBoletasData] = useState<any[]>([]);
  const [eventBoletasLoading, setEventBoletasLoading] = useState(false);
  const [boletaEventContext, setBoletaEventContext] = useState<Event | null>(null);
  const [confirmDeleteBoletaId, setConfirmDeleteBoletaId] = useState<string | null>(null);

  // View/Link design of event
  const [isDesignOpen, setIsDesignOpen] = useState(false);
  const [designEvent, setDesignEvent] = useState<Event | null>(null);
  const [linkedTemplateId, setLinkedTemplateId] = useState('');
  const [savingDesign, setSavingDesign] = useState(false);
  const [designSaved, setDesignSaved] = useState(false);

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
      const arr = Array.isArray(d) ? d.filter((t: any) => t.name) : [];
      setTemplates(arr);
      if (arr.length > 0) setBoletaTemplateId(arr[0].id);
    });
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setIsModalOpen(true); };
  const openEdit = (e: Event) => { setEditing(e); setForm({ name: e.name, date: e.date, startTime: e.startTime, endTime: e.endTime, imageUrl: e.imageUrl }); setIsModalOpen(true); };
  const close = () => { setIsModalOpen(false); setEditing(null); };

  // Open the "Boletas del evento" modal
  const openEventBoletas = async (event: Event) => {
    setBoletaEventContext(event);
    setIsEventBoletasOpen(true);
    setEventBoletasLoading(true);
    setEventBoletasData([]);
    setConfirmDeleteBoletaId(null);
    try {
      // Get all boletas for this event from the backend (via events endpoint not yet, so query boletas globally)
      const res = await fetch(`${API_URL}/api/boletas`);
      const all = await res.json();
      // Also get clients to display names
      const cRes = await fetch(`${API_URL}/api/clients`);
      const clients: any[] = await cRes.json();
      const clientMap: Record<string, any> = {};
      clients.forEach(c => { clientMap[c.id] = c; });
      const filtered = (Array.isArray(all) ? all : []).filter((b: any) => b.eventId === event.id);
      setEventBoletasData(filtered.map((b: any) => ({ ...b, client: clientMap[b.clientId] || null })));
    } finally { setEventBoletasLoading(false); }
  };

  const handleDeleteBoleta = async (boletaId: string) => {
    setConfirmDeleteBoletaId(null);
    await fetch(`${API_URL}/api/boletas/${boletaId}`, { method: 'DELETE' });
    setEventBoletasData(prev => prev.filter(b => b.id !== boletaId));
  };

  // Open the "Diseño" modal: shows linked template & allows changing it
  const openDesign = (event: Event) => {
    setDesignEvent(event);
    setDesignSaved(false);
    // Find if any template is linked to this event
    const linked = templates.find(t => t.eventId === event.id);
    setLinkedTemplateId(linked ? linked.id : (templates[0]?.id || ''));
    setIsDesignOpen(true);
  };

  const handleSaveDesign = async () => {
    if (!designEvent) return;
    setSavingDesign(true);
    try {
      // Update the selected template to link to this event (unlink others first)
      // Find the currently linked template for this event (if different from new selection)
      const currentlyLinked = templates.find(t => t.eventId === designEvent.id);
      if (currentlyLinked && currentlyLinked.id !== linkedTemplateId) {
        // Unlink the old one
        await fetch(`${API_URL}/api/templates/${currentlyLinked.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...currentlyLinked, eventId: null })
        });
      }
      // Link the new one
      if (linkedTemplateId) {
        const tpl = templates.find(t => t.id === linkedTemplateId);
        if (tpl) {
          await fetch(`${API_URL}/api/templates/${linkedTemplateId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tpl, eventId: designEvent.id })
          });
        }
      }
      // Refresh templates
      const r = await fetch(`${API_URL}/api/templates`);
      const d = await r.json();
      setTemplates(Array.isArray(d) ? d.filter((t: any) => t.name) : []);
      setDesignSaved(true);
    } finally { setSavingDesign(false); }
  };

  // Quick boleta for new client
  const openBoleta = (e: Event) => {
    setBoletaEvent(e);
    setBoletaName(''); setBoletaCedula(''); setBoletaEmail(''); setBoletaCount(1);
    const eventTpl = templates.find(t => t.eventId === e.id);
    if (eventTpl) setBoletaTemplateId(eventTpl.id);
    else if (templates.length > 0) setBoletaTemplateId(templates[0].id);
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
    setConfirmDeleteEventId(null);
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

  const linkedTemplate = designEvent ? templates.find(t => t.id === linkedTemplateId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Gestión de Eventos
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.375rem', fontWeight: 500 }}>Crea y administra tus shows y fechas de evento.</p>
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
            const hasLinkedDesign = templates.some(t => t.eventId === event.id);
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
                    {/* Boletas button → shows tickets for this event */}
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8125rem', padding: '0.5625rem 0', borderRadius: '0.875rem' }} type="button" onClick={() => openEventBoletas(event)}>
                      <Ticket size={14} /> Boletas
                    </button>
                    {/* Diseño button → shows/links design for this event */}
                    <button
                      type="button"
                      onClick={() => openDesign(event)}
                      style={{ padding: '0.5625rem 0.75rem', borderRadius: '0.875rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem', background: hasLinkedDesign ? '#fef3c7' : '#f3f4f6', color: hasLinkedDesign ? '#d97706' : '#6b7280', transition: 'filter 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                      title="Ver/Asignar diseño de boleta"
                    >
                      <Palette size={14} /> Diseño
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.5625rem', borderRadius: '0.875rem' }} type="button" onClick={() => openEdit(event)}>
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '0.5625rem', borderRadius: '0.875rem' }}
                      type="button"
                      onClick={() => setConfirmDeleteEventId(event.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Inline event delete confirmation */}
                  {confirmDeleteEventId === event.id && (
                    <div style={{ marginTop: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.875rem', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#991b1b', fontSize: '0.8125rem' }}>⚠️ ¿Eliminar "{event.name}"? Esta acción no se puede deshacer.</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn" style={{ background: '#dc2626', color: '#fff', borderRadius: '0.625rem', flex: 1, fontSize: '0.8125rem' }} onClick={() => handleDelete(event.id)}>Eliminar</button>
                        <button type="button" className="btn btn-ghost" style={{ borderRadius: '0.625rem', flex: 1, fontSize: '0.8125rem' }} onClick={() => setConfirmDeleteEventId(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}
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

      {/* EDIT/CREATE EVENT Modal */}
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

      {/* BOLETAS DEL EVENTO Modal */}
      <Modal isOpen={isEventBoletasOpen} onClose={() => setIsEventBoletasOpen(false)} title={`Boletas — ${boletaEventContext?.name || ''}`} maxWidth={660}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#6b7280', fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>
              {eventBoletasLoading ? 'Cargando...' : `${eventBoletasData.length} boleta${eventBoletasData.length !== 1 ? 's' : ''} registradas`}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ borderRadius: '0.875rem', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
              onClick={() => { setIsEventBoletasOpen(false); if (boletaEventContext) openBoleta(boletaEventContext); }}
            >
              <Plus size={14} /> Agregar Boleta
            </button>
          </div>

          {eventBoletasLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem' }} />
              Cargando boletas...
            </div>
          ) : eventBoletasData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
              <Ticket size={40} style={{ margin: '0 auto 1rem', display: 'block', color: '#e5e7eb' }} />
              <p style={{ fontWeight: 700 }}>Este evento no tiene boletas aún.</p>
              <p style={{ fontSize: '0.875rem' }}>Usa el botón "Agregar Boleta" para crear la primera.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {eventBoletasData.map((boleta: any) => (
                <div key={boleta.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', gap: '0.75rem' }}>
                    {/* QR mini */}
                    <div style={{ background: '#fff', padding: '0.25rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb', flexShrink: 0 }}>
                      <QRCodeSVG value={boleta.code} size={36} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: '#111827' }}>
                        {boleta.client?.name || 'Sin titular'} <span style={{ fontWeight: 600, color: '#6b7280' }}>#{boleta.consecutivo}</span>
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>
                        {boleta.client?.cedula ? `CC: ${boleta.client.cedula}` : ''} · Ref: {boleta.code.substring(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ background: boleta.used ? '#fef2f2' : '#f0fdf4', color: boleta.used ? '#dc2626' : '#16a34a', fontWeight: 800, fontSize: '0.7rem', padding: '0.2rem 0.625rem', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {boleta.used ? 'Usada' : 'Activa'}
                      </span>
                      <button
                        type="button"
                        style={{ background: '#fef2f2', color: '#dc2626', border: 'none', width: 32, height: 32, borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setConfirmDeleteBoletaId(boleta.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {/* Inline delete confirm */}
                  {confirmDeleteBoletaId === boleta.id && (
                    <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', borderTop: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#991b1b', flex: 1 }}>⚠️ ¿Eliminar esta boleta?</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn" style={{ background: '#dc2626', color: '#fff', borderRadius: '0.5rem', padding: '0.3rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700 }} onClick={() => handleDeleteBoleta(boleta.id)}>Sí, eliminar</button>
                        <button type="button" className="btn btn-ghost" style={{ borderRadius: '0.5rem', padding: '0.3rem 0.875rem', fontSize: '0.8125rem' }} onClick={() => setConfirmDeleteBoletaId(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </Modal>

      {/* DISEÑO DEL EVENTO Modal */}
      <Modal isOpen={isDesignOpen} onClose={() => setIsDesignOpen(false)} title={`Diseño de Boleta — ${designEvent?.name || ''}`} maxWidth={600}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              <Palette size={36} style={{ margin: '0 auto 0.75rem', display: 'block' }} />
              <p style={{ fontWeight: 700 }}>No hay diseños de boleta creados.</p>
              <p style={{ fontSize: '0.875rem' }}>Ve a "Boletas" en el menú lateral para crear un diseño primero.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="input-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Selecciona el diseño de boleta para este evento</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  {templates.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setLinkedTemplateId(t.id)}
                      style={{
                        border: `2px solid ${linkedTemplateId === t.id ? '#2563eb' : '#e5e7eb'}`,
                        borderRadius: '0.875rem', overflow: 'hidden', cursor: 'pointer',
                        boxShadow: linkedTemplateId === t.id ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ height: 100, background: '#f3f4f6', overflow: 'hidden' }}>
                        {t.imageUrl ? (
                          <img src={t.imageUrl} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <ImageIcon size={24} style={{ color: '#d1d5db' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0.5rem 0.625rem', background: linkedTemplateId === t.id ? '#eff6ff' : '#fff' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.75rem', color: linkedTemplateId === t.id ? '#2563eb' : '#374151', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{t.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview of selected template */}
              {linkedTemplate?.imageUrl && (
                <div>
                  <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Vista previa del diseño seleccionado</label>
                  <div style={{ borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid #e5e7eb', maxHeight: 200 }}>
                    <img src={linkedTemplate.imageUrl} alt={linkedTemplate.name} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                  </div>
                </div>
              )}

              {designSaved && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.875rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 700, fontSize: '0.875rem' }}>
                  <CheckCircle2 size={16} /> Diseño guardado correctamente
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" style={{ borderRadius: '1rem' }} onClick={() => setIsDesignOpen(false)}>Cerrar</button>
                <button type="button" className="btn btn-primary" style={{ borderRadius: '1rem' }} disabled={savingDesign || !linkedTemplateId} onClick={handleSaveDesign}>
                  {savingDesign ? 'Guardando...' : 'Guardar Diseño'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* QUICK BOLETA CREATE Modal */}
      <Modal isOpen={isBoletaModalOpen && !!boletaEvent} onClose={() => setIsBoletaModalOpen(false)} title="Generar Boletas">
        {boletaEvent && (
          <form onSubmit={handleBoletaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
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
            {templates.length > 1 && (
              <div>
                <label className="input-label">Diseño de Boleta</label>
                <select className="input" value={boletaTemplateId} onChange={e => setBoletaTemplateId(e.target.value)}>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="input-label" style={{ marginBottom: '0.625rem', display: 'block' }}>Cantidad de Boletas</label>
              <Stepper value={boletaCount} onChange={setBoletaCount} min={1} max={100} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ borderRadius: '1rem', height: '3.125rem' }} disabled={boletaCreating || templates.length === 0}>
              {boletaCreating ? 'Generando...' : `Generar ${boletaCount} Boleta${boletaCount !== 1 ? 's' : ''}`}
            </button>
            {templates.length === 0 && (
              <p style={{ color: '#dc2626', fontSize: '0.8125rem', fontWeight: 700, textAlign: 'center' }}>
                Primero crea un diseño en "Boletas".
              </p>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Events;
