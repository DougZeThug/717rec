
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PowerScoreTrend, TrendDirection } from "@/types/powerScoreTrends";

export const usePowerScoreTrends = (direction: TrendDirection = 'up', limit: number = 10) => {
  return useQuery({
    queryKey: ['power-score-trends', direction, limit],
    queryFn: async (): Promise<PowerScoreTrend[]> => {
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

      // Get current season power scores from v_team_details
      const { data: currentData, error: currentError } = await supabase
        .from('v_team_details')
        .select('team_id, name, divisionname, logo_url, power_score')
        .not('power_score', 'is', null);

      if (currentError || !currentData) {
        console.error('Error fetching current season data:', currentError);
        return [];
      }

      // Get previous season power scores from team_season_stats
      const { data: previousData, error: previousError } = await supabase
        .from('team_season_stats')
        .select('team_id, power_score')
        .eq('season_id', previousSeasonId)
        .not('power_score', 'is', null);

      if (previousError || !previousData) {
        console.error('Error fetching previous season data:', previousError);
        return [];
      }

      // Create a map of previous scores for quick lookup
      const previousScoresMap = new Map(
        previousData.map(team => [team.team_id, team.power_score])
      );

      // Calculate trends for teams that have both current and previous data
      const trends: PowerScoreTrend[] = currentData
        .filter(team => previousScoresMap.has(team.team_id))
        .map(team => {
          const previousScore = previousScoresMap.get(team.team_id) || 0;
          const currentScore = team.power_score || 0;
          const delta = currentScore - previousScore;
          const percentChange = previousScore > 0 ? (delta / previousScore) * 100 : 0;

          return {
            teamId: team.team_id,
            teamName: team.name,
            division: team.divisionname || 'Unknown',
            logoUrl: team.logo_url,
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
    },
    staleTime: 60000, // Cache for 1 minute
  });
};
