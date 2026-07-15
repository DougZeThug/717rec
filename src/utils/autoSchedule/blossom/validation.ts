import { Team } from '@/types';
import { TeamPairing } from '@/types/autoSchedule';
import { errorLog, warnLog } from '@/utils/logger';

import { haveTeamsPlayedBeforeSync } from './historyUtils';
import { getTierFromDivision, isBothRecreational, isExtremeTierDifference } from './tierUtils';
import { TeamPairingConfig } from './types';

/**
 * Validate that no teams play each other more than once in the session
 */
function validateNoSessionRematches(pairings: TeamPairing[]): {
  hasRematches: boolean;
  rematches: string[];
} {
  const pairingCounts = new Map<string, number>();
  const rematches: string[] = [];

  pairings.forEach((pairing) => {
    const key = [pairing.team1.id, pairing.team2.id].sort().join('-');
    const count = (pairingCounts.get(key) || 0) + 1;
    pairingCounts.set(key, count);

    if (count > 1) {
      rematches.push(`${pairing.team1.name} vs ${pairing.team2.name} (${count} times)`);
    }
  });

  return {
    hasRematches: rematches.length > 0,
    rematches,
  };
}

/**
 * Validate that each team gets exactly the target number of matches
 */
export function validatePairings(
  teams: Team[],
  pairings: TeamPairing[],
  targetMatchesPerTeam: number
): void {
  const teamMatchCounts = new Map<string, number>();
  teams.forEach((team) => teamMatchCounts.set(team.id, 0));

  // Count matches per team
  pairings.forEach((pairing) => {
    teamMatchCounts.set(pairing.team1.id, (teamMatchCounts.get(pairing.team1.id) || 0) + 1);
    teamMatchCounts.set(pairing.team2.id, (teamMatchCounts.get(pairing.team2.id) || 0) + 1);
  });

  // Check for teams with incorrect match counts
  const incorrectTeams = teams.filter(
    (team) => (teamMatchCounts.get(team.id) || 0) !== targetMatchesPerTeam
  );

  if (incorrectTeams.length > 0) {
    warnLog(
      'Teams with incorrect match counts:',
      incorrectTeams.map((team) => `${team.name}: ${teamMatchCounts.get(team.id) || 0} matches`)
    );
    throw new Error(`${incorrectTeams.length} teams don't have ${targetMatchesPerTeam} matches`);
  }

  // Validate no session rematches
  const sessionRematches = validateNoSessionRematches(pairings);
  if (sessionRematches.hasRematches) {
    throw new Error(`Session rematches detected: ${sessionRematches.rematches.join(', ')}`);
  }
}

/**
 * Enhanced validation with detailed feedback about why teams are unmatched
 */
export function validatePairingsWithDetails(
  teams: Team[],
  pairings: TeamPairing[],
  targetMatchesPerTeam: number,
  config: TeamPairingConfig
): void {
  const teamMatchCounts = new Map<string, number>();
  teams.forEach((team) => teamMatchCounts.set(team.id, 0));

  pairings.forEach((pairing) => {
    teamMatchCounts.set(pairing.team1.id, (teamMatchCounts.get(pairing.team1.id) || 0) + 1);
    teamMatchCounts.set(pairing.team2.id, (teamMatchCounts.get(pairing.team2.id) || 0) + 1);
  });

  const incorrectTeams = teams.filter(
    (team) => (teamMatchCounts.get(team.id) || 0) !== targetMatchesPerTeam
  );

  if (incorrectTeams.length > 0) {
    // Provide detailed analysis of why each team couldn't be matched
    const details: string[] = [];

    incorrectTeams.forEach((team) => {
      const matchCount = teamMatchCounts.get(team.id) || 0;
      const tier = getTierFromDivision(team.divisionName);

      // Analyze constraints blocking this team
      let tierBlockedCount = 0;
      let rematchBlockedCount = 0;
      let availableCount = 0;

      teams.forEach((other) => {
        if (other.id === team.id) return;

        if (isExtremeTierDifference(team, other)) {
          tierBlockedCount++;
        } else if (
          config.avoidRematches &&
          haveTeamsPlayedBeforeSync(team.id, other.id, config) &&
          !isBothRecreational(team, other)
        ) {
          rematchBlockedCount++;
        } else {
          availableCount++;
        }
      });

      details.push(
        `${team.name} (T${tier}): ${matchCount}/${targetMatchesPerTeam} matches. ` +
          `Available opponents: ${availableCount}, blocked by tier: ${tierBlockedCount}, ` +
          `blocked by rematch: ${rematchBlockedCount}`
      );
    });

    errorLog('VALIDATION FAILED - Detailed team analysis:');
    details.forEach((d) => errorLog(`  ${d}`));

    throw new Error(
      `${incorrectTeams.length} teams don't have ${targetMatchesPerTeam} matches. ` +
        `Details: ${details.slice(0, 3).join('; ')}${details.length > 3 ? '...' : ''}`
    );
  }

  // Validate no session rematches
  const sessionRematches = validateNoSessionRematches(pairings);
  if (sessionRematches.hasRematches) {
    throw new Error(`Session rematches detected: ${sessionRematches.rematches.join(', ')}`);
  }
}
