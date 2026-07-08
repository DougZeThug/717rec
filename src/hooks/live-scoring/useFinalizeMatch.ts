import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { toast } from '@/hooks/useToast';
import { FinalizeService } from '@/services/liveScoring/FinalizeService';
import { getUIErrorMessage } from '@/utils/errorHandler';

import { liveScoringKeys } from './liveScoringKeys';

/**
 * Writes/reverts the official match result via the idempotent RPCs, then
 * refreshes every match-related query (schedule, standings, team records).
 */
export function useFinalizeMatch(matchId: string) {
  const queryClient = useQueryClient();

  const refreshEverything = async () => {
    await invalidateMatchRelatedQueries(queryClient);
    await queryClient.invalidateQueries({ queryKey: liveScoringKeys.liveMatch(matchId) });
  };

  const finalize = useMutation({
    mutationFn: () => FinalizeService.finalizeLiveMatch(matchId),
    onSuccess: async (result) => {
      if (result.applied) {
        toast({
          title: 'Match result saved',
          description: `Final: ${result.team1GameWins ?? '?'}–${result.team2GameWins ?? '?'}. Standings updated.`,
        });
      } else {
        // Someone else (or an admin) already resulted this match — not an error.
        toast({
          title: 'Match already finalized',
          description: 'The official result was already recorded.',
        });
      }
      await refreshEverything();
    },
    onError: (error) => {
      toast({
        title: 'Could not finalize match',
        description: getUIErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const reopen = useMutation({
    mutationFn: () => FinalizeService.reopenLiveMatch(matchId),
    onSuccess: async (reversed) => {
      toast({
        title: reversed ? 'Match reopened' : 'Nothing to reopen',
        description: reversed
          ? 'The official result and team records were reverted.'
          : 'This match has no recorded result.',
      });
      await refreshEverything();
    },
    onError: (error) => {
      toast({
        title: 'Could not reopen match',
        description: getUIErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  return { finalize, reopen };
}
