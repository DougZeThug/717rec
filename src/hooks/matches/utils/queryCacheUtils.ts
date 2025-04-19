
import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidates all queries related to matches and team stats
 * to ensure data freshness across the app
 */
export const invalidateMatchRelatedQueries = async (queryClient: QueryClient) => {
  console.log("Invalidating all match and team related queries...");
  const queriesToInvalidate = [
    'matches', 
    'teams', 
    'rankings', 
    'teamStats', 
    'team', 
    'team-matches',
    'standings'
  ];
  
  const promises = queriesToInvalidate.map(queryKey => 
    queryClient.invalidateQueries({ queryKey: [queryKey] })
  );
  
  await Promise.all(promises);
  console.log("Query cache invalidation complete for:", queriesToInvalidate.join(", "));
};

/**
 * Helper function for batch operations
 */
export const batchInvalidateQueries = async (queryClient: QueryClient, keys: string[]) => {
  const promises = keys.map(key => queryClient.invalidateQueries({ queryKey: [key] }));
  await Promise.all(promises);
};
