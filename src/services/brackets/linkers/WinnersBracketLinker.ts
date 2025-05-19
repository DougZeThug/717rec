
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
   * Generate winners bracket matches
   */
  generateMatches(): void {
    const numRounds = Math.log2(this.calculateBracketSize(this.teams.length));
    
    // First round matches
    const firstRoundTeams = [...this.teams];
    const numFirstRoundMatches = Math.pow(2, numRounds - 1);
    
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
          if (teamIndex < firstRoundTeams.length) {
            // Don't set a placeholder ID, either use real team ID or leave null
            if (!firstRoundTeams[teamIndex].id.startsWith('play-in-')) {
              match.team1Id = firstRoundTeams[teamIndex].id;
              match.team1Seed = firstRoundTeams[teamIndex].seed;
            }
          }
          
          if (teamIndex + 1 < firstRoundTeams.length) {
            // Don't set a placeholder ID, either use real team ID or leave null
            if (!firstRoundTeams[teamIndex + 1].id.startsWith('play-in-')) {
              match.team2Id = firstRoundTeams[teamIndex + 1].id;
              match.team2Seed = firstRoundTeams[teamIndex + 1].seed;
            }
          }
        }
        
        // Store match in map for linking
        const key = `winners-${round}-${position}`;
        this.matchMap[key] = match;
      }
    }
    
    // Link matches
    this.linkMatches(numRounds);
  }
  
  /**
   * Link winners to next round and losers to losers bracket
   */
  private linkMatches(numRounds: number): void {
    for (let round = 1; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round);
      
      for (let position = 1; position <= matchesInRound; position++) {
        const currentKey = `winners-${round}-${position}`;
        const currentMatch = this.matchMap[currentKey];
        
        // Link winners to next round
        if (round < numRounds) {
          const nextPosition = Math.ceil(position / 2);
          const nextKey = `winners-${round+1}-${nextPosition}`;
          
          if (this.matchMap[nextKey]) {
            currentMatch.nextWinMatchId = this.matchMap[nextKey].id;
          }
        }
        
        // Link losers to losers bracket (except finals)
        if (round < numRounds) {
          // The losers bracket linker is now responsible for this connection
          // We'll let it handle linking to the appropriate losers round
          // Leave nextLoseMatchId as null for now
        }
      }
    }
  }
  
  /**
   * Calculate the appropriate bracket size (power of 2)
   */
  private calculateBracketSize(teamCount: number): number {
    let power = 1;
    while (power < teamCount) {
      power *= 2;
    }
    return power;
  }
}
