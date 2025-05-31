
import React from 'react';
import { BracketFormStateResult } from '../types';

/**
 * Main hook for managing bracket form state including team selection
 * Simplified version that manages team selection state directly
 * Phase 3: Updated to work with unified validation system
 */
export const useTeamSelectionState = (
  maxTeams: number,
  onChange: (ids: string[]) => void,
  availableTeamsCount: number = 0,
  minTeams: number = 2
): BracketFormStateResult => {
  // Ensure we have valid numbers to prevent React errors
  const validMaxTeams = typeof maxTeams === 'number' && maxTeams > 0 ? maxTeams : 16;
  const validMinTeams = typeof minTeams === 'number' && minTeams > 0 ? minTeams : 2;
  const validAvailableCount = typeof availableTeamsCount === 'number' ? availableTeamsCount : 0;
  
  // Simple team selection state
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  
  // Derived state
  const selectedArray = React.useMemo(() => Array.from(selected), [selected]);
  const count = selected.size;
  const canSelectMore = count < validMaxTeams;
  const isAtMaximum = count >= validMaxTeams;
  const hasSelection = count > 0;

  /**
   * Team toggle handler with immediate onChange callback
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
        
        // Call onChange immediately after state update
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

  // Return a complete object with legacy validation properties for compatibility
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
    
    // Legacy validation properties (kept for compatibility)
    isValid: count >= validMinTeams && count <= validMaxTeams,
    isComplete: count >= validMinTeams,
    hasError: false,
    hasWarning: false,
    errorMessage: null,
    warningMessage: null,
    statusMessage: `${count} teams selected`,
    progress: {
      percentage: Math.min(100, (count / validMinTeams) * 100),
      selected: count,
      required: validMinTeams,
      maximum: validMaxTeams,
      available: validAvailableCount
    },
    
    // No cleanup needed
    cleanup: () => {}
  };

  return result;
};

export default useTeamSelectionState;
