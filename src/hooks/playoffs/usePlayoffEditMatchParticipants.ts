import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/useToast';
import { bracketManagerService } from '@/services/brackets/manager';
import type { EditMatchTeamsParams } from '@/services/brackets/manager/services/BracketAdmin/editTeams/types';
import { bracketLog, errorLog } from '@/utils/logger';

/**
 * Admin mutation hook: change the teams of an unplayed winners-bracket round 1
 * match. The service refuses any other match, a team already in another
 * match, and a screen opened before the match changed.
 */
export const usePlayoffEditMatchParticipants = (bracketId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: EditMatchTeamsParams) => {
      bracketLog('usePlayoffEditMatchParticipants - calling service', { ...params });
      return bracketManagerService.editMatchParticipants(params);
    },
    onSuccess: async (result) => {
      await invalidateMatchRelatedQueries(queryClient);
      // The open score editor reads ['brackets-manager-match', id]. Left stale,
      // it keeps showing the old teams, so a score typed there would be saved
      // against the wrong team. Other matches can change too, so refresh all.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['brackets'] }),
        queryClient.invalidateQueries({ queryKey: ['playoffs-brackets-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['playoff-matches'] }),
        queryClient.invalidateQueries({ queryKey: ['brackets-manager-match'] }),
        queryClient.invalidateQueries({ queryKey: ['loser-swap-eligibility'] }),
        queryClient.invalidateQueries({ queryKey: ['loser-rearrange-board', bracketId] }),
        queryClient.invalidateQueries({ queryKey: ['edit-teams-eligibility'] }),
      ]);

      if (bracketId) {
        await queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
        await queryClient.invalidateQueries({ queryKey: ['bracket-info', bracketId] });
        await queryClient.refetchQueries({ queryKey: ['bracket-data', bracketId] });
      }

      toast({
        title: 'Teams updated',
        description: result.message,
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
