
import React from 'react';
import { FormValidationResult } from '../types';

/**
 * Hook for validating team selection in bracket forms
 * Provides comprehensive validation state including errors, warnings, and progress tracking
 * @param selectedCount - Number of currently selected teams
 * @param maxTeams - Maximum number of teams allowed
 * @param minTeams - Minimum number of teams required (default: 2)
 * @param availableTeamsCount - Total number of teams available for selection (default: 0)
 * @returns Object containing validation state, messages, and progress information
 */
export const useFormValidation = (
  selectedCount: number,
  maxTeams: number,
  minTeams: number = 2,
  availableTeamsCount: number = 0
): FormValidationResult => {
  const validationState = React.useMemo(() => {
    // No teams available
    if (availableTeamsCount === 0) {
      return {
        isValid: false,
        isComplete: false,
        hasError: true,
        hasWarning: false,
        errorMessage: "No teams available for selection",
        warningMessage: null,
        statusMessage: "No teams found"
      };
    }

    // Not enough teams selected
    if (selectedCount < minTeams) {
      return {
        isValid: false,
        isComplete: false,
        hasError: selectedCount === 0,
        hasWarning: selectedCount > 0 && selectedCount < minTeams,
        errorMessage: selectedCount === 0 ? "Please select teams to continue" : null,
        warningMessage: selectedCount > 0 && selectedCount < minTeams 
          ? `Need at least ${minTeams} teams (currently ${selectedCount} selected)` 
          : null,
        statusMessage: `Select ${minTeams - selectedCount} more team${minTeams - selectedCount === 1 ? '' : 's'}`
      };
    }

    // Valid selection
    if (selectedCount >= minTeams && selectedCount <= maxTeams) {
      return {
        isValid: true,
        isComplete: true,
        hasError: false,
        hasWarning: false,
        errorMessage: null,
        warningMessage: null,
        statusMessage: `${selectedCount} team${selectedCount === 1 ? '' : 's'} selected`
      };
    }

    // Too many teams (shouldn't happen with proper constraints)
    return {
      isValid: false,
      isComplete: false,
      hasError: true,
      hasWarning: false,
      errorMessage: `Too many teams selected (max ${maxTeams})`,
      warningMessage: null,
      statusMessage: "Remove some teams"
    };
  }, [selectedCount, maxTeams, minTeams, availableTeamsCount]);

  /**
   * Progress information for UI feedback
   * Calculates completion percentage and provides selection stats
   */
  const progress = React.useMemo(() => {
    const percentage = availableTeamsCount > 0 
      ? Math.min((selectedCount / minTeams) * 100, 100)
      : 0;
    
    return {
      percentage,
      selected: selectedCount,
      required: minTeams,
      maximum: maxTeams,
      available: availableTeamsCount
    };
  }, [selectedCount, minTeams, maxTeams, availableTeamsCount]);

  return {
    ...validationState,
    progress
  };
};
