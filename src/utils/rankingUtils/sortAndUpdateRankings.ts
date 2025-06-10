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
  // Clear any existing rankChange values to avoid stale data
  const cleanedRankings = rankings.map(ranking => ({
    ...ranking,
    rankChange: 0 // Reset to avoid stale data
  }));

  return cleanedRankings.map((ranking, index) => {
    const currentRank = index + 1;
    
    // Only calculate rankChange if we have a previous rank to compare with
    if (ranking.previousRank !== undefined && ranking.previousRank !== null) {
      // If previousRank is greater than currentRank, team moved up in rankings (positive change)
      // If previousRank is less than currentRank, team moved down in rankings (negative change)
      const change = ranking.previousRank - currentRank;
      ranking.rankChange = change;
      
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
 * Combined function that sorts rankings and updates rank changes
 * This is the main function used by useRankings hook
 */
export const sortAndUpdateRankings = (
  rankings: Ranking[], 
  previousRankings: Record<string, number>,
  sortBy: string = 'powerScore',
  sortDirection: 'asc' | 'desc' = 'desc'
): Ranking[] => {
  // First, sort the rankings by the specified criteria
  const sortedRankings = sortRankings(rankings, sortBy, sortDirection);
  
  // Then, update the rank changes based on previous rankings
  const updatedRankings = updateRankChanges(sortedRankings);
  
  return updatedRankings;
};

/**
 * Interface for storing rankings with metadata
 */
interface RankingsStorageData {
  rankings: Record<string, number>;
  timestamp: string;
  version: number;
}

/**
 * Save current rankings to localStorage with timestamp for future comparison
 */
export const saveRankingsToStorage = (rankings: Ranking[]) => {
  try {
    const rankingsToSave: Record<string, number> = {};
    rankings.forEach((ranking, index) => {
      rankingsToSave[ranking.teamId] = index + 1;
    });
    
    // Create storage object with metadata
    const storageData: RankingsStorageData = {
      rankings: rankingsToSave,
      timestamp: new Date().toISOString(),
      version: 1 // For future compatibility
    };
    
    // Log the rankings being saved
    console.log("Saving CURRENT rankings to localStorage:", storageData);
    
    // Store as current rankings
    localStorage.setItem('currentRankings', JSON.stringify(storageData));
    console.log('Current rankings saved to localStorage for future comparison');

    // Check if we need to initialize historical rankings (if not present)
    const previousRankings = localStorage.getItem('previousRankings');
    if (!previousRankings) {
      console.log('No historical rankings found, initializing with current data');
      localStorage.setItem('previousRankings', JSON.stringify(storageData));
    }
  } catch (error) {
    console.error('Error saving rankings:', error);
  }
};
