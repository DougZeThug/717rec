import { BusinessLogicError } from '@/types/errors';
import { bracketLog, successLog } from '@/utils/logger';

import { markBracketCompleteIfDone } from '../../BracketUpdate/completion';
import type { BracketAdminDeps } from '../types';
import { updateMatchRowOrThrow } from '../writes';
import { loadRearrangeBoard } from './board';
import { simulateRearrange } from './simulate';
import type { RearrangeApplyResult, RearrangeSnapshot, SlotAssignment } from './types';
import { slotKeyOf } from './types';

const NOT_SAVED_MESSAGE = 'Not saved — only admins can edit brackets. Nothing was changed.';
const STALE_MESSAGE =
  'The bracket changed since this screen was opened. Close it and reopen to continue.';
const PARTIAL_MESSAGE =
  'Only part of this rearrangement was saved. Run Repair Bracket to fix the bracket.';

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

  // The status each match had on the board the plan was made from. Sent with
  // every write, so a match scored in another tab since is refused, not
  // overwritten.
  const plannedStatus = new Map(board.snapshot.matches.map((match) => [match.id, match.status]));

  // updateMatchRowOrThrow turns a zero-row update (RLS block) into a loud
  // failure instead of a false "Teams rearranged".
  for (const [index, write] of plan.writes.entries()) {
    try {
      const expectedStatus = plannedStatus.get(write.matchId);
      await updateMatchRowOrThrow(
        write.matchId,
        write.fields,
        NOT_SAVED_MESSAGE,
        expectedStatus === undefined ? undefined : { expectedStatus, staleMessage: STALE_MESSAGE }
      );
    } catch (error) {
      if (index === 0) throw error;
      throw new BusinessLogicError(PARTIAL_MESSAGE, error);
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
    throw new BusinessLogicError(STALE_MESSAGE);
  }
}
