import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/hooks/useToast';
import { LiveMatchService } from '@/services/liveScoring/LiveMatchService';
import { getUIErrorMessage } from '@/utils/errorHandler';

import { liveScoringKeys } from './liveScoringKeys';

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

export interface UpdateGamePlayersInput {
  gameId: string;
  teamId: string;
  playerIds: string[];
}

export function useGameFlow(matchId: string) {
  const queryClient = useQueryClient();
  const queryKey = liveScoringKeys.liveMatch(matchId);
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const onError = (title: string) => (error: unknown) => {
    toast({ title, description: getUIErrorMessage(error), variant: 'destructive' });
  };

  const startGame = useMutation({
    mutationFn: async (input: StartGameInput) => {
      const game = await LiveMatchService.createGame(matchId, input.gameNumber);
      await Promise.all([
        LiveMatchService.setGamePlayers(game.id, input.team1Id, input.team1PlayerIds),
        LiveMatchService.setGamePlayers(game.id, input.team2Id, input.team2PlayerIds),
      ]);
      return game;
    },
    onError: onError('Could not start game'),
    onSettled: invalidate,
  });

  const confirmGameComplete = useMutation({
    mutationFn: (input: CompleteGameInput) =>
      LiveMatchService.completeGame(input.gameId, input.winnerTeamId, input.finalTotals),
    onError: onError('Could not complete game'),
    onSettled: invalidate,
  });

  const updateGamePlayers = useMutation({
    mutationFn: (input: UpdateGamePlayersInput) =>
      LiveMatchService.setGamePlayers(input.gameId, input.teamId, input.playerIds),
    onError: onError('Could not update players'),
    onSettled: invalidate,
  });

  const reopenGame = useMutation({
    mutationFn: (gameId: string) => LiveMatchService.reopenGame(gameId),
    onError: onError('Could not reopen game'),
    onSettled: invalidate,
  });

  return { startGame, confirmGameComplete, updateGamePlayers, reopenGame };
}
