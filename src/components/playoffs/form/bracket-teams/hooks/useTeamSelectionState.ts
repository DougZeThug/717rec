
import React from 'react';
import { BracketFormStateResult } from '../types';

/**
 * Simplified hook for managing team selection state
 * Phase 2: Removed onChange parameter - parent notification handled at container level
 */
export const useTeamSelectionState = (
  maxTeams: number,
  initialSelected: Set<string> = new Set(),
  availableTeamsCount: number = 0,
  minTeams: number = 2
): BracketFormStateResult => {
  // Ensure we have valid numbers to prevent React errors
  const validMaxTeams = typeof maxTeams === 'number' && maxTeams > 0 ? maxTeams : 16;
  const validMinTeams = typeof minTeams === 'number' && minTeams > 0 ? minTeams : 2;
  const validAvailableCount = typeof availableTeamsCount === 'number' ? availableTeamsCount : 0;
  
  // Simple team selection state
  const [selected, setSelected] = React.useState<Set<string>>(initialSelected);
  
  // Derived state
  const selectedArray = React.useMemo(() => Array.from(selected), [selected]);
  const count = selected.size;
  const canSelectMore = count < validMaxTeams;
  const isAtMaximum = count >= validMaxTeams;
  const hasSelection = count > 0;

  /**
   * Team toggle handler - no longer calls onChange internally
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
        return next;
      });
    }
  }, [validMaxTeams]);

  /**
   * Clear selection handler - no longer calls onChange internally
   */
  const clearSelection = React.useCallback(() => {
    setSelected(new Set());
  }, []);

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
