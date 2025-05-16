
import { nanoid } from "nanoid";
import { BracketMatch, SeedTeam } from "../types";

/**
 * Responsible for generating winners bracket matches and their connections
 */
export class WinnersBracketLinker {
  private bracketId: string;
  private teams: SeedTeam[];
  private matchMap: Record<string, BracketMatch>;
  
  constructor(
    bracketId: string,
    teams: SeedTeam[],
    matchMap: Record<string, BracketMatch>
  ) {
    this.bracketId = bracketId;
    this.teams = teams;
    this.matchMap = matchMap;
  }
  
  /**
   * Generate all matches in the winners bracket
   */
  generateMatches(): void {
    const numRounds = Math.log2(this.calculateBracketSize(this.teams.length));
    
    // Create all rounds in the winners bracket
    for (let round = 1; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round);
      
      for (let position = 1; position <= matchesInRound; position++) {
        const match: BracketMatch = {
          id: nanoid(),
          round,
          position,
          matchType: "winners",
          team1Id: null,
          team2Id: null,
          team1Seed: null,
          team2Seed: null,
          nextWinMatchId: null,
          nextLoseMatchId: null,
          winnerId: null,
          bracket_id: this.bracketId
        };
        
        // Set first round teams based on seeding
        if (round === 1) {
          const teamIndex = (position - 1) * 2;
          if (teamIndex < this.teams.length) {
            match.team1Id = this.teams[teamIndex].id;
            match.team1Seed = this.teams[teamIndex].seed;
          }
          
          if (teamIndex + 1 < this.teams.length) {
            match.team2Id = this.teams[teamIndex + 1].id;
            match.team2Seed = this.teams[teamIndex + 1].seed;
          }
        }
        
        // Store match in map for linking
        const key = `winners-${round}-${position}`;
        this.matchMap[key] = match;
      }
    }
    
    // Now link all matches
    this.linkMatches(numRounds);
  }
  
  /**
   * Link winners and losers to their next matches
   */
  private linkMatches(numRounds: number): void {
    for (let round = 1; round < numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round);
      
      for (let position = 1; position <= matchesInRound; position++) {
        const currentKey = `winners-${round}-${position}`;
        const currentMatch = this.matchMap[currentKey];
        
        // Link winners to next round
        const nextPosition = Math.ceil(position / 2);
        const nextKey = `winners-${round+1}-${nextPosition}`;
        currentMatch.nextWinMatchId = this.matchMap[nextKey]?.id || null;
        
        // Link losers to losers bracket (except finals)
        const loserRound = round;
        const loserPosition = position;
        const loserKey = `losers-${loserRound}-${loserPosition}`;
        if (this.matchMap[loserKey]) {
          currentMatch.nextLoseMatchId = this.matchMap[loserKey].id;
        }
      }
    }
  }
  
  /**
   * Calculate the next power of 2 for bracket size
   */
  private calculateBracketSize(teamCount: number): number {
    let power = 1;
    while (power < teamCount) {
      power *= 2;
    }
    return power;
  }
}
