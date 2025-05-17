
import { PlayoffMatch, PlayoffMatchType } from "../../../types";

/**
 * Utility class for organizing playoff matches by round and type
 */
export class PlayoffMatchOrganizer {
  /**
   * Group matches by their matchType and round
   * @param matches Array of all playoff matches
   * @returns Object with matches grouped by type and round
   */
  static organizeByTypeAndRound(matches: PlayoffMatch[]): Record<PlayoffMatchType, Record<number, PlayoffMatch[]>> {
    const result: Record<PlayoffMatchType, Record<number, PlayoffMatch[]>> = {
      'winners': {},
      'losers': {},
      'finals': {},
      'play-in': {},
      'play-in-2': {}
    };
    
    matches.forEach(match => {
      if (!result[match.matchType][match.round]) {
        result[match.matchType][match.round] = [];
      }
      result[match.matchType][match.round].push(match);
    });
    
    return result;
  }
  
  /**
   * Group matches by round for a specific match type
   * @param matchType Type of matches to filter
   * @param matches All bracket matches
   * @returns Object with matches grouped by round
   */
  static organizeByRound(matchType: PlayoffMatchType, matches: PlayoffMatch[]): Record<number, PlayoffMatch[]> {
    const filteredMatches = matches.filter(m => m.matchType === matchType);
    const rounds: Record<number, PlayoffMatch[]> = {};
    
    filteredMatches.forEach(match => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });
    
    return rounds;
  }
  
  /**
   * Find the maximum round number for a specific match type
   * @param matchType Type of matches to check
   * @param matches All bracket matches
   * @returns The highest round number
   */
  static findMaxRound(matchType: PlayoffMatchType, matches: PlayoffMatch[]): number {
    const byRound = this.organizeByRound(matchType, matches);
    
    return Math.max(
      ...Object.keys(byRound).map(Number),
      0 // Provide fallback if there are no rounds
    );
  }
}
