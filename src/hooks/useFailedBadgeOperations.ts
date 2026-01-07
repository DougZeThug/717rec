import { useState, useEffect, useCallback } from 'react';
import { FailedBadgeOperationsService, FailedBadgeOperation } from '@/services/FailedBadgeOperationsService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to manage failed badge operations for admin users.
 * Provides retry functionality and operation monitoring.
 */
export function useFailedBadgeOperations() {
  const [failedOperations, setFailedOperations] = useState<FailedBadgeOperation[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  // Load failed operations on mount
  useEffect(() => {
    const loadOperations = () => {
      setFailedOperations(FailedBadgeOperationsService.getFailedOperations());
    };

    loadOperations();

    // Refresh every 30 seconds to catch new failures
    const interval = setInterval(loadOperations, 30000);
    return () => clearInterval(interval);
  }, []);

  const retryAll = useCallback(async () => {
    if (isRetrying || failedOperations.length === 0) return;

    setIsRetrying(true);

    try {
      const result = await FailedBadgeOperationsService.retryFailedOperations();

      setFailedOperations(result.remaining);

      if (result.succeeded > 0) {
        toast({
          title: 'Badge Operations Retried',
          description: `${result.succeeded} of ${result.total} operations succeeded.`,
        });
      }

      if (result.failed > 0 && result.succeeded === 0) {
        toast({
          title: 'Retry Failed',
          description: `All ${result.failed} operations failed. Check console for details.`,
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: 'Retry Error',
        description: 'An error occurred while retrying operations.',
        variant: 'destructive',
      });
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, failedOperations.length, toast]);

  const clearAll = useCallback(() => {
    FailedBadgeOperationsService.clearAllOperations();
    setFailedOperations([]);
    toast({
      title: 'Cleared',
      description: 'All failed badge operations have been cleared.',
    });
  }, [toast]);

  const removeOperation = useCallback((operationId: string) => {
    FailedBadgeOperationsService.removeOperation(operationId);
    setFailedOperations(prev => prev.filter(op => op.id !== operationId));
  }, []);

  return {
    failedOperations,
    failedCount: failedOperations.length,
    hasPending: failedOperations.length > 0,
    isRetrying,
    retryAll,
    clearAll,
    removeOperation,
  };
}
