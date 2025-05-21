
import { PlayoffGame, PlayoffMatchType } from "@/types/playoffs-compat";

/**
 * Database representation of a playoff match
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
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  team1_seed: number | null;
  team2_seed: number | null;
  winner_id: string | null;
  loser_id: string | null;
  next_win_match_id: string | null;
  next_lose_match_id: string | null;
  best_of: number;
  status: "pending" | "in_progress" | "completed";
}

/**
 * DTO for match result updates
 */
export interface MatchResultDTO {
  matchId: string;
  winnerId: string;
  loserId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins?: number;
  team2GameWins?: number;
  games?: PlayoffGame[];
  completed?: boolean;
}

/**
 * Database format for match result updates
 */
export interface DatabaseMatchResult {
  match_id: string;
  winner_id: string;
  loser_id: string;
  team1_score: number;
  team2_score: number;
  team1_game_wins: number;
  team2_game_wins: number;
  completed: boolean;
  games?: PlayoffGame[];
}

/**
 * Specifically for database error modeling
 */
export class DatabaseOperationError extends Error {
  operation: string;
  originalError: Error;

  constructor(operation: string, message: string, originalError?: Error) {
    super(message);
    this.name = 'DatabaseOperationError';
    this.operation = operation;
    this.originalError = originalError || new Error(message);
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
 * Interface for team advancement service
 */
export interface ITeamAdvancementService {
  advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void>;
}

/**
 * Interface for bracket repository
 */
export interface IBracketRepository {
  markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void>;
  setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void>;
  markTournamentComplete(bracketId: string, championId: string): Promise<void>;
  getBracketState(bracketId: string): Promise<DatabaseBracketState>;
}

/**
 * Interface for participant repository
 */
export interface IParticipantRepository {
  createParticipant(participant: ParticipantData): Promise<string>;
  selectParticipants(filters?: ParticipantFilter): Promise<ParticipantData[]>;
}

/**
 * Database bracket state information
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
 * Participant data interface
 */
export interface ParticipantData {
  id: string;
  tournament_id: string;
  name: string;
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
