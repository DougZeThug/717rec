
import { TeamPairing } from '@/types/autoSchedule';
import { DualMatchMetrics, TeamMatchCount, DualBlockValidationResult } from './types';

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
  
  // Calculate teams with duplicate opponents
  let teamsWithDuplicateOpponents = 0;
  
  // Calculate average compatibility score
  let totalCompatibilityScore = 0;
  let totalMatches = primaryBlockPairings.length + secondaryBlockPairings.length;
  
  [...primaryBlockPairings, ...secondaryBlockPairings].forEach(pairing => {
    totalCompatibilityScore += pairing.compatibilityScore;
  });
  
  const averageCompatibilityScore = totalMatches > 0 
    ? totalCompatibilityScore / totalMatches 
    : 0;
  
  // Calculate block balance score
  const totalTeams = Object.keys(teamMatchCounts).length;
  const blockBalanceScore = totalTeams > 0 
    ? (teamsWithBothMatches / totalTeams) * 100 
    : 0;
  
  Object.entries(teamMatchCounts).forEach(([teamId, tc]) => {
    if (tc.matchCount === 2) {
      // Check for duplicate opponents
      const uniqueOpponents = new Set(tc.opponents);
      if (uniqueOpponents.size < tc.opponents.length) {
        teamsWithDuplicateOpponents++;
      }
      
      // Reward teams that have two different opponents
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
  
  // Calculate overall quality score (0-100)
  const overallQualityScore = calculateOverallQualityScore({
    crossBlockCompatibility,
    teamsWithBothMatches,
    teamsWithDuplicateOpponents,
    totalTeams,
    averageCompatibilityScore,
    blockBalanceScore
  });
  
  return {
    teamsWithBothMatches,
    teamsWithSingleMatch,
    crossBlockCompatibility,
    teamsWithDuplicateOpponents,
    averageCompatibilityScore,
    overallQualityScore,
    blockBalanceScore
  };
};

/**
 * Calculate overall quality score for dual block schedule
 */
function calculateOverallQualityScore(metrics: {
  crossBlockCompatibility: number;
  teamsWithBothMatches: number;
  teamsWithDuplicateOpponents: number;
  totalTeams: number;
  averageCompatibilityScore: number;
  blockBalanceScore: number;
}): number {
  // Weight factors for different aspects of quality
  const weights = {
    crossBlockWeight: 0.3,      // How well opponents are distributed
    duplicateWeight: 0.2,       // Penalty for duplicate opponents
    compatibilityWeight: 0.3,   // Team compatibility scores
    balanceWeight: 0.2          // Block balance
  };
  
  // Calculate normalized scores (0-100)
  const crossBlockScore = (metrics.crossBlockCompatibility / 10) * 100;
  
  // Calculate duplicate opponent penalty (100 = no duplicates, 0 = all duplicates)
  const duplicateScore = metrics.totalTeams > 0 
    ? 100 - ((metrics.teamsWithDuplicateOpponents / metrics.totalTeams) * 100)
    : 100;
  
  // Calculate compatibility score (0-100)
  const compatibilityScore = Math.min(100, (metrics.averageCompatibilityScore / 10) * 100);
  
  // Calculate weighted sum
  const weightedScore = 
    crossBlockScore * weights.crossBlockWeight +
    duplicateScore * weights.duplicateWeight +
    compatibilityScore * weights.compatibilityWeight + 
    metrics.blockBalanceScore * weights.balanceWeight;
  
  // Return rounded score
  return Math.round(weightedScore);
}

/**
 * Validate dual block schedule for issues like overbooking and duplicate opponents
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
      const team = [...primaryBlockPairings, ...secondaryBlockPairings].find(
        p => p.team1.id === teamId
      )?.team1 || 
      [...primaryBlockPairings, ...secondaryBlockPairings].find(
        p => p.team2.id === teamId
      )?.team2;
      
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
 * Find teams that have the same opponent across blocks
 */
export const findTeamsWithSameOpponent = (
  primaryBlockPairings: TeamPairing[],
  secondaryBlockPairings: TeamPairing[]
): string[] => {
  const teamOpponents: Record<string, string[]> = {};
  const duplicateTeams: string[] = [];
  
  // Process primary block
  primaryBlockPairings.forEach(pairing => {
    const team1Id = pairing.team1.id;
    const team2Id = pairing.team2.id;
    
    if (!teamOpponents[team1Id]) teamOpponents[team1Id] = [];
    if (!teamOpponents[team2Id]) teamOpponents[team2Id] = [];
    
    teamOpponents[team1Id].push(team2Id);
    teamOpponents[team2Id].push(team1Id);
  });
  
  // Process secondary block and check for duplicates
  secondaryBlockPairings.forEach(pairing => {
    const team1Id = pairing.team1.id;
    const team2Id = pairing.team2.id;
    
    // Check if team1 already played against team2
    if (teamOpponents[team1Id]?.includes(team2Id)) {
      if (!duplicateTeams.includes(team1Id)) duplicateTeams.push(team1Id);
      if (!duplicateTeams.includes(team2Id)) duplicateTeams.push(team2Id);
    }
    
    // Add the opponents to track for future checks
    if (!teamOpponents[team1Id]) teamOpponents[team1Id] = [];
    if (!teamOpponents[team2Id]) teamOpponents[team2Id] = [];
    
    teamOpponents[team1Id].push(team2Id);
    teamOpponents[team2Id].push(team1Id);
  });
  
  return duplicateTeams;
};
