
import { nanoid } from "nanoid";
import { BracketMatch } from "../types";

/**
 * Responsible for generating losers bracket matches and their connections
 */
export class LosersBracketLinker {
  private bracketId: string;
  private bracketSize: number;
  private matchMap: Record<string, BracketMatch>;
  
  constructor(
    bracketId: string,
    bracketSize: number,
    matchMap: Record<string, BracketMatch>
  ) {
    this.bracketId = bracketId;
    this.bracketSize = bracketSize;
    this.matchMap = matchMap;
  }
  
  /**
   * Generate losers bracket matches
   */
  generateMatches(): void {
    const numFirstRoundMatches = this.bracketSize / 2;
    const numRounds = Math.log2(numFirstRoundMatches) * 2;
    
    // Create all rounds in the losers bracket
    for (let round = 1; round <= numRounds; round++) {
      const isElimRound = round % 2 === 1;
      const matchesInRound = Math.pow(2, Math.floor((numRounds - round) / 2));
      
      for (let position = 1; position <= matchesInRound; position++) {
        const match: BracketMatch = {
          id: nanoid(),
          round,
          position,
          matchType: "losers",
          team1Id: null,
          team2Id: null,
          team1Seed: null,
          team2Seed: null,
          nextWinMatchId: null,
          nextLoseMatchId: null,
          winnerId: null,
          bracket_id: this.bracketId
        };
        
        // Store match in map for linking
        const key = `losers-${round}-${position}`;
        this.matchMap[key] = match;
      }
    }
    
    // Now link all matches
    this.linkMatches(numRounds);
  }
  
  /**
   * Link winners to next match in losers bracket
   */
  private linkMatches(numRounds: number): void {
    for (let round = 1; round < numRounds; round++) {
      const matchesInRound = Math.pow(2, Math.floor((numRounds - round) / 2));
      
      for (let position = 1; position <= matchesInRound; position++) {
        const currentKey = `losers-${round}-${position}`;
        const currentMatch = this.matchMap[currentKey];
        
        // Link winners to next round in losers bracket
        const nextPosition = Math.ceil(position / 2);
        const nextRound = round + 1;
        const nextKey = `losers-${nextRound}-${nextPosition}`;
        
        if (this.matchMap[nextKey]) {
          currentMatch.nextWinMatchId = this.matchMap[nextKey].id;
        } else if (round === numRounds - 1) {
          // Final loser bracket match links to finals
          currentMatch.nextWinMatchId = this.matchMap['finals-1']?.id || null;
        }
      }
    }
  }
}
