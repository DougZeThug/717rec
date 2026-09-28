import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseSqlStorage } from '../../../SupabaseSqlStorage';

/** Every update the code under test issues. The guard must issue none. */
const updateCalls: { table: string; fields: Record<string, unknown>; id: number }[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      update: (fields: Record<string, unknown>) => ({
        eq: (_column: string, id: number) => {
          updateCalls.push({ table, fields, id });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(actual).map((key) => [key, vi.fn()]));
});

vi.mock('../../BracketUpdate/completion', () => ({
  markBracketCompleteIfDone: vi.fn(() => Promise.resolve()),
}));

import { adminSwapLoserBracketSlots } from '../swap';

/**
 * The losers bracket of an 8-team double elimination. Round 2 is a minor round:
 * opponent1 is the winners-bracket drop-in (marked 2 and 1), opponent2 the
 * carry from round 1. Both round 1 matches are walkovers whose winners (T51,
 * T52) sit in round 2's carry slots.
 */
const STAGE = {
  id: 1,
  tournament_id: 'bracket-8',
  name: 'S',
  type: 'double_elimination',
  number: 1,
  settings: { size: 8, seedOrdering: ['inner_outer'], grandFinal: 'simple' },
};

const GROUPS = [
  { id: 1, stage_id: 1, number: 1 },
  { id: 2, stage_id: 1, number: 2 },
  { id: 3, stage_id: 1, number: 3 },
];

const ROUNDS = [1, 2, 3, 4].map((number) => ({
  id: 20 + number,
  stage_id: 1,
  group_id: 2,
  number,
}));

const PARTICIPANTS = [51, 52, 61, 62].map((id) => ({
  id,
  tournament_id: 'bracket-8',
  name: `T${id}`,
}));

const lbMatch = (
  id: number,
  roundNumber: number,
  number: number,
  status: number,
  opponent1: unknown,
  opponent2: unknown
) => ({
  id,
  stage_id: 1,
  group_id: 2,
  round_id: 20 + roundNumber,
  number,
  status,
  opponent1,
  opponent2,
});

const MATCHES = [
  lbMatch(1001, 1, 1, 0, { id: 51, position: 1, result: 'win' }, null),
  lbMatch(1002, 1, 2, 0, { id: 52, position: 3, result: 'win' }, null),
  lbMatch(2001, 2, 1, 2, { id: 61, position: 2 }, { id: 51 }),
  lbMatch(2002, 2, 2, 2, { id: 62, position: 1 }, { id: 52 }),
  lbMatch(3001, 3, 1, 0, { id: null }, { id: null }),
  lbMatch(4001, 4, 1, 0, { id: null, position: 1 }, { id: null }),
];

const hasKey = (filter: unknown, key: string): filter is Record<string, unknown> =>
  typeof filter === 'object' && filter !== null && key in filter;

let storage: { select: ReturnType<typeof vi.fn> };

beforeEach(() => {
  updateCalls.length = 0;
  storage = {
    select: vi.fn((table: string, filter: unknown) => {
      if (table === 'match' && typeof filter === 'number') {
        return Promise.resolve(MATCHES.find((m) => m.id === filter) ?? null);
      }
      if (table === 'match' && hasKey(filter, 'round_id')) {
        return Promise.resolve(MATCHES.filter((m) => m.round_id === filter.round_id));
      }
      if (table === 'match' && hasKey(filter, 'stage_id')) return Promise.resolve(MATCHES);
      if (table === 'round' && typeof filter === 'number') {
        return Promise.resolve(ROUNDS.find((r) => r.id === filter) ?? null);
      }
      if (table === 'round' && hasKey(filter, 'group_id')) {
        return Promise.resolve(ROUNDS.filter((r) => r.group_id === filter.group_id));
      }
      if (table === 'group' && typeof filter === 'number') {
        return Promise.resolve(GROUPS.find((g) => g.id === filter) ?? null);
      }
      if (table === 'group' && hasKey(filter, 'stage_id')) return Promise.resolve(GROUPS);
      if (table === 'stage') return Promise.resolve(STAGE);
      if (table === 'participant') return Promise.resolve(PARTICIPANTS);
      return Promise.resolve(null);
    }),
  };
});

const swap = (
  sourceMatchId: number,
  sourceSide: 'opponent1' | 'opponent2',
  targetMatchId: number,
  targetSide: 'opponent1' | 'opponent2'
) =>
  adminSwapLoserBracketSlots(
    { storage: storage as unknown as SupabaseSqlStorage },
    { sourceMatchId, sourceSide, targetMatchId, targetSide }
  );

describe('adminSwapLoserBracketSlots — one spot per team', () => {
  // T51 fills 2001's carry slot by walkover, so Rearrange counts it in 1001.
  // Moved into 2002's drop-in slot, which does not fill itself, it would count
  // twice, and Rearrange could never save again.
  it('refuses a carry team moved into a drop-in slot while its feeder still holds it', async () => {
    await expect(swap(2001, 'opponent2', 2002, 'opponent1')).rejects.toThrow(
      'This swap would put T51 in two losers-bracket spots at once'
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('allows a drop-in for drop-in swap', async () => {
    await swap(2001, 'opponent1', 2002, 'opponent1');

    expect(updateCalls.map((call) => call.id)).toEqual([2001, 2002]);
    expect(updateCalls[0].fields).toMatchObject({ opponent1_id: 62 });
    expect(updateCalls[1].fields).toMatchObject({ opponent1_id: 61 });
  });

  it('refuses the same move picked from the other end', async () => {
    await expect(swap(2002, 'opponent1', 2001, 'opponent2')).rejects.toThrow(
      'This swap would put T51 in two losers-bracket spots at once'
    );
    expect(updateCalls).toHaveLength(0);
  });
});
