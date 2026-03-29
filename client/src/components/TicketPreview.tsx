import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Share2 } from 'lucide-react';
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
 * 🚀 VERSION 4.9 - PDF PIXEL-PERFECT + UI LIMPIA
 * Ajusta el contenedor a la forma exacta de la imagen para evitar desplazamientos.
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
      style={{
        position: 'relative',
        width: isPrint ? '100%' : width, // Si es para imprimir, dejamos que el padre controle el tamaño
        maxWidth: isPrint ? 'none' : '420px',
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
              borderRadius: isPrint ? '8px' : '12px',
              padding: '12%',
              boxShadow: isPrint ? 'none' : '0 10px 30px rgba(0,0,0,0.1)'
            }}
          >
            <QRCodeCanvas 
              value={ticket.code || 'VALIDATE-TEST'} 
              size={512}
              style={{ width: '100%', height: '100%', display: 'block' }}
              level="H" 
              bgColor="#ffffff"
              fgColor="#000000"
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
            <QRCodeCanvas value={ticket.code || 'VALIDATE-TEST'} size={256} level="H" />
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
        // --- 🎯 PASO 1: DETECCIÓN DE PROPORCIONES REALES ---
        // Obtenemos el ancho y alto real de la imagen para que el PDF calce perfecto
        let finalWidth = 600;
        let finalHeight = 800;

        if (template && template.imageUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          const promise = new Promise((resolve, reject) => {
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = reject;
          });
          img.src = template.imageUrl;
          const dims: any = await promise;
          
          // Escalamos a un ancho base de 800px manteniendo la proporción exacta
          finalWidth = 800;
          finalHeight = Math.round(800 * (dims.h / dims.w));
        }

        // --- 🎯 PASO 2: AJUSTE DINÁMICO DEL CONTENEDOR ---
        if (printRef.current) {
          printRef.current.style.width = `${finalWidth}px`;
          printRef.current.style.height = `${finalHeight}px`;
        }

        // Breve pausa para asegurar el re-renderizado
        await new Promise(r => setTimeout(r, 800));

        const canvas = await html2canvas(printRef.current, {
          useCORS: true,
          scale: 2, // Bajamos la escala ligeramente para procesos más rápidos en móvil
          backgroundColor: null, // Evita bordes blancos extra
          logging: false,
          width: finalWidth,
          height: finalHeight
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // El PDF debe tener exactamente el mismo formato que el canvas
        const pdf = new jsPDF({
          orientation: finalHeight > finalWidth ? 'portrait' : 'landscape',
          unit: 'px',
          format: [finalWidth, finalHeight]
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight);

        if (shouldShare && typeof navigator.share !== 'undefined') {
          const blob = pdf.output('blob');
          const file = new File([blob], `Boleta_${ticket.consecutivo}.pdf`, { type: 'application/pdf' });
          
          const shareData: ShareData = { files: [file] };

          if (navigator.canShare && navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
              setDownloading(false);
              return;
            } catch (shareErr) {
              console.warn("Navigator.share interceptado:", shareErr);
            }
          }
        }
        
        pdf.save(`Boleta_${ticket.consecutivo}.pdf`);
      } catch (err) {
        console.error("Error en downloadPDF:", err);
        alert('Error al generar la boleta. Reintenta.');
      }
      setDownloading(false);
    };

    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        {/* VISTA PREVIA WEB PROPORCIONAL */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <TicketContent ticket={ticket} template={template} />
        </div>

        {/* 🪄 CONTENEDOR DE CAPTURA INTELIGENTE (OCULTO) 
            Su tamaño se ajustará dinámicamente en downloadPDF */}
        <div style={{ position: 'absolute', left: '-5000px', top: -5000, pointerEvents: 'none' }}>
          <div ref={printRef} style={{ background: '#fff' }}>
            <TicketContent ticket={ticket} template={template} isPrint={true} />
          </div>
        </div>

        {/* ACCIONES REFINADAS (SIN BOTÓN VERDE) */}
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
              title="Adjuntar PDF (Móvil)"
            >
              <Share2 size={24} />
            </button>
          )}
        </div>
      </div>
    );
  }
);

export default TicketPreview;
