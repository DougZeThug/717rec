
import { Match } from "@/types";
import { normalizeDateWithTime } from "./dateNormalization";
import { matchLog } from "@/utils/logger";

export const transformMatchData = (match: any): Match => {
  // Force date normalization with detailed context but preserve time
  const normalizedDate = normalizeDateWithTime(match.date, `transformMatchData(${match.id})`);
  
  // Log before/after state for debugging
  matchLog(`transformMatchData for match ${match.id}:`, {
    originalDate: match.date, 
    originalDateType: typeof match.date,
    normalizedDate,
    normalizedDateType: typeof normalizedDate
  });
  
  return {
    id: match.id,
    team1Id: match.team1_id || '',
    team2Id: match.team2_id || '',
    team1Score: match.team1_score,
    team2Score: match.team2_score,
    date: normalizedDate,
    location: match.location || '',
    iscompleted: match.iscompleted || false,
    winnerId: match.winner_id,
    loserId: match.loser_id,
    round_number: match.round_number,
    position: match.position,
    bracket_id: match.bracket_id,
    match_type: match.match_type,
    next_match_id: match.next_match_id,
    next_loser_match_id: match.next_loser_match_id,
    best_of: match.best_of,
    team1_game_wins: match.team1_game_wins,
    team2_game_wins: match.team2_game_wins
  };
};
