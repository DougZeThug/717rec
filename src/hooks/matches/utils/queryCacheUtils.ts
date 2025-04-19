
import { QueryClient } from "@tanstack/react-query";

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
  
  // Use predicate to catch all variations of team queries
  queryClient.invalidateQueries({ 
    predicate: q => ['teams', 'team', 'rankings'].includes(String(q.queryKey[0]))
  });
  console.debug('[invalidate] done');
  
  const promises = queriesToInvalidate.map(queryKey => 
    queryClient.invalidateQueries({ queryKey: [queryKey] })
  );
  
  await Promise.all(promises);
  console.log("Query cache invalidation complete for:", queriesToInvalidate.join(", "));
};

export const batchInvalidateQueries = async (queryClient: QueryClient, keys: string[]) => {
  const promises = keys.map(key => queryClient.invalidateQueries({ queryKey: [key] }));
  await Promise.all(promises);
};
