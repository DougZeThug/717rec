
import { Team } from "@/types";
import { BracketMatch, PlayoffMatch } from "./types";
import { BracketFactory } from "./BracketFactory";
import { DatabaseAdapter } from "./database/DatabaseAdapter";
import { PlayoffDatabaseAdapter } from "./database/PlayoffDatabaseAdapter";

/**
 * Main facade class for generating tournament brackets
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
    const generator = BracketFactory.createGenerator('single-elimination', bracketId, teams);
    return generator.generate() as BracketMatch[];
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
    const generator = BracketFactory.createGenerator('double-elimination', bracketId, teams);
    return generator.generate() as BracketMatch[];
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
    const generator = BracketFactory.createGenerator('playoff', bracketId, teams);
    return generator.generate() as PlayoffMatch[];
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
