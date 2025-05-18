
import { nanoid } from "nanoid";
import { BracketMatch } from "../types";
import { BaseBracketGenerator } from "./BaseBracketGenerator";
import { WinnersBracketLinker } from "../linkers/WinnersBracketLinker";

/**
 * Generator for single elimination brackets
 */
export class SingleEliminationGenerator extends BaseBracketGenerator {
  /**
   * Generate a single elimination bracket
   * @returns Array of matches for the bracket
   */
  generate(): BracketMatch[] {
    // Create match mapping for quick access
    const matchMap: Record<string, BracketMatch> = {};
    
    // Get teams that will be in the main bracket (after potential play-ins)
    const { playInMatches, advancingTeams } = this.handlePlayInMatches();
    
    // Add play-in matches to the matchMap with proper keys
    playInMatches.forEach((match) => {
      match.matchType = "play-in";
      match.round = 0;
      const key = `play-in-0-${match.position}`;
      matchMap[key] = match;
    });
    
    // Generate winners bracket with advancing teams
    const winnersBracketLinker = new WinnersBracketLinker(this.bracketId, advancingTeams, matchMap);
    winnersBracketLinker.generateMatches();
    
    // Link play-in winners to Winners Round 1
    if (playInMatches.length > 0) {
      const round1Keys = Object.keys(matchMap)
        .filter(k => k.startsWith("winners-1-"))
        .sort();
      
      playInMatches.forEach((pm, idx) => {
        if (idx < round1Keys.length) {
          pm.nextWinMatchId = matchMap[round1Keys[idx]].id;
        }
      });
    }
    
    return Object.values(matchMap);
  }
}
