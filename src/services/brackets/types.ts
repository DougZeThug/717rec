
import { PlayoffMatch, PlayoffBracket, Team } from "@/types";

// Interface for grouping matches by type (winners, losers, finals)
export interface BracketMatchesByType {
  winners: PlayoffMatch[][];
  losers: PlayoffMatch[][];
  finals: PlayoffMatch[];
}

// Bracket state types
export type BracketState = "pending" | "underway" | "complete" | undefined;
