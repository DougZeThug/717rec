import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';

/**
 * Movers are rendered to one decimal place, so anything smaller than half a tenth
 * shows up as "+0.0" — a row that claims movement while reporting none. Those are
 * hidden rather than displayed.
 *
 * The filter lives here rather than in the trends service because the same query
 * feeds Team of the Week, which picks the top trend regardless of size.
 */
export const isVisibleMover = (trend: WeeklyPowerScoreTrend): boolean =>
  Math.abs(trend.delta) >= 0.05;

/**
 * Whether any mover would actually draw a row. The card's own empty check and
 * the home page's render gate both ask this, so the two cannot drift apart and
 * leave a movers-only week with no card.
 */
export const hasVisibleMovers = (
  risers: WeeklyPowerScoreTrend[],
  faller?: WeeklyPowerScoreTrend
): boolean =>
  risers.some((trend) => trend.delta > 0 && isVisibleMover(trend)) ||
  Boolean(faller && faller.delta < 0 && isVisibleMover(faller));
