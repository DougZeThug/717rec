import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/auth-context';
import { toast } from '@/hooks/useToast';
import type { Tables } from '@/integrations/supabase/types';
type MatchRoundRow = Tables<'match_rounds'>;
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';
import { RoundService } from '@/services/liveScoring/RoundService';
import { DuplicateRoundError } from '@/types/errors';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { cancellationNet } from '@/utils/liveScoring/scoring';
import type { BagBreakdown } from '@/utils/liveScoring/types';

import { liveScoringKeys } from './liveScoringKeys';

export interface SubmitRoundInput {
  gameId: string;
  roundNumber: number;
  team1Score: number;
  team2Score: number;
  team1ThrowerId: string | null;
  team2ThrowerId: string | null;
  team1Bags: BagBreakdown | null;
  team2Bags: BagBreakdown | null;
}

export interface UndoRoundInput {
  gameId: string;
  roundNumber: number;
}

function optimisticRound(
  matchId: string,
  input: SubmitRoundInput,
  userId: string | undefined
): MatchRoundRow {
  const { net, winner } = cancellationNet({ team1: input.team1Score, team2: input.team2Score });
  return {
    id: `optimistic-${input.gameId}-${input.roundNumber}`,
    match_id: matchId,
    game_id: input.gameId,
    round_number: input.roundNumber,
    team1_score: input.team1Score,
    team2_score: input.team2Score,
    net_points: net,
    winner_team: winner,
    team1_thrower_id: input.team1ThrowerId,
    team2_thrower_id: input.team2ThrowerId,
    team1_bags_in: input.team1Bags?.bagsIn ?? null,
    team1_bags_on: input.team1Bags?.bagsOn ?? null,
    team1_bags_off: input.team1Bags?.bagsOff ?? null,
    team2_bags_in: input.team2Bags?.bagsIn ?? null,
    team2_bags_on: input.team2Bags?.bagsOn ?? null,
    team2_bags_off: input.team2Bags?.bagsOff ?? null,
    entered_by_user_id: userId ?? null,
    created_at: new Date().toISOString(),
  };
}

export function useRoundMutations(matchId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = liveScoringKeys.liveMatch(matchId);

  const submitRound = useMutation({
    mutationFn: (input: SubmitRoundInput) => {
      if (!user) throw new Error('You must be signed in to score a match');
      return RoundService.insertRound({
        matchId,
        gameId: input.gameId,
        roundNumber: input.roundNumber,
        team1Score: input.team1Score,
        team2Score: input.team2Score,
        team1ThrowerId: input.team1ThrowerId,
        team2ThrowerId: input.team2ThrowerId,
        team1Bags: input.team1Bags,
        team2Bags: input.team2Bags,
        enteredByUserId: user.id,
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<LiveMatchBundle>(queryKey);
      if (previous) {
        queryClient.setQueryData<LiveMatchBundle>(queryKey, {
          ...previous,
          rounds: [...previous.rounds, optimisticRound(matchId, input, user?.id)],
        });
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      if (error instanceof DuplicateRoundError) {
        toast({
          title: 'Round already recorded',
          description: 'Another scorer saved this round first — refreshing the scoreboard.',
        });
      } else {
        toast({
          title: 'Could not save round',
          description: getUIErrorMessage(error),
          variant: 'destructive',
        });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const undoLastRound = useMutation({
    mutationFn: (input: UndoRoundInput) =>
      RoundService.deleteLastRound(input.gameId, input.roundNumber),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<LiveMatchBundle>(queryKey);
      if (previous) {
        queryClient.setQueryData<LiveMatchBundle>(queryKey, {
          ...previous,
          rounds: previous.rounds.filter(
            (r) => !(r.game_id === input.gameId && r.round_number === input.roundNumber)
          ),
        });
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast({
        title: 'Could not undo round',
        description: getUIErrorMessage(error),
        variant: 'destructive',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { submitRound, undoLastRound };
}
