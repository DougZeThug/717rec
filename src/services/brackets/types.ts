
import { PlayoffMatch as AppPlayoffMatch, PlayoffBracket, Team } from "@/types";
import { BRACKET_STATES } from "@/constants/brackets";
import { PlayoffGame, PlayoffMatchType } from "@/types/playoffs";

// Interface for grouping matches by type (winners, losers, finals)
export interface BracketMatchesByType {
  winners: AppPlayoffMatch[][];
  losers: AppPlayoffMatch[][];
  finals: AppPlayoffMatch[];
}

// Bracket state types
export type BracketState = typeof BRACKET_STATES[keyof typeof BRACKET_STATES];

// Re-export these types from @/types so they're available through our service
export type { AppPlayoffMatch as PlayoffMatch, PlayoffBracket, Team };

// Basic match type for brackets
export interface BaseBracketMatch {
  id: string;
  round: number;
  position: number;
  matchType: MatchType;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null; // Make this non-optional to align with PlayoffMatch
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
  bestOf?: number;
  team1Score?: number | null;
  team2Score?: number | null;
  status?: string | null;
}

// Types for match types in brackets
export type MatchType = PlayoffMatchType;

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
