import { Team } from "@/types";
import { nanoid } from "nanoid";
import { SeedTeam, BracketMatch, BracketGenerationResult, PlayoffMatch } from "./types";
import { BracketSizeCalculator } from "./BracketSizeCalculator";
import { TeamSeeding } from "./TeamSeeding";
import { WinnersBracketGenerator } from "./WinnersBracketGenerator";
import { LosersBracketGenerator } from "./LosersBracketGenerator";
import { PlayInGenerator } from "./PlayInGenerator";
import { FinalsGenerator } from "./FinalsGenerator";
import { DatabaseAdapter } from "./DatabaseAdapter";
import { PlayoffDatabaseAdapter } from "./PlayoffDatabaseAdapter";

/**
 * Main class for generating tournament brackets
 */
export class BracketGenerator {
  /**
   * Generate a single elimination bracket
   * @param bracketId ID of the bracket
   * @param teams Teams to include in the bracket
   * @returns The matches for the bracket
   */
  static generateSingleEliminationBracket(
    bracketId: string,
    teams: Team[]
  ): BracketMatch[] {
    // Create match mapping for quick access
    const matchMap: Record<string, BracketMatch> = {};
    
    // Prepare teams with proper seeding
    const seedTeams = TeamSeeding.prepareTeams(teams);
    
    // Calculate bracket size based on number of teams
    const bracketSize = BracketSizeCalculator.calculateBracketSize(seedTeams.length);
    
    // Generate winners bracket
    const winnersBracket = WinnersBracketGenerator.generateWinnersBracket(
      bracketId,
      seedTeams,
      matchMap
    );
    
    return Object.values(matchMap);
  }

  /**
   * Generate a double elimination bracket
   * @param bracketId ID of the bracket
   * @param teams Teams to include in the bracket
   * @returns The matches for the bracket
   */
  static generateDoubleEliminationBracket(
    bracketId: string,
    teams: Team[]
  ): BracketMatch[] {
    // Create match mapping for quick access
    const matchMap: Record<string, BracketMatch> = {};
    
    // Prepare teams with proper seeding
    const seedTeams = TeamSeeding.prepareTeams(teams);
    
    // Calculate bracket size based on number of teams
    const bracketSize = BracketSizeCalculator.calculateBracketSize(seedTeams.length);
    
    // Generate play-in matches if needed
    let teamsForBracket = seedTeams;
    if (seedTeams.length > bracketSize) {
      const playInResult = PlayInGenerator.createPlayInMatches(
        bracketId,
        seedTeams,
        bracketSize,
        matchMap
      );
      teamsForBracket = playInResult.advancingTeams;
    }
    
    // Generate winners bracket
    const winnersBracket = WinnersBracketGenerator.generateWinnersBracket(
      bracketId,
      teamsForBracket,
      matchMap
    );
    
    // Generate losers bracket linked to winners bracket
    const losersBracket = LosersBracketGenerator.generateLosersBracket(
      bracketId,
      bracketSize,
      matchMap
    );
    
    // Create finals match
    const finalsMatch = FinalsGenerator.createFinalsMatch(
      bracketId,
      matchMap
    );
    
    return Object.values(matchMap);
  }

  /**
   * Generate a playoff bracket with true double elimination
   * @param bracketId ID of the bracket
   * @param teams Teams to include in the bracket
   * @returns The matches for the bracket
   */
  static generatePlayoffBracket(
    bracketId: string,
    teams: Team[]
  ): PlayoffMatch[] {
    // Prepare teams with proper seeding
    const seedTeams = TeamSeeding.prepareTeams(teams);
    
    // Calculate bracket size based on number of teams
    const bracketSize = BracketSizeCalculator.calculateBracketSize(seedTeams.length);
    
    // Generate playoff structure
    const matches: PlayoffMatch[] = [];
    
    // Phase 1: Create winners bracket matches
    const roundCount = Math.log2(bracketSize);
    let matchId = 1;
    
    // First round matches (with teams)
    for (let position = 1; position <= bracketSize / 2; position++) {
      const team1Index = position - 1;
      const team2Index = bracketSize - position;
      
      const match: PlayoffMatch = {
        id: nanoid(),
        round: 1,
        position,
        matchType: "winners",
        bracket_id: bracketId,
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
      matchId++;
    }
    
    // Later round matches
    for (let round = 2; round <= roundCount; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      for (let position = 1; position <= matchesInRound; position++) {
        const match: PlayoffMatch = {
          id: nanoid(),
          round,
          position,
          matchType: "winners",
          bracket_id: bracketId,
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
        matchId++;
      }
    }
    
    // Phase 2: Create losers bracket matches
    // This is simplified - a complete implementation would have more complex logic
    const loserRounds = roundCount * 2 - 1; // Double the winners rounds minus 1
    for (let round = 1; round <= loserRounds; round++) {
      const matchesInRound = round <= roundCount 
        ? bracketSize / Math.pow(2, round + 1)
        : bracketSize / Math.pow(2, 2 * roundCount - round);
        
      for (let position = 1; position <= matchesInRound; position++) {
        const match: PlayoffMatch = {
          id: nanoid(),
          round,
          position,
          matchType: "losers",
          bracket_id: bracketId,
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
        matchId++;
      }
    }
    
    // Phase 3: Create the finals match
    const finalsMatch: PlayoffMatch = {
      id: nanoid(),
      round: 1,
      position: 1,
      matchType: "finals",
      bracket_id: bracketId,
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
    
    // Phase 4: Link matches together
    // This would need a more complex implementation to correctly link winners and losers brackets
    
    return matches;
  }

  /**
   * Save generated bracket matches to the database
   * @param matches Matches to save
   */
  static async saveBracketMatches(matches: BracketMatch[]): Promise<void> {
    await DatabaseAdapter.saveBracketMatches(matches);
  }

  /**
   * Save generated playoff matches to the database
   * @param matches Matches to save
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    await PlayoffDatabaseAdapter.savePlayoffMatches(matches);
  }
  
  /**
   * Update a match with a result and advance teams
   */
  static async updateMatchResult(
    matchId: string,
    winnerId: string | null,
    team1Score: number,
    team2Score: number
  ): Promise<void> {
    await DatabaseAdapter.updateMatchResult(matchId, winnerId, team1Score, team2Score);
  }
}
