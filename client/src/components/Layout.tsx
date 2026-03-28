import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Image as ImageIcon, ScanLine, LogOut, Settings, Menu, X, Calendar } from 'lucide-react';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const close = () => setOpen(false);

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <span className="mobile-header-logo">ValidateApp <span style={{ color: '#6b7280', fontWeight: 700 }}>PRO</span></span>
        <button className="hamburger-btn" onClick={() => setOpen(v => !v)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Overlay */}
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={close} />

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          ValidateApp <span style={{ color: '#6b7280', fontWeight: 700 }}>PRO</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <NavLink to="/admin" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={close}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/admin/eventos" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={close}>
            <Calendar size={20} /> Eventos
          </NavLink>
          <NavLink to="/admin/clientes" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={close}>
            <Users size={20} /> Clientes
          </NavLink>
          <NavLink to="/admin/plantilla" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={close}>
            <ImageIcon size={20} /> Boletas
          </NavLink>
          <NavLink to="/admin/configuracion" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={close}>
            <Settings size={20} /> Configuración
          </NavLink>
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '0.75rem 0' }} />
          <NavLink to="/scan" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={close}>
            <ScanLine size={20} /> Escáner
          </NavLink>
        </nav>

        <div style={{ paddingTop: '1rem' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ color: '#dc2626', width: '100%' }}>
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="container fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
