import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';
import { CheckCircle, XCircle, ArrowLeft, Camera, RefreshCw, Share2, Loader2 } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

type ScanStatus = 'idle' | 'valid' | 'used' | 'invalid' | 'loading';

const Scanner: React.FC = () => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [message, setMessage] = useState('Apunta la cámara al código QR');
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  
  // 🛡️ BLOQUEO DE SEGURIDAD PARA EVITAR DOBLE ESCANEO (RACE CONDITION)
  const isProcessingRef = useRef<boolean>(false);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    startScanner();
    return () => { readerRef.current?.reset(); };
  }, []);

  const startScanner = async () => {
    try {
      isProcessingRef.current = false;
      const devices = await readerRef.current?.listVideoInputDevices();
      const cam = devices?.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('trasera') ||
        d.label.toLowerCase().includes('0')
      ) || (devices?.[devices.length - 1] ?? null);

      if (cam && videoRef.current) {
        readerRef.current?.decodeFromVideoDevice(cam.deviceId, videoRef.current, (result) => {
          // Si detectamos un código y no estamos ya procesando uno...
          if (result && !isProcessingRef.current) {
            isProcessingRef.current = true; // Bloqueo SÍNCRONO instantáneo
            
            // Pausamos el lector inmediatamente para evitar que la cámara siga analizando
            readerRef.current?.reset(); 
            
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
    setMessage('Verificando boleta...');
    
    try {
      const res = await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      
      if (data.valid) {
        setStatus('valid'); 
        setClientInfo(data.ticket); 
        setMessage('BOLETA VÁLIDA - ACCESO CONCEDIDO');
      } else if (data.used) {
        setStatus('used'); 
        setMessage('ALERTA: ESTA BOLETA YA FUE ESCANEADA');
      } else {
        setStatus('invalid'); 
        setMessage('BOLETA NO ENCONTRADA O INVÁLIDA');
      }
    } catch {
      setStatus('invalid'); 
      setMessage('Error de conexión con el servidor');
    }

    // Esperar un tiempo antes de volver a permitir el escaneo
    setTimeout(() => {
      resetScanner();
    }, 4000);
  };

  const resetScanner = () => {
    setStatus('idle');
    setMessage('Apunta la cámara al código QR');
    setClientInfo(null);
    startScanner(); // Reiniciamos el lector después del tiempo de espera
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/scan');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const overlayBg: Record<ScanStatus, string> = {
    idle:    'rgba(0,0,0,0.25)',
    loading: 'rgba(0,0,0,0.6)',
    valid:   'rgba(5,150,105,0.92)',
    used:    'rgba(239,68,68,0.92)',
    invalid: 'rgba(239,68,68,0.92)',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 100 }}>
      {/* Viewport de Cámara */}
      <video ref={videoRef} playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Interfaz de Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: overlayBg[status], transition: 'background 0.5s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem' }}>

        {/* Cabecera */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '1.25rem', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(10px)' }}
          >
            <ArrowLeft size={20} />
          </button>

          <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', padding: '0.6rem 1.25rem', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 8px #ef4444' }} /> ESCÁNER VIVO
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            style={{ background: copied ? 'rgba(5,150,105,0.3)' : 'rgba(255,255,255,0.15)', border: `1px solid ${copied ? 'rgba(5,150,105,0.8)' : 'rgba(255,255,255,0.25)'}`, borderRadius: '1.25rem', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
          >
            {copied ? <CheckCircle size={20} style={{ color: '#6ee7b7' }} /> : <Share2 size={20} />}
          </button>
        </div>

        {/* Marco de Escaneo Central */}
        <div style={{ position: 'relative', width: 260, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {status === 'idle' && (<>
            <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.3)', borderRadius: '2rem' }} />
            <div style={{ position: 'absolute', width: '85%', height: 2, background: 'rgba(255,255,255,0.8)', borderRadius: 4, animation: 'scanLine 2.5s ease-in-out infinite', boxShadow: '0 0 15px 4px rgba(255,255,255,0.5)' }} />
          </>)}
          {status === 'valid' && <CheckCircle size={100} style={{ color: '#fff', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />}
          {(status === 'used' || status === 'invalid') && <XCircle size={100} style={{ color: '#fff', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />}
          {status === 'loading' && <Loader2 size={64} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />}
        </div>

        {/* Panel de Resultado (Fijo en la parte inferior para móvil) */}
        <div style={{ width: '100%', maxWidth: '420px', paddingBottom: '1rem', zIndex: 10 }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            backdropFilter: 'blur(24px)', 
            borderRadius: '2rem', 
            border: '1px solid rgba(255,255,255,0.2)', 
            padding: '1.5rem', 
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)' 
          }}>
            <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
              {message}
            </h2>
            
            {status === 'valid' && clientInfo && (
              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>ACCESO CONCEDIDO A</p>
                <p style={{ color: '#fff', fontWeight: 900, fontSize: '1.5rem', margin: '0.25rem 0' }}>{clientInfo.client?.name}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '1rem' }}>
                    <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>BOLETA</p>
                    <p style={{ color: '#fff', fontWeight: 900, margin: 0 }}>#{clientInfo.consecutivo}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '1rem' }}>
                    <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>HORA</p>
                    <p style={{ color: '#fff', fontWeight: 900, margin: 0 }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            )}

            {status === 'idle' && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginTop: '0.75rem', fontWeight: 500 }}>Sistema de Validación QR QWERTY v4.7</p>
            )}
          </div>

          <button
            type="button"
            onClick={resetScanner}
            style={{ width: '100%', marginTop: '1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1.25rem', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '1rem', cursor: 'pointer', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={18} /> Forzar Reintento
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scanLine { 
          0%, 100% { top: 15%; opacity: 0.3; } 
          50% { top: 85%; opacity: 1; } 
        }
        @keyframes popIn { 
          0% { transform: scale(0.5); opacity: 0; } 
          100% { transform: scale(1); opacity: 1; } 
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Scanner;
