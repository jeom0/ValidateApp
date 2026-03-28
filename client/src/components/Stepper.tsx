import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

const Stepper: React.FC<StepperProps> = ({ value, onChange, min = 1, max = 100 }) => {
  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      background: '#f3f4f6', 
      padding: '0.375rem', 
      borderRadius: '0.875rem',
      gap: '0.75rem',
      border: '1px solid #e5e7eb'
    }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 32, height: 32, borderRadius: '0.625rem', border: 'none',
          background: '#fff', color: '#111827', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'transform 0.1s'
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Minus size={16} />
      </button>
      <span style={{ fontWeight: 800, minWidth: '2.5rem', textAlign: 'center', fontSize: '1.125rem', color: '#111827' }}>{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 32, height: 32, borderRadius: '0.625rem', border: 'none',
          background: '#fff', color: '#111827', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'transform 0.1s'
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

export default Stepper;
