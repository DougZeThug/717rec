import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { warnLog } from '@/utils/logger';

/**
 * Hook for optimizing React Query cache management in playoffs
 */
export function usePlayoffCacheOptimization() {
  const queryClient = useQueryClient();

  // Preload common queries for better UX
  const preloadCommonData = useCallback(async () => {
    try {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['divisions'],
          staleTime: 1000 * 60 * 10, // 10 minutes for divisions
        }),
        queryClient.prefetchQuery({
          queryKey: ['playoff-teams'],
          staleTime: 1000 * 60 * 5, // 5 minutes for teams
        }),
      ]);
    } catch (error) {
      warnLog('Failed to preload data:', error);
    }
  }, [queryClient]);

  // Optimize cache by removing stale bracket data
  const optimizeCache = useCallback(() => {
    // Remove queries older than 30 minutes for bracket data
    queryClient.removeQueries({
      queryKey: ['bracket-data'],
      type: 'inactive',
      predicate: (query) => {
        const lastFetched = query.state.dataUpdatedAt;
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        return lastFetched < thirtyMinutesAgo;
      },
    });

    // Remove old match queries
    queryClient.removeQueries({
      queryKey: ['playoff-matches'],
      type: 'inactive',
      predicate: (query) => {
        const lastFetched = query.state.dataUpdatedAt;
        const twentyMinutesAgo = Date.now() - 20 * 60 * 1000;
        return lastFetched < twentyMinutesAgo;
      },
    });
  }, [queryClient]);

  // Invalidate all playoff-related queries
  const invalidateAllPlayoffData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['brackets'] }),
      queryClient.invalidateQueries({ queryKey: ['bracket-data'] }),
      queryClient.invalidateQueries({ queryKey: ['playoff-matches'] }),
      queryClient.invalidateQueries({ queryKey: ['playoff-teams'] }),
      queryClient.invalidateQueries({ queryKey: ['playoff-data'] }),
    ]);
  }, [queryClient]);

  // Set up periodic cache optimization
  useEffect(() => {
    const interval = setInterval(optimizeCache, 10 * 60 * 1000); // Every 10 minutes
    return () => clearInterval(interval);
  }, [optimizeCache]);

  return {
    preloadCommonData,
    optimizeCache,
    invalidateAllPlayoffData,
  };
}
