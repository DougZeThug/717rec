import { supabase } from '@/integrations/supabase/client';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';
import { PowerScoreTrend, TrendDirection } from '@/types/powerScoreTrends';
import { warnLog } from '@/utils/logger';

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
  const previousScoresMap = new Map(previousData.map((team) => [team.team_id, team.power_score]));

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
    supabase.from('divisions').select('id').neq('display_division', 'Hidden'),
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
