import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog } from '@/utils/logger';

import type { StorageMatch, StorageStage } from '../../types/BracketServiceTypes';
import type { BracketUpdateContext } from './types';

/**
 * A match no longer stands in the way of bracket completion when:
 *  - it is Completed (4) or Archived (5); or
 *  - it has a strict-null BYE slot and NO TBD slot: BYE matches resolve
 *    automatically and never "finish" in the normal sense.
 *
 * Crucially, a TBD slot ({ id: null } — a participant that arrives when an
 * earlier match resolves) BLOCKS completion even when the other slot is a
 * BYE. The old check filtered out every match without two populated slots,
 * so a silent propagation failure could mark a bracket completed while a
 * real match still awaited its players.
 */
const isMatchSettled = (match: StorageMatch): boolean => {
  if (match.status === 4 || match.status === 5) return true;
  const hasStrictBye = match.opponent1 === null || match.opponent2 === null;
  // No BYE side: both slots hold (or await) real participants — the match
  // must actually be played, whatever its slot state.
  if (!hasStrictBye) return false;
  // BYE side present: settled unless the OTHER side is a TBD still waiting
  // on an earlier match ("BYE vs TBD" must block until the feeder resolves).
  const tbdOnNonByeSide =
    (match.opponent1 !== null && match.opponent1?.id == null) ||
    (match.opponent2 !== null && match.opponent2?.id == null);
  return !tbdOnNonByeSide;
};

/**
 * Check whether every match in the tournament is settled and, if so, flip
 * brackets.state to 'completed'. The .neq guard prevents redundant UPDATEs
 * (and the resulting duplicate realtime events).
 *
 * Errors are THROWN: a completion check that cannot read or write leaves the
 * bracket in an unknown state, and the caller must surface that instead of
 * carrying on silently.
 */
export async function markBracketCompleteIfDone(
  ctx: BracketUpdateContext,
  tournamentId: string
): Promise<void> {
  const { storage } = ctx;

  const stages = await storage.select('stage', { tournament_id: tournamentId });
  if (!stages) return;
  const stagesArray = (Array.isArray(stages) ? stages : [stages]) as StorageStage[];

  const matchResults = await Promise.all(
    stagesArray.map((s) => storage.select('match', { stage_id: s.id }))
  );
  const allMatches: StorageMatch[] = matchResults.flatMap((m) =>
    !m ? [] : ((Array.isArray(m) ? m : [m]) as StorageMatch[])
  );

  if (allMatches.length === 0) return;

  const blocking = allMatches.filter((m) => !isMatchSettled(m));
  if (blocking.length > 0) {
    bracketLog(`Bracket ${tournamentId} not complete: ${blocking.length} match(es) outstanding`);
    return;
  }

  const { error } = await supabase
    .from('brackets')
    .update({ state: 'completed' })
    .eq('id', tournamentId)
    .neq('state', 'completed');

  if (error) {
    handleDatabaseError(error, 'Failed to mark bracket as completed');
  }

  bracketLog(`🏁 Bracket ${tournamentId} marked as completed`);
}
