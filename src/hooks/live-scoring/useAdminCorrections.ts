import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { toast } from '@/hooks/useToast';
import type { UpdateRoundPatch } from '@/services/liveScoring/AdminCorrectionsService';
import { AdminCorrectionsService } from '@/services/liveScoring/AdminCorrectionsService';
import { getUIErrorMessage } from '@/utils/errorHandler';

import { liveScoringKeys } from './liveScoringKeys';

const adminLiveScoredMatchesKey = (seasonId: string | null | undefined) =>
  ['admin', 'live-scored-matches', seasonId ?? 'all'] as const;

export function useAdminLiveScoredMatches(seasonId: string | null | undefined) {
  return useQuery({
    queryKey: adminLiveScoredMatchesKey(seasonId),
    queryFn: () => AdminCorrectionsService.listLiveScoredMatches(seasonId ?? undefined),
    staleTime: 60_000,
  });
}

export interface UseAdminCorrectionsOptions {
  /** The match id being corrected — used to invalidate the live-match cache. */
  matchId: string;
  /**
   * When true, also invalidates all match-related queries after a mutation
   * (needed when a change could affect the official result / standings).
   */
  affectsStandings?: boolean;
}

export function useAdminCorrections({
  matchId,
  affectsStandings = false,
}: UseAdminCorrectionsOptions) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: liveScoringKeys.liveMatch(matchId) });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'live-scored-matches'] });
    if (affectsStandings) {
      await invalidateMatchRelatedQueries(queryClient);
    }
  };

  const onError = (title: string) => (error: unknown) => {
    toast({ title, description: getUIErrorMessage(error), variant: 'destructive' });
  };

  const updateRound = useMutation({
    mutationFn: (input: { roundId: string; patch: UpdateRoundPatch }) =>
      AdminCorrectionsService.updateRound(input.roundId, input.patch),
    onSuccess: () => {
      toast({ title: 'Round updated' });
    },
    onError: onError('Could not update round'),
    onSettled: invalidate,
  });

  const deleteRound = useMutation({
    mutationFn: (roundId: string) => AdminCorrectionsService.deleteRound(roundId),
    onSuccess: () => {
      toast({ title: 'Round deleted' });
    },
    onError: onError('Could not delete round'),
    onSettled: invalidate,
  });

  const changeGameWinner = useMutation({
    mutationFn: (input: {
      gameId: string;
      winnerTeamId: string;
      finalTotals: { team1: number; team2: number };
    }) =>
      AdminCorrectionsService.setGameWinner(input.gameId, input.winnerTeamId, input.finalTotals),
    onSuccess: () => {
      toast({ title: 'Game winner updated' });
    },
    onError: onError('Could not change game winner'),
    onSettled: invalidate,
  });

  return { updateRound, deleteRound, changeGameWinner };
}
