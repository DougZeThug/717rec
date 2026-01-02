
/**
 * Bracket-related type definitions
 */

export interface TeamBase {
  id: string;
  name: string;
  logoUrl: string | null;
  divisionId: string | null;
}

export interface BracketMeta {
  id: string;
  title: string;
  format: "singleElim" | "doubleElim";
  challongeTournamentId: string;
  divisionId: string | null;
  createdAt: string;
}

export interface PlayoffMatchSimple {
  id: string;
  bracketId: string;
  round: number;
  matchType: "winners" | "losers" | "finals";
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  loserId: string | null;
  bestOf: number;
  status: "pending" | "in_progress" | "complete";
}

export interface BracketCreationRequest {
  name: string;
  divisionId: string;
  divisionName: string;
  format: string;
  teams: string[];
  tournamentType: "single elimination" | "double elimination";
}

export interface BracketOperationResult {
  success: boolean;
  bracketId?: string;
  error?: string;
}

// Type utilities for converting between representations
export type BracketFormat = "singleElim" | "doubleElim";
export type MatchStatus = "pending" | "in_progress" | "complete";
export type MatchType = "winners" | "losers" | "finals";

/**
 * Opponent slot for brackets-manager integration
 */
export interface OpponentSlot {
  id: number | null;
  score?: number | null;
  result?: 'win' | 'loss' | 'draw' | null;
  position?: number;
  forfeit?: boolean;
}

/**
 * Match structure for brackets-manager storage
 */
export interface BracketMatch {
  id: number;
  number: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  child_count: number;
  status: number;
  opponent1: OpponentSlot | null;
  opponent2: OpponentSlot | null;
}

/**
 * Stage structure for brackets-manager
 */
export interface BracketStage {
  id: number;
  tournament_id: string;
  name: string;
  type: 'single_elimination' | 'double_elimination' | 'round_robin';
  number: number;
  settings: Record<string, unknown>;
}

/**
 * Round structure for brackets-manager
 */
export interface BracketRound {
  id: number;
  stage_id: number;
  group_id: number;
  number: number;
  name?: string | null;
}

/**
 * Group structure for brackets-manager
 */
export interface BracketGroup {
  id: number;
  stage_id: number;
  number: number;
  name?: string | null;
}

/**
 * Participant structure for brackets-manager
 */
export interface BracketParticipant {
  id: number;
  tournament_id: string;
  name: string | null;
  position: number | null;
}

/**
 * Database match representation (what we store in Supabase)
 */
export interface DatabaseMatch {
  id: string;
  bracket_id: string;
  round: number;
  position: number;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  winner_id: string | null;
  loser_id: string | null;
  match_type: 'winners' | 'losers' | 'finals' | 'play-in' | 'play-in-2';
  status: 'pending' | 'in_progress' | 'completed';
  best_of: number;
  next_win_match_id: string | null;
  next_lose_match_id: string | null;
  created_at: string;
  updated_at: string;
}
