
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
    loserId: match.loser_id,
    team1Score: match.team1_score,
    team2Score: match.team2_score,
    team1GameWins: match.team1_game_wins,
    team2GameWins: match.team2_game_wins,
    matchType: match.match_type as "winners" | "losers" | "finals" | "play-in" || "winners",
    bestOf: match.best_of || 3,
    games: transformGames(match.games || []),
    nextWinMatchId: match.next_match_id, // Link to next match for winner
    nextLoseMatchId: match.next_loser_match_id, // Link to next match for loser
    team1Seed: match.team1_seed, // Team 1 seed
    team2Seed: match.team2_seed // Team 2 seed
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
