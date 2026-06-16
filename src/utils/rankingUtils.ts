import { Ranking } from '@/types';
import { errorLog, warnLog } from '@/utils/logger';
import { getTierFromDivision } from '@/utils/autoSchedule/blossom/tierUtils';

const getDisplayedPowerScore = (powerScore: number | null | undefined): number | null => {
  if (powerScore === null || powerScore === undefined) return null;
  return Math.round(powerScore * 10) / 10;
};

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
        valueA = getDisplayedPowerScore(a.powerScore);
        valueB = getDisplayedPowerScore(b.powerScore);
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
      if (valueA === null && valueB === null) {
        // Fall through to tiebreakers below — do not return 0
      } else if (valueA === null) {
        return 1; // NULL values go to the end
      } else if (valueB === null) {
        return -1; // NULL values go to the end
      }
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    }

    const numA = Number(valueA);
    const numB = Number(valueB);
    const primary = direction === 'asc' ? numA - numB : numB - numA;
    if (primary !== 0) return primary;

    // Tiebreakers for power score, in priority order:
    //   1) Higher division ranks first (Competitive=1 > Intermediate=2 > Recreational=3)
    //   2) Higher win percentage
    //   3) Team name (alphabetical)
    if (sortField === 'powerScore') {
      const tierA = getTierFromDivision(a.divisionName);
      const tierB = getTierFromDivision(b.divisionName);
      if (tierA !== tierB) return tierA - tierB;

      const winA = a.winPercentage || 0;
      const winB = b.winPercentage || 0;
      if (winA !== winB) return winB - winA;

      return (a.teamName || '').localeCompare(b.teamName || '');
    }
    return 0;
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

export const saveRankingsToStorage = async (
  rankings: Ranking[],
  seasonId?: string
): Promise<void> => {
  // Import database service dynamically to avoid circular dependencies
  const { saveRankingsToDatabase } = await import('@/services/rankings/RankingPersistenceService');

  try {
    // Save to database for the specified season (or active season if not provided)
    try {
      await saveRankingsToDatabase(rankings, seasonId);
    } catch (error) {
      warnLog('Database save failed, falling back to localStorage:', error);
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

export const loadRankingsFromStorage = async (
  seasonId?: string
): Promise<{
  rankings: Record<string, number>;
  lastUpdated: string | null;
}> => {
  // Import database service dynamically to avoid circular dependencies
  const { loadRankingsFromDatabase, migrateLocalStorageToDatabase } =
    await import('@/services/rankings/RankingPersistenceService');

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
