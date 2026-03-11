import { TeamPairing } from '@/types/autoSchedule';

import { calculateOverallQualityScore } from './qualityScoreUtils';
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
  primaryBlockPairings.forEach((pairing) => processBlockPairing(pairing, teamMatchCounts));

  // Process secondary block
  secondaryBlockPairings.forEach((pairing) => processBlockPairing(pairing, teamMatchCounts));

  // Count teams with both matches and teams with only one match
  const teamsWithBothMatches = Object.values(teamMatchCounts).filter(
    (tc) => tc.matchCount === 2
  ).length;
  const teamsWithSingleMatch = Object.values(teamMatchCounts).filter(
    (tc) => tc.matchCount === 1
  ).length;

  // Calculate cross-block compatibility score
  let crossBlockCompatibility = 0;
  let teamCount = 0;

  // Calculate teams with duplicate opponents
  let teamsWithDuplicateOpponents = 0;

  // Calculate average compatibility score
  let totalCompatibilityScore = 0;
  const totalMatches = primaryBlockPairings.length + secondaryBlockPairings.length;

  [...primaryBlockPairings, ...secondaryBlockPairings].forEach((pairing) => {
    totalCompatibilityScore += pairing.compatibilityScore;
  });

  const averageCompatibilityScore = totalMatches > 0 ? totalCompatibilityScore / totalMatches : 0;

  // Calculate block balance score
  const totalTeams = Object.keys(teamMatchCounts).length;
  const blockBalanceScore = totalTeams > 0 ? (teamsWithBothMatches / totalTeams) * 100 : 0;

  Object.entries(teamMatchCounts).forEach(([_teamId, tc]) => {
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
    blockBalanceScore,
  });

  return {
    teamsWithBothMatches,
    teamsWithSingleMatch,
    crossBlockCompatibility,
    teamsWithDuplicateOpponents,
    averageCompatibilityScore,
    overallQualityScore,
    blockBalanceScore,
  };
};

/**
 * Helper function to process a pairing and update team match counts
 */
const processBlockPairing = (
  pairing: TeamPairing,
  teamMatchCounts: Record<string, TeamMatchCount>
) => {
  const team1Id = pairing.team1.id;
  const team2Id = pairing.team2.id;

  if (!teamMatchCounts[team1Id]) teamMatchCounts[team1Id] = { matchCount: 0, opponents: [] };
  if (!teamMatchCounts[team2Id]) teamMatchCounts[team2Id] = { matchCount: 0, opponents: [] };

  teamMatchCounts[team1Id].matchCount++;
  teamMatchCounts[team1Id].opponents.push(team2Id);

  teamMatchCounts[team2Id].matchCount++;
  teamMatchCounts[team2Id].opponents.push(team1Id);
};
