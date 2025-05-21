
import { usePlayoffViewModel } from '@/hooks/playoffs/usePlayoffViewModel';
import type { BracketMatchesByType } from '@/services/brackets/types';

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
