import { toast } from '@/hooks/use-toast';
import { errorLog } from '@/utils/logger';

export type SetAuthErrorFn = (error: string | null) => void;

/**
 * Handle auth errors with toast notification and logging
 */
export const handleAuthError = (
  error: Error,
  context: string,
  setAuthError: SetAuthErrorFn
): string => {
  const errorMessage = error.message || `An error occurred during ${context}`;
  setAuthError(errorMessage);
  errorLog(`Error during ${context}:`, error);

  toast({
    title: `${context} failed`,
    description: errorMessage,
    variant: 'destructive',
  });

  return errorMessage;
};

export type HandleAuthErrorFn = (error: Error, context: string) => string;
