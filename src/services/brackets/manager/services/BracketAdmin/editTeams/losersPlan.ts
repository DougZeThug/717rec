import { BusinessLogicError } from '@/types/errors';

import { simulateSlotChanges } from '../rearrange/simulate';
import type { ForcedSlotChange, RearrangeSnapshot } from '../rearrange/types';
import type { EditTeamsContext } from './context';
import type { WantedMatch } from './occupancy';
import { hasBye, matchLabel, SIDES } from './rules';
import type { PlannedWrite } from './winnersPlan';

export interface LosersPlan {
  writes: PlannedWrite[];
  consequences: string[];
}

/**
 * Plan the losers-bracket side of a winners round 1 edit.
 *
 * The loser of winners round 1 match n drops into the losers round 1 slot
 * whose feeder marker is n. A match with a BYE has no loser, so that slot is
 * a stored BYE; a real match's slot waits for its loser and must keep marker
 * n, or the library later drops the loser into the wrong slot. When an edit
 * adds or removes a BYE — or the slot has gone wrong — the slot is forced to
 * what it should hold, and the rearrange simulation ripples the change on
 * (walkovers made or undone, BYEs passed on), refusing a change that would
 * reach a played match.
 */
export function planLosersChanges(
  ctx: EditTeamsContext,
  snapshot: RearrangeSnapshot,
  wanted: WantedMatch[],
  byeChangedMatchIds: Set<number>
): LosersPlan {
  const changes: ForcedSlotChange[] = [];
  for (const entry of wanted) {
    const wbNumber = entry.match.number;
    const target = snapshot.matches
      .filter((lbMatch) => lbMatch.roundNumber === 1)
      .flatMap((lbMatch) =>
        SIDES.filter((side) => lbMatch[side].feederMarker === wbNumber).map((side) => ({
          lbMatch,
          side,
        }))
      )[0];
    if (!target) {
      throw new BusinessLogicError(
        `The losers-bracket spot fed by ${matchLabel(ctx, entry.match)} can't be found. ` +
          'Run Repair Bracket first.'
      );
    }

    const slot = target.lbMatch[target.side];
    const nowBye = hasBye(entry.opponent1, entry.opponent2);
    const alreadyRight = nowBye
      ? slot.shape === 'bye'
      : slot.shape === 'tbd' && slot.position === wbNumber;
    if (alreadyRight && !byeChangedMatchIds.has(entry.match.id)) continue;

    changes.push({
      matchId: target.lbMatch.id,
      side: target.side,
      content: nowBye ? { kind: 'bye' } : { kind: 'tbd', position: wbNumber },
    });
  }
  if (changes.length === 0) return { writes: [], consequences: [] };

  const result = simulateSlotChanges(snapshot, changes, { labelPrefix: 'Losers ' });
  if (!result.ok) {
    throw new BusinessLogicError(result.problems.map((problem) => problem.message).join(' '));
  }
  return {
    writes: result.writes.map((write) => ({ matchId: write.matchId, fields: write.fields })),
    consequences: result.consequences,
  };
}
