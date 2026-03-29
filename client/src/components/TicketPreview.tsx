import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Share2, MapPin, Calendar, Clock } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Props { 
  client: any; 
  ticket: any; 
  template: any;
}

export interface TicketPreviewRef {
  downloadPDF: () => Promise<void>;
  downloading: boolean;
}

/**
 * 🚀 VERSION 5.5 - ADAPTADA DE CHATGPT + CORRECCIONES POSITION
 * Se usa QRCodeCanvas y allowTaint para máxima compatibilidad con html2canvas.
 */
const TicketContent: React.FC<{
  ticket: any;
  template: any;
  isPrint?: boolean;
}> = ({ ticket, template, isPrint = false }) => {

  const hasTemplate = template && template.imageUrl;

  return (
    <div
      id="ticket-content-root"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: isPrint ? 'none' : '420px',
        margin: '0 auto',
        borderRadius: isPrint ? 0 : '1.5rem',
        overflow: 'hidden',
        background: '#fff',
        boxShadow: isPrint ? 'none' : '0 25px 60px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {hasTemplate ? (
        <div style={{ position: 'relative', width: '100%', lineHeight: 0 }}>
          {/* IMAGEN BASE */}
          <img 
            src={template.imageUrl} 
            alt="Ticket" 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
            crossOrigin="anonymous"
          />

          {/* QR POSICIONADO (Manteniendo top-left para compatibilidad con editor) */}
          <div
            style={{
              position: 'absolute',
              left: `${template.qrX}%`,
              top: `${template.qrY}%`,
              width: `${template.qrWidth}%`,
              height: `${template.qrHeight}%`,
              zIndex: 100,
              background: '#fff',
              borderRadius: isPrint ? '6px' : '10px',
              padding: '1%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1/1',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}
          >
            <QRCodeCanvas
              value={ticket?.code || 'NO-CODE'}
              size={512}
              level="H"
              includeMargin={false}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </div>
      ) : (
        /* Fallback si no hay plantilla */
        <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#000', color: '#fff' }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '1.25rem', display: 'inline-block' }}>
            <QRCodeCanvas value={ticket?.code || 'NO-CODE'} size={200} />
          </div>
          <h2 style={{ fontSize: '2rem', marginTop: '1rem' }}>#{ticket?.consecutivo}</h2>
          <p style={{ opacity: 0.6 }}>{ticket?.code}</p>
        </div>
      )}
      
      {/* INDICADOR DE DESPLIEGUE SEGURO */}
      <div style={{ position: 'absolute', bottom: 5, right: 10, fontSize: '10px', color: '#16a34a', fontWeight: 900 }}>
        V5.8 - QR SIZE 1PCT
      </div>
    </div>
  );
};

const TicketPreview = forwardRef<TicketPreviewRef, Props>(
  ({ client, ticket, template }, ref) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    useImperativeHandle(ref, () => ({ downloadPDF, downloading }));

    const downloadPDF = async (shouldShare = false) => {
      if (!printRef.current) return;
      setDownloading(true);

      try {
        // Pausa para asegurar carga de QR
        await new Promise(r => setTimeout(r, 600));

        const canvas = await html2canvas(printRef.current, {
          useCORS: true,
          allowTaint: true,
          scale: 3,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        const pdf = new jsPDF({
          orientation: canvas.height > canvas.width ? 'portrait' : 'landscape',
          unit: 'px',
          format: [canvas.width / 3, canvas.height / 3]
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 3, canvas.height / 3);

        if (shouldShare && typeof navigator.share === 'function') {
          const blob = pdf.output('blob');
          const file = new File([blob], `Ticket_${ticket.consecutivo}.pdf`, { type: 'application/pdf' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            setDownloading(false);
            return;
          }
        }
        
        pdf.save(`Ticket_${ticket.consecutivo}.pdf`);
      } catch (err: any) {
        // 🤫 SILENCIAR ABORTERROR (Si el usuario cancela la acción de compartir)
        if (err.name === 'AbortError') {
          console.log("Compartir cancelado por el usuario.");
        } else {
          console.error("Error PDF:", err);
          alert('Error al generar el PDF.');
        }
      }
      setDownloading(false);
    };

    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        {/* VISTA PREVIA WEB */}
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* BLOQUE INFORMATIVO IZQUIERDA (NOMBRES Y LOGÍSTICA) */}
          <div style={{ textAlign: 'left', padding: '0 0.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#000', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              #{ticket.consecutivo} - {ticket.eventName || 'Evento'}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563', fontSize: '0.85rem', fontWeight: 700 }}>
                <MapPin size={16} style={{ color: '#3b82f6' }} /> {ticket.location || 'Lugar por definir'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563', fontSize: '0.85rem', fontWeight: 700 }}>
                <Calendar size={16} style={{ color: '#3b82f6' }} /> 
                {ticket.date ? new Date(ticket.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Fecha pendiente'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563', fontSize: '0.85rem', fontWeight: 700 }}>
                <Clock size={16} style={{ color: '#3b82f6' }} /> {ticket.startTime || '--:--'} {ticket.endTime && `a ${ticket.endTime}`}
              </div>
            </div>
          </div>

          <TicketContent ticket={ticket} template={template} />
        </div>

        {/* CONTENEDOR OCULTO PARA CAPTURA (ANCHO FIJO 600PX PARA ALTA CALIDAD) */}
        <div style={{ position: 'absolute', left: '-10000px', top: 0, pointerEvents: 'none' }}>
          <div ref={printRef} style={{ width: '600px' }}>
            <TicketContent ticket={ticket} template={template} isPrint={true} />
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '420px' }}>
          <button
            onClick={() => downloadPDF(false)}
            disabled={downloading}
            style={{
              flex: 1,
              height: '3.75rem',
              borderRadius: '1.25rem',
              background: '#000',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            {downloading ? 'Generando...' : 'Descargar PDF'}
          </button>

          {navigator.share && (
            <button
              onClick={() => downloadPDF(true)}
              style={{
                width: '3.75rem',
                borderRadius: '1.25rem',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Share2 size={22} />
            </button>
          )}
        </div>
      </div>
    );
  }
);

export default TicketPreview;
