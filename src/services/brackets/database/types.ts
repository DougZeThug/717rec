
import { PlayoffMatchType, PlayoffGame, PlayoffMatch } from "../types";

export class DatabaseOperationError extends Error {
  public operation: string;
  public originalError: Error;

  constructor(operation: string, message: string, originalError?: Error) {
    super(message);
    this.name = "DatabaseOperationError";
    this.operation = operation;
    this.originalError = originalError as Error;
  }
}

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
  status: 'pending' | 'in_progress' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export interface MatchResultDTO {
  winnerId: string;
  loserId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins: number;
  team2GameWins: number;
  games?: PlayoffGame[];
}

export interface IPlayoffMatchesRepository {
  saveMatches(matches: DatabasePlayoffMatch[]): Promise<void>;
  updateMatchResult(matchId: string, result: MatchResultDTO): Promise<void>;
  getBracketMatches(bracketId: string): Promise<DatabasePlayoffMatch[]>;
  getMatchById(matchId: string): Promise<DatabasePlayoffMatch | null>;
}

export interface IPlayoffGamesRepository {
  saveGames(games: PlayoffGame[]): Promise<void>;
  getMatchGames(matchId: string): Promise<PlayoffGame[]>;
}

export interface IBracketRepository {
  markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void>;
  setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void>;
  markTournamentComplete(bracketId: string, championId: string): Promise<void>;
  getBracketState(bracketId: string): Promise<DatabaseBracketState>;
}

export interface ITeamAdvancementService {
  advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void>;
  handleGrandFinalsReset(bracketId: string, winnersBracketChampionId: string, losersBracketChampionId: string, gf1WinnerId: string): Promise<string>;
}

export interface IResetMatchService {
  createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<PlayoffMatch>; // Changed return type to PlayoffMatch
}

export interface IMatchResultService {
  recordMatchResult(matchResult: DatabaseMatchResult): Promise<void>;
}

export interface DatabaseBracketState {
  isWinnersBracketComplete: boolean;
  isLosersBracketComplete: boolean;
  isResetMatchNeeded: boolean;
  isComplete: boolean;
  winnersBracketChampionId: string | null;
  losersBracketChampionId: string | null;
  championId: string | null;
}

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
