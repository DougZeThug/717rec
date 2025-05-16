
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
