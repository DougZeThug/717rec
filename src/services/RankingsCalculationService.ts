import { Match, Ranking, Team } from '@/types';
import { errorLog } from '@/utils/logger';
import { sortRankings, updateRankChanges } from '@/utils/rankingUtils';
import { createRankingObject } from '@/utils/rankingUtils/createRankingObject';
import { fetchDivisionWeights } from '@/utils/rankingUtils/divisionWeightsCache';

export const calculateRankings = async (
  teams: Team[] | undefined,
  matches: Match[] | undefined,
  previousRankings: Record<string, number>
): Promise<Ranking[]> => {
  if (!teams || teams.length === 0) {
    return [];
  }

  try {
    // Fetch division weights ONCE before processing all teams
    const divisionWeights = await fetchDivisionWeights();

    // Create ranking objects for each team (now synchronous)
    const unsortedRankings = teams.map((team) =>
      createRankingObject(team, teams, matches, previousRankings, divisionWeights)
    );

    // Sort the rankings by power score
    const sortedRankings = sortRankings(unsortedRankings, 'powerScore', 'desc');

    // Update rank changes
    const finalRankings = updateRankChanges(sortedRankings);

    return finalRankings;
  } catch (error) {
    errorLog('Error calculating rankings:', error);
    return [];
  }
};
