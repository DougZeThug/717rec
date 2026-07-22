import { useQuery } from '@tanstack/react-query';

import { loadRankingsFromDatabase } from '@/services/rankings/RankingPersistenceService';
import { debugLog, errorLog } from '@/utils/logger';

interface PreviousRankingsResult {
  rankings: Record<string, number>;
  lastUpdated: string | null;
}

// Stable fallback so consumers' effect dependencies don't see a fresh {} each render.
const EMPTY_RANKINGS: Record<string, number> = {};

/**
 * Load the previous-rankings baseline used for trend arrows.
 * Database first (ranking_snapshots), falling back to the localStorage backup
 * written by saveRankingsToStorage (a plain teamId → rank map). Pure read —
 * never writes to storage or the database.
 */
const loadPreviousRankings = async (): Promise<PreviousRankingsResult> => {
  try {
    const dbRankings = await loadRankingsFromDatabase();
    if (Object.keys(dbRankings).length > 0) {
      debugLog('Loaded previous rankings from database');
      return { rankings: dbRankings, lastUpdated: new Date().toISOString() };
    }
  } catch (error) {
    errorLog('Error loading rankings from database, falling back to localStorage:', error);
  }

  try {
    const rankings: Record<string, number> = JSON.parse(
      localStorage.getItem('previousRankings') || '{}'
    );
    return { rankings, lastUpdated: localStorage.getItem('rankingsLastUpdated') };
  } catch (error) {
    errorLog('Error parsing localStorage rankings backup:', error);
    return { rankings: EMPTY_RANKINGS, lastUpdated: null };
  }
};

export const usePreviousRankings = (): {
  previousRankings: Record<string, number>;
  lastUpdated: string | null;
} => {
  const { data } = useQuery({
    queryKey: ['previous-rankings'],
    queryFn: loadPreviousRankings,
  });

  return {
    previousRankings: data?.rankings ?? EMPTY_RANKINGS,
    lastUpdated: data?.lastUpdated ?? null,
  };
};
