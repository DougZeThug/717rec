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

// Import after mocks
import { fetchLeagueDivisionMatchups } from '../LeagueDivisionMatchupsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// Records the .order() column each range-paginated query requests, so tests can
// assert every paginated query has a stable sort before .range() (which range
// pagination needs or it may skip/duplicate rows across page boundaries).
const orderCalls: Array<{ table: string; column: string }> = [];

type Page = { data: unknown; error: unknown };

/**
 * Chain for a range-paginated table: .select().not()...().order().range().
 * `pages` is the list of results returned by successive .range() calls; a
 * single-element list yields one short page so the pagination loop runs once.
 */
const rangeTableChain = (table: string, pages: Page[]) => {
  let call = 0;
  const chain: Record<string, (...args: unknown[]) => unknown> = {
    select: () => chain,
    not: () => chain,
    order: (column: unknown) => {
      orderCalls.push({ table, column: String(column) });
      return chain;
    },
    range: () => {
      const page = pages[call] ?? { data: [], error: null };
      call += 1;
      return Promise.resolve(page);
    },
  };
  return chain;
};

// The brackets query is awaited directly off .select() (it is not paginated).
const bracketsChain = (rows: unknown[]) => ({
  select: () => Promise.resolve({ data: rows, error: null }),
});

const singlePage = (rows: unknown[]): Page[] => [{ data: rows, error: null }];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('fetchLeagueDivisionMatchups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderCalls.length = 0;
  });

  it('orders every paginated query by a stable key before ranging', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'brackets') return bracketsChain([]);
      return rangeTableChain(table, singlePage([]));
    });

    await fetchLeagueDivisionMatchups();

    // Each paginated query needs a stable, total ORDER BY. matches/archive/playoff
    // sort by their unique id; team_season_stats has no id, so it sorts by the
    // composite (season_id, team_id) natural key.
    expect(orderCalls).toEqual(
      expect.arrayContaining([
        { table: 'matches', column: 'id' },
        { table: 'matches_archive', column: 'id' },
        { table: 'playoff_matches', column: 'id' },
        { table: 'team_season_stats', column: 'season_id' },
        { table: 'team_season_stats', column: 'team_id' },
      ])
    );
  });

  it('paginates past the 1,000-row cap, accumulating every page', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, i) => ({
      winner_id: `w-${i}`,
      loser_id: `l-${i}`,
      season_id: 's1',
    }));
    const shortPage = [{ winner_id: 'w-last', loser_id: 'l-last', season_id: 's1' }];

    // Reuse ONE matches chain instance across pages so its page counter persists
    // (supabase.from('matches') is called once per page by the pagination loop).
    const matchesChain = rangeTableChain('matches', [
      { data: fullPage, error: null },
      { data: shortPage, error: null },
    ]);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'brackets') return bracketsChain([]);
      if (table === 'matches') return matchesChain;
      return rangeTableChain(table, singlePage([]));
    });

    const result = await fetchLeagueDivisionMatchups();

    // A full page must trigger a follow-up fetch; rows from both pages accumulate.
    expect(result.matches).toHaveLength(1001);
  });

  it('throws DatabaseError when a paginated query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'brackets') return bracketsChain([]);
      if (table === 'matches') {
        return rangeTableChain(table, [{ data: null, error: pgError() }]);
      }
      return rangeTableChain(table, singlePage([]));
    });

    await expect(fetchLeagueDivisionMatchups()).rejects.toThrow(DatabaseError);
  });
});
