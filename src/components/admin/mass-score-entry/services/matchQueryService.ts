import { fetchMatchesForAdmin } from '@/services/matches/MatchReadService';
import { matchLog } from '@/utils/logger';

import { FilterState } from '../types';

export const buildMatchQuery = async (filters: FilterState) => {
  matchLog(`Building match query with filters:`, {
    date: filters.date?.toDateString(),
    bracketId: filters.bracketId,
  });

  return fetchMatchesForAdmin(filters);
};
