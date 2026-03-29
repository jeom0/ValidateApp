import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
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
      const canvas = await html2canvas(printRef.current, {
        useCORS: true,
        scale: 2, // Higher scale for better quality
        logging: false,
        backgroundColor: null
      });
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div 
        ref={printRef} 
        style={{ 
          position: 'relative', 
          width: '100%', 
          maxWidth: '420px', 
          aspectRatio: template?.imageUrl ? 'auto' : '1 / 1', 
          background: '#fff', 
          borderRadius: '1.25rem', 
          overflow: 'hidden', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        {template && template.imageUrl ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img 
              src={template.imageUrl} 
              alt="Diseño Entrada" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
              crossOrigin="anonymous" 
            />
            <div
              style={{
                position: 'absolute',
                left: `${template.qrX}%`,
                top: `${template.qrY}%`,
                width: `${template.qrWidth}%`,
                height: `${template.qrHeight}%`,
                zIndex: 2,
                background: '#fff', 
                padding: '8px', 
                borderRadius: '12px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                aspectRatio: '1/1'
              }}
            >
              <div style={{ width: '100%', height: '100%', borderRadius: '4px', overflow: 'hidden' }}>
                <QRCodeCanvas 
                  value={ticket.code || 'VALIDATE-TEST'} 
                  style={{ width: '100%', height: '100%' }}
                  level="H" 
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#fff' }}>
            <QRCodeCanvas value={ticket.code} size={250} level="H" />
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          type="button"
          onClick={downloadPDF} 
          disabled={downloading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#000', color: '#fff', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 700, cursor: downloading ? 'wait' : 'pointer' }}
        >
          <Download size={16} /> {downloading ? 'Generando...' : 'Descargar PDF'}
        </button>
        <button 
          type="button"
          onClick={shareWhatsApp}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.5rem', height: '2.5rem', background: '#25d366', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer' }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
});

export default TicketPreview;
