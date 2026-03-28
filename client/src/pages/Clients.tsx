import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { Modal } from '../components/Modal';
import { Search, Edit2, Trash2, Ticket, ChevronRight, UserPlus, Plus, Minus, Calendar, CheckCircle2 } from 'lucide-react';
import TicketPreview from '../components/TicketPreview';
import Stepper from '../components/Stepper';

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
  const [boletasLoading, setBoletasLoading] = useState(false);
  
  // Delete Dialog
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  const openDeleteDialog = (title: string, message: string, onConfirm: () => void) => {
    setDeleteDialog({ isOpen: true, title, message, onConfirm });
  };

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
  const [addTemplateId, setAddTemplateId] = useState('');
  const [addEventError, setAddEventError] = useState(false);

  const fetchClients = async () => {
    const res = await fetch(`${API_URL}/api/clients`);
    const data = await res.json();
    setClients(Array.isArray(data) ? data : []);
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
      setAddTickets(0); 
      if (templates.length > 0) setAddTemplateId(templates[0].id);
      setIsEditing(false);
      setIsDetailOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedClient) return;
    if (addTickets > 0 && !addEventId) {
      setAddEventError(true);
      return;
    }
    setAddEventError(false);
    await fetch(`${API_URL}/api/clients/${selectedClient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, email: editEmail, cedula: editCedula, addTickets, eventId: addEventId, templateId: addTemplateId })
    });
    setIsEditing(false); setAddTickets(0);
    setSelectedClient({ ...selectedClient, name: editName, email: editEmail, cedula: editCedula });
    fetchClients();
  };

  const handleDeleteClient = (id: string, clientName: string) => {
    openDeleteDialog(
      'Eliminar Cliente',
      `¿Deseas eliminar a "${clientName}"? Se borrarán todas sus boletas definitivamente.`,
      async () => {
        await fetch(`${API_URL}/api/clients/${id}`, { method: 'DELETE' });
        setIsDetailOpen(false);
        fetchClients();
      }
    );
  };

  const openBoletas = async () => {
    if (!selectedClient) return;
    setIsBoletasOpen(true);
    setBoletasLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/clients/${selectedClient.id}/boletas`);
      const data = await res.json();
      setClientBoletas(Array.isArray(data) ? data : []);
    } finally { setBoletasLoading(false); }
  };

  const handleBoletaDelete = (boletaId: string, consecutivo: number) => {
    openDeleteDialog(
      'Eliminar Boleta',
      `¿Deseas eliminar la boleta #${consecutivo} de ${selectedClient.name}?`,
      async () => {
        await fetch(`${API_URL}/api/boletas/${boletaId}`, { method: 'DELETE' });
        setClientBoletas(prev => prev.filter(b => b.id !== boletaId));
        fetchClients();
      }
    );
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.cedula && c.cedula.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Clientes</h1>
          <p style={{ color: '#6b7280', fontWeight: 500 }}>Gestiona la base de datos de asistentes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <UserPlus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
          <input 
            className="input" 
            placeholder="Buscar por nombre, cédula o correo..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="table-wrap" style={{ padding: '0.5rem 1rem 1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Cédula</th>
                <th>Boletas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{c.name?.charAt(0).toUpperCase()}</div>
                      <span style={{ fontWeight: 700 }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ color: '#6b7280' }}>{c.cedula || '—'}</td>
                  <td><span className="badge badge-gray">{c.totalTickets || 0} boletas</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost" onClick={() => openDetail(c)}>Gestionar <ChevronRight size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL Modal */}
      <Modal isOpen={isDetailOpen && !!selectedClient} onClose={() => setIsDetailOpen(false)} title="Detalle del Cliente">
        {selectedClient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#f9fafb', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem' }}>{selectedClient.name}</h3>
              <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>CC: {selectedClient.cedula || '—'} · {selectedClient.email || '—'}</p>
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input className="input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nombre" />
                <input className="input" value={editCedula} onChange={e => setEditCedula(e.target.value)} placeholder="Cédula" />
                <input className="input" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Correo" />
                
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '1rem', border: '1px solid #eee' }}>
                  <label className="input-label">Agregar Boletas</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', alignItems: 'center' }}>
                    <Stepper value={addTickets} onChange={n => { setAddTickets(n); if (n === 0) setAddEventError(false); }} min={0} max={100} />
                    <select className="input" value={addEventId} onChange={e => setAddEventId(e.target.value)} style={{ cursor: 'pointer', height: '3rem' }}>
                      <option value="">— Evento —</option>
                      {events.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>
                    <select className="input" value={addTemplateId} onChange={e => setAddTemplateId(e.target.value)} style={{ cursor: 'pointer', height: '3rem' }}>
                      <option value="">— Diseño —</option>
                      {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpdate}>Guardar</button>
                  <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <button className="btn" style={{ background: '#eff6ff', color: '#2563eb', padding: '1rem', flexDirection: 'column' }} onClick={openBoletas}><Ticket /> Boletas</button>
                <button className="btn" style={{ background: '#f3f4f6', color: '#374151', padding: '1rem', flexDirection: 'column' }} onClick={() => setIsEditing(true)}><Edit2 /> Editar</button>
                <button className="btn" style={{ background: '#fef2f2', color: '#dc2626', padding: '1rem', flexDirection: 'column' }} onClick={() => handleDeleteClient(selectedClient.id, selectedClient.name)}><Trash2 /> Eliminar</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* CREATE Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Registrar Cliente">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input className="input" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} required />
          <input className="input" placeholder="Cédula" value={cedula} onChange={e => setCedula(e.target.value)} required />
          <input className="input" type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} />
          <Stepper value={ticketCount} onChange={setTicketCount} />
          <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="input" value={eventId} onChange={e => setEventId(e.target.value)}>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Procesando...' : 'Registrar'}</button>
        </form>
      </Modal>

      {/* BOLETAS Modal */}
      <Modal isOpen={isBoletasOpen} onClose={() => setIsBoletasOpen(false)} title="Boletas del Cliente" maxWidth={680}>
        {boletasLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
            {clientBoletas.map(b => (
              <div key={b.id} style={{ border: '1px solid #eee', borderRadius: '1rem', padding: '1rem', background: '#f9fafb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 800 }}>#{b.consecutivo} - {b.eventName}</span>
                  <button style={{ color: '#dc2626', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => handleBoletaDelete(b.id, b.consecutivo)}><Trash2 size={16} /></button>
                </div>
                <TicketPreview client={selectedClient} ticket={b} template={templates.find(t => t.id === b.templateId)} />
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* DELETE Modal */}
      <Modal isOpen={!!deleteDialog} onClose={() => setDeleteDialog(null)} title={deleteDialog?.title || 'Confirmar'}>
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

export default Clients;
