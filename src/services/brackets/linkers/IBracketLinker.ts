
import { BaseBracketMatch } from "../types";

/**
 * Interface for bracket linker implementations
 * Defines the common methods that all bracket linkers must implement
 */
export interface IBracketLinker<TMatch extends BaseBracketMatch> {
  /**
   * Get the map of all matches by their key
   * @returns Match map
   */
  getMatchMap(): Record<string, TMatch>;
  
  /**
   * Link matches in the bracket to create the tournament flow
   * @param matches Array of matches to link
   * @param rounds Number of rounds in the bracket
   */
  linkMatches(matches: TMatch[], rounds: number): void;
  
  /**
   * Generate the finals match(es)
   * @param matches Current array of matches
   * @returns Updated array of matches with finals added
   */
  generateFinals(matches: TMatch[]): TMatch[];
  
  /**
   * Create a reset match for the finals if needed
   * @returns The newly created reset match
   */
  createResetMatch(): TMatch;
}
