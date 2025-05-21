
/** Round-level progress of an entire bracket */
export type BracketState = 'pending' | 'in_progress' | 'completed';

// Types for playoff brackets
import { BracketFormat } from "@/constants/brackets";

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
  /** raw DB rows or mapped PlayoffMatch objects – loosen until UI refactor */
  matches: PlayoffMatch[];
  champion?: string;
  state: BracketState;
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

/**
 * View model interface for playoff brackets
 */
export interface PlayoffViewModel {
  // Bracket data
  bracket: PlayoffBracket | null;
  isLoading: boolean;
  error: Error | null;
  bracketMatchesByType: BracketMatchesByType | null;
  
  // Teams data
  teams: Team[];
  teamsLoading: boolean;
  
  // Actions
  refetch: () => Promise<unknown>;
  deleteBracket: (bracketId: string, bracketName: string) => Promise<void>;
  updateMatchResult: (
    matchId: string, 
    winnerId: string, 
    team1Score: number, 
    team2Score: number,
    team1GameWins?: number,
    team2GameWins?: number,
    games?: PlayoffGame[]
  ) => Promise<void>;
}

/* ─────────────────────────────────────────
   Temporary domain stubs – refine later
   ───────────────────────────────────────── */
export interface Team {
  id: string;
  name: string;
  logo_url?: string;
  image_url?: string;
  division_id?: string;
  created_at?: string;
  wins: number;
  losses: number;
  game_wins?: number;
  game_losses?: number;
  seed?: number;
  players?: string[];
}

export type BracketMatchesByType = {
  winners: any[][];
  losers: any[][];
  finals: any[];
  playIn?: any[][];
};

// Remove the old export since we've defined BracketState at the top
// export type { BracketState } from "@/constants/brackets";
