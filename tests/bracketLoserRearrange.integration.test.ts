/**
 * Losers-bracket rearrange tool — integration suite over the REAL
 * BracketManagerService + REAL SupabaseSqlStorage + REAL brackets-manager,
 * running on the relational in-memory fake (tests/fakes/fakeSupabaseBracketDb).
 *
 * Reproduces the motivating real-world case: a 10-team double elimination
 * (a size-16 stage with six BYEs). After winners round 1, only two teams have
 * dropped into the losers bracket, and losers round 1 contains two BYE-vs-BYE
 * placeholder matches that the older same-round swap tool refused to touch.
 * The rearrange tool treats those placeholder spots as ordinary destinations
 * and can move teams across rounds, cascading walkovers and BYEs
 * automatically.
 *
 * With teams seeded T1..T10 and opponent1 winning every winners-bracket match:
 *   WB R1 real matches: T8 v T9 and T7 v T10 → T9 and T10 drop to LB R1.
 *   LB R1: M1 = [BYE, T9], M2 = [BYE, BYE], M3 = [BYE, T10], M4 = [BYE, BYE].
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FakeSupabaseBracketDb } from './fakes/fakeSupabaseBracketDb';

vi.mock('@/integrations/supabase/client', async () => {
  const { FakeSupabaseBracketDb } = await import('./fakes/fakeSupabaseBracketDb');
  const db = new FakeSupabaseBracketDb();
  (globalThis as Record<string, unknown>).__fakeBracketDb = db;
  return { supabase: db.client };
});

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(actual).map((key) => [key, vi.fn()]));
});

import { BracketManagerService } from '@/services/brackets/manager/BracketManagerService';
import type {
  RearrangeBoard,
  SlotAssignment,
} from '@/services/brackets/manager/services/BracketAdmin/rearrange/types';

const db = (): FakeSupabaseBracketDb =>
  (globalThis as Record<string, unknown>).__fakeBracketDb as FakeSupabaseBracketDb;

const BRACKET_ID = 'bracket-uuid-1';

interface MatchRow {
  id: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  number: number;
  status: number;
  opponent1_id: number | null;
  opponent1_position: number | null;
  opponent1_score: number | null;
  opponent1_result: string | null;
  opponent2_id: number | null;
  opponent2_position: number | null;
  opponent2_score: number | null;
  opponent2_result: string | null;
}

function teams(count: number): { id: string; name: string; seed: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `uuid-${i + 1}`,
    name: `T${i + 1}`,
    seed: i + 1,
  }));
}

function matchRows(): MatchRow[] {
  return (db().rows('match') as unknown as MatchRow[]).sort((a, b) => a.id - b.id);
}

function participantIdByName(name: string): number {
  const participant = (db().rows('participant') as { id: number; name: string | null }[]).find(
    (p) => p.name === name
  );
  if (!participant) throw new Error(`test fixture: no participant named ${name}`);
  return participant.id;
}

function groupIdByNumber(groupNumber: number): number {
  const group = (db().rows('group') as { id: number; number: number }[]).find(
    (g) => g.number === groupNumber
  );
  if (!group) throw new Error(`test fixture: no group number ${groupNumber}`);
  return group.id;
}

function roundIdBy(groupNumber: number, roundNumber: number): number {
  const groupId = groupIdByNumber(groupNumber);
  const round = (db().rows('round') as { id: number; group_id: number; number: number }[]).find(
    (r) => r.group_id === groupId && r.number === roundNumber
  );
  if (!round) throw new Error(`test fixture: no round ${roundNumber} in group ${groupNumber}`);
  return round.id;
}

function matchBy(groupNumber: number, roundNumber: number, matchNumber: number): MatchRow {
  const roundId = roundIdBy(groupNumber, roundNumber);
  const match = matchRows().find((m) => m.round_id === roundId && m.number === matchNumber);
  if (!match) {
    throw new Error(
      `test fixture: no match ${matchNumber} in group ${groupNumber} R${roundNumber}`
    );
  }
  return match;
}

/** Play every Ready/Running winners-bracket match up to the given round, opponent1 winning. */
async function playWinnersBracketThroughRound(
  service: BracketManagerService,
  throughRound: number
): Promise<void> {
  const wbGroupId = groupIdByNumber(1);
  const wbRoundIds = (db().rows('round') as { id: number; group_id: number; number: number }[])
    .filter((r) => r.group_id === wbGroupId && r.number <= throughRound)
    .map((r) => r.id);
  for (let i = 0; i < 16; i++) {
    const ready = matchRows()
      .filter((m) => wbRoundIds.includes(m.round_id) && (m.status === 2 || m.status === 3))
      .sort((a, b) => a.id - b.id)[0];
    if (!ready) return;
    await service.updateMatch({
      matchId: ready.id,
      scores: {
        opponent1: { score: 2, result: 'win' },
        opponent2: { score: 0, result: 'loss' },
      },
    });
  }
  throw new Error('playWinnersBracketThroughRound did not converge');
}

async function buildTenTeamBracket(
  service: BracketManagerService,
  throughWinnersRound: number
): Promise<void> {
  db().seed('brackets', [{ id: BRACKET_ID, state: 'pending', uses_brackets_manager: true }]);
  await service.createBracket({
    bracketId: BRACKET_ID,
    format: 'double_elimination',
    teams: teams(10),
    grandFinalType: 'simple',
  });
  await playWinnersBracketThroughRound(service, throughWinnersRound);
}

/** The identity arrangement read straight off the board's movable spots. */
function assignmentsFromBoard(board: RearrangeBoard): SlotAssignment[] {
  const assignments: SlotAssignment[] = [];
  for (const round of board.rounds) {
    for (const view of round.matches) {
      for (const slot of view.slots) {
        if (slot.kind === 'team' || slot.kind === 'bye') {
          assignments.push({
            matchId: view.matchId,
            side: slot.side,
            participantId: slot.participantId,
          });
        }
      }
    }
  }
  return assignments;
}

function setSlot(
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

beforeAll(() => {
  // The facade constructs BracketsManager with VERBOSE=true, which logs every
  // storage call straight to console.log — silence it for readable test output.
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

beforeEach(() => {
  db().reset();
  db().setRpcHandler('finalize_bracket_standings', () => ({ data: 0, error: null }));
});

describe('losers-bracket rearrange (real service + real library over fake DB)', () => {
  it('moves a dropped loser into a BYE-vs-BYE placeholder and the bracket plays on', async () => {
    const service = new BracketManagerService();
    await buildTenTeamBracket(service, 1);

    const t9 = participantIdByName('T9');

    // The 10-team layout this tool exists for: two placeholder matches.
    const lbR1M1 = matchBy(2, 1, 1);
    const lbR1M2 = matchBy(2, 1, 2);
    expect(lbR1M1).toMatchObject({ opponent1_result: 'bye', opponent2_id: t9 });
    expect(lbR1M2).toMatchObject({ opponent1_result: 'bye', opponent2_result: 'bye' });
    const t9Position = lbR1M1.opponent2_position;
    expect(t9Position).not.toBeNull();

    // The board offers the placeholder's spots as ordinary BYE destinations —
    // the exact thing the same-round swap tool refused.
    const board = await service.getLoserRearrangeBoard(BRACKET_ID);
    const placeholderView = board.rounds
      .flatMap((round) => round.matches)
      .find((view) => view.matchId === lbR1M2.id);
    expect(placeholderView?.locked).toBe(false);
    expect(placeholderView?.slots.map((slot) => slot.kind)).toEqual(['bye', 'bye']);

    // Move T9 into the placeholder.
    let assignments = assignmentsFromBoard(board);
    assignments = setSlot(assignments, lbR1M1.id, 'opponent2', null);
    assignments = setSlot(assignments, lbR1M2.id, 'opponent2', t9);
    const result = await service.applyLoserBracketRearrange(BRACKET_ID, assignments);
    expect(result.message).toContain('T9 moves from Round 1 Match 1 to Round 1 Match 2.');

    // Old match: double BYE. New match: T9's walkover, marker along for the ride.
    expect(matchBy(2, 1, 1)).toMatchObject({
      opponent1_result: 'bye',
      opponent2_id: null,
      opponent2_position: null,
      opponent2_result: 'bye',
      status: 0,
    });
    expect(matchBy(2, 1, 2)).toMatchObject({
      opponent1_result: 'bye',
      opponent2_id: t9,
      opponent2_position: t9Position,
      opponent2_result: 'win',
      opponent2_score: 0,
      status: 4,
    });
    // Round 2 carries follow: T9's old carry spot becomes a BYE, its new one is
    // T9 — and the library's pre-recorded walkover 'win' on the still-empty
    // drop-in slot next to T9 is cleared, because that walkover is off now.
    expect(matchBy(2, 2, 1)).toMatchObject({ opponent2_id: null, opponent2_result: 'bye' });
    expect(matchBy(2, 2, 2)).toMatchObject({
      opponent1_id: null,
      opponent1_result: null,
      opponent2_id: t9,
      opponent2_result: null,
      status: 1,
    });

    // The bracket keeps working end to end: play winners round 2, then the
    // real losers match T9 now belongs to, and the winner propagates.
    await playWinnersBracketThroughRound(service, 2);
    const lbR2M2 = matchBy(2, 2, 2);
    expect(lbR2M2.status).toBe(2);
    expect(lbR2M2.opponent1_id).not.toBeNull();
    expect(lbR2M2.opponent2_id).toBe(t9);
    await service.updateMatch({
      matchId: lbR2M2.id,
      scores: {
        opponent1: { score: 0, result: 'loss' },
        opponent2: { score: 2, result: 'win' },
      },
    });
    const lbR3M1 = matchBy(2, 3, 1);
    expect([lbR3M1.opponent1_id, lbR3M1.opponent2_id]).toContain(t9);
    // And the freed spot resolved itself: the team that dropped into Round 2
    // Match 1 walked over the BYE we left behind and advanced here too.
    expect(lbR3M1.opponent1_id).not.toBeNull();
    expect(lbR3M1.opponent2_id).not.toBeNull();
  });

  it('pairs the two dropped losers against each other across rounds 1 spots', async () => {
    const service = new BracketManagerService();
    await buildTenTeamBracket(service, 1);

    const t9 = participantIdByName('T9');
    const t10 = participantIdByName('T10');
    const lbR1M1 = matchBy(2, 1, 1);
    const lbR1M3 = matchBy(2, 1, 3);
    expect(lbR1M1.opponent2_id).toBe(t9);
    expect(lbR1M3.opponent2_id).toBe(t10);
    const t10Position = lbR1M3.opponent2_position;

    const board = await service.getLoserRearrangeBoard(BRACKET_ID);
    let assignments = assignmentsFromBoard(board);
    assignments = setSlot(assignments, lbR1M3.id, 'opponent2', null);
    assignments = setSlot(assignments, lbR1M1.id, 'opponent1', t10);
    await service.applyLoserBracketRearrange(BRACKET_ID, assignments);

    // A real match now exists where the library had scheduled two walkovers.
    expect(matchBy(2, 1, 1)).toMatchObject({
      opponent1_id: t10,
      opponent1_position: t10Position,
      opponent1_result: null,
      opponent2_id: t9,
      opponent2_result: null,
      status: 2,
    });
    expect(matchBy(2, 1, 3)).toMatchObject({
      opponent1_result: 'bye',
      opponent2_id: null,
      opponent2_result: 'bye',
      status: 0,
    });
    // T9's stale advancement is undone (spot waits again); T10's old carry is a BYE.
    expect(matchBy(2, 2, 1)).toMatchObject({ opponent2_id: null, opponent2_result: null });
    expect(matchBy(2, 2, 3)).toMatchObject({ opponent2_id: null, opponent2_result: 'bye' });

    // Playing the new real match propagates its winner into the freed spot.
    await service.updateMatch({
      matchId: lbR1M1.id,
      scores: {
        opponent1: { score: 2, result: 'win' },
        opponent2: { score: 0, result: 'loss' },
      },
    });
    expect(matchBy(2, 2, 1).opponent2_id).toBe(t10);
  });

  it('moves a round-2 drop-in back into round 1, walking over twice into the same spot', async () => {
    const service = new BracketManagerService();
    await buildTenTeamBracket(service, 2);

    // Find a round-2 walkover: its drop-in faces the BYE carried out of a
    // BYE-vs-BYE placeholder, and it has already advanced into round 3.
    const lbR2M2 = matchBy(2, 2, 2);
    expect(lbR2M2).toMatchObject({ opponent1_result: 'win', opponent2_result: 'bye' });
    const dropInId = lbR2M2.opponent1_id as number;
    const dropInPosition = lbR2M2.opponent1_position;
    const lbR1M2 = matchBy(2, 1, 2);
    const lbR3M1Before = matchBy(2, 3, 1);
    expect([lbR3M1Before.opponent1_id, lbR3M1Before.opponent2_id]).toContain(dropInId);

    const board = await service.getLoserRearrangeBoard(BRACKET_ID);
    let assignments = assignmentsFromBoard(board);
    assignments = setSlot(assignments, lbR2M2.id, 'opponent1', null);
    assignments = setSlot(assignments, lbR1M2.id, 'opponent1', dropInId);
    await service.applyLoserBracketRearrange(BRACKET_ID, assignments);

    // The team now walks over in round 1, arrives back in its old match's
    // carry spot, and walks over again — round 3 needs no change at all.
    expect(matchBy(2, 1, 2)).toMatchObject({
      opponent1_id: dropInId,
      opponent1_position: dropInPosition,
      opponent1_result: 'win',
      opponent1_score: 0,
      opponent2_result: 'bye',
      status: 4,
    });
    expect(matchBy(2, 2, 2)).toMatchObject({
      opponent1_id: null,
      opponent1_result: 'bye',
      opponent2_id: dropInId,
      opponent2_result: 'win',
      opponent2_score: 0,
      status: 4,
    });
    expect(matchBy(2, 3, 1)).toEqual(lbR3M1Before);

    // The rest of round 2 still plays through the library normally.
    const lbR2M1 = matchBy(2, 2, 1);
    expect(lbR2M1.status).toBe(2);
    await service.updateMatch({
      matchId: lbR2M1.id,
      scores: {
        opponent1: { score: 2, result: 'win' },
        opponent2: { score: 0, result: 'loss' },
      },
    });
    const lbR3M1 = matchBy(2, 3, 1);
    expect(lbR3M1.opponent1_id).not.toBeNull();
    expect(lbR3M1.opponent2_id).toBe(dropInId);
    expect(lbR3M1.status).toBe(2);
  });

  it('reproduces the 9-team swap scenario through the rearrange API', async () => {
    const service = new BracketManagerService();
    db().seed('brackets', [{ id: BRACKET_ID, state: 'pending', uses_brackets_manager: true }]);
    await service.createBracket({
      bracketId: BRACKET_ID,
      format: 'double_elimination',
      teams: teams(9),
      grandFinalType: 'simple',
    });
    await playWinnersBracketThroughRound(service, 2);

    const t5 = participantIdByName('T5');
    const t6 = participantIdByName('T6');
    const t7 = participantIdByName('T7');
    const t9 = participantIdByName('T9');
    const lbR2M1 = matchBy(2, 2, 1);
    const lbR2M4 = matchBy(2, 2, 4);
    expect(lbR2M1).toMatchObject({ opponent1_id: t5, opponent2_id: t9, status: 2 });
    expect(lbR2M4).toMatchObject({ opponent1_id: t7, opponent1_result: 'win' });
    const t5Position = lbR2M1.opponent1_position;
    const t7Position = lbR2M4.opponent1_position;

    const board = await service.getLoserRearrangeBoard(BRACKET_ID);
    let assignments = assignmentsFromBoard(board);
    assignments = setSlot(assignments, lbR2M1.id, 'opponent1', t7);
    assignments = setSlot(assignments, lbR2M4.id, 'opponent1', t5);
    await service.applyLoserBracketRearrange(BRACKET_ID, assignments);

    // Field-for-field the same end state the swap tool produces.
    expect(matchBy(2, 2, 1)).toMatchObject({
      opponent1_id: t7,
      opponent1_position: t7Position,
      opponent1_score: null,
      opponent1_result: null,
      opponent2_id: t9,
      opponent2_result: null,
      status: 2,
    });
    expect(matchBy(2, 2, 4)).toMatchObject({
      opponent1_id: t5,
      opponent1_position: t5Position,
      opponent1_result: 'win',
      opponent1_score: 0,
      opponent2_result: 'bye',
      status: 4,
    });
    expect(matchBy(2, 3, 2)).toMatchObject({ opponent1_id: t6, opponent2_id: t5, status: 2 });
  });

  it('locks matches whose automatic winner reached a played match, and refuses stale boards', async () => {
    const service = new BracketManagerService();
    db().seed('brackets', [{ id: BRACKET_ID, state: 'pending', uses_brackets_manager: true }]);
    await service.createBracket({
      bracketId: BRACKET_ID,
      format: 'double_elimination',
      teams: teams(9),
      grandFinalType: 'simple',
    });
    await playWinnersBracketThroughRound(service, 2);

    const lbR2M4 = matchBy(2, 2, 4); // T7's walkover; T7 advanced to LB R3 M2
    const lbR3M2 = matchBy(2, 3, 2);
    const liveRow = db()
      .tableRows('match')
      .find((row) => row.id === lbR3M2.id);
    Object.assign(liveRow ?? {}, { status: 3, opponent1_score: 1, opponent2_score: 1 });

    // The board locks the walkover up front, with a plain-language reason.
    const board = await service.getLoserRearrangeBoard(BRACKET_ID);
    const walkoverView = board.rounds
      .flatMap((round) => round.matches)
      .find((view) => view.matchId === lbR2M4.id);
    expect(walkoverView?.locked).toBe(true);
    expect(walkoverView?.lockedReason).toContain('T7 already advanced');
    expect(walkoverView?.lockedReason).toContain('is currently being played');

    // Forcing an assignment for a locked spot is refused as a stale board.
    const before = matchRows();
    const forced: SlotAssignment[] = [
      ...assignmentsFromBoard(board),
      { matchId: lbR2M4.id, side: 'opponent1', participantId: null },
    ];
    await expect(service.applyLoserBracketRearrange(BRACKET_ID, forced)).rejects.toThrow(
      /bracket changed since this screen was opened/
    );
    expect(matchRows()).toEqual(before);

    // A board that was valid when loaded is also refused once the bracket
    // moves on underneath it.
    const staleBoard = await service.getLoserRearrangeBoard(BRACKET_ID);
    const staleAssignments = assignmentsFromBoard(staleBoard);
    const lbR2M1 = matchBy(2, 2, 1);
    await service.updateMatch({
      matchId: lbR2M1.id,
      scores: {
        opponent1: { score: 2, result: 'win' },
        opponent2: { score: 0, result: 'loss' },
      },
    });
    await expect(service.applyLoserBracketRearrange(BRACKET_ID, staleAssignments)).rejects.toThrow(
      /bracket changed since this screen was opened/
    );
  });
});
