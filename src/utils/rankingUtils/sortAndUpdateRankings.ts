import { Ranking } from '@/types';
import { errorLog } from '@/utils/logger';
import { saveRankingsToStorage, sortRankings, updateRankChanges } from '@/utils/rankingUtils';

/**
 * Sort rankings and update rank changes
 */
export const sortAndUpdateRankings = (
  rankings: Ranking[],
  previousRankings: Record<string, number>
): Ranking[] => {
  // Sort by power score (descending)
  const sortedRankings = sortRankings(rankings, 'powerScore', 'desc');

  // Update rank changes
  const finalRankings = updateRankChanges(sortedRankings);

  // Save current rankings for next calculation (async, don't wait)
  saveRankingsToStorage(finalRankings).catch((err) =>
    errorLog('Failed to save rankings:', err)
  );

  return finalRankings;
};
