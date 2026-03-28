import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '4rem 2rem', 
      textAlign: 'center',
      background: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(10px)',
      borderRadius: '2.5rem',
      border: '2px dashed rgba(0,0,0,0.05)',
      marginTop: '1rem'
    }}>
      <div style={{ 
        background: '#fff', 
        padding: '1.5rem', 
        borderRadius: '2rem', 
        marginBottom: '1.5rem',
        color: '#6366f1',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
      }}>
        <Icon size={48} />
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.025em' }}>{title}</h3>
      <p style={{ margin: 0, color: '#6b7280', maxWidth: '320px', lineHeight: 1.6, fontSize: '1rem' }}>{description}</p>
      {action && (
        <button 
          onClick={action.onClick}
          className="btn btn-primary" 
          style={{ 
            marginTop: '2rem', 
            borderRadius: '1.25rem', 
            padding: '1rem 2.5rem',
            fontSize: '1rem',
            fontWeight: 700,
            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
