
import { PlayoffMatch, PlayoffBracket, Team } from "@/types";

// Interface for grouping matches by type (winners, losers, finals)
export interface BracketMatchesByType {
  winners: PlayoffMatch[][];
  losers: PlayoffMatch[][];
  finals: PlayoffMatch[];
}

// Bracket state types
export type BracketState = "pending" | "underway" | "complete" | undefined;

// Re-export these types from @/types so they're available through our service
export type { PlayoffMatch, PlayoffBracket, Team };

// Basic match type for brackets
export interface BaseBracketMatch {
  id: string;
  round: number;
  position: number;
  matchType: MatchType;
  team1Id: string | null;
  team2Id: null | string;
  winnerId: string | null;
  nextWinMatchId?: string | null;
  nextLoseMatchId?: string | null;
  bracket_id?: string;
}

// Match type for bracket operations
export interface BracketMatch extends BaseBracketMatch {
  team1Seed: number | null;
  team2Seed: number | null;
  nextWinMatchId: string | null;
  nextLoseMatchId: string | null;
  bracket_id: string;
  loserId?: string | null;
  bestOf?: number; // Added bestOf to make compatible with PlayoffMatch
}

// Types for match types in brackets
export type MatchType = "winners" | "losers" | "finals" | "play-in" | "play-in-2";
export type PlayoffMatchType = "winners" | "losers" | "finals" | "play-in" | "play-in-2";

// Team with seeding information
export interface SeedTeam {
  id: string;
  name: string;
  seed: number;
  imageUrl?: string;
  logoUrl?: string;
}

// Result of play-in matches generation
export interface PlayInResult {
  playInMatches: BracketMatch[];
  advancingTeams: SeedTeam[];
}

// Match result information
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

// Game within a match
export interface PlayoffGame {
  id: string;
  matchId?: string;
  gameNumber?: number;
  team1Score: number;
  team2Score: number;
  winnerId?: string;
  winner?: string;
}

// Database bracket state information
export interface DatabaseBracketState {
  isWinnersBracketComplete: boolean;
  isLosersBracketComplete: boolean;
  isResetMatchNeeded: boolean;
  isComplete: boolean;
  winnersBracketChampionId: string | null;
  losersBracketChampionId: string | null;
  championId: string | null;
}
