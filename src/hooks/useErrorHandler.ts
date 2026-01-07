import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { handleHookError, HookErrorResult } from '@/utils/errorHandling';

/**
 * Reusable hook for consistent error handling across the app.
 * 
 * Usage:
 * ```tsx
 * const { handleError } = useErrorHandler();
 * 
 * try {
 *   await someService.doSomething();
 * } catch (error) {
 *   const errorInfo = handleError(error, 'Fetching data');
 *   setError(errorInfo.userMessage);
 * }
 * ```
 */
export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * Handle an error with toast notification and logging
   * @param error - The error to handle
   * @param context - Description of what operation failed
   * @param showToast - Whether to show a toast notification (default: true)
   * @returns Error information for state management
   */
  const handleError = useCallback(
    (
      error: unknown,
      context: string,
      showToast: boolean = true
    ): HookErrorResult => {
      const errorInfo = handleHookError(error, context);

      if (showToast) {
        toast({
          title: `${context} failed`,
          description: errorInfo.userMessage,
          variant: 'destructive',
        });
      }

      return errorInfo;
    },
    [toast]
  );

  /**
   * Handle an error silently (log only, no toast)
   */
  const handleErrorSilent = useCallback(
    (error: unknown, context: string): HookErrorResult => {
      return handleError(error, context, false);
    },
    [handleError]
  );

  return {
    handleError,
    handleErrorSilent,
  };
}
