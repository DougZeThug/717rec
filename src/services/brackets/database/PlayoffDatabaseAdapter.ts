
import { PlayoffDatabaseFacade } from './PlayoffDatabaseFacade';
import { PlayoffMatch, PlayoffGame } from '../types';
import { DatabasePlayoffMatch, MatchResultDTO } from './types';

/**
 * Adapter to convert between application model and database model
 */
export class PlayoffDatabaseAdapter {
  private static facade = new PlayoffDatabaseFacade();
  private static PLACEHOLDER_PREFIX = 'play-in-';

  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    // Convert matches to database model
    const dbMatches = matches.map(match => ({
      id: match.id,
      bracket_id: match.bracket_id,
      round: match.round,
      position: match.position,
      match_type: match.matchType,
      // Replace placeholder IDs with null before saving to database
      team1_id: match.team1Id?.startsWith(this.PLACEHOLDER_PREFIX) ? null : match.team1Id,
      team2_id: match.team2Id?.startsWith(this.PLACEHOLDER_PREFIX) ? null : match.team2Id,
      team1_score: match.team1Score || null,
      team2_score: match.team2Score || null,
      team1_game_wins: match.team1GameWins || null,
      team2_game_wins: match.team2GameWins || null,
      team1_seed: match.team1Seed,
      team2_seed: match.team2Seed,
      winner_id: match.winnerId || null,
      loser_id: match.loserId || null,
      next_win_match_id: match.nextWinMatchId || null,
      next_lose_match_id: match.nextLoseMatchId || null,
      best_of: match.bestOf || 3,
      status: match.status || 'pending'
    }));

    await this.facade.savePlayoffMatches(dbMatches);
  }

  /**
   * Get bracket matches from the database
   */
  static async getBracketMatches(bracketId: string): Promise<DatabasePlayoffMatch[]> {
    return await this.facade.getBracketMatches(bracketId);
  }

  /**
   * Save playoff games to the database
   */
  static async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    await this.facade.savePlayoffGames(games);
  }

  /**
   * Get match games from the database
   */
  static async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return await this.facade.getMatchGames(matchId);
  }

  /**
   * Record match result in the database
   */
  static async recordMatchResult(matchId: string, result: MatchResultDTO): Promise<void> {
    await this.facade.recordMatchResult(matchId, result);
  }

  /**
   * Advance team to the next match
   */
  static async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    await this.facade.advanceTeam(nextMatchId, teamId, isWinner);
  }

  /**
   * Mark winners bracket champion
   */
  static async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    await this.facade.markWinnersBracketChampion(bracketId, teamId);
  }

  /**
   * Set reset match needed
   */
  static async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    await this.facade.setResetMatchNeeded(bracketId, needed);
  }

  /**
   * Mark tournament complete
   */
  static async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    await this.facade.markTournamentComplete(bracketId, championId);
  }

  /**
   * Create reset match
   */
  static async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<PlayoffMatch> {
    return await this.facade.createResetMatch(bracketId, team1Id, team2Id);
  }

  /**
   * Get bracket state
   */
  static async getBracketState(bracketId: string): Promise<any> {
    return await this.facade.getBracketState(bracketId);
  }
}
