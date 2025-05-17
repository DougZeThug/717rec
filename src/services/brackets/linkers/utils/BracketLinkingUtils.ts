
import { BracketMatch, MatchType, PlayoffMatch, PlayoffMatchType } from "../../types";
import { IMatchMapper } from "../types/MatchLinkingTypes";
import { LinkingUtils } from "./LinkingUtils";

/**
 * Utility class for bracket linking operations
 */
export class BracketLinkingUtils {
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
  
  /**
   * Link winners bracket matches to losers bracket
   * @param winnersMatches Matches from winners bracket
   * @param losersMatches Matches from losers bracket
   * @param winnerRound Current round in winners bracket
   */
  static linkWinnersToLosers<T extends BracketMatch>(
    winnersMatches: T[],
    losersMatches: T[],
    winnerRound: number
  ): void {
    winnersMatches.forEach((match, idx) => {
      const position = idx + 1;
      const loserRound = LinkingUtils.calculateLoserDestinationRound(winnerRound);
      const loserPosition = LinkingUtils.calculateLoserDestinationPosition(position, winnerRound);
      
      const destination = losersMatches.find(m => 
        m.matchType === 'losers' && 
        m.round === loserRound && 
        m.position === loserPosition
      );
      
      if (destination) {
        match.nextLoseMatchId = destination.id;
      }
    });
  }
  
  /**
   * Link final winners bracket match to grand finals
   * @param matches All matches
   * @param rounds Number of rounds in winners bracket
   */
  static linkWinnersFinalToGrandFinals<T extends BracketMatch>(matches: T[], rounds: number): void {
    // Find winners final
    const winnersFinal = matches.find(m => 
      m.matchType === 'winners' && 
      m.round === rounds && 
      m.position === 1
    );
    
    // Find grand finals (first match)
    const grandFinal = matches.find(m => m.matchType === 'finals' && m.round === 1);
    
    // Link if both exist
    if (winnersFinal && grandFinal) {
      winnersFinal.nextWinMatchId = grandFinal.id;
    }
  }
  
  /**
   * Link final losers bracket match to grand finals
   * @param matches All matches
   * @param maxLoserRound Maximum round in losers bracket
   */
  static linkLosersFinalToGrandFinals<T extends BracketMatch>(matches: T[], maxLoserRound: number): void {
    // Find losers final
    const losersFinal = matches.find(m => 
      m.matchType === 'losers' && 
      m.round === maxLoserRound
    );
    
    // Find grand finals (first match)
    const grandFinal = matches.find(m => m.matchType === 'finals' && m.round === 1);
    
    // Link if both exist
    if (losersFinal && grandFinal) {
      losersFinal.nextWinMatchId = grandFinal.id;
    }
  }
  
  /**
   * Find matches by specific criteria
   * @param matches Array of all matches
   * @param matchType Type of match to find
   * @param round Round number
   * @param position Position in round (optional)
   * @returns Array of matching matches
   */
  static findMatches<T extends BracketMatch>(
    matches: T[], 
    matchType: MatchType | PlayoffMatchType,
    round: number,
    position?: number
  ): T[] {
    return matches.filter(m => {
      const matchTypeMatches = m.matchType === matchType;
      const roundMatches = m.round === round;
      const positionMatches = position === undefined || m.position === position;
      
      return matchTypeMatches && roundMatches && positionMatches;
    });
  }
}
