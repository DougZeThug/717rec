
import { MatchResult, PlayoffGame, PlayoffMatch, PlayoffMatchType, DatabaseBracketState } from "../types";
import { PlayoffDatabaseFacade } from "./PlayoffDatabaseFacade";

/**
 * Adapter for working with playoff database operations
 * Acts as a translator between application models and database models
 */
export class PlayoffDatabaseAdapter {
  private static facade = new PlayoffDatabaseFacade();

  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    // Convert application model to database model
    const dbMatches = matches.map(match => ({
      id: match.id,
      bracket_id: match.bracket_id || null,
      round: match.round,
      position: match.position,
      match_type: match.matchType,
      team1_id: match.team1Id,
      team2_id: match.team2Id,
      team1_score: match.team1Score || null,
      team2_score: match.team2Score || null,
      team1_game_wins: match.team1GameWins || null,
      team2_game_wins: match.team2GameWins || null,
      team1_seed: match.team1Seed,
      team2_seed: match.team2Seed,
      winner_id: match.winnerId,
      loser_id: match.loserId || null,
      next_win_match_id: match.nextWinMatchId,
      next_lose_match_id: match.nextLoseMatchId,
      best_of: match.bestOf || 3,
      status: 'pending'
    }));

    await this.facade.savePlayoffMatches(dbMatches);
  }

  /**
   * Get matches for a bracket
   */
  static async getBracketMatches(bracketId: string): Promise<PlayoffMatch[]> {
    const dbMatches = await this.facade.getBracketMatches(bracketId);
    
    // Convert database model to application model
    return dbMatches.map(match => ({
      id: match.id,
      bracket_id: match.bracket_id,
      round: match.round,
      position: match.position,
      matchType: match.match_type,
      team1Id: match.team1_id,
      team2Id: match.team2_id,
      team1Score: match.team1_score,
      team2Score: match.team2_score,
      team1GameWins: match.team1_game_wins,
      team2GameWins: match.team2_game_wins,
      team1Seed: match.team1_seed,
      team2Seed: match.team2_seed,
      bestOf: match.best_of,
      winnerId: match.winner_id,
      loserId: match.loser_id,
      nextWinMatchId: match.next_win_match_id,
      nextLoseMatchId: match.next_lose_match_id,
      status: match.status
    }));
  }

  /**
   * Save playoff games to the database
   */
  static async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    await this.facade.savePlayoffGames(games);
  }

  /**
   * Get games for a match
   */
  static async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return this.facade.getMatchGames(matchId);
  }

  /**
   * Record result of a match and handle advancement
   */
  static async recordMatchResult(matchResult: MatchResult): Promise<void> {
    // Convert application model to database model
    const dbMatchResult = {
      match_id: matchResult.matchId,
      winner_id: matchResult.winnerId,
      loser_id: matchResult.loserId,
      team1_score: matchResult.team1Score,
      team2_score: matchResult.team2Score,
      team1_game_wins: matchResult.team1GameWins || 0,
      team2_game_wins: matchResult.team2GameWins || 0,
      completed: true,
      games: matchResult.games
    };
    
    await this.facade.recordMatchResult(dbMatchResult);
  }

  /**
   * Advance a team to the next match
   */
  static async advanceTeam(
    nextMatchId: string,
    teamId: string,
    isWinner: boolean
  ): Promise<void> {
    await this.facade.advanceTeam(nextMatchId, teamId, isWinner);
  }

  /**
   * Mark a team as the winners bracket champion
   */
  static async markWinnersBracketChampion(
    bracketId: string,
    teamId: string
  ): Promise<void> {
    await this.facade.markWinnersBracketChampion(bracketId, teamId);
  }

  /**
   * Set whether a reset match is needed for the bracket
   */
  static async setResetMatchNeeded(
    bracketId: string,
    needed: boolean
  ): Promise<void> {
    await this.facade.setResetMatchNeeded(bracketId, needed);
  }
  
  /**
   * Mark a tournament as complete with the specified champion
   */
  static async markTournamentComplete(
    bracketId: string,
    championId: string
  ): Promise<void> {
    await this.facade.markTournamentComplete(bracketId, championId);
  }

  /**
   * Create a reset match for the finals
   */
  static async createResetMatch(
    bracketId: string,
    team1Id: string,
    team2Id: string
  ): Promise<PlayoffMatch> {
    return this.facade.createResetMatch(bracketId, team1Id, team2Id);
  }

  /**
   * Get the current state of a bracket
   */
  static async getBracketState(bracketId: string): Promise<DatabaseBracketState> {
    return this.facade.getBracketState(bracketId);
  }
}
