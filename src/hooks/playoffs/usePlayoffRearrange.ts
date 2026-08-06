import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/useToast';
import { bracketManagerService } from '@/services/brackets/manager';
import type { SlotAssignment } from '@/services/brackets/manager/services/BracketAdmin/rearrange/types';
import { bracketLog, errorLog } from '@/utils/logger';

/**
 * The "Rearrange Teams" board for a bracket's losers bracket: every match
 * classified as movable or locked (with plain-language reasons) plus the
 * snapshot the pure simulation runs against for live validation. Fetched only
 * while the rearrange screen is open.
 */
export const useLoserRearrangeBoard = (bracketId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ['loser-rearrange-board', bracketId],
    queryFn: () => bracketManagerService.getLoserRearrangeBoard(bracketId as string),
    enabled: enabled && bracketId !== null,
  });

export interface ApplyRearrangeInput {
  /** The desired occupancy of every movable spot. */
  assignments: SlotAssignment[];
  /**
   * The occupancy the screen was loaded with — the optimistic-concurrency
   * token. The save is refused if the bracket no longer matches it.
   */
  baseline: SlotAssignment[];
}

/**
 * Admin mutation hook: apply a whole losers-bracket rearrangement in one
 * batch. Many matches can change (walkovers recomputed, automatic
 * advancements moved), so the brackets-manager match cache is invalidated
 * wholesale rather than per match.
 */
export const usePlayoffApplyRearrange = (bracketId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ assignments, baseline }: ApplyRearrangeInput) => {
      bracketLog('usePlayoffApplyRearrange - calling service', {
        bracketId,
        assignments: assignments.length,
      });
      return bracketManagerService.applyLoserBracketRearrange(
        bracketId as string,
        assignments,
        baseline
      );
    },
    onSuccess: async (result) => {
      await invalidateMatchRelatedQueries(queryClient);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['brackets'] }),
        // A rearrangement can complete a bracket, and the overview list
        // filters by completed state — its key doesn't start with 'brackets'.
        queryClient.invalidateQueries({ queryKey: ['playoffs-brackets-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['playoff-matches'] }),
        queryClient.invalidateQueries({ queryKey: ['brackets-manager-match'] }),
        queryClient.invalidateQueries({ queryKey: ['loser-swap-eligibility'] }),
        queryClient.invalidateQueries({ queryKey: ['loser-rearrange-board', bracketId] }),
      ]);
      if (bracketId) {
        await queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
        await queryClient.invalidateQueries({ queryKey: ['bracket-info', bracketId] });
        await queryClient.refetchQueries({ queryKey: ['bracket-data', bracketId] });
      }

      toast({
        title: 'Teams rearranged',
        description: result.message,
      });
    },
    onError: (error: Error) => {
      errorLog('usePlayoffApplyRearrange - failed', error);
      toast({
        title: 'Could not rearrange teams',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};
