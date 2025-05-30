
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
  // Ensure we have valid numbers to prevent React errors
  const validMaxTeams = typeof maxTeams === 'number' && maxTeams > 0 ? maxTeams : 16;
  const validMinTeams = typeof minTeams === 'number' && minTeams > 0 ? minTeams : 2;
  const validAvailableCount = typeof availableTeamsCount === 'number' ? availableTeamsCount : 0;
  
  // Team selection state
  const teamSelection = useTeamSelectionState(validMaxTeams);
  
  // Form validation
  const validation = useFormValidation(
    teamSelection.count,
    validMaxTeams,
    validMinTeams,
    validAvailableCount
  );
  
  // Side effects (parent sync)
  const effects = useTeamSelectionEffects(teamSelection.selectedArray, onChange);

  /**
   * Combined team toggle handler with validation
   * Handles team selection/deselection with proper validation checks
   */
  const handleTeamToggle = React.useCallback((teamId: string) => {
    if (typeof teamId === 'string' && teamId.length > 0) {
      teamSelection.toggle(teamId);
    }
  }, [teamSelection.toggle]);

  // Return a complete, properly typed object
  const result: BracketFormStateResult = {
    // Team selection - provide defaults for all required properties
    selected: teamSelection.selected || new Set(),
    selectedArray: teamSelection.selectedArray || [],
    count: teamSelection.count || 0,
    handleTeamToggle,
    clearSelection: teamSelection.clearSelection || (() => {}),
    canSelectMore: teamSelection.canSelectMore ?? true,
    isAtMaximum: teamSelection.isAtMaximum ?? false,
    hasSelection: teamSelection.hasSelection ?? false,
    
    // Validation - provide defaults for all required properties
    isValid: validation.isValid ?? false,
    isComplete: validation.isComplete ?? false,
    hasError: validation.hasError ?? false,
    hasWarning: validation.hasWarning ?? false,
    errorMessage: validation.errorMessage || null,
    warningMessage: validation.warningMessage || null,
    statusMessage: validation.statusMessage || 'Ready to select teams',
    progress: validation.progress || {
      percentage: 0,
      selected: 0,
      required: validMinTeams,
      maximum: validMaxTeams,
      available: validAvailableCount
    },
    
    // Effects
    cleanup: effects.cleanup || (() => {})
  };

  return result;
};
