
import { usePlayoffViewModel } from '@/hooks/playoffs/usePlayoffViewModel';
import { useDivisions } from '@/hooks/useDivisions';
import { useTeamsData } from '@/hooks/useTeamsData';
import { groupTeamsByDivision } from '@/utils/teamGrouping';
import { useMemo } from 'react';

/** Temporary shim exposing the legacy shape for Playoffs.tsx */
export const usePlayoffData = () => {
  // Call the view model without a bracketId to get overview data
  const vm = usePlayoffViewModel(null);
  
  // Fetch divisions data using the proper hook
  const { divisions, isLoading: divisionsLoading } = useDivisions();
  
  // Fetch teams data to populate teamsByDivision
  const { teams, isLoading: teamsLoading } = useTeamsData();

  return useMemo(() => ({
    brackets: [],  // Placeholder - would need implementation
    bracketsLoading: vm.isLoading,
    divisions: divisions || [],  // Use actual divisions data
    divisionsLoading,  // Use actual loading state
    teamsByDivision: groupTeamsByDivision(teams || []),  // Use real team data grouped by division
    bracketsByDivision: {},  // Placeholder - would need implementation
    handleBracketCreated: () => Promise.resolve(),  // Placeholder
    handleTeamDivisionChange: () => Promise.resolve(),  // Placeholder
    refetchBrackets: () => Promise.resolve(), // Fix: provide a valid refetch function
    teams: teams || [],  // Also expose teams directly
    teamsLoading,  // Expose teams loading state
  }), [vm, divisions, divisionsLoading, teams, teamsLoading]);
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
