import { QueryClient } from '@tanstack/react-query';

import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';

/**
 * Refreshes every query that depends on match results after a match is
 * updated or deleted. It uses the same list as the other match flows
 * (`invalidateMatchRelatedQueries`), so Career and bracket pages refresh too.
 * Callers do not wait for it.
 */
export const invalidateAllDataQueries = (queryClient: QueryClient) => {
  void invalidateMatchRelatedQueries(queryClient);
};
