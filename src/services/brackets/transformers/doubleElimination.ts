
import { PlayoffMatch } from "@/types";

/**
 * Transforms double elimination matches from database format to application format
 * @param matchesData Raw playoff matches data from the database
 * @returns Transformed matches in application format
 */
export const transformDoubleEliminationMatches = (matchesData: any[]): PlayoffMatch[] => {
  return matchesData?.map(match => {
    // Calculate game wins from the actual games if needed
    const gamesData = match.playoff_games || [];
    const calculatedTeam1GameWins = gamesData.filter(
      (game: any) => game.winner_id === match.team1_id
    ).length;
    const calculatedTeam2GameWins = gamesData.filter(
      (game: any) => game.winner_id === match.team2_id
    ).length;
    
    return {
      id: match.id,
      round: match.round,
      position: match.position,
      team1Id: match.team1_id,
      team2Id: match.team2_id,
      team1Score: match.team1_score,
      team2Score: match.team2_score,
      // Use calculated values from games if direct fields don't exist
      team1GameWins: calculatedTeam1GameWins,
      team2GameWins: calculatedTeam2GameWins,
      winnerId: match.winner_id,
      loserId: match.loser_id,
      matchType: match.match_type,
      team1Seed: match.team1_seed,
      team2Seed: match.team2_seed,
      nextWinMatchId: match.next_win_match_id,
      nextLoseMatchId: match.next_lose_match_id,
      bestOf: match.best_of || 3,
      games: match.playoff_games?.map((game: any) => ({
        id: game.id,
        team1Score: game.team1_score,
        team2Score: game.team2_score,
        winner: game.winner_id
      })) || []
    };
  }) || [];
};
