'use client';

import React from 'react';
import { Button } from '../ui/Button';

interface EmptyStateCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
  variant?: 'default' | 'minimal' | 'overlay';
  className?: string;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  isLoading = false,
  variant = 'default',
  className = '',
}) => {
  const defaultIcon = (
    <svg className="w-12 h-12 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );

  if (variant === 'overlay') {
    return (
      <div className={`absolute inset-0 bg-canvas-default/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-10 ${className}`}>
        <div className="text-center max-w-xs px-6">
          <div className="mb-4 flex justify-center">
            {icon || defaultIcon}
          </div>
          <h3 className="text-lg font-serif text-ink-900 mb-2">{title}</h3>
          <p className="text-sm text-ink-600 mb-6 leading-relaxed">
            {description}
          </p>
          {actionLabel && onAction && (
            <Button 
              onClick={onAction} 
              isLoading={isLoading}
              size="sm"
              className="min-w-[160px]"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="mb-4 flex justify-center">
          {icon || defaultIcon}
        </div>
        <h3 className="text-lg font-serif text-ink-900 mb-2">{title}</h3>
        <p className="text-sm text-ink-600 mb-6 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button 
            onClick={onAction} 
            isLoading={isLoading}
            className="min-w-[160px]"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    );
  }

  // Default variant: full card with border
  return (
    <div className={`text-center py-16 bg-surface rounded-2xl border border-dashed border-ink-300/30 ${className}`}>
      <div className="mb-4 flex justify-center">
        {icon || defaultIcon}
      </div>
      <h3 className="text-xl font-serif text-ink-900 mb-2">{title}</h3>
      <p className="text-sm text-ink-600 mb-6 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          isLoading={isLoading}
          className="min-w-[180px]"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
