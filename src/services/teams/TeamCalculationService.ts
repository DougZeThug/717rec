
import { Team } from "@/types";

// Team calculation service - now handles NULL power scores for teams with no matches
// The power score calculation is handled in v_team_details using the corrected 40/40/20 formula:
// - 40% Weighted Match Win % = (sum of wins × opponent_weights) / total_matches  
// - 40% Strength of Schedule = average opponent division weight
// - 20% Weighted Game Win % = (sum of game_wins × opponent_weights) / total_games

export const calculateTeamStats = (team: Team) => {
  const totalMatches = (team.wins || 0) + (team.losses || 0);
  const totalGames = (team.game_wins || 0) + (team.game_losses || 0);
  
  return {
    winPercentage: totalMatches > 0 ? (team.wins || 0) / totalMatches : 0,
    gameWinPercentage: totalGames > 0 ? (team.game_wins || 0) / totalGames : 0,
    totalMatches,
    totalGames,
    // Power score is NULL for teams with no matches, calculated for others
    powerScore: team.power_score, // Keep as-is (NULL or calculated value)
    // SOS calculated in database using opponent division weights
    sos: team.sos || 0.5
  };
};

export const getTeamRank = (teams: Team[], teamId: string): number => {
  // Sort teams by power score (database-calculated) descending, with NULL values at the end
  const sortedTeams = [...teams].sort((a, b) => {
    const aPowerScore = a.power_score;
    const bPowerScore = b.power_score;
    
    // Handle NULL values - put them at the end
    if (aPowerScore === null && bPowerScore === null) return 0;
    if (aPowerScore === null) return 1;
    if (bPowerScore === null) return -1;
    
    return bPowerScore - aPowerScore;
  });
  
  const rank = sortedTeams.findIndex(team => team.id === teamId) + 1;
  return rank > 0 ? rank : teams.length;
};

export const formatTeamStats = (team: Team) => {
  const stats = calculateTeamStats(team);
  
  return {
    record: `${team.wins || 0}-${team.losses || 0}`,
    gameRecord: `${team.game_wins || 0}-${team.game_losses || 0}`,
    winPercentage: (stats.winPercentage * 100).toFixed(1),
    gameWinPercentage: (stats.gameWinPercentage * 100).toFixed(1),
    powerScore: stats.powerScore !== null ? stats.powerScore.toFixed(1) : "N/A",
    sos: stats.sos.toFixed(3)
  };
};
