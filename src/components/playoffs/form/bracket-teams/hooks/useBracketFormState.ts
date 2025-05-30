
import React from 'react';
import { BracketFormStateResult } from '../types';
import { useTeamSelectionState } from './useTeamSelectionState';
import { useFormValidation } from './useFormValidation';
import { useTeamSelectionEffects } from './useTeamSelectionEffects';

/**
 * Main hook for managing bracket form state including team selection and validation
 * Combines team selection, form validation, and side effects management
 * @param maxTeams - Maximum number of teams allowed in the bracket
 * @param onChange - Callback function to notify parent of selection changes
 * @param availableTeamsCount - Total number of teams available for selection (default: 0)
 * @param minTeams - Minimum number of teams required (default: 2)
 * @returns Comprehensive object containing all bracket form state and handlers
 */
export const useBracketFormState = (
  maxTeams: number,
  onChange: (ids: string[]) => void,
  availableTeamsCount: number = 0,
  minTeams: number = 2
): BracketFormStateResult => {
  // Team selection state
  const teamSelection = useTeamSelectionState(maxTeams);
  
  // Form validation
  const validation = useFormValidation(
    teamSelection.count,
    maxTeams,
    minTeams,
    availableTeamsCount
  );
  
  // Side effects (parent sync)
  const effects = useTeamSelectionEffects(teamSelection.selectedArray, onChange);

  /**
   * Combined team toggle handler with validation
   * Handles team selection/deselection with proper validation checks
   */
  const handleTeamToggle = React.useCallback((teamId: string) => {
    teamSelection.toggle(teamId);
  }, [teamSelection.toggle]);

  return {
    // Team selection
    selected: teamSelection.selected,
    selectedArray: teamSelection.selectedArray,
    count: teamSelection.count,
    handleTeamToggle,
    clearSelection: teamSelection.clearSelection,
    canSelectMore: teamSelection.canSelectMore,
    isAtMaximum: teamSelection.isAtMaximum,
    hasSelection: teamSelection.hasSelection,
    
    // Validation
    isValid: validation.isValid,
    isComplete: validation.isComplete,
    hasError: validation.hasError,
    hasWarning: validation.hasWarning,
    errorMessage: validation.errorMessage,
    warningMessage: validation.warningMessage,
    statusMessage: validation.statusMessage,
    progress: validation.progress,
    
    // Effects
    cleanup: effects.cleanup
  };
};
