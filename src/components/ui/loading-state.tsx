import { Loader2 } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

type LoadingVariant = 'section' | 'inline';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  /**
   * Loading state variant:
   * - section: Padding-based centered (use for card/section loading)
   * - inline: Minimal padding, smaller spinner (use for inline loading)
   */
  variant?: LoadingVariant;
}

const sizeClasses = {
  sm: 'size-4',
  md: 'size-8',
  lg: 'size-12',
};

const containerClasses = {
  section: 'py-8 flex items-center justify-center',
  inline: 'py-2 flex items-center justify-center gap-2',
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size,
  variant,
}) => {
  const effectiveVariant: LoadingVariant = variant ?? 'section';

  const effectiveSize = size ?? (effectiveVariant === 'inline' ? 'sm' : 'md');

  if (effectiveVariant === 'inline') {
    return (
      <div className={containerClasses.inline} role="status" aria-live="polite">
        <Loader2
          className={cn('text-primary animate-spin', sizeClasses[effectiveSize])}
          aria-hidden="true"
        />
        {message && (
          <span className={cn('text-muted-foreground', textSizeClasses[effectiveSize])}>
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={containerClasses[effectiveVariant]} role="status" aria-live="polite">
      <div className="flex flex-col items-center">
        <Loader2
          className={cn('text-primary animate-spin mb-3', sizeClasses[effectiveSize])}
          aria-hidden="true"
        />
        <p className={cn('text-muted-foreground', textSizeClasses[effectiveSize])}>{message}</p>
      </div>
    </div>
  );
};
