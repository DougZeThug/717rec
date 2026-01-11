import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';

export interface TeamCareerData {
  teamId: string;
  teamName: string;
  divisionName: string | null;
  seasonData: Array<{
    seasonName: string;
    powerScore: number | null;
    seasonOrder: number;
  }>;
}

export const useAllTeamsCareerPowerScores = () => {
  return useQuery({
    queryKey: ['all-teams-career-power-scores'],
    queryFn: async () => {
      // Fetch all seasons ordered by start_date
      const { data: seasons, error: seasonsError } = await supabase
        .from('seasons')
        .select('id, name, start_date')
        .order('start_date', { ascending: true });

      if (seasonsError) throw seasonsError;

      // Fetch all team_season_stats with team info
      const { data: allStats, error: statsError } = await supabase.from('team_season_stats')
        .select(`
          team_id,
          season_id,
          power_score,
          division_name
        `);

      if (statsError) throw statsError;

      // Fetch team names (excluding hidden divisions)
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, division_id, divisions!inner(display_division)')
        .neq('divisions.display_division', 'Hidden');

      if (teamsError) throw teamsError;

      // Create season order map
      const seasonOrderMap = new Map(
        seasons?.map((s, idx) => [s.id, { name: s.name, order: idx }]) || []
      );

      // Group stats by team
      const teamStatsMap = new Map<string, TeamCareerData>();

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
    },
    staleTime: 60000,
  });
};
