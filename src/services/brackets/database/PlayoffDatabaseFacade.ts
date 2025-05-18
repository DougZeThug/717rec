
import { supabase } from "@/integrations/supabase/client";
import { PlayoffGame, DatabaseBracketState } from "../types";
import { DatabaseOperationError, DatabasePlayoffMatch, DatabaseMatchResult } from "./types";
import { PlayoffMatchesRepository } from "./PlayoffMatchesRepository";
import { PlayoffGamesRepository } from "./PlayoffGamesRepository";
import { TeamAdvancementService } from "./TeamAdvancementService";
import { ResetMatchService } from "./ResetMatchService";
import { BracketRepository } from "./BracketRepository";

/**
 * Central facade for all database operations related to playoffs
 */
export class PlayoffDatabaseFacade {
  private matchesRepository: PlayoffMatchesRepository;
  private gamesRepository: PlayoffGamesRepository;
  private teamAdvancementService: TeamAdvancementService;
  private bracketRepository: BracketRepository;
  private resetMatchService: ResetMatchService;

  constructor() {
    this.matchesRepository = new PlayoffMatchesRepository();
    this.gamesRepository = new PlayoffGamesRepository();
    this.teamAdvancementService = new TeamAdvancementService();
    this.bracketRepository = new BracketRepository();
    this.resetMatchService = new ResetMatchService();
  }

  /**
   * Save playoff matches to the database
   */
  async savePlayoffMatches(matches: DatabasePlayoffMatch[]): Promise<void> {
    return this.matchesRepository.saveMatches(matches);
  }

  /**
   * Save playoff games to the database
   */
  async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    return this.gamesRepository.saveGames(games);
  }

  /**
   * Get matches for a bracket
   */
  async getBracketMatches(bracketId: string): Promise<DatabasePlayoffMatch[]> {
    return this.matchesRepository.getBracketMatches(bracketId);
  }

  /**
   * Get games for a match
   */
  async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return this.gamesRepository.getMatchGames(matchId);
  }
  
  /**
   * Record result of a match and handle advancement
   */
  async recordMatchResult(matchResult: DatabaseMatchResult): Promise<void> {
    const { match_id, winner_id, loser_id, team1_score, team2_score, team1_game_wins, team2_game_wins, games } = matchResult;
    
    // Get the match details
    const match = await this.matchesRepository.getMatchById(match_id);
    if (!match) {
      throw new DatabaseOperationError('recordMatchResult', `Match with ID ${match_id} not found`);
    }
    
    // Update the match result
    await this.matchesRepository.updateMatchResult(match_id, {
      winnerId: winner_id,
      loserId: loser_id,
      team1Score: team1_score,
      team2Score: team2_score,
      team1GameWins: team1_game_wins,
      team2GameWins: team2_game_wins,
      games
    });

    // Save the individual games if provided
    if (games && games.length > 0) {
      await this.gamesRepository.saveGames(games.map(game => ({
        ...game,
        matchId: match_id
      })));
    }
    
    // Advance the winner to the next match if there is one
    if (match.next_win_match_id) {
      await this.teamAdvancementService.advanceTeam(match.next_win_match_id, winner_id, true);
    }
    
    // Advance the loser to the next loser match if there is one
    if (match.next_lose_match_id) {
      await this.teamAdvancementService.advanceTeam(match.next_lose_match_id, loser_id, false);
    }
  }
  
  /**
   * Advance a team to the next match
   */
  async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    return this.teamAdvancementService.advanceTeam(nextMatchId, teamId, isWinner);
  }

  /**
   * Mark a team as the winners bracket champion
   */
  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    return this.bracketRepository.markWinnersBracketChampion(bracketId, teamId);
  }

  /**
   * Set whether a reset match is needed for the bracket
   */
  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    return this.bracketRepository.setResetMatchNeeded(bracketId, needed);
  }
  
  /**
   * Mark a tournament as complete with the specified champion
   */
  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    return this.bracketRepository.markTournamentComplete(bracketId, championId);
  }

  /**
   * Create a reset match for the finals
   */
  async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<any> {
    return this.resetMatchService.createResetMatch(bracketId, team1Id, team2Id);
  }

  /**
   * Get the current state of a bracket
   */
  async getBracketState(bracketId: string): Promise<DatabaseBracketState> {
    return this.bracketRepository.getBracketState(bracketId);
  }
}
