
import { BracketMatch, MatchType, PlayoffMatch, PlayoffMatchType } from "../../types";
import { MatchTypeAdapter } from "../../utils/TypeAdapter";

/**
 * Types and interfaces for bracket linking operations
 */

/**
 * Interface for match mapping operations
 */
export interface IMatchMapper<TMatch extends BracketMatch> {
  /**
   * Add a match to the match map
   * @param match The match to add
   * @param matchType Type of match (winners, losers, finals)
   * @param round Round number
   * @param position Position in the round
   */
  addMatch(match: TMatch, matchType: string, round: number, position: number): void;
  
  /**
   * Get a match from the match map
   * @param matchType Type of match (winners, losers, finals)
   * @param round Round number
   * @param position Position in the round
   * @returns The match or undefined if not found
   */
  getMatch(matchType: string, round: number, position: number): TMatch | undefined;
  
  /**
   * Create a key for a match in the matchMap
   * @param matchType Type of match (winners, losers, finals)
   * @param round Round number
   * @param position Position in the round
   * @returns Unique key for the match
   */
  createKey(matchType: string, round: number, position: number): string;
}

/**
 * Interface for match linking operations
 */
export interface IMatchLinker<TMatch extends BracketMatch> {
  /**
   * Link winners bracket matches
   * @param matches Array of all matches
   * @param rounds Number of rounds in winners bracket
   */
  linkWinnersMatches(matches: TMatch[], rounds: number): void;
  
  /**
   * Link losers bracket matches
   * @param matches Array of all matches
   * @param winnerRounds Number of rounds in winners bracket
   */
  linkLosersMatches(matches: TMatch[], winnerRounds: number): void;
  
  /**
   * Connect matches between different bracket sections
   * @param matches Array of all matches
   */
  connectBrackets(matches: TMatch[]): void;
}

/**
 * Interface for finals generation
 */
export interface IFinalsGenerator<TMatch extends BracketMatch> {
  /**
   * Generate finals match(es)
   * @param matches Array of all matches
   * @returns Updated array with finals matches
   */
  generateFinals(matches: TMatch[]): TMatch[];
  
  /**
   * Create reset match for grand finals
   * @returns Reset match
   */
  createResetMatch(): TMatch;
}

/**
 * Type Guard to check if a match is a PlayoffMatch
 * @param match The match to check
 * @returns True if it's a PlayoffMatch
 */
export function isPlayoffMatch(match: any): match is PlayoffMatch {
  return 'team1Score' in match && 'team2Score' in match;
}

/**
 * Convert PlayoffMatchType to standard MatchType
 * @param matchType The match type to convert
 * @returns The standard MatchType
 */
export function toMatchType(matchType: PlayoffMatchType): MatchType {
  return MatchTypeAdapter.toStandardMatchType(matchType);
}
