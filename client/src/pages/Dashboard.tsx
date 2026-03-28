import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { Users, Ticket, CheckCircle2, Calendar, AlertCircle, Clock, PlusCircle, XCircle } from 'lucide-react';

const StatCard = ({ icon, label, value, color = '#000' }: { icon: React.ReactNode; label: string; value: number; color?: string }) => (
  <div className="card card-hover" style={{ cursor: 'default' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '0.875rem',
        background: color === '#000' ? '#000' : `${color}18`,
        color: color === '#000' ? '#fff' : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: color === '#000' ? '0 8px 18px rgba(0,0,0,0.18)' : `0 4px 12px ${color}28`
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>
          {label}
        </p>
        <h3 style={{ fontSize: '2.75rem', fontWeight: 900, letterSpacing: '-0.04em', color, lineHeight: 1 }}>
          {value}
        </h3>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({ clients: 0, boletas: 0, validaciones: 0, eventos: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [cRes, bRes, eRes, aRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`).then(r => r.json()),
        fetch(`${API_URL}/api/boletas`).then(r => r.json()),
        fetch(`${API_URL}/api/events`).then(r => r.json()),
        fetch(`${API_URL}/api/activity`).then(r => r.json()),
      ]);
      const used = Array.isArray(bRes) ? bRes.filter((b: any) => b.used).length : 0;
      setStats({
        clients: Array.isArray(cRes) ? cRes.length : 0,
        boletas: Array.isArray(bRes) ? bRes.length : 0,
        validaciones: used,
        eventos: Array.isArray(eRes) ? eRes.length : 0,
      });
      setActivities(Array.isArray(aRes) ? aRes : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto refresh
    return () => clearInterval(interval);
  }, []);

  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'event_created': return { icon: <Calendar size={20} />, bg: '#f3e8ff', color: '#7c3aed' };
      case 'client_created': return { icon: <Users size={20} />, bg: '#eff6ff', color: '#2563eb' };
      case 'scan_success': return { icon: <CheckCircle2 size={20} />, bg: '#f0fdf4', color: '#16a34a' };
      case 'scan_failed': 
        if (activities.some(a => a.type === 'scan_failed' && a.message.includes('⚠️'))) {
            return { icon: <AlertCircle size={20} />, bg: '#fffbeb', color: '#d97706' };
        }
        return { icon: <XCircle size={20} />, bg: '#fef2f2', color: '#dc2626' };
      default: return { icon: <Clock size={20} />, bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
          Panel de Control
        </h1>
        <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '1.0625rem', fontWeight: 500 }}>
          Monitoreo en tiempo real de tu plataforma ValidateApp <strong style={{ color: '#000' }}>PRO</strong>.
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={<Users size={22} />} label="Clientes Registrados" value={stats.clients} />
        <StatCard icon={<Ticket size={22} />} label="Boletas Emitidas" value={stats.boletas} color="#2563eb" />
        <StatCard icon={<CheckCircle2 size={22} />} label="Escaneos Válidos" value={stats.validaciones} color="#16a34a" />
        <StatCard icon={<Calendar size={22} />} label="Eventos Activos" value={stats.eventos} color="#7c3aed" />
      </div>

      {/* Activity */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
          Trazabilidad de Actividad
        </h2>
        
        {loading ? (
           <div className="card" style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Cargando actividad...</div>
        ) : activities.length > 0 ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ borderBottom: '1px solid #f3f4f6' }}>
              {activities.map((act, i) => {
                const style = getActivityStyle(act.type);
                // Handle different icon for yellow/amber alerts
                const icon = act.type === 'scan_failed' && act.message.includes('⚠️') 
                    ? <AlertCircle size={20} /> 
                    : style.icon;
                const bg = act.type === 'scan_failed' && act.message.includes('⚠️') 
                    ? '#fffbeb' 
                    : style.bg;
                const color = act.type === 'scan_failed' && act.message.includes('⚠️') 
                    ? '#d97706' 
                    : style.color;

                return (
                  <div key={act.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1.25rem 1.5rem',
                    borderBottom: i === activities.length - 1 ? 'none' : '1px solid #f3f4f6',
                    background: '#fff'
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: bg,
                      color: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: '#111827' }}>
                        {act.message}
                        {act.consecutivo && (
                          <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '0.8125rem', marginLeft: '0.5rem' }}>
                            #{act.consecutivo}
                          </span>
                        )}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280', fontWeight: 600 }}>
                        {act.eventName ? `${act.eventName} · ` : ''}
                        {new Date(act.timestamp).toLocaleDateString()} a las {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem' }}>
                      <Clock size={12} />
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card" style={{
            border: '2px dashed #e5e7eb',
            background: 'transparent',
            padding: '4rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            textAlign: 'center'
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusCircle size={28} style={{ color: '#d1d5db' }} />
            </div>
            <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: '1.0625rem' }}>
              No hay actividad reciente registrada en la plataforma.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
