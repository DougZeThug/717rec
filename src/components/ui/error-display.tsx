import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  /** Error message to display. If null/undefined, component renders nothing. */
  error: string | null | undefined;
  /** Optional retry callback. Shows retry button if provided. */
  onRetry?: () => void;
  /** Optional context label (e.g., "Loading teams") */
  context?: string;
  /** Visual variant */
  variant?: 'inline' | 'card';
  /** Additional className */
  className?: string;
}

/**
 * Standardized error display component for consistent error UI across the app.
 * 
 * Usage:
 * ```tsx
 * <ErrorDisplay 
 *   error={error} 
 *   onRetry={refetch} 
 *   context="Loading teams"
 * />
 * ```
 */
export function ErrorDisplay({
  error,
  onRetry,
  context,
  variant = 'inline',
  className,
}: ErrorDisplayProps) {
  if (!error) return null;

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 p-6 rounded-lg border border-destructive/20 bg-destructive/5',
          className
        )}
      >
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div className="text-center">
          {context && (
            <p className="text-sm text-muted-foreground mb-1">{context}</p>
          )}
          <p className="text-destructive font-medium">{error}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <Alert variant="destructive" className={cn('flex items-center gap-2', className)}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <AlertDescription className="flex-1 flex items-center justify-between gap-2">
        <span>
          {context && <span className="font-medium">{context}: </span>}
          {error}
        </span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-auto p-1 text-destructive-foreground hover:text-destructive-foreground/80"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
