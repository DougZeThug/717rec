
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
