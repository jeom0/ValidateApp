import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Send, CheckCircle2, XCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Props { 
  client: any; 
  ticket: any; 
  template: any;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface TicketPreviewRef {
  downloadPDF: () => Promise<void>;
  downloading: boolean;
}

const TicketPreview = forwardRef<TicketPreviewRef, Props>(({ client, ticket, template, selectable, selected, onSelectToggle, onEdit, onDelete }, ref) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useImperativeHandle(ref, () => ({
    downloadPDF,
    downloading
  }));

  const downloadPDF = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      await new Promise(r => setTimeout(r, 100)); // Small delay to ensure rendering
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Boleta_${client.name.replace(/\s+/g, '_')}_${ticket.consecutivo}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Hubo un error al generar el PDF.");
    }
    setDownloading(false);
  };

  const shareWhatsApp = () => {
    const text = `Hola ${client.name},\nAquí tienes tu boleta.\n\nBoleta Consecutivo: #${ticket.consecutivo}\nRef: ${ticket.code.substring(0,8).toUpperCase()}\n\nPor favor, presenta el código QR en la entrada.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isUsed = ticket.used === 1;

  return (
    <div 
      style={{ 
        display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '1.5rem', overflow: 'hidden', 
        border: `2px solid ${selected ? '#2563eb' : '#e5e7eb'}`, 
        boxShadow: selected ? '0 0 0 4px rgba(37,99,235,0.1)' : '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease', cursor: selectable ? 'pointer' : 'default'
      }}
      onClick={(e) => {
        // Only toggle selection if clicking the main card, not the buttons
        if (selectable && onSelectToggle) onSelectToggle();
      }}
    >
      
      {/* Top Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: selected ? '#eff6ff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {selectable && (
            <div style={{ 
              width: 20, height: 20, borderRadius: '0.375rem', border: `2px solid ${selected ? '#2563eb' : '#d1d5db'}`, 
              background: selected ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              {selected && <CheckCircle2 size={14} style={{ color: '#fff' }} />}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontWeight: 900, fontSize: '1.125rem', color: '#111827', letterSpacing: '-0.02em' }}>
            Ticket #{ticket.consecutivo}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {isUsed ? (
              <XCircle size={14} style={{ color: '#ef4444' }} />
            ) : (
              <CheckCircle2 size={14} style={{ color: '#10b981' }} />
            )}
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: isUsed ? '#ef4444' : '#10b981' }}>
              {isUsed ? 'Ya Canjeado' : 'Activo para Usar'}
            </span>
          </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); downloadPDF(); }} 
            disabled={downloading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#000', color: '#fff', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 700, cursor: downloading ? 'wait' : 'pointer', opacity: downloading ? 0.7 : 1, transition: 'transform 0.2s', outline: 'none' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Download size={16} /> {downloading ? 'Generando...' : 'Descargar PDF'}
          </button>

          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); shareWhatsApp(); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.5rem', height: '2.5rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
            title="Enviar por WhatsApp"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Actual Ticket Canvas Zone */}
      <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', background: '#f3f4f6' }}>
        
        {/* The Printable Ref */}
        <div 
          ref={printRef} 
          style={{ 
            position: 'relative', 
            width: '100%', 
            maxWidth: '420px', 
            aspectRatio: template?.imageUrl ? 'auto' : '1 / 1.6', 
            background: '#fff', 
            borderRadius: '1.25rem', 
            overflow: 'hidden', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
            display: 'flex', 
            flexDirection: 'column' 
          }}
        >
          {template && template.imageUrl ? (
            /* WITH TEMPLATE */
            <>
              <img 
                src={template.imageUrl} 
                alt="Diseño Entrada" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                crossOrigin="anonymous" 
              />
              <div
                style={{
                  position: 'absolute',
                  left: template.qrX,
                  top: template.qrY,
                  width: template.qrWidth,
                  height: template.qrHeight,
                  zIndex: 2,
                  background: 'white',
                  padding: '2px',
                }}
              >
                <QRCodeSVG value={ticket.code || 'VALIDATE-TEST'} size={template.qrWidth - 4} level="M" />
              </div>
            </>
          ) : (
            /* FALLBACK (NO TEMPLATE) */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #111827 0%, #374151 100%)', color: '#fff' }}>
              
              {/* Event Header Placeholder */}
              <div style={{ padding: '2.5rem 2rem 0', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                  Entrada General
                </div>
                <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                  PASE VIP
                </h2>
                <p style={{ margin: '0.5rem 0 0', color: '#9ca3af', fontSize: '0.875rem', fontWeight: 500 }}>
                  Escanea para validar tu acceso
                </p>
              </div>

              {/* QR Container (Center) */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', transform: 'rotate(-2deg)' }}>
                  <div style={{ transform: 'rotate(2deg)' }}>
                    <QRCodeSVG value={ticket.code} size={180} bgColor="#ffffff" fgColor="#000000" level="H" />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Persistent Ticket Info Bar (Overlay) - Applies to both modes */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem' }}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.95)', 
              backdropFilter: 'blur(12px)', 
              borderRadius: '1rem', 
              padding: '1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                  Titular de Acceso
                </p>
                <h4 style={{ margin: '0.2rem 0 0', fontSize: '1.125rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>
                  {client.name}
                </h4>
                {client.cedula && (
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563' }}>
                    C.C: {client.cedula}
                  </p>
                )}
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em' }}>
                  REF: {ticket.code.substring(0, 8).toUpperCase()}
                </p>
              </div>

              {/* Consecutivo Badge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ background: '#111827', color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  #{ticket.consecutivo}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

export default TicketPreview;
