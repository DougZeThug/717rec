import { PlayoffMatch, PlayoffGame, PlayoffMatchType } from '@/types/playoffs';
import { DatabaseMatchResult, MatchResultDTO } from './types/DatabaseTypes';
import { BracketDatabaseService } from './services/BracketDatabaseService';
import { toRow, toRuntime } from './mappers/MatchMapper';

/**
 * Adapter for database operations on playoffs
 * Delegates to the BracketDatabaseService for actual operations
 */
export class PlayoffDatabaseAdapter {
  private static readonly service = new BracketDatabaseService();
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
    return PlayoffDatabaseAdapter.service.createBracket(params);
  }

  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    // Convert app types to database types using our mapper
    const dbMatches = matches.map(match => {
      // Check for placeholder IDs that need to be set to null for the database
      const dbMatch = toRow(match);
      
      // Handle placeholder IDs
      if (match.team1Id?.startsWith(PlayoffDatabaseAdapter.PLACEHOLDER_PREFIX)) {
        dbMatch.team1_id = null;
      }
      
      if (match.team2Id?.startsWith(PlayoffDatabaseAdapter.PLACEHOLDER_PREFIX)) {
        dbMatch.team2_id = null;
      }
      
      return dbMatch;
    });
    
    await PlayoffDatabaseAdapter.service.savePlayoffMatches(matches);
  }

  /**
   * Get bracket matches from the database
   */
  static async getBracketMatches(bracketId: string): Promise<PlayoffMatch[]> {
    const dbMatches = await PlayoffDatabaseAdapter.service.getBracketMatches(bracketId);
    return dbMatches;
  }

  /**
   * Save playoff games to the database
   */
  static async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    await PlayoffDatabaseAdapter.service.savePlayoffGames(games);
  }

  /**
   * Get match games from the database
   */
  static async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return PlayoffDatabaseAdapter.service.getMatchGames(matchId);
  }

  static async recordMatchResult(matchId: string, result: MatchResultDTO): Promise<void> {
    await PlayoffDatabaseAdapter.service.recordMatchResult(result);
  }

  /**
   * Advance team to the next match
   */
  static async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    await PlayoffDatabaseAdapter.service.advanceTeam(nextMatchId, teamId, isWinner);
  }

  /**
   * Mark winners bracket champion
   */
  static async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    await PlayoffDatabaseAdapter.service.markWinnersBracketChampion(bracketId, teamId);
  }

  /**
   * Set reset match needed
   */
  static async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    await PlayoffDatabaseAdapter.service.setResetMatchNeeded(bracketId, needed);
  }

  /**
   * Mark tournament complete
   */
  static async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    await PlayoffDatabaseAdapter.service.markTournamentComplete(bracketId, championId);
  }

  /**
   * Create reset match
   */
  static async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<PlayoffMatch> {
    const result = await PlayoffDatabaseAdapter.service.createResetMatch(bracketId, team1Id, team2Id);
    return result;
  }

  /**
   * Get bracket state
   */
  static async getBracketState(bracketId: string): Promise<any> {
    return PlayoffDatabaseAdapter.service.getBracketState(bracketId);
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
    return PlayoffDatabaseAdapter.service.createParticipant(participant);
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
    return PlayoffDatabaseAdapter.service.selectParticipants(filters);
  }
}

// Import and export the adapter for brackets-manager compatibility
// to avoid circular dependency
import { BracketsManagerAdapter } from '../adapter/BracketsManagerAdapter';
export const adapter = new BracketsManagerAdapter();
