
/**
 * Helper functions for form validation
 */
export const validationHelpers = {
  /**
   * Validates team selection count against constraints
   */
  validateTeamCount: (
    selectedCount: number,
    minTeams: number,
    maxTeams: number
  ): { isValid: boolean; errorMessage: string | null } => {
    if (selectedCount < minTeams) {
      return {
        isValid: false,
        errorMessage: `Please select at least ${minTeams} teams`
      };
    }
    
    if (selectedCount > maxTeams) {
      return {
        isValid: false,
        errorMessage: `Cannot select more than ${maxTeams} teams`
      };
    }
    
    return { isValid: true, errorMessage: null };
  },

  /**
   * Calculates completion percentage
   */
  calculateProgress: (
    selectedCount: number,
    minTeams: number,
    maxTeams: number
  ): number => {
    if (minTeams === 0) return 100;
    return Math.min((selectedCount / minTeams) * 100, 100);
  },

  /**
   * Generates status message based on selection state
   */
  generateStatusMessage: (
    selectedCount: number,
    minTeams: number,
    maxTeams: number,
    availableCount: number
  ): string => {
    if (availableCount === 0) {
      return "No teams available";
    }
    
    if (selectedCount === 0) {
      return `Select ${minTeams} or more teams to continue`;
    }
    
    if (selectedCount < minTeams) {
      const remaining = minTeams - selectedCount;
      return `Select ${remaining} more team${remaining === 1 ? '' : 's'}`;
    }
    
    if (selectedCount >= minTeams && selectedCount <= maxTeams) {
      return `${selectedCount} team${selectedCount === 1 ? '' : 's'} selected`;
    }
    
    return "Too many teams selected";
  }
};
