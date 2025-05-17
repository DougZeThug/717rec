
import { IBracketLinker } from "../IBracketLinker";
import { PlayoffMatch, PlayoffMatchType, BracketMatch } from "../../types";

/**
 * Base abstract class for playoff bracket linkers
 * Provides common functionality for all playoff bracket linkers
 */
export abstract class AbstractPlayoffBracketLinker implements IBracketLinker<PlayoffMatch> {
  protected bracketId: string;
  protected matchMap: Record<string, PlayoffMatch>;
  
  /**
   * Create a new AbstractPlayoffBracketLinker
   * @param bracketId The unique identifier for the bracket
   * @param matchMap Optional pre-existing map of matches
   */
  constructor(
    bracketId: string,
    matchMap: Record<string, PlayoffMatch> = {} as Record<string, PlayoffMatch>
  ) {
    this.bracketId = bracketId;
    this.matchMap = matchMap;
  }
  
  /**
   * Get the map of all matches by their key
   * @returns Match map
   */
  getMatchMap(): Record<string, PlayoffMatch> {
    return this.matchMap;
  }
  
  /**
   * Create a key for a match in the matchMap
   * @param matchType Type of match
   * @param round Round number
   * @param position Position in the round
   * @returns Unique key for the match
   */
  protected createMatchKey(matchType: PlayoffMatchType, round: number, position: number): string {
    return `${matchType}-${round}-${position}`;
  }
  
  /**
   * Add a match to the match map
   * @param match The match to add
   * @param matchType Type of match
   * @param round Round number
   * @param position Position in the round
   */
  protected addMatchToMap(match: PlayoffMatch, matchType: PlayoffMatchType, round: number, position: number): void {
    const key = this.createMatchKey(matchType, round, position);
    this.matchMap[key] = match;
  }
  
  /**
   * Get a match from the match map
   * @param matchType Type of match
   * @param round Round number
   * @param position Position in the round
   * @returns The match or undefined if not found
   */
  protected getMatch(matchType: PlayoffMatchType, round: number, position: number): PlayoffMatch | undefined {
    const key = this.createMatchKey(matchType, round, position);
    return this.matchMap[key];
  }
  
  /**
   * Link matches in the bracket to create the tournament flow
   * @param matches Array of matches to link
   * @param rounds Number of rounds in the bracket
   */
  abstract linkMatches(matches: PlayoffMatch[], rounds: number): void;
  
  /**
   * Generate the finals match(es)
   * @param matches Current array of matches
   * @returns Updated array of matches with finals added
   */
  abstract generateFinals(matches: PlayoffMatch[]): PlayoffMatch[];
  
  /**
   * Create a reset match for the finals if needed
   * @returns The newly created reset match
   */
  abstract createResetMatch(): PlayoffMatch;
}
