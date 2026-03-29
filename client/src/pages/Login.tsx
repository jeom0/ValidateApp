import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { ShieldCheck, User, Lock, Loader2, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('admin_auth', 'true');
        navigate('/admin');
      } else {
        const status = response.status;
        console.error(`Login failed with status: ${status}`);
        if (status === 405) {
          setError('Error 405: El servidor no permite esta operación. Revisa el archivo .htaccess en Hostinger.');
        } else if (status === 401) {
          setError('Credenciales inválidas');
        } else {
          setError(`Error del servidor (${status})`);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Error al conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#09090b',
      position: 'relative',
      overflow: 'hidden',
      padding: '1.5rem',
      fontFamily: '"Outfit", sans-serif'
    }}>
      {/* Animated Gradient Background */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '120%',
        height: '120%',
        background: 'radial-gradient(circle at 20% 30%, #3b82f644 0%, transparent 40%), radial-gradient(circle at 80% 70%, #7c3aed44 0%, transparent 40%)',
        filter: 'blur(80px)',
        zIndex: 0,
        animation: 'bgMove 15s ease-in-out infinite alternate'
      }} />

      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        position: 'relative',
        zIndex: 1,
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '2.5rem',
        padding: '3rem 2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center'
      }}>
        {/* Logo Icon */}
        <div style={{
          width: 72,
          height: 72,
          background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
          borderRadius: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          margin: '0 auto 2rem',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
          transform: 'rotate(-5deg)'
        }}>
          <ShieldCheck size={36} strokeWidth={2.5} />
        </div>

        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.04em',
          marginBottom: '0.5rem',
          lineHeight: 1.1
        }}>
          Bienvenido
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '1rem',
          fontWeight: 500,
          marginBottom: '2.5rem'
        }}>
          Acceso a su plataforma <span style={{ color: '#fff', fontWeight: 700 }}>ValidateApp PRO</span>
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Username Input */}
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '1.25rem',
                padding: '1rem 1.25rem 1rem 3.25rem',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
            />
          </div>

          {/* Password Input */}
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '1.25rem',
                padding: '1rem 1.25rem 1rem 3.25rem',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
            />
          </div>

          {error && (
            <div style={{
              color: '#f87171',
              fontSize: '0.875rem',
              fontWeight: 700,
              background: 'rgba(248,113,113,0.1)',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(248,113,113,0.2)'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '1rem',
              height: '3.75rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '1.25rem',
              fontSize: '1.125rem',
              fontWeight: 800,
              cursor: loading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              boxShadow: '0 12px 24px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if(!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 32px rgba(99, 102, 241, 0.4)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(99, 102, 241, 0.3)'; }}
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <>Iniciar Sesión <ArrowRight size={20} /></>}
          </button>
        </form>

        <p style={{ marginTop: '2.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Copyright &copy; 2026 · Antigravity Systems
        </p>
      </div>

      <style>{`
        @keyframes bgMove {
          from { transform: translate(-5%, -5%) scale(1); }
          to { transform: translate(5%, 5%) scale(1.1); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Login;
