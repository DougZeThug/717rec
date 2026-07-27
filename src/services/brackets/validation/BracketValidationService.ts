import { MAX_BRACKET_TEAMS, MIN_BRACKET_TEAMS } from '@/constants/brackets';
import { validationLog } from '@/utils/logger';
import { isValidUUID } from '@/utils/validation';

import { BracketFormData } from '../types/BracketFormData';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Type guard to ensure we have valid form data
const isValidBracketFormData = (data: unknown): data is BracketFormData => {
  return (
    typeof data === 'object' &&
    data !== null &&
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

export const BracketValidationService = {
  /**
   * Validates complete bracket form data
   */
  validateFormData(data: unknown): ValidationResult {
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

    // Teams validation — both bounds, so the service agrees with the form
    // rather than silently accepting a bracket size the UI forbids.
    if (!Array.isArray(data.teams) || data.teams.length < MIN_BRACKET_TEAMS) {
      errors.push(`At least ${MIN_BRACKET_TEAMS} teams must be selected`);
    } else if (data.teams.length > MAX_BRACKET_TEAMS) {
      errors.push(`Maximum ${MAX_BRACKET_TEAMS} teams allowed per bracket`);
    }

    validationLog('Validation result:', {
      isValid: errors.length === 0,
      errorCount: errors.length,
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};
