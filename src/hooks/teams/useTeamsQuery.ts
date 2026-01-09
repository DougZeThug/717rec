import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";
import { teamLog, errorLog } from "@/utils/logger";

// Unified query key for teams
export const TEAMS_QUERY_KEY = "teams" as const;

// Options for team queries
export interface TeamsQueryOptions {
  divisionId?: string | null;
  includeHidden?: boolean;
  /** When false, the query will not execute. Useful for lazy loading. */
  enabled?: boolean;
}

// Raw row type from v_team_details view
interface VTeamDetailsRow {
  team_id: string;
  name: string | null;
  logo_url: string | null;
  image_url: string | null;
  wins: number | null;
  losses: number | null;
  game_wins: number | null;
  game_losses: number | null;
  division_id: string | null;
  divisionname: string | null;
  sos: number | null;
  power_score: number | null;
  win_percentage: number | null;
  game_win_percentage: number | null;
  players: unknown;
  created_at: string | null;
  close_match_losses: number | null;
}

/**
 * Transform a raw database row into a Team object
 * This is the single source of truth for team data transformation
 */
export function transformTeamRow(row: VTeamDetailsRow): Team {
  return {
    id: row.team_id,
    name: row.name || "Unnamed Team",
    logoUrl: row.logo_url || null,
    imageUrl: row.image_url || null,
    players: Array.isArray(row.players) ? row.players : [],
    wins: row.wins || 0,
    losses: row.losses || 0,
    game_wins: row.game_wins || 0,
    game_losses: row.game_losses || 0,
    created_at: row.created_at || new Date().toISOString(),
    division_id: row.division_id || null,
    division: row.division_id || null, // Legacy compatibility
    divisionName: row.divisionname || null,
    sos: typeof row.sos === "number" ? row.sos : 0.5,
    power_score: typeof row.power_score === "number" ? row.power_score : 0,
    win_percentage: row.win_percentage || 0,
    game_win_percentage: row.game_win_percentage || 0,
    close_match_losses: row.close_match_losses,
  };
}

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
 * Fetch teams from the database
 */
async function fetchTeams(options?: TeamsQueryOptions): Promise<Team[]> {
  let query = supabase
    .from("v_team_details")
    .select(
      `
      team_id,
      name,
      logo_url,
      image_url,
      wins,
      losses,
      game_wins,
      game_losses,
      division_id,
      divisionname,
      sos,
      power_score,
      win_percentage,
      game_win_percentage,
      players,
      created_at,
      close_match_losses
    `
    )
    .order("name");

  if (options?.divisionId) {
    query = query.eq("division_id", options.divisionId);
  }

  const { data, error } = await query;

  if (error) {
    errorLog("Error fetching teams:", error);
    throw error;
  }

  // Deduplicate by team_id (view may return duplicates for players)
  const uniqueTeamsMap = new Map<string, VTeamDetailsRow>();
  (data || []).forEach((row) => {
    if (!uniqueTeamsMap.has(row.team_id)) {
      uniqueTeamsMap.set(row.team_id, row as VTeamDetailsRow);
    }
  });

  const uniqueTeams = Array.from(uniqueTeamsMap.values());

  // Filter out hidden teams unless explicitly included
  const filteredTeams = options?.includeHidden
    ? uniqueTeams
    : uniqueTeams.filter((team) => team.divisionname !== "Hidden");

  teamLog(
    `Loaded ${filteredTeams.length} of ${uniqueTeams.length} teams (hidden filtered: ${!options?.includeHidden})`
  );

  return filteredTeams.map(transformTeamRow);
}

/**
 * Primary hook for fetching teams as an array
 * Uses TanStack Query for caching and deduplication
 */
export function useTeamsQuery(
  options?: TeamsQueryOptions
): UseQueryResult<Team[], Error> {
  return useQuery({
    queryKey: buildQueryKey(options),
    queryFn: () => fetchTeams(options),
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

  return {
    teams: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    fetchTeams: query.refetch,
  };
}
