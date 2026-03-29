import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { Modal } from '../components/Modal';
import { Search, Edit2, Trash2, Ticket, ChevronRight, UserPlus, Plus, Minus, Calendar, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import TicketPreview from '../components/TicketPreview';
import Stepper from '../components/Stepper';
import EmptyState from '../components/EmptyState';
import { Users as UsersIcon } from 'lucide-react';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/clients`);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch { 
      setClients([]); 
    } finally {
      setLoading(false);
    }
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
    setEditName(c.name); 
    setEditEmail(c.email || ''); 
    setEditCedula(c.cedula || '');
    setAddTickets(0); 
    if (templates.length > 0) setAddTemplateId(templates[0].id);
    setIsEditing(false);
    setIsDetailOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedClient) return;
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.04em', margin: 0 }}>Clientes</h1>
          <p style={{ color: '#6b7280', fontWeight: 500, margin: '0.25rem 0 0' }}>Gestión centralizada de asistentes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)} style={{ padding: '0.75rem 1.5rem', height: '3.25rem' }}>
          <UserPlus size={18} /> <span>Nuevo Cliente</span>
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table style={{ minWidth: '700px', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#fff' }}>
                  <th style={{ padding: '1rem 1.5rem', width: '40%' }}>Cliente / Datos</th>
                  <th style={{ padding: '1rem', width: '25%' }}>Cédula</th>
                  <th style={{ padding: '1rem', width: '15%' }}>Boletas</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right', width: '20%' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4,5,6].map(i => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td style={{ padding: '0.75rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px' }} className="skeleton" />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div className="skeleton" style={{ height: '0.9rem', width: '60%' }} />
                          <div className="skeleton" style={{ height: '0.7rem', width: '40%' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}><div className="skeleton" style={{ height: '1rem', width: '80%' }} /></td>
                    <td style={{ padding: '0.75rem 1rem' }}><div className="skeleton" style={{ height: '1.5rem', width: '60px', borderRadius: '6px' }} /></td>
                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}><div className="skeleton" style={{ height: '2.25rem', width: '100px', marginLeft: 'auto', borderRadius: '0.75rem' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : clients.length === 0 ? (
        <EmptyState 
          icon={UsersIcon}
          title="Sin clientes registrados"
          description="Empieza agregando tu primer cliente para emitir boletas digitales."
          action={{
            label: "Registrar Cliente",
            onClick: () => setIsAddOpen(true)
          }}
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* BARRA DE BÚSQUEDA REFINADA */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', background: '#fafafa' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input 
                className="input" 
                placeholder="Buscar por nombre, cédula o correo..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ paddingLeft: '2.5rem', height: '2.75rem', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          <div className="table-wrap">
            <table style={{ minWidth: '700px', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#fff' }}>
                  <th style={{ padding: '1rem 1.5rem', width: '40%' }}>Cliente / Datos</th>
                  <th style={{ padding: '1rem', width: '25%' }}>Cédula</th>
                  <th style={{ padding: '1rem', width: '15%' }}>Boletas</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right', width: '20%' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td style={{ padding: '0.75rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ 
                          width: 36, height: 36, borderRadius: '10px', 
                          background: '#000', color: '#fff', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontWeight: 800, fontSize: '0.8rem' 
                        }}>
                          {c.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111' }}>{c.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>{c.email || 'Sin correo'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#4b5563', fontWeight: 700, fontSize: '0.85rem' }}>
                      {c.cedula || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ 
                        background: '#f3f4f6', color: '#374151', padding: '0.25rem 0.6rem', 
                        borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 
                      }}>
                        {c.totalTickets || 0} TOTAL
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>
                      <button className="btn btn-ghost" onClick={() => openDetail(c)} style={{ height: '2.25rem', padding: '0 0.75rem', fontSize: '0.8125rem' }}>
                        Gestionar <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL Modal */}
      <Modal isOpen={isDetailOpen && !!selectedClient} onClose={() => setIsDetailOpen(false)} title="Perfil del Cliente">
        {selectedClient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#f9fafb', padding: '1.25rem', borderRadius: '1.25rem', border: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem' }}>{selectedClient.name}</h3>
              <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.8125rem', fontWeight: 600 }}>CC: {selectedClient.cedula || '—'}</p>
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input className="input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nombre completo" />
                <input className="input" value={editCedula} onChange={e => setEditCedula(e.target.value)} placeholder="Cédula / ID" />
                <input className="input" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Correo electrónico" />
                
                <div style={{ padding: '1.25rem', background: '#f9fafb', borderRadius: '1.25rem', border: '1px solid #eee' }}>
                  <label className="input-label" style={{ marginBottom: '0.75rem', fontSize: '0.7rem' }}>AÑADIR NUEVAS BOLETAS</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Stepper value={addTickets} onChange={setAddTickets} min={0} max={100} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <select className="input" value={addEventId} onChange={e => setAddEventId(e.target.value)}>
                        <option value="">— Evento —</option>
                        {events.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                      </select>
                      <select className="input" value={addTemplateId} onChange={e => setAddTemplateId(e.target.value)}>
                        <option value="">— Diseño —</option>
                        {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpdate}>Guardar Cambios</button>
                  <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Volver</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <button className="btn" style={{ background: '#000', color: '#fff', padding: '1.25rem 0.5rem', flexDirection: 'column', borderRadius: '1.25rem' }} onClick={openBoletas}>
                  <Ticket size={24} style={{ marginBottom: '0.5rem' }} /> 
                  <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>BOLETAS</span>
                </button>
                <button className="btn" style={{ background: '#f3f4f6', color: '#111', padding: '1.25rem 0.5rem', flexDirection: 'column', borderRadius: '1.25rem' }} onClick={() => setIsEditing(true)}>
                  <Edit2 size={24} style={{ marginBottom: '0.5rem' }} /> 
                  <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>EDITAR</span>
                </button>
                <button className="btn" style={{ background: '#fef2f2', color: '#dc2626', padding: '1.25rem 0.5rem', flexDirection: 'column', borderRadius: '1.25rem' }} onClick={() => handleDeleteClient(selectedClient.id, selectedClient.name)}>
                  <Trash2 size={24} style={{ marginBottom: '0.5rem' }} /> 
                  <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>ELIMINAR</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* CREATE Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Registrar Invitado">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><label className="input-label">Información Personal</label><input className="input" placeholder="Nombre completo" value={name} onChange={e => setName(e.target.value)} required /></div>
          <input className="input" placeholder="Cédula / Documento" value={cedula} onChange={e => setCedula(e.target.value)} required />
          <input className="input" type="email" placeholder="Correo (Opcional)" value={email} onChange={e => setEmail(e.target.value)} />
          
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '1.25rem', border: '1px solid #eee' }}>
            <label className="input-label" style={{ marginBottom: '0.5rem' }}>Boletas y Evento</label>
            <Stepper value={ticketCount} onChange={setTicketCount} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
              <select className="input" value={eventId} onChange={e => setEventId(e.target.value)} required>
                <option value="">— Evento —</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)} required>
                <option value="">— Diseño —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '3.5rem' }} disabled={creating}>{creating ? 'Procesando...' : 'Emitir Boletas'}</button>
        </form>
      </Modal>

      {/* BOLETAS Modal */}
      <Modal isOpen={isBoletasOpen} onClose={() => setIsBoletasOpen(false)} title="Listado de Boletas" maxWidth={680}>
        {boletasLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="spin" size={32} /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {clientBoletas.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>Este cliente no tiene boletas activas.</p>
            ) : (
              clientBoletas.map(b => (
                <div key={b.id} style={{ 
                  border: '1px solid #eee', 
                  borderRadius: '1.5rem', 
                  padding: '1.25rem', 
                  background: '#fff',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>#{b.consecutivo} - {b.eventName}</span>
                      
                      {/* ETIQUETAS DE ESTADO (PEDIDAS POR EL USUARIO) */}
                      {b.used ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', background: '#ecfdf5', padding: '0.25rem 0.6rem', borderRadius: 'full', fontSize: '0.65rem', fontWeight: 900, border: '1px solid #10b981' }}>
                          <CheckCircle2 size={12} /> ESCANEADA
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4b5563', background: '#f3f4f6', padding: '0.25rem 0.6rem', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 900, border: '1px solid #d1d5db' }}>
                          <Clock size={12} /> SIN ESCANEAR
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleBoletaDelete(b.id, b.consecutivo)}
                      style={{ color: '#dc2626', border: 'none', background: '#fef2f2', width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <TicketPreview client={selectedClient} ticket={b} template={templates.find(t => t.id === b.templateId)} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>

      {/* DELETE Modal */}
      <Modal isOpen={!!deleteDialog} onClose={() => setDeleteDialog(null)} title={deleteDialog?.title || 'Confirmar'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#4b5563' }}>{deleteDialog?.message}</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setDeleteDialog(null)}>Cancelar</button>
            <button className="btn" style={{ background: '#dc2626', color: '#fff' }} onClick={() => { deleteDialog?.onConfirm(); setDeleteDialog(null); }}>Si, Eliminar</button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Clients;
