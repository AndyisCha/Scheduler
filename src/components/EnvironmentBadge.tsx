import React from 'react';

interface EnvironmentBadgeProps {
  className?: string;
}

export const EnvironmentBadge: React.FC<EnvironmentBadgeProps> = ({ className = '' }) => {
  const environment = import.meta.env.VITE_ENVIRONMENT || 'development';
  
  // Only show badge in non-production environments
  if (environment === 'production') {
    return null;
  }

  const getBadgeColor = () => {
    switch (environment) {
      case 'development':
        return 'bg-blue-500 text-white';
      case 'staging':
        return 'bg-yellow-500 text-black';
      case 'preview':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getBadgeText = () => {
    switch (environment) {
      case 'development':
        return 'DEV';
      case 'staging':
        return 'STAGING';
      case 'preview':
        return 'PREVIEW';
      default:
        return environment.toUpperCase();
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${getBadgeColor()} ${className}`}>
      {getBadgeText()}
    </div>
  );
};
