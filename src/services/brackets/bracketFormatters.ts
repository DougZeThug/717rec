
import { PlayoffBracket, PlayoffMatch, Team } from "@/types";
import { BRACKET_FORMATS, BRACKET_STATES, BracketState, BracketFormat } from "@/constants/brackets";

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
  if (!stateValue) return BRACKET_STATES.PENDING;
  
  if (Object.values(BRACKET_STATES).includes(stateValue as any)) {
    return stateValue as BracketState;
  }
  
  // Default to pending if invalid value
  return BRACKET_STATES.PENDING;
};

/**
 * Validates and normalizes bracket format
 * @param format The format value from the database
 * @returns A valid bracket format
 */
export const normalizeBracketFormat = (format: string | null): BracketFormat => {
  if (format === BRACKET_FORMATS.DOUBLE || format === BRACKET_FORMATS.SINGLE) {
    return format;
  }
  return BRACKET_FORMATS.SINGLE; // Default format
};
