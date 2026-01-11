import { useMemo } from 'react';

export interface ValidationResult {
  isValid: boolean;
  status: 'empty' | 'tooFew' | 'tooMany' | 'ok';
  message: string | null;
}

export function useBracketFormValidation(
  selectedCount: number,
  availableTeams: number,
  min: number,
  max: number
): ValidationResult {
  return useMemo(() => {
    if (availableTeams === 0) {
      return {
        isValid: false,
        status: 'empty',
        message: 'No teams available in this division.',
      };
    }

    if (selectedCount < min) {
      return {
        isValid: false,
        status: 'tooFew',
        message: `Select at least ${min} team${min > 1 ? 's' : ''}.`,
      };
    }

    if (selectedCount > max) {
      return {
        isValid: false,
        status: 'tooMany',
        message: `Too many teams selected (max ${max}).`,
      };
    }

    return { isValid: true, status: 'ok', message: null };
  }, [selectedCount, availableTeams, min, max]);
}
