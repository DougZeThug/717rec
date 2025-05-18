
import { nanoid } from "nanoid";
import { PlayoffMatch } from "../types";
import { BaseBracketGenerator } from "./BaseBracketGenerator";
import { PlayoffBracketLinker } from "../linkers/playoff/PlayoffBracketLinker";
import { BracketMatch } from "../types";

/**
 * Generator for playoff brackets with true double elimination
 */
export class PlayoffBracketGenerator extends BaseBracketGenerator {
  private linker: PlayoffBracketLinker;

  constructor(bracketId: string, teams: any[]) {
    super(bracketId, teams);
    this.linker = new PlayoffBracketLinker(bracketId);
  }

  /**
   * Generate a playoff bracket with true double elimination
   * @returns Array of matches for the bracket
   */
  generate(): PlayoffMatch[] {
    // Get teams that will be in the main bracket (after potential play-ins)
    const { advancingTeams, playInMatches } = this.handlePlayInMatches();
    
    // Generate playoff structure
    // Convert play-in matches to PlayoffMatch type
    const playoffPlayInMatches: PlayoffMatch[] = this.convertToPlayoffMatches(playInMatches);
    const matches: PlayoffMatch[] = [...playoffPlayInMatches];
    
    // Phase 1: Create winners bracket matches
    this.generateWinnersBracket(matches, advancingTeams);
    
    // Phase 2: Create losers bracket matches
    this.generateLosersBracket(matches);
    
    // Phase 3: Create the finals match
    this.generateFinalsMatch(matches);
    
    // Phase 4: Link matches together
    this.linkMatches(matches);
    
    return matches;
  }

  /**
   * Convert BracketMatch[] to PlayoffMatch[] by ensuring all required fields are present
   */
  private convertToPlayoffMatches(bracketMatches: BracketMatch[]): PlayoffMatch[] {
    return bracketMatches.map(match => ({
      ...match,
      bestOf: match.bestOf || 3, // Default to bestOf 3 if not specified
      team1Score: match.team1Score || null,
      team2Score: match.team2Score || null,
      team1GameWins: null,
      team2GameWins: null,
      status: match.status || "pending"
    } as PlayoffMatch));
  }
  
  /**
   * Link all matches together correctly
   */
  private linkMatches(matches: PlayoffMatch[]): void {    
    // Calculate the number of rounds in the winners bracket
    const winnerRounds = Math.log2(this.bracketSize);
    
    // Use the linker to connect all bracket sections
    this.linker.linkMatches(matches, winnerRounds);
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
        team1GameWins: null,
        team2GameWins: null,
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
          team1GameWins: null,
          team2GameWins: null,
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
      // The number of matches in each losers round follows a pattern
      // that alternates between small and large rounds
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
          team1GameWins: null,
          team2GameWins: null,
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
    // Use the linker to create the finals matches properly
    this.linker.generateFinals(matches);
  }
}
