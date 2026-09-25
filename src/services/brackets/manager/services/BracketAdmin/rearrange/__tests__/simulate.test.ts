import { describe, expect, it } from 'vitest';

import { simulateRearrange, simulateSlotChanges } from '../simulate';
import type { RearrangeSnapshot, SlotAssignment, SnapshotMatch, SnapshotSlot } from '../types';

/**
 * Fixtures model the losers bracket of a 10-team double elimination after both
 * winners-bracket rounds have been played — the exact shape this tool exists
 * for. Losers round 1 holds one dropped loser per real WB R1 match plus two
 * BYE-vs-BYE placeholder matches; losers round 2 holds the four WB R2 losers
 * (D1-D4) against what round 1 sends up; losers round 3 is still waiting.
 *
 *   R1 M1 [BYE, T9 w/o]   → R2 M1 carry     R2 M1 [D1, T9]  ready → R3 M1 top
 *   R1 M2 [BYE, BYE]      → R2 M2 carry     R2 M2 [D2, BYE] w/o   → R3 M1 bottom
 *   R1 M3 [BYE, T10 w/o]  → R2 M3 carry     R2 M3 [D3, T10] ready → R3 M2 top
 *   R1 M4 [BYE, BYE]      → R2 M4 carry     R2 M4 [D4, BYE] w/o   → R3 M2 bottom
 *
 * Each drop-in spot carries the library's feeder marker for that SPOT
 * (`feederMarker`): round 1 spots are 1-8 in order, round 2 drop-ins 9-12.
 * A team moved into a spot takes the spot's marker.
 */

const T9 = 9;
const T10 = 10;
const D1 = 21;
const D2 = 22;
const D3 = 23;
const D4 = 24;

const NAMES: Record<string, string> = {
  [T9]: 'T9',
  [T10]: 'T10',
  [D1]: 'D1',
  [D2]: 'D2',
  [D3]: 'D3',
  [D4]: 'D4',
};

const teamSlot = (participantId: number, overrides: Partial<SnapshotSlot> = {}): SnapshotSlot => ({
  shape: 'team',
  participantId,
  position: null,
  feederMarker: null,
  result: null,
  score: null,
  isOrigin: true,
  isDerived: false,
  ...overrides,
});

const byeSlot = (overrides: Partial<SnapshotSlot> = {}): SnapshotSlot => ({
  shape: 'bye',
  participantId: null,
  position: null,
  feederMarker: null,
  result: 'bye',
  score: null,
  isOrigin: true,
  isDerived: false,
  ...overrides,
});

const tbdSlot = (): SnapshotSlot => ({
  shape: 'tbd',
  participantId: null,
  position: null,
  feederMarker: null,
  result: null,
  score: null,
  isOrigin: false,
  isDerived: true,
});

interface MatchSpec {
  id: number;
  number: number;
  roundNumber: number;
  status: number;
  editable?: boolean;
  lockedReason?: string | null;
  opponent1: SnapshotSlot;
  opponent2: SnapshotSlot;
}

const match = (spec: MatchSpec): SnapshotMatch => ({
  id: spec.id,
  number: spec.number,
  roundNumber: spec.roundNumber,
  status: spec.status,
  editable: spec.editable ?? true,
  lockedReason: spec.lockedReason ?? null,
  opponent1: spec.opponent1,
  opponent2: spec.opponent2,
});

function tenTeamSnapshot(): RearrangeSnapshot {
  return {
    bracketId: 'bracket-1',
    stageId: 1,
    matches: [
      // Losers round 1: the library's walkovers keep Locked (0) plus a 'win'.
      match({
        id: 301,
        number: 1,
        roundNumber: 1,
        status: 0,
        opponent1: byeSlot({ feederMarker: 1 }),
        opponent2: teamSlot(T9, { position: 2, feederMarker: 2, result: 'win' }),
      }),
      match({
        id: 302,
        number: 2,
        roundNumber: 1,
        status: 0,
        opponent1: byeSlot({ feederMarker: 3 }),
        opponent2: byeSlot({ feederMarker: 4 }),
      }),
      match({
        id: 303,
        number: 3,
        roundNumber: 1,
        status: 0,
        opponent1: byeSlot({ feederMarker: 5 }),
        opponent2: teamSlot(T10, { position: 6, feederMarker: 6, result: 'win' }),
      }),
      match({
        id: 304,
        number: 4,
        roundNumber: 1,
        status: 0,
        opponent1: byeSlot({ feederMarker: 7 }),
        opponent2: byeSlot({ feederMarker: 8 }),
      }),
      // Losers round 2 (minor round): opponent1 = WB drop-in, opponent2 = carry.
      match({
        id: 401,
        number: 1,
        roundNumber: 2,
        status: 2,
        opponent1: teamSlot(D1, { position: 9, feederMarker: 9 }),
        opponent2: teamSlot(T9, { isOrigin: false, isDerived: true }),
      }),
      match({
        id: 402,
        number: 2,
        roundNumber: 2,
        status: 0,
        opponent1: teamSlot(D2, { position: 10, feederMarker: 10, result: 'win' }),
        opponent2: byeSlot({ isOrigin: false, isDerived: true }),
      }),
      match({
        id: 403,
        number: 3,
        roundNumber: 2,
        status: 2,
        opponent1: teamSlot(D3, { position: 11, feederMarker: 11 }),
        opponent2: teamSlot(T10, { isOrigin: false, isDerived: true }),
      }),
      match({
        id: 404,
        number: 4,
        roundNumber: 2,
        status: 0,
        opponent1: teamSlot(D4, { position: 12, feederMarker: 12, result: 'win' }),
        opponent2: byeSlot({ isOrigin: false, isDerived: true }),
      }),
      // Losers round 3: waiting on round 2's real matches.
      match({
        id: 501,
        number: 1,
        roundNumber: 3,
        status: 1,
        editable: false,
        lockedReason: 'is still waiting on a team from an earlier match',
        opponent1: tbdSlot(),
        opponent2: teamSlot(D2, { isOrigin: false, isDerived: true }),
      }),
      match({
        id: 502,
        number: 2,
        roundNumber: 3,
        status: 1,
        editable: false,
        lockedReason: 'is still waiting on a team from an earlier match',
        opponent1: tbdSlot(),
        opponent2: teamSlot(D4, { isOrigin: false, isDerived: true }),
      }),
      // Losers round 4: entirely open.
      match({
        id: 601,
        number: 1,
        roundNumber: 4,
        status: 1,
        editable: false,
        lockedReason: 'is still waiting on a team from an earlier match',
        opponent1: tbdSlot(),
        opponent2: tbdSlot(),
      }),
    ],
    landings: {
      301: { matchId: 401, side: 'opponent2' },
      302: { matchId: 402, side: 'opponent2' },
      303: { matchId: 403, side: 'opponent2' },
      304: { matchId: 404, side: 'opponent2' },
      401: { matchId: 501, side: 'opponent1' },
      402: { matchId: 501, side: 'opponent2' },
      403: { matchId: 502, side: 'opponent1' },
      404: { matchId: 502, side: 'opponent2' },
      501: { matchId: 601, side: 'opponent1' },
      502: { matchId: 601, side: 'opponent2' },
      601: null,
    },
    names: NAMES,
  };
}

/** The identity arrangement: every origin slot keeps its current occupant. */
function identityAssignments(snapshot: RearrangeSnapshot): SlotAssignment[] {
  const assignments: SlotAssignment[] = [];
  for (const m of snapshot.matches) {
    for (const side of ['opponent1', 'opponent2'] as const) {
      if (m[side].isOrigin) {
        assignments.push({ matchId: m.id, side, participantId: m[side].participantId });
      }
    }
  }
  return assignments;
}

function withAssignment(
  assignments: SlotAssignment[],
  matchId: number,
  side: 'opponent1' | 'opponent2',
  participantId: number | null
): SlotAssignment[] {
  return assignments.map((assignment) =>
    assignment.matchId === matchId && assignment.side === side
      ? { ...assignment, participantId }
      : assignment
  );
}

const fieldsFor = (
  result: ReturnType<typeof simulateRearrange>,
  matchId: number
): Record<string, unknown> | undefined =>
  result.writes.find((write) => write.matchId === matchId)?.fields;

describe('simulateRearrange', () => {
  it('does nothing for the identity arrangement', () => {
    const snapshot = tenTeamSnapshot();
    const result = simulateRearrange(snapshot, identityAssignments(snapshot));
    expect(result.ok).toBe(true);
    expect(result.writes).toEqual([]);
    expect(result.moves).toEqual([]);
    expect(result.consequences).toEqual([]);
  });

  it('moves a dropped loser into a BYE-vs-BYE placeholder match, cascading both walkovers', () => {
    const snapshot = tenTeamSnapshot();
    let assignments = identityAssignments(snapshot);
    assignments = withAssignment(assignments, 301, 'opponent2', null);
    assignments = withAssignment(assignments, 302, 'opponent2', T9);
    const result = simulateRearrange(snapshot, assignments);

    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.moves).toEqual(['T9 moves from Round 1 Match 1 to Round 1 Match 2.']);

    // T9's old match becomes a double BYE: the sentinel replaces T9.
    expect(fieldsFor(result, 301)).toEqual({
      opponent2_id: null,
      opponent2_position: null,
      opponent2_result: 'bye',
    });
    // T9's new match is a walkover in the app's written form (Completed + win),
    // and T9 takes that spot's feeder marker.
    expect(fieldsFor(result, 302)).toEqual({
      opponent2_id: T9,
      opponent2_position: 4,
      opponent2_result: 'win',
      opponent2_score: 0,
      status: 4,
    });
    // Round 2 Match 1 loses its carry: D1 now walks over and advances.
    expect(fieldsFor(result, 401)).toEqual({
      opponent1_result: 'win',
      opponent1_score: 0,
      opponent2_id: null,
      opponent2_result: 'bye',
      status: 4,
    });
    // Round 2 Match 2 gains T9: D2's walkover is undone, the match is real.
    expect(fieldsFor(result, 402)).toEqual({
      opponent1_result: null,
      opponent2_id: T9,
      opponent2_result: null,
      status: 2,
    });
    // Round 3: D1 advances in, D2 is un-placed — one write, ids only.
    expect(fieldsFor(result, 501)).toEqual({
      opponent1_id: D1,
      opponent2_id: null,
    });

    expect(result.consequences).toEqual(
      expect.arrayContaining([
        'Round 1 Match 1 is left with no teams; a BYE passes on to the next round.',
        'T9 has no opponent in Round 1 Match 2 and advances automatically.',
        'T9 advances automatically into Round 2 Match 2.',
        'D1 has no opponent in Round 2 Match 1 and advances automatically.',
        'D1 advances automatically into Round 3 Match 1.',
        'Round 2 Match 2 is now D2 vs T9, ready to play.',
        'D2 is removed from Round 3 Match 1; that spot now waits for an earlier match.',
      ])
    );
  });

  it('swaps a drop-in with a walkover team, matching the swap tool end state', () => {
    const snapshot = tenTeamSnapshot();
    let assignments = identityAssignments(snapshot);
    assignments = withAssignment(assignments, 401, 'opponent1', D2);
    assignments = withAssignment(assignments, 402, 'opponent1', D1);
    const result = simulateRearrange(snapshot, assignments);

    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    // The real match now holds D2; the spot keeps its own feeder marker.
    expect(fieldsFor(result, 401)).toEqual({ opponent1_id: D2 });
    // The walkover now belongs to D1 (marker stays with the spot; win recomputed).
    expect(fieldsFor(result, 402)).toEqual({
      opponent1_id: D1,
      opponent1_score: 0,
      status: 4,
    });
    // Downstream, D2's stale advancement is replaced by D1's.
    expect(fieldsFor(result, 501)).toEqual({ opponent2_id: D1 });
    expect(result.consequences).toEqual(
      expect.arrayContaining([
        'D1 has no opponent in Round 2 Match 2 and advances automatically.',
        'D2 is removed from Round 3 Match 1; D1 takes that spot automatically.',
      ])
    );
  });

  it('keeps each spot marker when a round-1 team and a round-2 drop-in trade places', () => {
    // The reported bug: T9 (lost in winners round 1) moved into a round-2
    // drop-in spot used to bring its round-1 marker along, and scoring that
    // match then sent the library to a winners-round-2 match that does not exist.
    const snapshot = tenTeamSnapshot();
    let assignments = identityAssignments(snapshot);
    assignments = withAssignment(assignments, 301, 'opponent2', D1);
    assignments = withAssignment(assignments, 401, 'opponent1', T9);
    const result = simulateRearrange(snapshot, assignments);

    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(fieldsFor(result, 401)).toEqual({ opponent1_id: T9, opponent2_id: D1 });
    expect(fieldsFor(result, 301)).not.toHaveProperty('opponent2_position');
    expect(result.preview['401'].opponent1).toMatchObject({ participantId: T9, position: 9 });
    expect(result.preview['301'].opponent2).toMatchObject({ participantId: D1, position: 2 });
  });

  it('writes the spot marker when the stored one has gone wrong', () => {
    const snapshot = tenTeamSnapshot();
    const damaged = snapshot.matches.find((m) => m.id === 401);
    if (!damaged) throw new Error('fixture: match 401 missing');
    damaged.opponent1.position = 2;

    let assignments = identityAssignments(snapshot);
    assignments = withAssignment(assignments, 401, 'opponent1', D3);
    assignments = withAssignment(assignments, 403, 'opponent1', D1);
    const result = simulateRearrange(snapshot, assignments);

    expect(result.ok).toBe(true);
    expect(fieldsFor(result, 401)).toEqual({ opponent1_id: D3, opponent1_position: 9 });
    expect(fieldsFor(result, 403)).toEqual({ opponent1_id: D1 });
  });

  it('cascades a BYE two levels when a team moves into the round-1 placeholder that feeds its own match', () => {
    const snapshot = tenTeamSnapshot();
    let assignments = identityAssignments(snapshot);
    assignments = withAssignment(assignments, 402, 'opponent1', null);
    assignments = withAssignment(assignments, 302, 'opponent1', D2);
    const result = simulateRearrange(snapshot, assignments);

    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    // D2 wins the round-1 walkover and arrives back in its old match's carry
    // slot; its old drop-in slot is now a stored BYE, so it walks over again.
    expect(fieldsFor(result, 302)).toEqual({
      opponent1_id: D2,
      opponent1_position: 3,
      opponent1_result: 'win',
      opponent1_score: 0,
      status: 4,
    });
    expect(fieldsFor(result, 402)).toEqual({
      opponent1_id: null,
      opponent1_position: null,
      opponent1_result: 'bye',
      opponent2_id: D2,
      opponent2_result: 'win',
      opponent2_score: 0,
      status: 4,
    });
    // D2 still ends up in Round 3 Match 1 — no downstream write needed.
    expect(fieldsFor(result, 501)).toBeUndefined();
  });

  it('marks a waiting match Ready once the cascade fills both of its spots', () => {
    const snapshot = tenTeamSnapshot();
    // T9 leaves Round 1 Match 1 to face T10 in Match 3: Match 1 becomes a
    // double BYE, so D1 walks over and joins D2 — who already advanced — in
    // Round 3 Match 1, which now has both teams and must be Ready.
    let assignments = identityAssignments(snapshot);
    assignments = withAssignment(assignments, 301, 'opponent2', null);
    assignments = withAssignment(assignments, 303, 'opponent1', T9);
    const result = simulateRearrange(snapshot, assignments);

    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(fieldsFor(result, 501)).toEqual({ opponent1_id: D1, status: 2 });
    expect(result.consequences).toEqual(
      expect.arrayContaining(['Round 3 Match 1 is now D1 vs D2, ready to play.'])
    );
  });

  it('completes a walkover created inside a waiting match and advances its winner', () => {
    const snapshot = tenTeamSnapshot();
    // Both feeders of Round 3 Match 1 end up producing BYEs on one side while
    // D2 stays on the other: the waiting match becomes D2's walkover, and D2
    // advances a further round — two cascades beyond anything the admin
    // touched directly.
    let assignments = identityAssignments(snapshot);
    assignments = withAssignment(assignments, 301, 'opponent2', null);
    assignments = withAssignment(assignments, 401, 'opponent1', null);
    assignments = withAssignment(assignments, 303, 'opponent1', D1);
    assignments = withAssignment(assignments, 304, 'opponent1', T9);
    const result = simulateRearrange(snapshot, assignments);

    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(fieldsFor(result, 501)).toEqual({
      opponent1_result: 'bye',
      opponent2_result: 'win',
      opponent2_score: 0,
      status: 4,
    });
    expect(fieldsFor(result, 601)).toEqual({ opponent1_id: D2 });
    expect(result.consequences).toEqual(
      expect.arrayContaining([
        'D2 has no opponent in Round 3 Match 1 and advances automatically.',
        'D2 advances automatically into Round 4 Match 1.',
      ])
    );
  });

  it('refuses to place the same team in two spots', () => {
    const snapshot = tenTeamSnapshot();
    const assignments = withAssignment(identityAssignments(snapshot), 302, 'opponent1', T9);
    const result = simulateRearrange(snapshot, assignments);
    expect(result.ok).toBe(false);
    expect(result.writes).toEqual([]);
    expect(result.problems).toEqual([
      { message: 'T9 is placed in 2 spots. Each team can only be in one spot.' },
    ]);
  });

  it('refuses to leave a team without a spot', () => {
    const snapshot = tenTeamSnapshot();
    const assignments = withAssignment(identityAssignments(snapshot), 301, 'opponent2', null);
    const result = simulateRearrange(snapshot, assignments);
    expect(result.ok).toBe(false);
    expect(result.problems).toEqual([
      { message: 'T9 has no spot. Every team must be placed somewhere.' },
    ]);
  });

  it('reports a stale board when the assignments do not cover the origin slots', () => {
    const snapshot = tenTeamSnapshot();
    const assignments = identityAssignments(snapshot).slice(1);
    const result = simulateRearrange(snapshot, assignments);
    expect(result.ok).toBe(false);
    expect(result.problems[0].message).toMatch(/bracket changed since this screen was opened/);
  });

  it('reports a stale board for an unknown team id', () => {
    const snapshot = tenTeamSnapshot();
    const assignments = withAssignment(identityAssignments(snapshot), 302, 'opponent1', 999);
    const result = simulateRearrange(snapshot, assignments);
    expect(result.ok).toBe(false);
    expect(result.problems[0].message).toMatch(/bracket changed since this screen was opened/);
  });

  it('hard-refuses when an automatic change would touch a match already being played', () => {
    const snapshot = tenTeamSnapshot();
    const running = snapshot.matches.find((m) => m.id === 501);
    if (!running) throw new Error('fixture: match 501 missing');
    running.status = 3;
    running.editable = false;
    running.lockedReason = 'is currently being played';

    let assignments = identityAssignments(snapshot);
    assignments = withAssignment(assignments, 401, 'opponent1', D2);
    assignments = withAssignment(assignments, 402, 'opponent1', D1);
    const result = simulateRearrange(snapshot, assignments);

    expect(result.ok).toBe(false);
    expect(result.writes).toEqual([]);
    expect(result.problems).toEqual([
      {
        message:
          'This arrangement needs to change Round 3 Match 1 automatically, ' +
          'but that match is currently being played.',
      },
    ]);
  });

  it('protects the losers-bracket final: its outcome spot must not change', () => {
    const snapshot: RearrangeSnapshot = {
      bracketId: 'bracket-2',
      stageId: 2,
      matches: [
        match({
          id: 600,
          number: 1,
          roundNumber: 1,
          status: 0,
          opponent1: teamSlot(D3, { result: 'win' }),
          opponent2: byeSlot(),
        }),
        match({
          id: 601,
          number: 2,
          roundNumber: 1,
          status: 2,
          opponent1: teamSlot(D1),
          opponent2: teamSlot(D2),
        }),
      ],
      landings: { 600: null, 601: null },
      names: NAMES,
    };

    // Swapping sides within the final keeps its outcome open — allowed.
    let assignments = identityAssignments(snapshot);
    assignments = withAssignment(assignments, 601, 'opponent1', D2);
    assignments = withAssignment(assignments, 601, 'opponent2', D1);
    const sideSwap = simulateRearrange(snapshot, assignments);
    expect(sideSwap.ok).toBe(true);
    expect(fieldsFor(sideSwap, 601)).toEqual({ opponent1_id: D2, opponent2_id: D1 });

    // Pulling a team out of the final would change what feeds the grand final.
    let pullOut = identityAssignments(snapshot);
    pullOut = withAssignment(pullOut, 601, 'opponent2', null);
    pullOut = withAssignment(pullOut, 600, 'opponent2', D2);
    const refused = simulateRearrange(snapshot, pullOut);
    expect(refused.ok).toBe(false);
    expect(refused.problems.map((problem) => problem.message)).toEqual(
      expect.arrayContaining([expect.stringContaining('into the grand final')])
    );
  });

  it('previews the end state of every match, including untouched ones', () => {
    const snapshot = tenTeamSnapshot();
    let assignments = identityAssignments(snapshot);
    assignments = withAssignment(assignments, 401, 'opponent1', D2);
    assignments = withAssignment(assignments, 402, 'opponent1', D1);
    const result = simulateRearrange(snapshot, assignments);

    expect(result.preview['401'].opponent1).toMatchObject({ participantId: D2, position: 9 });
    expect(result.preview['402'].opponent1).toMatchObject({
      participantId: D1,
      result: 'win',
      score: 0,
    });
    expect(result.preview['501'].opponent2).toMatchObject({ participantId: D1 });
    expect(result.preview['303'].opponent2).toMatchObject({ participantId: T10 });
  });
});

/** The snapshot as it would read after a simulation's writes. */
function snapshotAfter(
  snapshot: RearrangeSnapshot,
  result: ReturnType<typeof simulateSlotChanges>
): RearrangeSnapshot {
  return {
    ...snapshot,
    matches: snapshot.matches.map((m) => {
      const after = result.preview[String(m.id)];
      return {
        ...m,
        status: after.status,
        opponent1: { ...m.opponent1, ...after.opponent1 },
        opponent2: { ...m.opponent2, ...after.opponent2 },
      };
    }),
  };
}

describe('simulateSlotChanges', () => {
  const reopenPlaceholder = {
    matchId: 302,
    side: 'opponent1' as const,
    content: { kind: 'tbd' as const, position: 3 },
  };

  it('turns a BYE spot back into a waiting spot and undoes the walkovers it caused', () => {
    const result = simulateSlotChanges(tenTeamSnapshot(), [reopenPlaceholder], {
      labelPrefix: 'Losers ',
    });

    expect(result.problems).toEqual([]);
    expect(fieldsFor(result, 302)).toEqual({
      opponent1_position: 3,
      opponent1_result: null,
      status: 1,
    });
    // D2's walkover in Round 2 Match 2 is off: the carry spot waits now.
    expect(fieldsFor(result, 402)).toEqual({
      opponent1_result: null,
      opponent2_result: null,
      status: 1,
    });
    expect(fieldsFor(result, 501)).toEqual({ opponent2_id: null });
    expect(result.consequences).toEqual(
      expect.arrayContaining([
        'Losers Round 1 Match 2 goes back to waiting for an earlier match.',
        'D2 is removed from Losers Round 3 Match 1; that spot now waits for an earlier match.',
      ])
    );
  });

  it('turns a waiting spot into a BYE, passing it on, and a second run writes nothing', () => {
    const reopened = snapshotAfter(
      tenTeamSnapshot(),
      simulateSlotChanges(tenTeamSnapshot(), [reopenPlaceholder])
    );
    const toBye = [{ ...reopenPlaceholder, content: { kind: 'bye' as const } }];

    const result = simulateSlotChanges(reopened, toBye);
    expect(result.problems).toEqual([]);
    expect(fieldsFor(result, 302)).toEqual({
      opponent1_position: null,
      opponent1_result: 'bye',
      status: 0,
    });
    expect(fieldsFor(result, 402)).toEqual({
      opponent1_result: 'win',
      opponent1_score: 0,
      opponent2_result: 'bye',
      status: 4,
    });
    expect(fieldsFor(result, 501)).toEqual({ opponent2_id: D2 });

    // Saved again on the state it wrote: the cascade is already complete.
    expect(simulateSlotChanges(snapshotAfter(reopened, result), toBye).writes).toEqual([]);
  });

  it('refuses when a match the cascade reaches has been played', () => {
    const snapshot = tenTeamSnapshot();
    const played = snapshot.matches.find((m) => m.id === 501);
    if (!played) throw new Error('fixture: match 501 missing');
    played.status = 4;
    played.lockedReason = 'has already been played';

    const result = simulateSlotChanges(snapshot, [reopenPlaceholder], { labelPrefix: 'Losers ' });
    expect(result.ok).toBe(false);
    expect(result.writes).toEqual([]);
    expect(result.problems.map((problem) => problem.message)).toEqual([
      'This change needs to change Losers Round 3 Match 1 automatically, but that match has ' +
        'already been played.',
    ]);
  });

  it('changes both spots of one match together, checking each against the unchanged match', () => {
    // Round 1 Match 2 as the library writes a BYE facing a waiting spot: an
    // anticipated 'win' on the waiting side. Both spots change at once (a
    // winners-bracket trade moves the BYE from one feeder to the other).
    const snapshot = tenTeamSnapshot();
    const placeholder = snapshot.matches.find((m) => m.id === 302);
    if (!placeholder) throw new Error('fixture: match 302 missing');
    placeholder.editable = false;
    placeholder.lockedReason = 'is still waiting on a team from an earlier match';
    placeholder.opponent2 = { ...tbdSlot(), feederMarker: 4, position: 4, result: 'win' };

    const result = simulateSlotChanges(snapshot, [
      { matchId: 302, side: 'opponent1', content: { kind: 'tbd', position: 3 } },
      { matchId: 302, side: 'opponent2', content: { kind: 'bye' } },
    ]);

    expect(result.problems).toEqual([]);
    expect(fieldsFor(result, 302)).toEqual({
      opponent1_position: 3,
      opponent1_result: null,
      opponent2_position: null,
      opponent2_result: 'bye',
      status: 1,
    });
  });

  it('refuses a target slot that holds a team', () => {
    const result = simulateSlotChanges(tenTeamSnapshot(), [
      { matchId: 301, side: 'opponent2', content: { kind: 'bye' } },
    ]);
    expect(result.ok).toBe(false);
    expect(result.problems[0].message).toBe(
      "Round 1 Match 1 already holds a team in that spot, so it can't change automatically."
    );
  });

  it('refuses an outcome change in a match whose landing is unknown', () => {
    const snapshot = {
      ...tenTeamSnapshot(),
      landings: { ...tenTeamSnapshot().landings, 402: null },
    };
    const result = simulateSlotChanges(snapshot, [reopenPlaceholder]);
    expect(result.ok).toBe(false);
    expect(result.problems[0].message).toBe(
      'This change needs to change what comes out of Round 2 Match 2, but that part of the ' +
        'bracket looks inconsistent — run Repair Bracket first.'
    );
  });
});
