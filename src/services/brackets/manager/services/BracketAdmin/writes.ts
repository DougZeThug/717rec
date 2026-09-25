import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';

import type { MatchUpdateFields } from './shapes';

/**
 * Update one match row and prove it was written.
 *
 * Row-level security filters an update a non-admin is not allowed to make: it
 * matches zero rows and reports no error, so a plain update looks like a
 * success that changed nothing. Asking for the updated ids back turns that
 * case into a loud failure with `zeroRowsMessage`.
 */
export async function updateMatchRowOrThrow(
  matchId: number,
  fields: MatchUpdateFields,
  zeroRowsMessage: string
): Promise<void> {
  const { data, error } = await supabase
    .from('match')
    .update(fields)
    .eq('id', matchId)
    .select('id');
  if (error) handleDatabaseError(error, `Failed to update match ${matchId}`);
  if (!data || data.length === 0) throw new BusinessLogicError(zeroRowsMessage);
}
