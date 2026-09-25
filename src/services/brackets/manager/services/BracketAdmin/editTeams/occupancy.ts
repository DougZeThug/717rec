import { BusinessLogicError, ValidationError } from '@/types/errors';

import type { StorageMatch } from '../../../types/BracketServiceTypes';
import type { OpponentSide } from '../shapes';
import type { EditTeamsContext } from './context';
import { findMatchAt, matchLabel, occupantOf, sameOccupant, SIDES } from './rules';
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

/**
 * Turn the admin's picks into the wanted occupancy of the edited round 1
 * match, refusing picks that can never be right: two BYEs, the same team
 * twice, a team that already plays in another match, or no change at all.
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
  if (SIDES.every((side) => sameOccupant(picks[side], occupantOf(ctx, match[side])))) {
    throw new ValidationError('Nothing to change — those teams are already in this match.');
  }

  const allowed = allowedSlotsOf(ctx, match);
  for (const side of SIDES) {
    const pick = picks[side];
    if (pick.kind !== 'team' || pick.participantId < 0) continue;
    for (const other of ctx.stageMatches) {
      for (const otherSide of SIDES) {
        if (other[otherSide]?.id !== pick.participantId) continue;
        if (allowed.has(`${other.id}:${otherSide}`)) continue;
        throw new BusinessLogicError(
          `${pick.name} is already in ${matchLabel(ctx, other)}. A team can only be in one match.`
        );
      }
    }
  }

  return [{ match, opponent1, opponent2 }];
}
