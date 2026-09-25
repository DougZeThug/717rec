import { helpers } from 'brackets-manager';

import { BusinessLogicError } from '@/types/errors';

import type { StorageMatch } from '../../../types/BracketServiceTypes';
import type { MatchUpdateFields } from '../shapes';
import { destinationBlockReason, idField, slotFields } from '../shapes';
import type { EditTeamsContext } from './context';
import type { WantedMatch } from './occupancy';
import { roundTwoLandingOf } from './occupancy';
import {
  findMatchAt,
  hasBye,
  matchLabel,
  occupantId,
  occupantOf,
  productOf,
  sameOccupant,
  SIDES,
} from './rules';
import type { Occupant } from './types';

/** One match row write: only the columns that change. */
export interface PlannedWrite {
  matchId: number;
  fields: MatchUpdateFields;
}

export interface WinnersPlan {
  /** Rewrites of the round 1 matches being edited. */
  roundOneWrites: PlannedWrite[];
  /** Round 2 slots that gain, lose or swap a walkover winner (siblings combined). */
  roundTwoWrites: PlannedWrite[];
  /** Round 1 matches that gain or lose a BYE, so the losers-bracket slot they feed changes shape. */
  byeChanges: { match: StorageMatch; nowBye: boolean }[];
  /** Plain-language knock-on changes, for the admin. */
  consequences: string[];
}

type LibrarySlot = { id: number | null } | null;

const librarySlotOf = (occupant: Occupant): LibrarySlot =>
  occupant.kind === 'bye' ? null : { id: occupantId(occupant) };

/** The library's status for a match with these slots (brackets-manager's own rule). */
const libraryStatusOf = (opponent1: LibrarySlot, opponent2: LibrarySlot): number =>
  helpers.getMatchStatus({ opponent1, opponent2 } as Parameters<typeof helpers.getMatchStatus>[0]);

const BYE_SLOT = { id: null, position: null, score: null, result: 'bye' } as const;

/** A stored match in the same column form as a planned write, for diffing. */
function storedFields(match: StorageMatch): MatchUpdateFields {
  const fields: MatchUpdateFields = { status: match.status };
  for (const side of SIDES) {
    const slot = match[side];
    Object.assign(
      fields,
      slot === null
        ? slotFields(side, BYE_SLOT)
        : slotFields(side, {
            id: slot?.id ?? null,
            position: slot?.position ?? null,
            score: slot?.score ?? null,
            result: slot?.result ?? null,
          })
    );
  }
  return fields;
}

function diffFields(wanted: MatchUpdateFields, stored: MatchUpdateFields): MatchUpdateFields {
  const changed: MatchUpdateFields = {};
  for (const key of Object.keys(wanted) as (keyof MatchUpdateFields)[]) {
    if (wanted[key] !== stored[key]) Object.assign(changed, { [key]: wanted[key] });
  }
  return changed;
}

/**
 * The whole wanted row of a round 1 match, the way the library writes one at
 * creation: a walkover is Locked (0) with a 'win' for its team and no score;
 * a real match is Ready (2) with no results. A team's slot keeps the seed
 * number the slot was built for; a BYE slot is the stored sentinel.
 */
function roundOneFields(
  wanted: WantedMatch,
  seedOf: (matchNumber: number, side: 'opponent1' | 'opponent2') => number | null
): MatchUpdateFields {
  const walkover = productOf(wanted.opponent1, wanted.opponent2).kind === 'team';
  const fields: MatchUpdateFields = {
    status: libraryStatusOf(librarySlotOf(wanted.opponent1), librarySlotOf(wanted.opponent2)),
  };
  for (const side of SIDES) {
    const occupant = wanted[side];
    Object.assign(
      fields,
      occupant.kind === 'bye'
        ? slotFields(side, BYE_SLOT)
        : slotFields(side, {
            id: occupantId(occupant),
            position: seedOf(wanted.match.number, side) ?? wanted.match[side]?.position ?? null,
            score: null,
            result: walkover ? 'win' : null,
          })
    );
  }
  return fields;
}

/**
 * Plan every winners-bracket write an edit of round 1 needs: the round 1
 * rows themselves, and the round 2 slots their walkover winners occupy.
 *
 * Declarative on purpose: each slot is compared with what it should hold
 * after the edit, so a round 2 slot that already holds the wanted team (an
 * interrupted edit being saved again) needs no write. A round 2 slot holding
 * something this match could not have put there is refused rather than
 * overwritten, and so is a round 2 match that has been played.
 */
export function planWinnersChanges(
  ctx: EditTeamsContext,
  wanted: WantedMatch[],
  seedOf: (matchNumber: number, side: 'opponent1' | 'opponent2') => number | null
): WinnersPlan {
  const plan: WinnersPlan = {
    roundOneWrites: [],
    roundTwoWrites: [],
    byeChanges: [],
    consequences: [],
  };
  const roundTwoWorking = new Map<number, { stored: StorageMatch; working: StorageMatch }>();

  for (const entry of wanted) {
    const { match } = entry;
    const stored1 = occupantOf(ctx, match.opponent1);
    const stored2 = occupantOf(ctx, match.opponent2);

    const fields = diffFields(roundOneFields(entry, seedOf), storedFields(match));
    if (Object.keys(fields).length > 0) plan.roundOneWrites.push({ matchId: match.id, fields });

    const nowBye = hasBye(entry.opponent1, entry.opponent2);
    if (nowBye !== hasBye(stored1, stored2)) plan.byeChanges.push({ match, nowBye });

    const oldProduct = productOf(stored1, stored2);
    const newProduct = productOf(entry.opponent1, entry.opponent2);
    if (sameOccupant(oldProduct, newProduct)) continue;

    const settings = ctx.stage.settings as { consolationFinal?: boolean };
    if (ctx.stage.type === 'single_elimination' && settings.consolationFinal === true) {
      throw new BusinessLogicError(
        'Adding or removing a BYE is not supported in a bracket with a third-place match.'
      );
    }
    const landing = roundTwoLandingOf(match.number);
    const roundTwo = findMatchAt(ctx, 1, 2, landing.matchNumber);
    if (!roundTwo) {
      throw new BusinessLogicError(
        `Adding or removing a BYE is not possible in ${matchLabel(ctx, match)}: it has no next round.`
      );
    }
    const slotState = roundTwoWorking.get(roundTwo.id) ?? {
      stored: roundTwo,
      working: structuredClone(roundTwo),
    };
    roundTwoWorking.set(roundTwo.id, slotState);

    const current = occupantOf(ctx, slotState.working[landing.side]);
    if (sameOccupant(current, newProduct)) continue;
    if (current.kind !== 'tbd' && !sameOccupant(current, oldProduct)) {
      throw new BusinessLogicError(
        `${matchLabel(ctx, roundTwo)} holds a team there that did not come from ` +
          `${matchLabel(ctx, match)}, so this change can't be made safely.`
      );
    }
    const blocked = destinationBlockReason(roundTwo);
    if (blocked) {
      throw new BusinessLogicError(
        `This change needs to update ${matchLabel(ctx, roundTwo)}, but that match ${blocked}.`
      );
    }

    slotState.working[landing.side] = { id: occupantId(newProduct) };
    if (newProduct.kind === 'team') {
      plan.consequences.push(
        `${newProduct.name} has no opponent in ${matchLabel(ctx, match)} and moves on to ` +
          `${matchLabel(ctx, roundTwo)} automatically.`
      );
    } else if (current.kind === 'team') {
      plan.consequences.push(
        `${current.name} is taken back out of ${matchLabel(ctx, roundTwo)}; that spot now ` +
          `waits for ${matchLabel(ctx, match)} to be played.`
      );
    }
  }

  for (const { stored, working } of roundTwoWorking.values()) {
    const fields: MatchUpdateFields = {};
    for (const side of SIDES) {
      const id = working[side]?.id ?? null;
      if (id !== (stored[side]?.id ?? null)) Object.assign(fields, idField(side, id));
    }
    const status = libraryStatusOf(
      working.opponent1 === null ? null : { id: working.opponent1?.id ?? null },
      working.opponent2 === null ? null : { id: working.opponent2?.id ?? null }
    );
    if (status !== stored.status) fields.status = status;
    if (Object.keys(fields).length > 0) plan.roundTwoWrites.push({ matchId: stored.id, fields });
  }

  return plan;
}
