import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseSqlStorage } from '../../../SupabaseSqlStorage';
import { collectDownstreamChain } from '../queries';

/**
 * Ordering contract of the downstream chain.
 *
 * Round numbers restart in every group — losers-bracket rounds begin at 1 and the
 * grand final's are 1-2 — so a raw round-number comparison across the stage drops
 * LB round 1 and both grand-final matches out of the chain. Everything that asks
 * "what would changing this result disturb?" depends on them being in it.
 */
describe('collectDownstreamChain', () => {
  const WINNER = 10;
  const LOSER = 20;

  // Winners-bracket round 1.
  const SOURCE = {
    id: 1,
    stage_id: 1,
    group_id: 1,
    round_id: 1,
    number: 1,
    status: 5,
    opponent1: { id: WINNER, score: 2, result: 'win' as const },
    opponent2: { id: LOSER, score: 0, result: 'loss' as const },
  };

  const WB_ROUND_2 = {
    id: 2,
    stage_id: 1,
    group_id: 1,
    round_id: 2,
    number: 1,
    status: 4,
    opponent1: { id: WINNER },
    opponent2: { id: 30 },
  };

  /** The loser's landing spot. Group 2, but round NUMBER 1. */
  const LB_ROUND_1 = {
    id: 3,
    stage_id: 1,
    group_id: 2,
    round_id: 3,
    number: 1,
    status: 4,
    opponent1: { id: LOSER },
    opponent2: { id: 40 },
  };

  /** Grand final. Group 3, round NUMBER 1. */
  const GRAND_FINAL = {
    id: 4,
    stage_id: 1,
    group_id: 3,
    round_id: 5,
    number: 1,
    status: 2,
    opponent1: { id: WINNER },
    opponent2: { id: 50 },
  };

  const ROUNDS = [
    { id: 1, number: 1 }, // WB R1
    { id: 2, number: 2 }, // WB R2
    { id: 3, number: 1 }, // LB R1
    { id: 5, number: 1 }, // GF R1
  ];

  const GROUPS = [
    { id: 1, number: 1 },
    { id: 2, number: 2 },
    { id: 3, number: 3 },
  ];

  let storage: { select: ReturnType<typeof vi.fn> };

  const wire = (stageMatches: Record<string, unknown>[], groups: unknown = GROUPS) => {
    storage.select.mockImplementation((table: string, filter: unknown) => {
      if (table === 'match' && typeof filter === 'number') return Promise.resolve(SOURCE);
      if (table === 'round' && typeof filter === 'number') {
        return Promise.resolve(ROUNDS.find((r) => r.id === filter) ?? null);
      }
      if (table === 'round') return Promise.resolve(ROUNDS);
      if (table === 'group') return Promise.resolve(groups);
      if (table === 'match') return Promise.resolve(stageMatches);
      return Promise.resolve(null);
    });
  };

  const chain = (options: { includeLoser?: boolean } = {}) =>
    collectDownstreamChain({ storage: storage as unknown as SupabaseSqlStorage }, 1, options);

  beforeEach(() => {
    storage = { select: vi.fn() };
  });

  it("includes the loser's LOSERS ROUND 1 match despite its lower round number", async () => {
    wire([SOURCE, WB_ROUND_2, LB_ROUND_1]);

    const result = await chain({ includeLoser: true });

    expect(result.map((m) => m.id).sort()).toEqual([2, 3]);
  });

  it('includes grand-final matches, whose round numbers restart at 1', async () => {
    wire([SOURCE, WB_ROUND_2, GRAND_FINAL]);

    const result = await chain();

    expect(result.map((m) => m.id).sort()).toEqual([2, 4]);
  });

  it('orders the chain by group, then round', async () => {
    wire([SOURCE, GRAND_FINAL, LB_ROUND_1, WB_ROUND_2]);

    const result = await chain({ includeLoser: true });

    // WB (group 1) → LB (group 2) → GF (group 3), regardless of round numbers.
    expect(result.map((m) => m.id)).toEqual([2, 3, 4]);
  });

  it('still excludes earlier rounds within the same group', async () => {
    const wbRoundZero = { ...WB_ROUND_2, id: 9, round_id: 1 };
    wire([SOURCE, wbRoundZero, WB_ROUND_2]);

    const result = await chain();

    expect(result.map((m) => m.id)).toEqual([2]);
  });

  it('falls back to round numbers alone when group data is unavailable', async () => {
    // A stage that cannot report its groups must behave exactly as before rather
    // than silently widening or narrowing the chain.
    wire([SOURCE, WB_ROUND_2, LB_ROUND_1], null);

    const result = await chain({ includeLoser: true });

    expect(result.map((m) => m.id)).toEqual([2]);
  });

  it('returns nothing when the source match has no decisive winner', async () => {
    storage.select.mockImplementation((table: string, filter: unknown) => {
      if (table === 'match' && typeof filter === 'number') {
        return Promise.resolve({ ...SOURCE, opponent1: { id: WINNER }, opponent2: { id: LOSER } });
      }
      if (table === 'round' && typeof filter === 'number') {
        return Promise.resolve(ROUNDS.find((r) => r.id === filter) ?? null);
      }
      if (table === 'round') return Promise.resolve(ROUNDS);
      if (table === 'group') return Promise.resolve(GROUPS);
      if (table === 'match') return Promise.resolve([SOURCE, WB_ROUND_2]);
      return Promise.resolve(null);
    });

    expect(await chain()).toEqual([]);
  });
});
