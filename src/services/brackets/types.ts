
import { Team } from "@/types";
import { nanoid } from "nanoid";

// Core types for bracket generation
export interface SeedTeam {
  id: string;
  name: string;
  seed: number;
  imageUrl?: string;
  logoUrl?: string;
}

export type MatchType = "winners" | "losers" | "finals" | "play-in";

// Base interface for all bracket matches with common properties
export interface BaseBracketMatch {
  id: string;
  round: number;
  position: number;
  team1Id: string | null;
  team2Id: string | null;
  team1Seed: number | null;
  team2Seed: number | null;
  winnerId: string | null;
  nextWinMatchId: string | null;
  nextLoseMatchId: string | null;
  bracket_id: string;
  matchType: MatchType | PlayoffMatchType; // Added matchType property to base interface
}

export interface BracketMatch extends BaseBracketMatch {
  matchType: MatchType;
}

export type PlayoffMatchType = "winners" | "losers" | "finals" | "play-in" | "play-in-2";

export interface PlayoffMatch extends BaseBracketMatch {
  matchType: PlayoffMatchType;
  team1Score: number | null;
  team2Score: number | null;
  team1GameWins: number | null;
  team2GameWins: number | null;
  bestOf: number;
  loserId: string | null;
  status: "pending" | "in_progress" | "completed";
}

export interface PlayInResult {
  playInMatches: BracketMatch[];
  advancingTeams: SeedTeam[];
}

export interface BracketGenerationResult {
  matches: BracketMatch[];
  bracketId: string;
}

export interface PlayoffGame {
  id: string;
  matchId: string;
  gameNumber: number;
  team1Score: number;
  team2Score: number;
  winnerId: string | null;
}

export interface MatchResult {
  matchId: string;
  winnerId: string;
  loserId: string;
  team1Score: number;
  team2Score: number;
  games: PlayoffGame[];
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
