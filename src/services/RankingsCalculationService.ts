
import { Team, Match, Ranking } from "@/types";
import { createRankingObject } from "@/utils/rankingUtils/createRankingObject";
import { sortRankings, updateRankChanges, saveRankingsToStorage } from "@/utils/rankingUtils";

export const calculateRankings = async (
  teams: Team[] | undefined,
  matches: Match[] | undefined,
  previousRankings: Record<string, number>
): Promise<Ranking[]> => {
  if (!teams || teams.length === 0) {
    return [];
  }

  try {
    // Create ranking objects for each team
    const unsortedRankings = await Promise.all(
      teams.map(team => createRankingObject(team, teams, matches, previousRankings))
    );

    // Sort the rankings by power score
    const sortedRankings = sortRankings(unsortedRankings, 'powerScore', 'desc');

    // Update rank changes
    const finalRankings = updateRankChanges(sortedRankings);

    // Save current rankings to localStorage
    saveRankingsToStorage(finalRankings);

    return finalRankings;
  } catch (error) {
    console.error('Error calculating rankings:', error);
    return [];
  }
};
