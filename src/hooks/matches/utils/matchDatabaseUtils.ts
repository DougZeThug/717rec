import { fetchMatchTeamIds } from '@/services/matches/MatchReadService';
import { resubmitMatchResult } from '@/services/matches/MatchWriteService';
import { matchLog } from '@/utils/logger';

export interface UpdateMatchScoreParams {
  matchId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins: number;
  team2GameWins: number;
}

export interface UpdateMatchScoreResult {
  data: Awaited<ReturnType<typeof resubmitMatchResult>>;
  team1_id: string;
  team2_id: string;
  team1Win: boolean;
}

export const updateMatchScore = async ({
  matchId,
  team1Score,
  team2Score,
  team1GameWins,
  team2GameWins,
}: UpdateMatchScoreParams): Promise<UpdateMatchScoreResult> => {
  matchLog('updateMatchScore called with:', {
    matchId,
    team1Score,
    team2Score,
    team1GameWins,
    team2GameWins,
  });

  // First get the match to extract team IDs
  const matchData = await fetchMatchTeamIds(matchId);

  const { team1_id, team2_id } = matchData;

  if (!team1_id || !team2_id) {
    throw new Error(`Cannot update score: match ${matchId} is missing team IDs`);
  }

  // Determine winner based on scores
  const team1Win = team1Score > team2Score;
  const winnerId = team1Win ? team1_id : team2_id;
  const loserId = team1Win ? team2_id : team1_id;

  matchLog('Match result:', {
    team1Win,
    winnerId,
    loserId,
    team1_id,
    team2_id,
  });

  // Atomically reverse prior stats (if any), write scores + winner, apply new
  // counters, and refresh season stats in one transaction.
  const winnerGameWins = team1Win ? team1GameWins : team2GameWins;
  const loserGameWins = team1Win ? team2GameWins : team1GameWins;
  const data = await resubmitMatchResult(matchId, winnerId, loserId, winnerGameWins, loserGameWins);

  matchLog('Match result submitted atomically:', data);

  // Badges are awarded by the database, inside the same transaction as the
  // result, by process_all_match_badges(). They used to be fourteen sequential
  // calls from here, which meant a match finalised through live scoring earned
  // none at all and closing this tab mid-loop silently lost the rest. See
  // migration 20260828120000_shared_match_badge_rulebook.sql.

  return {
    data,
    team1_id,
    team2_id,
    team1Win,
  };
};
