import { Ranking } from '@/types';
import { sortRankings, updateRankChanges } from '@/utils/rankingUtils';

/**
 * Sort rankings and update rank changes
 */
export const sortAndUpdateRankings = (
  rankings: Ranking[],
  _previousRankings: Record<string, number>
): Ranking[] => {
  // Sort by power score (descending)
  const sortedRankings = sortRankings(rankings, 'powerScore', 'desc');

  // Update rank changes
  const finalRankings = updateRankChanges(sortedRankings);

  return finalRankings;
};
