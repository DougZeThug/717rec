import { Loader2 } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

type LoadingVariant = 'page' | 'section' | 'inline';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** @deprecated Use variant="page" instead */
  fullscreen?: boolean;
  /**
   * Loading state variant:
   * - page: Full-screen centered (use for page-level loading)
   * - section: Padding-based centered (use for card/section loading)
   * - inline: Minimal padding, smaller spinner (use for inline loading)
   */
  variant?: LoadingVariant;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  className = '',
  size,
  fullscreen = false,
  variant,
}) => {
  // Determine effective variant (backward compatible with fullscreen prop)
  const effectiveVariant: LoadingVariant = variant ?? (fullscreen ? 'page' : 'section');

  // Auto-determine size based on variant if not explicitly set
  const effectiveSize = size ?? (effectiveVariant === 'inline' ? 'sm' : 'md');

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const containerClasses = {
    page: 'min-h-screen flex items-center justify-center',
    section: 'py-8 flex items-center justify-center',
    inline: 'py-2 flex items-center justify-center gap-2',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  // Inline variant uses horizontal layout
  if (effectiveVariant === 'inline') {
    return (
      <div className={cn(containerClasses.inline, className)}>
        <Loader2 className={cn('text-primary animate-spin', sizeClasses[effectiveSize])} />
        {message && (
          <span className={cn('text-muted-foreground', textSizeClasses[effectiveSize])}>
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn(containerClasses[effectiveVariant], className)}>
      <div className="flex flex-col items-center">
        <Loader2 className={cn('text-primary animate-spin mb-3', sizeClasses[effectiveSize])} />
        <p className={cn('text-muted-foreground', textSizeClasses[effectiveSize])}>{message}</p>
      </div>
    </div>
  );
};

export default LoadingState;
