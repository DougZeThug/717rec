import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { bracketManagerService } from '@/services/brackets/manager';
import { errorLog } from '@/utils/logger';

/**
 * Admin-triggered retry of final standings calculation for a completed bracket.
 * Surfaces the FinalStandingsResult reason as a toast and invalidates the
 * cached standings query on success so the UI re-renders.
 */
export function useRecalculateStandings(bracketId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRecalculating, setIsRecalculating] = useState(false);

  const recalculate = useCallback(async () => {
    if (!bracketId) return;
    setIsRecalculating(true);
    try {
      const result = await bracketManagerService.calculateFinalStandings(bracketId);

      if (result.written) {
        await queryClient.invalidateQueries({ queryKey: ['final-standings', bracketId] });
        toast({
          title: 'Final standings calculated',
          description: 'Standings have been updated.',
        });
      } else if (result.reason === 'incomplete-matches') {
        toast({
          title: 'Bracket still has unfinished matches',
          description: 'Complete every match, then try again.',
        });
      } else {
        toast({
          title: 'Could not calculate standings yet',
          description: 'Check that all matches are complete and try again.',
        });
      }
    } catch (error) {
      errorLog('Manual standings recalculation failed:', error);
      toast({
        title: 'Could not calculate standings yet',
        description: 'An unexpected error occurred. Check logs for details.',
        variant: 'destructive',
      });
    } finally {
      setIsRecalculating(false);
    }
  }, [bracketId, queryClient, toast]);

  return { recalculate, isRecalculating };
}
