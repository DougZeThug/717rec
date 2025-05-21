
import { usePlayoffViewModel } from '@/hooks/playoffs/usePlayoffViewModel';
import { useMemo } from 'react';

/** Temporary shim exposing the legacy shape for Playoffs.tsx */
export const usePlayoffData = () => {
  // Call the view model without a bracketId to get overview data
  const vm = usePlayoffViewModel(null);

  return useMemo(() => ({
    brackets: [],  // Placeholder - would need implementation
    bracketsLoading: vm.isLoading,
    divisions: [],  // Placeholder - would need implementation
    divisionsLoading: false,  // Placeholder
    teamsByDivision: {},  // Placeholder
    bracketsByDivision: {},  // Placeholder
    handleBracketCreated: () => Promise.resolve(),  // Placeholder
    handleTeamDivisionChange: () => Promise.resolve(),  // Placeholder
    refetchBrackets: vm.refetch,
  }), [vm]);
};

/**
 * @deprecated – use usePlayoffViewModel directly 
 */
export const usePlayoffBracketData = (bracketId: string) => {
  const viewModel = usePlayoffViewModel(bracketId);
  
  return {
    bracketMatchesByType: viewModel.bracketMatchesByType,
    bracket: viewModel.bracket,
    isLoading: viewModel.isLoading,
    error: viewModel.error,
    teams: viewModel.teams
  };
};

// Re-export the type
export type { BracketMatchesByType } from '@/services/brackets/types';
