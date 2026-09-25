import type { StorageMatch } from '../../../types/BracketServiceTypes';
import { matchBlockReason } from '../shapes';
import type { EditTeamsContext } from './context';

const SIDES = ['opponent1', 'opponent2'] as const;

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

/**
 * Why a winners-bracket round 1 match cannot have its teams changed, phrased
 * to follow "This match …", or null when it can. Builds on the swap and
 * rearrange tools' shared rule (matchBlockReason) with round 1 wording: an
 * archived round 1 match is one whose winner already played in round 2.
 */
export function winnersRoundOneBlockReason(match: StorageMatch): string | null {
  if (match.status === 3) return 'is being played';
  if (match.status === 5) return 'is archived: its winner has already played in round 2';
  const reason = matchBlockReason(match);
  if (reason === 'has already been played') return reason;
  return null;
}

/** Where a participant sits in the stage, outside the given matches, or null. */
export function findParticipantElsewhere(
  ctx: EditTeamsContext,
  participantId: number,
  excludeMatchIds: number[]
): StorageMatch | null {
  return (
    ctx.stageMatches.find(
      (match) =>
        !excludeMatchIds.includes(match.id) &&
        SIDES.some((side) => match[side]?.id === participantId)
    ) ?? null
  );
}
