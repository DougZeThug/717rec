
import { Team } from "@/types";
import { BracketMatch, SeedTeam } from "./types";
import { BracketSizeCalculator } from "./BracketSizeCalculator";
import { TeamSeeding } from "./TeamSeeding";
import { PlayInGenerator } from "./PlayInGenerator";
import { WinnersBracketGenerator } from "./WinnersBracketGenerator";
import { LosersBracketGenerator } from "./LosersBracketGenerator";
import { FinalsGenerator } from "./FinalsGenerator";
import { BracketLinker } from "./BracketLinker";
import { DatabaseAdapter } from "./DatabaseAdapter";

/**
 * Main bracket generator class that coordinates the bracket creation process
 */
export class BracketGenerator {
  /**
   * Generate a complete double elimination bracket
   * @param bracketId ID of the bracket
   * @param teams Array of teams in the bracket
   * @returns Array of matches for the bracket
   */
  static generateDoubleEliminationBracket(
    bracketId: string, 
    teams: Team[]
  ): BracketMatch[] {
    // Prepare teams with proper seeding
    const seededTeams = TeamSeeding.prepareTeams(teams);
    const totalTeams = seededTeams.length;
    
    // Calculate bracket size (next power of 2)
    const bracketSize = BracketSizeCalculator.calculateBracketSize(totalTeams);
    
    // Initialize matches array
    const matches: BracketMatch[] = [];
    
    // Map to store matches by round and position for linking
    const matchMap: Record<string, BracketMatch> = {};
    
    // Create play-in matches if needed
    const { playInMatches, advancingTeams } = PlayInGenerator.createPlayInMatches(
      seededTeams, 
      bracketSize,
      bracketId
    );
    matches.push(...playInMatches);
    
    // Generate winners bracket
    const winnersBracketMatches = WinnersBracketGenerator.generateWinnersBracket(
      bracketId, 
      advancingTeams, 
      matchMap
    );
    matches.push(...winnersBracketMatches);
    
    // Generate losers bracket
    const losersBracketMatches = LosersBracketGenerator.generateLosersBracket(
      bracketId, 
      bracketSize / 2, 
      matchMap
    );
    matches.push(...losersBracketMatches);
    
    // Create finals match
    const finalsMatch = FinalsGenerator.createFinalsMatch(bracketId, matchMap);
    matches.push(finalsMatch);
    
    // Link play-in matches to first round
    BracketLinker.linkPlayInMatches(matches);
    
    return matches;
  }
  
  /**
   * Save bracket matches to the database
   * @param matches Array of matches to save
   */
  static async saveBracketMatches(matches: BracketMatch[]): Promise<void> {
    return DatabaseAdapter.saveBracketMatches(matches);
  }

  /**
   * Update a match with a result and advance teams
   * @param matchId ID of the match to update
   * @param winnerId ID of the winning team
   * @param team1Score Score of team 1
   * @param team2Score Score of team 2
   */
  static async updateMatchResult(
    matchId: string, 
    winnerId: string, 
    team1Score: number, 
    team2Score: number
  ): Promise<void> {
    return DatabaseAdapter.updateMatchResult(
      matchId,
      winnerId,
      team1Score,
      team2Score
    );
  }
}
