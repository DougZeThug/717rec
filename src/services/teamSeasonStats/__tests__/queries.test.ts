import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

// Import after mocks
import { fetchSeasonBreakdownQueries } from '../queries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Valid v4 UUID — the function guards its teamId before querying.
const TEAM_ID = '11111111-1111-4111-8111-111111111111';

const emptyResult = { data: [], error: null };

/** Covers every chain shape in fetchSeasonBreakdownQueries. */
const makeSelectChain = () =>
  Object.assign(Promise.resolve(emptyResult), {
    // team_season_stats: .select().eq().order()
    eq: () => ({ order: () => Promise.resolve(emptyResult) }),
    or: () => ({
      eq: () => Promise.resolve(emptyResult), // matches, matches_archive
      not: () => Promise.resolve(emptyResult), // playoff_matches
    }),
  });

// ─── fetchSeasonBreakdownQueries ──────────────────────────────────────────────

describe('fetchSeasonBreakdownQueries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs all five queries for a valid teamId', async () => {
    mockFrom.mockImplementation(() => ({ select: () => makeSelectChain() }));

    const result = await fetchSeasonBreakdownQueries(TEAM_ID);

    expect(result.seasonStatsResult.data).toEqual([]);
    expect(mockFrom).toHaveBeenCalledWith('team_season_stats');
    expect(mockFrom).toHaveBeenCalledWith('matches');
    expect(mockFrom).toHaveBeenCalledWith('matches_archive');
    expect(mockFrom).toHaveBeenCalledWith('playoff_matches');
  });

  it('rejects an invalid teamId before querying Supabase', async () => {
    await expect(fetchSeasonBreakdownQueries('team-1')).rejects.toThrow(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
