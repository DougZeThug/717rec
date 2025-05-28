
import { usePlayoffViewModel } from '@/hooks/playoffs/usePlayoffViewModel';
import { useDivisions } from '@/hooks/useDivisions';
import { useTeamsData } from '@/hooks/useTeamsData';
import { useMemo } from 'react';
import { Team } from '@/types';

/** Temporary shim exposing the legacy shape for Playoffs.tsx */
export const usePlayoffData = () => {
  // Call the view model without a bracketId to get overview data
  const vm = usePlayoffViewModel(null);
  
  // Fetch divisions data using the proper hook
  const { divisions, isLoading: divisionsLoading } = useDivisions();
  
  // Fetch teams data using the proper hook that gets from v_team_details
  const { teams, isLoading: teamsLoading } = useTeamsData();

  // Group teams by division with proper data
  const teamsByDivision = useMemo(() => {
    if (!teams || !Array.isArray(teams)) return {};
    
    const grouped: Record<string, Team[]> = {};
    
    teams.forEach(team => {
      // Use division_id for grouping
      const divisionId = team.division_id || team.division;
      if (divisionId) {
        if (!grouped[divisionId]) {
          grouped[divisionId] = [];
        }
        grouped[divisionId].push(team);
      }
    });
    
    console.log('Teams grouped by division:', Object.keys(grouped).map(divId => ({
      divisionId: divId,
      teamCount: grouped[divId].length,
      teams: grouped[divId].map(t => ({ name: t.name, wins: t.wins, losses: t.losses }))
    })));
    
    return grouped;
  }, [teams]);

  return useMemo(() => ({
    brackets: [],  // Placeholder - would need implementation
    bracketsLoading: vm.isLoading,
    divisions: divisions || [],  // Use actual divisions data
    divisionsLoading,  // Use actual loading state
    teamsByDivision,  // Use actual teams grouped by division
    bracketsByDivision: {},  // Placeholder - would need implementation
    handleBracketCreated: () => Promise.resolve(),  // Placeholder
    handleTeamDivisionChange: () => Promise.resolve(),  // Placeholder
    refetchBrackets: vm.refetch,
  }), [vm, divisions, divisionsLoading, teamsByDivision]);
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
