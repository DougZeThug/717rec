
import { PlayoffMatch } from "../../../types";
import { PlayoffMatchOrganizer } from "./PlayoffMatchOrganizer";
import { PlayoffConnectionCalculator } from "./PlayoffConnectionCalculator";

/**
 * Specialized linker for winners bracket matches
 */
export class WinnersBracketLinker {
  /**
   * Link winners bracket matches to both next winners round and losers bracket
   * @param matches - All bracket matches
   * @param rounds - Number of rounds in winners bracket
   */
  static linkWinnersBracket(matches: PlayoffMatch[], rounds: number): void {
    // Organize matches by round
    const winnersByRound = PlayoffMatchOrganizer.organizeByRound('winners', matches);
    
    // Link each round to the next
    for (let round = 1; round < rounds; round++) {
      const currentRoundMatches = winnersByRound[round] || [];
      const nextRoundMatches = winnersByRound[round + 1] || [];
      
      currentRoundMatches.forEach((match) => {
        // Link to next round
        const nextPos = PlayoffConnectionCalculator.calculateNextRoundPosition(match.position);
        const nextMatch = nextRoundMatches.find(m => m.position === nextPos);
        
        if (nextMatch) {
          match.nextWinMatchId = nextMatch.id;
        }
        
        // Link to losers bracket
        this.linkWinnerMatchToLosersBracket(match, matches, round);
      });
    }
    
    // Link final winners bracket match to grand finals
    this.linkWinnersFinalToGrandFinals(matches, rounds);
  }
  
  /**
   * Link a winner's bracket match loser to losers bracket
   */
  private static linkWinnerMatchToLosersBracket(
    winnerMatch: PlayoffMatch,
    allMatches: PlayoffMatch[],
    round: number
  ): void {
    const loserRound = PlayoffConnectionCalculator.calculateLoserDestinationRound(round);
    const loserPosition = PlayoffConnectionCalculator.calculateLoserDestinationPosition(
      winnerMatch.position, round
    );
    
    const loserMatches = allMatches.filter(m => 
      m.matchType === 'losers' && m.round === loserRound
    );
    
    const destination = loserMatches.find(m => m.position === loserPosition);
    
    if (destination) {
      winnerMatch.nextLoseMatchId = destination.id;
    }
  }
  
  /**
   * Link winners final to grand finals
   */
  static linkWinnersFinalToGrandFinals(
    matches: PlayoffMatch[],
    rounds: number
  ): void {
    const winnersFinal = matches.find(m => 
      m.matchType === 'winners' && m.round === rounds && m.position === 1
    );
    
    const grandFinal = matches.find(m => 
      m.matchType === 'finals' && m.round === 1 && m.position === 1
    );
    
    if (winnersFinal && grandFinal) {
      winnersFinal.nextWinMatchId = grandFinal.id;
    }
  }
}
