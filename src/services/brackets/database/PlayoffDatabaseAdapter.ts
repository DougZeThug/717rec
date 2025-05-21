import { PlayoffMatch as AppPlayoffMatch, PlayoffGame } from '../types';
import { DatabaseMatchResult, MatchResultDTO } from './types/DatabaseTypes';
import { BracketDatabaseService } from './services/BracketDatabaseService';

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
   * Convert app match type to database match type to ensure compatibility
   */
  private static convertToDbMatch(match: AppPlayoffMatch): any {
    return {
      ...match,
      bracket_id: match.bracket_id,
      round: match.round,
      position: match.position,
      match_type: match.matchType,
      team1_id: match.team1Id?.startsWith(PlayoffDatabaseAdapter.PLACEHOLDER_PREFIX) ? null : match.team1Id,
      team2_id: match.team2Id?.startsWith(PlayoffDatabaseAdapter.PLACEHOLDER_PREFIX) ? null : match.team2Id,
      team1_seed: match.team1Seed,
      team2_seed: match.team2Seed,
      team1_score: match.team1Score,
      team2_score: match.team2Score,
      team1_game_wins: match.team1GameWins,
      team2_game_wins: match.team2GameWins,
      winner_id: match.winnerId || null, // Ensure winnerId is never undefined
      loser_id: match.loserId,
      next_win_match_id: match.nextWinMatchId,
      next_lose_match_id: match.nextLoseMatchId,
      best_of: match.bestOf,
      status: match.status
    };
  }

  /**
   * Convert database match type to app match type to ensure compatibility
   */
  private static convertToAppMatch(dbMatch: any): AppPlayoffMatch {
    return {
      id: dbMatch.id,
      bracket_id: dbMatch.bracket_id,
      round: dbMatch.round,
      position: dbMatch.position,
      matchType: dbMatch.match_type,
      team1Id: dbMatch.team1_id,
      team2Id: dbMatch.team2_id,
      team1Score: dbMatch.team1_score,
      team2Score: dbMatch.team2_score,
      team1Seed: dbMatch.team1_seed,
      team2Seed: dbMatch.team2_seed,
      team1GameWins: dbMatch.team1_game_wins,
      team2GameWins: dbMatch.team2_game_wins,
      winnerId: dbMatch.winner_id || null, // Ensure winnerId is never undefined
      loserId: dbMatch.loser_id || null,
      nextWinMatchId: dbMatch.next_win_match_id,
      nextLoseMatchId: dbMatch.next_lose_match_id,
      bestOf: dbMatch.best_of,
      status: dbMatch.status
    };
  }

  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: AppPlayoffMatch[]): Promise<void> {
    // Check for placeholder IDs that need to be set to null for the database
    const processedMatches = matches.map(match => 
      PlayoffDatabaseAdapter.convertToDbMatch(match)
    );
    
    await PlayoffDatabaseAdapter.service.savePlayoffMatches(processedMatches);
  }

  /**
   * Get bracket matches from the database
   */
  static async getBracketMatches(bracketId: string): Promise<AppPlayoffMatch[]> {
    const dbMatches = await PlayoffDatabaseAdapter.service.getBracketMatches(bracketId);
    return dbMatches.map(dbMatch => 
      PlayoffDatabaseAdapter.convertToAppMatch(dbMatch)
    );
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
    
    await PlayoffDatabaseAdapter.service.recordMatchResult(dbResult);
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
  static async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<AppPlayoffMatch> {
    return PlayoffDatabaseAdapter.service.createResetMatch(bracketId, team1Id, team2Id);
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

// Import and export the new adapter for brackets-manager compatibility
// to avoid circular dependency
import { BracketsManagerAdapter } from '../adapter/BracketsManagerAdapter';
export const adapter = new BracketsManagerAdapter();
