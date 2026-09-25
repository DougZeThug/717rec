import { BusinessLogicError, ValidationError } from '@/types/errors';

import type { StorageMatch } from '../../../types/BracketServiceTypes';
import type { OpponentSide } from '../shapes';
import type { EditTeamsContext } from './context';
import {
  findMatchAt,
  isWinnersRoundOne,
  matchLabel,
  occupantOf,
  sameOccupant,
  SIDES,
  winnersRoundOneBlockReason,
} from './rules';
import type { Occupant } from './types';

/** One winners round 1 match and who should sit in it after the edit. */
export interface WantedMatch {
  match: StorageMatch;
  opponent1: Occupant;
  opponent2: Occupant;
}

/**
 * The round 2 slot a round 1 match feeds, as (match number, side): matches
 * 2k-1 and 2k both feed round 2 match k, the odd one into opponent1.
 */
export const roundTwoLandingOf = (
  roundOneMatchNumber: number
): { matchNumber: number; side: OpponentSide } => ({
  matchNumber: Math.ceil(roundOneMatchNumber / 2),
  side: roundOneMatchNumber % 2 === 1 ? 'opponent1' : 'opponent2',
});

/**
 * Where a picked team may already sit without that being a second match: the
 * edited match itself, and the round 2 slot that match feeds. That slot
 * holds the match's own walkover winner — or, after an interrupted edit, the
 * winner the edit is about to make — and the plan reconciles it either way
 * (refusing if it holds a team the match could not have sent there).
 */
function allowedSlotsOf(ctx: EditTeamsContext, match: StorageMatch): Set<string> {
  const allowed = new Set(SIDES.map((side) => `${match.id}:${side}`));
  const landing = roundTwoLandingOf(match.number);
  const roundTwo = findMatchAt(ctx, 1, 2, landing.matchNumber);
  if (roundTwo) allowed.add(`${roundTwo.id}:${landing.side}`);
  return allowed;
}

/** Where a team the admin picked sits now, as Edit teams sees it. */
type TeamPosition =
  /** In no match (or not in the bracket at all). */
  | { kind: 'free' }
  /** Already in the edited match. */
  | { kind: 'here'; side: OpponentSide }
  /** In another unplayed round 1 match: picking it trades places. */
  | { kind: 'trade'; match: StorageMatch; side: OpponentSide }
  /** Somewhere it can't be moved from, e.g. a played match. */
  | { kind: 'taken'; match: StorageMatch; reason: string | null };

/** Why a round 1 match can't be a trade partner, phrased to follow "which …", or null. */
function partnerBlockReason(ctx: EditTeamsContext, partner: StorageMatch): string | null {
  const blocked = winnersRoundOneBlockReason(partner);
  if (blocked) return blocked;
  if (SIDES.some((side) => occupantOf(ctx, partner[side]).kind === 'tbd')) {
    return 'has an empty spot';
  }
  if ((partner.child_count ?? 0) > 0) return 'has several games';
  return null;
}

export function teamPosition(ctx: EditTeamsContext, participantId: number): TeamPosition {
  const here = SIDES.find((side) => ctx.match[side]?.id === participantId);
  if (here) return { kind: 'here', side: here };
  return positionElsewhere(ctx, participantId);
}

/** Where a team sits outside the edited match and the round 2 slot that match feeds. */
function positionElsewhere(
  ctx: EditTeamsContext,
  participantId: number
): Exclude<TeamPosition, { kind: 'here' }> {
  const hereAllowed = allowedSlotsOf(ctx, ctx.match);
  const occurrences = ctx.stageMatches.flatMap((match) =>
    SIDES.filter(
      (side) => match[side]?.id === participantId && !hereAllowed.has(`${match.id}:${side}`)
    ).map((side) => ({ match, side }))
  );
  if (occurrences.length === 0) return { kind: 'free' };

  const roundOne = occurrences.filter(({ match }) => isWinnersRoundOne(ctx, match));
  if (roundOne.length === 1) {
    const partner = roundOne[0].match;
    const reason = partnerBlockReason(ctx, partner);
    const partnerAllowed = allowedSlotsOf(ctx, partner);
    if (reason) return { kind: 'taken', match: partner, reason };
    if (occurrences.every(({ match, side }) => partnerAllowed.has(`${match.id}:${side}`))) {
      return { kind: 'trade', match: partner, side: roundOne[0].side };
    }
  }
  return { kind: 'taken', match: occurrences[0].match, reason: null };
}

/**
 * Who the picks push out of the edited match: a team no pick keeps (a side
 * switch keeps a team), or its BYE when neither pick is a BYE. An empty spot
 * pushes nobody out.
 */
export function displacedOccupants(
  ctx: EditTeamsContext,
  picks: Record<OpponentSide, Occupant>
): { side: OpponentSide; occupant: Occupant }[] {
  const keptIds = new Set(
    SIDES.map((side) => picks[side]).flatMap((p) => (p.kind === 'team' ? [p.participantId] : []))
  );
  const pickedBye = SIDES.some((side) => picks[side].kind === 'bye');
  return SIDES.flatMap((side) => {
    const old = occupantOf(ctx, ctx.match[side]);
    if (sameOccupant(picks[side], old) || old.kind === 'tbd') return [];
    if (old.kind === 'team' && keptIds.has(old.participantId)) return [];
    if (old.kind === 'bye' && pickedBye) return [];
    return [{ side, occupant: old }];
  });
}

/**
 * The round 1 matches pushed-out teams already sit in, kept as they are.
 *
 * A pushed-out team normally leaves the bracket. If it already sits in one
 * other unplayed round 1 match, it stays there instead: that is a trade an
 * earlier save started and stopped part-way (the other match was written,
 * this one was not), so saving the same teams again finishes it.
 */
function finishedMoves(
  ctx: EditTeamsContext,
  pushedOut: { occupant: Occupant }[],
  planned: WantedMatch[]
): WantedMatch[] {
  const kept: WantedMatch[] = [];
  for (const { occupant } of pushedOut) {
    if (occupant.kind !== 'team') continue;
    const position = positionElsewhere(ctx, occupant.participantId);
    if (position.kind !== 'trade') continue;
    const home = position.match;
    if ([...planned, ...kept].some((entry) => entry.match.id === home.id)) continue;
    kept.push({
      match: home,
      opponent1: occupantOf(ctx, home.opponent1),
      opponent2: occupantOf(ctx, home.opponent2),
    });
  }
  return kept;
}

/**
 * Turn the admin's picks into the wanted occupancy of the edited round 1
 * match — and of one other round 1 match when a picked team trades places.
 *
 * Refuses picks that can never be right: two BYEs, the same team twice, no
 * change at all, or a team that plays somewhere it can't be moved from. A
 * picked team from another unplayed round 1 match trades places: whoever it
 * replaces here (a team or a BYE) takes its old spot, preferring the one on
 * the side it moves into. A replaced team nobody takes leaves the bracket,
 * unless an interrupted save already moved it (see finishedMoves).
 */
export function planOccupancy(
  ctx: EditTeamsContext,
  picks: Record<OpponentSide, Occupant>
): WantedMatch[] {
  const { match } = ctx;
  const { opponent1, opponent2 } = picks;

  if (opponent1.kind === 'bye' && opponent2.kind === 'bye') {
    throw new ValidationError('A match needs at least one team — both sides are set to BYE.');
  }
  if (
    opponent1.kind === 'team' &&
    opponent2.kind === 'team' &&
    opponent1.participantId === opponent2.participantId
  ) {
    throw new ValidationError("A team can't be on both sides of a match.");
  }
  const stored: Record<OpponentSide, Occupant> = {
    opponent1: occupantOf(ctx, match.opponent1),
    opponent2: occupantOf(ctx, match.opponent2),
  };
  if (SIDES.every((side) => sameOccupant(picks[side], stored[side]))) {
    throw new ValidationError('Nothing to change — those teams are already in this match.');
  }

  const sources: { pickSide: OpponentSide; partner: StorageMatch; partnerSide: OpponentSide }[] =
    [];
  for (const side of SIDES) {
    const pick = picks[side];
    if (pick.kind !== 'team' || pick.participantId < 0) continue;
    const position = teamPosition(ctx, pick.participantId);
    if (position.kind === 'taken') {
      const which = position.reason ? `, which ${position.reason}` : '';
      throw new BusinessLogicError(
        `${pick.name} is already in ${matchLabel(ctx, position.match)}${which}. ` +
          'A team can only be in one match.'
      );
    }
    if (position.kind === 'trade') {
      sources.push({ pickSide: side, partner: position.match, partnerSide: position.side });
    }
  }
  const edited: WantedMatch = { match, opponent1, opponent2 };
  const displaced = displacedOccupants(ctx, picks);
  if (sources.length === 0) return [edited, ...finishedMoves(ctx, displaced, [edited])];
  if (new Set(sources.map((source) => source.partner.id)).size > 1) {
    throw new ValidationError(
      'One save can trade places with only one other match. Make this change in two steps.'
    );
  }

  const partner = sources[0].partner;
  if (sources.length > displaced.length) {
    throw new BusinessLogicError(
      `This trade would leave ${matchLabel(ctx, partner)} with an empty spot.`
    );
  }

  const partnerWanted: Record<OpponentSide, Occupant> = {
    opponent1: occupantOf(ctx, partner.opponent1),
    opponent2: occupantOf(ctx, partner.opponent2),
  };
  const remaining = [...displaced];
  const unassigned = sources.filter((source) => {
    const sameSide = remaining.findIndex((entry) => entry.side === source.pickSide);
    if (sameSide === -1) return true;
    partnerWanted[source.partnerSide] = remaining.splice(sameSide, 1)[0].occupant;
    return false;
  });
  for (const source of unassigned) {
    partnerWanted[source.partnerSide] = (remaining.shift() as { occupant: Occupant }).occupant;
  }
  if (partnerWanted.opponent1.kind === 'bye' && partnerWanted.opponent2.kind === 'bye') {
    throw new BusinessLogicError(
      `This trade would leave ${matchLabel(ctx, partner)} with two BYEs and no team.`
    );
  }

  const planned = [
    edited,
    { match: partner, opponent1: partnerWanted.opponent1, opponent2: partnerWanted.opponent2 },
  ];
  return [...planned, ...finishedMoves(ctx, remaining, planned)];
}
