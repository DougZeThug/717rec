
import { BracketState, MatchResult, PlayoffGame, PlayoffMatch } from "../types";
import { PlayoffDatabaseFacade } from "./PlayoffDatabaseFacade";

/**
 * Handles database operations for playoff brackets using a facade pattern
 * for better organization and testability
 */
export class PlayoffDatabaseAdapter {
  // Singleton facade instance
  private static readonly facade = new PlayoffDatabaseFacade();
  
  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    return this.facade.savePlayoffMatches(matches);
  }

  /**
   * Save playoff games to the database
   */
  static async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    return this.facade.savePlayoffGames(games);
  }

  /**
   * Record match result and advance teams in bracket
   */
  static async recordMatchResult(matchResult: MatchResult): Promise<void> {
    return this.facade.recordMatchResult(matchResult);
  }

  /**
   * Mark a team as the winners bracket champion
   */
  static async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    return this.facade.markWinnersBracketChampion(bracketId, teamId);
  }

  /**
   * Set whether a reset match is needed
   */
  static async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    return this.facade.setResetMatchNeeded(bracketId, needed);
  }

  /**
   * Mark the tournament as complete with a champion
   */
  static async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    return this.facade.markTournamentComplete(bracketId, championId);
  }

  /**
   * Advance a team to the next match
   */
  static async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    return this.facade.advanceTeam(nextMatchId, teamId, isWinner);
  }

  /**
   * Get all matches for a bracket
   */
  static async getBracketMatches(bracketId: string): Promise<PlayoffMatch[]> {
    return this.facade.getBracketMatches(bracketId);
  }

  /**
   * Get games for a specific match
   */
  static async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return this.facade.getMatchGames(matchId);
  }

  /**
   * Create reset match if needed
   */
  static async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<string> {
    return this.facade.createResetMatch(bracketId, team1Id, team2Id);
  }
  
  /**
   * Get bracket state information
   */
  static async getBracketState(bracketId: string): Promise<BracketState> {
    return this.facade.getBracketState(bracketId);
  }
}
