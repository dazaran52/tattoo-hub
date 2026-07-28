import React from 'react';

interface OnlineIndicatorProps {
  lastSeen?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function OnlineIndicator({ lastSeen, className = '', size = 'md' }: OnlineIndicatorProps) {
  // If last seen within 5 minutes, consider online
  const isOnline = lastSeen 
    ? (new Date().getTime() - new Date(lastSeen).getTime()) < 5 * 60 * 1000
    : false;

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <span 
      className={`absolute block rounded-full border-2 border-white dark:border-gray-900 ${sizeClasses[size]} ${isOnline ? 'bg-green-500' : 'bg-gray-400'} ${className || 'bottom-0 right-0'}`}
      title={isOnline ? 'В сети' : 'Не в сети'}
    />
  );
}
