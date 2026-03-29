import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Send, Share2 } from 'lucide-react';
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

/**
 * FIXED VERSION 3.0 - FRONTEND ONLY - PREMIUM RESPONSIVE & HIGH-RES PDF
 */
const TicketContent: React.FC<{ ticket: any, template: any, width?: string | number, isPrint?: boolean }> = ({ ticket, template, width = '100%', isPrint = false }) => {
  const hasTemplate = template && template.imageUrl;
  
  return (
    <div style={{ 
      position: 'relative', 
      width, 
      aspectRatio: hasTemplate ? 'auto' : '1 / 1.41', // Standard A-series proportion if no template
      background: hasTemplate ? 'transparent' : '#fff', 
      borderRadius: isPrint ? '0' : '1.5rem', 
      overflow: 'hidden', 
      boxShadow: isPrint ? 'none' : '0 25px 60px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease'
    }}>
      {hasTemplate ? (
        <div style={{ position: 'relative', width: '100%', height: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Main Template Image */}
          <img 
            src={template.imageUrl} 
            alt="Ticket Template" 
            style={{ 
              width: '100%', 
              height: 'auto', 
              display: 'block',
              objectFit: 'contain' 
            }} 
            crossOrigin="anonymous" 
          />
          
          {/* Floating QR Code - Perfectly centered in its defined zone */}
          <div
            style={{
              position: 'absolute',
              left: `${template.qrX}%`,
              top: `${template.qrY}%`,
              width: `${template.qrWidth}%`,
              height: `${template.qrHeight}%`,
              zIndex: 50,
              background: '#fff', 
              padding: '2%', // Minimal padding for aesthetic look
              borderRadius: '12px', 
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1/1'
            }}
          >
            <div style={{ width: '90%', height: '90%' }}>
              <QRCodeCanvas 
                value={ticket.code || 'VALIDATE-TEST'} 
                style={{ width: '100%', height: '100%' }}
                level="H" 
              />
            </div>
          </div>
        </div>
      ) : (
        /* Professional Fallback (if no image is uploaded) */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '2rem', background: 'linear-gradient(135deg, #000 0%, #333 100%)', color: '#fff' }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <QRCodeCanvas value={ticket.code} size={200} level="H" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6, marginBottom: '0.5rem' }}>🎫 VALIDATE PRO TICKET</div>
            <div style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>#{ticket.consecutivo}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const TicketPreview = forwardRef<TicketPreviewRef, Props>(({ client, ticket, template, selectable, selected, onSelectToggle, onEdit, onDelete }, ref) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useImperativeHandle(ref, () => ({
    downloadPDF,
    downloading
  }));

  const downloadPDF = async (shouldShare: boolean = false) => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      await new Promise(r => setTimeout(r, 400)); 
      
      const canvas = await html2canvas(printRef.current, {
        useCORS: true,
        scale: 3, // Ultra-high resolution
        backgroundColor: '#ffffff',
        logging: false,
        width: 600
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 3, canvas.height / 3]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 3, canvas.height / 3);
      
      if (shouldShare && navigator.share) {
        const blob = pdf.output('blob');
        const file = new File([blob], `Ticket_${ticket.consecutivo}.pdf`, { type: 'application/pdf' });
        
        try {
          await navigator.share({
            files: [file],
            title: `Boleta #${ticket.consecutivo}`,
            text: `Aquí tienes tu entrada digital.`
          });
        } catch (shareErr) {
          console.warn("Share failed, falling back to download", shareErr);
          pdf.save(`Ticket_QR_${ticket.consecutivo}.pdf`);
        }
      } else {
        pdf.save(`Ticket_QR_${ticket.consecutivo}.pdf`);
      }
    } catch (err) {
      console.error("PDF Error:", err);
      alert("Error al generar el PDF. Asegúrate de tener conexión.");
    }
    setDownloading(false);
  };

  const shareWhatsApp = () => {
    const text = `Hola ${client.name},\nAquí tienes tu entrada digital para el evento.\n\nTicket: #${ticket.consecutivo}\nRef: ${ticket.code.substring(0,8).toUpperCase()}\n\n¡Te esperamos!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%', padding: '0.5rem' }}>
      {/* 1. INTERACTIVE PREVIEW (Responsive) */}
      <div style={{ width: '100%', maxWidth: '400px', cursor: 'default' }}>
        <TicketContent ticket={ticket} template={template} />
      </div>

      {/* 2. HIDDEN HIGH-RES PRINT VIEW */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={printRef} style={{ width: '600px' }}>
          <TicketContent ticket={ticket} template={template} width={600} isPrint={true} />
        </div>
      </div>
      
      {/* 3. PREMIUM ACTIONS */}
      <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '420px', flexWrap: 'wrap' }}>
        <button 
          type="button"
          onClick={() => downloadPDF(false)} 
          disabled={downloading}
          className="btn btn-primary"
          style={{ 
            flex: 1, 
            borderRadius: '1.25rem', 
            height: '4rem', 
            fontSize: '1rem',
            background: '#000',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}
        >
          {downloading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="spinner-small" style={{ width: 18, height: 18, border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Generando...
            </span>
          ) : (
            <><Download size={20} /> PDF</>
          )}
        </button>

        {typeof navigator.share !== 'undefined' && (
          <button 
            type="button"
            onClick={() => downloadPDF(true)}
            className="btn"
            style={{ 
              width: '4rem', 
              height: '4rem', 
              borderRadius: '1.25rem', 
              background: '#3b82f6', 
              color: '#fff', 
              padding: 0,
              boxShadow: '0 10px 25px rgba(59, 130, 246, 0.25)'
            }}
          >
            <Share2 size={22} />
          </button>
        )}

        <button 
          type="button"
          onClick={shareWhatsApp}
          className="btn"
          style={{ 
            width: '4rem', 
            height: '4rem', 
            borderRadius: '1.25rem', 
            background: '#25d366', 
            color: '#fff', 
            padding: 0,
            boxShadow: '0 10px 25px rgba(37, 211, 102, 0.25)'
          }}
        >
          <Send size={22} />
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
});

export default TicketPreview;
