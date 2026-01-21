import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';
import { TrendDirection } from '@/types/powerScoreTrends';

export const useWeeklyPowerScoreTrends = (direction: TrendDirection = 'up', limit: number = 10) => {
  return useQuery({
    queryKey: ['weekly-power-score-trends', direction, limit],
    queryFn: async (): Promise<{
      trends: WeeklyPowerScoreTrend[];
      hasData: boolean;
      latestWeek: number | null;
    }> => {
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
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - trends don't change frequently
  });
};
