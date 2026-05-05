import { supabase } from '@/integrations/supabase/client';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';
import type { BracketState, PlayoffBracket } from '@/utils/playoffs/playoffTypes';
import type { Database } from '@/integrations/supabase/types';

type BracketDbRow = Database['public']['Tables']['brackets']['Row'];
type DivisionDbRow = Database['public']['Tables']['divisions']['Row'];

// Subset of brackets table columns returned by fetchPlayoffBracketData
type BracketDataRow = Pick<
  BracketDbRow,
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
>;

// Shape returned by fetchBracketsOverview (subset of brackets + division join)
export type BracketOverviewRow = Pick<
  BracketDbRow,
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
  divisions: Pick<DivisionDbRow, 'name' | 'display_division'> | null;
};

// Shape returned by fetchBracketInfo
export type BracketInfoRow = Pick<
  BracketDbRow,
  'id' | 'title' | 'format' | 'state' | 'uses_brackets_manager' | 'bracket_data' | 'participants'
>;

// Shape returned by fetchBracketWithDivision
export type BracketWithDivisionRow = Pick<
  BracketDbRow,
  | 'id'
  | 'title'
  | 'format'
  | 'state'
  | 'division_id'
  | 'challonge_tournament_id'
  | 'uses_brackets_manager'
  | 'bracket_data'
> & {
  divisions: Pick<DivisionDbRow, 'display_division' | 'name'>;
};

// Helper to normalize bracket state - handles both legacy and current DB values
const computeBracketState = (state: string): BracketState =>
  state === 'in_progress' || state === 'underway'
    ? 'in_progress'
    : state === 'completed' || state === 'complete'
      ? 'completed'
      : 'pending';

// Normalization function to convert Supabase rows to PlayoffBracket objects
const mapRowToBracket = (row: BracketDataRow): PlayoffBracket => ({
  ...row,
  name: row.title,
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
): Promise<BracketOverviewRow[]> => {
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

  return (data ?? []) as BracketOverviewRow[];
};

/**
 * Fetch bracket info for JSONB/uses_brackets_manager check
 * Used by BracketView component
 */
export const fetchBracketInfo = async (bracketId: string): Promise<BracketInfoRow | null> => {
  const { data, error } = await supabase
    .from('brackets')
    .select('id, title, format, state, uses_brackets_manager, bracket_data, participants')
    .eq('id', bracketId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch bracket info');
  }

  return data as BracketInfoRow | null;
};

/**
 * Fetch bracket with division join for bracket data loading
 * Used by useBracketData hook (step 1)
 */
export const fetchBracketWithDivision = async (
  bracketId: string
): Promise<BracketWithDivisionRow | null> => {
  const { data, error } = await supabase
    .from('brackets')
    .select(
      `
      id,
      title,
      format,
      state,
      division_id,
      divisions!inner(display_division, name),
      challonge_tournament_id,
      uses_brackets_manager,
      bracket_data
    `
    )
    .eq('id', bracketId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch bracket with division');
  }

  return data as BracketWithDivisionRow | null;
};
