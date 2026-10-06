import { supabase } from '@/integrations/supabase/client';
import { ArchivedMatchData, MatchData, PlayoffMatchData, SeasonStats } from '@/utils/career/types';
import { handleDatabaseError } from '@/utils/errorHandler';
import { warnLog } from '@/utils/logger';
import { assertValidUuid } from '@/utils/validation';

import { CareerData, TeamData, TeamDetailsArchive } from './CareerTypes';

/** Fallback weight for a division with no stored weight. */
const DEFAULT_DIVISION_WEIGHT = 0.85;

/** Runs the seven independent career queries in parallel. */
const runCareerQueries = (teamId: string) =>
  Promise.all([
    // Get team's current division weight
    supabase.from('teams').select('divisions(division_weight)').eq('id', teamId).single(),
    // Get career stats from team_season_stats with division info and season_id
    supabase
      .from('team_season_stats')
      .select(
        `
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
        seasons!inner(name)
      `
      )
      .eq('team_id', teamId),
    // Get current season matches with opponent team info
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
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('iscompleted', true),
    // Get archived matches for sweep rate and division records
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
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('iscompleted', true),
    // Fetch historical team divisions from team_details_archive (authoritative source for past seasons)
    supabase.from('team_details_archive').select('team_id, season_id, divisionname'),
    // Get playoff matches with bracket information
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
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .not('winner_id', 'is', null),
    // Get the current active season (authoritative source)
    supabase.from('seasons').select('id').eq('is_active', true).single(),
  ]);

type CareerQueryResults = Awaited<ReturnType<typeof runCareerQueries>>;

/**
 * Season stats are critical and the active season must not fail silently, so
 * those throw. Match queries are non-critical and only log.
 */
const reportCareerQueryErrors = ([
  ,
  seasonStatsResult,
  currentMatchesResult,
  archivedMatchesResult,
  ,
  playoffMatchesResult,
  activeSeasonResult,
]: CareerQueryResults): void => {
  // Handle critical error
  if (seasonStatsResult.error) {
    handleDatabaseError(seasonStatsResult.error, 'Failed to fetch team season stats');
  }

  // Log non-critical errors
  if (currentMatchesResult.error) {
    warnLog('Error fetching current matches:', currentMatchesResult.error);
  }
  if (archivedMatchesResult.error) {
    warnLog('Error fetching archived matches:', archivedMatchesResult.error);
  }
  if (playoffMatchesResult.error) {
    warnLog('Error fetching playoff matches:', playoffMatchesResult.error);
  }

  // Active season lookup: PGRST116 (no rows) is a valid empty state; any other
  // error must surface so callers don't silently render stale/empty data.
  if (activeSeasonResult.error && activeSeasonResult.error.code !== 'PGRST116') {
    handleDatabaseError(activeSeasonResult.error, 'Failed to fetch active season');
  }
};

/** Unique, non-empty bracket ids of the playoff matches, in first-seen order. */
const uniqueBracketIds = (playoffMatches: PlayoffMatchData[] | null): string[] => {
  if (!playoffMatches || playoffMatches.length === 0) return [];
  return [...new Set(playoffMatches.map((match) => match.bracket_id).filter(Boolean))] as string[];
};

/** Division weight and display name per bracket, for playoff tier classification. */
const fetchBracketDivisionInfo = async (
  bracketIds: string[]
): Promise<{ weights: Record<string, number>; displayNames: Record<string, string> }> => {
  const weights: Record<string, number> = {};
  const displayNames: Record<string, string> = {};
  if (bracketIds.length === 0) return { weights, displayNames };

  const { data: bracketData } = await supabase
    .from('brackets')
    .select(
      `
          id,
          divisions(division_weight, display_division)
        `
    )
    .in('id', bracketIds);

  for (const bracket of bracketData ?? []) {
    const divisions = bracket.divisions as {
      division_weight: number;
      display_division: string | null;
    } | null;
    weights[bracket.id] = divisions?.division_weight || DEFAULT_DIVISION_WEIGHT;
    displayNames[bracket.id] = divisions?.display_division ?? '';
  }
  return { weights, displayNames };
};

/** Bracket -> season_id map. Brackets with no season are left out. */
const fetchBracketSeasonMap = async (bracketIds: string[]): Promise<Record<string, string>> => {
  const bracketSeasonMap: Record<string, string> = {};
  if (bracketIds.length === 0) return bracketSeasonMap;

  const { data: bracketSeasonData } = await supabase
    .from('brackets')
    .select('id, season_id')
    .in('id', bracketIds);

  for (const bracket of bracketSeasonData ?? []) {
    if (bracket.season_id) {
      bracketSeasonMap[bracket.id] = bracket.season_id;
    }
  }
  return bracketSeasonMap;
};

/** Lookup map: "teamId_seasonId" -> divisionname (from team_details_archive). */
const buildTeamDivisionMap = (archives: TeamDetailsArchive[] | null): Map<string, string> => {
  const teamDivisionMap = new Map<string, string>();
  for (const archive of archives ?? []) {
    if (archive.team_id && archive.season_id && archive.divisionname) {
      teamDivisionMap.set(`${archive.team_id}_${archive.season_id}`, archive.divisionname);
    }
  }
  return teamDivisionMap;
};

/**
 * Fetches all career-related data for a team in parallel.
 * Returns raw data that can be processed by calculation utilities.
 */
export const fetchCareerData = async (teamId: string): Promise<CareerData | null> => {
  assertValidUuid(teamId, 'teamId');

  // Fetch all independent queries in parallel
  const results = await runCareerQueries(teamId);
  reportCareerQueryErrors(results);

  const [
    teamDataResult,
    seasonStatsResult,
    currentMatchesResult,
    archivedMatchesResult,
    allTeamSeasonStatsResult,
    playoffMatchesResult,
    activeSeasonResult,
  ] = results;

  const teamData = teamDataResult.data as TeamData | null;
  const seasonStats = seasonStatsResult.data as SeasonStats[] | null;
  const currentMatches = currentMatchesResult.data as unknown as MatchData[] | null;
  const archivedMatches = archivedMatchesResult.data as ArchivedMatchData[] | null;
  const allTeamDetailsArchive = allTeamSeasonStatsResult.data as TeamDetailsArchive[] | null;
  const playoffMatches = playoffMatchesResult.data as PlayoffMatchData[] | null;
  const activeSeason = activeSeasonResult.data as { id: string } | null;

  const teamDivisionWeight = teamData?.divisions?.division_weight || DEFAULT_DIVISION_WEIGHT;

  // The two bracket lookups do not depend on each other, so they run together.
  const bracketIds = uniqueBracketIds(playoffMatches);
  const [
    { weights: bracketDivisionWeights, displayNames: bracketDivisionDisplayNames },
    bracketSeasonMap,
  ] = await Promise.all([fetchBracketDivisionInfo(bracketIds), fetchBracketSeasonMap(bracketIds)]);

  return {
    teamData,
    seasonStats,
    currentMatches,
    archivedMatches,
    playoffMatches,
    teamDivisionMap: buildTeamDivisionMap(allTeamDetailsArchive),
    bracketDivisionWeights,
    bracketDivisionDisplayNames,
    bracketSeasonMap,
    teamDivisionWeight,
    // Use the authoritative active season from seasons table
    currentSeasonId: activeSeason?.id || null,
  };
};
