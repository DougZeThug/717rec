import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

// We track filter calls via these spies, injected into a thenable chain object
const mockGte = vi.fn();
const mockLt = vi.fn();
const mockEq = vi.fn();
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
import { fetchMatchesWithTeams } from '../MatchReadService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeMatch = (overrides = {}) => ({
  id: 'match-1',
  date: '2025-06-15T10:00:00',
  location: 'Court A',
  iscompleted: false,
  team1_score: 0,
  team2_score: 0,
  team1: { id: 'team-a', name: 'Team A', logo_url: null, image_url: null },
  team2: { id: 'team-b', name: 'Team B', logo_url: null, image_url: null },
  ...overrides,
});

/**
 * Creates a "thenable chain" — an object that can be both:
 * - Awaited like a Promise (returns { data, error })
 * - Chained with .select(), .order(), .gte(), .lt(), .eq(), .range()
 *   (.gte/.lt/.eq record calls via spies)
 *
 * This mirrors the Supabase PostgREST query builder pattern.
 */
type QueryResult = { data: unknown; error: unknown | null };
type QueryChain = PromiseLike<QueryResult> & {
  select: (...args: unknown[]) => QueryChain;
  order: (...args: unknown[]) => QueryChain;
  gte: (...args: unknown[]) => QueryChain;
  lt: (...args: unknown[]) => QueryChain;
  eq: (...args: unknown[]) => QueryChain;
  range: (...args: unknown[]) => PromiseLike<QueryResult>;
  catch: Promise<QueryResult>['catch'];
};

const makeQueryChain = (result: QueryResult): QueryChain => {
  let rangeCall = 0;
  const chain: QueryChain = {
    select: () => chain,
    order: () => chain,
    gte: (...args: unknown[]) => {
      mockGte(...args);
      return chain;
    },
    lt: (...args: unknown[]) => {
      mockLt(...args);
      return chain;
    },
    eq: (...args: unknown[]) => {
      mockEq(...args);
      return chain;
    },
    // fetchMatchesWithTeams paginates via .range(): the first page returns the
    // result, later pages are empty, so the loop always terminates — even if a
    // fixture ever returns a full page (guards against an accidental infinite loop).
    range: () => {
      rangeCall += 1;
      return Promise.resolve(rangeCall === 1 ? result : { data: [], error: null });
    },
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected) => Promise.resolve(result).catch(onRejected),
  };
  return chain;
};

const setupSuccess = (rows: ReturnType<typeof makeMatch>[]) => {
  mockFrom.mockReturnValue(makeQueryChain({ data: rows, error: null }));
};

const setupError = (message = 'query failed') => {
  mockFrom.mockReturnValue(
    makeQueryChain({
      data: null,
      error: { message, code: '42P01', details: null, hint: null, name: 'PostgrestError' },
    })
  );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('fetchMatchesWithTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns matches array on success', async () => {
    setupSuccess([makeMatch(), makeMatch({ id: 'match-2' })]);
    const matches = await fetchMatchesWithTeams();
    expect(matches).toHaveLength(2);
    expect(matches[0].id).toBe('match-1');
  });

  it('returns empty array when no matches exist', async () => {
    setupSuccess([]);
    const matches = await fetchMatchesWithTeams();
    expect(matches).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeQueryChain({ data: null, error: null }));
    const matches = await fetchMatchesWithTeams();
    expect(matches).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    setupError('relation "matches" does not exist');
    await expect(fetchMatchesWithTeams()).rejects.toThrow(DatabaseError);
  });

  it('queries the matches table', async () => {
    setupSuccess([]);
    await fetchMatchesWithTeams();
    expect(mockFrom).toHaveBeenCalledWith('matches');
  });

  it('applies date filter when date is provided', async () => {
    setupSuccess([]);
    const date = new Date('2025-06-15');
    await fetchMatchesWithTeams({ date });

    expect(mockGte).toHaveBeenCalledWith('date', '2025-06-15T00:00:00');
    expect(mockLt).toHaveBeenCalledWith('date', '2025-06-15T23:59:59');
  });

  it('applies bracketId filter when provided', async () => {
    setupSuccess([]);
    await fetchMatchesWithTeams({ bracketId: 'bracket-xyz' });
    expect(mockEq).toHaveBeenCalledWith('bracket_id', 'bracket-xyz');
  });

  it('does not apply date filter when date is not provided', async () => {
    setupSuccess([]);
    await fetchMatchesWithTeams();
    expect(mockGte).not.toHaveBeenCalled();
  });

  it('does not apply bracketId filter when bracketId is not provided', async () => {
    setupSuccess([]);
    await fetchMatchesWithTeams();
    expect(mockEq).not.toHaveBeenCalled();
  });

  it('works without any filters (undefined filters arg)', async () => {
    setupSuccess([makeMatch()]);
    const matches = await fetchMatchesWithTeams();
    expect(matches).toHaveLength(1);
  });
});
