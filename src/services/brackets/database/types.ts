import { PlayoffGame } from "../types";

/**
 * Interface for BracketRepository
 */
export interface IBracketRepository {
  markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void>;
  setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void>;
  markTournamentComplete(bracketId: string, championId: string): Promise<void>;
  getBracketState(bracketId: string): Promise<BracketState>;
}

export interface BracketState {
  isWinnersBracketComplete: boolean;
  isLosersBracketComplete: boolean;
  isResetMatchNeeded: boolean;
  isComplete: boolean;
  winnersBracketChampionId: string | null;
  losersBracketChampionId: string | null;
  championId: string | null;
}

/**
 * Interface for MatchResultService
 */
export interface IMatchResultService {
  recordMatchResult(matchResult: MatchResult): Promise<void>;
}

export interface MatchResult {
  matchId: string;
  winnerId: string;
  loserId: string;
  team1Score: number;
  team2Score: number;
  games: PlayoffGame[];
}

/**
 * Interface for PlayoffMatchesRepository
 */
export interface IPlayoffMatchesRepository {
  saveMatches(matches: PlayoffMatch[]): Promise<void>;
  getBracketMatches(bracketId: string): Promise<PlayoffMatch[]>;
}

export interface PlayoffMatch {
  id: string;
  round: number;
  position: number;
  matchType: string;
  bracket_id: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Seed: number | null;
  team2Seed: number | null;
  team1Score: number | null;
  team2Score: number | null;
  bestOf: number;
  winnerId: string | null;
  loserId: string | null;
  nextWinMatchId: string | null;
  nextLoseMatchId: string | null;
  status: string;
}

/**
 * Interface for ResetMatchService
 */
export interface IResetMatchService {
  createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<string>;
}

/**
 * Interface for PlayoffGamesRepository
 */
export interface IPlayoffGamesRepository {
  saveGames(games: PlayoffGame[]): Promise<void>;
  getMatchGames(matchId: string): Promise<PlayoffGame[]>;
}

/**
 * Interface for TeamAdvancementService
 */
export interface ITeamAdvancementService {
  advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void>;
}

/**
 * Error class for database operations
 */
export class DatabaseOperationError extends Error {
  constructor(
    public operation: string,
    message: string,
    public originalError?: Error | unknown
  ) {
    super(message);
    this.name = 'DatabaseOperationError';
  }
}
