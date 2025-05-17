
import { Match, PlayoffMatch } from "@/types";

/**
 * Transforms database matches to application format for standard matches
 */
export function transformMatches(matchesData: any[]): PlayoffMatch[] {
  if (!matchesData) return [];
  
  return matchesData.map(match => ({
    id: match.id,
    round: match.round_number,
    position: match.position,
    team1Id: match.team1_id,
    team2Id: match.team2_id,
    team1Score: match.team1_score,
    team2Score: match.team2_score, 
    team1GameWins: match.team1_game_wins,
    team2GameWins: match.team2_game_wins,
    winnerId: match.winner_id,
    loserId: match.loser_id,
    matchType: match.match_type,
    team1Seed: match.team1_seed,
    team2Seed: match.team2_seed,
    nextWinMatchId: match.next_match_id,
    nextLoseMatchId: match.next_loser_match_id,
    bestOf: match.best_of || 3,
    games: match.games?.map(game => ({
      id: game.id,
      team1Score: game.team1_score,
      team2Score: game.team2_score,
      winner: game.winner_id || (game.team1_score > game.team2_score ? match.team1_id : match.team2_id)
    })) || []
  }));
}
