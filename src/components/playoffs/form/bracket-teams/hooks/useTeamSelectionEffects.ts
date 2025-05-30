
import React from 'react';
import { TeamSelectionEffectsResult } from '../types';

/**
 * Hook for managing side effects of team selection changes
 * Handles syncing selection state with parent components and prevents infinite loops
 * @param selectedArray - Array of currently selected team IDs
 * @param onChange - Callback function to notify parent of selection changes
 * @returns Object containing cleanup function for resetting tracking state
 */
export const useTeamSelectionEffects = (
  selectedArray: string[],
  onChange: (ids: string[]) => void
): TeamSelectionEffectsResult => {
  // Track if onChange has been called to prevent infinite loops
  const hasCalledOnChange = React.useRef(false);

  // Sync with parent component
  React.useEffect(() => {
    try {
      // Prevent calling onChange during initial render if selection is empty
      if (selectedArray.length === 0 && !hasCalledOnChange.current) {
        hasCalledOnChange.current = true;
        onChange(selectedArray);
        return;
      }

      // Always call onChange for non-empty selections or subsequent calls
      onChange(selectedArray);
      hasCalledOnChange.current = true;
    } catch (error) {
      console.error("useTeamSelectionEffects: Error in onChange callback:", error);
    }
  }, [selectedArray, onChange]);

  /**
   * Cleanup function for resetting the tracking state
   * Useful when the component needs to reset its sync behavior
   */
  const cleanup = React.useCallback(() => {
    hasCalledOnChange.current = false;
  }, []);

  return {
    cleanup
  };
};
