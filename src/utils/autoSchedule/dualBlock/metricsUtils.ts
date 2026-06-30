import { TeamPairing } from '@/types/autoSchedule';

import { calculateOverallQualityScore } from './qualityScoreUtils';
import { DualMatchMetrics, TeamMatchCount } from './types';

/**
 * Calculate metrics for dual / multi-block pairings.
 *
 * Accepts either:
 *  - a record of '{ [blockId]: TeamPairing[] }' for the full schedule, OR
 *  - the legacy two-argument form '(primaryBlockPairings, secondaryBlockPairings)'.
 *
 * Teams are considered to have "matches in multiple time blocks" only when
 * their pairings span 2+ distinct block ids — a team that plays twice inside
 * the same block (double header in one block) is counted as a single-block
 * team, which matches what the UI copy implies.
 */
export function calculateDualBlockMetrics(
  pairingsByBlock: Record<string, TeamPairing[]>
): DualMatchMetrics;
export function calculateDualBlockMetrics(
  primaryBlockPairings: TeamPairing[],
  secondaryBlockPairings: TeamPairing[]
): DualMatchMetrics;
export function calculateDualBlockMetrics(
  pairingsOrPrimary: Record<string, TeamPairing[]> | TeamPairing[],
  secondaryBlockPairings?: TeamPairing[]
): DualMatchMetrics {
  // Normalize inputs into a per-block map
  const pairingsByBlock: Record<string, TeamPairing[]> = Array.isArray(pairingsOrPrimary)
    ? { primary: pairingsOrPrimary, secondary: secondaryBlockPairings ?? [] }
    : pairingsOrPrimary;

  const blockIds = Object.keys(pairingsByBlock);
  const allPairings: TeamPairing[] = blockIds.flatMap((id) => pairingsByBlock[id] ?? []);

  // Track team IDs and their match count
  const teamMatchCounts: Record<string, TeamMatchCount> = {};

  // Process every block, tagging each appearance with its block id
  blockIds.forEach((blockId) => {
    (pairingsByBlock[blockId] ?? []).forEach((pairing) =>
      processBlockPairing(pairing, teamMatchCounts, blockId)
    );
  });

  // "Both matches" = team appears in 2+ distinct time blocks
  // "Single match" = team appears in exactly one time block
  const teamsWithBothMatches = Object.values(teamMatchCounts).filter(
    (tc) => tc.blocks.size >= 2
  ).length;
  const teamsWithSingleMatch = Object.values(teamMatchCounts).filter(
    (tc) => tc.blocks.size === 1
  ).length;

  // Calculate cross-block compatibility score
  let crossBlockCompatibility = 0;
  let teamCount = 0;

  // Calculate teams with duplicate opponents
  let teamsWithDuplicateOpponents = 0;

  // Calculate average compatibility score
  let totalCompatibilityScore = 0;
  const totalMatches = allPairings.length;

  allPairings.forEach((pairing) => {
    totalCompatibilityScore += pairing.compatibilityScore;
  });

  const averageCompatibilityScore = totalMatches > 0 ? totalCompatibilityScore / totalMatches : 0;

  // Calculate block balance score
  const totalTeams = Object.keys(teamMatchCounts).length;
  const blockBalanceScore = totalTeams > 0 ? (teamsWithBothMatches / totalTeams) * 100 : 0;

  Object.entries(teamMatchCounts).forEach(([_teamId, tc]) => {
    if (tc.blocks.size >= 2) {
      // Check for duplicate opponents
      const uniqueOpponents = new Set(tc.opponents);
      if (uniqueOpponents.size < tc.opponents.length) {
        teamsWithDuplicateOpponents++;
      }

      // Reward teams that have two different opponents
      if (uniqueOpponents.size >= 2) {
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
}

/**
 * Helper function to process a pairing and update team match counts
 */
const processBlockPairing = (
  pairing: TeamPairing,
  teamMatchCounts: Record<string, TeamMatchCount>,
  blockId: string
) => {
  const team1Id = pairing.team1.id;
  const team2Id = pairing.team2.id;

  if (!teamMatchCounts[team1Id]) {
    teamMatchCounts[team1Id] = { matchCount: 0, opponents: [], blocks: new Set<string>() };
  }
  if (!teamMatchCounts[team2Id]) {
    teamMatchCounts[team2Id] = { matchCount: 0, opponents: [], blocks: new Set<string>() };
  }

  teamMatchCounts[team1Id].matchCount++;
  teamMatchCounts[team1Id].opponents.push(team2Id);
  teamMatchCounts[team1Id].blocks.add(blockId);

  teamMatchCounts[team2Id].matchCount++;
  teamMatchCounts[team2Id].opponents.push(team1Id);
  teamMatchCounts[team2Id].blocks.add(blockId);
};
