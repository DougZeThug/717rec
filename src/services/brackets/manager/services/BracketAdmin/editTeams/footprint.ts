import { BusinessLogicError } from '@/types/errors';

import type { StorageMatch } from '../../../types/BracketServiceTypes';
import type { MatchUpdateFields, OpponentSide } from '../shapes';
import type { EditTeamsContext } from './context';
import type { WantedMatch } from './occupancy';
import { roundTwoLandingOf } from './occupancy';
import {
  isWinnersRoundOne,
  occupantId,
  occupantOf,
  participantName,
  productOf,
  SIDES,
} from './rules';
import type { PlannedWrite } from './winnersPlan';

const SLOT_KEYS = ['id', 'position', 'score', 'result'] as const;

/** Apply one planned column write to a stored-shape match copy (BYE sentinel → null slot). */
export function applyFields(match: StorageMatch, fields: MatchUpdateFields): void {
  for (const side of SIDES) {
    const columnOf = (key: (typeof SLOT_KEYS)[number]) =>
      `${side}_${key}` as keyof MatchUpdateFields;
    const present = SLOT_KEYS.filter((key) => columnOf(key) in fields);
    if (present.length === 0) continue;
    if (present.includes('result') && fields[columnOf('result')] === 'bye') {
      match[side] = null;
      continue;
    }
    const slot: Record<string, unknown> = match[side] === null ? {} : { ...(match[side] ?? {}) };
    for (const key of present) {
      const value = fields[columnOf(key)];
      if (value === null && key !== 'id') delete slot[key];
      else slot[key] = value;
    }
    (match as Record<OpponentSide, unknown>)[side] = slot;
  }
  if (fields.status !== undefined) match.status = fields.status;
}

/**
 * Last line of defence before writing: replay every planned write on a copy
 * of the stage and prove each team the edit touches ends up where it should.
 *
 * A team placed in a round 1 match sits in exactly one round 1 slot, plus the
 * round 2 slot its walkover sends it to, and nowhere else. A team taken out
 * of the bracket sits nowhere. Anything else means the plan would leave a
 * team in two matches or in none, so nothing is written.
 */
export function assertFootprint(
  ctx: EditTeamsContext,
  wanted: WantedMatch[],
  writes: PlannedWrite[]
): void {
  const working = new Map(ctx.stageMatches.map((match) => [match.id, structuredClone(match)]));
  for (const write of writes) {
    const match = working.get(write.matchId);
    if (match) applyFields(match, write.fields);
  }
  const matches = [...working.values()];

  const placed = new Set<number>();
  const touched = new Set<number>();
  for (const entry of wanted) {
    for (const side of SIDES) {
      const newId = occupantId(entry[side]);
      if (newId !== null) {
        placed.add(newId);
        touched.add(newId);
      }
      const oldId = entry.match[side]?.id;
      if (oldId != null) touched.add(oldId);
    }
  }

  for (const participantId of touched) {
    const slots = matches.flatMap((match) =>
      SIDES.filter((side) => match[side]?.id === participantId).map((side) => ({ match, side }))
    );
    const roundOne = slots.filter(({ match }) => isWinnersRoundOne(ctx, match));

    const expected = new Set<string>();
    if (placed.has(participantId) && roundOne.length === 1) {
      const { match: home, side } = roundOne[0];
      expected.add(`${home.id}:${side}`);
      const product = productOf(occupantOf(ctx, home.opponent1), occupantOf(ctx, home.opponent2));
      if (occupantId(product) === participantId) {
        const landing = roundTwoLandingOf(home.number);
        const roundTwo = matches.find(
          (match) =>
            ctx.groupNumberById.get(match.group_id) === 1 &&
            ctx.roundNumberById.get(match.round_id) === 2 &&
            match.number === landing.matchNumber
        );
        if (roundTwo) expected.add(`${roundTwo.id}:${landing.side}`);
      }
    }

    const ok = placed.has(participantId)
      ? roundOne.length === 1 &&
        slots.every(({ match, side }) => expected.has(`${match.id}:${side}`))
      : slots.length === 0;
    if (!ok) {
      throw new BusinessLogicError(
        `This change would leave ${participantName(ctx, participantId)} in the wrong place ` +
          '(in two matches, or in none). Nothing was changed.'
      );
    }
  }
}
