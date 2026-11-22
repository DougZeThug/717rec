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
