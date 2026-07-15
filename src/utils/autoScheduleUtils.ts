import { Team } from '@/types';
import { errorLog } from '@/utils/logger';

/**
 * Structure to represent a team pairing with compatibility score
 */
export interface TeamPair {
  team1: Team;
  team2: Team;
  compatibilityScore: number;
}

/**
 * Check if two teams have played each other before
 */
async function haveTeamsPlayed(team1Id: string, team2Id: string): Promise<boolean> {
  try {
    const { haveTeamsPlayedBefore } = await import('@/services/matches/MatchReadService');
    return await haveTeamsPlayedBefore(team1Id, team2Id);
  } catch (error) {
    errorLog('Error in haveTeamsPlayed:', error);
    // Return false as a fallback to avoid blocking match generation
    return false;
  }
}

/**
 * Filter pairs to remove any that have played before
 */
export async function filterPairsWithPreviousMatches(pairs: TeamPair[]): Promise<TeamPair[]> {
  const filteredPairs: TeamPair[] = [];

  // Process each pair sequentially to check match history
  for (const pair of pairs) {
    const havePlayed = await haveTeamsPlayed(pair.team1.id, pair.team2.id);
    if (!havePlayed) {
      filteredPairs.push(pair);
    }
  }

  return filteredPairs;
}
