
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

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  matchType: MatchType;
  team1Id: string | null;
  team2Id: string | null;
  team1Seed: number | null;
  team2Seed: number | null;
  nextWinMatchId: string | null;
  nextLoseMatchId: string | null;
  winnerId: string | null;
  bracket_id: string;
}

export interface PlayInResult {
  playInMatches: BracketMatch[];
  advancingTeams: SeedTeam[];
}

export interface BracketGenerationResult {
  matches: BracketMatch[];
  bracketId: string;
}

// New types for playoff brackets
export type PlayoffMatchType = "winners" | "losers" | "finals" | "play-in" | "play-in-2";

export interface PlayoffMatch {
  id: string;
  round: number;
  position: number;
  matchType: PlayoffMatchType;
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
  status: "pending" | "in_progress" | "completed";
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
