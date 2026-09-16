import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';
import type { BracketState, PlayoffBracket } from '@/utils/playoffs/playoffTypes';

type BracketRow = Tables<'brackets'>;

type BracketDivisionRow = {
  name: string | null;
  display_division: string | null;
};

type BracketDomainRow = Pick<
  BracketRow,
  | 'id'
  | 'title'
  | 'format'
  | 'state'
  | 'division_id'
  | 'challonge_tournament_id'
  | 'uses_brackets_manager'
  | 'created_at'
  | 'wb_champion_id'
  | 'bracket_data'
  | 'migrated'
  | 'migrated_at'
  | 'reset_match_needed'
> & {
  name?: string;
};

export type BracketsOverviewRow = Pick<
  BracketRow,
  | 'id'
  | 'title'
  | 'format'
  | 'state'
  | 'division_id'
  | 'season_id'
  | 'challonge_tournament_id'
  | 'uses_brackets_manager'
  | 'created_at'
> & {
  divisions: BracketDivisionRow | null;
};

type BracketInfoRow = Pick<
  BracketRow,
  'id' | 'title' | 'format' | 'state' | 'uses_brackets_manager' | 'bracket_data' | 'participants'
>;

type BracketWithDivisionRow = Pick<
  BracketRow,
  | 'id'
  | 'title'
  | 'format'
  | 'state'
  | 'division_id'
  | 'season_id'
  | 'challonge_tournament_id'
  | 'uses_brackets_manager'
  | 'bracket_data'
> & {
  // Nullable like the overview row: brackets.division_id is nullable, so the
  // join is a left join and a bracket can legitimately arrive without one.
  divisions: BracketDivisionRow | null;
};

// Helper to normalize bracket state - handles both legacy and current DB values
const computeBracketState = (state: string): BracketState =>
  state === 'in_progress' || state === 'underway'
    ? 'in_progress'
    : state === 'completed' || state === 'complete'
      ? 'completed'
      : 'pending';

// Normalization function to convert Supabase rows to PlayoffBracket objects
const mapRowToBracket = (row: BracketDomainRow): PlayoffBracket => ({
  ...row,
  name: row.title || row.name,
  format: row.format ?? '',
  created_at: row.created_at ?? undefined,
  challonge_tournament_id: row.challonge_tournament_id ?? undefined,
  matches: [],
  state: computeBracketState(row.state || 'pending'),
});

/**
 * Fetch a single bracket's basic data by ID
 * Used by usePlayoffBracketData hook
 */
export const fetchPlayoffBracketData = async (bracketId: string): Promise<PlayoffBracket> => {
  const { data, error } = await supabase
    .from('brackets')
    .select(
      'id, title, format, state, division_id, challonge_tournament_id, uses_brackets_manager, created_at, wb_champion_id, bracket_data, migrated, migrated_at, reset_match_needed'
    )
    .eq('id', bracketId)
    .maybeSingle();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch playoff bracket data');
  }

  return mapRowToBracket(ensureFound(data, 'PlayoffBracket', bracketId));
};

/**
 * Fetch brackets overview (with divisions) optionally filtered by season
 * Used by usePlayoffViewModel.compat.ts
 */
export const fetchBracketsOverview = async (
  seasonId?: string | null
): Promise<BracketsOverviewRow[]> => {
  let query = supabase
    .from('brackets')
    .select(
      `
      id, title, format, state, division_id, season_id, challonge_tournament_id, uses_brackets_manager, created_at,
      divisions(name, display_division)
    `
    )
    .order('created_at', { ascending: false });

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query;

  if (error) {
    handleDatabaseError(error, 'Failed to fetch brackets overview');
  }

  return (data ?? []) as BracketsOverviewRow[];
};

/**
 * Fetch bracket info for JSONB/uses_brackets_manager check
 * Used by BracketView component
 *
 * maybeSingle, not single: PostgREST answers a 0-row `single` with an error
 * (PGRST116) rather than with empty data, so handleDatabaseError threw first
 * and the ensureFound below could never run. A stale link to a deleted bracket
 * reached the page as "Cannot coerce the result to a single JSON object".
 * Matches fetchPlayoffBracketData above.
 */
export const fetchBracketInfo = async (bracketId: string): Promise<BracketInfoRow> => {
  const { data, error } = await supabase
    .from('brackets')
    .select('id, title, format, state, uses_brackets_manager, bracket_data, participants')
    .eq('id', bracketId)
    .maybeSingle();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch bracket info');
  }

  // 'Bracket', not the row type's name: this reaches the page as the reason.
  return ensureFound(data, 'Bracket', bracketId) as BracketInfoRow;
};

/**
 * Fetch bracket with division join for bracket data loading
 * Used by useBracketData hook (step 1)
 *
 * maybeSingle for the reason given on fetchBracketInfo above.
 *
 * The division is left-joined, not inner-joined: division_id is nullable, and an
 * inner join returned no row at all for those brackets, so a deep link to one
 * failed as "not found" while the brackets list still showed it. Callers already
 * handle a null division and fall back to "Unknown".
 */
export const fetchBracketWithDivision = async (
  bracketId: string
): Promise<BracketWithDivisionRow> => {
  const { data, error } = await supabase
    .from('brackets')
    .select(
      `
      id,
      title,
      format,
      state,
      division_id,
      season_id,
      divisions(display_division, name),
      challonge_tournament_id,
      uses_brackets_manager,
      bracket_data
    `
    )
    .eq('id', bracketId)
    .maybeSingle();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch bracket with division');
  }

  return ensureFound(data, 'Bracket', bracketId) as BracketWithDivisionRow;
};
