
import { QueryClient } from "@tanstack/react-query";

export const invalidateMatchRelatedQueries = async (queryClient: QueryClient) => {
  const queriesToInvalidate = [
    'rankings', 'teams', 'matches', 'teamStats', 'team', 'team-matches', 'standings', 'homepageStats'
  ];
  
  console.log("[queryCacheUtils] Invalidating relevant query caches");
  
  for (const queryKey of queriesToInvalidate) {
    await queryClient.invalidateQueries({ queryKey: [queryKey] });
    console.log(`[queryCacheUtils] Invalidated query cache for ${queryKey}`);
  }
  
  // Also invalidate specific team queries if needed
  // This ensures team details pages are updated
  const teamIds = queryClient.getQueryData(['teams']) as any[];
  if (teamIds) {
    for (const teamData of teamIds) {
      if (teamData.id) {
        await queryClient.invalidateQueries({ queryKey: ['team', teamData.id] });
      }
    }
  }
};
