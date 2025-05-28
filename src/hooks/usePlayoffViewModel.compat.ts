import { usePlayoffViewModel } from '@/hooks/playoffs/usePlayoffViewModel';
import { useDivisions } from '@/hooks/useDivisions';
import { useTeamsData } from '@/hooks/useTeamsData';
import { groupTeamsByDivision } from '@/utils/teamGrouping';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Temporary shim exposing the legacy shape for Playoffs.tsx */
export const usePlayoffData = () => {
  // Call the view model without a bracketId to get overview data
  const vm = usePlayoffViewModel(null);
  
  // Fetch divisions data using the proper hook
  const { divisions, isLoading: divisionsLoading } = useDivisions();
  
  // Fetch teams data to populate teamsByDivision
  const { teams, isLoading: teamsLoading } = useTeamsData();

  // Fetch brackets data from Supabase
  const { data: brackets = [], isLoading: bracketsLoading, error: bracketsError, refetch: refetchBrackets } = useQuery({
    queryKey: ['brackets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brackets')
        .select(`
          *,
          divisions(*)
        `);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Group brackets by division
  const bracketsByDivision = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    if (divisions && brackets) {
      // Initialize with empty arrays for each division
      divisions.forEach(div => {
        grouped[div.name] = [];
      });
      
      // Group brackets by division name
      brackets.forEach(bracket => {
        const divisionName = bracket.divisions?.name;
        if (divisionName && grouped[divisionName]) {
          grouped[divisionName].push(bracket);
        }
      });
    }
    
    return grouped;
  }, [divisions, brackets]);

  const handleBracketCreated = async () => {
    await refetchBrackets();
  };

  return useMemo(() => ({
    brackets: brackets || [],
    bracketsLoading,
    divisions: divisions || [],
    divisionsLoading,
    teamsByDivision: groupTeamsByDivision(teams || []),
    bracketsByDivision,
    handleBracketCreated,
    handleTeamDivisionChange: () => Promise.resolve(),  // Placeholder
    refetchBrackets,
    teams: teams || [],
    teamsLoading,
    error: bracketsError,
    isLoading: bracketsLoading || divisionsLoading || teamsLoading,
  }), [vm, divisions, divisionsLoading, teams, teamsLoading, brackets, bracketsLoading, bracketsByDivision, refetchBrackets, bracketsError]);
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

// Re-export the type from the brackets services
export type BracketMatchesByType = {
  winners: any[][];
  losers: any[][];
  finals: any[];
};
