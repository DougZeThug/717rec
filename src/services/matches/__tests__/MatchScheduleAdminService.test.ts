import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  matchLog: vi.fn(),
}));

vi.mock('@/utils/timezone', () => ({
  createEveningAwareDateRange: (date: Date) => ({
    startDate: new Date(`${date.toISOString().split('T')[0]}T16:00:00Z`),
    endDate: new Date(`${date.toISOString().split('T')[0]}T23:59:59Z`),
  }),
}));

// Import after mocks
import { fetchMatchesForAdmin, fetchScheduleMatches } from '../MatchScheduleAdminService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeMatch = (id = 'match-1') => ({
  id,
  team1_id: 'team-1',
  team2_id: 'team-2',
  date: '2026-04-17T18:00:00Z',
});

// Chainable mock for fetchMatchesForAdmin's paginated query:
// select → order → order → [gte → lte] → [eq] → range, where range resolves to
// the page result. Test result sets are all smaller than the page size, so the
// pagination loop runs exactly once.
const adminQueryChain = (result: { data: unknown; error: unknown }) => {
  let rangeCall = 0;
  const chain: Record<string, (...args: unknown[]) => unknown> = {
    select: () => chain,
    order: () => chain,
    gte: () => chain,
    lte: () => chain,
    eq: () => chain,
    // First page returns the result, later pages are empty, so the pagination
    // loop always terminates (guards against an accidental infinite loop).
    range: () => {
      rangeCall += 1;
      return Promise.resolve(rangeCall === 1 ? result : { data: [], error: null });
    },
  };
  return chain;
};

// ─── fetchMatchesForAdmin ─────────────────────────────────────────────────────

describe('fetchMatchesForAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns matches with no date filter', async () => {
    mockFrom.mockReturnValue(adminQueryChain({ data: [makeMatch()], error: null }));
    const result = await fetchMatchesForAdmin({});
    expect(result).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('matches');
  });

  it('applies date range when date is provided', async () => {
    // With a date filter the chain gains .gte().lte() before .range()
    mockFrom.mockReturnValue(adminQueryChain({ data: [makeMatch()], error: null }));
    const result = await fetchMatchesForAdmin({ date: new Date('2026-04-17') });
    expect(result).toHaveLength(1);
  });

  it('applies bracket filter when bracketId is provided', async () => {
    // With a bracket filter the chain gains .eq() before .range()
    mockFrom.mockReturnValue(adminQueryChain({ data: [makeMatch()], error: null }));
    const result = await fetchMatchesForAdmin({ bracketId: 'bracket-1' });
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue(adminQueryChain({ data: null, error: null }));
    expect(await fetchMatchesForAdmin({})).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(adminQueryChain({ data: null, error: pgError() }));
    await expect(fetchMatchesForAdmin({})).rejects.toThrow(DatabaseError);
  });

  it('paginates past the 1,000-row cap until a short page is returned', async () => {
    // Proves the fix: a full 1,000-row page must trigger a follow-up fetch, and
    // rows from every page are accumulated (previously capped silently at 1,000).
    interface PagingChain {
      select: () => PagingChain;
      order: () => PagingChain;
      gte: () => PagingChain;
      lte: () => PagingChain;
      eq: () => PagingChain;
      range: (from: number, to: number) => Promise<{ data: unknown; error: unknown }>;
    }
    const rangeCalls: Array<[number, number]> = [];
    const fullPage = Array.from({ length: 1000 }, (_, i) => makeMatch(`m-${i}`));
    const shortPage = [makeMatch('m-last')];
    const chain: PagingChain = {
      select: () => chain,
      order: () => chain,
      gte: () => chain,
      lte: () => chain,
      eq: () => chain,
      range: (from, to) => {
        rangeCalls.push([from, to]);
        const data = rangeCalls.length === 1 ? fullPage : shortPage;
        return Promise.resolve({ data, error: null });
      },
    };
    mockFrom.mockReturnValue(chain);

    const result = await fetchMatchesForAdmin({});

    expect(result).toHaveLength(1001);
    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
});

// ─── fetchScheduleMatches ─────────────────────────────────────────────────────

describe('fetchScheduleMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns schedule matches on success', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'season-1' }, error: null }),
            }),
          }),
        };
      }
      // matches
      return {
        select: () => ({
          eq: () => ({ order: () => Promise.resolve({ data: [makeMatch()], error: null }) }),
        }),
      };
    });
    const result = await fetchScheduleMatches();
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no active season', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });
    expect(await fetchScheduleMatches()).toEqual([]);
  });

  it('throws DatabaseError when matches query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'season-1' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
        }),
      };
    });
    await expect(fetchScheduleMatches()).rejects.toThrow(DatabaseError);
  });
});
