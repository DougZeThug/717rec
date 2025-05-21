
import { PlayoffMatch, PlayoffGame } from "../../types";

/**
 * Error thrown for database operations
 */
export class DatabaseOperationError extends Error {
  constructor(
    public readonly operation: string,
    message: string,
    public readonly cause?: any
  ) {
    super(message);
    this.name = 'DatabaseOperationError';
  }
}

/**
 * Interface for match repository operations
 */
export interface IMatchRepository {
  saveMatches(matches: PlayoffMatch[]): Promise<number>;
  getMatches(bracketId: string): Promise<DatabasePlayoffMatch[]>;
}

/**
 * Interface for game repository operations
 */
export interface IGameRepository {
  saveGames(games: PlayoffGame[]): Promise<number>;
  getMatchGames(matchId: string): Promise<PlayoffGame[]>;
}

/**
 * Interface for bracket repository operations
 */
export interface IBracketRepository {
  markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void>;
  setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void>;
  markTournamentComplete(bracketId: string, championId: string): Promise<void>;
  getBracketState(bracketId: string): Promise<DatabaseBracketState>;
  createBracket(params: BracketCreationParams): Promise<{ error?: Error }>;
}

/**
 * Interface for participant repository operations
 */
export interface IParticipantRepository {
  createParticipant(participant: ParticipantData): Promise<string>;
  selectParticipants(filters?: ParticipantFilter): Promise<ParticipantData[]>;
}

/**
 * Parameters for creating a new bracket
 */
export interface BracketCreationParams {
  id: string;
  name: string;
  format: string;
  divisionId?: string;
}

/**
 * Data type for database match results
 */
export interface DatabaseMatchResult {
  match_id: string;
  winner_id: string | null;
  loser_id: string | null;
  team1_score: number;
  team2_score: number;
  team1_game_wins: number;
  team2_game_wins: number;
  completed: boolean;
  games?: PlayoffGame[];
}

/**
 * Match result data transfer object
 */
export interface MatchResultDTO {
  winnerId: string | null;
  loserId: string | null;
  team1Score: number;
  team2Score: number;
  team1GameWins: number;
  team2GameWins: number;
  games?: PlayoffGame[];
}

/**
 * Match from the database
 */
export interface DatabasePlayoffMatch {
  id: string;
  bracket_id: string;
  round: number;
  position: number;
  match_type: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  team1_seed: number | null;
  team2_seed: number | null;
  winner_id: string | null;
  loser_id: string | null;
  next_win_match_id: string | null;
  next_lose_match_id: string | null;
  best_of: number;
  status: string;
}

/**
 * Database bracket state
 */
export interface DatabaseBracketState {
  isWinnersBracketComplete: boolean;
  isLosersBracketComplete: boolean;
  isResetMatchNeeded: boolean;
  isComplete: boolean;
  winnersBracketChampionId: string | null;
  losersBracketChampionId: string | null;
  championId: string | null;
}

/**
 * Participant data
 */
export interface ParticipantData {
  id: string;
  name: string;
  tournament_id: string;
  position?: number;
  seeding?: number;
}

/**
 * Filter for participant queries
 */
export interface ParticipantFilter {
  tournament_id?: string;
  name?: string;
}
