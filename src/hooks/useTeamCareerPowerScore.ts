import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SeasonPowerScoreData } from "@/types/teamCareerPowerScore";

export const useTeamCareerPowerScore = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-career-power-score', teamId],
    queryFn: async () => {
      if (!teamId) throw new Error('Team ID is required');

      const { data: seasonStats, error } = await supabase
        .from('team_season_stats')
        .select(`
          power_score,
          playoff_rank,
          division_name,
          champion,
          runner_up,
          season_id
        `)
        .eq('team_id', teamId);

      if (error) throw error;

      // Fetch season details separately and sort by start_date
      const seasonIds = seasonStats?.map(s => s.season_id) || [];
      if (seasonIds.length === 0) return [];

      const { data: seasons, error: seasonsError } = await supabase
        .from('seasons')
        .select('id, name, start_date')
        .in('id', seasonIds)
        .order('start_date', { ascending: true });

      if (seasonsError) throw seasonsError;

      // Create a map of season data
      const seasonMap = new Map(seasons?.map(s => [s.id, s]) || []);

      // Map and sort by season start date
      const mapped: SeasonPowerScoreData[] = seasonStats
        .map(stat => {
          const season = seasonMap.get(stat.season_id);
          if (!season) return null;

          return {
            seasonName: season.name,
            powerScore: stat.power_score,
            playoffRank: stat.playoff_rank,
            divisionName: stat.division_name,
            isChampion: stat.champion || false,
            isRunnerUp: stat.runner_up || false,
            isTop3: stat.champion || stat.runner_up || (stat.playoff_rank !== null && stat.playoff_rank <= 3)
          };
        })
        .filter((item): item is SeasonPowerScoreData => item !== null)
        .sort((a, b) => {
          const seasonA = seasons?.find(s => s.name === a.seasonName);
          const seasonB = seasons?.find(s => s.name === b.seasonName);
          if (!seasonA || !seasonB) return 0;
          return new Date(seasonA.start_date).getTime() - new Date(seasonB.start_date).getTime();
        });

      return mapped;
    },
    enabled: !!teamId
  });
};
