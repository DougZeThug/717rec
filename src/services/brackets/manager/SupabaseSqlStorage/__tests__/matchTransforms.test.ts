import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
}));

import { mergeOpponentSlots, transformMatchFromDb, transformMatchToDb } from '../matchTransforms';
import type { DbMatch, ParticipantCacheEntry } from '../types';

describe('mergeOpponentSlots', () => {
  it('drops null opponent1_id when previous slot was filled', () => {
    const prev: DbMatch = { id: 1, opponent1_id: 99, opponent2_id: 42 };
    const patch: DbMatch = {
      id: 1,
      opponent1_id: null,
      opponent1_score: null,
      opponent1_result: null,
      status: 2,
    };

    const merged = mergeOpponentSlots(prev, patch);

    expect(merged).not.toHaveProperty('opponent1_id');
    // Non-opponent fields always pass through
    expect(merged.status).toBe(2);
    // Score/result keys (non opponentN_id) still pass through unchanged
    expect(merged.opponent1_score).toBeNull();
    expect(merged.opponent1_result).toBeNull();
  });

  it('drops null opponent2_id when previous slot was filled', () => {
    const prev: DbMatch = { id: 2, opponent1_id: 1, opponent2_id: 7 };
    const patch: DbMatch = { id: 2, opponent2_id: null };

    const merged = mergeOpponentSlots(prev, patch);

    expect(merged).not.toHaveProperty('opponent2_id');
  });

  it('allows null opponent slot when previous slot was already null/missing', () => {
    const prev: DbMatch = { id: 3, opponent1_id: null, opponent2_id: null };
    const patch: DbMatch = { id: 3, opponent1_id: null, opponent2_id: null };

    const merged = mergeOpponentSlots(prev, patch);

    expect(merged).toMatchObject({ opponent1_id: null, opponent2_id: null });
  });

  it('preserves non-null opponent ids in the patch', () => {
    const prev: DbMatch = { id: 4, opponent1_id: 10, opponent2_id: 20 };
    const patch: DbMatch = { id: 4, opponent1_id: 11, opponent2_id: 21 };

    const merged = mergeOpponentSlots(prev, patch);

    expect(merged).toMatchObject({ opponent1_id: 11, opponent2_id: 21 });
  });

  it('treats a null prev (no row found) as no protection — null patch passes through', () => {
    const patch: DbMatch = { id: 5, opponent1_id: null, opponent2_id: null };

    const merged = mergeOpponentSlots(null, patch);

    expect(merged).toMatchObject({ opponent1_id: null, opponent2_id: null });
  });
});

describe('transformMatchToDb', () => {
  it('flattens nested opponent objects into columns and removes the nested keys', () => {
    const result = transformMatchToDb({
      id: 1,
      number: 1,
      opponent1: { id: 10, score: 2, result: 'win' },
      opponent2: { id: 20, score: 1, result: 'loss' },
    });

    expect(result).toEqual({
      id: 1,
      number: 1,
      opponent1_id: 10,
      opponent1_score: 2,
      opponent1_result: 'win',
      opponent2_id: 20,
      opponent2_score: 1,
      opponent2_result: 'loss',
    });
    expect(result).not.toHaveProperty('opponent1');
    expect(result).not.toHaveProperty('opponent2');
  });

  it('nulls all slot columns when opponent is explicitly null (BYE case)', () => {
    const result = transformMatchToDb({
      id: 2,
      opponent1: null,
      opponent2: null,
    });

    expect(result).toMatchObject({
      opponent1_id: null,
      opponent1_score: null,
      opponent1_result: null,
      opponent2_id: null,
      opponent2_score: null,
      opponent2_result: null,
    });
  });

  it('leaves existing data untouched when opponent keys are absent', () => {
    const result = transformMatchToDb({ id: 3, status: 4 });
    expect(result).toEqual({ id: 3, status: 4 });
  });
});

describe('transformMatchFromDb', () => {
  const cache = new Map<number, ParticipantCacheEntry>([
    [10, { position: 3, name: 'Alpha' }],
    [20, { position: 8, name: 'Beta' }],
  ]);

  it('re-inflates opponent columns into nested objects with cached position', () => {
    const result = transformMatchFromDb(
      {
        id: 1,
        opponent1_id: 10,
        opponent1_score: 2,
        opponent1_result: 'win',
        opponent2_id: 20,
        opponent2_score: 1,
        opponent2_result: 'loss',
      },
      cache
    );

    expect(result.opponent1).toEqual({ id: 10, position: 3, score: 2, result: 'win' });
    expect(result.opponent2).toEqual({ id: 20, position: 8, score: 1, result: 'loss' });
    expect(result).not.toHaveProperty('opponent1_id');
    expect(result).not.toHaveProperty('opponent2_id');
  });

  it('returns position undefined when participant is not in cache or id is null', () => {
    const result = transformMatchFromDb(
      {
        id: 2,
        opponent1_id: 999, // not cached
        opponent2_id: null,
      },
      cache
    );

    expect(result.opponent1).toMatchObject({ id: 999, position: undefined });
    expect(result.opponent2).toMatchObject({ id: null, position: undefined });
  });
});
