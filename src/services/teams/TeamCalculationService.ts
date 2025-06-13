
import { Team } from "@/types";

// Team calculation service - now uses database-calculated values exclusively
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
    // Power score uses corrected weighted formulas from database
    powerScore: team.power_score || 50.0,
    // SOS calculated in database using opponent division weights
    sos: team.sos || 0.5
  };
};

export const getTeamRank = (teams: Team[], teamId: string): number => {
  // Sort teams by corrected power score (database-calculated) descending
  const sortedTeams = [...teams].sort((a, b) => (b.power_score || 0) - (a.power_score || 0));
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
    powerScore: stats.powerScore.toFixed(1),
    sos: stats.sos.toFixed(3)
  };
};
