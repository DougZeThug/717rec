import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateMatchRowOrThrow } from '../writes';

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  updateResult: { data: [] as { id: number }[] | null, error: null as { message: string } | null },
  readResult: {
    data: null as { status: number } | null,
    error: null as { message: string } | null,
  },
}));

vi.mock('@/integrations/supabase/client', () => {
  // update(...).eq(...)[.eq(...)].select('id') resolves to the update result;
  // select('status').eq(...).maybeSingle() resolves to the read result.
  const updateChain = {
    eq: (...args: unknown[]) => {
      mocks.eq(...args);
      return updateChain;
    },
    select: (...args: unknown[]) => {
      mocks.select(...args);
      return Promise.resolve(mocks.updateResult);
    },
  };
  const readChain = {
    eq: () => readChain,
    maybeSingle: () => {
      mocks.maybeSingle();
      return Promise.resolve(mocks.readResult);
    },
  };
  return {
    supabase: {
      from: () => ({
        update: () => updateChain,
        select: () => readChain,
      }),
    },
  };
});

const NOT_SAVED = 'not saved';
const STALE = 'stale';
const guard = { expectedStatus: 2, staleMessage: STALE };

describe('updateMatchRowOrThrow', () => {
  beforeEach(() => {
    mocks.updateResult = { data: [{ id: 7 }], error: null };
    mocks.readResult = { data: { status: 2 }, error: null };
  });

  it('filters by id only when there is no guard', async () => {
    await updateMatchRowOrThrow(7, { status: 1 }, NOT_SAVED);

    expect(mocks.eq).toHaveBeenCalledTimes(1);
    expect(mocks.eq).toHaveBeenCalledWith('id', 7);
  });

  it('also filters by the expected status with a guard', async () => {
    await updateMatchRowOrThrow(7, { status: 1 }, NOT_SAVED, guard);

    expect(mocks.eq).toHaveBeenCalledWith('id', 7);
    expect(mocks.eq).toHaveBeenCalledWith('status', 2);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it('says the match changed when the guarded update reaches no row and the status moved', async () => {
    mocks.updateResult = { data: [], error: null };
    mocks.readResult = { data: { status: 4 }, error: null };

    await expect(updateMatchRowOrThrow(7, { status: 1 }, NOT_SAVED, guard)).rejects.toThrow(STALE);
  });

  it('keeps the not-saved message when the guarded update reaches no row and the status is unchanged', async () => {
    mocks.updateResult = { data: [], error: null };
    mocks.readResult = { data: { status: 2 }, error: null };

    await expect(updateMatchRowOrThrow(7, { status: 1 }, NOT_SAVED, guard)).rejects.toThrow(
      NOT_SAVED
    );
  });

  it('keeps the not-saved message when the row cannot be read back at all', async () => {
    mocks.updateResult = { data: [], error: null };
    mocks.readResult = { data: null, error: null };

    await expect(updateMatchRowOrThrow(7, { status: 1 }, NOT_SAVED, guard)).rejects.toThrow(
      NOT_SAVED
    );
  });

  it('keeps the not-saved message for an unguarded update that reaches no row', async () => {
    mocks.updateResult = { data: [], error: null };

    await expect(updateMatchRowOrThrow(7, { status: 1 }, NOT_SAVED)).rejects.toThrow(NOT_SAVED);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it('throws a database error when the update fails', async () => {
    mocks.updateResult = { data: null, error: { message: 'boom' } };

    await expect(updateMatchRowOrThrow(7, { status: 1 }, NOT_SAVED, guard)).rejects.toThrow(
      'Failed to update match 7'
    );
  });
});
