
import { PlayoffMatch } from "@/types";
import { transformMatches } from "@/utils/matchTransformer";

/**
 * Transforms single elimination matches from database format to application format
 * @param matchesData Raw matches data from the database
 * @returns Transformed matches in application format
 */
export const transformSingleEliminationMatches = (matchesData: any[]): PlayoffMatch[] => {
  return transformMatches(matchesData);
};
