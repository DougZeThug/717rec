
import { Match } from "@/types";

export const transformMatchData = (match: any): Match => ({
  id: match.id,
  team1Id: match.team1_id || '',
  team2Id: match.team2_id || '',
  team1Score: match.team1_score,
  team2Score: match.team2_score,
  date: match.date || match.created_at || new Date().toISOString(),
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
  best_of: match.best_of
});
