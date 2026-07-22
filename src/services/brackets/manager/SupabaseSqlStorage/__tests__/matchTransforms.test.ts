import { describe, expect, it } from 'vitest';

import { BYE_RESULT_SENTINEL, transformMatchFromDb, transformMatchToDb } from '../matchTransforms';

describe('transformMatchToDb', () => {
  it('flattens nested opponent objects into columns and removes the nested keys', () => {
    const result = transformMatchToDb({
      id: 1,
      number: 1,
      opponent1: { id: 10, position: 1, score: 2, result: 'win' },
      opponent2: { id: 20, score: 1, result: 'loss' },
    });

    expect(result).toEqual({
      id: 1,
      number: 1,
      opponent1_id: 10,
      opponent1_score: 2,
      opponent1_result: 'win',
      opponent1_position: 1,
      opponent2_id: 20,
      opponent2_score: 1,
      opponent2_result: 'loss',
      opponent2_position: null,
    });
    expect(result).not.toHaveProperty('opponent1');
    expect(result).not.toHaveProperty('opponent2');
  });

  it('stores the BYE sentinel in the result column for strictly-null opponents', () => {
    // brackets-manager distinguishes `null` (BYE) from `{ id: null }` (TBD);
    // the id column alone cannot. The sentinel keeps the round-trip faithful.
    const result = transformMatchToDb({
      id: 2,
      opponent1: null,
      opponent2: null,
    });

    expect(result).toMatchObject({
      opponent1_id: null,
      opponent1_score: null,
      opponent1_result: BYE_RESULT_SENTINEL,
      opponent2_id: null,
      opponent2_score: null,
      opponent2_result: BYE_RESULT_SENTINEL,
    });
  });

  it('stores plain null columns for TBD slots ({ id: null })', () => {
    const result = transformMatchToDb({
      id: 3,
      opponent1: { id: null },
      opponent2: { id: null, position: 1 },
    });

    expect(result).toMatchObject({
      opponent1_id: null,
      opponent1_result: null,
      opponent1_position: null,
      opponent2_id: null,
      opponent2_result: null,
      opponent2_position: 1,
    });
  });

  it('leaves existing data untouched when opponent keys are absent', () => {
    const result = transformMatchToDb({ id: 3, status: 4 });
    expect(result).toEqual({ id: 3, status: 4 });
  });
});

describe('transformMatchFromDb', () => {
  it('re-inflates opponent columns into nested objects with their stored positions', () => {
    const result = transformMatchFromDb({
      id: 1,
      opponent1_id: 10,
      opponent1_score: 2,
      opponent1_result: 'win',
      opponent1_position: 1,
      opponent2_id: 20,
      opponent2_score: 1,
      opponent2_result: 'loss',
      opponent2_position: 2,
    });

    expect(result.opponent1).toEqual({ id: 10, position: 1, score: 2, result: 'win' });
    expect(result.opponent2).toEqual({ id: 20, position: 2, score: 1, result: 'loss' });
    expect(result).not.toHaveProperty('opponent1_id');
    expect(result).not.toHaveProperty('opponent2_id');
    expect(result).not.toHaveProperty('opponent1_position');
    expect(result).not.toHaveProperty('opponent2_position');
  });

  it('OMITS score/result/position keys when their columns are NULL (unplayed ≠ started)', () => {
    // brackets-manager reads `score !== undefined` as "match started" and
    // `position` as the structural feeder marker; inflating NULL columns as
    // null values corrupted both semantics.
    const result = transformMatchFromDb({
      id: 2,
      opponent1_id: 10,
      opponent1_score: null,
      opponent1_result: null,
      opponent1_position: null,
      opponent2_id: 20,
      opponent2_score: null,
      opponent2_result: null,
      opponent2_position: null,
    });

    expect(result.opponent1).toEqual({ id: 10 });
    expect(result.opponent2).toEqual({ id: 20 });
    expect(result.opponent1).not.toHaveProperty('score');
    expect(result.opponent1).not.toHaveProperty('result');
    expect(result.opponent1).not.toHaveProperty('position');
  });

  it('inflates the BYE sentinel back to a strictly-null slot', () => {
    const result = transformMatchFromDb({
      id: 3,
      opponent1_id: 10,
      opponent1_score: null,
      opponent1_result: 'win',
      opponent1_position: null,
      opponent2_id: null,
      opponent2_score: null,
      opponent2_result: BYE_RESULT_SENTINEL,
      opponent2_position: null,
    });

    expect(result.opponent1).toEqual({ id: 10, result: 'win' });
    expect(result.opponent2).toBeNull();
  });

  it('inflates legacy NULL columns (no sentinel) as a TBD slot, not a BYE', () => {
    const result = transformMatchFromDb({
      id: 4,
      opponent1_id: 999,
      opponent2_id: null,
      opponent2_score: null,
      opponent2_result: null,
    });

    expect(result.opponent1).toEqual({ id: 999 });
    expect(result.opponent2).toEqual({ id: null });
  });
});
