import { AutoScheduleMatch, Team } from '@/types';
import { errorLog, log } from '@/utils/logger';

export interface CrossBlockViolation {
  matchId: string;
  team1: { id: string; name: string; block: string };
  team2: { id: string; name: string; block: string };
  timeslot: string;
}

export interface CrossBlockValidation {
  isValid: boolean;
  violations: CrossBlockViolation[];
}

/**
 * Validate that no matches pair teams from different back-to-back blocks
 *
 * This is a critical validation to ensure scheduling integrity:
 * - Teams in "SuperEarly" (6:00-6:30) should NEVER play teams in "LateMid" (9:00-9:30)
 * - Each back-to-back block is completely isolated
 * - Cross-block matches indicate a data or algorithm error
 *
 * Note: Teams can be in multiple blocks (double headers), so we check if they
 * share at least one common block.
 */
export function validateNoCrossBlockMatches(
  matches: AutoScheduleMatch[],
  teamBlockMap: Record<string, string[]>,
  teams: Team[]
): CrossBlockValidation {
  const violations: CrossBlockViolation[] = [];

  for (const match of matches) {
    const team1Blocks = teamBlockMap[match.team1Id] || [];
    const team2Blocks = teamBlockMap[match.team2Id] || [];

    // Check if teams are in the block map - fail-safe if missing
    if (team1Blocks.length === 0 || team2Blocks.length === 0) {
      errorLog(`Team missing from block map: ${match.team1Id} or ${match.team2Id}`);
      const team1 = teams.find((t) => t.id === match.team1Id);
      const team2 = teams.find((t) => t.id === match.team2Id);

      violations.push({
        matchId: match.id,
        team1: {
          id: match.team1Id,
          name: team1?.name || 'Unknown Team',
          block: team1Blocks.join(', ') || 'MISSING',
        },
        team2: {
          id: match.team2Id,
          name: team2?.name || 'Unknown Team',
          block: team2Blocks.join(', ') || 'MISSING',
        },
        timeslot: match.timeslot,
      });
      continue;
    }

    // Critical check: teams must share at least one common block
    // This allows double header teams (in multiple blocks) to play teams in any of their shared blocks
    const hasCommonBlock = team1Blocks.some((block) => team2Blocks.includes(block));

    if (!hasCommonBlock) {
      const team1 = teams.find((t) => t.id === match.team1Id);
      const team2 = teams.find((t) => t.id === match.team2Id);

      violations.push({
        matchId: match.id,
        team1: {
          id: match.team1Id,
          name: team1?.name || 'Unknown Team',
          block: team1Blocks.join(', '),
        },
        team2: {
          id: match.team2Id,
          name: team2?.name || 'Unknown Team',
          block: team2Blocks.join(', '),
        },
        timeslot: match.timeslot,
      });
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Log cross-block violations in a readable format
 */
export function logCrossBlockViolations(violations: CrossBlockViolation[]): void {
  if (violations.length === 0) {
    log('All matches validated: No cross-block pairings detected');
    return;
  }

  errorLog(`FOUND ${violations.length} CROSS-BLOCK VIOLATIONS:`);
  violations.forEach((v, index) => {
    errorLog(
      `  ${index + 1}. ${v.team1.name} (${v.team1.block}) vs ${v.team2.name} (${v.team2.block})`
    );
    errorLog(`     Match ID: ${v.matchId}, Timeslot: ${v.timeslot}`);
  });
  errorLog('\nThis indicates teams were incorrectly assigned to multiple back-to-back pairs.');
  errorLog('   Check team_timeslots table in database for duplicate assignments.');
}
