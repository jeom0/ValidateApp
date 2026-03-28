import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';
import { CheckCircle, XCircle, ArrowLeft, Camera, RefreshCw } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

type ScanStatus = 'idle' | 'valid' | 'used' | 'invalid' | 'loading';

const Scanner: React.FC = () => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [message, setMessage] = useState('Apunta la cámara al código QR');
  const [clientInfo, setClientInfo] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<number>(0);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    startScanner();
    return () => { readerRef.current?.reset(); };
  }, []);

  const startScanner = async () => {
    try {
      const devices = await readerRef.current?.listVideoInputDevices();
      const cam = devices?.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('trasera') ||
        d.label.toLowerCase().includes('0')
      ) || (devices?.[devices.length - 1] ?? null);

      if (cam && videoRef.current) {
        readerRef.current?.decodeFromVideoDevice(cam.deviceId, videoRef.current, (result) => {
          if (result && Date.now() - lastScanRef.current > 4000) {
            lastScanRef.current = Date.now();
            handleScan(result.getText());
          }
        });
      } else {
        setMessage('No se detectaron cámaras disponibles');
      }
    } catch {
      setMessage('Error al acceder a la cámara');
    }
  };

  const handleScan = async (code: string) => {
    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.valid) {
        setStatus('valid'); setClientInfo(data.ticket); setMessage('BOLETA VÁLIDA');
      } else if (data.used) {
        setStatus('used'); setMessage('BOLETA YA UTILIZADA');
      } else {
        setStatus('invalid'); setMessage('BOLETA NO ENCONTRADA');
      }
    } catch {
      setStatus('invalid'); setMessage('Error de conexión');
    }
    setTimeout(() => { setStatus('idle'); setMessage('Apunta la cámara al código QR'); setClientInfo(null); }, 4500);
  };

  const overlayBg: Record<ScanStatus, string> = {
    idle:    'rgba(0,0,0,0.25)',
    loading: 'rgba(0,0,0,0.5)',
    valid:   'rgba(5,150,105,0.88)',
    used:    'rgba(220,38,38,0.88)',
    invalid: 'rgba(220,38,38,0.88)',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 50 }}>
      {/* Camera */}
      <video ref={videoRef} playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Color overlay */}
      <div style={{ position: 'absolute', inset: 0, background: overlayBg[status], transition: 'background 0.4s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '2rem 1.5rem' }}>

        {/* Top bar */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)' }}
          >
            <ArrowLeft size={22} />
          </button>

          <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', padding: '0.5rem 1.25rem', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={16} /> Escáner Activo
          </div>

          <div style={{ width: 48 }} />
        </div>

        {/* Center QR frame */}
        <div style={{ position: 'relative', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {status === 'idle' && (<>
            {/* Corner brackets */}
            {[['top:0;left:0;borderTop:4px solid white;borderLeft:4px solid white;borderRadius:12px 0 0 0', '48px'],
              ['top:0;right:0;borderTop:4px solid white;borderRight:4px solid white;borderRadius:0 12px 0 0', '48px'],
              ['bottom:0;left:0;borderBottom:4px solid white;borderLeft:4px solid white;borderRadius:0 0 0 12px', '48px'],
              ['bottom:0;right:0;borderBottom:4px solid white;borderRight:4px solid white;borderRadius:0 0 12px 0', '48px'],
            ].map(([s], i) => {
              const props = Object.fromEntries(s.toString().split(';').filter(Boolean).map(p => { const [k, v] = p.split(':'); return [k.trim(), v.trim()]; }));
              return <div key={i} style={{ position: 'absolute', width: 48, height: 48, ...props }} />;
            })}
            <div style={{ position: 'absolute', width: '82%', height: 3, background: 'rgba(255,255,255,0.6)', borderRadius: 4, animation: 'scanLine 2s ease-in-out infinite', boxShadow: '0 0 12px 2px rgba(255,255,255,0.5)' }} />
          </>)}
          {status === 'valid' && <CheckCircle size={110} style={{ color: '#fff', filter: 'drop-shadow(0 4px 24px rgba(255,255,255,0.4))', animation: 'bounceIn 0.4s ease' }} />}
          {(status === 'used' || status === 'invalid') && <XCircle size={110} style={{ color: '#fff', filter: 'drop-shadow(0 4px 24px rgba(255,255,255,0.4))', animation: 'bounceIn 0.4s ease' }} />}
          {status === 'loading' && <div style={{ width: 56, height: 56, border: '5px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
        </div>

        {/* Bottom panel */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: '0.875rem', zIndex: 10 }}>
          <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.12)', padding: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.375rem', letterSpacing: '-0.02em', marginBottom: status === 'valid' && clientInfo ? '1rem' : 0 }}>
              {message}
            </h2>
            {status === 'valid' && clientInfo && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '1rem', color: 'rgba(255,255,255,0.9)' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: '0.25rem' }}>Titular</p>
                <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{clientInfo.client?.name}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '0.75rem' }}>
                  <div><p style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Boleta</p><p style={{ fontWeight: 800 }}>#{clientInfo.consecutivo}</p></div>
                  <div><p style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Estado</p><p style={{ fontWeight: 800, color: '#6ee7b7' }}>VÁLIDA</p></div>
                </div>
              </div>
            )}
            {status === 'idle' && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Coloca la boleta frente a la cámara</p>
            )}
          </div>

          <button
            type="button"
            onClick={startScanner}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '1rem', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '0.875rem', cursor: 'pointer', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Reintentar cámara
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scanLine { 0%,100%{top:10%} 50%{top:90%} }
        @keyframes bounceIn { 0%{transform:scale(0.4);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};

export default Scanner;
