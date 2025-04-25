
import { Match } from "@/types";

const normalizeDate = (date: Date | string | null): string => {
  if (!date) return new Date().toISOString();
  
  if (typeof date === 'object' && date instanceof Date) {
    return date.toISOString();
  }
  
  // If it's already a string, ensure it's in ISO format
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }
  
  // Fallback to current date if invalid
  return new Date().toISOString();
};

export const transformMatchData = (match: any): Match => {
  const normalizedDate = normalizeDate(match.date);
  
  console.log("🔍 DIAGNOSTIC: Normalizing match date in transformer:", {
    originalDate: match.date,
    originalType: typeof match.date,
    normalizedDate,
    matchId: match.id
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
