
import { nanoid } from "nanoid";
import { BracketMatch } from "./types";

/**
 * Handles generation of the losers bracket portion of a tournament
 */
export class LosersBracketGenerator {
  /**
   * Generate the losers bracket portion
   * @param bracketId ID of the bracket
   * @param numFirstRoundMatches Number of matches in the first round 
   * @param matchMap Storage for match references by position
   * @returns Array of losers bracket matches
   */
  static generateLosersBracket(
    bracketId: string,
    numFirstRoundMatches: number,
    matchMap: Record<string, BracketMatch>
  ): BracketMatch[] {
    const matches: BracketMatch[] = [];
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
          nextLoseMatchId: null, // No next lose in losers bracket
          winnerId: null,
          bracket_id: bracketId
        };
        
        matches.push(match);
        
        // Store match in map for linking
        const key = `losers-${round}-${position}`;
        matchMap[key] = match;
        
        // Link winners to next round in losers bracket
        if (round < numRounds) {
          const nextPosition = Math.ceil(position / 2);
          const nextRound = round + 1;
          const nextKey = `losers-${nextRound}-${nextPosition}`;
          match.nextWinMatchId = matchMap[nextKey]?.id || null;
        } else if (round === numRounds) {
          // Final loser goes to final match
          match.nextWinMatchId = matchMap['finals-1']?.id || null;
        }
      }
    }
    
    return matches;
  }
}
