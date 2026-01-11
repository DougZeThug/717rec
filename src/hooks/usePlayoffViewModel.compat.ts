import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { usePlayoffViewModel } from '@/hooks/playoffs/usePlayoffViewModel';
import { useTeamsArray } from '@/hooks/teams';
import { useDivisions } from '@/hooks/useDivisions';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { bracketLog, errorLog } from '@/utils/logger';
import type { PlayoffBracket, PlayoffMatch } from '@/utils/playoffs/playoffTypes';
import { groupTeamsByDivision } from '@/utils/teamGrouping';

// Helper type aliases
type PlayoffMatchRow = Database['public']['Tables']['playoff_matches']['Row'];
type BracketRow = Database['public']['Tables']['brackets']['Row'];
type DivisionRow = Database['public']['Tables']['divisions']['Row'];

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
  matchType: (row.match_type as PlayoffMatch['matchType']) ?? 'winners',
  bestOf: row.best_of ?? 3,
  games: [],
  team1Seed: row.team1_seed,
  team2Seed: row.team2_seed,
  nextWinMatchId: row.next_win_match_id,
  nextLoseMatchId: row.next_lose_match_id,
  bracket_id: row.bracket_id ?? '',
  status: (row.status as PlayoffMatch['status']) ?? 'pending',
});

/** Temporary shim exposing the legacy shape for Playoffs.tsx */
export const usePlayoffData = (isAdmin: boolean = false) => {
  // Call the view model without a bracketId to get overview data
  const vm = usePlayoffViewModel(null);

  // Fetch divisions data using the proper hook
  const { divisions, isLoading: divisionsLoading } = useDivisions();

  // Fetch teams data to populate teamsByDivision
  const { teams, isLoading: teamsLoading } = useTeamsArray();

  // Fetch brackets data from Supabase with matches included
  const {
    data: brackets = [],
    isLoading: bracketsLoading,
    error: bracketsError,
    refetch: refetchBrackets,
  } = useQuery({
    queryKey: ['playoffs-brackets-overview', { isAdmin }], // Separate cache per user role
    queryFn: async () => {
      bracketLog('Fetching brackets overview');

      // Check authentication state
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = (await supabase
        .from('brackets')
        .select(
          `
          *,
          divisions(*)
        `
        )
        .order('created_at', { ascending: false })) as unknown as {
        data: BracketRowWithRels[] | null;
        error: any;
      };

      if (error) {
        errorLog('Brackets query failed:', error.message);
        throw error;
      }

      // Transform to domain objects
      let brackets: PlayoffBracket[] = (data ?? []).map((br) => ({
        id: br.id,
        name: br.title,
        division: br.divisions?.name,
        divisionId: br.division_id,
        format: br.format ?? 'Double Elimination',
        matches: [], // Matches loaded by BracketsViewerComponent based on bracket type
        champion: undefined,
        state: (br.state === 'underway'
          ? 'in_progress'
          : br.state === 'completed'
            ? 'completed'
            : 'pending') as PlayoffBracket['state'],
        created_at: br.created_at,
        challonge_tournament_id: br.challonge_tournament_id,
        uses_brackets_manager: br.uses_brackets_manager ?? false,
      }));

      // Filter out completed brackets for all users (admins and non-admins)
      const originalCount = brackets.length;
      brackets = brackets.filter((b) => b.state !== 'completed');
      bracketLog('Filtered brackets:', { total: originalCount, active: brackets.length });

      return brackets;
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (formerly cacheTime)
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: false,
  });

  // Group brackets by display_division (consolidates to 3 main divisions)
  const bracketsByDivision = useMemo(() => {
    const grouped: Record<string, PlayoffBracket[]> = {};

    if (divisions && brackets) {
      // Initialize with empty arrays for unique display divisions (excluding Hidden)
      const uniqueDisplayDivisions = new Set<string>();
      divisions.forEach((div) => {
        if (div.display_division && div.display_division !== 'Hidden') {
          uniqueDisplayDivisions.add(div.display_division);
        }
      });

      uniqueDisplayDivisions.forEach((displayDiv) => {
        grouped[displayDiv] = [];
      });

      // Create a map of division name -> display_division for lookup
      const divisionNameToDisplay = new Map<string, string>();
      divisions.forEach((div) => {
        divisionNameToDisplay.set(div.name, div.display_division || div.name);
      });

      // Group brackets by display_division
      brackets.forEach((bracket) => {
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

  return useMemo(
    () => ({
      brackets: brackets as PlayoffBracket[],
      bracketsLoading,
      divisions: divisions || [],
      divisionsLoading,
      teamsByDivision: groupTeamsByDivision(teams || []),
      bracketsByDivision,
      handleBracketCreated,
      handleTeamDivisionChange: () => Promise.resolve(), // Placeholder
      refetchBrackets,
      teams: teams || [],
      teamsLoading,
      error: bracketsError,
      isLoading: bracketsLoading || divisionsLoading || teamsLoading,
    }),
    [
      vm,
      divisions,
      divisionsLoading,
      teams,
      teamsLoading,
      brackets,
      bracketsLoading,
      bracketsByDivision,
      refetchBrackets,
      bracketsError,
    ]
  );
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
    teams: viewModel.teams,
  };
};

// Re-export the type from the brackets services
export type BracketMatchesByType = {
  winners: any[][];
  losers: any[][];
  finals: any[];
};
