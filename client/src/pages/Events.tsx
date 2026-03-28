import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Save, Plus, ImageIcon, Trash2, Edit2, MapPin, Calendar, Clock, 
  Ticket, AlertCircle, CheckCircle2, QrCode, Palette, X, 
  ChevronRight, CornerDownRight, Smartphone, Info, Send 
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import Stepper from '../components/Stepper';

interface Event {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  imageUrl: string;
  location?: string;
}

const emptyForm = { name: '', date: '', startTime: '', endTime: '', imageUrl: '', location: '' };

/* Drag/drop image uploader */
const ImageUploader = ({ value, onChange }: { value: string; onChange: (b64: string) => void }) => {
  const [dragging, setDragging] = useState(false);
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onClick={() => document.getElementById('event-img-up')?.click()}
      style={{
        width: '100%', height: 160, borderRadius: '1rem', border: '2px dashed #e5e7eb',
        background: dragging ? '#f3f4f6' : '#f9fafb', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden'
      }}
    >
      {value ? (
        <img src={value} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
      ) : (
        <>
          <ImageIcon size={32} style={{ color: '#9ca3af', marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>Click o Arrastra Imagen</span>
        </>
      )}
      <input id="event-img-up" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
};

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  
  // Modals & Contexts
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);
  const [zoomedBoleta, setZoomedBoleta] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  // Quick Boleta gen
  const [isBoletaModalOpen, setIsBoletaModalOpen] = useState(false);
  const [boletaEvent, setBoletaEvent] = useState<Event | null>(null);
  const [boletaName, setBoletaName] = useState('');
  const [boletaCedula, setBoletaCedula] = useState('');
  const [boletaEmail, setBoletaEmail] = useState('');
  const [boletaCount, setBoletaCount] = useState(1);
  const [boletaTemplateId, setBoletaTemplateId] = useState('');
  const [boletaCreating, setBoletaCreating] = useState(false);

  // View boletas
  const [isEventBoletasOpen, setIsEventBoletasOpen] = useState(false);
  const [eventBoletasData, setEventBoletasData] = useState<any[]>([]);
  const [eventBoletasLoading, setEventBoletasLoading] = useState(false);
  const [boletaEventContext, setBoletaEventContext] = useState<Event | null>(null);

  // Design modal
  const [isDesignOpen, setIsDesignOpen] = useState(false);
  const [designEvent, setDesignEvent] = useState<Event | null>(null);
  const [linkedTemplateIds, setLinkedTemplateIds] = useState<string[]>([]);
  const [savingDesign, setSavingDesign] = useState(false);
  const [designSaved, setDesignSaved] = useState(false);

  const linkedTemplates = templates.filter(t => linkedTemplateIds.includes(t.id));

  const fetchEvents = async () => {
    try {
      const r = await fetch(`${API_URL}/api/events`);
      const d = await r.json();
      setEvents(Array.isArray(d) ? d : []);
    } finally { setLoading(false); }
  };

  const fetchTemplates = async () => {
    const r = await fetch(`${API_URL}/api/templates`);
    const d = await r.json();
    setTemplates(Array.isArray(d) ? d.filter((t: any) => t.name) : []);
  };

  useEffect(() => { fetchEvents(); fetchTemplates(); }, []);

  const openDeleteDialog = (title: string, message: string, onConfirm: () => void) => {
    setDeleteDialog({ isOpen: true, title, message, onConfirm });
  };

  const close = () => { setIsModalOpen(false); setEditing(null); setForm(emptyForm); };

  const openEdit = (event: Event) => {
    setEditing(event);
    setForm({ 
      name: event.name, 
      date: event.date, 
      startTime: event.startTime, 
      endTime: event.endTime, 
      imageUrl: event.imageUrl,
      location: event.location || ''
    });
    setIsModalOpen(true);
  };

  const openEventBoletas = async (event: Event) => {
    setBoletaEventContext(event);
    setIsEventBoletasOpen(true);
    setEventBoletasLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/events/${event.id}/boletas`);
      const d = await r.json();
      setEventBoletasData(Array.isArray(d) ? d : []);
    } finally { setEventBoletasLoading(false); }
  };

  const handleDeleteBoleta = async (boletaId: string) => {
    await fetch(`${API_URL}/api/boletas/${boletaId}`, { method: 'DELETE' });
    setEventBoletasData(prev => prev.filter(b => b.id !== boletaId));
  };

  const openDesign = (event: Event) => {
    setDesignEvent(event);
    setDesignSaved(false);
    const linked = templates.filter(t => t.eventId === event.id).map(t => t.id);
    setLinkedTemplateIds(linked);
    setIsDesignOpen(true);
  };

  const toggleTemplateLink = (id: string) => {
    setLinkedTemplateIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const handleSaveDesign = async () => {
    if (!designEvent) return;
    setSavingDesign(true);
    try {
      await Promise.all(templates.map(async (tpl) => {
        const isSelected = linkedTemplateIds.includes(tpl.id);
        const wasSelectedByThisEvent = tpl.eventId === designEvent.id;
        if (isSelected && !wasSelectedByThisEvent) {
          await fetch(`${API_URL}/api/templates/${tpl.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tpl, eventId: designEvent.id })
          });
        } else if (!isSelected && wasSelectedByThisEvent) {
          await fetch(`${API_URL}/api/templates/${tpl.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tpl, eventId: null })
          });
        }
      }));
      await fetchTemplates();
      setDesignSaved(true);
    } finally { setSavingDesign(false); }
  };

  const openBoleta = (e: Event) => {
    setBoletaEvent(e);
    setBoletaName(''); setBoletaCedula(''); setBoletaEmail(''); setBoletaCount(1);
    const eventTemplates = templates.filter(t => t.eventId === e.id);
    if (eventTemplates.length > 0) setBoletaTemplateId(eventTemplates[0].id);
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
        body: JSON.stringify({ 
          name: boletaName, email: boletaEmail, cedula: boletaCedula, 
          ticketCount: boletaCount, templateId: boletaTemplateId, eventId: boletaEvent.id 
        })
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
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(form) 
      });
      if (res.ok) { close(); fetchEvents(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>Gestión de Eventos</h1>
          <p style={{ color: '#6b7280', marginTop: '0.375rem', fontWeight: 500 }}>Controla tus eventos, boletas y diseños desde un solo lugar.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Crear Evento
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280', fontSize: '1.125rem', fontWeight: 600 }}>Cargando eventos...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {events.map(event => {
            const s = getStatus(event);
            const hasLinkedDesign = templates.some(t => t.eventId === event.id);
            return (
              <div key={event.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 180, background: '#f3f4f6', position: 'relative' }}>
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}><ImageIcon size={48} /></div>
                  )}
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <span className={s.cls} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: '0.75rem', fontWeight: 800 }}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1.125rem', marginBottom: '0.75rem' }}>{event.name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
                      <Calendar size={14} /> {event.date}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
                      <Clock size={14} /> {event.startTime} – {event.endTime}
                    </div>
                    {event.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
                        <MapPin size={14} /> {event.location}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1, minWidth: 0, fontSize: '0.75rem', padding: '0.5rem 0.25rem' }} onClick={() => openEventBoletas(event)}>
                      <Ticket size={12} /> Boletas
                    </button>
                    <button 
                      className="btn" 
                      style={{ flex: 1, minWidth: 0, fontSize: '0.75rem', padding: '0.5rem 0.25rem', background: hasLinkedDesign ? '#fef3c7' : '#f3f4f6', color: hasLinkedDesign ? '#d97706' : '#6b7280' }} 
                      onClick={() => openDesign(event)}
                    >
                      <Palette size={12} /> Diseño
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.5rem', flexShrink: 0, borderRadius: '0.75rem' }} onClick={() => openEdit(event)}>
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn" 
                      style={{ padding: '0.5rem', flexShrink: 0, borderRadius: '0.75rem', background: '#fef2f2', color: '#dc2626' }} 
                      onClick={() => openDeleteDialog('Eliminar Evento', `¿Estás seguro de que deseas eliminar "${event.name}"?`, () => handleDelete(event.id))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALS */}
      <Modal isOpen={isModalOpen} onClose={close} title={editing ? 'Editar Evento' : 'Nuevo Evento'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <ImageUploader value={form.imageUrl} onChange={v => setForm({ ...form, imageUrl: v })} />
          <div>
            <label className="input-label">Nombre del Evento</label>
            <input className="input" placeholder="Ej: Concierto" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="input-label">Ubicación</label>
            <input className="input" placeholder="Ej: Auditorio Central, Ciudad" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Fecha</label>
            <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input className="input" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
            <input className="input" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ borderRadius: '1rem', marginTop: '0.5rem' }} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </form>
      </Modal>

      {/* BOLETAS Modal */}
      <Modal isOpen={isEventBoletasOpen} onClose={() => setIsEventBoletasOpen(false)} title={`Boletas — ${boletaEventContext?.name || ''}`} maxWidth={660}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ color: '#6b7280', fontWeight: 600 }}>{eventBoletasData.length} boletas</p>
            <button className="btn btn-primary" style={{ borderRadius: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => { setIsEventBoletasOpen(false); if (boletaEventContext) openBoleta(boletaEventContext); }}><Plus size={14} /> Agregar</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
            {eventBoletasData.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', gap: '1rem' }}>
                <div style={{ background: '#fff', padding: '0.2rem', borderRadius: '0.3rem', border: '1px solid #eee' }}><QRCodeSVG value={b.code} size={32} /></div>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setZoomedBoleta(b)}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem' }}>{b.client?.name} #{b.consecutivo}</p>
                </div>
                <button 
                  style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '0.4rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                  onClick={() => openDeleteDialog('Eliminar Boleta', `¿Borrar la #${b.consecutivo}?`, () => handleDeleteBoleta(b.id))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ASIGNAR DISEÑO Modal */}
      <Modal isOpen={isDesignOpen} onClose={() => setIsDesignOpen(false)} title="Asignar Diseños" maxWidth={600}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
            {templates.map(t => (
              <div 
                key={t.id} 
                onClick={() => toggleTemplateLink(t.id)}
                style={{ border: `2px solid ${linkedTemplateIds.includes(t.id) ? '#2563eb' : '#eee'}`, borderRadius: '1rem', cursor: 'pointer', overflow: 'hidden' }}
              >
                <div style={{ height: 80, background: '#eee' }}>{t.imageUrl && <img src={t.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={t.name} />}</div>
                <p style={{ padding: '0.4rem', margin: 0, fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>{t.name}</p>
              </div>
            ))}
          </div>
          {designSaved && <div style={{ color: '#16a34a', fontWeight: 700, textAlign: 'center' }}>¡Diseños actualizados!</div>}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setIsDesignOpen(false)}>Cerrar</button>
            <button className="btn btn-primary" disabled={savingDesign} onClick={handleSaveDesign}>{savingDesign ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      </Modal>

      {/* GENERAR Modal */}
      <Modal isOpen={isBoletaModalOpen} onClose={() => setIsBoletaModalOpen(false)} title="Generar Boletas">
        <form onSubmit={handleBoletaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input className="input" placeholder="Nombre" value={boletaName} onChange={e => setBoletaName(e.target.value)} required />
          <input className="input" placeholder="Cédula" value={boletaCedula} onChange={e => setBoletaCedula(e.target.value)} required />
          <input className="input" type="email" placeholder="Correo" value={boletaEmail} onChange={e => setBoletaEmail(e.target.value)} />
          <select className="input" value={boletaTemplateId} onChange={e => setBoletaTemplateId(e.target.value)} required>
            <option value="">Selecciona categoría...</option>
            {templates.filter(t => t.eventId === boletaEvent?.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Stepper value={boletaCount} onChange={setBoletaCount} min={1} />
          <button type="submit" className="btn btn-primary" disabled={boletaCreating}>{boletaCreating ? 'Generando...' : 'Generar'}</button>
        </form>
      </Modal>

      {/* ZOOM Modal */}
      <Modal isOpen={!!zoomedBoleta} onClose={() => setZoomedBoleta(null)} title="Vista Previa QR">
        {zoomedBoleta && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <QRCodeSVG value={zoomedBoleta.code} size={260} />
            </div>
            <h3 style={{ margin: 0 }}>#{zoomedBoleta.consecutivo} - {zoomedBoleta.client?.name}</h3>
          </div>
        )}
      </Modal>

      {/* DELETE DIALOG */}
      <Modal isOpen={!!deleteDialog} onClose={() => setDeleteDialog(null)} title={deleteDialog?.title || 'Eliminar'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{deleteDialog?.message}</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setDeleteDialog(null)}>Cancelar</button>
            <button className="btn" style={{ background: '#dc2626', color: '#fff' }} onClick={() => { deleteDialog?.onConfirm(); setDeleteDialog(null); }}>Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Events;
