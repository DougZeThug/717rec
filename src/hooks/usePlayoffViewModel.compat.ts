import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { usePlayoffViewModel } from '@/hooks/playoffs/usePlayoffViewModel';
import { useTeamsArray } from '@/hooks/teams';
import { useDivisions } from '@/hooks/useDivisions';
import type { BracketsOverviewRow } from '@/services/brackets/BracketReadService';
import { fetchBracketsOverview } from '@/services/brackets/BracketReadService';
import type { BracketMatchesByType } from '@/services/brackets/types';
import { bracketLog } from '@/utils/logger';
import type { PlayoffBracket } from '@/utils/playoffs/playoffTypes';
import { groupTeamsByDivision } from '@/utils/teamGrouping';

/** Temporary shim exposing the legacy shape for Playoffs.tsx */
export const usePlayoffData = (isAdmin: boolean = false, seasonId?: string | null) => {
  // Call the view model without a bracketId to get overview data
  const vm = usePlayoffViewModel(null);

  // Fetch divisions data using the proper hook
  const { divisions, isLoading: divisionsLoading } = useDivisions();

  // Fetch teams data to populate teamsByDivision
  const { teams, isLoading: teamsLoading } = useTeamsArray();

  // Determine if we're viewing a past season
  const isViewingPastSeason = !!seasonId && seasonId !== undefined;

  // Fetch brackets data from Supabase with matches included
  const {
    data: brackets = [],
    isLoading: bracketsLoading,
    error: bracketsError,
    refetch: refetchBrackets,
  } = useQuery({
    queryKey: ['playoffs-brackets-overview', { isAdmin, seasonId }],
    queryFn: async () => {
      bracketLog('Fetching brackets overview for season:', seasonId);

      const data: BracketsOverviewRow[] = await fetchBracketsOverview(seasonId);

      // Transform to domain objects
      let brackets: PlayoffBracket[] = (data ?? []).map((br) => ({
        id: br.id,
        name: br.title,
        division: br.divisions?.name ?? undefined,
        divisionId: br.division_id ?? undefined,
        format: br.format ?? 'Double Elimination',
        matches: [],
        champion: undefined,
        state: (br.state === 'underway'
          ? 'in_progress'
          : br.state === 'completed'
            ? 'completed'
            : 'pending') as PlayoffBracket['state'],
        created_at: br.created_at ?? undefined,
        challonge_tournament_id: br.challonge_tournament_id ?? undefined,
        uses_brackets_manager: br.uses_brackets_manager ?? false,
      }));

      // For current/active season: hide completed brackets (original behavior)
      // For past seasons: show only completed brackets
      if (isViewingPastSeason) {
        // Show all brackets for past seasons (they should all be completed)
        bracketLog('Showing all brackets for past season:', { total: brackets.length });
      } else {
        // Current season: filter out completed brackets
        const originalCount = brackets.length;
        brackets = brackets.filter((b) => b.state !== 'completed');
        bracketLog('Filtered brackets:', { total: originalCount, active: brackets.length });
      }

      return brackets;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleBracketCreated exposed via memo intentionally
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
export type { BracketMatchesByType };
