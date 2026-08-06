import type { StorageMatch } from '../../types/BracketServiceTypes';

/**
 * Slot/shape vocabulary shared by the losers-bracket admin tools (swap.ts and
 * rearrange/). Extracted verbatim from swap.ts so both tools classify matches
 * with exactly the same rules — a match the swap refuses must also be refused
 * by the rearrange screen, and vice versa.
 */

export type OpponentSide = 'opponent1' | 'opponent2';

export const otherSide = (side: OpponentSide): OpponentSide =>
  side === 'opponent1' ? 'opponent2' : 'opponent1';

/** The match columns an admin edit is allowed to touch, named so Supabase's typed update accepts them. */
export type MatchUpdateFields = {
  status?: number;
  opponent1_id?: number | null;
  opponent2_id?: number | null;
  opponent1_position?: number | null;
  opponent2_position?: number | null;
  opponent1_score?: number | null;
  opponent2_score?: number | null;
  opponent1_result?: string | null;
  opponent2_result?: string | null;
};

export const slotFields = (
  side: OpponentSide,
  values: {
    id: number | null;
    position: number | null;
    score: number | null;
    result: string | null;
  }
): MatchUpdateFields =>
  side === 'opponent1'
    ? {
        opponent1_id: values.id,
        opponent1_position: values.position,
        opponent1_score: values.score,
        opponent1_result: values.result,
      }
    : {
        opponent2_id: values.id,
        opponent2_position: values.position,
        opponent2_score: values.score,
        opponent2_result: values.result,
      };

export const resultFields = (
  side: OpponentSide,
  result: string | null,
  score: number | null
): MatchUpdateFields =>
  side === 'opponent1'
    ? { opponent1_result: result, opponent1_score: score }
    : { opponent2_result: result, opponent2_score: score };

export const idField = (side: OpponentSide, id: number | null): MatchUpdateFields =>
  side === 'opponent1' ? { opponent1_id: id } : { opponent2_id: id };

/**
 * Storage hands back three slot shapes: strict null is a stored BYE (the 'bye'
 * sentinel — no team will ever play there), an object with a null id is TBD
 * (a team arrives once an earlier match resolves), and an object with an id is
 * a real team. An undefined slot never comes out of a faithful read, so it is
 * treated as TBD — the refusing shape.
 */
export type SlotShape = 'team' | 'bye' | 'tbd';

export const shapeOf = (slot: StorageMatch['opponent1']): SlotShape =>
  slot === null ? 'bye' : slot?.id != null ? 'team' : 'tbd';

export const winnerSideOf = (match: StorageMatch): OpponentSide | null =>
  match.opponent1?.result === 'win'
    ? 'opponent1'
    : match.opponent2?.result === 'win'
      ? 'opponent2'
      : null;

/**
 * An unplayed walkover: one real team, one stored BYE, and a 'win' already
 * recorded for the team. The library writes these as Locked (0); the app's
 * admin tools write Completed (4). Both count — nobody actually played, so a
 * swap may still rearrange them (after undoing the automatic advancement).
 */
export const isUnplayedWalkover = (match: StorageMatch): boolean => {
  const shape1 = shapeOf(match.opponent1);
  const shape2 = shapeOf(match.opponent2);
  const oneTeamOneBye =
    (shape1 === 'team' && shape2 === 'bye') || (shape1 === 'bye' && shape2 === 'team');
  return oneTeamOneBye && winnerSideOf(match) !== null;
};

/** Why a match cannot take part in an admin rearrangement, or null when it can. */
export function matchBlockReason(match: StorageMatch): string | null {
  if (match.status === 3) return 'is currently being played';
  if (match.status === 5) return 'is archived';
  if (shapeOf(match.opponent1) === 'tbd' || shapeOf(match.opponent2) === 'tbd') {
    return 'is still waiting on a team from an earlier match';
  }
  if (isUnplayedWalkover(match)) return null;
  const hasRecordedResult =
    match.opponent1?.result != null ||
    match.opponent2?.result != null ||
    match.opponent1?.score != null ||
    match.opponent2?.score != null;
  if (match.status === 4 || hasRecordedResult) return 'has already been played';
  return null;
}

/** Why a next-round match cannot absorb an advancement change, or null when it can. */
export function destinationBlockReason(destination: StorageMatch): string | null {
  if (destination.status === 3) return 'is currently being played';
  if (destination.status >= 4) return 'has already been played';
  const hasRecordedResult =
    destination.opponent1?.result != null ||
    destination.opponent2?.result != null ||
    destination.opponent1?.score != null ||
    destination.opponent2?.score != null;
  if (hasRecordedResult) return 'already has results recorded';
  return null;
}
