import React from 'react';

import { MAX_BRACKET_TEAMS, MIN_BRACKET_TEAMS } from '@/constants/brackets';

import { BracketFormStateResult } from '../types';

/**
 * Simplified hook for managing team selection state
 * Phase 2: Removed onChange parameter - parent notification handled at container level
 */
export const useTeamSelectionState = (
  maxTeams: number,
  initialSelected: Set<string> = new Set(),
  availableTeamsCount = 0,
  minTeams = MIN_BRACKET_TEAMS
): BracketFormStateResult => {
  // Ensure we have valid numbers to prevent React errors. The fallbacks are the
  // real bracket limits — a bad prop must not silently cap selection lower than
  // the form allows (this used to fall back to 16 against a max of 32).
  const validMaxTeams = typeof maxTeams === 'number' && maxTeams > 0 ? maxTeams : MAX_BRACKET_TEAMS;
  const validMinTeams = typeof minTeams === 'number' && minTeams > 0 ? minTeams : MIN_BRACKET_TEAMS;
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
  const handleTeamToggle = React.useCallback(
    (teamId: string) => {
      if (typeof teamId === 'string' && teamId.length > 0) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(teamId)) {
            next.delete(teamId);
          } else if (next.size < validMaxTeams) {
            next.add(teamId);
          }
          return next;
        });
      }
    },
    [validMaxTeams]
  );

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
      available: validAvailableCount,
    },

    // No cleanup needed
    cleanup: () => {},
  };

  return result;
};
