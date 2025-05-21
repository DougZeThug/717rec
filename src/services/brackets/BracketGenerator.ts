
import { Team } from "@/types";
import { BracketMatch, PlayoffMatch } from "./types";
import { DatabaseAdapter } from "./database/DatabaseAdapter";
import { PlayoffDatabaseAdapter } from "./database/PlayoffDatabaseAdapter";
import { manager } from './BracketsManagerInstance';

/**
 * Main facade class for generating tournament brackets
 */
export class BracketGenerator {
  /**
   * Generate a single elimination bracket
   * @param bracketId ID of the bracket
   * @param teams Teams to include in the bracket
   * @returns Promise resolving to the matches for the bracket
   */
  static async generateSingleEliminationBracket(
    bracketId: string,
    teams: Team[]
  ): Promise<BracketMatch[]> {
    // Using the brackets-manager library to get matches
    console.log(`Generating single elimination bracket with ${teams.length} teams`);
    
    // Using manager.get.match instead of manager.get.matches
    const matches = await manager.get.match({ tournament_id: bracketId });
    return matches as BracketMatch[];
  }

  /**
   * Generate a double elimination bracket
   * @param bracketId ID of the bracket
   * @param teams Teams to include in the bracket
   * @returns Promise resolving to the matches for the bracket
   */
  static async generateDoubleEliminationBracket(
    bracketId: string,
    teams: Team[]
  ): Promise<BracketMatch[]> {
    // Using the brackets-manager library to get matches
    console.log(`Generating double elimination bracket with ${teams.length} teams`);
    
    // Using manager.get.match instead of manager.get.matches
    const matches = await manager.get.match({ tournament_id: bracketId });
    return matches as BracketMatch[];
  }

  /**
   * Generate a playoff bracket with true double elimination
   * @param bracketId ID of the bracket
   * @param teams Teams to include in the bracket
   * @returns Promise resolving to the matches for the bracket
   */
  static async generatePlayoffBracket(
    bracketId: string,
    teams: Team[]
  ): Promise<PlayoffMatch[]> {
    // Using the brackets-manager library to get matches
    console.log(`Generating playoff bracket with ${teams.length} teams`);
    
    // Using manager.get.match instead of manager.get.matches
    const matches = await manager.get.match({ tournament_id: bracketId });
    return matches as PlayoffMatch[];
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
    await DatabaseAdapter.updateMatchResult(matchId, winnerId!, team1Score, team2Score);
  }
}
