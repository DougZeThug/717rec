import { validationLog } from '@/utils/logger';
import { isValidUUID } from '@/utils/validation';

import { BracketFormData } from '../types/BracketFormData';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TeamValidationResult extends ValidationResult {
  invalidTeams: string[];
}

// Type guard to ensure we have valid form data
const isValidBracketFormData = (data: unknown): data is BracketFormData => {
  return (
    data &&
    typeof data === 'object' &&
    'title' in data &&
    'divisionId' in data &&
    'format' in data &&
    'teams' in data &&
    typeof (data as Record<string, unknown>).title === 'string' &&
    typeof (data as Record<string, unknown>).divisionId === 'string' &&
    typeof (data as Record<string, unknown>).format === 'string' &&
    Array.isArray((data as Record<string, unknown>).teams)
  );
};

export class BracketValidationService {
  /**
   * Validates complete bracket form data
   */
  static validateFormData(data: unknown): ValidationResult {
    const errors: string[] = [];

    validationLog('Validating bracket form data');

    // Type guard check
    if (!isValidBracketFormData(data)) {
      errors.push('Invalid form data structure');
      return { isValid: false, errors };
    }

    // Title validation
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      errors.push('Title is required and cannot be empty');
    }

    // Division validation
    if (!data.divisionId) {
      errors.push('Division selection is required');
    } else if (typeof data.divisionId !== 'string') {
      errors.push('Division ID must be a string');
    } else if (data.divisionId.trim() === '') {
      errors.push('Division ID cannot be empty');
    } else if (!isValidUUID(data.divisionId)) {
      errors.push(`Selected division has invalid UUID format: ${data.divisionId}`);
    }

    // Format validation
    if (!data.format || typeof data.format !== 'string' || data.format.trim() === '') {
      errors.push('Format selection is required');
    }

    // Teams validation
    if (!Array.isArray(data.teams) || data.teams.length < 2) {
      errors.push('At least 2 teams must be selected');
    }

    validationLog('Validation result:', {
      isValid: errors.length === 0,
      errorCount: errors.length,
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates team selection array
   */
  static validateTeamSelection(teamIds: unknown): TeamValidationResult {
    const errors: string[] = [];
    const invalidTeams: string[] = [];

    validationLog('Validating team selection');

    if (!Array.isArray(teamIds)) {
      errors.push('Team selection must be an array');
      return { isValid: false, invalidTeams: [], errors };
    }

    teamIds.forEach((teamId, index) => {
      if (!teamId || typeof teamId !== 'string') {
        invalidTeams.push(`Team at position ${index + 1}`);
        errors.push(`Empty or invalid team ID at position ${index + 1}`);
      } else if (teamId.trim() === '') {
        invalidTeams.push(`Team at position ${index + 1}`);
        errors.push(`Empty team ID at position ${index + 1}`);
      } else if (teamId === 'undefined' || teamId === 'null') {
        invalidTeams.push(`Team at position ${index + 1}`);
        errors.push(`Invalid team ID value at position ${index + 1}`);
      } else if (!isValidUUID(teamId)) {
        invalidTeams.push(`Team at position ${index + 1}`);
        errors.push(`Invalid team ID format at position ${index + 1}: ${teamId}`);
      }
    });

    const result = {
      isValid: errors.length === 0,
      invalidTeams,
      errors,
    };

    validationLog('Team validation result:', {
      isValid: result.isValid,
      invalidCount: invalidTeams.length,
    });
    return result;
  }

  /**
   * Sanitizes form data to prevent invalid submissions
   */
  static sanitizeFormData(data: unknown): BracketFormData {
    validationLog('Sanitizing bracket form data');

    // Type guard check
    if (!isValidBracketFormData(data)) {
      throw new Error('Invalid form data structure for sanitization');
    }

    const sanitized = {
      title: (data.title || '').trim(),
      divisionId:
        data.divisionId && typeof data.divisionId === 'string' ? data.divisionId.trim() : '',
      format: data.format,
      teams: Array.isArray(data.teams)
        ? data.teams.filter(
            (id) => id && typeof id === 'string' && id.trim() !== '' && isValidUUID(id)
          )
        : [],
    };

    validationLog('Data sanitized:', { teamCount: sanitized.teams.length });
    return sanitized as BracketFormData;
  }

  /**
   * Comprehensive pre-submission validation
   */
  static validateForSubmission(data: unknown): ValidationResult {
    validationLog('Validating for submission');

    const sanitizedData = this.sanitizeFormData(data);
    const formValidation = this.validateFormData(sanitizedData);

    if (!formValidation.isValid) {
      return formValidation;
    }

    const teamValidation = this.validateTeamSelection(sanitizedData.teams);
    if (!teamValidation.isValid) {
      return {
        isValid: false,
        errors: teamValidation.errors,
      };
    }

    return { isValid: true, errors: [] };
  }
}
