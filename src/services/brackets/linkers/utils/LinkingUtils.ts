
import { BracketMatch, MatchType } from "../../types";

/**
 * Utility functions for bracket linking operations
 */
export class LinkingUtils {
  /**
   * Calculate the appropriate losers bracket round for a loser from winners bracket
   * @param winnersRound The round in winners bracket
   * @returns The corresponding round in losers bracket
   */
  static calculateLoserDestinationRound(winnersRound: number): number {
    // Standard DE bracket maps losers from winners round 1 to losers round 1,
    // losers from winners round 2 to losers round 3, etc.
    return winnersRound * 2 - 1;
  }
  
  /**
   * Calculate the position in the losers bracket for a winner's bracket loser
   * @param position Position in the winners bracket
   * @param round Round in the winners bracket
   * @returns Position in the losers bracket
   */
  static calculateLoserDestinationPosition(position: number, round: number): number {
    // This calculation depends on the specific bracket structure
    return Math.ceil(position / 2);
  }
  
  /**
   * Find matches of a specific type and round in an array of matches
   * @param matches Array of all matches
   * @param matchType Type of match to find
   * @param round Round number to find
   * @returns Array of matches matching the criteria
   */
  static findMatchesByTypeAndRound<T extends BracketMatch>(
    matches: T[], 
    matchType: MatchType, 
    round: number
  ): T[] {
    return matches.filter(m => 
      m.matchType === matchType && 
      m.round === round
    );
  }
  
  /**
   * Organize matches by round for a specific bracket type
   * @param matchType Type of bracket (winners, losers)
   * @param matches All matches
   * @returns Matches organized by round
   */
  static organizeMatchesByRound<T extends BracketMatch>(
    matchType: MatchType, 
    matches: T[]
  ): Record<number, T[]> {
    const matchesByRound: Record<number, T[]> = {};
    
    matches
      .filter(m => m.matchType === matchType)
      .forEach(match => {
        if (!matchesByRound[match.round]) {
          matchesByRound[match.round] = [];
        }
        matchesByRound[match.round].push(match);
      });
      
    return matchesByRound;
  }

  /**
   * Link matches to their next round opponents
   * @param currentRoundMatches Matches in the current round
   * @param nextRoundMatches Matches in the next round
   */
  static linkMatchesToNextRound<T extends BracketMatch>(
    currentRoundMatches: T[],
    nextRoundMatches: T[]
  ): void {
    currentRoundMatches.forEach((match, idx) => {
      // Calculate next round position (integer division)
      const nextPos = Math.floor(idx / 2);
      
      // Link to next match if it exists
      if (nextPos < nextRoundMatches.length) {
        match.nextWinMatchId = nextRoundMatches[nextPos].id;
      }
    });
  }
}
