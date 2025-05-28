
import { usePlayoffViewModel } from '@/hooks/playoffs/usePlayoffViewModel';
import { useDivisions } from '@/hooks/useDivisions';
import { useTeamsData } from '@/hooks/useTeamsData';
import { useTeamMutations } from '@/hooks/useTeamMutations';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { groupTeamsByDivision } from '@/utils/teamGrouping';
import { useMemo } from 'react';

/** Temporary shim exposing the legacy shape for Playoffs.tsx */
export const usePlayoffData = () => {
  // Call the view model without a bracketId to get overview data
  const vm = usePlayoffViewModel(null);
  
  // Fetch divisions data using the proper hook
  const { divisions, isLoading: divisionsLoading } = useDivisions();
  
  // Fetch teams data to populate teamsByDivision
  const { teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeamsData();
  
  // Add team update functionality
  const { updateTeam } = useTeamMutations();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Implement the real handleTeamDivisionChange function
  const handleTeamDivisionChange = async (teamId: string, divisionName: string) => {
    try {
      console.log(`Changing team ${teamId} to division: ${divisionName}`);
      
      // Find the team to get its current data
      const team = teams?.find(t => t.id === teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Find the division ID from the division name
      let divisionId: string | null = null;
      if (divisionName !== 'Unassigned') {
        const division = divisions?.find(d => d.name === divisionName);
        if (!division) {
          throw new Error(`Division "${divisionName}" not found`);
        }
        divisionId = division.id;
      }

      // Update the team with the new division
      await updateTeam(teamId, {
        name: team.name,
        logoUrl: team.logoUrl,
        imageUrl: team.imageUrl,
        players: team.players || [],
        wins: team.wins || 0,
        losses: team.losses || 0,
        division: divisionId
      });

      // Invalidate and refetch teams data to update the UI
      await queryClient.invalidateQueries({ queryKey: ['teams'] });
      await refetchTeams();

      toast({
        title: "Team Division Updated",
        description: `${team.name} has been ${divisionName === 'Unassigned' ? 'unassigned from divisions' : `moved to ${divisionName} division`}.`,
      });

    } catch (error) {
      console.error('Error updating team division:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update team division. Please try again.",
        variant: "destructive"
      });
    }
  };

  return useMemo(() => ({
    brackets: [],  // Placeholder - would need implementation
    bracketsLoading: vm.isLoading,
    divisions: divisions || [],  // Use actual divisions data
    divisionsLoading,  // Use actual loading state
    teamsByDivision: groupTeamsByDivision(teams || []),  // Use real team data grouped by division
    bracketsByDivision: {},  // Placeholder - would need implementation
    handleBracketCreated: () => Promise.resolve(),  // Placeholder
    handleTeamDivisionChange, // Now implemented with real functionality
    refetchBrackets: vm.refetch,
    teams: teams || [],  // Also expose teams directly
    teamsLoading,  // Expose teams loading state
  }), [vm, divisions, divisionsLoading, teams, teamsLoading, updateTeam, toast, queryClient, refetchTeams]);
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
