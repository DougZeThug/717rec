import { supabase } from '@/integrations/supabase/client';
import { SeasonPowerScoreData } from '@/types/teamCareerPowerScore';
import { handleDatabaseError } from '@/utils/errorHandler';

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
  const { data: allStats, error: statsError } = await supabase.from('team_season_stats').select(`
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

  if (seasonsError)
    handleDatabaseError(seasonsError, 'Failed to fetch seasons for career power score');

  // Create a map of season data
  const seasonMap = new Map(seasons?.map((s) => [s.id, s]) || []);

  // Map and sort by season start date
  const mapped: SeasonPowerScoreData[] = (seasonStats ?? [])
    .map((stat) => {
      const season = seasonMap.get(stat.season_id);
      if (!season) return null;

      return {
        seasonName: season.name,
        powerScore: stat.power_score !== null ? stat.power_score * 100 : null,
        playoffRank: stat.playoff_rank,
        divisionName: stat.division_name,
        isChampion: stat.champion || false,
        isRunnerUp: stat.runner_up || false,
        isTop3:
          stat.champion || stat.runner_up || (stat.playoff_rank !== null && stat.playoff_rank <= 3),
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
