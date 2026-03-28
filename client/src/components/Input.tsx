import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  className = '',
  fullWidth = false,
  ...props
}, ref) => {
  return (
    <div className={`input-container ${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <input
        ref={ref}
        className={`input-field ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
