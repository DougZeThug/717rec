
import React from 'react';
import { BracketFormStateResult } from '../types';
import { useFormValidation } from './useFormValidation';

/**
 * Main hook for managing bracket form state including team selection and validation
 * Simplified version that manages team selection state directly without complex abstractions
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
  
  // Simple team selection state - no complex abstractions
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  
  // Derived state
  const selectedArray = React.useMemo(() => Array.from(selected), [selected]);
  const count = selected.size;
  const canSelectMore = count < validMaxTeams;
  const isAtMaximum = count >= validMaxTeams;
  const hasSelection = count > 0;
  
  // Form validation
  const validation = useFormValidation(
    count,
    validMaxTeams,
    validMinTeams,
    validAvailableCount
  );

  /**
   * Team toggle handler with immediate onChange callback (no useEffect side-channel)
   */
  const handleTeamToggle = React.useCallback((teamId: string) => {
    if (typeof teamId === 'string' && teamId.length > 0) {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(teamId)) {
          next.delete(teamId);
        } else if (next.size < validMaxTeams) {
          next.add(teamId);
        }
        
        // Call onChange immediately after state update - no useEffect needed
        const newArray = Array.from(next);
        onChange(newArray);
        
        return next;
      });
    }
  }, [onChange, validMaxTeams]);

  /**
   * Clear selection handler
   */
  const clearSelection = React.useCallback(() => {
    setSelected(new Set());
    onChange([]);
  }, [onChange]);

  // Return a complete, properly typed object
  const result: BracketFormStateResult = {
    // Team selection - direct state management
    selected,
    selectedArray,
    count,
    handleTeamToggle,
    clearSelection,
    canSelectMore,
    isAtMaximum,
    hasSelection,
    
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
    
    // No cleanup needed since we removed useEffect
    cleanup: () => {}
  };

  return result;
};
