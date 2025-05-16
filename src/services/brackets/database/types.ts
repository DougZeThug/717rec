
import { BracketState, MatchResult, PlayoffGame, PlayoffMatch, PlayoffMatchType } from "../types";

/**
 * Repository interface for playoff matches
 */
export interface IPlayoffMatchesRepository {
  saveMatches(matches: PlayoffMatch[]): Promise<void>;
  updateMatchResult(matchId: string, result: MatchResultDTO): Promise<void>;
  getBracketMatches(bracketId: string): Promise<PlayoffMatch[]>;
  getMatchById(matchId: string): Promise<PlayoffMatch | null>;
}

/**
 * Repository interface for playoff games
 */
export interface IPlayoffGamesRepository {
  saveGames(games: PlayoffGame[]): Promise<void>;
  getMatchGames(matchId: string): Promise<PlayoffGame[]>;
}

/**
 * Repository interface for bracket state management
 */
export interface IBracketRepository {
  markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void>;
  setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void>;
  markTournamentComplete(bracketId: string, championId: string): Promise<void>;
  getBracketState(bracketId: string): Promise<BracketState>;
}

/**
 * Service interface for managing team advancement through brackets
 */
export interface ITeamAdvancementService {
  advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void>;
}

/**
 * Service interface for reset match handling
 */
export interface IResetMatchService {
  createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<string>;
}

/**
 * Data Transfer Object for match results
 */
export interface MatchResultDTO {
  winnerId: string;
  loserId: string;
  team1Score: number;
  team2Score: number;
}

/**
 * Error types for database operations
 */
export class DatabaseOperationError extends Error {
  constructor(operation: string, detail: string, originalError?: Error) {
    super(`Database operation '${operation}' failed: ${detail}${originalError ? ` - ${originalError.message}` : ''}`);
    this.name = 'DatabaseOperationError';
  }
}
