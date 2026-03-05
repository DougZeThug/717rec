import { supabase } from '@/integrations/supabase/client';
import { Ranking } from '@/types';
import { SeasonPowerScoreData } from '@/types/teamCareerPowerScore';
import { PowerScoreTrend, TrendDirection } from '@/types/powerScoreTrends';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';
import { warnLog } from '@/utils/logger';

/**
 * Service for managing ranking snapshots in the database
 * Replaces localStorage-based ranking persistence
 */

/**
 * Get the current active season ID
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
async function getCurrentSeasonId(): Promise<string> {
  const { data, error } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch current season');
  }

  return ensureFound(data?.id, 'Active season');
}

/**
 * Save current rankings to the database
 * Creates or updates ranking snapshots for each team in a specific season
 * @param rankings - The rankings to save
 * @param seasonId - Optional season ID. If not provided, uses the current active season.
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
export async function saveRankingsToDatabase(rankings: Ranking[], seasonId?: string): Promise<boolean> {
  if (rankings.length === 0) {
    return true;
  }

  try {
    // Use provided seasonId, or fall back to the current active season
    const resolvedSeasonId = seasonId ?? await getCurrentSeasonId();

    // Prepare ranking snapshots for upsert
    const snapshots = rankings.map((ranking, index) => ({
      team_id: ranking.teamId,
      season_id: resolvedSeasonId,
      rank_position: index + 1,
    }));

    // Upsert all rankings in one batch
    const { error } = await supabase.from('ranking_snapshots').upsert(snapshots, {
      onConflict: 'team_id,season_id',
      ignoreDuplicates: false,
    });

    if (error) {
      handleDatabaseError(error, 'Failed to save rankings to database');
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Load previous rankings from the database for a specific season
 * Returns a map of team_id to rank_position
 * Returns empty object if no rankings exist (not an error condition)
 * @param seasonId - Optional season ID. If not provided, uses the current active season.
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
export async function loadRankingsFromDatabase(seasonId?: string): Promise<Record<string, number>> {
  // Use provided seasonId, or fall back to the current active season
  const resolvedSeasonId = seasonId ?? await getCurrentSeasonId();

  // Fetch all ranking snapshots for this season
  const { data, error } = await supabase
    .from('ranking_snapshots')
    .select('team_id, rank_position')
    .eq('season_id', resolvedSeasonId);

  if (error) {
    handleDatabaseError(error, 'Failed to load rankings from database');
  }

  // Convert to map format
  const rankingsMap: Record<string, number> = {};
  data?.forEach((snapshot) => {
    rankingsMap[snapshot.team_id] = snapshot.rank_position;
  });

  return rankingsMap;
}

/**
 * Migrate existing localStorage rankings to database
 * This is a one-time migration helper
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
export async function migrateLocalStorageToDatabase(): Promise<void> {
  const savedRankings = localStorage.getItem('previousRankings');
  if (!savedRankings) {
    // Nothing to migrate
    return;
  }

  const rankingsMap: Record<string, number> = JSON.parse(savedRankings);
  const seasonId = await getCurrentSeasonId();

  // Convert map to array of snapshots
  const snapshots = Object.entries(rankingsMap).map(([teamId, rankPosition]) => ({
    team_id: teamId,
    season_id: seasonId,
    rank_position: rankPosition,
  }));

  // Upsert all rankings
  const { error } = await supabase.from('ranking_snapshots').upsert(snapshots, {
    onConflict: 'team_id,season_id',
    ignoreDuplicates: false,
  });

  if (error) {
    handleDatabaseError(error, 'Failed to migrate rankings to database');
  }

  // Clear localStorage after successful migration
  localStorage.removeItem('previousRankings');
  localStorage.removeItem('rankingsLastUpdated');
}

/**
 * Fetch power score trends (movers) comparing current season vs previous season.
 * Swallows errors and returns empty array on failure to preserve original hook behavior.
 */
export async function fetchPowerScoreTrends(
  direction: TrendDirection = 'up',
  limit: number = 10
): Promise<PowerScoreTrend[]> {
  // Get current active season
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  if (!activeSeason) {
    return [];
  }

  // Get all seasons ordered by date to find previous season
  const { data: allSeasons } = await supabase
    .from('seasons')
    .select('id, start_date')
    .order('start_date', { ascending: false })
    .limit(2);

  const previousSeasonId = allSeasons && allSeasons.length > 1 ? allSeasons[1].id : null;

  if (!previousSeasonId) {
    return [];
  }

  // Get current season power scores from v_team_details, excluding hidden divisions
  const { data: currentData, error: currentError } = await supabase
    .from('v_team_details')
    .select('team_id, name, divisionname, division_id, logo_url, image_url, power_score')
    .not('power_score', 'is', null);

  if (currentError || !currentData) {
    warnLog('Error fetching current season data:', currentError);
    return [];
  }

  // Get previous season power scores from team_season_stats
  const { data: previousData, error: previousError } = await supabase
    .from('team_season_stats')
    .select('team_id, power_score')
    .eq('season_id', previousSeasonId)
    .not('power_score', 'is', null);

  if (previousError || !previousData) {
    warnLog('Error fetching previous season data:', previousError);
    return [];
  }

  // Create a map of previous scores for quick lookup
  const previousScoresMap = new Map(
    previousData.map((team) => [team.team_id, team.power_score])
  );

  // Get visible divisions (exclude hidden ones)
  const { data: visibleDivisions } = await supabase
    .from('divisions')
    .select('id')
    .neq('display_division', 'Hidden');

  const visibleDivisionIds = new Set(visibleDivisions?.map((d) => d.id) || []);

  // Calculate trends for teams that have both current and previous data and are in visible divisions
  const trends: PowerScoreTrend[] = currentData
    .filter(
      (team) => previousScoresMap.has(team.team_id) && visibleDivisionIds.has(team.division_id)
    )
    .map((team) => {
      const previousScore = previousScoresMap.get(team.team_id) || 0;
      const currentScore = team.power_score || 0;
      const delta = currentScore - previousScore;
      const percentChange = previousScore > 0 ? (delta / previousScore) * 100 : 0;

      return {
        teamId: team.team_id,
        teamName: team.name,
        division: team.divisionname || 'Unknown',
        logoUrl: team.image_url || team.logo_url,
        currentScore,
        previousScore,
        delta,
        percentChange,
      };
    });

  // Sort based on direction
  const sortedTrends = trends.sort((a, b) => {
    if (direction === 'up') {
      return b.delta - a.delta; // Largest positive delta first
    } else {
      return a.delta - b.delta; // Largest negative delta first
    }
  });

  // Return top N teams
  return sortedTrends.slice(0, limit);
}

/**
 * Fetch weekly power score trends using power_score_snapshots table.
 * Swallows errors and returns empty state on failure to preserve original hook behavior.
 */
export async function fetchWeeklyPowerScoreTrends(
  direction: TrendDirection = 'up',
  limit: number = 10
): Promise<{ trends: WeeklyPowerScoreTrend[]; hasData: boolean; latestWeek: number | null }> {
  // 1. Get active season first (required for other queries)
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  if (!activeSeason) {
    return { trends: [], hasData: false, latestWeek: null };
  }

  // 2. Run week numbers and visible divisions queries IN PARALLEL
  const [weekNumbersResult, visibleDivisionsResult] = await Promise.all([
    supabase
      .from('power_score_snapshots')
      .select('week_number')
      .eq('season_id', activeSeason.id)
      .order('week_number', { ascending: false }),
    supabase
      .from('divisions')
      .select('id')
      .neq('display_division', 'Hidden'),
  ]);

  const weekNumbers = weekNumbersResult.data;
  const visibleDivisions = visibleDivisionsResult.data;
  const visibleDivisionIds = new Set(visibleDivisions?.map((d) => d.id) || []);

  if (!weekNumbers || weekNumbers.length === 0) {
    return { trends: [], hasData: false, latestWeek: null };
  }

  // Get unique week numbers
  const uniqueWeeks = [...new Set(weekNumbers.map((w) => w.week_number))].slice(0, 2);

  if (uniqueWeeks.length < 2) {
    // Only one week of data, can't calculate trends yet
    return { trends: [], hasData: true, latestWeek: uniqueWeeks[0] };
  }

  const [currentWeek, previousWeek] = uniqueWeeks;

  // 3. Get snapshots for both weeks IN PARALLEL
  const [currentSnapshotsResult, previousSnapshotsResult] = await Promise.all([
    supabase
      .from('power_score_snapshots')
      .select('team_id, power_score')
      .eq('season_id', activeSeason.id)
      .eq('week_number', currentWeek)
      .not('power_score', 'is', null),
    supabase
      .from('power_score_snapshots')
      .select('team_id, power_score')
      .eq('season_id', activeSeason.id)
      .eq('week_number', previousWeek)
      .not('power_score', 'is', null),
  ]);

  const currentSnapshots = currentSnapshotsResult.data;
  const previousSnapshots = previousSnapshotsResult.data;

  if (!currentSnapshots || !previousSnapshots) {
    return { trends: [], hasData: true, latestWeek: currentWeek };
  }

  // 4. Create map of previous scores
  const previousScoresMap = new Map(previousSnapshots.map((s) => [s.team_id, s.power_score]));

  // 5. Get team details for names, divisions, logos
  const teamIds = currentSnapshots.map((s) => s.team_id);

  const { data: teamDetails } = await supabase
    .from('v_team_details')
    .select('team_id, name, divisionname, division_id, logo_url, image_url')
    .in('team_id', teamIds);

  const teamDetailsMap = new Map(teamDetails?.map((t) => [t.team_id, t]) || []);

  // 6. Calculate trends
  const trends: WeeklyPowerScoreTrend[] = currentSnapshots
    .filter((snapshot) => {
      const teamDetail = teamDetailsMap.get(snapshot.team_id);
      return (
        previousScoresMap.has(snapshot.team_id) &&
        teamDetail &&
        visibleDivisionIds.has(teamDetail.division_id)
      );
    })
    .map((snapshot) => {
      const previousScore = previousScoresMap.get(snapshot.team_id) || 0;
      const currentScore = snapshot.power_score || 0;
      const delta = currentScore - previousScore;
      const percentChange = previousScore > 0 ? (delta / previousScore) * 100 : 0;
      const teamDetail = teamDetailsMap.get(snapshot.team_id);

      return {
        teamId: snapshot.team_id,
        teamName: teamDetail?.name || 'Unknown',
        division: teamDetail?.divisionname || 'Unknown',
        logoUrl: teamDetail?.image_url || teamDetail?.logo_url,
        currentScore,
        previousScore,
        delta,
        percentChange,
        currentWeek,
        previousWeek,
      };
    });

  // 7. Sort based on direction
  const sortedTrends = trends.sort((a, b) => {
    if (direction === 'up') {
      return b.delta - a.delta;
    } else {
      return a.delta - b.delta;
    }
  });

  return {
    trends: sortedTrends.slice(0, limit),
    hasData: true,
    latestWeek: currentWeek,
  };
}

/**
 * Fetch career power score data for all teams across all seasons.
 * @throws {DatabaseError} When database operations fail
 */
export async function fetchAllTeamsCareerPowerScores() {
  // Fetch all seasons ordered by start_date
  const { data: seasons, error: seasonsError } = await supabase
    .from('seasons')
    .select('id, name, start_date')
    .order('start_date', { ascending: true });

  if (seasonsError) handleDatabaseError(seasonsError, 'Failed to fetch seasons');

  // Fetch all team_season_stats with team info
  const { data: allStats, error: statsError } = await supabase.from('team_season_stats')
    .select(`
      team_id,
      season_id,
      power_score,
      division_name
    `);

  if (statsError) handleDatabaseError(statsError, 'Failed to fetch team season stats');

  // Fetch team names (excluding hidden divisions)
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, division_id, divisions!inner(display_division)')
    .neq('divisions.display_division', 'Hidden');

  if (teamsError) handleDatabaseError(teamsError, 'Failed to fetch teams');

  // Create season order map
  const seasonOrderMap = new Map(
    seasons?.map((s, idx) => [s.id, { name: s.name, order: idx }]) || []
  );

  // Group stats by team
  const teamStatsMap = new Map<
    string,
    {
      teamId: string;
      teamName: string;
      divisionName: string | null;
      seasonData: Array<{ seasonName: string; powerScore: number | null; seasonOrder: number }>;
    }
  >();

  teams?.forEach((team) => {
    teamStatsMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      divisionName: null,
      seasonData: [],
    });
  });

  // Populate season data for each team
  allStats?.forEach((stat) => {
    const teamData = teamStatsMap.get(stat.team_id);
    if (!teamData) return;

    const seasonInfo = seasonOrderMap.get(stat.season_id);
    if (!seasonInfo) return;

    teamData.seasonData.push({
      seasonName: seasonInfo.name,
      powerScore: stat.power_score,
      seasonOrder: seasonInfo.order,
    });

    if (!teamData.divisionName && stat.division_name) {
      teamData.divisionName = stat.division_name;
    }
  });

  // Filter out teams with no data and sort season data
  return Array.from(teamStatsMap.values())
    .filter((team) => team.seasonData.length > 0)
    .map((team) => ({
      ...team,
      seasonData: team.seasonData.sort((a, b) => a.seasonOrder - b.seasonOrder),
    }));
}

/**
 * Fetch historical power scores for a specific team or all teams.
 * @throws {DatabaseError} When database operations fail
 */
export async function fetchHistoricalPowerScores(teamId?: string) {
  // Fetch current team data to get latest scores
  const { data: teams, error: teamsError } = await supabase
    .from('v_team_details')
    .select('team_id, name, power_score')
    .order('name');

  if (teamsError) handleDatabaseError(teamsError, 'Failed to fetch team details');

  // Fetch historical snapshots from power_score_snapshots table
  let snapshotsQuery = supabase
    .from('power_score_snapshots')
    .select('team_id, power_score, snapshot_date, week_number, season_id')
    .order('snapshot_date', { ascending: true });

  // Filter by team if specified
  if (teamId) {
    snapshotsQuery = snapshotsQuery.eq('team_id', teamId);
  }

  const { data: snapshots, error: snapshotsError } = await snapshotsQuery;

  if (snapshotsError) handleDatabaseError(snapshotsError, 'Failed to fetch power score snapshots');

  // Group snapshots by team
  const snapshotsByTeam: Record<string, Array<{ date: string; score: number }>> = {};
  snapshots?.forEach((snapshot) => {
    if (!snapshotsByTeam[snapshot.team_id]) {
      snapshotsByTeam[snapshot.team_id] = [];
    }
    snapshotsByTeam[snapshot.team_id].push({
      date: snapshot.snapshot_date,
      score: snapshot.power_score || 0,
    });
  });

  // Calculate last week's scores for trending
  const lastWeekScores: Record<string, number> = {};

  const processedData = (teams ?? []).map((team) => {
    const currentScore = team.power_score || 50;
    const historicalScores = snapshotsByTeam[team.team_id] || [];

    // Add current score as the most recent data point
    const allScores = [
      ...historicalScores,
      { date: new Date().toISOString(), score: currentScore },
    ];

    // Get last week's score (second-to-last entry if available)
    if (allScores.length >= 2) {
      lastWeekScores[team.team_id] = allScores[allScores.length - 2].score;
    } else {
      lastWeekScores[team.team_id] = currentScore;
    }

    return {
      team_id: team.team_id,
      power_scores: allScores,
    };
  });

  // If a specific team ID is provided, filter the data
  const filteredData = teamId
    ? processedData.filter((item) => item.team_id === teamId)
    : processedData;

  return { historicalScores: filteredData, previousScores: lastWeekScores };
}

/**
 * Fetch power scores and names for all teams from v_team_details.
 * @throws {DatabaseError} When database operations fail
 */
export async function fetchTeamPowerScores(): Promise<{
  powerScores: Record<string, number>;
  teamNames: Record<string, string>;
}> {
  const { data, error } = await supabase
    .from('v_team_details')
    .select('team_id, name, power_score');

  if (error) handleDatabaseError(error, 'Failed to fetch team power scores');

  // Create mappings for power scores and team names
  const scoreMap: Record<string, number> = {};
  const nameMap: Record<string, string> = {};

  data?.forEach((team) => {
    scoreMap[team.team_id] = team.power_score;
    nameMap[team.team_id] = team.name;
  });

  return { powerScores: scoreMap, teamNames: nameMap };
}

/**
 * Fetch career power score data for a specific team across all seasons.
 * @throws {DatabaseError} When database operations fail
 */
export async function fetchTeamCareerPowerScore(teamId: string): Promise<SeasonPowerScoreData[]> {
  const { data: seasonStats, error } = await supabase
    .from('team_season_stats')
    .select(
      `
      power_score,
      playoff_rank,
      division_name,
      champion,
      runner_up,
      season_id
    `
    )
    .eq('team_id', teamId);

  if (error) handleDatabaseError(error, 'Failed to fetch team career power score');

  // Fetch season details separately and sort by start_date
  const seasonIds = seasonStats?.map((s) => s.season_id) || [];
  if (seasonIds.length === 0) return [];

  const { data: seasons, error: seasonsError } = await supabase
    .from('seasons')
    .select('id, name, start_date')
    .in('id', seasonIds)
    .order('start_date', { ascending: true });

  if (seasonsError) handleDatabaseError(seasonsError, 'Failed to fetch seasons for career power score');

  // Create a map of season data
  const seasonMap = new Map(seasons?.map((s) => [s.id, s]) || []);

  // Map and sort by season start date
  const mapped: SeasonPowerScoreData[] = (seasonStats ?? [])
    .map((stat) => {
      const season = seasonMap.get(stat.season_id);
      if (!season) return null;

      return {
        seasonName: season.name,
        powerScore: stat.power_score ? stat.power_score * 100 : null,
        playoffRank: stat.playoff_rank,
        divisionName: stat.division_name,
        isChampion: stat.champion || false,
        isRunnerUp: stat.runner_up || false,
        isTop3:
          stat.champion ||
          stat.runner_up ||
          (stat.playoff_rank !== null && stat.playoff_rank <= 3),
      };
    })
    .filter((item): item is SeasonPowerScoreData => item !== null)
    .sort((a, b) => {
      const seasonA = seasons?.find((s) => s.name === a.seasonName);
      const seasonB = seasons?.find((s) => s.name === b.seasonName);
      if (!seasonA || !seasonB) return 0;
      return new Date(seasonA.start_date).getTime() - new Date(seasonB.start_date).getTime();
    });

  return mapped;
}
