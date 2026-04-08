import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  matchLog: vi.fn(),
  teamLog: vi.fn(),
  authLog: vi.fn(),
  warnLog: vi.fn(),
  scoreLog: vi.fn(),
  dbLog: vi.fn(),
}));

// Import after mocks
import { fetchTeamPowerScores } from '../RankingCurrentService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a thenable chain — awaitable AND chainable — to mirror the
 * Supabase PostgREST query builder when no `.single()` terminator exists.
 */
const makeQueryChain = (result: { data: unknown; error: unknown | null }) => {
  const chain: Record<string, unknown> & PromiseLike<unknown> = {
    then: ((
      onFulfilled?: ((value: unknown) => unknown) | null,
      onRejected?: ((reason: unknown) => unknown) | null,
    ) =>
      Promise.resolve(result).then(onFulfilled, onRejected)) as PromiseLike<unknown>['then'],
    catch: (onRejected?: ((reason: unknown) => unknown) | null) =>
      Promise.resolve(result).catch(onRejected),
  };
  return chain;
};

const setupResult = (result: { data: unknown; error: unknown | null }) => {
  mockFrom.mockReturnValue({
    select: () => makeQueryChain(result),
  });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('fetchTeamPowerScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns powerScores and teamNames maps on success', async () => {
    setupResult({
      data: [
        { team_id: 't1', name: 'Alpha', power_score: 85 },
        { team_id: 't2', name: 'Beta', power_score: 72 },
      ],
      error: null,
    });

    const result = await fetchTeamPowerScores();

    expect(result).toEqual({
      powerScores: { t1: 85, t2: 72 },
      teamNames: { t1: 'Alpha', t2: 'Beta' },
    });
  });

  it('returns empty maps when data is an empty array', async () => {
    setupResult({ data: [], error: null });

    const result = await fetchTeamPowerScores();

    expect(result).toEqual({ powerScores: {}, teamNames: {} });
  });

  it('returns empty maps when data is null', async () => {
    setupResult({ data: null, error: null });

    const result = await fetchTeamPowerScores();

    expect(result).toEqual({ powerScores: {}, teamNames: {} });
  });

  it('throws DatabaseError on Supabase error', async () => {
    setupResult({
      data: null,
      error: {
        message: 'relation "v_team_details" does not exist',
        code: '42P01',
        details: null,
        hint: null,
        name: 'PostgrestError',
      },
    });

    await expect(fetchTeamPowerScores()).rejects.toThrow(DatabaseError);
  });

  it('queries the v_team_details view', async () => {
    setupResult({ data: [], error: null });

    await fetchTeamPowerScores();

    expect(mockFrom).toHaveBeenCalledWith('v_team_details');
  });
});
