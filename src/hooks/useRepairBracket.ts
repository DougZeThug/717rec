import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { bracketManagerService } from '@/services/brackets/manager';
import { errorLog } from '@/utils/logger';

/**
 * Admin-triggered explicit bracket repair (single normalization/propagation
 * pass for older or stuck brackets). Surfaces an auditable summary of what
 * changed as a toast and refreshes the cached bracket queries.
 */
export function useRepairBracket(bracketId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRepairing, setIsRepairing] = useState(false);

  const repair = useCallback(async () => {
    if (!bracketId) return;
    setIsRepairing(true);
    try {
      const summary = await bracketManagerService.repairBracket(bracketId);

      await queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
      await queryClient.invalidateQueries({ queryKey: ['bracket-info', bracketId] });

      const changes = summary.matchesChanged + summary.statusesNormalized;
      const details: string[] = [];
      if (summary.matchesChanged > 0) details.push(`${summary.matchesChanged} match(es) updated`);
      if (summary.statusesNormalized > 0) {
        details.push(`${summary.statusesNormalized} match(es) made playable`);
      }
      if (summary.bracketMarkedCompleted) details.push('bracket marked completed');

      toast({
        title:
          changes > 0 || summary.bracketMarkedCompleted
            ? 'Bracket repaired'
            : 'Nothing needed repair',
        description:
          details.length > 0 ? details.join(', ') + '.' : 'The bracket was already consistent.',
      });
    } catch (error) {
      errorLog('Bracket repair failed:', error);
      toast({
        title: 'Bracket repair failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsRepairing(false);
    }
  }, [bracketId, queryClient, toast]);

  return { repair, isRepairing };
}
