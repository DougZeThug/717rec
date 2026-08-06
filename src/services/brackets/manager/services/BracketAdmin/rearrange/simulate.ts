import type { MatchUpdateFields } from '../shapes';
import { otherSide } from '../shapes';
import type {
  PlannedMatchWrite,
  RearrangePlanResult,
  RearrangeProblem,
  RearrangeSnapshot,
  SimMatchState,
  SimSlot,
  SlotAssignment,
  SnapshotMatch,
  SnapshotSlot,
} from './types';
import { slotKeyOf } from './types';

const SIDES = ['opponent1', 'opponent2'] as const;
type Side = (typeof SIDES)[number];

/**
 * What a match sends into the next round, derived purely from its slot shapes:
 * a walkover sends its team, a double BYE passes the BYE on, and anything with
 * an undecided side sends "to be decided". Played matches never reach this
 * code — only editable (unplayed) matches are simulated.
 */
type Product = { kind: 'team'; participantId: number } | { kind: 'bye' } | { kind: 'tbd' };

const productOf = (opponent1: SimSlot, opponent2: SimSlot): Product => {
  if (opponent1.shape === 'tbd' || opponent2.shape === 'tbd') return { kind: 'tbd' };
  if (opponent1.shape === 'team' && opponent2.shape === 'team') return { kind: 'tbd' };
  if (opponent1.shape === 'bye' && opponent2.shape === 'bye') return { kind: 'bye' };
  const team = opponent1.shape === 'team' ? opponent1 : opponent2;
  return { kind: 'team', participantId: team.participantId as number };
};

const sameProduct = (a: Product, b: Product): boolean =>
  a.kind === b.kind &&
  (a.kind !== 'team' || b.kind !== 'team' || a.participantId === b.participantId);

const cloneSlot = (slot: SnapshotSlot | SimSlot): SimSlot => ({
  shape: slot.shape,
  participantId: slot.participantId,
  position: slot.position,
  result: slot.result,
  score: slot.score,
});

/** The slot content a landing write produces. Landing writes never touch position. */
const landingContent = (product: Product, keepPosition: number | null): SimSlot =>
  product.kind === 'team'
    ? {
        shape: 'team',
        participantId: product.participantId,
        position: keepPosition,
        result: null,
        score: null,
      }
    : product.kind === 'bye'
      ? { shape: 'bye', participantId: null, position: keepPosition, result: 'bye', score: null }
      : { shape: 'tbd', participantId: null, position: keepPosition, result: null, score: null };

interface WorkingMatch {
  original: SnapshotMatch;
  opponent1: SimSlot;
  opponent2: SimSlot;
  status: number;
  dirty: boolean;
}

/** Match numbers restart every round, so labels always carry the round. */
const labelOf = (match: { roundNumber: number; number: number }): string =>
  `Round ${match.roundNumber} Match ${match.number}`;

/**
 * Simulate an entire losers-bracket rearrangement without touching the
 * database. Pure on purpose: the browser runs it on every drag for live
 * validation, and apply runs the same code against a fresh board before
 * writing — so what the admin previewed is exactly what gets saved.
 */
export function simulateRearrange(
  snapshot: RearrangeSnapshot,
  assignments: SlotAssignment[]
): RearrangePlanResult {
  const problems: RearrangeProblem[] = [];
  const moves: string[] = [];
  const consequences: string[] = [];
  const nameOf = (participantId: number | null | undefined): string =>
    (participantId != null ? snapshot.names[String(participantId)] : null) ?? 'the team';

  const working = new Map<number, WorkingMatch>();
  for (const match of snapshot.matches) {
    working.set(match.id, {
      original: match,
      opponent1: cloneSlot(match.opponent1),
      opponent2: cloneSlot(match.opponent2),
      status: match.status,
      dirty: false,
    });
  }

  const buildPreview = (): Record<string, SimMatchState> => {
    const preview: Record<string, SimMatchState> = {};
    for (const [id, state] of working) {
      preview[String(id)] = {
        opponent1: cloneSlot(state.opponent1),
        opponent2: cloneSlot(state.opponent2),
        status: state.status,
      };
    }
    return preview;
  };
  const failed = (): RearrangePlanResult => ({
    ok: false,
    problems,
    moves,
    consequences,
    writes: [],
    preview: buildPreview(),
  });

  // ── 1. The assignment set must cover exactly the origin slots ─────────────
  // A mismatch means the screen was built from an older bracket state — the
  // optimistic-concurrency guard for apply, and a broken-caller guard here.
  const originSlots = new Map<string, { match: SnapshotMatch; side: Side; slot: SnapshotSlot }>();
  for (const match of snapshot.matches) {
    for (const side of SIDES) {
      if (match[side].isOrigin) {
        originSlots.set(slotKeyOf({ matchId: match.id, side }), { match, side, slot: match[side] });
      }
    }
  }
  const staleMessage =
    'The bracket changed since this screen was opened. Close it and reopen to continue.';
  const assignmentByKey = new Map<string, SlotAssignment>();
  for (const assignment of assignments) {
    assignmentByKey.set(slotKeyOf(assignment), assignment);
  }
  if (
    assignmentByKey.size !== assignments.length ||
    assignmentByKey.size !== originSlots.size ||
    [...assignmentByKey.keys()].some((key) => !originSlots.has(key))
  ) {
    problems.push({ message: staleMessage });
    return failed();
  }

  // ── 2. Conservation: every movable team placed exactly once ───────────────
  const movableTeamIds = new Set<number>();
  for (const { slot } of originSlots.values()) {
    if (slot.shape === 'team' && slot.participantId != null) movableTeamIds.add(slot.participantId);
  }
  const placedCounts = new Map<number, number>();
  for (const assignment of assignments) {
    if (assignment.participantId == null) continue;
    if (!movableTeamIds.has(assignment.participantId)) {
      problems.push({ message: staleMessage, slot: assignment });
      return failed();
    }
    placedCounts.set(
      assignment.participantId,
      (placedCounts.get(assignment.participantId) ?? 0) + 1
    );
  }
  for (const [participantId, count] of placedCounts) {
    if (count > 1) {
      problems.push({
        message: `${nameOf(participantId)} is placed in ${count} spots. Each team can only be in one spot.`,
      });
    }
  }
  for (const participantId of movableTeamIds) {
    if (!placedCounts.has(participantId)) {
      problems.push({
        message: `${nameOf(participantId)} has no spot. Every team must be placed somewhere.`,
      });
    }
  }
  if (problems.length > 0) return failed();

  // ── 3. Apply the assignments to the origin slots ──────────────────────────
  // A team keeps its feeder marker (which WB match's loser it is) wherever it
  // goes — the marker describes the team, not the slot, and the viewer's
  // "Loser of WB x.y" labels read it. A spot left as BYE stores the sentinel.
  const originalSlotOf = new Map<number, { matchId: number; side: Side; slot: SnapshotSlot }>();
  for (const { match, side, slot } of originSlots.values()) {
    if (slot.shape === 'team' && slot.participantId != null) {
      originalSlotOf.set(slot.participantId, { matchId: match.id, side, slot });
    }
  }
  for (const assignment of assignments) {
    const origin = originSlots.get(slotKeyOf(assignment));
    if (!origin) continue;
    const state = working.get(origin.match.id);
    if (!state) continue;
    const before = origin.slot;
    const after: SimSlot =
      assignment.participantId != null
        ? {
            shape: 'team',
            participantId: assignment.participantId,
            position: originalSlotOf.get(assignment.participantId)?.slot.position ?? null,
            result: null,
            score: null,
          }
        : { shape: 'bye', participantId: null, position: null, result: 'bye', score: null };
    if (before.shape === after.shape && before.participantId === after.participantId) continue;
    state[origin.side] = after;
    state.dirty = true;
    if (after.participantId != null) {
      const from = originalSlotOf.get(after.participantId);
      const fromMatch = from ? working.get(from.matchId)?.original : undefined;
      if (fromMatch && fromMatch.id !== origin.match.id) {
        moves.push(
          `${nameOf(after.participantId)} moves from ${labelOf(fromMatch)} to ${labelOf(origin.match)}.`
        );
      } else if (fromMatch) {
        moves.push(
          `${nameOf(after.participantId)} switches sides within ${labelOf(origin.match)}.`
        );
      }
    }
  }

  // ── 4. Ripple the automatic results forward, one round at a time ──────────
  // Rounds ascend and every landing points exactly one round forward, so a
  // single pass fully cascades chains (a team un-placed two rounds down, a BYE
  // passed along twice, and so on).
  const ordered = [...snapshot.matches].sort(
    (a, b) => a.roundNumber - b.roundNumber || a.number - b.number
  );
  for (const match of ordered) {
    const state = working.get(match.id);
    if (!state || !match.editable || !state.dirty) continue;

    recomputeEditableMatch(state, nameOf, consequences);

    const landing = snapshot.landings[String(match.id)];
    const newProduct = productOf(state.opponent1, state.opponent2);
    if (landing === null) {
      // Last losers-bracket round: its outcome feeds the grand final, which
      // this tool does not touch — the outcome spot must stay the same.
      const oldProduct = productOf(cloneSlot(match.opponent1), cloneSlot(match.opponent2));
      if (!sameProduct(oldProduct, newProduct)) {
        problems.push({
          message:
            `This change would alter what comes out of ${labelOf(match)} (the losers-bracket ` +
            'final) into the grand final — that is not supported. Keep the same outcome there.',
        });
      }
      continue;
    }
    if (landing === undefined) {
      problems.push({ message: staleMessage });
      continue;
    }

    const landingState = working.get(landing.matchId);
    if (!landingState) {
      problems.push({ message: staleMessage });
      continue;
    }
    const currentContent = landingState[landing.side];
    const nextContent = landingContent(newProduct, currentContent.position);
    if (
      currentContent.shape === nextContent.shape &&
      currentContent.participantId === nextContent.participantId
    ) {
      continue;
    }

    const landingMatch = landingState.original;
    if (!landingMatch.editable) {
      const blocked = landingBlockReason(landingState);
      if (blocked) {
        problems.push({
          message:
            `This arrangement needs to change ${labelOf(landingMatch)} automatically, ` +
            `but that match ${blocked}.`,
        });
        continue;
      }
    }
    narrateLandingChange(currentContent, nextContent, labelOf(landingMatch), nameOf, consequences);
    landingState[landing.side] = nextContent;
    landingState.dirty = true;

    // The library pre-records a walkover 'win' on a still-empty drop-in slot
    // facing a stored BYE. Once a real team lands in that BYE spot, the
    // anticipated walkover is off: clear the notation and let the match wait
    // for its team like any other.
    if (!landingMatch.editable && nextContent.shape === 'team') {
      const partner = landingState[otherSide(landing.side)];
      if (partner.shape === 'tbd' && partner.result === 'win' && partner.score == null) {
        partner.result = null;
        if (landingState.status === 0) landingState.status = 1;
      }
    }
  }

  // ── 5. Diff the working state against the database state ─────────────────
  const writes: PlannedMatchWrite[] = [];
  for (const match of ordered) {
    const state = working.get(match.id);
    if (!state || !state.dirty) continue;
    const fields = diffMatch(state);
    if (Object.keys(fields).length === 0) continue;
    writes.push({
      matchId: match.id,
      roundNumber: match.roundNumber,
      matchNumber: match.number,
      fields,
    });
  }

  if (problems.length > 0) return failed();
  return { ok: true, problems, moves, consequences, writes, preview: buildPreview() };
}

/**
 * Why a match that is not itself rearrangeable cannot absorb an automatic
 * landing change. Mirrors destinationBlockReason (shapes.ts) over the working
 * representation: being played, played, or carrying recorded results blocks
 * it; merely waiting on an earlier match does not. BYE sentinels are
 * structure, not results, so they don't count as "recorded".
 */
function landingBlockReason(state: WorkingMatch): string | null {
  const lockedReason = state.original.lockedReason;
  if (state.status === 3) return lockedReason ?? 'is currently being played';
  if (state.status >= 4) return lockedReason ?? 'has already been played';
  for (const side of SIDES) {
    const slot = state[side];
    if (slot.shape === 'bye') continue;
    // A 'win' pre-recorded on a TBD slot facing a stored BYE is the library's
    // anticipated walkover — advance notation, not a played result.
    const partnerIsBye = state[otherSide(side)].shape === 'bye';
    if (slot.shape === 'tbd' && slot.result === 'win' && slot.score == null && partnerIsBye) {
      continue;
    }
    if (slot.result != null || slot.score != null) {
      return lockedReason ?? 'already has results recorded';
    }
  }
  return null;
}

/**
 * Recompute an editable match's results and status from its new slot shapes.
 * Prior results and scores never carry across a rearrangement — walkover state
 * is derived fresh, exactly as the swap tool does. Status conventions: a real
 * match is Ready (2), an admin-written walkover is Completed (4) with a 'win'
 * for the team, a double BYE is Locked (0), and anything still waiting on an
 * earlier match is Waiting (1).
 */
function recomputeEditableMatch(
  state: WorkingMatch,
  nameOf: (participantId: number | null | undefined) => string,
  consequences: string[]
): void {
  const before = state.original;
  const beforeProduct = productOf(cloneSlot(before.opponent1), cloneSlot(before.opponent2));
  const shape1 = state.opponent1.shape;
  const shape2 = state.opponent2.shape;

  const clearNonByeResults = (): void => {
    for (const side of SIDES) {
      if (state[side].shape !== 'bye') {
        state[side].result = null;
        state[side].score = null;
      }
    }
  };

  const wasRealMatch = before.opponent1.shape === 'team' && before.opponent2.shape === 'team';
  const hadTbd = before.opponent1.shape === 'tbd' || before.opponent2.shape === 'tbd';

  if (shape1 === 'tbd' || shape2 === 'tbd') {
    clearNonByeResults();
    state.status = 1;
    if (!hadTbd) {
      consequences.push(`${labelOf(before)} goes back to waiting for an earlier match.`);
    }
    return;
  }
  if (shape1 === 'team' && shape2 === 'team') {
    clearNonByeResults();
    state.status = 2;
    if (!wasRealMatch) {
      consequences.push(
        `${labelOf(before)} is now ${nameOf(state.opponent1.participantId)} vs ` +
          `${nameOf(state.opponent2.participantId)}, ready to play.`
      );
    }
    return;
  }
  if (shape1 === 'bye' && shape2 === 'bye') {
    state.status = 0;
    if (beforeProduct.kind !== 'bye') {
      consequences.push(
        `${labelOf(before)} is left with no teams; a BYE passes on to the next round.`
      );
    }
    return;
  }

  // One team, one BYE: an automatic walkover for the team.
  const winnerSide: Side = shape1 === 'team' ? 'opponent1' : 'opponent2';
  const winner = state[winnerSide];
  winner.result = 'win';
  winner.score = 0;
  state.status = 4;
  const winnerChanged =
    beforeProduct.kind !== 'team' || beforeProduct.participantId !== winner.participantId;
  if (winnerChanged) {
    consequences.push(
      `${nameOf(winner.participantId)} has no opponent in ${labelOf(before)} and advances automatically.`
    );
  }
}

/** One plain-language line per automatic landing change, for the confirmation step. */
function narrateLandingChange(
  before: SimSlot,
  after: SimSlot,
  matchLabel: string,
  nameOf: (participantId: number | null | undefined) => string,
  consequences: string[]
): void {
  if (before.shape === 'team' && after.shape === 'team') {
    consequences.push(
      `${nameOf(before.participantId)} is removed from ${matchLabel}; ` +
        `${nameOf(after.participantId)} takes that spot automatically.`
    );
  } else if (before.shape === 'team' && after.shape === 'bye') {
    consequences.push(
      `${nameOf(before.participantId)} is removed from ${matchLabel}; a BYE takes that spot.`
    );
  } else if (before.shape === 'team' && after.shape === 'tbd') {
    consequences.push(
      `${nameOf(before.participantId)} is removed from ${matchLabel}; ` +
        'that spot now waits for an earlier match.'
    );
  } else if (after.shape === 'team') {
    consequences.push(`${nameOf(after.participantId)} advances automatically into ${matchLabel}.`);
  } else if (after.shape === 'bye') {
    consequences.push(`A BYE passes into ${matchLabel} automatically.`);
  } else {
    consequences.push(`A spot in ${matchLabel} now waits for an earlier match.`);
  }
}

/** Only the columns that actually changed, so untouched BYE sentinels are never blanked. */
function diffMatch(state: WorkingMatch): MatchUpdateFields {
  const fields: MatchUpdateFields = {};
  const before = state.original;
  for (const side of SIDES) {
    const old = before[side];
    const now = state[side];
    if (old.participantId !== now.participantId) fields[`${side}_id`] = now.participantId;
    if (old.position !== now.position) fields[`${side}_position`] = now.position;
    if (old.result !== now.result) fields[`${side}_result`] = now.result;
    if (old.score !== now.score) fields[`${side}_score`] = now.score;
  }
  if (before.status !== state.status) fields.status = state.status;
  return fields;
}
