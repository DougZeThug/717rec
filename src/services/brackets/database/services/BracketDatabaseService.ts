
import { PlayoffGame, PlayoffMatch } from "../../types";
import { BracketRepository } from "../repositories/BracketRepository";
import { GameRepository } from "../repositories/GameRepository";
import { MatchRepository } from "../repositories/MatchRepository";
import { ParticipantRepository } from "../repositories/ParticipantRepository";
import { BracketCreationParams, DatabaseBracketState, DatabaseMatchResult, MatchResultDTO, ParticipantData, ParticipantFilter } from "../types/DatabaseTypes";

/**
 * Service that orchestrates operations between repositories
 */
export class BracketDatabaseService {
  private matchRepository = new MatchRepository();
  private gameRepository = new GameRepository();
  private bracketRepository = new BracketRepository();
  private participantRepository = new ParticipantRepository();
  
  /**
   * Create a new bracket
   * @param params Bracket creation parameters
   * @returns Success object or error
   */
  async createBracket(params: BracketCreationParams): Promise<{ error?: Error }> {
    return this.bracketRepository.createBracket(params);
  }
  
  /**
   * Save playoff matches
   * @param matches Matches to save
   * @returns Number of matches saved
   */
  async savePlayoffMatches(matches: PlayoffMatch[]): Promise<number> {
    return this.matchRepository.saveMatches(matches);
  }
  
  /**
   * Get bracket matches
   * @param bracketId Bracket ID
   * @returns Array of matches
   */
  async getBracketMatches(bracketId: string): Promise<any[]> {
    return this.matchRepository.getMatches(bracketId);
  }
  
  /**
   * Save playoff games
   * @param games Games to save
   * @returns Number of games saved
   */
  async savePlayoffGames(games: PlayoffGame[]): Promise<number> {
    return this.gameRepository.saveGames(games);
  }
  
  /**
   * Get games for a match
   * @param matchId Match ID
   * @returns Array of games
   */
  async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return this.gameRepository.getMatchGames(matchId);
  }
  
  /**
   * Record a match result
   * @param matchResult Match result data
   * @returns Success status
   */
  async recordMatchResult(matchResult: DatabaseMatchResult): Promise<number> {
    const result = await this.matchRepository.recordMatchResult(
      matchResult.match_id,
      matchResult
    );
    
    // If there are games, save them
    if (matchResult.games && matchResult.games.length > 0) {
      await this.gameRepository.saveGames(matchResult.games);
    }
    
    return result;
  }
  
  /**
   * Advance a team to the next match
   * @param nextMatchId Next match ID
   * @param teamId Team ID to advance
   * @param isWinner Whether the team is advancing as a winner
   * @returns Success status
   */
  async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<number> {
    return this.matchRepository.advanceTeam(nextMatchId, teamId, isWinner);
  }
  
  /**
   * Mark winners bracket champion
   * @param bracketId Bracket ID
   * @param teamId Champion team ID
   */
  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    return this.bracketRepository.markWinnersBracketChampion(bracketId, teamId);
  }
  
  /**
   * Set whether a reset match is needed
   * @param bracketId Bracket ID
   * @param needed Whether a reset match is needed
   */
  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    return this.bracketRepository.setResetMatchNeeded(bracketId, needed);
  }
  
  /**
   * Mark tournament complete
   * @param bracketId Bracket ID
   * @param championId Champion team ID
   */
  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    return this.bracketRepository.markTournamentComplete(bracketId, championId);
  }
  
  /**
   * Create a reset match
   * @param bracketId Bracket ID
   * @param team1Id First team ID
   * @param team2Id Second team ID
   * @returns Created match
   */
  async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<PlayoffMatch> {
    return this.matchRepository.createResetMatch(bracketId, team1Id, team2Id);
  }
  
  /**
   * Get bracket state
   * @param bracketId Bracket ID
   * @returns Bracket state
   */
  async getBracketState(bracketId: string): Promise<DatabaseBracketState> {
    return this.bracketRepository.getBracketState(bracketId);
  }
  
  /**
   * Create a participant
   * @param participant Participant data
   * @returns Participant ID
   */
  async createParticipant(participant: ParticipantData): Promise<string> {
    return this.participantRepository.createParticipant(participant);
  }
  
  /**
   * Select participants by filter
   * @param filters Filter criteria
   * @returns Array of participants
   */
  async selectParticipants(filters?: ParticipantFilter): Promise<ParticipantData[]> {
    return this.participantRepository.selectParticipants(filters);
  }
}
