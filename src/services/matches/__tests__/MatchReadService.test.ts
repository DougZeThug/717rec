import { describe, expect, it, vi, beforeEach } from 'vitest';
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
 * - Chained with .gte(), .lt(), .eq() (which record calls via spies)
 *
 * This mirrors the Supabase PostgREST query builder pattern.
 */
const makeQueryChain = (result: { data: unknown; error: unknown | null }) => {
  const chain: Record<string, unknown> & PromiseLike<unknown> = {
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
    then: ((onFulfilled?: any, onRejected?: any) =>
      Promise.resolve(result).then(onFulfilled, onRejected)) as PromiseLike<unknown>['then'],
    catch: (onRejected?: any) =>
      Promise.resolve(result).catch(onRejected),
  };
  return chain;
};

const setupSuccess = (rows: ReturnType<typeof makeMatch>[]) => {
  const chain = makeQueryChain({ data: rows, error: null });
  mockFrom.mockReturnValue({
    select: () => ({ order: () => chain }),
  });
};

const setupError = (message = 'query failed') => {
  const chain = makeQueryChain({
    data: null,
    error: { message, code: '42P01', details: null, hint: null, name: 'PostgrestError' },
  });
  mockFrom.mockReturnValue({
    select: () => ({ order: () => chain }),
  });
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
    const chain = makeQueryChain({ data: null, error: null });
    mockFrom.mockReturnValue({ select: () => ({ order: () => chain }) });
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
    const matches = await fetchMatchesWithTeams(undefined);
    expect(matches).toHaveLength(1);
  });
});
