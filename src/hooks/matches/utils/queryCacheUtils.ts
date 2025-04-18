
import { QueryClient } from "@tanstack/react-query";

export const invalidateMatchRelatedQueries = async (queryClient: QueryClient) => {
  const queriesToInvalidate = [
    'rankings', 'teams', 'matches', 'teamStats', 'team', 'team-matches'
  ];
  
  console.log("[queryCacheUtils] Invalidating relevant query caches");
  
  for (const queryKey of queriesToInvalidate) {
    await queryClient.invalidateQueries({ queryKey: [queryKey] });
    console.log(`[queryCacheUtils] Invalidated query cache for ${queryKey}`);
  }
};
