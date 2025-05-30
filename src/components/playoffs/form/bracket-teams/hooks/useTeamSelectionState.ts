
import React from 'react';
import { useTeamSelection } from '@/hooks/playoffs';
import { TeamSelectionStateResult } from '../types';

/**
 * Hook for managing team selection state with validation and constraints
 * Provides enhanced team selection functionality with maximum team limits
 * @param maxTeams - Maximum number of teams that can be selected
 * @param initialSelected - Initial array of selected team IDs (default: [])
 * @returns Object containing selection state and methods for managing team selection
 */
export const useTeamSelectionState = (
  maxTeams: number,
  initialSelected: string[] = []
): TeamSelectionStateResult => {
  // Use the existing team selection hook
  const { selected, toggle, setSelected, count, selectedArray } = useTeamSelection(initialSelected);

  /**
   * Enhanced toggle function with maximum teams validation
   * Prevents selection beyond the maximum limit
   */
  const enhancedToggle = React.useCallback((teamId: string) => {
    try {
      toggle(teamId, maxTeams);
    } catch (error) {
      console.error("useTeamSelectionState: Error toggling team:", error);
    }
  }, [toggle, maxTeams]);

  /**
   * Set selection with validation to respect maximum team limit
   * Automatically truncates the selection if it exceeds the maximum
   */
  const setSelectionSafe = React.useCallback((teamIds: string[]) => {
    try {
      const validatedIds = teamIds.slice(0, maxTeams);
      setSelected(validatedIds);
    } catch (error) {
      console.error("useTeamSelectionState: Error setting selection:", error);
    }
  }, [setSelected, maxTeams]);

  /**
   * Clear all selected teams
   */
  const clearSelection = React.useCallback(() => {
    try {
      setSelected([]);
    } catch (error) {
      console.error("useTeamSelectionState: Error clearing selection:", error);
    }
  }, [setSelected]);

  // Selection constraints info
  const canSelectMore = count < maxTeams;
  const isAtMaximum = count >= maxTeams;
  const hasSelection = count > 0;

  return {
    selected,
    selectedArray,
    count,
    toggle: enhancedToggle,
    setSelected: setSelectionSafe,
    clearSelection,
    canSelectMore,
    isAtMaximum,
    hasSelection
  };
};
