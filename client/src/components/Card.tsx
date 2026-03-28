import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'md',
  glass = false
}) => {
  return (
    <div className={`card card-padding-${padding} ${glass ? 'glass' : ''} ${className}`}>
      {children}
    </div>
  );
};
