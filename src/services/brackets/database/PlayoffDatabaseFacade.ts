
import { BracketState, PlayoffGame } from "../types";
import { BracketRepository } from "./BracketRepository";
import { MatchResultService } from "./MatchResultService";
import { PlayoffGamesRepository } from "./PlayoffGamesRepository";
import { PlayoffMatchesRepository } from "./PlayoffMatchesRepository";
import { ResetMatchService } from "./ResetMatchService";
import { TeamAdvancementService } from "./TeamAdvancementService";
import { DatabaseBracketState, DatabaseMatchResult, DatabasePlayoffMatch } from "./types";

/**
 * Facade service that maintains backward compatibility with the original PlayoffDatabaseAdapter API
 * while using the new, more modular implementation under the hood
 */
export class PlayoffDatabaseFacade {
  private matchesRepository: PlayoffMatchesRepository;
  private gamesRepository: PlayoffGamesRepository;
  private bracketRepository: BracketRepository;
  private matchResultService: MatchResultService;
  private teamAdvancementService: TeamAdvancementService;
  private resetMatchService: ResetMatchService;

  constructor() {
    this.matchesRepository = new PlayoffMatchesRepository();
    this.gamesRepository = new PlayoffGamesRepository();
    this.bracketRepository = new BracketRepository();
    this.matchResultService = new MatchResultService();
    this.teamAdvancementService = new TeamAdvancementService();
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
   * Record match result and advance teams in bracket
   */
  async recordMatchResult(matchResult: DatabaseMatchResult): Promise<void> {
    return this.matchResultService.recordMatchResult(matchResult);
  }

  /**
   * Mark a team as the winners bracket champion
   */
  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    return this.bracketRepository.markWinnersBracketChampion(bracketId, teamId);
  }

  /**
   * Set whether a reset match is needed
   */
  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    return this.bracketRepository.setResetMatchNeeded(bracketId, needed);
  }

  /**
   * Mark the tournament as complete with a champion
   */
  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    return this.bracketRepository.markTournamentComplete(bracketId, championId);
  }

  /**
   * Advance a team to the next match
   */
  async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    return this.teamAdvancementService.advanceTeam(nextMatchId, teamId, isWinner);
  }

  /**
   * Get all matches for a bracket
   */
  async getBracketMatches(bracketId: string): Promise<DatabasePlayoffMatch[]> {
    return this.matchesRepository.getBracketMatches(bracketId);
  }

  /**
   * Get games for a specific match
   */
  async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return this.gamesRepository.getMatchGames(matchId);
  }

  /**
   * Create reset match if needed
   */
  async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<string> {
    const resetMatch = await this.resetMatchService.createResetMatch(bracketId, team1Id, team2Id);
    return resetMatch.id; // Return the match ID as a string
  }
  
  /**
   * Get bracket state information
   */
  async getBracketState(bracketId: string): Promise<DatabaseBracketState> {
    return this.bracketRepository.getBracketState(bracketId);
  }
}
