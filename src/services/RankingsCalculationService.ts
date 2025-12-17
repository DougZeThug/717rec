
import { Team, Match, Ranking } from "@/types";
import { createRankingObject } from "@/utils/rankingUtils/createRankingObject";
import { sortRankings, updateRankChanges, saveRankingsToStorage } from "@/utils/rankingUtils";
import { fetchDivisionWeights } from "@/utils/rankingUtils/divisionWeightsCache";
import { errorLog } from "@/utils/logger";

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
    const unsortedRankings = teams.map(team => 
      createRankingObject(team, teams, matches, previousRankings, divisionWeights)
    );

    // Sort the rankings by power score
    const sortedRankings = sortRankings(unsortedRankings, 'powerScore', 'desc');

    // Update rank changes
    const finalRankings = updateRankChanges(sortedRankings);

    // Save current rankings to localStorage
    saveRankingsToStorage(finalRankings);

    return finalRankings;
  } catch (error) {
    errorLog('Error calculating rankings:', error);
    return [];
  }
};
