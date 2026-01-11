import { PlayoffTeam } from '@/utils/playoffs/playoffTypes';

/**
 * Enhanced team mapping utilities for bracket display
 */

export interface TeamMapperOptions {
  includePlaceholders?: boolean;
  placeholderPrefix?: string;
}

/**
 * Creates a team lookup map for efficient team resolution
 */
export function createTeamMap(teams: PlayoffTeam[]): Map<string, PlayoffTeam> {
  return new Map(teams.map((team) => [team.id, team]));
}

/**
 * Gets a team by ID with enhanced fallback handling
 */
export function getTeamById(
  teamId: string | null,
  teamMap: Map<string, PlayoffTeam>,
  options: TeamMapperOptions = {}
): PlayoffTeam | null {
  if (!teamId) return null;

  const team = teamMap.get(teamId);
  if (team) return team;

  // If team not found and placeholders are enabled
  if (options.includePlaceholders) {
    return createPlaceholderTeam(teamId, options.placeholderPrefix);
  }

  return null;
}

/**
 * Creates a placeholder team for missing team references
 */
export function createPlaceholderTeam(teamId: string, prefix: string = 'Team'): PlayoffTeam {
  return {
    id: teamId,
    name: `${prefix} ${teamId.substring(0, 8)}`,
    logo_url: null,
    image_url: null,
  };
}

/**
 * Validates team data completeness
 */
export function validateTeamData(teams: PlayoffTeam[]): {
  valid: PlayoffTeam[];
  invalid: any[];
} {
  const valid: PlayoffTeam[] = [];
  const invalid: any[] = [];

  teams.forEach((team) => {
    if (team && typeof team === 'object' && team.id && team.name) {
      valid.push(team);
    } else {
      invalid.push(team);
    }
  });

  return { valid, invalid };
}

/**
 * Ensures all teams have required display properties
 */
export function normalizeTeamsForDisplay(teams: PlayoffTeam[]): PlayoffTeam[] {
  return teams.map((team) => ({
    ...team,
    name: team.name || `Team ${team.id.substring(0, 8)}`,
    logo_url: team.logo_url || null,
    image_url: team.image_url || null,
  }));
}
