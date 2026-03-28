import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
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
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al actualizar' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Configuración</h1>
        <p className="text-secondary mt-1">Modifica las credenciales de acceso del administrador.</p>
      </div>

      <Card padding="lg" className="w-full" style={{ maxWidth: 500 }}>
        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          <Input 
            label="Contraseña Actual" 
            type="password"
            value={currentPassword} 
            onChange={(e) => setCurrentPassword(e.target.value)} 
            placeholder="Requerido para realizar cambios"
            required
            fullWidth
          />
          
          <div className="border-t my-2 border-[var(--border-color)]"></div>

          <Input 
            label="Nuevo Usuario (Opcional)" 
            value={newUsername} 
            onChange={(e) => setNewUsername(e.target.value)} 
            placeholder="Dejar en blanco para mantener actual"
            fullWidth
          />
          <Input 
            label="Nueva Contraseña (Opcional)" 
            type="password"
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            placeholder="Dejar en blanco para mantener actual"
            fullWidth
          />

          {message.text && (
            <p className={message.type === 'error' ? 'text-error' : 'text-success'}>
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Settings;
