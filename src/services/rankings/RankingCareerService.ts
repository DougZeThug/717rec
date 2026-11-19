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
