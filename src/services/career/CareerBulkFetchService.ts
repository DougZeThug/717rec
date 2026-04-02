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
    supabase.from('team_season_stats').select(
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
    ).in('team_id', teamIds),
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
    // All team details archive (already unfiltered in single-team version)
    supabase.from('team_details_archive').select('team_id, season_id, divisionname').in('team_id', teamIds),
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
  if (allMatchesResult.error) {
    warnLog('Error fetching bulk matches:', allMatchesResult.error);
  }
  if (allArchivedMatchesResult.error) {
    warnLog('Error fetching bulk archived matches:', allArchivedMatchesResult.error);
  }
  if (allPlayoffMatchesResult.error) {
    warnLog('Error fetching bulk playoff matches:', allPlayoffMatchesResult.error);
  }

  // 2. Build shared lookup maps (computed once, shared across all teams)

  // Team division weights: teamId → weight
  const teamDivisionWeights = new Map<string, number>();
  if (allTeamDivisionsResult.data) {
    for (const row of allTeamDivisionsResult.data) {
      const divisions = row.divisions as { division_weight: number } | null;
      teamDivisionWeights.set(row.id, divisions?.division_weight || 0.85);
    }
  }

  // Team division map: "teamId_seasonId" → divisionname
  const teamDivisionMap = new Map<string, string>();
  const allTeamDetailsArchive = allTeamDetailsArchiveResult.data as TeamDetailsArchive[] | null;
  if (allTeamDetailsArchive) {
    for (const archive of allTeamDetailsArchive) {
      if (archive.team_id && archive.season_id && archive.divisionname) {
        teamDivisionMap.set(`${archive.team_id}_${archive.season_id}`, archive.divisionname);
      }
    }
  }

  const currentSeasonId = (activeSeasonResult.data as { id: string } | null)?.id || null;

  // 3. Group per-team data from bulk results

  // Season stats grouped by team_id
  const seasonStatsByTeam = new Map<string, RawSeasonStatsRow[]>();
  if (allSeasonStatsResult.data) {
    for (const row of allSeasonStatsResult.data as unknown as RawSeasonStatsRow[]) {
      if (!row.team_id || !teamIdSet.has(row.team_id)) continue;
      let list = seasonStatsByTeam.get(row.team_id);
      if (!list) {
        list = [];
        seasonStatsByTeam.set(row.team_id, list);
      }
      list.push(row);
    }
  }

  // Matches grouped by team
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

  // 4. Build bracket lookup maps from ALL playoff matches (use cache if fresh)
  const allPlayoffMatches = (allPlayoffMatchesResult.data as PlayoffMatchData[]) || [];
  let bracketDivisionWeights: Record<string, number>;
  let bracketSeasonMap: Record<string, string>;

  const now = Date.now();
  if (bracketCache && now - bracketCache.timestamp < BRACKET_CACHE_TTL) {
    bracketDivisionWeights = bracketCache.bracketDivisionWeights;
    bracketSeasonMap = bracketCache.bracketSeasonMap;
  } else {
    bracketDivisionWeights = {};
    bracketSeasonMap = {};

    const allBracketIds = [
      ...new Set(allPlayoffMatches.map((m) => m.bracket_id).filter(Boolean)),
    ] as string[];

    if (allBracketIds.length > 0) {
      const { data: bracketData } = await supabase
        .from('brackets')
        .select('id, season_id, divisions(division_weight)')
        .in('id', allBracketIds);

      if (bracketData) {
        for (const bracket of bracketData) {
          const divisions = bracket.divisions as { division_weight: number } | null;
          bracketDivisionWeights[bracket.id] = divisions?.division_weight ?? 0.85;
          if (bracket.season_id) {
            bracketSeasonMap[bracket.id] = bracket.season_id;
          }
        }
      }
    }

    bracketCache = { bracketDivisionWeights, bracketSeasonMap, timestamp: now };
  }

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
      bracketSeasonMap,
      teamDivisionWeight: teamDivisionWeights.get(teamId) || 0.85,
      currentSeasonId,
      seasonPowerScores,
    });
  }

  return result;
};
