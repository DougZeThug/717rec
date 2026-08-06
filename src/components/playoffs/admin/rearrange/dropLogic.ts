import type {
  RearrangeBoard,
  SlotAssignment,
} from '@/services/brackets/manager/services/BracketAdmin/rearrange/types';

/**
 * The screen's working arrangement: every movable spot's occupant, keyed by
 * "matchId:side". A null occupant means the spot is a BYE.
 */
export type Arrangement = Map<string, number | null>;

/** The arrangement as the board currently stands (before any drags). */
export function baselineArrangement(board: RearrangeBoard): Arrangement {
  const arrangement: Arrangement = new Map();
  for (const round of board.rounds) {
    for (const match of round.matches) {
      for (const slot of match.slots) {
        if (slot.kind === 'team' || slot.kind === 'bye') {
          arrangement.set(`${match.matchId}:${slot.side}`, slot.participantId);
        }
      }
    }
  }
  return arrangement;
}

/**
 * Apply one drag gesture: dropping the occupant of `sourceKey` onto
 * `targetKey` trades the two spots' occupants. Dropping on a BYE spot moves
 * the team and leaves a BYE behind; dropping on a team swaps them. Every
 * gesture preserves the set of placed teams, so no drag can lose or duplicate
 * a team.
 */
export function applyDrop(
  arrangement: Arrangement,
  sourceKey: string,
  targetKey: string
): Arrangement {
  if (sourceKey === targetKey) return arrangement;
  if (!arrangement.has(sourceKey) || !arrangement.has(targetKey)) return arrangement;
  const next = new Map(arrangement);
  const sourceOccupant = arrangement.get(sourceKey) ?? null;
  const targetOccupant = arrangement.get(targetKey) ?? null;
  next.set(sourceKey, targetOccupant);
  next.set(targetKey, sourceOccupant);
  return next;
}

/** The arrangement in the shape the service expects. */
export function toAssignments(arrangement: Arrangement): SlotAssignment[] {
  return [...arrangement.entries()].map(([key, participantId]) => {
    const [matchId, side] = key.split(':');
    return {
      matchId: Number(matchId),
      side: side as SlotAssignment['side'],
      participantId,
    };
  });
}

/** True when any spot differs from the board's current state. */
export function isDirty(baseline: Arrangement, arrangement: Arrangement): boolean {
  for (const [key, value] of arrangement) {
    if (baseline.get(key) !== value) return true;
  }
  return false;
}
