
import { Ranking } from "@/types";

/**
 * Sort rankings by win percentage and SOS
 */
export const sortRankings = (rankings: Ranking[]): Ranking[] => {
  return [...rankings].sort((a, b) => {
    if (b.winPercentage !== a.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }
    return (b.sos || 0) - (a.sos || 0);
  });
};

/**
 * Update rank changes based on previous and current rankings
 */
export const updateRankChanges = (rankings: Ranking[]): Ranking[] => {
  return rankings.map((ranking, index) => {
    if (ranking.previousRank !== undefined) {
      ranking.rankChange = ranking.previousRank - (index + 1);
    }
    return ranking;
  });
};

/**
 * Save current rankings to localStorage
 */
export const saveRankingsToStorage = (rankings: Ranking[]) => {
  try {
    const rankingsToSave: Record<string, number> = {};
    rankings.forEach((ranking, index) => {
      rankingsToSave[ranking.teamId] = index + 1;
    });
    localStorage.setItem('previousRankings', JSON.stringify(rankingsToSave));
  } catch (error) {
    console.error('Error saving rankings:', error);
  }
};
