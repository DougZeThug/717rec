
import { nanoid } from "nanoid";
import { PlayoffMatch } from "../types";
import { BaseBracketGenerator } from "./BaseBracketGenerator";

/**
 * Generator for playoff brackets with true double elimination
 */
export class PlayoffBracketGenerator extends BaseBracketGenerator {
  /**
   * Generate a playoff bracket with true double elimination
   * @returns Array of matches for the bracket
   */
  generate(): PlayoffMatch[] {
    // Get teams that will be in the main bracket (after potential play-ins)
    const teamsForBracket = this.handlePlayInMatches();
    
    // Generate playoff structure
    const matches: PlayoffMatch[] = [];
    
    // Phase 1: Create winners bracket matches
    this.generateWinnersBracket(matches, teamsForBracket);
    
    // Phase 2: Create losers bracket matches
    this.generateLosersBracket(matches);
    
    // Phase 3: Create the finals match
    this.generateFinalsMatch(matches);
    
    // Phase 4: Link matches together
    // This would need to be implemented in a more complex method
    
    return matches;
  }
  
  /**
   * Generate winners bracket portion of playoffs
   */
  private generateWinnersBracket(matches: PlayoffMatch[], seedTeams: any[]): void {
    const roundCount = Math.log2(this.bracketSize);
    
    // First round matches (with teams)
    for (let position = 1; position <= this.bracketSize / 2; position++) {
      const team1Index = position - 1;
      const team2Index = this.bracketSize - position;
      
      const match: PlayoffMatch = {
        id: nanoid(),
        round: 1,
        position,
        matchType: "winners",
        bracket_id: this.bracketId,
        team1Id: team1Index < seedTeams.length ? seedTeams[team1Index].id : null,
        team2Id: team2Index < seedTeams.length ? seedTeams[team2Index].id : null,
        team1Seed: team1Index < seedTeams.length ? seedTeams[team1Index].seed : null,
        team2Seed: team2Index < seedTeams.length ? seedTeams[team2Index].seed : null,
        team1Score: null,
        team2Score: null,
        bestOf: 3,
        winnerId: null,
        loserId: null,
        nextWinMatchId: null,
        nextLoseMatchId: null,
        status: "pending"
      };
      
      matches.push(match);
    }
    
    // Later round matches
    for (let round = 2; round <= roundCount; round++) {
      const matchesInRound = this.bracketSize / Math.pow(2, round);
      for (let position = 1; position <= matchesInRound; position++) {
        const match: PlayoffMatch = {
          id: nanoid(),
          round,
          position,
          matchType: "winners",
          bracket_id: this.bracketId,
          team1Id: null,
          team2Id: null,
          team1Seed: null,
          team2Seed: null,
          team1Score: null,
          team2Score: null,
          bestOf: 3,
          winnerId: null,
          loserId: null,
          nextWinMatchId: null,
          nextLoseMatchId: null,
          status: "pending"
        };
        
        matches.push(match);
      }
    }
  }
  
  /**
   * Generate losers bracket portion of playoffs
   */
  private generateLosersBracket(matches: PlayoffMatch[]): void {
    const roundCount = Math.log2(this.bracketSize);
    const loserRounds = roundCount * 2 - 1; // Double the winners rounds minus 1
    
    for (let round = 1; round <= loserRounds; round++) {
      const matchesInRound = round <= roundCount 
        ? this.bracketSize / Math.pow(2, round + 1)
        : this.bracketSize / Math.pow(2, 2 * roundCount - round);
        
      for (let position = 1; position <= matchesInRound; position++) {
        const match: PlayoffMatch = {
          id: nanoid(),
          round,
          position,
          matchType: "losers",
          bracket_id: this.bracketId,
          team1Id: null,
          team2Id: null,
          team1Seed: null,
          team2Seed: null,
          team1Score: null,
          team2Score: null,
          bestOf: 3,
          winnerId: null,
          loserId: null,
          nextWinMatchId: null,
          nextLoseMatchId: null,
          status: "pending"
        };
        
        matches.push(match);
      }
    }
  }
  
  /**
   * Generate finals match
   */
  private generateFinalsMatch(matches: PlayoffMatch[]): void {
    const finalsMatch: PlayoffMatch = {
      id: nanoid(),
      round: 1,
      position: 1,
      matchType: "finals",
      bracket_id: this.bracketId,
      team1Id: null, // Winners bracket champion
      team2Id: null, // Losers bracket champion
      team1Seed: null,
      team2Seed: null,
      team1Score: null,
      team2Score: null,
      bestOf: 3,
      winnerId: null,
      loserId: null,
      nextWinMatchId: null,
      nextLoseMatchId: null,
      status: "pending"
    };
    
    matches.push(finalsMatch);
  }
}
