
import { PlayoffMatch } from "../../../types";

/**
 * Specialized linker for play-in matches
 */
export class PlayInLinker {
  /**
   * Link play-in matches to the main bracket
   * @param matches All bracket matches
   */
  static linkPlayInMatches(matches: PlayoffMatch[]): void {
    // Extract play-in matches and first round matches
    const playInMatches = matches.filter(m => 
      m.matchType === "play-in" || m.matchType === "play-in-2"
    );
    
    const firstRoundMatches = matches.filter(m => 
      m.matchType === "winners" && m.round === 1
    );
    
    // Link each play-in match to its target match in first round
    playInMatches.forEach(playInMatch => {
      const targetMatch = this.findTargetMatchForPlayIn(playInMatch, firstRoundMatches);
      if (targetMatch) {
        playInMatch.nextWinMatchId = targetMatch.id;
      }
    });
  }
  
  /**
   * Find the target match for a play-in match
   * @param playInMatch - The play-in match
   * @param firstRoundMatches - Array of first round matches
   * @returns The target match or null
   */
  private static findTargetMatchForPlayIn(
    playInMatch: PlayoffMatch, 
    firstRoundMatches: PlayoffMatch[]
  ): PlayoffMatch | null {
    return firstRoundMatches.find(m => 
      m.team1Id === `play-in-${playInMatch.position}` || 
      m.team2Id === `play-in-${playInMatch.position}`
    ) || null;
  }
}
