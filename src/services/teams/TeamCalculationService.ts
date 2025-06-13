
import { Team } from "@/types";

// Team calculation service - now primarily uses database-calculated values
// The power score calculation has been moved to the database view v_team_details
// using the correct 40/40/20 weighted formula

export const calculateTeamStats = (team: Team) => {
  const totalMatches = (team.wins || 0) + (team.losses || 0);
  const totalGames = (team.game_wins || 0) + (team.game_losses || 0);
  
  return {
    winPercentage: totalMatches > 0 ? (team.wins || 0) / totalMatches : 0,
    gameWinPercentage: totalGames > 0 ? (team.game_wins || 0) / totalGames : 0,
    totalMatches,
    totalGames,
    // Power score is now calculated in the database using the correct formula
    powerScore: team.power_score || 50.0,
    // SOS is calculated in the database using opponent division weights
    sos: team.sos || 0.5
  };
};

export const getTeamRank = (teams: Team[], teamId: string): number => {
  // Sort teams by power score (database-calculated) descending
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
