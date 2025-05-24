
import { BracketFormValues } from '@/components/playoffs/form/BracketFormSchema';
import { isValidUUID } from '@/utils/validation';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TeamValidationResult extends ValidationResult {
  invalidTeams: string[];
}

export class BracketValidationService {
  /**
   * Validates complete bracket form data
   */
  static validateFormData(data: BracketFormValues): ValidationResult {
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

    // Format validation
    if (!data.format || typeof data.format !== 'string' || data.format.trim() === '') {
      errors.push('Format selection is required');
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
  static validateTeamSelection(teamIds: string[]): TeamValidationResult {
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
  static sanitizeFormData(data: BracketFormValues): BracketFormValues {
    return {
      title: (data.title || '').trim(),
      divisionId: (data.divisionId || '').trim(),
      format: data.format,
      teams: Array.isArray(data.teams) 
        ? data.teams.filter(id => id && typeof id === 'string' && id.trim() !== '' && isValidUUID(id))
        : []
    };
  }

  /**
   * Comprehensive pre-submission validation
   */
  static validateForSubmission(data: BracketFormValues): ValidationResult {
    const sanitizedData = this.sanitizeFormData(data);
    const formValidation = this.validateFormData(sanitizedData);
    
    if (!formValidation.isValid) {
      return formValidation;
    }

    const teamValidation = this.validateTeamSelection(sanitizedData.teams);
    if (!teamValidation.isValid) {
      return {
        isValid: false,
        errors: teamValidation.errors
      };
    }

    return { isValid: true, errors: [] };
  }
}
