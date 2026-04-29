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
}));

vi.mock('@/config/cache', () => ({
  QUERY_STALE_TIMES: { STANDARD: 300000 },
}));

// Import after mocks
import { fetchCareerData } from '../CareerFetchService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// Minimal successful result set
const successResults = {
  teams: { data: { divisions: { division_weight: 0.85 } }, error: null },
  team_season_stats: { data: [], error: null },
  matches: { data: [], error: null },
  matches_archive: { data: [], error: null },
  team_details_archive: { data: [], error: null },
  playoff_matches: { data: [], error: null },
  seasons: { data: { id: 'season-1' }, error: null },
};

// ─── fetchCareerData ──────────────────────────────────────────────────────────

describe('fetchCareerData', () => {
  beforeEach(() => vi.clearAllMocks());

  // Builds a fully-thenable chain that covers all query shapes in CareerFetchService
  function makeSelectChain(result: { data: unknown; error: unknown }) {
    // eq() is itself thenable (team_season_stats ends at .eq()) and has .single()/.not()
    const eqResult = Object.assign(Promise.resolve(result), {
      single: () => Promise.resolve(result),
      not: () => Promise.resolve(result),
    });
    // select() is thenable (team_details_archive awaits it directly) and has .eq()/.or()
    return Object.assign(Promise.resolve(result), {
      eq: () => eqResult,
      or: () => ({
        eq: () => Promise.resolve(result), // matches, matches_archive
        not: () => Promise.resolve(result), // playoff_matches
      }),
      in: () => Promise.resolve({ data: [], error: null }),
    });
  }

  function makeFromImpl(overrides: Record<string, { data: unknown; error: unknown }>) {
    return (table: string) => {
      const result = overrides[table as string] ?? { data: null, error: null };
      return { select: () => makeSelectChain(result) };
    };
  }

  it('returns CareerData on success with all queries resolving', async () => {
    mockFrom.mockImplementation(makeFromImpl(successResults));

    const result = await fetchCareerData('team-1');

    expect(result).toMatchObject({ currentSeasonId: 'season-1', teamDivisionWeight: 0.85 });
  });

  it('throws DatabaseError when season_stats query fails (critical error)', async () => {
    mockFrom.mockImplementation(
      makeFromImpl({
        ...successResults,
        team_season_stats: { data: null, error: pgError('season stats failed') },
      })
    );

    await expect(fetchCareerData('team-1')).rejects.toThrow(DatabaseError);
  });

  it('returns result even when non-critical queries fail (matches, archived, playoff)', async () => {
    mockFrom.mockImplementation(
      makeFromImpl({
        ...successResults,
        matches: { data: null, error: pgError('non-critical') },
        matches_archive: { data: null, error: pgError('non-critical') },
        playoff_matches: { data: null, error: pgError('non-critical') },
      })
    );

    // Non-critical errors are logged but don't throw
    const result = await fetchCareerData('team-1');
    expect(result).not.toBeNull();
  });
});
