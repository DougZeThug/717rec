
import { usePlayoffViewModel } from '@/hooks/playoffs/usePlayoffViewModel';
import { useDivisions } from '@/hooks/useDivisions';
import { useTeamData } from '@/hooks/useTeamData';
import { useMemo } from 'react';

/** Temporary shim exposing the legacy shape for Playoffs.tsx */
export const usePlayoffData = () => {
  // Call the view model without a bracketId to get overview data
  const vm = usePlayoffViewModel(null);
  
  // Fetch divisions data using the proper hook
  const { divisions, isLoading: divisionsLoading } = useDivisions();
  
  // Fetch teams data with proper records from v_team_details
  const { data: teamsData, isLoading: teamsLoading } = useTeamData();

  return useMemo(() => {
    // Group teams by division for better organization
    const teamsByDivision: Record<string, any[]> = {};
    if (teamsData && Array.isArray(teamsData)) {
      teamsData.forEach(team => {
        const divisionName = team.divisionName || 'No Division';
        if (!teamsByDivision[divisionName]) {
          teamsByDivision[divisionName] = [];
        }
        teamsByDivision[divisionName].push(team);
      });
    }

    console.log('usePlayoffData - Teams by division:', teamsByDivision);

    return {
      brackets: [],  // Placeholder - would need implementation
      bracketsLoading: vm.isLoading,
      divisions: divisions || [],  // Use actual divisions data
      divisionsLoading,  // Use actual loading state
      teamsByDivision,  // Use properly grouped teams with correct records
      bracketsByDivision: {},  // Placeholder - would need implementation
      handleBracketCreated: () => Promise.resolve(),  // Placeholder
      handleTeamDivisionChange: () => Promise.resolve(),  // Placeholder
      refetchBrackets: vm.refetch,
    };
  }, [vm, divisions, divisionsLoading, teamsData, teamsLoading]);
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
