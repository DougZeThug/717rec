

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
type PlayoffMatchRow = Database["public"]["Tables"]["playoff_matches"]["Row"];
type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
type BracketRow = Database["public"]["Tables"]["brackets"]["Row"];
type DivisionRow = Database["public"]["Tables"]["divisions"]["Row"];

interface BracketRowWithRels extends BracketRow {
  divisions: DivisionRow | null;
}

// Row-to-Domain mapper
const mapMatchRow = (row: PlayoffMatchRow): PlayoffMatch => ({
  id: row.id,
  round: row.round ?? 0,
  position: row.position ?? 0,
  team1Id: row.team1_id,
  team2Id: row.team2_id,
  winnerId: row.winner_id,
  loserId: row.loser_id,
  team1Score: row.team1_score,
  team2Score: row.team2_score,
  team1GameWins: null,
  team2GameWins: null,
  matchType: (row.match_type as PlayoffMatch["matchType"]) ?? "winners",
  bestOf: row.best_of ?? 3,
  games: [],
  team1Seed: row.team1_seed,
  team2Seed: row.team2_seed,
  nextWinMatchId: row.next_win_match_id,
  nextLoseMatchId: row.next_lose_match_id,
  bracket_id: row.bracket_id ?? "",
  status: (row.status as PlayoffMatch["status"]) ?? "pending"
});

/** Temporary shim exposing the legacy shape for Playoffs.tsx */
export const usePlayoffData = (isAdmin: boolean = false) => {
  // Call the view model without a bracketId to get overview data
  const vm = usePlayoffViewModel(null);
  
  // Fetch divisions data using the proper hook
  const { divisions, isLoading: divisionsLoading } = useDivisions();
  
  // Fetch teams data to populate teamsByDivision
  const { teams, isLoading: teamsLoading } = useTeamsData();

  // Fetch brackets data from Supabase with matches included
  const { data: brackets = [], isLoading: bracketsLoading, error: bracketsError, refetch: refetchBrackets } = useQuery({
    queryKey: ['playoffs-brackets-overview', { isAdmin }], // Separate cache per user role
    queryFn: async () => {
      console.log('🔍 Brackets Query START:', {
        timestamp: new Date().toISOString()
      });
      
      // Check authentication state
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('🔍 Brackets Query User Check:', {
        timestamp: new Date().toISOString(),
        userAuthenticated: !!user,
        userId: user?.id || 'none'
      });
      
      const { data, error } = await supabase
        .from('brackets')
        .select(`
          *,
          divisions(*)
        `)
        .order('created_at', { ascending: false }) as unknown as {
          data: BracketRowWithRels[] | null;
          error: any;
        };
      
      console.log('🔍 Brackets Query RAW RESULT:', {
        dataLength: data?.length || 0,
        hasError: !!error,
        errorMessage: error?.message || null,
        rawBrackets: data?.map(b => ({
          id: b.id,
          title: b.title,
          state: b.state,
          divisionId: b.division_id,
          divisionName: b.divisions?.name,
          matchesCount: 0 // Matches loaded by BracketsViewerComponent
        })) || []
      });
      
      if (error) {
        console.error('🚨 Brackets query failed:', {
          error,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          errorCode: error.code,
          userAuthenticated: !!user
        });
        throw error;
      }
      
      // Transform to domain objects
      let brackets: PlayoffBracket[] = (data ?? []).map(br => ({
        id: br.id,
        name: br.title,
        division: br.divisions?.name,
        divisionId: br.division_id,
        format: br.format ?? "Double Elimination",
        matches: [], // Matches loaded by BracketsViewerComponent based on bracket type
        champion: undefined,
        state: (br.state === 'underway' ? 'in_progress' : 
                br.state === 'complete' ? 'completed' : 
                'pending') as PlayoffBracket["state"],
        created_at: br.created_at,
        challonge_tournament_id: br.challonge_tournament_id
      }));
      
      // Filter out completed brackets for all users (admins and non-admins)
      const originalCount = brackets.length;
      brackets = brackets.filter(b => b.state !== 'completed');
      console.log('🔒 Completed brackets filtered (all users):', {
        originalCount,
        filteredCount: brackets.length,
        removedCompleted: originalCount - brackets.length,
        isAdmin
      });
      
      console.log('🔍 Brackets Query TRANSFORMED:', {
        count: brackets.length,
        isAdmin,
        transformedBrackets: brackets.map(b => ({
          id: b.id,
          name: b.name,
          division: b.division,
          divisionId: b.divisionId,
          state: b.state,
          matchesCount: b.matches.length
        }))
      });
      
      return brackets;
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (formerly cacheTime)
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: false
  });

  // Group brackets by display_division (consolidates to 3 main divisions)
  const bracketsByDivision = useMemo(() => {
    const grouped: Record<string, PlayoffBracket[]> = {};
    
    console.log('🔍 bracketsByDivision grouping - Input data:', {
      bracketsCount: brackets?.length || 0,
      brackets: brackets?.map(b => ({
        id: b.id,
        name: b.name,
        division: b.division,
        divisionId: b.divisionId
      })),
      divisionsCount: divisions?.length || 0,
      divisions: divisions?.map(d => ({
        id: d.id,
        name: d.name,
        display_division: d.display_division
      }))
    });
    
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
      
      console.log('🔍 Division name to display mapping:', {
        mapping: Array.from(divisionNameToDisplay.entries())
      });
      
      // Group brackets by display_division
      brackets.forEach(bracket => {
        const divisionName = bracket.division;
        const displayDivision = divisionName ? divisionNameToDisplay.get(divisionName) : null;
        
        console.log('🔍 Processing bracket:', {
          bracketId: bracket.id,
          bracketName: bracket.name,
          bracketDivision: bracket.division,
          bracketDivisionId: bracket.divisionId,
          lookupResult: displayDivision,
          willBeAdded: !!(displayDivision && displayDivision !== 'Hidden' && grouped[displayDivision])
        });
        
        // Skip Hidden division brackets
        if (displayDivision && displayDivision !== 'Hidden' && grouped[displayDivision]) {
          grouped[displayDivision].push(bracket);
        }
      });
    }
    
    console.log('🔍 Final bracketsByDivision grouped:', grouped);
    
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

