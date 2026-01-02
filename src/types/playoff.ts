/**
 * Playoff-related type definitions for component props
 */

import type { PlayoffTeam } from "@/utils/playoffs/playoffTypes";

/**
 * Bracket data structure for BracketView component
 * Uses union type to handle various bracket data shapes
 */
export interface BracketViewData {
  id: string;
  title?: string;
  format?: string | null;
  state?: string | null;
  uses_brackets_manager?: boolean;
  bracket_data?: unknown;
  participants?: unknown;
  matches?: unknown[];
  teams?: PlayoffTeam[];
}

// Type guard for checking if displayBracket has matches property
export function hasMatches(bracket: unknown): bracket is { matches: unknown[] } {
  return typeof bracket === 'object' && bracket !== null && 'matches' in bracket;
}

// Type guard for checking if displayBracket has teams property
export function hasTeams(bracket: unknown): bracket is { teams: PlayoffTeam[] } {
  return typeof bracket === 'object' && bracket !== null && 'teams' in bracket;
}
