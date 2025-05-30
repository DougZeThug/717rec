
import React from 'react';
import { TeamSelectionEffectsResult } from '../types';

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

  // Cleanup function for future use
  const cleanup = React.useCallback(() => {
    hasCalledOnChange.current = false;
  }, []);

  return {
    cleanup
  };
};
