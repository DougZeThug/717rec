
import { TeamPairing } from '@/types/autoSchedule';
import { DualBlockValidationResult } from './types';

/**
 * Validate dual block schedule for issues like overbooking and duplicate opponents
 * 
 * @param primaryBlockPairings - Pairings from the first block
 * @param secondaryBlockPairings - Pairings from the second block
 * @returns Validation result with potential issues and warnings
 */
export const validateDualBlockSchedule = (
  primaryBlockPairings: TeamPairing[],
  secondaryBlockPairings: TeamPairing[]
): DualBlockValidationResult => {
  const result: DualBlockValidationResult = {
    isValid: true,
    teamsWithDuplicateOpponents: [],
    overbookedTeams: [],
    warnings: [],
    errors: []
  };
  
  // Track team IDs and their opponents across blocks
  const teamOpponents: Record<string, string[]> = {};
  
  // Process all pairings to identify teams and their opponents
  [...primaryBlockPairings, ...secondaryBlockPairings].forEach(pairing => {
    const team1Id = pairing.team1.id;
    const team2Id = pairing.team2.id;
    
    if (!teamOpponents[team1Id]) teamOpponents[team1Id] = [];
    if (!teamOpponents[team2Id]) teamOpponents[team2Id] = [];
    
    teamOpponents[team1Id].push(team2Id);
    teamOpponents[team2Id].push(team1Id);
  });
  
  // Check for teams with duplicate opponents
  Object.entries(teamOpponents).forEach(([teamId, opponents]) => {
    // Create a set of unique opponents
    const uniqueOpponents = new Set(opponents);
    
    // If the set size is less than the array length, we have duplicates
    if (uniqueOpponents.size < opponents.length) {
      result.teamsWithDuplicateOpponents.push(teamId);
      
      // Add warning message
      const team = findTeamById(teamId, [...primaryBlockPairings, ...secondaryBlockPairings]);
      
      if (team) {
        result.warnings.push(`Team "${team.name}" will play the same opponent in multiple blocks.`);
      }
    }
  });
  
  // Add validation errors based on findings
  if (result.teamsWithDuplicateOpponents.length > 0) {
    result.errors.push(`${result.teamsWithDuplicateOpponents.length} teams have duplicate opponents across blocks.`);
    result.isValid = false;
  }
  
  return result;
};

/**
 * Helper function to find a team by ID in pairings
 */
const findTeamById = (teamId: string, pairings: TeamPairing[]) => {
  return pairings.find(p => p.team1.id === teamId)?.team1 || 
         pairings.find(p => p.team2.id === teamId)?.team2;
};
