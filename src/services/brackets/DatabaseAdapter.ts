
import { BracketState, MatchResult, PlayoffGame, PlayoffMatch, PlayoffMatchType } from "./types";
import { PlayoffDatabaseFacade } from "./database/PlayoffDatabaseFacade";
import { DatabaseBracketState, DatabasePlayoffMatch } from "./database/types";

/**
 * Handles database operations for playoff brackets using a facade pattern
 * for better organization and testability
 */
export class PlayoffDatabaseAdapter {
  // Use a static private readonly field for better encapsulation
  private static readonly facade = new PlayoffDatabaseFacade();
  
  /**
   * Convert PlayoffMatch to DatabasePlayoffMatch
   */
  private static convertToDbMatch(match: PlayoffMatch): DatabasePlayoffMatch {
    return {
      id: match.id,
      bracket_id: match.bracket_id,
      round: match.round,
      position: match.position,
      match_type: match.matchType as string,
      team1_id: match.team1Id,
      team2_id: match.team2Id,
      team1_seed: match.team1Seed,
      team2_seed: match.team2Seed,
      team1_score: match.team1Score,
      team2_score: match.team2Score,
      winner_id: match.winnerId,
      loser_id: match.loserId,
      next_win_match_id: match.nextWinMatchId,
      next_lose_match_id: match.nextLoseMatchId,
      best_of: match.bestOf,
      status: match.status
    };
  }
  
  /**
   * Convert DatabasePlayoffMatch to PlayoffMatch
   */
  private static convertToAppMatch(dbMatch: DatabasePlayoffMatch): PlayoffMatch {
    return {
      id: dbMatch.id,
      bracket_id: dbMatch.bracket_id,
      round: dbMatch.round,
      position: dbMatch.position,
      matchType: dbMatch.match_type as PlayoffMatchType,
      team1Id: dbMatch.team1_id,
      team2Id: dbMatch.team2_id,
      team1Seed: dbMatch.team1_seed,
      team2Seed: dbMatch.team2_seed,
      team1Score: dbMatch.team1_score,
      team2Score: dbMatch.team2_score,
      winnerId: dbMatch.winner_id,
      loserId: dbMatch.loser_id,
      nextWinMatchId: dbMatch.next_win_match_id,
      nextLoseMatchId: dbMatch.next_lose_match_id,
      bestOf: dbMatch.best_of || 3,
      status: dbMatch.status as "pending" | "in_progress" | "completed"
    };
  }

  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    const dbMatches = matches.map(match => this.convertToDbMatch(match));
    return this.facade.savePlayoffMatches(dbMatches);
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
    const dbMatches = await this.facade.getBracketMatches(bracketId);
    return dbMatches.map(match => this.convertToAppMatch(match));
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
    const dbState = await this.facade.getBracketState(bracketId);
    // Convert DatabaseBracketState to BracketState
    return {
      isWinnersBracketComplete: dbState.isWinnersBracketComplete,
      isLosersBracketComplete: dbState.isLosersBracketComplete,
      isResetMatchNeeded: dbState.isResetMatchNeeded,
      isComplete: dbState.isComplete,
      winnersBracketChampionId: dbState.winnersBracketChampionId,
      losersBracketChampionId: dbState.losersBracketChampionId,
      championId: dbState.championId
    };
  }
}
