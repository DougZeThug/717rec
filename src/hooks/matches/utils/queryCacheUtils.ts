
import { QueryClient } from "@tanstack/react-query";

export const invalidateMatchRelatedQueries = async (queryClient: QueryClient) => {
  console.log("Invalidating all match and team related queries...");
  
  // Use predicate to catch all variations of team queries
  await queryClient.invalidateQueries({ 
    predicate: q => ['teams', 'team', 'rankings', 'v_team_game_totals', 'all-teams', 'team-details'].includes(String(q.queryKey[0]))
  });
  
  const queriesToInvalidate = [
    'matches', 
    'rankings', 
    'teamStats', 
    'team-matches',
    'standings',
    'v_team_game_totals'
  ];
  
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
