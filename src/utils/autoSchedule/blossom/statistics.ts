import { Team } from '@/types';
import { TeamPairing } from '@/types/autoSchedule';
import { debugLog } from '@/utils/logger';

import { getTierFromDivision } from './tierUtils';

/**
 * Log comprehensive statistics about the final result
 */
export function logFinalStatistics(
  teams: Team[],
  finalPairings: TeamPairing[],
  targetMatchesPerTeam: number
): void {
  const teamMatchCounts = new Map<string, number>();
  teams.forEach((team) => teamMatchCounts.set(team.id, 0));

  // Count matches per team
  finalPairings.forEach((pairing) => {
    teamMatchCounts.set(pairing.team1.id, (teamMatchCounts.get(pairing.team1.id) || 0) + 1);
    teamMatchCounts.set(pairing.team2.id, (teamMatchCounts.get(pairing.team2.id) || 0) + 1);
  });

  // Analyze distribution
  const matchDistribution = new Map<number, number>();
  teams.forEach((team) => {
    const matchCount = teamMatchCounts.get(team.id) || 0;
    matchDistribution.set(matchCount, (matchDistribution.get(matchCount) || 0) + 1);
  });

  debugLog('=== BLOSSOM ALGORITHM STATISTICS ===');
  debugLog(`Target matches per team: ${targetMatchesPerTeam}`);
  debugLog(`Total pairings generated: ${finalPairings.length}`);
  debugLog(`Expected pairings: ${teams.length}`);

  debugLog('Match distribution:');
  matchDistribution.forEach((teamCount, matchCount) => {
    const status = matchCount === targetMatchesPerTeam ? '✓' : '⚠️';
    debugLog(`  ${status} ${teamCount} teams with ${matchCount} matches`);
  });

  // Count rematches
  const rematchCount = finalPairings.filter((p) => p.hasPlayedBefore).length;
  debugLog(`Rematches: ${rematchCount}/${finalPairings.length}`);

  // Calculate average compatibility score
  const avgScore =
    finalPairings.reduce((sum, p) => sum + p.compatibilityScore, 0) / finalPairings.length;
  debugLog(`Average compatibility score: ${avgScore.toFixed(2)}`);

  // Analyze tier distribution
  const tierPairings = new Map<string, number>();
  finalPairings.forEach((pairing) => {
    const tier1 = getTierFromDivision(pairing.team1.divisionName);
    const tier2 = getTierFromDivision(pairing.team2.divisionName);
    const tierKey =
      tier1 === tier2
        ? `T${tier1}-T${tier2}`
        : `T${Math.min(tier1, tier2)}-T${Math.max(tier1, tier2)}`;
    tierPairings.set(tierKey, (tierPairings.get(tierKey) || 0) + 1);
  });

  debugLog('Tier distribution:');
  tierPairings.forEach((count, tierKey) => {
    debugLog(`  ${tierKey}: ${count} pairings`);
  });

  debugLog('=== END STATISTICS ===');
}
