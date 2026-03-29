import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Send, Share2 } from 'lucide-react';
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
 * 🚀 VERSION 4.2 - ULTIMATE RESPONSIVE + REAL PDF SHARING
 * Diseñado para ser 100% fiel a las proporciones del TemplateEditor.
 */
const TicketContent: React.FC<{
  ticket: any;
  template: any;
  width?: number | string;
  isPrint?: boolean;
}> = ({ ticket, template, width = '100%', isPrint = false }) => {

  const hasTemplate = template && template.imageUrl;

  return (
    <div
      style={{
        position: 'relative',
        width,
        maxWidth: isPrint ? '600px' : '420px',
        margin: '0 auto',
        borderRadius: isPrint ? 0 : '1.5rem',
        overflow: 'hidden',
        background: hasTemplate ? 'transparent' : '#fff',
        boxShadow: isPrint ? 'none' : '0 25px 60px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {hasTemplate ? (
        <div style={{ position: 'relative', width: '100%', lineHeight: 0 }}>
          {/* USAMOS <IMG> PARA QUE EL DIV TENGA EL TAMAÑO EXACTO DE LA PLANTILLA */}
          <img 
            src={template.imageUrl} 
            alt="Ticket" 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
            crossOrigin="anonymous"
          />
          
          {/* QR POSICIONADO POR PORCENTAJES (IGUAL AL EDITOR) */}
          <div
            style={{
              position: 'absolute',
              left: `${template.qrX}%`,
              top: `${template.qrY}%`,
              width: `${template.qrWidth}%`,
              height: `${template.qrHeight}%`,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1/1'
            }}
          >
            <QRCodeCanvas 
              value={ticket.code || 'VALIDATE-TEST'} 
              style={{ width: '100%', height: '100%' }}
              level="H" 
              bgColor="transparent"
            />
            {/* DEBUG BADGE: SI VES ESTO EN ROJO, ES LA VERSION NUEVA */}
            <div style={{ position: 'absolute', top: '-15px', right: 0, fontSize: '10px', color: 'red', fontWeight: 900, background: 'white', padding: '2px 4px', borderRadius: '4px', opacity: isPrint ? 0 : 1 }}>
              V4.2 - LIVE
            </div>
          </div>
        </div>
      ) : (
        /* Fallback Minimalista si no hay plantilla */
        <div style={{ 
          padding: '3rem 2rem', 
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)', 
          color: '#fff', 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '2rem',
          aspectRatio: '1 / 1.5'
        }}>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '1.25rem' }}>
            <QRCodeCanvas value={ticket.code} size={180} level="H" />
          </div>
          <div>
            <p style={{ opacity: 0.5, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em' }}>TICKET DIGITAL</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>#{ticket.consecutivo}</h2>
          </div>
        </div>
      )}
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
        // Esperamos un poco para que el canvas esté listo
        await new Promise(r => setTimeout(r, 400));

        const canvas = await html2canvas(printRef.current, {
          useCORS: true,
          scale: 3,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width / 3, canvas.height / 3]
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 3, canvas.height / 3);

        if (shouldShare && typeof navigator.share !== 'undefined') {
          const blob = pdf.output('blob');
          const file = new File([blob], `Ticket_${ticket.consecutivo}.pdf`, { type: 'application/pdf' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Tu Boleta Digital',
              text: 'Aquí está tu entrada para el evento.'
            });
            setDownloading(false);
            return;
          }
        }

        pdf.save(`Ticket_${ticket.consecutivo}.pdf`);
      } catch (err) {
        console.error(err);
        alert('Error al generar el PDF.');
      }
      setDownloading(false);
    };

    const shareWhatsApp = () => {
      const text = `Hola ${client.name},\nAquí tienes tu entrada digital 🎫\n\nTicket #${ticket.consecutivo}\nRef: ${ticket.code?.slice(0, 8)}\n\n¡Te esperamos!`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        {/* VISTA PREVIA DENTRO DE LA WEB */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <TicketContent ticket={ticket} template={template} />
        </div>

        {/* CONTENEDOR OCULTO PARA EL GENERADOR DE PDF (600px FIJOS) */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div ref={printRef} style={{ width: '600px' }}>
            <TicketContent ticket={ticket} template={template} width={600} isPrint={true} />
          </div>
        </div>

        {/* ACCIONES PREMIUM */}
        <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '420px', flexWrap: 'wrap' }}>
          <button
            onClick={() => downloadPDF(false)}
            disabled={downloading}
            style={{
              flex: 1,
              height: '4rem',
              borderRadius: '1.25rem',
              background: '#000',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              cursor: 'pointer'
            }}
          >
            {downloading ? 'Generando...' : 'Descargar PDF'}
          </button>

          {typeof navigator.share !== 'undefined' && (
            <button
              onClick={() => downloadPDF(true)}
              style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '1.25rem',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
              }}
              title="Compartir Archivo PDF"
            >
              <Share2 size={24} />
            </button>
          )}

          <button
            onClick={shareWhatsApp}
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '1.25rem',
              background: '#25d366',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(37, 211, 102, 0.3)'
            }}
            title="Enviar por WhatsApp"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    );
  }
);

export default TicketPreview;
