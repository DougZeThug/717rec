
import { TeamPairing } from '@/types/autoSchedule';

/**
 * Find teams that have the same opponent in both blocks
 * 
 * @param primaryPairings - Pairings from the first block
 * @param secondaryPairings - Pairings from the second block
 * @returns Array of team IDs that have the same opponent in both blocks
 */
export const findTeamsWithSameOpponent = (
  primaryPairings: TeamPairing[],
  secondaryPairings: TeamPairing[]
): string[] => {
  // Map each team to their opponent in the primary block
  const primaryOpponents: Record<string, string> = {};
  primaryPairings.forEach(pairing => {
    primaryOpponents[pairing.team1.id] = pairing.team2.id;
    primaryOpponents[pairing.team2.id] = pairing.team1.id;
  });
  
  // Check if any team has the same opponent in the secondary block
  const teamsWithSameOpponent: string[] = [];
  
  secondaryPairings.forEach(pairing => {
    // Check team1
    if (primaryOpponents[pairing.team1.id] === pairing.team2.id) {
      teamsWithSameOpponent.push(pairing.team1.id);
    }
    
    // Check team2
    if (primaryOpponents[pairing.team2.id] === pairing.team1.id) {
      teamsWithSameOpponent.push(pairing.team2.id);
    }
  });
  
  return teamsWithSameOpponent;
};
