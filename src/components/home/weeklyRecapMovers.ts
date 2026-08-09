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
