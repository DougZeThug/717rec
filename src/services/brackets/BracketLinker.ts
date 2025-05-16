
import { BracketMatch } from "./types";

/**
 * Handles linking of matches between different parts of a bracket
 */
export class BracketLinker {
  /**
   * Link play-in matches to the first round of the winners bracket
   * @param matches Array of all bracket matches
   */
  static linkPlayInMatches(matches: BracketMatch[]): void {
    const playInMatches = matches.filter(m => m.matchType === "play-in");
    const firstRoundMatches = matches.filter(m => m.matchType === "winners" && m.round === 1);
    
    playInMatches.forEach(playInMatch => {
      // Find first round match that has a placeholder team ID matching this play-in
      const targetMatch = firstRoundMatches.find(m => 
        m.team1Id === `play-in-${playInMatch.position}` || 
        m.team2Id === `play-in-${playInMatch.position}`
      );
      
      if (targetMatch) {
        playInMatch.nextWinMatchId = targetMatch.id;
      }
    });
  }

  /**
   * Connect winners bracket to losers bracket and finals
   * @param matches Array of all bracket matches
   */
  static connectBrackets(matches: BracketMatch[]): void {
    // Implementation would depend on the specific tournament format
    // This is a placeholder for future implementation
  }
}
