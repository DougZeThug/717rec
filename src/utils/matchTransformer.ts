
import { PlayoffMatch, PlayoffGame } from "@/types";

/**
 * Transforms raw match data from Supabase into our application PlayoffMatch type
 */
export const transformMatches = (matchesData: any[]): PlayoffMatch[] => {
  return matchesData.map((match): PlayoffMatch => ({
    id: match.id,
    round: match.round_number,
    position: match.position || 0,
    team1Id: match.team1_id,
    team2Id: match.team2_id,
    winnerId: match.winner_id,
    team1Score: match.games?.filter(g => g.team1_score > g.team2_score).length || 0,
    team2Score: match.games?.filter(g => g.team2_score > g.team1_score).length || 0,
    matchType: match.match_type as "Winners" | "Losers" | "Finals" || "Winners",
    bestOf: match.best_of || 3,
    games: transformGames(match.games || [])
  }));
};

/**
 * Transforms raw game data from Supabase into our application PlayoffGame type
 */
export const transformGames = (gamesData: any[]): PlayoffGame[] => {
  return gamesData.map(game => ({
    id: game.id,
    team1Score: game.team1_score || 0,
    team2Score: game.team2_score || 0,
    winner: game.team1_score > game.team2_score ? 'team1Id' : 'team2Id'
  }));
};
