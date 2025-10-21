

import { usePlayoffViewModel } from '@/hooks/playoffs/usePlayoffViewModel';
import { useDivisions } from '@/hooks/useDivisions';
import { useTeamsData } from '@/hooks/useTeamsData';
import { groupTeamsByDivision } from '@/utils/teamGrouping';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from "@/integrations/supabase/types";
import type { PlayoffBracket, PlayoffMatch } from "@/utils/playoffs/playoffTypes";

// Helper type aliases
type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
type BracketRow = Database["public"]["Tables"]["brackets"]["Row"];
type DivisionRow = Database["public"]["Tables"]["divisions"]["Row"];

interface BracketRowWithRels extends BracketRow {
  divisions: DivisionRow | null;
  matches: MatchRow[];
}

// Row-to-Domain mapper
const mapMatchRow = (row: MatchRow): PlayoffMatch => ({
  id: row.id,
  round: row.round_number ?? 0,
  position: row.position ?? 0,
  team1Id: row.team1_id,
  team2Id: row.team2_id,
  winnerId: row.winner_id,
  loserId: row.loser_id,
  team1Score: row.team1_score,
  team2Score: row.team2_score,
  team1GameWins: row.team1_game_wins,
  team2GameWins: row.team2_game_wins,
  matchType: (row.match_type as PlayoffMatch["matchType"]) ?? "winners",
  bestOf: row.best_of ?? 3,
  games: [],
  team1Seed: null,
  team2Seed: null,
  nextWinMatchId: row.next_match_id,
  nextLoseMatchId: row.next_loser_match_id,
  bracket_id: row.bracket_id ?? "",
  status: row.iscompleted ? "completed" : "pending"
});

/** Temporary shim exposing the legacy shape for Playoffs.tsx */
export const usePlayoffData = () => {
  // Call the view model without a bracketId to get overview data
  const vm = usePlayoffViewModel(null);
  
  // Fetch divisions data using the proper hook
  const { divisions, isLoading: divisionsLoading } = useDivisions();
  
  // Fetch teams data to populate teamsByDivision
  const { teams, isLoading: teamsLoading } = useTeamsData();

  // Fetch brackets data from Supabase with matches included
  const { data: brackets = [], isLoading: bracketsLoading, error: bracketsError, refetch: refetchBrackets } = useQuery({
    queryKey: ['brackets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brackets')
        .select(`
          *,
          divisions(*),
          matches(*)
        `) as unknown as {
          data: BracketRowWithRels[] | null;
          error: any;
        };
      
      if (error) throw error;
      
      // Transform to domain objects
      const brackets: PlayoffBracket[] = (data ?? []).map(br => ({
        id: br.id,
        name: br.title,
        division: br.divisions?.name,
        divisionId: br.division_id,
        format: br.format ?? "Double Elimination",
        matches: (br.matches ?? []).map(mapMatchRow),
        champion: undefined,
        state: (br.state === 'underway' ? 'in_progress' : 
                br.state === 'complete' ? 'completed' : 
                'pending') as PlayoffBracket["state"],
        created_at: br.created_at,
        challonge_tournament_id: br.challonge_tournament_id
      }));
      
      return brackets;
    }
  });

  // Group brackets by display_division (consolidates to 3 main divisions)
  const bracketsByDivision = useMemo(() => {
    const grouped: Record<string, PlayoffBracket[]> = {};
    
    if (divisions && brackets) {
      // Initialize with empty arrays for unique display divisions (excluding Hidden)
      const uniqueDisplayDivisions = new Set<string>();
      divisions.forEach(div => {
        if (div.display_division && div.display_division !== 'Hidden') {
          uniqueDisplayDivisions.add(div.display_division);
        }
      });
      
      uniqueDisplayDivisions.forEach(displayDiv => {
        grouped[displayDiv] = [];
      });
      
      // Create a map of division name -> display_division for lookup
      const divisionNameToDisplay = new Map<string, string>();
      divisions.forEach(div => {
        divisionNameToDisplay.set(div.name, div.display_division || div.name);
      });
      
      // Group brackets by display_division
      brackets.forEach(bracket => {
        const divisionName = bracket.division;
        const displayDivision = divisionName ? divisionNameToDisplay.get(divisionName) : null;
        
        // Skip Hidden division brackets
        if (displayDivision && displayDivision !== 'Hidden' && grouped[displayDivision]) {
          grouped[displayDivision].push(bracket);
        }
      });
    }
    
    return grouped;
  }, [divisions, brackets]);

  const handleBracketCreated = async () => {
    await refetchBrackets();
  };

  return useMemo(() => ({
    brackets: brackets as PlayoffBracket[],
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

