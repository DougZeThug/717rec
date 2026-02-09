import { Match, Ranking, Team } from '@/types';
import { errorLog, warnLog } from '@/utils/logger';

// Ranking utilities - now handles NULL power scores for teams with no matches
// The power score calculation is handled in v_team_details using the 40/45/15 formula:
// - 40% Weighted Match Win % = (wins × opponent_weights) / total_matches
// - 45% Strength of Schedule = average opponent division weight
// - 15% Weighted Game Win % = (game_wins × opponent_weights) / total_games

export const sortRankings = (
  rankings: Ranking[],
  sortField: string,
  direction: 'asc' | 'desc'
): Ranking[] => {
  return [...rankings].sort((a, b) => {
    let valueA: number | string | null;
    let valueB: number | string | null;

    switch (sortField) {
      case 'powerScore':
        valueA = a.powerScore;
        valueB = b.powerScore;
        break;
      case 'winPercentage':
        valueA = a.winPercentage || 0;
        valueB = b.winPercentage || 0;
        break;
      case 'sos':
        valueA = a.sos || 0;
        valueB = b.sos || 0;
        break;
      case 'wins':
        valueA = a.wins || 0;
        valueB = b.wins || 0;
        break;
      case 'teamName':
        valueA = a.teamName;
        valueB = b.teamName;
        break;
      default:
        valueA = a.powerScore;
        valueB = b.powerScore;
    }

    // Handle NULL values for power score - put them at the end regardless of direction
    if (sortField === 'powerScore') {
      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return 1; // NULL values go to the end
      if (valueB === null) return -1; // NULL values go to the end
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    }

    const numA = Number(valueA);
    const numB = Number(valueB);
    return direction === 'asc' ? numA - numB : numB - numA;
  });
};

export const updateRankChanges = (rankings: Ranking[]): Ranking[] => {
  return rankings.map((ranking, index) => {
    const currentRank = index + 1;
    const previousRank = ranking.previousRank;

    let rankChange = 0;
    if (previousRank && previousRank !== currentRank) {
      rankChange = previousRank - currentRank;
    }

    return {
      ...ranking,
      rankChange,
    };
  });
};

export const saveRankingsToStorage = async (rankings: Ranking[], seasonId?: string): Promise<void> => {
  // Import database service dynamically to avoid circular dependencies
  const { saveRankingsToDatabase } = await import('@/services/RankingSnapshotService');

  try {
    // Save to database for the specified season (or active season if not provided)
    const dbSuccess = await saveRankingsToDatabase(rankings, seasonId);

    // Keep localStorage as fallback for backwards compatibility
    if (!dbSuccess) {
      warnLog('Database save failed, falling back to localStorage');
    }

    // Also save to localStorage as a backup
    const rankingMap = rankings.reduce(
      (acc, ranking, index) => {
        acc[ranking.teamId] = index + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    localStorage.setItem('previousRankings', JSON.stringify(rankingMap));
    localStorage.setItem('rankingsLastUpdated', new Date().toISOString());
  } catch (error) {
    errorLog('Failed to save rankings to storage:', error);
  }
};

export const loadRankingsFromStorage = async (seasonId?: string): Promise<{
  rankings: Record<string, number>;
  lastUpdated: string | null;
}> => {
  // Import database service dynamically to avoid circular dependencies
  const { loadRankingsFromDatabase, migrateLocalStorageToDatabase } = await import(
    '@/services/RankingSnapshotService'
  );

  try {
    // Try to load from database first for the specified season (or active season)
    const dbRankings = await loadRankingsFromDatabase(seasonId);

    // If database has rankings, use them
    if (Object.keys(dbRankings).length > 0) {
      return { rankings: dbRankings, lastUpdated: new Date().toISOString() };
    }

    // If database is empty, try to migrate from localStorage
    const localRankings = localStorage.getItem('previousRankings');
    if (localRankings) {
      // Attempt migration
      await migrateLocalStorageToDatabase();

      // Try loading from database again after migration
      const migratedRankings = await loadRankingsFromDatabase(seasonId);
      if (Object.keys(migratedRankings).length > 0) {
        return { rankings: migratedRankings, lastUpdated: new Date().toISOString() };
      }
    }

    // Fallback to localStorage if all else fails
    const rankings = JSON.parse(localStorage.getItem('previousRankings') || '{}');
    const lastUpdated = localStorage.getItem('rankingsLastUpdated');
    return { rankings, lastUpdated };
  } catch (error) {
    errorLog('Failed to load rankings from storage:', error);

    // Final fallback to localStorage
    try {
      const rankings = JSON.parse(localStorage.getItem('previousRankings') || '{}');
      const lastUpdated = localStorage.getItem('rankingsLastUpdated');
      return { rankings, lastUpdated };
    } catch {
      return { rankings: {}, lastUpdated: null };
    }
  }
};
