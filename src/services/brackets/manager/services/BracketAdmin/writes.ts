import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';

import type { MatchUpdateFields } from './shapes';

/**
 * A write-time check that the match still has the status the edit was planned
 * against. The plan's checks run on a snapshot read earlier; without this, a
 * match scored in another tab in between would be overwritten.
 */
export interface MatchStatusGuard {
  expectedStatus: number;
  /** Thrown when the match no longer has the expected status. */
  staleMessage: string;
}

/**
 * Update one match row and prove it was written.
 *
 * Row-level security filters an update a non-admin is not allowed to make: it
 * matches zero rows and reports no error, so a plain update looks like a
 * success that changed nothing. Asking for the updated ids back turns that
 * case into a loud failure with `zeroRowsMessage`.
 *
 * With a `guard`, the update also only matches a row still holding the
 * expected status. A zero-row result is then either that or row-level
 * security, so the row's status is read back to tell them apart: a different
 * status throws `guard.staleMessage`, anything else throws `zeroRowsMessage`.
 */
export async function updateMatchRowOrThrow(
  matchId: number,
  fields: MatchUpdateFields,
  zeroRowsMessage: string,
  guard?: MatchStatusGuard
): Promise<void> {
  let query = supabase.from('match').update(fields).eq('id', matchId);
  if (guard) query = query.eq('status', guard.expectedStatus);
  const { data, error } = await query.select('id');
  if (error) handleDatabaseError(error, `Failed to update match ${matchId}`);
  if (data && data.length > 0) return;

  if (guard) {
    const { data: current, error: readError } = await supabase
      .from('match')
      .select('status')
      .eq('id', matchId)
      .maybeSingle();
    if (readError) handleDatabaseError(readError, `Failed to read match ${matchId}`);
    if (current && current.status !== guard.expectedStatus) {
      throw new BusinessLogicError(guard.staleMessage);
    }
  }
  throw new BusinessLogicError(zeroRowsMessage);
}
