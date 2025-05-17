
import { nanoid } from "nanoid";
import { BracketMatch, MatchType } from "../types";
import { IBracketLinker } from "./IBracketLinker";

/**
 * Base abstract class for bracket linkers
 * Provides common functionality for all bracket linkers
 */
export abstract class BaseBracketLinker<TMatch extends BracketMatch> implements IBracketLinker<TMatch> {
  protected bracketId: string;
  protected matchMap: Record<string, TMatch>;
  
  /**
   * Create a new BaseBracketLinker
   * @param bracketId The unique identifier for the bracket
   * @param matchMap Optional pre-existing map of matches
   */
  constructor(
    bracketId: string,
    matchMap: Record<string, TMatch> = {} as Record<string, TMatch>
  ) {
    this.bracketId = bracketId;
    this.matchMap = matchMap;
  }
  
  /**
   * Get the map of all matches by their key
   * @returns Match map
   */
  getMatchMap(): Record<string, TMatch> {
    return this.matchMap;
  }
  
  /**
   * Create a key for a match in the matchMap
   * @param matchType Type of match (winners, losers, finals)
   * @param round Round number
   * @param position Position in the round
   * @returns Unique key for the match
   */
  protected createMatchKey(matchType: MatchType, round: number, position: number): string {
    return `${matchType}-${round}-${position}`;
  }
  
  /**
   * Add a match to the match map
   * @param match The match to add
   * @param matchType Type of match (winners, losers, finals)
   * @param round Round number
   * @param position Position in the round
   */
  protected addMatchToMap(match: TMatch, matchType: MatchType, round: number, position: number): void {
    const key = this.createMatchKey(matchType, round, position);
    this.matchMap[key] = match;
  }
  
  /**
   * Get a match from the match map
   * @param matchType Type of match (winners, losers, finals)
   * @param round Round number
   * @param position Position in the round
   * @returns The match or undefined if not found
   */
  protected getMatch(matchType: MatchType, round: number, position: number): TMatch | undefined {
    const key = this.createMatchKey(matchType, round, position);
    return this.matchMap[key];
  }
  
  /**
   * Organize matches by type and round
   * @param matches All bracket matches
   * @returns Object with matches grouped by type and round
   */
  protected organizeMatchesByTypeAndRound(matches: TMatch[]): Record<MatchType, Record<number, TMatch[]>> {
    const result: Record<MatchType, Record<number, TMatch[]>> = {
      'winners': {},
      'losers': {},
      'finals': {},
      'play-in': {}
    };
    
    matches.forEach(match => {
      const matchType = match.matchType as MatchType;
      if (!result[matchType][match.round]) {
        result[matchType][match.round] = [];
      }
      result[matchType][match.round].push(match);
    });
    
    return result;
  }
  
  /**
   * Link matches in the bracket to create the tournament flow
   * @param matches Array of matches to link
   * @param rounds Number of rounds in the bracket
   */
  abstract linkMatches(matches: TMatch[], rounds: number): void;
  
  /**
   * Generate the finals match(es)
   * @param matches Current array of matches
   * @returns Updated array of matches with finals added
   */
  abstract generateFinals(matches: TMatch[]): TMatch[];
  
  /**
   * Create a reset match for the finals if needed
   * @returns The newly created reset match
   */
  abstract createResetMatch(): TMatch;
}
