
// Types for playoff brackets
import { BracketFormat, BracketState } from "@/constants/brackets";

/**
 * Match type for playoff operations
 */
export type PlayoffMatchType = "winners" | "losers" | "finals" | "play-in" | "play-in-2";

/**
 * Game within a match
 */
export interface PlayoffGame {
  id: string;
  matchId?: string;
  gameNumber?: number;
  team1Score: number;
  team2Score: number;
  winnerId?: string;
  winner?: string;
}

/**
 * Playoff match definition - canonical version
 */
export interface PlayoffMatch {
  id: string;
  round: number;
  position: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  loserId?: string | null;
  team1Score?: number | null;
  team2Score?: number | null;
  team1GameWins?: number | null;
  team2GameWins?: number | null;
  matchType: PlayoffMatchType;
  bestOf: number;
  games?: PlayoffGame[];
  team1ChallongeId?: number;
  team2ChallongeId?: number;
  challongeMatchId?: string;
  team1Seed?: number | null;
  team2Seed?: number | null;
  nextWinMatchId?: string | null;
  nextLoseMatchId?: string | null;
  bracket_id: string;
  status?: "pending" | "in_progress" | "completed";
}

/**
 * Playoff bracket definition
 */
export interface PlayoffBracket {
  id: string;
  name?: string;
  division?: string;
  divisionId?: string;
  format: BracketFormat;
  matches: PlayoffMatch[];
  champion?: string;
  challongeTournamentId?: string;
  challongeTournamentUrl?: string;
  state?: BracketState;
  created_at?: string;
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
 * Match result information
 */
export interface MatchResult {
  matchId: string;
  winnerId: string;
  loserId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins?: number;
  team2GameWins?: number;
  games?: PlayoffGame[];
}
