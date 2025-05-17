
import { BaseBracketMatch } from "../../types";

/**
 * Base interface for all bracket linker implementations
 */
export interface IBracketLinker<TMatch extends BaseBracketMatch> {
  /**
   * Get the map of all matches by their key
   * @returns Match map
   */
  getMatchMap(): Record<string, TMatch>;
  
  /**
   * Link all matches in the bracket
   * @param matches Array of all matches
   * @param rounds Number of rounds in the bracket
   */
  linkMatches(matches: TMatch[], rounds: number): void;
  
  /**
   * Generate finals matches
   * @param matches Array of all matches
   * @returns Updated matches array with finals added
   */
  generateFinals(matches: TMatch[]): TMatch[];
  
  /**
   * Create a reset match for the grand finals
   * @returns The newly created reset match
   */
  createResetMatch(): TMatch;
}

/**
 * Interface for match map operations
 */
export interface IMatchMapOperations<TMatch extends BaseBracketMatch> {
  /**
   * Add a match to the match map
   * @param match The match to add
   * @param matchType Type of match
   * @param round Round number
   * @param position Position in the round
   */
  addMatchToMap(match: TMatch, matchType: string, round: number, position: number): void;
  
  /**
   * Get a match from the match map
   * @param matchType Type of match
   * @param round Round number
   * @param position Position in the round
   * @returns Match or undefined
   */
  getMatchFromMap(matchType: string, round: number, position: number): TMatch | undefined;
  
  /**
   * Create a key for a match in the map
   * @param matchType Type of match
   * @param round Round number
   * @param position Position in the round
   * @returns Unique key
   */
  createMatchKey(matchType: string, round: number, position: number): string;
}

/**
 * Interface for bracket connection operations
 */
export interface IBracketConnectionOperations<TMatch extends BaseBracketMatch> {
  /**
   * Link winners bracket matches
   * @param matches Array of all matches
   * @param rounds Number of rounds
   */
  linkWinnersBracket(matches: TMatch[], rounds: number): void;
  
  /**
   * Link losers bracket matches
   * @param matches Array of all matches
   * @param winnerRounds Number of rounds in winners bracket
   */
  linkLosersBracket(matches: TMatch[], winnerRounds: number): void;
  
  /**
   * Link play-in matches to the first round
   * @param matches Array of all matches
   */
  linkPlayInMatches(matches: TMatch[]): void;
  
  /**
   * Connect different sections of the bracket
   * @param matches Array of all matches
   */
  connectBracketSections(matches: TMatch[]): void;
}
