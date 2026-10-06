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
const matchHistoryCache = new Map<string, boolean>();

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
  const cached = matchHistoryCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Fetch match history and cache it
  const hasPlayed = await checkFn(team1Id, team2Id);
  matchHistoryCache.set(cacheKey, hasPlayed);

  return hasPlayed;
}

/**
 * Clear the match history cache
 */
export function clearMatchHistoryCache(): void {
  matchHistoryCache.clear();
}
