
import { BaseBracketMatch, BracketMatch, MatchType } from "../../types";
import { IBracketLinker, IMatchMapOperations } from "../interfaces/BracketLinkerInterfaces";

/**
 * Abstract base class for bracket linkers with common functionality
 */
export abstract class AbstractBracketLinker<TMatch extends BaseBracketMatch> implements IBracketLinker<TMatch>, IMatchMapOperations<TMatch> {
  protected bracketId: string;
  protected matchMap: Record<string, TMatch>;
  
  /**
   * Create a new AbstractBracketLinker
   * @param bracketId ID of the bracket
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
  createMatchKey(matchType: string, round: number, position: number): string {
    return `${matchType}-${round}-${position}`;
  }
  
  /**
   * Add a match to the match map
   * @param match The match to add
   * @param matchType Type of match (winners, losers, finals)
   * @param round Round number
   * @param position Position in the round
   */
  addMatchToMap(match: TMatch, matchType: string, round: number, position: number): void {
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
  getMatchFromMap(matchType: string, round: number, position: number): TMatch | undefined {
    const key = this.createMatchKey(matchType, round, position);
    return this.matchMap[key];
  }
  
  /**
   * Organize matches by type and round
   * @param matches All bracket matches
   * @returns Object with matches grouped by type and round
   */
  protected organizeMatchesByTypeAndRound(matches: TMatch[]): Record<string, Record<number, TMatch[]>> {
    const result: Record<string, Record<number, TMatch[]>> = {
      'winners': {},
      'losers': {},
      'finals': {},
      'play-in': {}
    };
    
    matches.forEach(match => {
      const matchType = match.matchType as string;
      if (!result[matchType]) {
        result[matchType] = {};
      }
      
      if (!result[matchType][match.round]) {
        result[matchType][match.round] = [];
      }
      
      result[matchType][match.round].push(match);
    });
    
    return result;
  }
  
  /**
   * Link all matches in the bracket to create the tournament flow
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
