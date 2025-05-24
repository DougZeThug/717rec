
import { isValidUUID } from './validation';

/**
 * Comprehensive validation utilities for bracket creation
 */

export interface BracketValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TeamValidationResult {
  isValid: boolean;
  invalidTeams: string[];
  errors: string[];
}

/**
 * Validates bracket form data before submission
 */
export function validateBracketFormData(data: {
  title: string;
  divisionId: string;
  teams: string[];
}): BracketValidationResult {
  const errors: string[] = [];

  // Title validation
  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('Title is required and cannot be empty');
  }

  // Division validation
  if (!data.divisionId || typeof data.divisionId !== 'string' || data.divisionId.trim() === '') {
    errors.push('Division selection is required');
  } else if (!isValidUUID(data.divisionId)) {
    errors.push('Selected division is invalid');
  }

  // Teams validation
  if (!Array.isArray(data.teams) || data.teams.length === 0) {
    errors.push('At least 2 teams must be selected');
  } else if (data.teams.length < 2) {
    errors.push('Minimum 2 teams required for bracket creation');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates team selection array
 */
export function validateTeamSelection(teamIds: string[]): TeamValidationResult {
  const errors: string[] = [];
  const invalidTeams: string[] = [];

  if (!Array.isArray(teamIds)) {
    errors.push('Team selection must be an array');
    return { isValid: false, invalidTeams: [], errors };
  }

  teamIds.forEach((teamId, index) => {
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
      invalidTeams.push(`Team at position ${index + 1}`);
      errors.push(`Empty team ID at position ${index + 1}`);
    } else if (teamId === 'undefined' || teamId === 'null') {
      invalidTeams.push(`Team at position ${index + 1}`);
      errors.push(`Invalid team ID value at position ${index + 1}`);
    } else if (!isValidUUID(teamId)) {
      invalidTeams.push(`Team at position ${index + 1}`);
      errors.push(`Invalid team ID format at position ${index + 1}`);
    }
  });

  return {
    isValid: errors.length === 0,
    invalidTeams,
    errors
  };
}

/**
 * Sanitizes form data to prevent invalid submissions
 */
export function sanitizeBracketFormData(data: {
  title: string;
  divisionId: string;
  teams: string[];
}) {
  return {
    title: (data.title || '').trim(),
    divisionId: (data.divisionId || '').trim(),
    teams: Array.isArray(data.teams) 
      ? data.teams.filter(id => id && typeof id === 'string' && id.trim() !== '' && isValidUUID(id))
      : []
  };
}
