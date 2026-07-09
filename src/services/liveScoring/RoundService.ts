import { DuplicateRoundError, ValidationError } from '@/types/errors';
import { validateBreakdown } from '@/utils/liveScoring/bagBreakdown';
import { isValidRoundScore } from '@/utils/liveScoring/scoring';
import type { BagBreakdown } from '@/utils/liveScoring/types';

import type { Tables } from '@/integrations/supabase/types';
type MatchRoundRow = Tables<'match_rounds'>;
import { supabase } from '@/integrations/supabase/client';
import { handleLiveScoringError, ROUND_COLUMNS } from './LiveMatchService';

export interface InsertRoundInput {
  matchId: string;
  gameId: string;
  roundNumber: number;
  team1Score: number;
  team2Score: number;
  team1ThrowerId: string | null;
  team2ThrowerId: string | null;
  team1Bags: BagBreakdown | null;
  team2Bags: BagBreakdown | null;
  enteredByUserId: string;
}

export const RoundService = {
  insertRound: async (input: InsertRoundInput): Promise<MatchRoundRow> => {
    if (!isValidRoundScore(input.team1Score) || !isValidRoundScore(input.team2Score)) {
      throw new ValidationError('Round scores must be 0-12 (11 is not possible in cornhole)');
    }
    if (input.team1Bags && !validateBreakdown(input.team1Score, input.team1Bags)) {
      throw new ValidationError('Bag breakdown does not match the round score');
    }
    if (input.team2Bags && !validateBreakdown(input.team2Score, input.team2Bags)) {
      throw new ValidationError('Bag breakdown does not match the round score');
    }

    const { data, error } = await supabase
      .from('match_rounds')
      .insert({
        match_id: input.matchId,
        game_id: input.gameId,
        round_number: input.roundNumber,
        team1_score: input.team1Score,
        team2_score: input.team2Score,
        team1_thrower_id: input.team1ThrowerId,
        team2_thrower_id: input.team2ThrowerId,
        team1_bags_in: input.team1Bags?.bagsIn ?? null,
        team1_bags_on: input.team1Bags?.bagsOn ?? null,
        team1_bags_off: input.team1Bags?.bagsOff ?? null,
        team2_bags_in: input.team2Bags?.bagsIn ?? null,
        team2_bags_on: input.team2Bags?.bagsOn ?? null,
        team2_bags_off: input.team2Bags?.bagsOff ?? null,
        entered_by_user_id: input.enteredByUserId,
      })
      .select(ROUND_COLUMNS)
      .single();

    if (error) {
      // Unique (game_id, round_number): another scorer already saved this round.
      if (error.code === '23505') {
        throw new DuplicateRoundError(input.gameId, input.roundNumber);
      }
      handleLiveScoringError(error, 'Failed to save round');
    }
    if (!data) {
      throw new ValidationError('Round insert returned no data');
    }
    return data;
  },

  /**
   * Undo: delete one specific round. Filtering on BOTH game and round number
   * makes a concurrent double-undo remove nothing instead of the wrong round;
   * RLS additionally restricts non-admins to the latest round of the game.
   */
  deleteLastRound: async (gameId: string, roundNumber: number): Promise<boolean> => {
    const { data, error } = await supabase
      .from('match_rounds')
      .delete()
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)
      .select('id');

    if (error) handleLiveScoringError(error, 'Failed to undo round');
    return (data?.length ?? 0) > 0;
  },
};
