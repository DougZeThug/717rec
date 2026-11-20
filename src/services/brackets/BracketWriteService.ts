import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { dbLog } from '@/utils/logger';

/**
 * Service layer for bracket write operations
 * Abstracts Supabase mutations from presentation components
 */

/** The fields of a bracket an admin can change after it exists. */
export interface BracketUpdateInput {
  title?: string;
  division_id?: string | null;
  season_id?: string | null;
}

/**
 * Update a bracket's title, division, or season.
 *
 * Only these fields are safe to change. A bracket's format, size, and team list
 * define the generated stage, rounds, and matches, so changing any of those
 * means deleting the bracket and building it again. Use Update Seeding or
 * Rearrange Teams for structural changes to a bracket that already exists.
 */
export const updateBracket = async (
  bracketId: string,
  patch: BracketUpdateInput
): Promise<void> => {
  const { data: updated, error } = await supabase
    .from('brackets')
    .update(patch)
    .eq('id', bracketId)
    .select('id')
    .maybeSingle();

  if (error) {
    dbLog('Error updating bracket:', error);
    handleDatabaseError(error, 'Failed to update bracket');
  }
  if (!updated) {
    throw new BusinessLogicError(
      'Nothing was saved. This bracket may have been deleted, or your admin access may have changed. Refresh the page and try again.'
    );
  }
};

/**
 * Delete a bracket by ID
 * @throws {BusinessLogicError} When no row was deleted (already gone, or row-level
 *   security filtered it out without an error)
 */
export const deleteBracket = async (bracketId: string): Promise<void> => {
  const { data: deleted, error } = await supabase
    .from('brackets')
    .delete()
    .eq('id', bracketId)
    .select('id')
    .maybeSingle();

  if (error) {
    dbLog('Error deleting bracket:', error);
    handleDatabaseError(error, 'Failed to delete bracket');
  }
  if (!deleted) {
    throw new BusinessLogicError(
      'Nothing was deleted. This bracket may already be gone, or your admin access may have changed. Refresh the page and try again.'
    );
  }
};

/**
 * Update a legacy playoff match with full score data
 * Used by usePlayoffMatchUpdate hook (legacy path)
 *
 * The caller must stamp updated_at: playoff_matches has no updated_at trigger,
 * and season stats order playoff results by that column
 * (PlayoffSeasonMatchService.recordedAt) to work out current streaks.
 */
export const updatePlayoffMatchScores = async (
  matchId: string,
  data: {
    team1_score: number;
    team2_score: number;
    winner_id: string;
    loser_id: string;
    status: string;
    updated_at: string;
  }
): Promise<void> => {
  const { data: updated, error } = await supabase
    .from('playoff_matches')
    .update(data)
    .eq('id', matchId)
    .select('id')
    .maybeSingle();

  if (error) {
    handleDatabaseError(error, 'Failed to update playoff match scores');
  }
  if (!updated) {
    throw new BusinessLogicError(
      'Nothing was saved. This match may have been deleted, or your admin access may have changed. Refresh the page and try again.'
    );
  }
};

/**
 * Atomically replace all playoff_games rows for a match.
 *
 * Wraps DELETE + INSERT in a single SECURITY DEFINER Postgres function so a
 * failed insert no longer leaves the match with an empty game list. The old
 * separate delete and insert helpers are gone: a failure between the two
 * steps left the match with no games.
 */
export const replacePlayoffGames = async (
  matchId: string,
  games: Array<{
    game_number: number;
    team1_score: number;
    team2_score: number;
    winner_id: string | null;
  }>
): Promise<void> => {
  const { error } = await supabase.rpc('replace_playoff_games', {
    p_match_id: matchId,
    p_games: games,
  });

  if (error) {
    handleDatabaseError(error, 'Failed to replace playoff games');
  }
};
