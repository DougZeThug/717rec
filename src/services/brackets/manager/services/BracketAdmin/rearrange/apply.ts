import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, successLog } from '@/utils/logger';

import { markBracketCompleteIfDone } from '../../BracketUpdate/completion';
import type { BracketAdminDeps } from '../types';
import { loadRearrangeBoard } from './board';
import { simulateRearrange } from './simulate';
import type { RearrangeApplyResult, SlotAssignment } from './types';

/**
 * Admin-only: apply a whole losers-bracket rearrangement in one batch.
 *
 * The client's live preview ran simulateRearrange against the board it was
 * given; this re-loads the board fresh and re-runs the SAME simulation, so a
 * bracket that changed underneath the screen is refused (the assignment set no
 * longer matches the movable spots) rather than half-applied.
 *
 * Writes are sequential in ascending (round, match number) order — feeders
 * before landings — ON PURPOSE: the fixed order keeps a mid-sequence database
 * failure diagnosable, and Repair Bracket is the recovery tool. Same
 * non-transactional stance as the swap tool. The playoff_matches read-model is
 * restated automatically by the database trigger on every opponent change.
 */
export async function applyLoserBracketRearrange(
  deps: BracketAdminDeps,
  bracketId: string,
  assignments: SlotAssignment[]
): Promise<RearrangeApplyResult> {
  bracketLog('Admin losers-bracket rearrange requested', {
    bracketId,
    assignments: assignments.length,
  });

  const board = await loadRearrangeBoard(deps, bracketId);
  const plan = simulateRearrange(board.snapshot, assignments);
  if (!plan.ok) {
    throw new BusinessLogicError(plan.problems.map((problem) => problem.message).join(' '));
  }

  for (const write of plan.writes) {
    const { error } = await supabase.from('match').update(write.fields).eq('id', write.matchId);
    if (error) {
      handleDatabaseError(error, `Failed to update match ${write.matchId} during rearrange`);
    }
  }

  await markBracketCompleteIfDone({ storage: deps.storage }, bracketId);

  const changedMatchIds = plan.writes.map((write) => write.matchId);
  const message =
    [...plan.moves, ...plan.consequences].join(' ') ||
    'Nothing changed — teams were already there.';
  successLog(`Admin rearranged losers bracket for ${bracketId}`, message);
  return { changedMatchIds, message };
}
