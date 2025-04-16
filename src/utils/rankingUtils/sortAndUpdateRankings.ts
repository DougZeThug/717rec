
import { Ranking } from "@/types";

/**
 * Generic function to sort rankings by any field and direction
 */
export const sortRankings = (
  rankings: Ranking[], 
  sortBy: string = 'powerScore', 
  sortDirection: 'asc' | 'desc' = 'desc'
): Ranking[] => {
  return [...rankings].sort((a, b) => {
    let valueA: number;
    let valueB: number;
    
    // Determine which values to compare based on the sortBy parameter
    switch (sortBy) {
      case 'winPercentage':
        valueA = a.winPercentage;
        valueB = b.winPercentage;
        break;
      case 'sos':
        valueA = a.sos || 0;
        valueB = b.sos || 0;
        break;
      case 'powerScore':
        valueA = a.powerScore !== undefined ? a.powerScore : 0;
        valueB = b.powerScore !== undefined ? b.powerScore : 0;
        break;
      case 'gameWinPercentage':
        valueA = a.gameWinPercentage !== undefined ? a.gameWinPercentage : 0;
        valueB = b.gameWinPercentage !== undefined ? b.gameWinPercentage : 0;
        break;
      case 'gamesWon':
        valueA = a.gamesWon || 0;
        valueB = b.gamesWon || 0;
        break;
      case 'gamesLost':
        valueA = a.gamesLost || 0;
        valueB = b.gamesLost || 0;
        break;
      case 'wins':
        valueA = a.wins;
        valueB = b.wins;
        break;
      case 'losses':
        valueA = a.losses;
        valueB = b.losses;
        break;
      default:
        // Default to powerScore
        valueA = a.powerScore !== undefined ? a.powerScore : 0;
        valueB = b.powerScore !== undefined ? b.powerScore : 0;
    }
    
    // Sort in ascending or descending order based on sortDirection
    const compareResult = valueA - valueB;
    return sortDirection === 'asc' ? compareResult : -compareResult;
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
