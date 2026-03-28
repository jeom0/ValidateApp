import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { Modal } from '../components/Modal';
import { Search, Edit2, Trash2, Ticket, ChevronRight, UserPlus, Plus, Minus, Calendar } from 'lucide-react';
import TicketPreview from '../components/TicketPreview';

/* ──────────────────────────────────────────────
   +/- Quantity Stepper
────────────────────────────────────────────── */
const Stepper = ({ value, onChange, min = 1, max = 100 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: '1.5px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden', height: '3rem' }}>
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - 1))}
      style={{ width: 44, height: '100%', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
      onMouseLeave={e => (e.currentTarget.style.background = '#f9fafb')}
    >
      <Minus size={16} />
    </button>
    <span style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', background: 'white', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 48 }}>
      {value}
    </span>
    <button
      type="button"
      onClick={() => onChange(Math.min(max, value + 1))}
      style={{ width: 44, height: '100%', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
      onMouseLeave={e => (e.currentTarget.style.background = '#f9fafb')}
    >
      <Plus size={16} />
    </button>
  </div>
);

/* ──────────────────────────────────────────────
   Main Component
────────────────────────────────────────────── */
const Clients: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBoletasOpen, setIsBoletasOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientBoletas, setClientBoletas] = useState<any[]>([]);
  const [templateToRender, setTemplateToRender] = useState<any>(null);
  const [boletasLoading, setBoletasLoading] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cedula, setCedula] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [templateId, setTemplateId] = useState('');
  const [eventId, setEventId] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit form
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCedula, setEditCedula] = useState('');
  const [addTickets, setAddTickets] = useState(0);
  const [addEventId, setAddEventId] = useState('');
  const [addEventError, setAddEventError] = useState(false);

  const fetchClients = async () => {
    const res = await fetch(`${API_URL}/api/clients`);
    setClients(await res.json());
  };

  useEffect(() => {
    fetchClients();
    fetch(`${API_URL}/api/templates`).then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : [];
      setTemplates(arr);
      if (arr.length > 0) setTemplateId(arr[0].id);
    });
    fetch(`${API_URL}/api/events`).then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : [];
      setEvents(arr);
      if (arr.length > 0) { setEventId(arr[0].id); setAddEventId(arr[0].id); }
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, cedula, ticketCount, templateId, eventId })
      });
      setIsAddOpen(false);
      setName(''); setEmail(''); setCedula(''); setTicketCount(1);
      fetchClients();
    } finally { setCreating(false); }
  };

  const openDetail = (c: any) => {
    setSelectedClient(c);
    setEditName(c.name); setEditEmail(c.email || ''); setEditCedula(c.cedula || '');
    setAddTickets(0); setIsEditing(false);
    setIsDetailOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedClient) return;
    // Validate: event required if adding boletas
    if (addTickets > 0 && !addEventId) {
      setAddEventError(true);
      return;
    }
    setAddEventError(false);
    await fetch(`${API_URL}/api/clients/${selectedClient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, email: editEmail, cedula: editCedula, addTickets, eventId: addEventId })
    });
    setIsEditing(false); setAddTickets(0);
    setSelectedClient({ ...selectedClient, name: editName, email: editEmail, cedula: editCedula });
    fetchClients();
  };

  const handleDelete = async () => {
    if (!selectedClient || !confirm(`¿Eliminar a ${selectedClient.name} y todas sus boletas?`)) return;
    await fetch(`${API_URL}/api/clients/${selectedClient.id}`, { method: 'DELETE' });
    setIsDetailOpen(false); fetchClients();
  };

  const openBoletas = async () => {
    if (!selectedClient) return;
    setIsBoletasOpen(true);
    setBoletasLoading(true);
    setClientBoletas([]);
    try {
      const res = await fetch(`${API_URL}/api/clients/${selectedClient.id}/boletas`);
      const data = await res.json();
      setClientBoletas(Array.isArray(data) ? data : []);
      const firstWithTemplate = Array.isArray(data) ? data.find((t: any) => t.templateId) : null;
      const tpl = firstWithTemplate
        ? templates.find((x: any) => x.id === firstWithTemplate.templateId) || templates[0]
        : templates[0] || null;
      setTemplateToRender(tpl);
    } finally { setBoletasLoading(false); }
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.cedula && c.cedula.toLowerCase().includes(search.toLowerCase()))
  );

  // Per-boleta edit
  const [editingBoleta, setEditingBoleta] = useState<any>(null);
  const [boletaEditEventId, setBoletaEditEventId] = useState('');

  const handleBoletaEdit = async () => {
    if (!editingBoleta) return;
    await fetch(`${API_URL}/api/boletas/${editingBoleta.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: boletaEditEventId })
    });
    setEditingBoleta(null);
    // Refresh boletas list
    const res = await fetch(`${API_URL}/api/clients/${selectedClient.id}/boletas`);
    const data = await res.json();
    setClientBoletas(Array.isArray(data) ? data : []);
  };

  const handleBoletaDelete = async (boletaId: string) => {
    if (!confirm('¿Eliminar esta boleta? Esta acción no se puede deshacer.')) return;
    await fetch(`${API_URL}/api/boletas/${boletaId}`, { method: 'DELETE' });
    setClientBoletas(prev => prev.filter(b => b.id !== boletaId));
    fetchClients();
  };

  // Group boletas by event (eventId → eventName)
  const boletasByEvent = clientBoletas.reduce((acc: Record<string, { eventName: string; boletas: any[] }>, b: any) => {
    const key = b.eventId || '__sin_evento__';
    const label = b.eventName || 'Sin Evento';
    if (!acc[key]) acc[key] = { eventName: label, boletas: [] };
    acc[key].boletas.push(b);
    return acc;
  }, {});


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Gestión de Clientes
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.375rem', fontWeight: 500 }}>
            Administra asistentes y sus boletas en tiempo real.
          </p>
        </div>
        <button className="btn btn-primary" style={{ borderRadius: '1.25rem', padding: '0.875rem 1.5rem' }} onClick={() => setIsAddOpen(true)}>
          <UserPlus size={20} /> Nuevo Cliente
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={17} style={{ position: 'absolute', left: '2rem', color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: '2.5rem', height: '2.75rem', borderRadius: '0.875rem', fontSize: '0.9375rem' }}
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrap" style={{ padding: '0.5rem 1rem 1rem' }}>
          <table>
            <thead>
              <tr>
                {['Cliente', 'Cédula', 'Correo', 'Boletas', ''].map(h => (
                  <th key={h} style={{ padding: '0.625rem 0.875rem', textAlign: h === '' ? 'right' : 'left', fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ background: 'white' }}>
                  <td style={{ padding: '0.875rem', borderRadius: '0.875rem 0 0 0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', flexShrink: 0 }}>
                        {c.name?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700 }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>{c.cedula || '—'}</td>
                  <td style={{ padding: '0.875rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>{c.email || '—'}</td>
                  <td style={{ padding: '0.875rem' }}>
                    <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: '99px', padding: '0.2rem 0.75rem', fontSize: '0.78rem', fontWeight: 700 }}>
                      {c.totalTickets || 0} boleta{c.totalTickets !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem', textAlign: 'right', borderRadius: '0 0.875rem 0.875rem 0' }}>
                    <button className="btn btn-ghost" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', borderRadius: '0.75rem' }} onClick={() => openDetail(c)}>
                      Gestionar <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontWeight: 600 }}>No se encontraron clientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD MODAL ── */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Registrar Nuevo Cliente">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div>
            <label className="input-label">Nombre Completo</label>
            <input className="input" placeholder="Ej. María García" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="input-label">Cédula</label>
            <input className="input" placeholder="Ej. 123456789" value={cedula} onChange={e => setCedula(e.target.value)} required />
          </div>
          <div>
            <label className="input-label">Correo Electrónico (Opcional)</label>
            <input className="input" type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div>
            <label className="input-label" style={{ marginBottom: '0.625rem', display: 'block' }}>Cantidad de Boletas</label>
            <Stepper value={ticketCount} onChange={setTicketCount} min={1} max={100} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="input-label" style={{ margin: 0 }}>Plantilla de Diseño</label>
                <a href="/admin/plantilla" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}>+ Crear</a>
              </div>
              <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)} style={{ cursor: 'pointer' }}>
                {templates.length === 0 && <option value="">Sin plantillas</option>}

                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="input-label" style={{ margin: 0 }}>Evento Destino</label>
                <a href="/admin/eventos" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}>+ Crear</a>
              </div>
              <select className="input" value={eventId} onChange={e => setEventId(e.target.value)} style={{ cursor: 'pointer' }}>
                {events.length === 0 && <option value="">Sin eventos</option>}
                {events.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ borderRadius: '1rem', height: '3.125rem', marginTop: '0.25rem' }} disabled={creating || templates.length === 0}>
            {creating ? 'Generando...' : `Generar ${ticketCount} Boleta${ticketCount !== 1 ? 's' : ''}`}
          </button>
          {templates.length === 0 && (
            <p style={{ color: '#dc2626', fontSize: '0.8125rem', fontWeight: 700, textAlign: 'center' }}>
              Primero crea una plantilla en "Plantilla Boletas".
            </p>
          )}
        </form>
      </Modal>

      {/* ── DETAIL MODAL ── */}
      <Modal isOpen={isDetailOpen && !!selectedClient} onClose={() => setIsDetailOpen(false)} title="Perfil del Cliente">
        {selectedClient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Avatar + info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: '#f9fafb', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
              <div style={{ width: 56, height: 56, borderRadius: '1rem', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 900, flexShrink: 0 }}>
                {selectedClient.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.03em' }}>{selectedClient.name}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                  C.C: {selectedClient.cedula || '—'} · {selectedClient.email || 'Sin correo'} · <strong>{selectedClient.totalTickets || 0}</strong> boleta{selectedClient.totalTickets !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Nombre</label>
                  <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Cédula</label>
                  <input className="input" value={editCedula} onChange={e => setEditCedula(e.target.value)} required />
                </div>
                <div>
                  <label className="input-label">Correo</label>
                  <input className="input" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                </div>
                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '1rem', border: `1px solid ${addEventError ? '#fca5a5' : '#e5e7eb'}`, transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label className="input-label" style={{ margin: 0 }}>Agregar Boletas Adicionales</label>
                    {addTickets > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>Evento obligatorio</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                    <Stepper value={addTickets} onChange={n => { setAddTickets(n); if (n === 0) setAddEventError(false); }} min={0} max={100} />
                    <div>
                      <select
                        className="input"
                        value={addEventId}
                        onChange={e => { setAddEventId(e.target.value); setAddEventError(false); }}
                        style={{ cursor: 'pointer', height: '3rem', borderColor: addEventError ? '#f87171' : undefined, background: addEventError ? '#fff5f5' : undefined }}
                        required={addTickets > 0}
                      >
                        <option value="">— Seleccionar evento —</option>
                        {events.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                      </select>
                      {addEventError && <p style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.375rem' }}>Debes seleccionar un evento para agregar boletas.</p>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1, borderRadius: '1rem' }} type="button" onClick={handleUpdate}>Guardar Cambios</button>
                  <button className="btn btn-ghost" style={{ borderRadius: '1rem' }} type="button" onClick={() => setIsEditing(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {[
                  { label: 'Boletas', icon: <Ticket size={22} />, bg: '#eff6ff', color: '#2563eb', action: () => { openBoletas(); } },
                  { label: 'Editar', icon: <Edit2 size={22} />, bg: '#f9fafb', color: '#374151', action: () => setIsEditing(true) },
                  { label: 'Eliminar', icon: <Trash2 size={22} />, bg: '#fef2f2', color: '#dc2626', action: handleDelete },
                ].map(item => (
                  <button key={item.label} type="button" onClick={item.action} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    padding: '1.125rem 0.5rem', border: 'none', borderRadius: '1rem',
                    background: item.bg, color: item.color, cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.8125rem', transition: 'filter 0.2s'
                  }}
                    onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.95)')}
                    onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── BOLETAS MODAL ── */}
      <Modal isOpen={isBoletasOpen} onClose={() => setIsBoletasOpen(false)} title={`Boletas de ${selectedClient?.name || ''}`} maxWidth={680}>
        {boletasLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ width: 36, height: 36, border: '4px solid #e5e7eb', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Cargando boletas...</p>
          </div>
        ) : clientBoletas.length === 0 ? (
          /* Empty state */
          <div style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={32} style={{ color: '#d1d5db' }} />
            </div>
            <p style={{ fontWeight: 700, color: '#6b7280', fontSize: '1rem' }}>Este cliente no tiene boletas registradas.</p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Edita el perfil para asignarle boletas a un evento.</p>
          </div>
        ) : (
          /* Grouped by event */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {Object.entries(boletasByEvent).map(([key, group]) => (
              <div key={key}>
                {/* Event header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.625rem 1rem', background: '#f9fafb', borderRadius: '0.875rem', border: '1px solid #e5e7eb' }}>
                  <Calendar size={16} style={{ color: '#6b7280' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#374151' }}>{group.eventName}</span>
                  <span style={{ marginLeft: 'auto', background: '#000', color: '#fff', borderRadius: '99px', padding: '0.15rem 0.625rem', fontSize: '0.7rem', fontWeight: 700 }}>
                    {group.boletas.length} boleta{group.boletas.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Boletas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {group.boletas.map((boleta: any, idx: number) => (
                    <div key={boleta.id} style={{ position: 'relative', background: '#fff', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                      {/* Top Action Bar with Thumbnail */}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #f3f4f6', gap: '1rem', background: '#f9fafb' }}>
                        {boleta.eventImageUrl ? (
                          <img src={boleta.eventImageUrl} alt="Evento" style={{ width: 48, height: 48, borderRadius: '0.5rem', objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb' }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: '0.5rem', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Ticket size={20} style={{ color: '#9ca3af' }} />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: '#111827' }}>Boleta #{boleta.consecutivo}</h4>
                          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280', fontWeight: 600 }}>Ref: <span style={{ fontFamily: 'monospace' }}>{boleta.code.substring(0,8).toUpperCase()}</span></p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '0.5rem', borderRadius: '0.625rem' }}
                            onClick={() => { setEditingBoleta(boleta); setBoletaEditEventId(boleta.eventId || ''); }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '0.5rem', borderRadius: '0.625rem' }}
                            onClick={() => handleBoletaDelete(boleta.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Editing state */}
                      {editingBoleta?.id === boleta.id ? (
                        <div style={{ padding: '1rem', background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e3a8a', display: 'block', marginBottom: '0.5rem' }}>Reasignar Evento</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select className="input" style={{ flex: 1, padding: '0.5rem', height: '2.5rem' }} value={boletaEditEventId} onChange={e => setBoletaEditEventId(e.target.value)}>
                              <option value="">— Ningún evento —</option>
                              {events.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                            </select>
                            <button type="button" className="btn btn-primary" style={{ padding: '0 1rem', borderRadius: '0.5rem' }} onClick={handleBoletaEdit}>Guardar</button>
                            <button type="button" className="btn btn-ghost" style={{ padding: '0 1rem', borderRadius: '0.5rem' }} onClick={() => setEditingBoleta(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : null}

                      {/* Ticket Preview Render */}
                      <div style={{ padding: '1rem', background: '#fff' }}>
                        <TicketPreview client={selectedClient} ticket={boleta} template={templateToRender} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </Modal>
    </div>
  );
};

export default Clients;
