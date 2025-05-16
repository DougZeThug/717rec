
import { BracketState, MatchResult, PlayoffGame, PlayoffMatch } from "../types";
import { PlayoffDatabaseFacade } from "./PlayoffDatabaseFacade";

/**
 * Adapter for database operations related to playoff brackets
 * 
 * This class maintains the original API but delegates to the new implementation
 * for better maintainability and testability
 */
export class PlayoffDatabaseAdapter {
  private static facade = new PlayoffDatabaseFacade();

  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    return PlayoffDatabaseAdapter.facade.savePlayoffMatches(matches);
  }

  /**
   * Save playoff games to the database
   */
  static async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    return PlayoffDatabaseAdapter.facade.savePlayoffGames(games);
  }

  /**
   * Record match result and advance teams in bracket
   */
  static async recordMatchResult(matchResult: MatchResult): Promise<void> {
    return PlayoffDatabaseAdapter.facade.recordMatchResult(matchResult);
  }

  /**
   * Mark a team as the winners bracket champion
   */
  static async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    return PlayoffDatabaseAdapter.facade.markWinnersBracketChampion(bracketId, teamId);
  }

  /**
   * Set whether a reset match is needed
   */
  static async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    return PlayoffDatabaseAdapter.facade.setResetMatchNeeded(bracketId, needed);
  }

  /**
   * Mark the tournament as complete with a champion
   */
  static async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    return PlayoffDatabaseAdapter.facade.markTournamentComplete(bracketId, championId);
  }

  /**
   * Advance a team to the next match
   */
  static async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    return PlayoffDatabaseAdapter.facade.advanceTeam(nextMatchId, teamId, isWinner);
  }

  /**
   * Get all matches for a bracket
   */
  static async getBracketMatches(bracketId: string): Promise<PlayoffMatch[]> {
    return PlayoffDatabaseAdapter.facade.getBracketMatches(bracketId);
  }

  /**
   * Get games for a specific match
   */
  static async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return PlayoffDatabaseAdapter.facade.getMatchGames(matchId);
  }

  /**
   * Create reset match if needed
   */
  static async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<string> {
    return PlayoffDatabaseAdapter.facade.createResetMatch(bracketId, team1Id, team2Id);
  }
  
  /**
   * Get bracket state information
   */
  static async getBracketState(bracketId: string): Promise<BracketState> {
    return PlayoffDatabaseAdapter.facade.getBracketState(bracketId);
  }
}
