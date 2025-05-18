
import { PlayoffBracket, PlayoffMatch, Team } from "@/types";
import { BracketState } from "./types";

/**
 * Determines the champion of a bracket if it exists
 * @param matches All matches in the bracket
 * @returns Champion ID or null if not determined
 */
export const determineChampion = (matches: PlayoffMatch[]): string | null => {
  // Find champion if exists (winner of the finals match)
  if (matches.length > 0) {
    const finalMatch = matches.find(m => 
      m.matchType === 'finals' && 
      m.winnerId !== null
    );
    if (finalMatch) {
      return finalMatch.winnerId!;
    }
  }
  return null;
};

/**
 * Converts bracket state to a valid value
 * @param stateValue The state value from the database
 * @returns A valid bracket state
 */
export const normalizeBracketState = (stateValue: string | null): BracketState => {
  if (!stateValue) return undefined;
  
  if (["pending", "underway", "complete"].includes(stateValue)) {
    return stateValue as BracketState;
  }
  
  // Default to pending if invalid value
  return "pending";
};

/**
 * Validates and normalizes bracket format
 * @param format The format value from the database
 * @returns A valid bracket format
 */
export const normalizeBracketFormat = (format: string | null): "Single Elimination" | "Double Elimination" => {
  if (format === "Double Elimination" || format === "Single Elimination") {
    return format;
  }
  return "Single Elimination"; // Default format
};
