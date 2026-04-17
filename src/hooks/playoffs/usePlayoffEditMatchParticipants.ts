import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/useToast';
import { bracketManagerService } from '@/services/brackets/manager';
import { bracketLog, errorLog } from '@/utils/logger';

interface EditMatchParticipantsVariables {
  matchId: number;
  opponent1TeamId: string | null;
  opponent2TeamId: string | null;
}

/**
 * Admin mutation hook: swap one or both teams in an unplayed playoff match.
 *
 * Mirrors the manual workflow of editing `opponent1_id` / `opponent2_id` in Supabase
 * — the service will refuse to touch a match that has already been played.
 */
export const usePlayoffEditMatchParticipants = (bracketId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      matchId,
      opponent1TeamId,
      opponent2TeamId,
    }: EditMatchParticipantsVariables) => {
      bracketLog('usePlayoffEditMatchParticipants - calling service', {
        matchId,
        opponent1TeamId,
        opponent2TeamId,
      });
      return bracketManagerService.editMatchParticipants(matchId, opponent1TeamId, opponent2TeamId);
    },
    onSuccess: async () => {
      await invalidateMatchRelatedQueries(queryClient);

      if (bracketId) {
        await queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
        await queryClient.invalidateQueries({ queryKey: ['bracket-info', bracketId] });
        await queryClient.refetchQueries({ queryKey: ['bracket-data', bracketId] });
      }

      toast({
        title: 'Teams updated',
        description: 'Matchup teams were swapped successfully.',
      });
    },
    onError: (error: Error) => {
      errorLog('usePlayoffEditMatchParticipants - failed', error);
      toast({
        title: 'Could not update teams',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};
