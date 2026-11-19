/**
 * Centralized match transformation utilities
 * Consolidates database-to-app format conversions for the Match type
 */

import { Match } from '@/types';

import { normalizeDateWithTime } from './dateNormalization';

// ============= Type Definitions =============

export interface TransformMatchOptions {
  /** Whether to normalize the date using normalizeDateWithTime (default: true) */
  normalizeDate?: boolean;
  /** Logging context for date normalization */
  context?: string;
}

// ============= Raw Input Row Types =============
// These describe the shape of raw Supabase rows (with optional joined data)
// passed to the transformers. They intentionally allow optional/nullable fields
// to mirror what Supabase returns from '.select(...)' with joins.

interface RawTeamJoinObject {
  id?: string;
  team_id?: string;
  name?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
  divisionname?: string | null;
  divisionName?: string | null;
  division_id?: string | null;
  power_score?: number | null;
  sos?: number | null;
}

type RawTeamJoin = RawTeamJoinObject | RawTeamJoinObject[] | null | undefined;

export interface RawMatchRow {
  id: string;
  team1_id?: string | null;
  team2_id?: string | null;
  team1_score?: number | null;
  team2_score?: number | null;
  date?: string | null;
  created_at?: string | null;
  location?: string | null;
  iscompleted?: boolean | null;
  winner_id?: string | null;
  loser_id?: string | null;
  round_number?: number | null;
  position?: number | null;
  bracket_id?: string | null;
  match_type?: string | null;
  next_match_id?: string | null;
  next_loser_match_id?: string | null;
  best_of?: number | null;
  team1_game_wins?: number | null;
  team2_game_wins?: number | null;
  team1?: RawTeamJoin;
  team2?: RawTeamJoin;
}

// ============= Helper Functions =============

/**
 * Extract team details from nested join results (handles array or object format)
 * Includes stats fields (power_score, sos, division_id) for predictions
 */
function extractTeamDetails(team: RawTeamJoin): Match['team1Details'] {
  if (!team) return null;
  const teamRow = Array.isArray(team) ? team[0] : team;
  if (!teamRow) return null;

  return {
    team_id: teamRow.team_id || teamRow.id || '',
    name: teamRow.name ?? '',
    image_url: teamRow.image_url ?? null,
    logo_url: teamRow.logo_url ?? null,
    divisionName: teamRow.divisionname ?? teamRow.divisionName ?? null,
    division_id: teamRow.division_id ?? null,
    power_score: teamRow.power_score ?? null,
    sos: teamRow.sos ?? null,
  };
}

// ============= Main Transform Functions =============

/**
 * Transform a database match row to application Match format
 *
 * @param match - Raw database row from 'matches' table
 * @param options - Transform options
 * @returns Transformed Match object
 */
export function transformDatabaseMatch(
  match: RawMatchRow,
  options: TransformMatchOptions = {}
): Match {
  const { normalizeDate = true, context } = options;

  // Handle date - use normalizeDateWithTime if enabled, otherwise pass it through.
  // A missing date stays missing: matches.date is nullable, and an unscheduled
  // match is not a match played when its row was typed in. created_at is still
  // reported below under its own name.
  const date =
    normalizeDate && match.date
      ? normalizeDateWithTime(match.date, context || `transformDatabaseMatch(${match.id})`)
      : match.date || undefined;

  return {
    id: match.id,
    team1Id: match.team1_id || '',
    team2Id: match.team2_id || '',
    team1Score: match.team1_score ?? undefined,
    team2Score: match.team2_score ?? undefined,
    date,
    location: match.location || '',
    iscompleted: match.iscompleted ?? false,
    winnerId: match.winner_id ?? undefined,
    loserId: match.loser_id ?? undefined,
    round_number: match.round_number ?? undefined,
    position: match.position ?? undefined,
    bracket_id: match.bracket_id ?? undefined,
    match_type: match.match_type ?? undefined,
    next_match_id: match.next_match_id ?? undefined,
    next_loser_match_id: match.next_loser_match_id ?? undefined,
    best_of: match.best_of ?? undefined,
    team1_game_wins: match.team1_game_wins ?? undefined,
    team2_game_wins: match.team2_game_wins ?? undefined,
    created_at: match.created_at ?? undefined,
    // Include team details if present in the join
    team1Details: extractTeamDetails(match.team1),
    team2Details: extractTeamDetails(match.team2),
  };
}

/**
 * Transform multiple database match rows to Match array
 */
export function transformDatabaseMatches(
  matches: RawMatchRow[],
  options?: TransformMatchOptions
): Match[] {
  if (!matches) return [];
  return matches.map((m) => transformDatabaseMatch(m, options));
}
