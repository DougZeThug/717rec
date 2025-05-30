
import React from 'react';
import { useTeamSelection } from '@/hooks/playoffs';
import { TeamSelectionStateResult } from '../types';

export const useTeamSelectionState = (
  maxTeams: number,
  initialSelected: string[] = []
): TeamSelectionStateResult => {
  // Use the existing team selection hook
  const { selected, toggle, setSelected, count, selectedArray } = useTeamSelection(initialSelected);

  // Enhanced toggle with max teams validation
  const enhancedToggle = React.useCallback((teamId: string) => {
    try {
      toggle(teamId, maxTeams);
    } catch (error) {
      console.error("useTeamSelectionState: Error toggling team:", error);
    }
  }, [toggle, maxTeams]);

  // Set selection with validation
  const setSelectionSafe = React.useCallback((teamIds: string[]) => {
    try {
      const validatedIds = teamIds.slice(0, maxTeams);
      setSelected(validatedIds);
    } catch (error) {
      console.error("useTeamSelectionState: Error setting selection:", error);
    }
  }, [setSelected, maxTeams]);

  // Clear selection
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
