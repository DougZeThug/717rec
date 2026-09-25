import type { StorageMatch } from '../../../types/BracketServiceTypes';
import type { OpponentSide } from '../shapes';
import { matchBlockReason } from '../shapes';
import type { EditTeamsContext } from './context';
import type { Occupant } from './types';

export const SIDES: OpponentSide[] = ['opponent1', 'opponent2'];

/** Plain-language name of a match, e.g. "Winners Round 1 Match 2". */
export function matchLabel(ctx: EditTeamsContext, match: StorageMatch): string {
  const group = ctx.groupNumberById.get(match.group_id);
  const round = ctx.roundNumberById.get(match.round_id);
  const doubleElimination = ctx.stage.type === 'double_elimination';
  if (group === 1) {
    return `${doubleElimination ? 'Winners ' : ''}Round ${round} Match ${match.number}`;
  }
  if (group === 2) {
    return doubleElimination
      ? `Losers Round ${round} Match ${match.number}`
      : 'the third-place match';
  }
  return round === 1 ? 'the grand final' : 'the grand final reset';
}

export const isWinnersRoundOne = (ctx: EditTeamsContext, match: StorageMatch): boolean =>
  ctx.groupNumberById.get(match.group_id) === 1 && ctx.roundNumberById.get(match.round_id) === 1;

/** The stage match at (group number, round number, match number), if it exists. */
export function findMatchAt(
  ctx: EditTeamsContext,
  groupNumber: number,
  roundNumber: number,
  matchNumber: number
): StorageMatch | null {
  return (
    ctx.stageMatches.find(
      (match) =>
        ctx.groupNumberById.get(match.group_id) === groupNumber &&
        ctx.roundNumberById.get(match.round_id) === roundNumber &&
        match.number === matchNumber
    ) ?? null
  );
}

/**
 * Why a winners-bracket round 1 match cannot have its teams changed, phrased
 * to follow "This match …", or null when it can. Builds on the swap and
 * rearrange tools' shared rule (matchBlockReason) with round 1 wording: an
 * archived round 1 match is one whose winner already played in round 2. A
 * walkover (team vs BYE) is unplayed, and an empty spot in round 1 can only
 * be left over from an older version of Edit teams — both can be edited.
 */
export function winnersRoundOneBlockReason(match: StorageMatch): string | null {
  if (match.status === 3) return 'is being played';
  if (match.status === 5) return 'is archived: its winner has already played in round 2';
  const reason = matchBlockReason(match);
  if (reason === 'has already been played') return reason;
  return null;
}

export const participantName = (ctx: EditTeamsContext, participantId: number): string =>
  ctx.participants.find((participant) => participant.id === participantId)?.name ?? 'The team';

/** Who a stored slot holds, as Edit teams plans with it. */
export function occupantOf(ctx: EditTeamsContext, slot: StorageMatch['opponent1']): Occupant {
  if (slot === null) return { kind: 'bye' };
  if (slot?.id != null) {
    return { kind: 'team', participantId: slot.id, name: participantName(ctx, slot.id) };
  }
  return { kind: 'tbd' };
}

export const sameOccupant = (a: Occupant, b: Occupant): boolean =>
  a.kind === b.kind &&
  (a.kind !== 'team' || (b.kind === 'team' && a.participantId === b.participantId));

/** The participant id of an occupant, or null for a BYE or an empty spot. */
export const occupantId = (occupant: Occupant): number | null =>
  occupant.kind === 'team' ? occupant.participantId : null;

/**
 * What a round 1 match sends into round 2 before anyone plays it: its team
 * when it is a walkover, nothing ('tbd') otherwise.
 */
export function productOf(opponent1: Occupant, opponent2: Occupant): Occupant {
  if (opponent1.kind === 'team' && opponent2.kind === 'bye') return opponent1;
  if (opponent1.kind === 'bye' && opponent2.kind === 'team') return opponent2;
  if (opponent1.kind === 'bye' && opponent2.kind === 'bye') return { kind: 'bye' };
  return { kind: 'tbd' };
}

export const hasBye = (opponent1: Occupant, opponent2: Occupant): boolean =>
  opponent1.kind === 'bye' || opponent2.kind === 'bye';
