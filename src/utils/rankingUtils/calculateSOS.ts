
import { Team } from "@/types";

/**
 * Calculate the strength of schedule (SOS) for a team
 */
export const calculateSOS = (team: Team, allTeams: Team[]) => {
  if (!team || !allTeams || allTeams.length === 0) return 0.5;
  
  const otherTeams = allTeams.filter(t => t.id !== team.id);
  
  if (otherTeams.length === 0) return 0.5;
  
  let divisionWeight = 0.85;
  if (team.divisionName === 'Recreational') divisionWeight = 0.7;
  if (team.divisionName === 'Competitive') divisionWeight = 1.0;
  
  const opponentWinRates = otherTeams.map(opponent => {
    const totalGames = (opponent.wins || 0) + (opponent.losses || 0);
    return totalGames > 0 ? ((opponent.wins || 0) / totalGames) : 0.5;
  });
  
  if (opponentWinRates.length === 0) return 0.5;
  
  const avgOpponentWinRate = opponentWinRates.reduce((sum, rate) => sum + rate, 0) / opponentWinRates.length;
  
  return avgOpponentWinRate * divisionWeight;
};
