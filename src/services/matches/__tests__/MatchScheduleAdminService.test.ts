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

  /** The active-season lookup every schedule fetch starts with. */
  const seasonChain = (
    data: { id: string } | null = { id: 'season-1' },
    error: unknown = null
  ) => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data, error }) }) }),
  });

  /**
   * The matches query: select → eq → order → order → range, where range resolves
   * to the page. Each page after the first is empty, so the pagination loop
   * always terminates even if the assertions are wrong.
   */
  const scheduleQueryChain = (
    result: { data: unknown; error: unknown },
    rangeCalls: Array<[number, number]> = []
  ) => {
    const chain: Record<string, (...args: unknown[]) => unknown> = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      range: (...args: unknown[]) => {
        const [from, to] = args as [number, number];
        rangeCalls.push([from, to]);
        return Promise.resolve(rangeCalls.length === 1 ? result : { data: [], error: null });
      },
    };
    return chain;
  };

  const onSeason = (matches: ReturnType<typeof scheduleQueryChain>) =>
    mockFrom.mockImplementation((table: string) => (table === 'seasons' ? seasonChain() : matches));

  it('returns schedule matches on success', async () => {
    onSeason(scheduleQueryChain({ data: [makeMatch()], error: null }));

    const result = await fetchScheduleMatches();

    expect(result).toHaveLength(1);
  });

  it('returns empty array when no active season', async () => {
    mockFrom.mockReturnValue(seasonChain(null));

    expect(await fetchScheduleMatches()).toEqual([]);
  });

  it('throws DatabaseError when matches query fails', async () => {
    onSeason(scheduleQueryChain({ data: null, error: pgError() }));

    await expect(fetchScheduleMatches()).rejects.toThrow(DatabaseError);
  });

  // A season read that fails is not the same as a season that is not there, and
  // only one of the two is an empty state. Neither branch was exercised: the
  // no-active-season test returns a null row with no error, which lands on the
  // guard below them both.
  it('treats "no rows" from the season read as no active season', async () => {
    mockFrom.mockReturnValue(seasonChain(null, { ...pgError(), code: 'PGRST116' }));

    expect(await fetchScheduleMatches()).toEqual([]);
  });

  it('throws DatabaseError when the season read fails for any other reason', async () => {
    mockFrom.mockReturnValue(seasonChain(null, pgError()));

    await expect(fetchScheduleMatches()).rejects.toThrow(DatabaseError);
  });

  // The defect: the query had no .range() at all, so PostgREST returned the
  // first 1,000 rows with an HTTP 200 and the rest of the season vanished with
  // nothing to show the reader that it had.
  it('paginates past the 1,000-row cap until a short page is returned', async () => {
    const rangeCalls: Array<[number, number]> = [];
    const fullPage = Array.from({ length: 1000 }, (_, i) => makeMatch(`m-${i}`));
    onSeason(scheduleQueryChain({ data: fullPage, error: null }, rangeCalls));
    // The second page is the chain's own empty follow-up, which ends the loop.

    const result = await fetchScheduleMatches();

    expect(result).toHaveLength(1000);
    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  // date is not a total order — many matches share one — and range pagination
  // needs a unique sort or it can skip or repeat rows between pages.
  it('orders by date and then id, so the pages are stable', async () => {
    const orderCalls: unknown[][] = [];
    const chain: Record<string, (...args: unknown[]) => unknown> = {
      select: () => chain,
      eq: () => chain,
      order: (...args: unknown[]) => {
        orderCalls.push(args);
        return chain;
      },
      range: () => Promise.resolve({ data: [], error: null }),
    };
    mockFrom.mockImplementation((table: string) => (table === 'seasons' ? seasonChain() : chain));

    await fetchScheduleMatches();

    expect(orderCalls).toEqual([
      ['date', { ascending: true }],
      ['id', { ascending: true }],
    ]);
  });
});
