import { QueryClient } from '@tanstack/react-query';

import { Ranking } from '@/types';
import { cacheLog, errorLog } from '@/utils/logger';

export const invalidateMatchRelatedQueries = async (queryClient: QueryClient) => {
  cacheLog('Invalidating all match and team related queries...');

  // Use predicate to catch all variations of team queries
  await queryClient.invalidateQueries({
    predicate: (q) =>
      ['teams', 'team', 'rankings', 'v_team_details', 'all-teams', 'team-details'].includes(
        String(q.queryKey[0])
      ),
  });

  const queriesToInvalidate = [
    'matches',
    'rankings',
    'teamStats',
    'team-matches',
    'standings',
    'v_team_details',
    // Career data
    'careerRankings',
    'all-teams-career-power-scores',
    'team-career-power-score',
    // Schedule and opponent data
    'season-opponent-history',
    'schedule',
    'upcoming-matches',
    // Playoff data
    'playoff-matches',
    'bracket-data',
  ];

  const promises = queriesToInvalidate.map((queryKey) =>
    queryClient.invalidateQueries({ queryKey: [queryKey] })
  );

  await Promise.all(promises);
  cacheLog('Query cache invalidation complete for:', queriesToInvalidate.join(', '));

  // After invalidation, save ranking snapshot (authenticated users only)
  try {
    const { getAuthSession } = await import('@/services/auth/AuthService');
    const {
      data: { session },
    } = await getAuthSession();
    if (session) {
      // Small delay to let React Query refetch rankings with fresh data
      setTimeout(async () => {
        try {
          const rankingsData = queryClient.getQueryData<Ranking[]>(['rankings']);
          if (rankingsData && rankingsData.length > 0) {
            const { saveRankingsToStorage } = await import('@/utils/rankingUtils');
            await saveRankingsToStorage(rankingsData);
            cacheLog('Ranking snapshot saved after match completion');
          }
        } catch (err) {
          errorLog('Failed to save ranking snapshot after match completion:', err);
        }
      }, 2000);
    }
  } catch {
    // Non-critical, silently ignore
  }
};

export const batchInvalidateQueries = async (queryClient: QueryClient, keys: string[]) => {
  const promises = keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  await Promise.all(promises);
};
