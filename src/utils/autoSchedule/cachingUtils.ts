/**
 * Generate a unique key for two teams regardless of order
 */
export function getCacheKey(team1Id: string, team2Id: string): string {
  // Sort IDs to ensure consistent key regardless of team order
  return [team1Id, team2Id].sort().join('-');
}

/**
 * Cache for previous match history to reduce database queries
 */
const matchHistoryCache: { [key: string]: boolean } = {};

/**
 * Get cached match history or fetch it
 */
export async function getCachedMatchHistory(
  team1Id: string,
  team2Id: string,
  checkFn: (t1: string, t2: string) => Promise<boolean>
): Promise<boolean> {
  const cacheKey = getCacheKey(team1Id, team2Id);

  // Return from cache if available
  if (matchHistoryCache[cacheKey] !== undefined) {
    return matchHistoryCache[cacheKey];
  }

  // Fetch match history and cache it
  const hasPlayed = await checkFn(team1Id, team2Id);
  matchHistoryCache[cacheKey] = hasPlayed;

  return hasPlayed;
}

/**
 * Clear the match history cache
 */
export function clearMatchHistoryCache(): void {
  Object.keys(matchHistoryCache).forEach((key) => {
    delete matchHistoryCache[key];
  });
}
