import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';

import { fetchTeamsWithOptions, type TeamsQueryOptions } from '@/services/teams/TeamFetchService';
import { Team } from '@/types';

// Re-export for any consumers that import this type from here
export type { TeamsQueryOptions };

// Unified query key for teams
export const TEAMS_QUERY_KEY = 'teams' as const;

/**
 * Build query key for teams based on options
 */
function buildQueryKey(options?: TeamsQueryOptions): (string | TeamsQueryOptions)[] {
  if (!options?.divisionId && !options?.includeHidden) {
    return [TEAMS_QUERY_KEY];
  }
  return [TEAMS_QUERY_KEY, options];
}

/**
 * Primary hook for fetching teams as an array
 * Uses TanStack Query for caching and deduplication
 */
export function useTeamsQuery(options?: TeamsQueryOptions): UseQueryResult<Team[], Error> {
  return useQuery({
    queryKey: buildQueryKey(options),
    queryFn: () => fetchTeamsWithOptions(options),
    staleTime: 1000 * 60 * 5, // 5 minutes - team data only changes when scores are entered
    enabled: options?.enabled !== false, // Default to true unless explicitly disabled
  });
}

/**
 * Hook that returns teams as a Record<string, Team> map for O(1) lookups
 * Internally uses useTeamsQuery for cache deduplication
 */
export function useTeamsMap(options?: TeamsQueryOptions): {
  teams: Record<string, Team>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useTeamsQuery(options);

  const teamsMap = useMemo(() => {
    const map: Record<string, Team> = {};
    query.data?.forEach((team) => {
      map[team.id] = team;
    });
    return map;
  }, [query.data]);

  return {
    teams: teamsMap,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook that returns teams as an array with legacy-compatible API
 * Provides { teams, isLoading, fetchTeams } interface for backward compatibility
 */
export function useTeamsArray(options?: TeamsQueryOptions): {
  teams: Team[];
  isLoading: boolean;
  error: Error | null;
  fetchTeams: () => void;
} {
  const query = useTeamsQuery(options);

  // Stable empty-array reference: avoids creating a new [] on every render
  // while query.data is undefined (during loading). A new [] on every render
  // would cause any useEffect that depends on this array to re-run indefinitely.
  const emptyRef = useRef<Team[]>([]);

  return {
    teams: query.data ?? emptyRef.current,
    isLoading: query.isLoading,
    error: query.error,
    fetchTeams: query.refetch,
  };
}
