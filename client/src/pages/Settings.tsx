import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertCircle, Save, Lock, User, KeyRound } from 'lucide-react';
import { API_URL } from '../config';

const Settings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${API_URL}/api/admin/credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newUsername, newPassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Credenciales actualizadas exitosamente.' });
        setCurrentPassword('');
        setNewUsername('');
        setNewPassword('');
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al actualizar credenciales.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
          Configuración
        </h1>
        <p style={{ color: '#6b7280', marginTop: '0.375rem', fontWeight: 500 }}>
          Modifica las credenciales de acceso principal para el administrador.
        </p>
      </div>

      <div className="card" style={{ padding: '0', maxWidth: '600px', overflow: 'hidden' }}>
        <div style={{ 
          background: 'linear-gradient(to right, #111827, #374151)', 
          padding: '1.5rem', 
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '1rem', background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>Seguridad de la Cuenta</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Protege el panel de administración ValidateApp PRO.</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Current Password - Required */}
          <div style={{ background: '#f9fafb', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#111827' }}>
              <Lock size={14} /> Contraseña Actual <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input 
              className="input"
              type="password"
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
              placeholder="Obligatoria para confirmar la identidad"
              required
              style={{ background: '#fff' }}
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Debes ingresar tu contraseña actual para autorizar cualquier cambio.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem' }}>
            {/* New Username */}
            <div>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> Nuevo Usuario
              </label>
              <input 
                className="input"
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)} 
                placeholder="Dejar en blanco para mantener"
              />
            </div>
            
            {/* New Password */}
            <div>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={14} /> Nueva Contraseña
              </label>
              <input 
                className="input"
                type="password"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Dejar en blanco para mantener"
              />
            </div>
          </div>

          {/* Feedback Messages */}
          {message.text && (
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              padding: '0.875rem 1rem', borderRadius: '0.875rem', 
              fontWeight: 700, fontSize: '0.875rem',
              background: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
              color: message.type === 'error' ? '#dc2626' : '#16a34a',
              border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`
            }}>
              {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              {message.text}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !currentPassword}
              style={{ borderRadius: '1rem', padding: '0.875rem 1.75rem', width: '100%', maxWidth: '200px' }}
            >
              {loading ? (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                   Actualizando...
                 </div>
              ) : (
                <><Save size={18} /> Guardar Cambios</>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
};

export default Settings;
