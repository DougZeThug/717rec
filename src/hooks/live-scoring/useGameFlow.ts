import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/hooks/useToast';
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';
import { LiveMatchService } from '@/services/liveScoring/LiveMatchService';
import { getUIErrorMessage } from '@/utils/errorHandler';

import { liveScoringKeys } from './liveScoringKeys';
import { forgetReopen, noteReopen } from './reopenNotes';

export interface StartGameInput {
  gameNumber: number;
  team1Id: string;
  team2Id: string;
  team1PlayerIds: string[];
  team2PlayerIds: string[];
}

export interface CompleteGameInput {
  gameId: string;
  winnerTeamId: string;
  finalTotals: { team1: number; team2: number };
}

export function useGameFlow(matchId: string) {
  const queryClient = useQueryClient();
  const queryKey = liveScoringKeys.liveMatch(matchId);
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const onError = (title: string) => (error: unknown) => {
    toast({ title, description: getUIErrorMessage(error), variant: 'destructive' });
  };

  const startGame = useMutation({
    // One call, one transaction. This used to be createGame followed by both
    // line-ups under Promise.all, with nothing wrapping the three writes:
    // Promise.all does not cancel the sibling when one rejects, so a single
    // failed line-up write left a committed in-progress game with one side
    // rostered and the other empty, and onError only raised a toast.
    mutationFn: (input: StartGameInput) =>
      LiveMatchService.startGameWithRoster(
        matchId,
        input.gameNumber,
        input.team1Id,
        input.team1PlayerIds,
        input.team2Id,
        input.team2PlayerIds
      ),
    onError: onError('Could not start game'),
    onSettled: invalidate,
  });

  const confirmGameComplete = useMutation({
    // Not parked for a missing signal, unlike a round save. This carries a
    // snapshot of the folded totals, and a round held at the same moment can
    // still be refused before this would replay — which would file a finished
    // game whose score, and possibly whose winner, the recorded rounds do not
    // agree with. Failing now and leaving the banner up is recoverable; a wrong
    // result written later is not.
    networkMode: 'always',
    mutationFn: (input: CompleteGameInput) =>
      LiveMatchService.completeGame(input.gameId, input.winnerTeamId, input.finalTotals),
    onError: onError('Could not complete game'),
    onSettled: invalidate,
  });

  const reopenGame = useMutation({
    // Note the reopen while the old status is still known, so the live
    // connection can announce it even if onSettled's refetch gets there first
    // and overwrites the status it would otherwise have checked. See
    // reopenNotes.ts.
    onMutate: (gameId: string) => {
      const bundle = queryClient.getQueryData<LiveMatchBundle>(queryKey);
      const game = bundle?.games.find((g) => g.id === gameId);
      if (game?.status === 'completed') noteReopen(queryClient, matchId, gameId);
    },
    mutationFn: (gameId: string) => LiveMatchService.reopenGame(gameId),
    onError: (error: unknown, gameId: string) => {
      // Nothing was reopened, so there is nothing to announce.
      forgetReopen(queryClient, matchId, gameId);
      onError('Could not reopen game')(error);
    },
    onSettled: invalidate,
  });

  return { startGame, confirmGameComplete, reopenGame };
}
