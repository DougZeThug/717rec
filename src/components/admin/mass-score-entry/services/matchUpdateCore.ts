import { updateMatchArray } from '@/services/matches/MatchWriteService';
import { errorLog, matchLog } from '@/utils/logger';

import { MatchWithTeams } from '../types';

/**
 * Determines winner and loser IDs from match scores
 * Returns null if scores are invalid (neither team has a score of 1)
 */
export const determineWinnerLoser = (
  match: MatchWithTeams
): { winnerId: string; loserId: string } | null => {
  if (match.team1Score === 1) {
    return {
      winnerId: match.team1Id,
      loserId: match.team2Id,
    };
  } else if (match.team2Score === 1) {
    return {
      winnerId: match.team2Id,
      loserId: match.team1Id,
    };
  }

  // Invalid state: neither team has a score of 1
  return null;
};

export const updateMatchInDatabase = async (match: MatchWithTeams): Promise<boolean> => {
  try {
    // Determine winner and loser with validation
    const result = determineWinnerLoser(match);

    if (!result) {
      errorLog(`Invalid match scores for match ${match.id}:`, {
        team1Score: match.team1Score,
        team2Score: match.team2Score,
      });
      return false;
    }

    const { winnerId, loserId } = result;

    matchLog('Submitting match to database:', {
      matchId: match.id,
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      team1GameWins: match.team1_game_wins,
      team2GameWins: match.team2_game_wins,
      winnerId,
      loserId,
    });

    try {
      await updateMatchArray(match.id, {
        team1_score: match.team1Score,
        team2_score: match.team2Score,
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins,
        iscompleted: match.iscompleted,
        winner_id: winnerId,
        loser_id: loserId,
      });
    } catch (error) {
      errorLog(`Error updating match ${match.id}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    errorLog(`Error in updateMatchInDatabase for match ${match.id}:`, error);
    return false;
  }
};
