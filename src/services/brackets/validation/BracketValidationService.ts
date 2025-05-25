
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

    console.log('BracketValidationService.validateFormData called with:', data);

    // Title validation
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      errors.push('Title is required and cannot be empty');
    }

    // Division validation - handle undefined/empty values
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
    if (!Array.isArray(data.teams) || data.teams.length === 0) {
      errors.push('At least 2 teams must be selected');
    } else if (data.teams.length < 2) {
      errors.push('Minimum 2 teams required for bracket creation');
    }

    console.log('Validation result:', { isValid: errors.length === 0, errors });

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

    console.log('BracketValidationService.validateTeamSelection called with:', teamIds);

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
      errors
    };

    console.log('Team validation result:', result);
    return result;
  }

  /**
   * Sanitizes form data to prevent invalid submissions
   */
  static sanitizeFormData(data: BracketFormValues): BracketFormValues {
    console.log('BracketValidationService.sanitizeFormData called with:', data);
    
    const sanitized = {
      title: (data.title || '').trim(),
      divisionId: data.divisionId && typeof data.divisionId === 'string' ? data.divisionId.trim() : undefined,
      format: data.format,
      teams: Array.isArray(data.teams) 
        ? data.teams.filter(id => id && typeof id === 'string' && id.trim() !== '' && isValidUUID(id))
        : []
    };

    console.log('Sanitized data:', sanitized);
    return sanitized as BracketFormValues;
  }

  /**
   * Comprehensive pre-submission validation
   */
  static validateForSubmission(data: BracketFormValues): ValidationResult {
    console.log('BracketValidationService.validateForSubmission called with:', data);
    
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
