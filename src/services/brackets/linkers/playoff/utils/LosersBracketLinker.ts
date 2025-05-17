
import { PlayoffMatch } from "../../../types";
import { PlayoffMatchOrganizer } from "./PlayoffMatchOrganizer";
import { PlayoffConnectionCalculator } from "./PlayoffConnectionCalculator";

/**
 * Specialized linker for losers bracket matches
 */
export class LosersBracketLinker {
  /**
   * Link losers bracket matches to next rounds
   * @param matches - All bracket matches
   * @param rounds - Number of rounds in winners bracket
   */
  static linkLosersBracket(matches: PlayoffMatch[], rounds: number): void {
    // Organize matches by round
    const losersByRound = PlayoffMatchOrganizer.organizeByRound('losers', matches);
    
    // Calculate the maximum loser round
    const maxLoserRound = Math.max(
      ...Object.keys(losersByRound).map(Number),
      0 // Provide fallback if there are no losers rounds
    );
    
    // Link each round to the next
    for (let round = 1; round < maxLoserRound; round++) {
      const currentRoundMatches = losersByRound[round] || [];
      const nextRoundMatches = losersByRound[round + 1] || [];
      
      currentRoundMatches.forEach((match) => {
        // Link to next round
        const nextPos = PlayoffConnectionCalculator.calculateNextRoundPosition(match.position);
        const nextMatch = nextRoundMatches.find(m => m.position === nextPos);
        
        if (nextMatch) {
          match.nextWinMatchId = nextMatch.id;
        }
      });
    }
    
    // Link the final losers bracket match to the grand finals
    this.linkLosersFinalToGrandFinals(matches, maxLoserRound);
  }
  
  /**
   * Link losers final to grand finals
   */
  static linkLosersFinalToGrandFinals(
    matches: PlayoffMatch[],
    maxLoserRound: number
  ): void {
    const losersFinal = matches.find(m => 
      m.matchType === 'losers' && m.round === maxLoserRound && m.position === 1
    );
    
    const grandFinal = matches.find(m => 
      m.matchType === 'finals' && m.round === 1 && m.position === 1
    );
    
    if (losersFinal && grandFinal) {
      losersFinal.nextWinMatchId = grandFinal.id;
    }
  }
}
