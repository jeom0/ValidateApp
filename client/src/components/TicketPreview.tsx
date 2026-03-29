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
 * 🚀 VERSION 4.6 - SIN FALLO: PRE-CARGA DE IMAGEN + SHARE ROBUSTO
 * QR Proporcional con fondo blanco redondeado.
 **/
const TicketContent: React.FC<{
  ticket: any;
  template: any;
  width?: number | string;
  isPrint?: boolean;
}> = ({ ticket, template, width = '100%', isPrint = false }) => {

  const hasTemplate = template && template.imageUrl;

  return (
    <div
      id={isPrint ? "print-ticket-container" : undefined}
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
          
          {/* QR POSICIONADO CON FONDO BLANCO REDONDEADO */}
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
              aspectRatio: '1/1',
              background: '#fff',
              borderRadius: '12px',
              padding: '4%',
              boxShadow: isPrint ? 'none' : '0 10px 30px rgba(0,0,0,0.1)'
            }}
          >
            <QRCodeCanvas 
              value={ticket.code || 'VALIDATE-TEST'} 
              style={{ width: '100%', height: '100%' }}
              level="H" 
              bgColor="#ffffff"
            />
          </div>
        </div>
      ) : (
        /* Fallback si no hay plantilla */
        <div style={{ 
          padding: '3rem 2rem', 
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)', 
          color: '#fff', 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '1.5rem',
          aspectRatio: '1 / 1.5'
        }}>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '1.25rem' }}>
            <QRCodeCanvas value={ticket.code} size={180} level="H" />
          </div>
          <div>
            <p style={{ opacity: 0.5, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em' }}>TICKET DIGITAL</p>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 900 }}>#{ticket.consecutivo}</h2>
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
        // --- PRE-CARGA DE IMAGEN ANTI-DESPLAZAMIENTO ---
        // Forzamos la carga completa de la imagen antes de capturar el canvas
        if (template && template.imageUrl) {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = resolve;
            img.onerror = reject;
            img.src = template.imageUrl;
          });
        }

        // Breve pausa para asegurar renderizado de dom
        await new Promise(r => setTimeout(r, 600));

        const canvas = await html2canvas(printRef.current, {
          useCORS: true,
          scale: 3,
          backgroundColor: '#ffffff',
          logging: false,
          allowTaint: true
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // Calculamos las dimensiones del PDF basadas en el canvas real (para escala 1:1)
        const pdfWidth = canvas.width / 3;
        const pdfHeight = canvas.height / 3;

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [pdfWidth, pdfHeight]
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        if (shouldShare && typeof navigator.share !== 'undefined') {
          const blob = pdf.output('blob');
          const file = new File([blob], `Boleta_${ticket.consecutivo}.pdf`, { type: 'application/pdf' });

          // COMPARTIR ARCHIVO (Priorizamos el envío puro de archivo para evitar bloqueos en WhatsApp/Social)
          const shareData: ShareData = {
            files: [file]
            // Quitamos 'title' y 'text' para que el archivo sea el protagonista absoluto
          };

          if (navigator.canShare && navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
              setDownloading(false);
              return;
            } catch (shareErr) {
              console.warn("Navigator.share interceptado/fallido, usando descarga:", shareErr);
            }
          }
        }
        
        pdf.save(`Boleta_${ticket.consecutivo}.pdf`);
      } catch (err) {
        console.error("Error en downloadPDF:", err);
        alert('Error al generar la boleta. Por favor reintenta.');
      }
      setDownloading(false);
    };

    const shareWhatsAppRaw = () => {
      const text = `Hola ${client.name},\nAquí tienes tu entrada digital 🎫\n\nTicket #${ticket.consecutivo}\nRef: ${ticket.code?.slice(0, 8)}\n\n¡Te esperamos!`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        {/* VISTA PREVIA WEB */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <TicketContent ticket={ticket} template={template} />
        </div>

        {/* GENERADOR PDF DEFINITIVO (600px FIJOS) */}
        <div style={{ position: 'absolute', left: '-9999px', top: -9999, pointerEvents: 'none' }}>
          <div ref={printRef} style={{ width: '600px' }}>
            <TicketContent ticket={ticket} template={template} width={600} isPrint={true} />
          </div>
        </div>

        {/* ACCIONES FINALIZADAS */}
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '420px' }}>
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
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
          >
            {downloading ? 'Capturando...' : 'Descargar PDF'}
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
              title="Adjuntar PDF (Móvil)"
            >
              <Share2 size={24} />
            </button>
          )}

          <button
            onClick={shareWhatsAppRaw}
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
            title="Enviar Texto WhatsApp"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    );
  }
);

export default TicketPreview;
