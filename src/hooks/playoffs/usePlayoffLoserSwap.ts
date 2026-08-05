import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/useToast';
import { bracketManagerService } from '@/services/brackets/manager';
import type { SwapLoserSlotsParams } from '@/services/brackets/manager/services/BracketAdmin/swap';
import { bracketLog, errorLog } from '@/utils/logger';

/**
 * Whether a losers-bracket match can take part in a same-round team swap, plus
 * the movable teams and the sibling slots they could trade with. Drives the
 * visibility and contents of the swap dialog; the service re-validates on save.
 */
export const useLoserSwapEligibility = (matchId: number | null) =>
  useQuery({
    queryKey: ['loser-swap-eligibility', matchId],
    queryFn: () => bracketManagerService.checkLoserSwapEligibility(matchId as number),
    enabled: matchId !== null,
  });

/**
 * Admin mutation hook: swap two opponent slots between two losers-bracket
 * matches in the same round — for recording hand-seeded losers brackets.
 */
export const usePlayoffSwapLoserSlots = (bracketId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: SwapLoserSlotsParams) => {
      bracketLog('usePlayoffSwapLoserSlots - calling service', { ...params });
      return bracketManagerService.adminSwapLoserBracketSlots(params);
    },
    onSuccess: async (result, params) => {
      await invalidateMatchRelatedQueries(queryClient);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['brackets'] }),
        queryClient.invalidateQueries({ queryKey: ['playoff-matches'] }),
        queryClient.invalidateQueries({
          queryKey: ['brackets-manager-match', params.sourceMatchId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['brackets-manager-match', params.targetMatchId],
        }),
        queryClient.invalidateQueries({ queryKey: ['loser-swap-eligibility'] }),
      ]);
      if (bracketId) {
        await queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
        await queryClient.invalidateQueries({ queryKey: ['bracket-info', bracketId] });
        await queryClient.refetchQueries({ queryKey: ['bracket-data', bracketId] });
      }

      toast({
        title: 'Teams moved',
        description: result.message,
      });
    },
    onError: (error: Error) => {
      errorLog('usePlayoffSwapLoserSlots - failed', error);
      toast({
        title: 'Could not move teams',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};
