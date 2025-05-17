
import { BracketMatch, MatchType } from "../../types";

/**
 * Utility classes for bracket linking operations
 */
export class MatchOrganizer {
  /**
   * Organize matches by round for a specific bracket type
   * @param matchType Type of bracket section (winners, losers)
   * @param matches All matches
   * @returns Matches organized by round
   */
  static organizeByRound<T extends BracketMatch>(
    matchType: string,
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
   * Find matches of a specific type and round
   * @param matches Array of all matches
   * @param matchType Match type to find
   * @param round Round number
   * @param position Optional position in round
   * @returns Matching matches
   */
  static findMatches<T extends BracketMatch>(
    matches: T[],
    matchType: string,
    round: number,
    position?: number
  ): T[] {
    return matches.filter(match => 
      match.matchType === matchType &&
      match.round === round &&
      (position === undefined || match.position === position)
    );
  }
}

export class ConnectionCalculator {
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
}

export class PositionResolver {
  /**
   * Calculate the next round position for a match
   * @param currentPosition Current position in round
   * @returns Position in next round
   */
  static calculateNextRoundPosition(currentPosition: number): number {
    return Math.floor((currentPosition - 1) / 2) + 1;
  }
  
  /**
   * Find a match by specific position criteria
   * @param matches Array of matches
   * @param matchType Type of match to find
   * @param round Round number
   * @param position Position in round
   * @returns Found match or null
   */
  static findMatchByPosition<T extends BracketMatch>(
    matches: T[],
    matchType: string,
    round: number,
    position: number
  ): T | null {
    return matches.find(m => 
      m.matchType === matchType && 
      m.round === round && 
      m.position === position
    ) || null;
  }
}
