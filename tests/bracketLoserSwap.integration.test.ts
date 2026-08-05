/**
 * Losers-bracket swap tool — integration suite over the REAL
 * BracketManagerService + REAL SupabaseSqlStorage + REAL brackets-manager,
 * running on the relational in-memory fake (tests/fakes/fakeSupabaseBracketDb).
 *
 * Reproduces the motivating real-world case: a 9-team double elimination where
 * the library pairs the "4 v 5" loser with the "8 v 9" loser in the losers
 * bracket and hands the "2 v 7" loser a walkover — but on the court, the
 * "2 v 7" loser played the "8 v 9" loser. The admin swap records reality.
 *
 * With teams seeded T1..T9 and opponent1 winning every winners-bracket match:
 *   T5 = the 4v5 loser, T9 = the 8v9 loser, T7 = the 2v7 loser.
 * Default LB round 2: M1 = T5 vs T9 (real), M4 = T7 vs BYE (walkover → LB R3).
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

/** Create the 9-team bracket and play WB rounds 1-2 so the losers have dropped. */
async function buildScenario(service: BracketManagerService): Promise<void> {
  db().seed('brackets', [{ id: BRACKET_ID, state: 'pending', uses_brackets_manager: true }]);
  await service.createBracket({
    bracketId: BRACKET_ID,
    format: 'double_elimination',
    teams: teams(9),
    grandFinalType: 'simple',
  });
  await playWinnersBracketThroughRound(service, 2);
}

beforeAll(() => {
  // The facade constructs BracketsManager with VERBOSE=true, which logs every
  // storage call straight to console.log — silence it for readable test output.
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

beforeEach(() => {
  db().reset();
  db().setRpcHandler('finalize_bracket_standings', () => ({ data: 0, error: null }));
});

describe('losers-bracket swap (real service + real library over fake DB)', () => {
  it('reproduces the default pairing, swaps the drop-ins, and the bracket plays on', async () => {
    const service = new BracketManagerService();
    await buildScenario(service);

    const t5 = participantIdByName('T5');
    const t6 = participantIdByName('T6');
    const t7 = participantIdByName('T7');
    const t9 = participantIdByName('T9');

    // The library's default losers-bracket layout after WB rounds 1-2:
    // LB R2 M1 pairs the 4v5 loser (T5) with the 8v9 loser (T9), while the
    // 2v7 loser (T7) walks over a BYE in LB R2 M4 into LB R3 M2.
    const lbR2M1 = matchBy(2, 2, 1);
    const lbR2M4 = matchBy(2, 2, 4);
    const lbR3M2Before = matchBy(2, 3, 2);
    expect(lbR2M1).toMatchObject({ opponent1_id: t5, opponent2_id: t9, status: 2 });
    expect(lbR2M4).toMatchObject({
      opponent1_id: t7,
      opponent1_result: 'win',
      opponent2_result: 'bye',
    });
    expect(lbR3M2Before).toMatchObject({ opponent1_id: t6, opponent2_id: t7, status: 2 });
    const t5Position = lbR2M1.opponent1_position;
    const t7Position = lbR2M4.opponent1_position;
    expect(t5Position).not.toBeNull();
    expect(t7Position).not.toBeNull();
    expect(t5Position).not.toBe(t7Position);

    // The eligibility check offers T7's slot as a swap candidate for T5's match.
    const eligibility = await service.checkLoserSwapEligibility(lbR2M1.id);
    expect(eligibility.ok).toBe(true);
    expect(eligibility.candidates).toContainEqual(
      expect.objectContaining({ matchId: lbR2M4.id, side: 'opponent1', participantName: 'T7' })
    );

    // Record reality: the 2v7 loser played the 8v9 loser.
    const result = await service.adminSwapLoserBracketSlots({
      sourceMatchId: lbR2M1.id,
      sourceSide: 'opponent1',
      targetMatchId: lbR2M4.id,
      targetSide: 'opponent1',
    });

    // LB R2 M1 is now T7 vs T9, Ready, with T7's feeder marker along for the ride.
    expect(matchBy(2, 2, 1)).toMatchObject({
      opponent1_id: t7,
      opponent1_position: t7Position,
      opponent1_score: null,
      opponent1_result: null,
      opponent2_id: t9,
      opponent2_result: null,
      status: 2,
    });
    // LB R2 M4 is now T5 vs BYE: completed walkover, sentinel intact.
    expect(matchBy(2, 2, 4)).toMatchObject({
      opponent1_id: t5,
      opponent1_position: t5Position,
      opponent1_result: 'win',
      opponent1_score: 0,
      opponent2_result: 'bye',
      status: 4,
    });
    // T7's automatic advancement was undone and T5 advanced in its place.
    expect(matchBy(2, 3, 2)).toMatchObject({
      opponent1_id: t6,
      opponent2_id: t5,
      status: 2,
    });
    expect(result).toMatchObject({
      walkoverCompletedMatchIds: [lbR2M4.id],
      downstreamClearedMatchIds: [lbR3M2Before.id],
    });
    expect(result.message).toContain('Swapped T5 and T7.');

    // The swapped match scores normally through the library and the winner
    // propagates into LB R3 M1 — the bracket keeps working end to end.
    await service.updateMatch({
      matchId: lbR2M1.id,
      scores: {
        opponent1: { score: 0, result: 'loss' },
        opponent2: { score: 2, result: 'win' },
      },
    });
    const lbR3M1 = matchBy(2, 3, 1);
    expect([lbR3M1.opponent1_id, lbR3M1.opponent2_id]).toContain(t9);
    expect(lbR3M1.status).toBe(2);
  });

  it('refuses the swap once the walkover winner’s next match has started or finished', async () => {
    const service = new BracketManagerService();
    await buildScenario(service);

    const lbR2M1 = matchBy(2, 2, 1);
    const lbR2M4 = matchBy(2, 2, 4);
    const lbR3M2 = matchBy(2, 3, 2);

    // LB R3 M2 (T6 vs T7) is in progress: pulling T7 back out of it would
    // orphan live scores. Simulate the in-progress state directly.
    const liveRow = db()
      .tableRows('match')
      .find((row) => row.id === lbR3M2.id);
    Object.assign(liveRow ?? {}, { status: 3, opponent1_score: 1, opponent2_score: 1 });

    const before = matchRows();
    await expect(
      service.adminSwapLoserBracketSlots({
        sourceMatchId: lbR2M1.id,
        sourceSide: 'opponent1',
        targetMatchId: lbR2M4.id,
        targetSide: 'opponent1',
      })
    ).rejects.toThrow(/already advanced to a match that is currently being played/);

    // Validation happens before any write: nothing moved.
    expect(matchRows()).toEqual(before);

    // Once LB R3 M2 is fully played, the library archives the walkover match
    // itself, and the swap refuses on that even earlier.
    Object.assign(liveRow ?? {}, { status: 3 });
    await service.updateMatch({
      matchId: lbR3M2.id,
      scores: {
        opponent1: { score: 2, result: 'win' },
        opponent2: { score: 0, result: 'loss' },
      },
    });
    await expect(
      service.adminSwapLoserBracketSlots({
        sourceMatchId: lbR2M1.id,
        sourceSide: 'opponent1',
        targetMatchId: lbR2M4.id,
        targetSide: 'opponent1',
      })
    ).rejects.toThrow(/is archived/);
  });
});
