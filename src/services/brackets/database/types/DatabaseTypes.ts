
import { PlayoffGame, PlayoffMatch, PlayoffMatchType } from "@/types/playoffs-compat";

/**
 * Database-format match (matches snake_case columns)
 */
export interface DatabasePlayoffMatch {
  id: string;
  bracket_id: string;
  round: number;
  position: number;
  match_type: PlayoffMatchType;
  team1_id: string | null;
  team2_id: string | null;
  team1_score?: number | null;
  team2_score?: number | null;
  team1_game_wins?: number | null;
  team2_game_wins?: number | null;
  team1_seed?: number | null;
  team2_seed?: number | null;
  winner_id: string | null;
  loser_id?: string | null;
  next_win_match_id?: string | null;
  next_lose_match_id?: string | null;
  best_of: number;
  status?: "pending" | "in_progress" | "completed";
}

/**
 * Match result DTO for recording match outcomes
 */
export interface MatchResultDTO {
  matchId: string;
  winnerId: string;
  loserId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins?: number;
  team2GameWins?: number;
  completed?: boolean;
  games?: PlayoffGame[];
}

/**
 * Database match result format
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
