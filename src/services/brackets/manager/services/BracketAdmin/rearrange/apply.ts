import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, successLog } from '@/utils/logger';

import { markBracketCompleteIfDone } from '../../BracketUpdate/completion';
import type { BracketAdminDeps } from '../types';
import { loadRearrangeBoard } from './board';
import { simulateRearrange } from './simulate';
import type { RearrangeApplyResult, RearrangeSnapshot, SlotAssignment } from './types';
import { slotKeyOf } from './types';

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
  assignments: SlotAssignment[],
  expectedBaseline?: SlotAssignment[]
): Promise<RearrangeApplyResult> {
  bracketLog('Admin losers-bracket rearrange requested', {
    bracketId,
    assignments: assignments.length,
  });

  const board = await loadRearrangeBoard(deps, bracketId);
  if (expectedBaseline) assertBaselineUnchanged(board.snapshot, expectedBaseline);
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

/**
 * Optimistic concurrency: the screen sends the occupancy it was LOADED with,
 * and it must still match the fresh read. A concurrent rearrangement by
 * another admin can permute teams while leaving the movable-spot keys and the
 * team roster identical — invisible to the assignment-coverage check — so the
 * occupancy itself is the version token. Any difference refuses the save
 * instead of silently overwriting the newer arrangement.
 */
function assertBaselineUnchanged(
  snapshot: RearrangeSnapshot,
  expectedBaseline: SlotAssignment[]
): void {
  const fresh = new Map<string, number | null>();
  for (const match of snapshot.matches) {
    for (const side of ['opponent1', 'opponent2'] as const) {
      if (match[side].isOrigin) {
        fresh.set(slotKeyOf({ matchId: match.id, side }), match[side].participantId);
      }
    }
  }
  const changed =
    expectedBaseline.length !== fresh.size ||
    expectedBaseline.some((slot) => {
      const key = slotKeyOf(slot);
      return !fresh.has(key) || fresh.get(key) !== slot.participantId;
    });
  if (changed) {
    throw new BusinessLogicError(
      'The bracket changed since this screen was opened. Close it and reopen to continue.'
    );
  }
}
