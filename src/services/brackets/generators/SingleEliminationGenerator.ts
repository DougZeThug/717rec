
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
    const teamsForBracket = this.handlePlayInMatches();
    
    // Generate winners bracket with all matches
    const winnersBracketLinker = new WinnersBracketLinker(this.bracketId, teamsForBracket, matchMap);
    winnersBracketLinker.generateMatches();
    
    return Object.values(matchMap);
  }
}
