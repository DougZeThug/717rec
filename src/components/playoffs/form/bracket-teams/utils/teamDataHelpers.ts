/**
 * Utility functions for processing and manipulating team data in bracket forms
 */

import { ProcessedTeam } from '../types';

/**
 * Filters teams by division ID
 * @param teams - Array of processed teams
 * @param divisionId - Division ID to filter by
 * @returns Filtered array of teams belonging to the specified division
 */
export const filterTeamsByDivision = (
  teams: ProcessedTeam[],
  divisionId: string
): ProcessedTeam[] => {
  return teams.filter((team) => team.division_id === divisionId);
};

/**
 * Sorts teams by their seed (ranking)
 * @param teams - Array of processed teams
 * @returns Teams sorted by seed in ascending order
 */
export const sortTeamsBySeed = (teams: ProcessedTeam[]): ProcessedTeam[] => {
  return [...teams].sort((a, b) => a.seed - b.seed);
};

/**
 * Gets team by ID from an array of teams
 * @param teams - Array of processed teams
 * @param teamId - ID of the team to find
 * @returns The team object if found, undefined otherwise
 */
export const getTeamById = (teams: ProcessedTeam[], teamId: string): ProcessedTeam | undefined => {
  return teams.find((team) => team.id === teamId);
};

/**
 * Validates that a team selection meets bracket requirements
 * @param selectedTeamIds - Array of selected team IDs
 * @param availableTeams - Array of all available teams
 * @param minTeams - Minimum number of teams required
 * @param maxTeams - Maximum number of teams allowed
 * @returns Validation result with success status and error message
 */
export const validateTeamSelection = (
  selectedTeamIds: string[],
  availableTeams: ProcessedTeam[],
  minTeams: number,
  maxTeams: number
): { isValid: boolean; error?: string } => {
  if (selectedTeamIds.length < minTeams) {
    return { isValid: false, error: `At least ${minTeams} teams are required` };
  }

  if (selectedTeamIds.length > maxTeams) {
    return { isValid: false, error: `Maximum ${maxTeams} teams allowed` };
  }

  // Check if all selected teams exist in available teams
  const availableTeamIds = new Set(availableTeams.map((team) => team.id));
  const invalidTeams = selectedTeamIds.filter((id) => !availableTeamIds.has(id));

  if (invalidTeams.length > 0) {
    return { isValid: false, error: `Invalid team selection: ${invalidTeams.join(', ')}` };
  }

  return { isValid: true };
};

/**
 * Groups teams by their division
 * @param teams - Array of processed teams
 * @returns Map of division names to team arrays
 */
export const groupTeamsByDivision = (teams: ProcessedTeam[]): Map<string, ProcessedTeam[]> => {
  const divisions = new Map<string, ProcessedTeam[]>();

  teams.forEach((team) => {
    const divisionName = team.divisionName || 'Unknown Division';
    const divisionTeams = divisions.get(divisionName) || [];
    divisionTeams.push(team);
    divisions.set(divisionName, divisionTeams);
  });

  return divisions;
};
