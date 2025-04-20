
import { Team } from "@/types";

/**
 * Calculate trending teams based on power score changes
 * @param teams Current team data
 * @param previousScores Previous power scores (teamId -> score)
 * @returns Teams sorted by biggest power score increase
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
    .map(team => {
      const previousScore = previousScores[team.id] || team.power_score || 0;
      const currentScore = team.power_score || 0;
      const increase = currentScore - previousScore;
      
      return {
        team,
        increase,
        previousScore
      };
    })
    .filter(item => item.increase > 0) // Only include teams with positive trends
    .sort((a, b) => b.increase - a.increase);

  return teamsWithTrend;
};
