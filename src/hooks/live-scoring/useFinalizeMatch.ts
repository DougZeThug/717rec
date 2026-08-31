import { useMutation, useQueryClient } from '@tanstack/react-query';

import { MATCH_RESULT_DRIFT_KEY } from '@/hooks/admin/useMatchResultDrift';
import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { toast } from '@/hooks/useToast';
import { FinalizeService } from '@/services/liveScoring/FinalizeService';
import { BusinessLogicError } from '@/types/errors';
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
    // Saving or reversing a result is exactly what clears a match off the
    // dashboard's drift card, and invalidateMatchRelatedQueries touches nothing
    // under ['admin'], so name that key here.
    await queryClient.invalidateQueries({ queryKey: MATCH_RESULT_DRIFT_KEY });
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

  /**
   * B-19: after a correction, the rounds and the recorded result disagree until
   * someone reopens the match and saves it again. finalize_live_match refuses to
   * run on a match that still has a result, so that order is mandatory - and
   * doing it by hand, on another screen, is easy to half-finish.
   *
   * Composed here rather than by firing `reopen` and `finalize` in turn so the
   * admin gets one toast instead of two, and one cache refresh instead of two.
   */
  const reopenAndRefinalize = useMutation({
    mutationFn: async () => {
      await FinalizeService.reopenLiveMatch(matchId);
      try {
        return await FinalizeService.finalizeLiveMatch(matchId);
      } catch (error) {
        // Reopening succeeded or finalize would never have been reached, so the
        // match is open with no result now. Say so rather than reporting a bare
        // failure: the league's records have moved and the admin has work left.
        throw new BusinessLogicError(
          `The old result was reversed, but the new one could not be saved: ${getUIErrorMessage(
            error
          )} The match is open now — fix the games, then save the result again.`
        );
      }
    },
    onSuccess: async (result) => {
      toast(
        result.applied
          ? {
              title: 'Result re-saved',
              description: `Final: ${result.team1GameWins ?? '?'}–${result.team2GameWins ?? '?'}. Standings updated.`,
            }
          : {
              title: 'Nothing was re-saved',
              description: 'The match already had a result when the save ran.',
              variant: 'destructive',
            }
      );
      await refreshEverything();
    },
    onError: async (error) => {
      toast({
        title: 'Could not re-save the result',
        description: getUIErrorMessage(error),
        variant: 'destructive',
      });
      await refreshEverything();
    },
  });

  return { finalize, reopen, reopenAndRefinalize };
}
