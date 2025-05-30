
import { ProcessedTeam, Division } from '../types';

/**
 * Helper functions for team data processing
 */
export const teamDataHelpers = {
  /**
   * Converts a team name to a slug for consistent identification
   */
  createTeamSlug: (teamName: string): string => {
    return teamName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  /**
   * Validates if a team has required fields
   */
  isValidTeam: (team: ProcessedTeam): boolean => {
    return !!(team.id && team.name && typeof team.seed === 'number');
  },

  /**
   * Groups teams by division
   */
  groupTeamsByDivision: (teams: ProcessedTeam[]): Map<string | null, ProcessedTeam[]> => {
    const groups = new Map<string | null, ProcessedTeam[]>();
    
    teams.forEach(team => {
      const divisionId = team.division_id;
      if (!groups.has(divisionId)) {
        groups.set(divisionId, []);
      }
      groups.get(divisionId)!.push(team);
    });
    
    return groups;
  },

  /**
   * Finds the best seed for a new team
   */
  calculateNextSeed: (existingTeams: ProcessedTeam[]): number => {
    if (existingTeams.length === 0) return 1;
    const maxSeed = Math.max(...existingTeams.map(t => t.seed));
    return maxSeed + 1;
  },

  /**
   * Validates division mapping consistency
   */
  validateDivisionMapping: (teams: ProcessedTeam[], divisions: Division[]): string[] => {
    const errors: string[] = [];
    const divisionIds = new Set(divisions.map(d => d.id));
    
    teams.forEach(team => {
      if (team.division_id && !divisionIds.has(team.division_id)) {
        errors.push(`Team "${team.name}" has invalid division_id: ${team.division_id}`);
      }
    });
    
    return errors;
  }
};
