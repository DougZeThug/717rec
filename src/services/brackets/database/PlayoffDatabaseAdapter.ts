
import { PlayoffDatabaseFacade } from './PlayoffDatabaseFacade';
import { PlayoffMatch, PlayoffGame } from '../types';
import { DatabaseMatchResult, MatchResultDTO } from './types/DatabaseTypes';
import { bracketDatabaseService } from './index';

/**
 * Adapter to convert between application model and database model
 * This is a facade that delegates to the new modular implementation
 */
export class PlayoffDatabaseAdapter {
  private static PLACEHOLDER_PREFIX = 'play-in-';

  /**
   * Create a new bracket in the database
   */
  static async createBracket(params: {
    id: string;
    name: string;
    format: string;
    divisionId?: string;
  }): Promise<{ error?: Error }> {
    return bracketDatabaseService.createBracket(params);
  }

  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    await bracketDatabaseService.savePlayoffMatches(matches);
  }

  /**
   * Get bracket matches from the database
   */
  static async getBracketMatches(bracketId: string): Promise<any[]> {
    return bracketDatabaseService.getBracketMatches(bracketId);
  }

  /**
   * Save playoff games to the database
   */
  static async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    await bracketDatabaseService.savePlayoffGames(games);
  }

  /**
   * Get match games from the database
   */
  static async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return bracketDatabaseService.getMatchGames(matchId);
  }

  /**
   * Record match result in the database
   */
  static async recordMatchResult(matchId: string, result: MatchResultDTO): Promise<void> {
    // Convert to DatabaseMatchResult format expected by the service
    const dbResult: DatabaseMatchResult = {
      match_id: matchId,
      winner_id: result.winnerId,
      loser_id: result.loserId,
      team1_score: result.team1Score,
      team2_score: result.team2Score,
      team1_game_wins: result.team1GameWins,
      team2_game_wins: result.team2GameWins,
      completed: true,
      games: result.games
    };
    
    await bracketDatabaseService.recordMatchResult(dbResult);
  }

  /**
   * Advance team to the next match
   */
  static async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    await bracketDatabaseService.advanceTeam(nextMatchId, teamId, isWinner);
  }

  /**
   * Mark winners bracket champion
   */
  static async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    await bracketDatabaseService.markWinnersBracketChampion(bracketId, teamId);
  }

  /**
   * Set reset match needed
   */
  static async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    await bracketDatabaseService.setResetMatchNeeded(bracketId, needed);
  }

  /**
   * Mark tournament complete
   */
  static async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    await bracketDatabaseService.markTournamentComplete(bracketId, championId);
  }

  /**
   * Create reset match
   */
  static async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<PlayoffMatch> {
    return bracketDatabaseService.createResetMatch(bracketId, team1Id, team2Id);
  }

  /**
   * Get bracket state
   */
  static async getBracketState(bracketId: string): Promise<any> {
    return bracketDatabaseService.getBracketState(bracketId);
  }

  /**
   * Create a participant
   */
  static async createParticipant(participant: {
    id: string;
    tournament_id: string;
    name: string;
    position?: number;
    seeding?: number;
  }): Promise<string> {
    return bracketDatabaseService.createParticipant(participant);
  }

  /**
   * Select participants based on filters
   */
  static async selectParticipants(filters?: {
    tournament_id?: string;
    name?: string;
  }): Promise<Array<{
    id: string;
    name: string;
    tournament_id: string;
    position?: number;
    seeding?: number;
  }>> {
    return bracketDatabaseService.selectParticipants(filters);
  }
}

/**
 * Export the adapter instance for brackets-manager compatibility
 */
export const adapter = new BracketsManagerAdapter();

// Import here to avoid circular dependency
import { BracketsManagerAdapter } from './adapters/BracketsManagerAdapter';
