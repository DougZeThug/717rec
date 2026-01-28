import { Team } from '@/types';

/**
 * Identifies teams with the largest recent power score improvements.
 *
 * Used to highlight "hot" teams on the standings page - teams that are
 * climbing the rankings based on recent match performance.
 *
 * @param teams - Current team data with power_score property (0-100 scale)
 * @param previousScores - Map of teamId to previous power score for comparison
 * @returns Teams sorted by biggest power score increase, filtered to positive gains only
 *
 * @example
 * const trending = getTrendingTeams(currentTeams, lastWeekScores);
 * // Returns: [{ team: TeamA, increase: 5.2 }, { team: TeamB, increase: 3.1 }]
 */
export const getTrendingTeams = (
  teams: Team[],
  previousScores: Record<string, number> = {}
): { team: Team; increase: number }[] => {
  if (!teams || teams.length === 0) {
    return [];
  }

  // Calculate power score changes and sort by biggest increase
  const teamsWithTrend = teams
    .map((team) => {
      const previousScore = previousScores[team.id] || team.power_score || 0;
      const currentScore = team.power_score || 0;
      const increase = currentScore - previousScore;

      return {
        team,
        increase,
        previousScore,
      };
    })
    .filter((item) => item.increase > 0) // Only include teams with positive trends
    .sort((a, b) => b.increase - a.increase);

  return teamsWithTrend;
};
