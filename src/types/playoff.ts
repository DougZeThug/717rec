/**
 * Playoff-related type definitions for component props
 */

import type { PlayoffTeam } from '@/utils/playoffs/playoffTypes';

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
