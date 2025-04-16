
import { Match } from "@/types";

/**
 * Calculate game-level statistics for a team
 */
export const calculateGameStats = (teamId: string, matches: Match[] | undefined) => {
  if (!matches) {
    return {
      gamesWon: 0,
      gamesLost: 0,
      gameWinPercentage: 0,
      closeMatchLosses: 0
    };
  }
  
  let gamesWon = 0;
  let gamesLost = 0;
  let closeMatchLosses = 0;
  
  // Filter matches involving this team
  const teamMatches = matches.filter(
    match => match.team1Id === teamId || match.team2Id === teamId
  );
  
  teamMatches.forEach(match => {
    if (!match.iscompleted) return;
    
    // Game wins calculation
    if (match.team1Id === teamId) {
      gamesWon += match.team1_game_wins || 0;
      gamesLost += match.team2_game_wins || 0;
      
      // Check for close match loss (lost match but won at least one game)
      if (match.loserId === teamId && (match.team1_game_wins || 0) > 0) {
        closeMatchLosses++;
      }
    } else if (match.team2Id === teamId) {
      gamesWon += match.team2_game_wins || 0;
      gamesLost += match.team1_game_wins || 0;
      
      // Check for close match loss (lost match but won at least one game)
      if (match.loserId === teamId && (match.team2_game_wins || 0) > 0) {
        closeMatchLosses++;
      }
    }
  });
  
  const totalGames = gamesWon + gamesLost;
  const gameWinPercentage = totalGames > 0 ? gamesWon / totalGames : 0;
  
  return {
    gamesWon,
    gamesLost,
    gameWinPercentage,
    closeMatchLosses
  };
};
