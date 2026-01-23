import { QueryClient } from '@tanstack/react-query';

/**
 * Invalidates all data queries related to matches, teams, and rankings
 * to ensure data consistency across the application after match updates/deletions
 */
export const invalidateAllDataQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['matches'] });
  queryClient.invalidateQueries({ queryKey: ['teams'] });
  queryClient.invalidateQueries({ queryKey: ['rankings'] });
  queryClient.invalidateQueries({ queryKey: ['teamStats'] });
  queryClient.invalidateQueries({ queryKey: ['team-totals'] });
  queryClient.invalidateQueries({ queryKey: ['season-data'] }); // History page data

  // Also invalidate single team queries that might be open in team details pages
  queryClient.invalidateQueries({ queryKey: ['team'] });
  queryClient.invalidateQueries({ queryKey: ['team-matches'] });
};
