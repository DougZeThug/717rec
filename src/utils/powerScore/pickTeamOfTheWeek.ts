import type { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';

/**
 * Team of the Week: the biggest riser, and only if it actually rose.
 *
 * The rule the home page has always applied, kept in one place so a saved recap
 * edition and the live card cannot name different teams.
 *
 * It lives here, in a leaf module with no database imports, rather than beside
 * the query that feeds it. The home page needs the rule but not the queries,
 * and importing it from a service dragged that service's whole graph into the
 * main bundle.
 */
export const pickTeamOfTheWeek = (
  trends: WeeklyPowerScoreTrend[]
): WeeklyPowerScoreTrend | null => {
  const topRiser = [...trends].sort((a, b) => b.delta - a.delta)[0];
  return topRiser && topRiser.delta > 0 ? topRiser : null;
};
