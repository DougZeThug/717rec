
import { isValidUUID } from '@/utils/validation';
import { assertValidUuid, assertValidUuidOrNull } from '@/utils/uuidValidation';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Team validation result interface
 */
export interface TeamValidationResult {
  isValid: boolean;
  errors: string[];
  validTeamIds: string[];
}

/**
 * Form data interface for bracket creation
 */
export interface BracketFormData {
  title: string;
  divisionId?: string;
  format: string;
  teams: string[];
}

/**
 * Centralized validation service for bracket operations
 */
export class BracketValidationService {
  /**
   * Validate bracket creation parameters
   */
  static validateBracketCreation(name: string, divisionId: string, teamIds: string[]): void {
    if (!name?.trim()) {
      throw new Error('Bracket name is required');
    }

    if (!divisionId) {
      throw new Error('Division ID is required');
    }

    assertValidUuid(divisionId, 'divisionId');

    if (!teamIds?.length) {
      throw new Error('Teams are required');
    }

    teamIds.forEach((teamId, index) => {
      if (!teamId || !isValidUUID(teamId)) {
        throw new Error(`Invalid team ID at position ${index}: ${teamId}`);
      }
    });
  }

  /**
   * Validate match update parameters
   */
  static validateMatchUpdate(
    matchId: string,
    winnerId: string,
    team1Score: number,
    team2Score: number
  ): void {
    assertValidUuid(matchId, 'matchId');
    assertValidUuid(winnerId, 'winnerId');

    if (typeof team1Score !== 'number' || team1Score < 0) {
      throw new Error('Team 1 score must be a non-negative number');
    }

    if (typeof team2Score !== 'number' || team2Score < 0) {
      throw new Error('Team 2 score must be a non-negative number');
    }

    if (team1Score === team2Score) {
      throw new Error('Match cannot end in a tie');
    }
  }

  /**
   * Validate bracket ID
   */
  static validateBracketId(bracketId: string): void {
    if (!bracketId) {
      throw new Error('Bracket ID is required');
    }
    assertValidUuid(bracketId, 'bracketId');
  }

  /**
   * Validate optional UUID field
   */
  static validateOptionalUuid(value: string | null | undefined, fieldName: string): void {
    assertValidUuidOrNull(value, fieldName);
  }

  /**
   * Validate form data for submission
   */
  static validateForSubmission(data: BracketFormData): ValidationResult {
    const errors: string[] = [];

    if (!data.title?.trim()) {
      errors.push('Bracket title is required');
    }

    if (!data.divisionId || data.divisionId.trim() === '') {
      errors.push('Division selection is required');
    } else if (!isValidUUID(data.divisionId)) {
      errors.push('Invalid division selected');
    }

    if (!data.format) {
      errors.push('Tournament format is required');
    }

    if (!data.teams?.length || data.teams.length < 2) {
      errors.push('At least 2 teams are required');
    } else {
      const invalidTeams = data.teams.filter(id => !id || !isValidUUID(id));
      if (invalidTeams.length > 0) {
        errors.push('Invalid team selections detected');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate team selection
   */
  static validateTeamSelection(teamIds: string[]): TeamValidationResult {
    const errors: string[] = [];
    const validTeamIds: string[] = [];

    if (!Array.isArray(teamIds)) {
      errors.push('Team IDs must be an array');
      return { isValid: false, errors, validTeamIds };
    }

    if (teamIds.length < 2) {
      errors.push('At least 2 teams are required');
    }

    teamIds.forEach((teamId, index) => {
      if (!teamId || typeof teamId !== 'string') {
        errors.push(`Invalid team ID at position ${index}`);
      } else if (!isValidUUID(teamId)) {
        errors.push(`Invalid UUID format for team at position ${index}`);
      } else {
        validTeamIds.push(teamId);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      validTeamIds
    };
  }

  /**
   * Sanitize form data
   */
  static sanitizeFormData(data: BracketFormData): BracketFormData {
    return {
      title: data.title?.trim() || '',
      divisionId: data.divisionId?.trim() || undefined,
      format: data.format?.trim() || '',
      teams: Array.isArray(data.teams) ? data.teams.filter(id => id && typeof id === 'string' && id.trim()) : []
    };
  }

  /**
   * Validate complete form data
   */
  static validateFormData(data: BracketFormData): ValidationResult {
    const sanitized = this.sanitizeFormData(data);
    return this.validateForSubmission(sanitized);
  }
}
