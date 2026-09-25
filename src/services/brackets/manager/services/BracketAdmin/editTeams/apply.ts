import { BusinessLogicError, ServiceError } from '@/types/errors';
import { bracketLog, failureLog, successLog } from '@/utils/logger';

import { markBracketCompleteIfDone } from '../../BracketUpdate/completion';
import { ensureParticipantRow } from '../participants';
import type { MatchUpdateFields } from '../shapes';
import type { BracketAdminDeps, EditMatchParticipantsResult } from '../types';
import { updateMatchRowOrThrow } from '../writes';
import { planEdit } from './plan';
import { matchLabel, occupantId, SIDES } from './rules';
import type { EditMatchTeamsParams, Occupant } from './types';
import type { PlannedWrite } from './winnersPlan';

const NOT_SAVED_MESSAGE = 'Not saved — only admins can edit brackets. Nothing was changed.';

/** Swap placeholder participant ids for the real ones in a planned write. */
function withRealIds(write: PlannedWrite, realIds: Map<number, number>): PlannedWrite {
  const fields: MatchUpdateFields = { ...write.fields };
  for (const side of SIDES) {
    const key = `${side}_id` as const;
    const id = fields[key];
    if (typeof id === 'number' && realIds.has(id)) fields[key] = realIds.get(id);
  }
  return { matchId: write.matchId, fields };
}

/**
 * Admin operation: change who plays in a winners-bracket round 1 match — a
 * team for another team, a team for a BYE, a BYE for a team, or a trade with
 * another unplayed round 1 match.
 *
 * Every check runs before the first write (planEdit): the match must be an
 * unplayed round 1 match that still holds what the screen was opened with,
 * and every picked team must be free or tradeable. The plan covers the
 * knock-on changes too — a walkover's team moving on to round 2 by itself,
 * or a team taken back out of round 2 when its BYE goes, and in double
 * elimination the losers-bracket spot the match's loser drops into (a BYE or
 * a waiting spot) with everything that ripples from it — and is replayed on
 * a copy of the stage to prove no team ends up in two matches.
 *
 * Writes run one at a time, knock-on changes first and the edited match last.
 * The plan is declarative, so if a write fails part-way the edited match
 * still holds its old teams and saving the same edit again finishes the job
 * (Repair Bracket does not reconcile these links). A write that reaches no
 * row — row-level security for a non-admin — fails loudly, and any failure
 * after the first write says the change is only partly saved.
 */
export async function editMatchTeams(
  deps: BracketAdminDeps,
  params: EditMatchTeamsParams
): Promise<EditMatchParticipantsResult> {
  bracketLog('Admin Edit teams requested', { ...params });

  try {
    const plan = await planEdit(deps, params);
    const { ctx } = plan;
    const { match, stage } = ctx;

    // Every check passed: now it is safe to write.
    const realIds = new Map(
      await Promise.all(
        [...plan.newTeams].map(
          async ([placeholderId, team]) =>
            [
              placeholderId,
              await ensureParticipantRow(stage.tournament_id, team, ctx.participants),
            ] as const
        )
      )
    );
    const partialMessage =
      `Only part of this change was saved. Open Edit teams on ${matchLabel(ctx, match)} ` +
      'again and save the same teams to finish.';
    // One at a time ON PURPOSE, in plan order with the edited match last: a
    // failure part-way then leaves the edited match untouched, so saving the
    // same edit again finishes the job. Do not parallelize with Promise.all.
    for (const [index, write] of plan.writes.map((w) => withRealIds(w, realIds)).entries()) {
      try {
        await updateMatchRowOrThrow(write.matchId, write.fields, NOT_SAVED_MESSAGE);
      } catch (error) {
        // Earlier writes have landed, so whatever this one failed with, the
        // admin must hear that the change is half done and how to finish it.
        if (index === 0) throw error;
        throw new BusinessLogicError(partialMessage, error);
      }
    }
    await markBracketCompleteIfDone({ storage: deps.storage }, stage.tournament_id);

    const message = [...plan.changes, ...plan.consequences].join(' ');
    const edited = plan.wanted[0];
    const idOf = (occupant: Occupant) => {
      const id = occupantId(occupant);
      return id === null ? null : (realIds.get(id) ?? id);
    };
    successLog(`Admin edited the teams of match ${match.id}`, message);
    return {
      matchId: match.id,
      opponent1_id: idOf(edited.opponent1),
      opponent2_id: idOf(edited.opponent2),
      message,
    };
  } catch (error) {
    failureLog('Admin Edit teams failed', error);
    if (error instanceof ServiceError) throw error;
    throw new BusinessLogicError(
      `Failed to edit match teams: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    );
  }
}
