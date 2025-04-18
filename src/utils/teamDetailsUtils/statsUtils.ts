
import { Team, Match } from "@/types";
import { calculateSOS } from "@/utils/rankingUtils";

/**
 * Calculate win percentage
 */
export const calculateWinPercentage = (team: Team | undefined) => {
  if (!team) return "0.0";
  const wins = team.wins || 0;
  const losses = team.losses || 0;
  const totalGames = wins + losses;
  return totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0.0";
};

/**
 * Calculate detailed team statistics
 */
export const calculateTeamStats = async (
  team: Team | undefined, 
  allTeams: Team[] | undefined, 
  matches: Match[] | undefined
) => {
  if (!team || !matches) return {
    gamesWon: 0,
    gamesLost: 0,
    gameWinPercentage: "0.0",
    strengthOfSchedule: "0.00",
    closeMatchLosses: 0,
    powerScore: 0.0
  };
  
  let gamesWon = 0;
  let gamesLost = 0;
  let closeMatchLosses = 0;
  
  // Calculate games won and lost
  matches.forEach(match => {
    if (!match.iscompleted) return;
    
    if (match.team1Id === team.id) {
      gamesWon += match.team1_game_wins || 0;
      gamesLost += match.team2_game_wins || 0;
      
      // Check for close match loss (lost match but won at least one game)
      if (match.loserId === team.id && (match.team1_game_wins || 0) > 0) {
        closeMatchLosses++;
      }
    } else if (match.team2Id === team.id) {
      gamesWon += match.team2_game_wins || 0;
      gamesLost += match.team1_game_wins || 0;
      
      // Check for close match loss (lost match but won at least one game)
      if (match.loserId === team.id && (match.team2_game_wins || 0) > 0) {
        closeMatchLosses++;
      }
    }
  });
  
  const totalGames = gamesWon + gamesLost;
  const gameWinPercentage = totalGames > 0 ? ((gamesWon / totalGames) * 100).toFixed(1) : "0.0";
  
  // Calculate SOS
  let strengthOfSchedule = 0.5;
  if (team && allTeams) {
    strengthOfSchedule = await calculateSOS(team, allTeams, matches);
  }
  
  // Calculate Power Score
  const winPercentValue = team.wins + team.losses > 0 ? team.wins / (team.wins + team.losses) : 0;
  const gameWinPercentValue = parseFloat(gameWinPercentage) / 100;
  const powerScore = (winPercentValue * 0.5) + (gameWinPercentValue * 0.3) + (strengthOfSchedule * 0.2);
  const formattedPowerScore = (powerScore * 100).toFixed(1);
  
  return {
    gamesWon,
    gamesLost,
    gameWinPercentage,
    strengthOfSchedule: strengthOfSchedule.toFixed(2),
    closeMatchLosses,
    powerScore: parseFloat(formattedPowerScore)
  };
};
