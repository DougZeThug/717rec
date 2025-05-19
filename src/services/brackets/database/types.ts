
import { PlayoffGame, PlayoffMatchType } from "../types";

/**
 * Interface for match results data transfer
 */
export interface MatchResultDTO {
  winnerId: string;
  loserId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins?: number;
  team2GameWins?: number;
  games?: PlayoffGame[];
}

/**
 * Interface for database-specific match result format
 */
export interface DatabaseMatchResult {
  match_id: string;
  winner_id: string;
  loser_id: string;
  team1_score: number;
  team2_score: number;
  team1_game_wins?: number;
  team2_game_wins?: number;
  completed: boolean;
  games?: PlayoffGame[];
}

/**
 * Interface for database playoff match format
 */
export interface DatabasePlayoffMatch {
  id: string;
  bracket_id: string;
  round: number;
  position: number;
  match_type: PlayoffMatchType;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  team1_seed: number | null;
  team2_seed: number | null;
  team1_game_wins?: number | null;
  team2_game_wins?: number | null;
  winner_id: string | null;
  loser_id: string | null;
  next_win_match_id: string | null;
  next_lose_match_id: string | null;
  best_of: number;
  status: "pending" | "in_progress" | "completed";
}

/**
 * Error class for database operations
 */
export class DatabaseOperationError extends Error {
  operation: string;
  originalError?: Error;

  constructor(operation: string, message: string, originalError?: Error) {
    super(message);
    this.name = 'DatabaseOperationError';
    this.operation = operation;
    this.originalError = originalError;
  }
}

/**
 * Interface for playoff matches repository
 */
export interface IPlayoffMatchesRepository {
  saveMatches(matches: DatabasePlayoffMatch[]): Promise<void>;
  updateMatchResult(matchId: string, result: MatchResultDTO): Promise<void>;
  getBracketMatches(bracketId: string): Promise<DatabasePlayoffMatch[]>;
  getMatchById(matchId: string): Promise<DatabasePlayoffMatch | null>;
}

/**
 * Interface for playoff games repository
 */
export interface IPlayoffGamesRepository {
  saveGames(games: PlayoffGame[]): Promise<void>;
  getMatchGames(matchId: string): Promise<PlayoffGame[]>;
}

/**
 * Interface for bracket repository
 */
export interface IBracketRepository {
  markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void>;
  setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void>;
  markTournamentComplete(bracketId: string, championId: string): Promise<void>;
  getBracketState(bracketId: string): Promise<any>;
}

/**
 * Interface for team advancement service
 */
export interface ITeamAdvancementService {
  advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void>;
  handleGrandFinalsReset(
    bracketId: string, 
    winnersBracketChampionId: string,
    losersBracketChampionId: string,
    gf1WinnerId: string
  ): Promise<string>;
}

/**
 * Interface for bracket creation 
 */
export interface BracketCreationParams {
  id: string;
  name: string;
  format: any; // Use the BracketFormat type from constants
  divisionId: string;
}
