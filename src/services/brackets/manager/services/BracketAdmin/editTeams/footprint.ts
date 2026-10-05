import { BusinessLogicError } from '@/types/errors';

import type { StorageMatch } from '../../../types/BracketServiceTypes';
import type { SlotRef } from '../rearrange/types';
import type { MatchUpdateFields, OpponentSide } from '../shapes';
import type { EditTeamsContext } from './context';
import type { WantedMatch } from './occupancy';
import { roundTwoLandingOf } from './occupancy';
import {
  isWinnersRoundOne,
  matchLabel,
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
 * Where the losers bracket sends each match's automatic result, and which
 * losers matches the edit changes or aims at. Together they say which part of
 * the losers bracket the audit has to walk.
 */
export interface LosersAudit {
  landings: Record<string, SlotRef | null>;
  startMatchIds: number[];
}

/**
 * Last line of defence before writing: replay every planned write on a copy
 * of the stage and prove each team the edit touches ends up where it should.
 *
 * A team placed in a round 1 match sits in exactly one round 1 slot, plus the
 * round 2 slot its walkover sends it to, and nowhere else. A team taken out
 * of the bracket sits nowhere. Anything else means the plan would leave a
 * team in two matches or in none, so nothing is written.
 *
 * In a double-elimination bracket the losers bracket is audited too, so a
 * losers team a half-finished cascade left in a stale spot is caught.
 */
export function assertFootprint(
  ctx: EditTeamsContext,
  wanted: WantedMatch[],
  writes: PlannedWrite[],
  losers?: LosersAudit
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
  if (losers) assertLosersCascade(ctx, matches, losers);
}

/**
 * Walk the losers bracket forward from every match the edit changes or aims
 * at, and prove each match's result sits where the bracket sends it.
 *
 * A match with a BYE or an empty spot sends on its walkover team, a double
 * BYE, or nothing yet. The spot it lands in must hold exactly that. A team
 * left in a later spot after its earlier match went back to waiting is the
 * leftover of a cascade that stopped part-way, so nothing is written on top of
 * it. A match with two teams is skipped: its winner is whoever played.
 */
function assertLosersCascade(
  ctx: EditTeamsContext,
  matches: StorageMatch[],
  { landings, startMatchIds }: LosersAudit
): void {
  const byId = new Map(matches.map((match) => [match.id, match]));
  const seen = new Set<number>();
  const queue = [...startMatchIds];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    if (seen.has(id)) continue;
    seen.add(id);
    const feeder = byId.get(id);
    const landing = landings[String(id)];
    const landingMatch = landing ? byId.get(landing.matchId) : undefined;
    if (!feeder || !landing || !landingMatch) continue;
    queue.push(landing.matchId);

    const first = occupantOf(ctx, feeder.opponent1);
    const second = occupantOf(ctx, feeder.opponent2);
    if (first.kind === 'team' && second.kind === 'team') continue;

    const sent = occupantId(productOf(first, second));
    const held = occupantId(occupantOf(ctx, landingMatch[landing.side]));
    if (sent !== held) {
      throw new BusinessLogicError(
        `This change would leave ${matchLabel(ctx, landingMatch)} out of step with the match ` +
          'before it. Nothing was changed.'
      );
    }
  }
}
