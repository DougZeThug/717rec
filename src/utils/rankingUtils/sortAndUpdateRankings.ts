
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
        // Use the database-calculated power score directly
        valueA = a.powerScore;
        valueB = b.powerScore;
        break;
      case 'gameWinPercentage':
        valueA = a.gameWinPercentage || 0;
        valueB = b.gameWinPercentage || 0;
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
        // Default to database-calculated power score
        valueA = a.powerScore;
        valueB = b.powerScore;
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
    const currentRank = index + 1;
    
    // Only calculate rankChange if we have a previous rank to compare with
    if (ranking.previousRank !== undefined) {
      // If previousRank is greater than currentRank, team moved up in rankings (positive change)
      // If previousRank is less than currentRank, team moved down in rankings (negative change)
      ranking.rankChange = ranking.previousRank - currentRank;
      
      // Enhanced logging for debugging
      console.log(`Team ${ranking.teamName}: previousRank=${ranking.previousRank}, currentRank=${currentRank}, rankChange=${ranking.rankChange}`);
    } else {
      // No previous rank data, so set to 0 (no change)
      ranking.rankChange = 0;
      console.log(`Team ${ranking.teamName}: No previous rank data available (setting rankChange=0)`);
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
    
    // Log the rankings being saved
    console.log("Saving rankings to localStorage:", rankingsToSave);
    
    localStorage.setItem('previousRankings', JSON.stringify(rankingsToSave));
    console.log('Rankings saved to localStorage for future trend calculation');
  } catch (error) {
    console.error('Error saving rankings:', error);
  }
};
