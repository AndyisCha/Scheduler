import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  title, 
  actions 
}) => {
  return (
    <div className={`bg-primary rounded-lg border border-primary shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between p-4 border-b border-primary">
          {title && <h3 className="text-lg font-semibold text-primary">{title}</h3>}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className={title || actions ? 'p-4' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};