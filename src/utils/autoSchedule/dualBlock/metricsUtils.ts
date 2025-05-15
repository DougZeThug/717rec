
import { TeamPairing } from '@/types/autoSchedule';
import { DualMatchMetrics, TeamMatchCount } from './types';

/**
 * Calculate metrics for dual block pairings
 * 
 * @param primaryBlockPairings - Pairings from the first block
 * @param secondaryBlockPairings - Pairings from the second block
 * @returns Metrics for the dual block pairings
 */
export const calculateDualBlockMetrics = (
  primaryBlockPairings: TeamPairing[],
  secondaryBlockPairings: TeamPairing[]
): DualMatchMetrics => {
  // Track team IDs and their match count
  const teamMatchCounts: Record<string, TeamMatchCount> = {};
  
  // Process primary block
  primaryBlockPairings.forEach(pairing => {
    const team1Id = pairing.team1.id;
    const team2Id = pairing.team2.id;
    
    if (!teamMatchCounts[team1Id]) teamMatchCounts[team1Id] = { matchCount: 0, opponents: [] };
    if (!teamMatchCounts[team2Id]) teamMatchCounts[team2Id] = { matchCount: 0, opponents: [] };
    
    teamMatchCounts[team1Id].matchCount++;
    teamMatchCounts[team1Id].opponents.push(team2Id);
    
    teamMatchCounts[team2Id].matchCount++;
    teamMatchCounts[team2Id].opponents.push(team1Id);
  });
  
  // Process secondary block
  secondaryBlockPairings.forEach(pairing => {
    const team1Id = pairing.team1.id;
    const team2Id = pairing.team2.id;
    
    if (!teamMatchCounts[team1Id]) teamMatchCounts[team1Id] = { matchCount: 0, opponents: [] };
    if (!teamMatchCounts[team2Id]) teamMatchCounts[team2Id] = { matchCount: 0, opponents: [] };
    
    teamMatchCounts[team1Id].matchCount++;
    teamMatchCounts[team1Id].opponents.push(team2Id);
    
    teamMatchCounts[team2Id].matchCount++;
    teamMatchCounts[team2Id].opponents.push(team1Id);
  });
  
  // Count teams with both matches and teams with only one match
  const teamsWithBothMatches = Object.values(teamMatchCounts).filter(tc => tc.matchCount === 2).length;
  const teamsWithSingleMatch = Object.values(teamMatchCounts).filter(tc => tc.matchCount === 1).length;
  
  // Calculate cross-block compatibility score
  // This measures how well the opponent assignments are distributed between blocks
  let crossBlockCompatibility = 0;
  let teamCount = 0;
  
  Object.values(teamMatchCounts).forEach(tc => {
    if (tc.matchCount === 2) {
      // Reward teams that have two different opponents
      const uniqueOpponents = new Set(tc.opponents);
      if (uniqueOpponents.size === 2) {
        crossBlockCompatibility += 10; // Perfect score for two different opponents
      } else {
        crossBlockCompatibility += 5; // Lower score for duplicate opponents
      }
      teamCount++;
    }
  });
  
  // Calculate average compatibility score
  crossBlockCompatibility = teamCount > 0 ? crossBlockCompatibility / teamCount : 0;
  
  return {
    teamsWithBothMatches,
    teamsWithSingleMatch,
    crossBlockCompatibility
  };
};
