import { QUERY_STALE_TIMES } from '@/config/cache';
import { supabase } from '@/integrations/supabase/client';
import { ArchivedMatchData, MatchData, PlayoffMatchData, SeasonStats } from '@/utils/career/types';
import { handleDatabaseError } from '@/utils/errorHandler';
import { warnLog } from '@/utils/logger';

import { CareerData, TeamDetailsArchive } from './CareerTypes';

// ── Bulk fetching for all teams (fixes N+1 query pattern) ──────────────

// ── Module-level cache for bracket division weights & season map ────────
let bracketCache: {
  bracketDivisionWeights: Record<string, number>;
  bracketDivisionDisplayNames: Record<string, string>;
  bracketSeasonMap: Record<string, string>;
  timestamp: number;
} | null = null;
const BRACKET_CACHE_TTL = QUERY_STALE_TIMES.STANDARD; // 5 minutes

/** Raw season stats row with team_id for grouping */
interface RawSeasonStatsRow {
  team_id: string;
  match_wins: number | null;
  match_losses: number | null;
  game_wins: number | null;
  game_losses: number | null;
  champion: boolean | null;
  runner_up: boolean | null;
  playoff_rank: number | null;
  sos: number | null;
  division_name: string | null;
  season_id: string | null;
  power_score: number | null;
  seasons: { name: string } | null;
}

/** Per-team data extracted from bulk queries, plus power score prefetch data */
export interface BulkTeamCareerData extends CareerData {
  /** Season stats with power_score included (for calculateCareerPowerScore) */
  seasonPowerScores: {
    power_score: number | null;
    match_wins: number | null;
    match_losses: number | null;
    season_id: string | null;
  }[];
}

/**
 * Groups matches by team: each match appears in both team1's and team2's list.
 */
function groupMatchesByTeam<T extends { team1_id: string | null; team2_id: string | null }>(
  matches: T[],
  teamIds: Set<string>
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const match of matches) {
    if (match.team1_id && teamIds.has(match.team1_id)) {
      let list = map.get(match.team1_id);
      if (!list) {
        list = [];
        map.set(match.team1_id, list);
      }
      list.push(match);
    }
    if (match.team2_id && teamIds.has(match.team2_id) && match.team2_id !== match.team1_id) {
      let list = map.get(match.team2_id);
      if (!list) {
        list = [];
        map.set(match.team2_id, list);
      }
      list.push(match);
    }
  }
  return map;
}

/**
 * Builds teamDivisionWeights (teamId → weight) and teamDivisionMap
 * ("teamId_seasonId" → divisionname) from raw query results.
 */
function buildTeamDivisionMaps(
  teamDivisionsData: { id: string; divisions: unknown }[] | null,
  archiveData: TeamDetailsArchive[] | null
): { teamDivisionWeights: Map<string, number>; teamDivisionMap: Map<string, string> } {
  const teamDivisionWeights = new Map<string, number>();
  for (const row of teamDivisionsData ?? []) {
    const divisions = row.divisions as { division_weight: number } | null;
    teamDivisionWeights.set(row.id, divisions?.division_weight || 0.85);
  }

  const teamDivisionMap = new Map<string, string>();
  for (const archive of archiveData ?? []) {
    if (archive.team_id && archive.season_id && archive.divisionname) {
      teamDivisionMap.set(`${archive.team_id}_${archive.season_id}`, archive.divisionname);
    }
  }
  return { teamDivisionWeights, teamDivisionMap };
}

/**
 * Groups season stats rows by team_id, filtering to only tracked teams.
 */
function groupSeasonStats(
  data: unknown,
  teamIdSet: Set<string>
): Map<string, RawSeasonStatsRow[]> {
  const map = new Map<string, RawSeasonStatsRow[]>();
  for (const row of (data as RawSeasonStatsRow[]) ?? []) {
    if (!row.team_id || !teamIdSet.has(row.team_id)) continue;
    let list = map.get(row.team_id);
    if (!list) {
      list = [];
      map.set(row.team_id, list);
    }
    list.push(row);
  }
  return map;
}

/**
 * Returns bracket lookup maps (division weights, display names, season map).
 * Uses a module-level cache keyed by TTL to avoid redundant DB queries.
 */
async function loadBracketLookups(allPlayoffMatches: PlayoffMatchData[]): Promise<{
  bracketDivisionWeights: Record<string, number>;
  bracketDivisionDisplayNames: Record<string, string>;
  bracketSeasonMap: Record<string, string>;
}> {
  const now = Date.now();
  if (bracketCache && now - bracketCache.timestamp < BRACKET_CACHE_TTL) {
    const { bracketDivisionWeights, bracketDivisionDisplayNames, bracketSeasonMap } = bracketCache;
    return { bracketDivisionWeights, bracketDivisionDisplayNames, bracketSeasonMap };
  }

  const bracketDivisionWeights: Record<string, number> = {};
  const bracketDivisionDisplayNames: Record<string, string> = {};
  const bracketSeasonMap: Record<string, string> = {};

  const allBracketIds = [
    ...new Set(allPlayoffMatches.map((m) => m.bracket_id).filter(Boolean)),
  ] as string[];

  if (allBracketIds.length > 0) {
    const { data: bracketData } = await supabase
      .from('brackets')
      .select('id, season_id, divisions(division_weight, display_division)')
      .in('id', allBracketIds);

    for (const bracket of bracketData ?? []) {
      const divisions = bracket.divisions as {
        division_weight: number;
        display_division: string | null;
      } | null;
      bracketDivisionWeights[bracket.id] = divisions?.division_weight ?? 0.85;
      bracketDivisionDisplayNames[bracket.id] = divisions?.display_division ?? '';
      if (bracket.season_id) bracketSeasonMap[bracket.id] = bracket.season_id;
    }
  }

  bracketCache = { bracketDivisionWeights, bracketDivisionDisplayNames, bracketSeasonMap, timestamp: now };
  return { bracketDivisionWeights, bracketDivisionDisplayNames, bracketSeasonMap };
}

/**
 * Fetches career data for ALL teams in a small fixed number of queries (~9 total),
 * instead of ~10 queries per team. Returns a Map from teamId → BulkTeamCareerData.
 */
export const fetchAllTeamsCareerData = async (
  teamIds: string[]
): Promise<Map<string, BulkTeamCareerData>> => {
  if (teamIds.length === 0) {
    return new Map();
  }

  const teamIdSet = new Set(teamIds);

  // 1. Fetch all data in parallel (~7-9 queries total regardless of team count)
  const [
    allTeamDivisionsResult,
    allSeasonStatsResult,
    allMatchesResult,
    allArchivedMatchesResult,
    allTeamDetailsArchiveResult,
    allPlayoffMatchesResult,
    activeSeasonResult,
  ] = await Promise.all([
    // All teams with division weights
    supabase.from('teams').select('id, divisions(division_weight)').in('id', teamIds),
    // All team_season_stats (includes power_score for power score calculation)
    supabase
      .from('team_season_stats')
      .select(
        `
        team_id,
        match_wins,
        match_losses,
        game_wins,
        game_losses,
        champion,
        runner_up,
        playoff_rank,
        sos,
        division_name,
        season_id,
        power_score,
        seasons!inner(name)
      `
      )
      .in('team_id', teamIds),
    // All completed matches with team division info
    supabase
      .from('matches')
      .select(
        `
        winner_id,
        loser_id,
        team1_game_wins,
        team2_game_wins,
        team1_id,
        team2_id,
        season_id,
        team1:teams!matches_team1_id_fkey(id, divisions(name)),
        team2:teams!matches_team2_id_fkey(id, divisions(name))
      `
      )
      .eq('iscompleted', true),
    // All completed archived matches
    supabase
      .from('matches_archive')
      .select(
        `
        winner_id,
        loser_id,
        team1_game_wins,
        team2_game_wins,
        team1_id,
        team2_id,
        season_id
      `
      )
      .eq('iscompleted', true),
    // All team details archive — unfiltered so opponent division history is available for division records
    supabase
      .from('team_details_archive')
      .select('team_id, season_id, divisionname'),
    // All completed playoff matches
    supabase
      .from('playoff_matches')
      .select(
        `
        winner_id,
        loser_id,
        team1_score,
        team2_score,
        team1_id,
        team2_id,
        bracket_id
      `
      )
      .not('winner_id', 'is', null),
    // Active season (just one row)
    supabase.from('seasons').select('id').eq('is_active', true).single(),
  ]);

  // Handle critical error
  if (allSeasonStatsResult.error) {
    handleDatabaseError(allSeasonStatsResult.error, 'Failed to fetch bulk team season stats');
  }

  // Log non-critical errors
  if (allMatchesResult.error) warnLog('Error fetching bulk matches:', allMatchesResult.error);
  if (allArchivedMatchesResult.error) warnLog('Error fetching bulk archived matches:', allArchivedMatchesResult.error);
  if (allPlayoffMatchesResult.error) warnLog('Error fetching bulk playoff matches:', allPlayoffMatchesResult.error);

  // 2. Build shared lookup maps (computed once, shared across all teams)
  const { teamDivisionWeights, teamDivisionMap } = buildTeamDivisionMaps(
    allTeamDivisionsResult.data as { id: string; divisions: unknown }[] | null,
    allTeamDetailsArchiveResult.data as TeamDetailsArchive[] | null
  );

  const currentSeasonId = (activeSeasonResult.data as { id: string } | null)?.id || null;

  // 3. Group per-team data from bulk results
  const seasonStatsByTeam = groupSeasonStats(allSeasonStatsResult.data, teamIdSet);

  const currentMatchesByTeam = groupMatchesByTeam(
    (allMatchesResult.data as unknown as MatchData[]) || [],
    teamIdSet
  );
  const archivedMatchesByTeam = groupMatchesByTeam(
    (allArchivedMatchesResult.data as ArchivedMatchData[]) || [],
    teamIdSet
  );
  const playoffMatchesByTeam = groupMatchesByTeam(
    (allPlayoffMatchesResult.data as PlayoffMatchData[]) || [],
    teamIdSet
  );

  // 4. Load bracket lookup maps (cache-backed)
  const allPlayoffMatches = (allPlayoffMatchesResult.data as PlayoffMatchData[]) || [];
  const { bracketDivisionWeights, bracketDivisionDisplayNames, bracketSeasonMap } =
    await loadBracketLookups(allPlayoffMatches);

  // 5. Assemble per-team CareerData
  const result = new Map<string, BulkTeamCareerData>();

  for (const teamId of teamIds) {
    const rawStats = seasonStatsByTeam.get(teamId) || [];
    // Strip team_id and power_score for the SeasonStats interface consumed by calculation functions
    const seasonStats: SeasonStats[] = rawStats.map(({ team_id: _tid, ...rest }) => rest);
    // Extract power score data for calculateCareerPowerScore
    const seasonPowerScores = rawStats
      .filter((s) => s.power_score !== null)
      .map((s) => ({
        power_score: s.power_score,
        match_wins: s.match_wins,
        match_losses: s.match_losses,
        season_id: s.season_id,
      }));

    result.set(teamId, {
      teamData: { divisions: { division_weight: teamDivisionWeights.get(teamId) || 0.85 } },
      seasonStats,
      currentMatches: currentMatchesByTeam.get(teamId) || null,
      archivedMatches: archivedMatchesByTeam.get(teamId) || null,
      playoffMatches: playoffMatchesByTeam.get(teamId) || null,
      teamDivisionMap,
      bracketDivisionWeights,
      bracketDivisionDisplayNames,
      bracketSeasonMap,
      teamDivisionWeight: teamDivisionWeights.get(teamId) || 0.85,
      currentSeasonId,
      seasonPowerScores,
    });
  }

  return result;
};
