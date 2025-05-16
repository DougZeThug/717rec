
import { nanoid } from "nanoid";
import { BracketMatch } from "../types";
import { BaseBracketGenerator } from "./BaseBracketGenerator";
import { WinnersBracketLinker } from "../linkers/WinnersBracketLinker";
import { LosersBracketLinker } from "../linkers/LosersBracketLinker";
import { FinalsLinker } from "../linkers/FinalsLinker";

/**
 * Generator for double elimination brackets
 */
export class DoubleEliminationGenerator extends BaseBracketGenerator {
  /**
   * Generate a double elimination bracket
   * @returns Array of matches for the bracket
   */
  generate(): BracketMatch[] {
    // Create match mapping for quick access
    const matchMap: Record<string, BracketMatch> = {};
    
    // Get teams that will be in the main bracket (after potential play-ins)
    const teamsForBracket = this.handlePlayInMatches();
    
    // Generate winners bracket
    const winnersBracketLinker = new WinnersBracketLinker(this.bracketId, teamsForBracket, matchMap);
    winnersBracketLinker.generateMatches();
    
    // Generate losers bracket linked to winners bracket
    const losersBracketLinker = new LosersBracketLinker(this.bracketId, this.bracketSize, matchMap);
    losersBracketLinker.generateMatches();
    
    // Create finals match
    const finalsLinker = new FinalsLinker(this.bracketId, matchMap);
    finalsLinker.generateFinals();
    
    return Object.values(matchMap);
  }
}
