
import { PlayoffMatch } from "../../../types";

/**
 * Utility class for organizing playoff matches by type and round
 */
export class PlayoffMatchOrganizer {
  /**
   * Organize matches by round for a specific match type
   * @param matchType Type of matches to organize
   * @param matches All bracket matches
   * @returns Object with rounds as keys and arrays of matches as values
   */
  static organizeByRound(
    matchType: string, 
    matches: PlayoffMatch[]
  ): Record<number, PlayoffMatch[]> {
    // Filter matches by type
    const filteredMatches = matches.filter(m => m.matchType === matchType);
    
    // Group by round
    const matchesByRound: Record<number, PlayoffMatch[]> = {};
    
    filteredMatches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });
    
    return matchesByRound;
  }
  
  /**
   * Get the highest round number for a specific match type
   * @param matchType Type of matches to check
   * @param matches All bracket matches
   * @returns Highest round number
   */
  static getMaxRound(matchType: string, matches: PlayoffMatch[]): number {
    const filteredMatches = matches.filter(m => m.matchType === matchType);
    if (filteredMatches.length === 0) return 0;
    
    return Math.max(...filteredMatches.map(m => m.round));
  }
  
  /**
   * Get matches for a specific type and round
   * @param matchType Type of matches to get
   * @param round Round number
   * @param matches All bracket matches
   * @returns Array of matches
   */
  static getMatchesForRound(
    matchType: string, 
    round: number, 
    matches: PlayoffMatch[]
  ): PlayoffMatch[] {
    return matches.filter(m => 
      m.matchType === matchType && 
      m.round === round
    );
  }
}
