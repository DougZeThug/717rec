import { supabase } from '@/integrations/supabase/client';
import type { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';
import { handleDatabaseError } from '@/utils/errorHandler';
import { pickTeamOfTheWeek } from '@/utils/powerScore/pickTeamOfTheWeek';

/**
 * Week-over-week power score movement for one EXPLICIT season week.
 *
 * `fetchWeeklyPowerScoreTrends` in RankingTrendsService answers a different
 * question: "how did the active season move between the two most recent weeks
 * that have snapshots". That is right for the live home page and wrong for a
 * saved recap edition, which must describe the week it names, in the season it
 * names, however long ago that was.
 */

/**
 * How the comparison was reached. A recap edition is frozen, so a missing
 * snapshot must be recorded rather than quietly papered over — comparing week 7
 * against week 5 while labelling it "this week" would publish a falsehood
 * permanently.
 */
export type TrendBasis =
  /** Week N compared against week N-1, as intended. */
  | 'compared'
  /** Week N-1 has no snapshot; compared against the nearest earlier week. */
  | 'gap'
  /** Nothing earlier exists to compare against (week 1). */
  | 'baseline'
  /** Week N itself has no snapshot. No movement can be reported. */
  | 'missing';

export interface WeekPairTrends {
  /** Every qualifying team, unsorted and unfiltered by sign. */
  trends: WeeklyPowerScoreTrend[];
  currentWeek: number;
  /** The week actually compared against, which is not always currentWeek - 1. */
  previousWeek: number | null;
  basis: TrendBasis;
}

const empty = (currentWeek: number, basis: TrendBasis): WeekPairTrends => ({
  trends: [],
  currentWeek,
  previousWeek: null,
  basis,
});

/**
 * Power score movement into `weekNumber` for `seasonId`.
 *
 * Returns every team present in both weeks, in no particular order and with no
 * sign filter — callers decide what counts as a riser, a faller, or Team of the
 * Week. Throws on a database error.
 */
export async function fetchPowerScoreTrendsForWeek(
  seasonId: string,
  weekNumber: number
): Promise<WeekPairTrends> {
  const [weekNumbersResult, visibleDivisionsResult] = await Promise.all([
    supabase
      .from('power_score_snapshots')
      .select('week_number')
      .eq('season_id', seasonId)
      .lte('week_number', weekNumber)
      .order('week_number', { ascending: false }),
    supabase.from('divisions').select('id').neq('display_division', 'Hidden'),
  ]);

  if (weekNumbersResult.error) {
    handleDatabaseError(weekNumbersResult.error, 'Failed to fetch snapshot weeks for the recap');
  }
  if (visibleDivisionsResult.error) {
    handleDatabaseError(
      visibleDivisionsResult.error,
      'Failed to fetch visible divisions for the recap'
    );
  }

  const availableWeeks = [...new Set((weekNumbersResult.data ?? []).map((w) => w.week_number))];

  if (!availableWeeks.includes(weekNumber)) {
    // The weekly snapshot job did not run for this week. Movers cannot be
    // reported at all, and the caller must say so rather than show nothing.
    return empty(weekNumber, 'missing');
  }

  const previousWeek = availableWeeks.find((week) => week < weekNumber) ?? null;

  if (previousWeek === null) {
    return empty(weekNumber, 'baseline');
  }

  const basis: TrendBasis = previousWeek === weekNumber - 1 ? 'compared' : 'gap';
  const visibleDivisionIds = new Set((visibleDivisionsResult.data ?? []).map((d) => d.id));

  const [currentSnapshotsResult, previousSnapshotsResult] = await Promise.all([
    supabase
      .from('power_score_snapshots')
      .select('team_id, power_score')
      .eq('season_id', seasonId)
      .eq('week_number', weekNumber)
      .not('power_score', 'is', null),
    supabase
      .from('power_score_snapshots')
      .select('team_id, power_score')
      .eq('season_id', seasonId)
      .eq('week_number', previousWeek)
      .not('power_score', 'is', null),
  ]);

  if (currentSnapshotsResult.error) {
    handleDatabaseError(currentSnapshotsResult.error, 'Failed to fetch this week’s snapshots');
  }
  if (previousSnapshotsResult.error) {
    handleDatabaseError(
      previousSnapshotsResult.error,
      'Failed to fetch the comparison week’s snapshots'
    );
  }

  const currentSnapshots = currentSnapshotsResult.data ?? [];
  const previousScores = new Map(
    (previousSnapshotsResult.data ?? []).map((s) => [s.team_id, s.power_score])
  );

  if (currentSnapshots.length === 0) {
    return { ...empty(weekNumber, basis), previousWeek };
  }

  const { data: teamDetails, error: teamDetailsError } = await supabase
    .from('v_team_details')
    .select('team_id, name, divisionname, division_id, logo_url, image_url')
    .in(
      'team_id',
      currentSnapshots.map((s) => s.team_id)
    );

  if (teamDetailsError) {
    handleDatabaseError(teamDetailsError, 'Failed to fetch team details for the recap');
  }

  const teamDetailsMap = new Map((teamDetails ?? []).map((t) => [t.team_id, t]));

  const trends: WeeklyPowerScoreTrend[] = currentSnapshots
    .filter((snapshot) => {
      const detail = teamDetailsMap.get(snapshot.team_id);
      return (
        // A team missing from the earlier week has no movement to report.
        previousScores.has(snapshot.team_id) &&
        detail?.division_id != null &&
        visibleDivisionIds.has(detail.division_id)
      );
    })
    .map((snapshot) => {
      const detail = teamDetailsMap.get(snapshot.team_id);
      const previousScore = previousScores.get(snapshot.team_id) ?? 0;
      const currentScore = snapshot.power_score ?? 0;
      const delta = currentScore - previousScore;

      return {
        teamId: snapshot.team_id,
        teamName: detail?.name ?? 'Unknown',
        division: detail?.divisionname ?? 'Unknown',
        logoUrl: detail?.image_url ?? detail?.logo_url ?? undefined,
        currentScore,
        previousScore,
        delta,
        percentChange: previousScore > 0 ? (delta / previousScore) * 100 : 0,
        currentWeek: weekNumber,
        previousWeek,
      };
    });

  return { trends, currentWeek: weekNumber, previousWeek, basis };
}

export { pickTeamOfTheWeek };
