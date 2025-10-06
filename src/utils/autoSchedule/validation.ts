import { AutoScheduleMatch, Team } from "@/types/autoSchedule";

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  matchId: string;
  type: 'duplicate-team' | 'same-team' | 'missing-team' | 'invalid-timeslot';
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
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
 * Validate match schedule for conflicts and errors
 */
export function validateMatchSchedule(matches: AutoScheduleMatch[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for duplicate team assignments in same timeslot
  const conflicts = findTeamConflicts(matches);
  conflicts.forEach(conflict => {
    conflict.matchIds.forEach(matchId => {
      errors.push({
        matchId,
        type: 'duplicate-team',
        message: `Team is scheduled for multiple matches at ${conflict.timeslot}`,
        severity: 'error'
      });
    });
  });

  // Check each match for basic validity
  matches.forEach(match => {
    // Check for same team playing itself
    if (match.team1Id === match.team2Id) {
      errors.push({
        matchId: match.id,
        type: 'same-team',
        message: 'Team cannot play against itself',
        severity: 'error'
      });
    }

    // Check for missing teams
    if (!match.team1Id || !match.team2Id) {
      errors.push({
        matchId: match.id,
        type: 'missing-team',
        message: 'Match is missing a team assignment',
        severity: 'error'
      });
    }

    // Check for valid timeslot
    if (!match.timeslot || match.timeslot.trim() === '') {
      errors.push({
        matchId: match.id,
        type: 'invalid-timeslot',
        message: 'Match has invalid or missing timeslot',
        severity: 'error'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Find teams that are scheduled for multiple matches in the same timeslot
 */
export function findTeamConflicts(matches: AutoScheduleMatch[]): TeamConflict[] {
  const teamTimeslots = new Map<string, Map<string, string[]>>();
  
  matches.forEach(match => {
    const timeslot = match.timeslot;
    
    [match.team1Id, match.team2Id].forEach(teamId => {
      if (!teamId) return;
      
      if (!teamTimeslots.has(teamId)) {
        teamTimeslots.set(teamId, new Map());
      }
      
      const teamSlots = teamTimeslots.get(teamId)!;
      if (!teamSlots.has(timeslot)) {
        teamSlots.set(timeslot, []);
      }
      
      teamSlots.get(timeslot)!.push(match.id);
    });
  });

  const conflicts: TeamConflict[] = [];
  
  teamTimeslots.forEach((timeslots, teamId) => {
    timeslots.forEach((matchIds, timeslot) => {
      if (matchIds.length > 1) {
        conflicts.push({
          teamId,
          timeslot,
          matchIds
        });
      }
    });
  });

  return conflicts;
}

/**
 * Calculate overall schedule health score (0-100)
 */
export function calculateScheduleHealth(matches: AutoScheduleMatch[]): number {
  if (matches.length === 0) return 0;

  const validation = validateMatchSchedule(matches);
  
  // Deduct points for errors and warnings
  const errorPenalty = validation.errors.length * 20;
  const warningPenalty = validation.warnings.length * 5;
  
  const health = Math.max(0, 100 - errorPenalty - warningPenalty);
  
  return health;
}

/**
 * Get human-readable validation summary
 */
export function getValidationSummary(validation: ValidationResult): string {
  if (validation.isValid) {
    return "Schedule is valid with no conflicts";
  }
  
  const errorCount = validation.errors.length;
  const warningCount = validation.warnings.length;
  
  const parts = [];
  if (errorCount > 0) {
    parts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
  }
  
  return `Schedule has ${parts.join(' and ')}`;
}
