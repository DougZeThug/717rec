import { NotFoundError, ValidationError } from '@/types/errors';
import { bracketLog } from '@/utils/logger';

import type {
  StorageGroup,
  StorageMatch,
  StorageParticipant,
  StorageRound,
  StorageStage,
} from '../../../types/BracketServiceTypes';
import type { OpponentSide } from '../shapes';
import {
  destinationBlockReason,
  isAnticipatedWalkover,
  matchBlockReason,
  shapeOf,
  winnerSideOf,
} from '../shapes';
import type { BracketAdminDeps } from '../types';
import type {
  RearrangeBoard,
  RearrangeMatchView,
  RearrangeSlotView,
  SlotRef,
  SnapshotMatch,
  SnapshotSlot,
} from './types';

const SIDES: OpponentSide[] = ['opponent1', 'opponent2'];

const asArray = <T>(value: T | T[] | null): T[] =>
  Array.isArray(value) ? value : value ? [value] : [];

/** Where a match's automatic result lands, or why that cannot be determined. */
type Landing = SlotRef | null | 'ambiguous';

/**
 * What a match currently sends onward: 'tbd' while its outcome is open, the
 * winner when it is an unplayed walkover, or 'bye' when both sides are BYEs.
 */
const currentProductKind = (match: StorageMatch): 'tbd' | 'team' | 'bye' => {
  const shape1 = shapeOf(match.opponent1);
  const shape2 = shapeOf(match.opponent2);
  if (shape1 === 'bye' && shape2 === 'bye') return 'bye';
  if ((shape1 === 'team' && shape2 === 'bye') || (shape1 === 'bye' && shape2 === 'team')) {
    return 'team';
  }
  return 'tbd';
};

/**
 * Load everything the rearrange screen and its simulation need, in one shot:
 * every losers-bracket match classified as editable or locked (with a
 * plain-language reason), every slot classified as movable / BYE destination /
 * automatically-filled, and the landing map that says where each match's
 * automatic result goes.
 */
export async function loadRearrangeBoard(
  deps: BracketAdminDeps,
  bracketId: string
): Promise<RearrangeBoard> {
  bracketLog('Loading losers-bracket rearrange board', { bracketId });

  const stages = asArray(
    (await deps.storage.select('stage', { tournament_id: bracketId })) as StorageStage[] | null
  );
  const stage = stages.sort((a, b) => a.number - b.number)[0];
  if (!stage) throw new NotFoundError('Bracket', bracketId);
  if (stage.type !== 'double_elimination') {
    throw new ValidationError(
      'Teams can only be rearranged in a double-elimination bracket (it has no losers bracket).'
    );
  }

  const groups = asArray(
    (await deps.storage.select('group', { stage_id: stage.id })) as StorageGroup[] | null
  );
  const losersGroup = groups.find((group) => group.number === 2);
  if (!losersGroup) {
    throw new ValidationError('This bracket has no losers bracket to rearrange.');
  }

  const rounds = asArray(
    (await deps.storage.select('round', { group_id: losersGroup.id })) as StorageRound[] | null
  ).sort((a, b) => a.number - b.number);

  const stageMatches = asArray(
    (await deps.storage.select('match', { stage_id: stage.id })) as StorageMatch[] | null
  );
  const roundNumberById = new Map<number, number>(rounds.map((round) => [round.id, round.number]));
  const lbMatches = stageMatches
    .filter((match) => match.group_id === losersGroup.id)
    .sort(
      (a, b) =>
        (roundNumberById.get(a.round_id) ?? 0) - (roundNumberById.get(b.round_id) ?? 0) ||
        a.number - b.number
    );

  const participants = asArray(
    (await deps.storage.select('participant', {
      tournament_id: bracketId,
    })) as StorageParticipant[] | null
  );
  const names: Record<string, string> = {};
  for (const participant of participants) {
    if (participant.name != null) names[String(participant.id)] = participant.name;
  }

  const matchesByRound = new Map<number, StorageMatch[]>();
  for (const match of lbMatches) {
    const roundNumber = roundNumberById.get(match.round_id) ?? 0;
    const list = matchesByRound.get(roundNumber) ?? [];
    list.push(match);
    matchesByRound.set(roundNumber, list);
  }
  const lastRoundNumber = rounds.length > 0 ? rounds[rounds.length - 1].number : 0;

  const landings = computeLandings(lbMatches, matchesByRound, roundNumberById, lastRoundNumber);
  const { editableById, lockedReasonById } = classifyMatches(
    lbMatches,
    landings,
    roundNumberById,
    lastRoundNumber,
    names
  );

  // A slot filled automatically by an editable match is "derived": the admin
  // never assigns it directly — it live-updates as its feeder is rearranged.
  const derivedKeys = new Set<string>();
  const feederNumberByKey = new Map<string, number>();
  for (const match of lbMatches) {
    if (!editableById.get(match.id)) continue;
    const landing = landings.get(match.id);
    if (landing && landing !== 'ambiguous') {
      const key = `${landing.matchId}:${landing.side}`;
      derivedKeys.add(key);
      feederNumberByKey.set(key, match.number);
    }
  }

  const snapshotMatches: SnapshotMatch[] = [];
  const viewsByRound = new Map<number, RearrangeMatchView[]>();
  for (const match of lbMatches) {
    const roundNumber = roundNumberById.get(match.round_id) ?? 0;
    const editable = editableById.get(match.id) ?? false;
    const lockedReason = lockedReasonById.get(match.id) ?? null;

    const snapshotSlots = SIDES.map((side) => {
      const slot = match[side];
      const isDerived = derivedKeys.has(`${match.id}:${side}`);
      const shape = shapeOf(slot);
      const snapshotSlot: SnapshotSlot = {
        shape,
        participantId: slot?.id ?? null,
        position: slot?.position ?? null,
        result: shape === 'bye' ? 'bye' : (slot?.result ?? null),
        score: slot?.score ?? null,
        isOrigin: editable && !isDerived && shape !== 'tbd',
        isDerived,
      };
      return snapshotSlot;
    });

    snapshotMatches.push({
      id: match.id,
      number: match.number,
      roundNumber,
      status: match.status,
      editable,
      lockedReason,
      opponent1: snapshotSlots[0],
      opponent2: snapshotSlots[1],
    });

    const slotViews = SIDES.map((side, index): RearrangeSlotView => {
      const snapshotSlot = snapshotSlots[index];
      const kind = snapshotSlot.isDerived
        ? 'derived'
        : snapshotSlot.isOrigin
          ? snapshotSlot.shape === 'team'
            ? 'team'
            : 'bye'
          : 'locked';
      const feederNumber = feederNumberByKey.get(`${match.id}:${side}`);
      return {
        matchId: match.id,
        side,
        kind,
        participantId: snapshotSlot.participantId,
        participantName:
          snapshotSlot.participantId != null
            ? (names[String(snapshotSlot.participantId)] ?? null)
            : null,
        autoNote:
          kind === 'derived' && feederNumber != null
            ? `Filled automatically from Match ${feederNumber}`
            : null,
      };
    });

    const view: RearrangeMatchView = {
      matchId: match.id,
      matchNumber: match.number,
      roundNumber,
      status: match.status,
      locked: !editable,
      lockedReason,
      slots: [slotViews[0], slotViews[1]],
    };
    const list = viewsByRound.get(roundNumber) ?? [];
    list.push(view);
    viewsByRound.set(roundNumber, list);
  }

  const landingsRecord: Record<string, SlotRef | null> = {};
  for (const match of lbMatches) {
    const landing = landings.get(match.id);
    landingsRecord[String(match.id)] =
      landing === 'ambiguous' || landing === undefined ? null : landing;
  }

  return {
    bracketId,
    stageId: stage.id,
    rounds: [...viewsByRound.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([roundNumber, matches]) => ({ roundNumber, matches })),
    snapshot: {
      bracketId,
      stageId: stage.id,
      matches: snapshotMatches,
      landings: landingsRecord,
      names,
    },
  };
}

/**
 * Map every losers-bracket match to the next-round slot its automatic result
 * lands in. Mirrors placement.ts: a halved round maps matches 2k-1 and 2k onto
 * next match k (odd feeder → opponent1, even → opponent2); a same-size (minor)
 * round maps 1:1, landing in the slot WITHOUT a winners-bracket feeder marker —
 * the marked slot is reserved for the WB loser dropping in. When the markers
 * don't identify a slot, fall back to wherever the feeder's recorded walkover
 * winner already sits; failing that, the feeder is reported 'ambiguous' and
 * gets locked rather than guessed at.
 */
function computeLandings(
  lbMatches: StorageMatch[],
  matchesByRound: Map<number, StorageMatch[]>,
  roundNumberById: Map<number, number>,
  lastRoundNumber: number
): Map<number, Landing> {
  const landings = new Map<number, Landing>();
  for (const match of lbMatches) {
    const roundNumber = roundNumberById.get(match.round_id) ?? 0;
    if (roundNumber >= lastRoundNumber) {
      landings.set(match.id, null);
      continue;
    }
    const currentRound = matchesByRound.get(roundNumber) ?? [];
    const nextRound = matchesByRound.get(roundNumber + 1) ?? [];
    if (nextRound.length === currentRound.length) {
      const nextMatch = nextRound.find((candidate) => candidate.number === match.number);
      landings.set(match.id, nextMatch ? oneToOneLanding(match, nextMatch) : 'ambiguous');
    } else if (nextRound.length * 2 === currentRound.length) {
      const nextMatch = nextRound.find(
        (candidate) => candidate.number === Math.ceil(match.number / 2)
      );
      landings.set(
        match.id,
        nextMatch
          ? {
              matchId: nextMatch.id,
              side: match.number % 2 === 1 ? 'opponent1' : 'opponent2',
            }
          : 'ambiguous'
      );
    } else {
      landings.set(match.id, 'ambiguous');
    }
  }
  return landings;
}

function oneToOneLanding(match: StorageMatch, nextMatch: StorageMatch): Landing {
  const hasFeederMarker = (slot: StorageMatch['opponent1']): boolean =>
    slot != null && slot.position !== undefined;
  const unmarked = SIDES.filter((side) => !hasFeederMarker(nextMatch[side]));
  if (unmarked.length === 1) return { matchId: nextMatch.id, side: unmarked[0] };

  // Markers scrambled by history — fall back to wherever this feeder's
  // recorded walkover winner already sits.
  const winnerSide = winnerSideOf(match);
  const winnerId = winnerSide ? (match[winnerSide]?.id ?? null) : null;
  if (winnerId != null) {
    const occupied = SIDES.find((side) => nextMatch[side]?.id === winnerId);
    if (occupied) return { matchId: nextMatch.id, side: occupied };
  }

  // Both slots are stored BYEs (a WB feed that collapsed at creation plus a
  // carried BYE): the structural convention throughout this codebase is
  // opponent1 = winners-bracket drop-in, opponent2 = carry from the previous
  // losers round, so the carry slot is opponent2.
  if (nextMatch.opponent1 === null && nextMatch.opponent2 === null) {
    bracketLog(
      `Rearrange: match ${nextMatch.id} has two unmarked BYE slots — using opponent2 as the carry slot`
    );
    return { matchId: nextMatch.id, side: 'opponent2' };
  }
  return 'ambiguous';
}

/**
 * Decide which matches the admin may rearrange, and give every locked match a
 * plain-language reason. Base rules are shared with the swap tool
 * (matchBlockReason); on top of those, a match is locked when its automatic
 * result cannot be re-routed: it feeds a match that can neither be rearranged
 * nor absorb a landing change, its landing spot can't be determined, or it is
 * the losers-bracket final, whose outcome feeds the grand final.
 *
 * Rounds are processed last-to-first: whether a feeder is locked depends on
 * its landing match's FINAL editability (a walkover locked because ITS landing
 * was played must also lock the match that feeds it), and landings always
 * point one round forward.
 */
function classifyMatches(
  lbMatches: StorageMatch[],
  landings: Map<number, Landing>,
  roundNumberById: Map<number, number>,
  lastRoundNumber: number,
  names: Record<string, string>
): { editableById: Map<number, boolean>; lockedReasonById: Map<number, string | null> } {
  const editableById = new Map<number, boolean>();
  const lockedReasonById = new Map<number, string | null>();
  const matchById = new Map<number, StorageMatch>(lbMatches.map((match) => [match.id, match]));

  const descending = [...lbMatches].sort(
    (a, b) => (roundNumberById.get(b.round_id) ?? 0) - (roundNumberById.get(a.round_id) ?? 0)
  );
  for (const match of descending) {
    let reason = matchBlockReason(match);

    if (!reason) {
      const productKind = currentProductKind(match);
      const landing = landings.get(match.id);
      const roundNumber = roundNumberById.get(match.round_id) ?? 0;

      if (landing === 'ambiguous') {
        reason = 'is in a part of the bracket that looks inconsistent — run Repair Bracket first';
        bracketLog(`Rearrange: match ${match.id} locked, landing slot is ambiguous`);
      } else if (roundNumber >= lastRoundNumber && productKind !== 'tbd') {
        reason = 'decides who advances to the grand final, so its teams cannot be moved';
      } else if (productKind !== 'tbd' && landing) {
        // The feeder's automatic result already carried forward. If the match
        // it landed in can still be rearranged, the chain stays flexible; if
        // not, the landing can only absorb a change while it is untouched by
        // results — otherwise moving anything here is impossible.
        const landingMatch = matchById.get(landing.matchId);
        const landingEditable = editableById.get(landing.matchId) ?? false;
        const blocked =
          landingMatch && !landingEditable && !isAnticipatedWalkover(landingMatch)
            ? destinationBlockReason(landingMatch)
            : null;
        if (blocked) {
          const winnerSide = winnerSideOf(match);
          const winnerId = winnerSide ? (match[winnerSide]?.id ?? null) : null;
          const winnerName =
            winnerId != null ? (names[String(winnerId)] ?? 'its winner') : 'its automatic result';
          reason = `cannot change: ${winnerName} already advanced to a match that ${blocked}`;
        }
      }
    }

    editableById.set(match.id, reason === null);
    lockedReasonById.set(match.id, reason);
  }

  return { editableById, lockedReasonById };
}
