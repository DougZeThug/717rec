
import { Team } from "@/types";

// Create a cache for compatibility scores to avoid recalculating
type CompatibilityCache = {
  [key: string]: number;
};

// Global cache object for the current session
const compatibilityScoreCache: CompatibilityCache = {};

/**
 * Generate a unique key for two teams regardless of order
 */
export function getCacheKey(team1Id: string, team2Id: string): string {
  // Sort IDs to ensure consistent key regardless of team order
  return [team1Id, team2Id].sort().join('-');
}

/**
 * Get compatibility score from cache or calculate it
 */
export function getCachedCompatibilityScore(
  team1: Team, 
  team2: Team, 
  calculateFn: (t1: Team, t2: Team) => number
): number {
  const cacheKey = getCacheKey(team1.id, team2.id);
  
  // Return from cache if available
  if (compatibilityScoreCache[cacheKey] !== undefined) {
    return compatibilityScoreCache[cacheKey];
  }
  
  // Calculate and cache the score
  const score = calculateFn(team1, team2);
  compatibilityScoreCache[cacheKey] = score;
  
  return score;
}

/**
 * Clear the compatibility score cache
 */
export function clearCompatibilityCache(): void {
  Object.keys(compatibilityScoreCache).forEach(key => {
    delete compatibilityScoreCache[key];
  });
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
  Object.keys(matchHistoryCache).forEach(key => {
    delete matchHistoryCache[key];
  });
}
