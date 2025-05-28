
import { BracketFormData } from '../types/BracketFormData';
import { isValidUUID } from '@/utils/validation';

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
    typeof (data as any).title === 'string' &&
    typeof (data as any).divisionId === 'string' &&
    typeof (data as any).format === 'string' &&
    Array.isArray((data as any).teams)
  );
};

export class BracketValidationService {
  /**
   * Validates complete bracket form data with simplified validation
   */
  static validateFormData(data: unknown): ValidationResult {
    const errors: string[] = [];

    console.log('BracketValidationService.validateFormData called with:', data);

    // Type guard check
    if (!isValidBracketFormData(data)) {
      errors.push('Invalid form data structure');
      return { isValid: false, errors };
    }

    // Title validation - simplified
    if (!data.title || data.title.trim() === '') {
      errors.push('Title is required');
    }

    // Division validation - simplified to be less strict
    if (!data.divisionId || data.divisionId.trim() === '') {
      errors.push('Division selection is required');
    }

    // Format validation - simplified
    if (!data.format || data.format.trim() === '') {
      errors.push('Format selection is required');
    }

    // Teams validation - simplified
    if (!Array.isArray(data.teams) || data.teams.length < 2) {
      errors.push('At least 2 teams must be selected');
    }

    console.log('Simplified validation result:', { isValid: errors.length === 0, errors });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates team selection array with simplified logic
   */
  static validateTeamSelection(teamIds: unknown): TeamValidationResult {
    const errors: string[] = [];
    const invalidTeams: string[] = [];

    console.log('BracketValidationService.validateTeamSelection called with:', teamIds);

    if (!Array.isArray(teamIds)) {
      errors.push('Team selection must be an array');
      return { isValid: false, invalidTeams: [], errors };
    }

    if (teamIds.length < 2) {
      errors.push('At least 2 teams must be selected');
      return { isValid: false, invalidTeams, errors };
    }

    // Simplified team validation - just check that they're strings
    teamIds.forEach((teamId, index) => {
      if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        invalidTeams.push(`Team at position ${index + 1}`);
        errors.push(`Invalid team selection at position ${index + 1}`);
      }
    });

    const result = {
      isValid: errors.length === 0,
      invalidTeams,
      errors
    };

    console.log('Simplified team validation result:', result);
    return result;
  }

  /**
   * Sanitizes form data with simplified logic
   */
  static sanitizeFormData(data: unknown): BracketFormData {
    console.log('BracketValidationService.sanitizeFormData called with:', data);
    
    // Type guard check
    if (!isValidBracketFormData(data)) {
      throw new Error('Invalid form data structure for sanitization');
    }
    
    const sanitized = {
      title: (data.title || '').trim(),
      divisionId: (data.divisionId || '').trim(),
      format: data.format,
      teams: Array.isArray(data.teams) 
        ? data.teams.filter(id => id && typeof id === 'string' && id.trim() !== '')
        : []
    };

    console.log('Sanitized data:', sanitized);
    return sanitized as BracketFormData;
  }

  /**
   * Simplified pre-submission validation
   */
  static validateForSubmission(data: unknown): ValidationResult {
    console.log('BracketValidationService.validateForSubmission called with:', data);
    
    try {
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
    } catch (error) {
      console.error('Validation error:', error);
      return { isValid: false, errors: ['Validation failed'] };
    }
  }
}
