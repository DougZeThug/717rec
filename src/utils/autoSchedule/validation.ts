import { AutoScheduleMatch } from '@/types';
import { warnLog } from '@/utils/logger';

import { haveTeamsPlayedBefore } from './matchHistoryService';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  matchId: string;
  type: 'duplicate-team' | 'same-team' | 'missing-team' | 'invalid-timeslot' | 'rematch';
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationWarning {
  matchId: string;
  type: 'rematch' | 'low-quality' | 'imbalanced';
  message: string;
}

export interface TeamConflict {
  teamId: string;
  timeslot: string;
  matchIds: string[];
}

/**
 * A timeslot must contain a readable H:MM. `parseTimeString` silently falls back to
 * 00:00 for anything it cannot read, which would save the match at midnight.
 * Mirrors that parser's own pattern so anything it can read passes here.
 */
const READABLE_TIME_PATTERN = /\d+:\d+/;

/**
 * Validate match schedule for conflicts and errors
 */
export async function validateMatchSchedule(
  matches: AutoScheduleMatch[]
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for duplicate team assignments in same timeslot
  const conflicts = findTeamConflicts(matches);
  conflicts.forEach((conflict) => {
    conflict.matchIds.forEach((matchId) => {
      errors.push({
        matchId,
        type: 'duplicate-team',
        message: `Team is scheduled for multiple matches at ${conflict.timeslot}`,
        severity: 'error',
      });
    });
  });

  // Check each match for basic validity
  matches.forEach((match) => {
    // Check for same team playing itself
    if (match.team1Id === match.team2Id) {
      errors.push({
        matchId: match.id,
        type: 'same-team',
        message: 'Team cannot play against itself',
        severity: 'error',
      });
    }

    // Check for missing teams
    if (!match.team1Id || !match.team2Id) {
      errors.push({
        matchId: match.id,
        type: 'missing-team',
        message: 'Match is missing a team assignment',
        severity: 'error',
      });
    }

    // Check for valid timeslot
    if (!match.timeslot || match.timeslot.trim() === '') {
      errors.push({
        matchId: match.id,
        type: 'invalid-timeslot',
        message: 'Match has invalid or missing timeslot',
        severity: 'error',
      });
    } else if (!READABLE_TIME_PATTERN.test(match.timeslot)) {
      errors.push({
        matchId: match.id,
        type: 'invalid-timeslot',
        message: `Match timeslot "${match.timeslot}" is not a readable time, so it would save at midnight`,
        severity: 'error',
      });
    }
  });

  // Check for rematches (teams that have already played each other)
  await checkForRematches(matches, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if any match pairings are rematches (teams have played before)
 */
async function checkForRematches(
  matches: AutoScheduleMatch[],
  warnings: ValidationWarning[]
): Promise<void> {
  const rematchChecks = matches.map(async (match) => {
    if (!match.team1Id || !match.team2Id) return;

    try {
      const hasPlayed = await haveTeamsPlayedBefore(match.team1Id, match.team2Id);

      if (hasPlayed) {
        warnings.push({
          matchId: match.id,
          type: 'rematch',
          message: 'These teams have already played each other this season',
        });
      }
    } catch (error) {
      warnLog(`Error checking rematch for match ${match.id}:`, error);
    }
  });

  await Promise.all(rematchChecks);
}

/**
 * Find teams that are scheduled for multiple matches in the same timeslot
 */
export function findTeamConflicts(matches: AutoScheduleMatch[]): TeamConflict[] {
  const teamTimeslots = new Map<string, Map<string, string[]>>();

  matches.forEach((match) => {
    const timeslot = match.timeslot;

    [match.team1Id, match.team2Id].forEach((teamId) => {
      if (!teamId) return;

      const teamSlots = teamTimeslots.get(teamId) ?? new Map<string, string[]>();
      const matchIds = teamSlots.get(timeslot) ?? [];

      matchIds.push(match.id);
      teamSlots.set(timeslot, matchIds);
      teamTimeslots.set(teamId, teamSlots);
    });
  });

  const conflicts: TeamConflict[] = [];

  teamTimeslots.forEach((timeslots, teamId) => {
    timeslots.forEach((matchIds, timeslot) => {
      if (matchIds.length > 1) {
        conflicts.push({
          teamId,
          timeslot,
          matchIds,
        });
      }
    });
  });

  return conflicts;
}
