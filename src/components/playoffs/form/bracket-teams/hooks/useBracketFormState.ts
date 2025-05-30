
import React from 'react';
import { BracketFormStateResult } from '../types';
import { useTeamSelectionState } from './useTeamSelectionState';
import { useFormValidation } from './useFormValidation';
import { useTeamSelectionEffects } from './useTeamSelectionEffects';

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

  // Combined team toggle handler
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
