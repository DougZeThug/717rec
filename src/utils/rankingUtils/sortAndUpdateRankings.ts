
import { Ranking } from "@/types";

/**
 * Sort rankings by power score, win percentage, and SOS
 */
export const sortRankings = (rankings: Ranking[]): Ranking[] => {
  return [...rankings].sort((a, b) => {
    // Primary sort by power score if available
    if (b.powerScore !== undefined && a.powerScore !== undefined && 
        b.powerScore !== a.powerScore) {
      return b.powerScore - a.powerScore;
    }
    
    // Secondary sort by win percentage
    if (b.winPercentage !== a.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }
    
    // Tertiary sort by SOS
    if ((b.sos || 0) !== (a.sos || 0)) {
      return (b.sos || 0) - (a.sos || 0);
    }
    
    // Quaternary sort by game win percentage if available
    if (b.gameWinPercentage !== undefined && a.gameWinPercentage !== undefined && 
        b.gameWinPercentage !== a.gameWinPercentage) {
      return b.gameWinPercentage - a.gameWinPercentage;
    }
    
    // If all else is equal, sort by total wins
    return b.wins - a.wins;
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
