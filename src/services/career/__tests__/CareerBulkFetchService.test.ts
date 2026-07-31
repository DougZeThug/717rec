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
import { fetchAllTeamsCareerData } from '../CareerBulkFetchService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

type Page = { data: unknown; error: unknown };

/** Records every .order() column so tests can assert stable pagination ordering. */
const orderCalls: { table: string; column: string }[] = [];

/**
 * Chain for a range-paginated table: .select().in()/.eq()/.not()....order().range().
 * `pages` are returned by successive .range() calls; a single-element list yields
 * one short page so the pagination loop runs exactly once.
 *
 * Reuse ONE chain instance per table across pages — the pagination loop calls
 * supabase.from(table) again for each page, and the counter lives on the chain.
 */
const rangeTableChain = (table: string, pages: Page[]) => {
  let call = 0;
  const chain: Record<string, (...args: unknown[]) => unknown> = {
    select: () => chain,
    in: () => chain,
    eq: () => chain,
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

/** `teams` and `seasons` are not paginated — they end at .in() / .eq().single(). */
const plainTableChain = (result: Page) => ({
  select: () => ({
    in: () => Promise.resolve(result),
    eq: () => ({ single: () => Promise.resolve(result) }),
  }),
});

const PAGINATED_TABLES = new Set([
  'team_season_stats',
  'matches',
  'matches_archive',
  'team_details_archive',
  'playoff_matches',
]);

function buildFromMock(overrides: Record<string, { data: unknown; error: unknown }>) {
  const defaultResult = { data: null, error: null };
  // One chain per table, created lazily, so a table's page counter survives the
  // repeated supabase.from() calls the pagination loop makes.
  const chains = new Map<string, ReturnType<typeof rangeTableChain>>();
  return (table: string) => {
    const result = overrides[table] ?? defaultResult;
    if (!PAGINATED_TABLES.has(table)) return plainTableChain(result);
    const existing = chains.get(table);
    if (existing) return existing;
    const chain = rangeTableChain(table, [result]);
    chains.set(table, chain);
    return chain;
  };
}

const successOverrides = {
  teams: {
    data: [{ id: 't1', divisions: { division_weight: 0.9 } }],
    error: null,
  },
  team_season_stats: {
    data: [
      {
        team_id: 't1',
        match_wins: 5,
        match_losses: 2,
        game_wins: 10,
        game_losses: 4,
        champion: false,
        runner_up: false,
        playoff_rank: null,
        sos: 0.6,
        division_name: 'Gold',
        season_id: 's-1',
        power_score: 80,
        seasons: { name: 'Season 1' },
      },
    ],
    error: null,
  },
  matches: { data: [], error: null },
  matches_archive: { data: [], error: null },
  team_details_archive: { data: [], error: null },
  playoff_matches: { data: [], error: null },
  seasons: { data: { id: 's-1' }, error: null },
};

// ─── fetchAllTeamsCareerData ──────────────────────────────────────────────────

describe('fetchAllTeamsCareerData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderCalls.length = 0;
  });

  it('orders every paginated query by a stable key before ranging', async () => {
    mockFrom.mockImplementation(buildFromMock(successOverrides));

    await fetchAllTeamsCareerData(['t1']);

    // Range pagination over an unstable order can skip or repeat rows across page
    // boundaries. matches/matches_archive/playoff_matches sort by their unique id;
    // team_season_stats and team_details_archive have no id column, so they sort by
    // their composite natural key.
    expect(orderCalls).toEqual(
      expect.arrayContaining([
        { table: 'matches', column: 'id' },
        { table: 'matches_archive', column: 'id' },
        { table: 'playoff_matches', column: 'id' },
        { table: 'team_season_stats', column: 'season_id' },
        { table: 'team_season_stats', column: 'team_id' },
        { table: 'team_details_archive', column: 'team_id' },
        { table: 'team_details_archive', column: 'season_id' },
      ])
    );
  });

  it('paginates past the 1,000-row cap instead of silently truncating', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, i) => ({
      winner_id: 't1',
      loser_id: 't2',
      team1_game_wins: 2,
      team2_game_wins: 0,
      team1_id: 't1',
      team2_id: 't2',
      season_id: `s-${i}`,
      team1: null,
      team2: null,
    }));
    const shortPage = [{ ...fullPage[0], season_id: 's-last' }];

    // One chain instance for `matches` so its page counter survives the repeated
    // supabase.from('matches') calls the pagination loop makes.
    const matchesChain = rangeTableChain('matches', [
      { data: fullPage, error: null },
      { data: shortPage, error: null },
    ]);
    const base = buildFromMock(successOverrides);
    mockFrom.mockImplementation((table: string) =>
      table === 'matches' ? matchesChain : base(table)
    );

    const result = await fetchAllTeamsCareerData(['t1']);

    // 1001, not 1000: the row past the cap must survive.
    expect(result.get('t1')?.currentMatches).toHaveLength(1001);
  });

  it('returns empty Map when teamIds is empty', async () => {
    const result = await fetchAllTeamsCareerData([]);
    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns BulkTeamCareerData for each teamId on success', async () => {
    mockFrom.mockImplementation(buildFromMock(successOverrides));

    const result = await fetchAllTeamsCareerData(['t1']);

    expect(result.size).toBe(1);
    const data = result.get('t1');
    expect(data).toBeDefined();
    expect(data?.currentSeasonId).toBe('s-1');
    expect(data?.teamDivisionWeight).toBe(0.9);
    expect(data?.seasonStats).toHaveLength(1);
    expect(data?.seasonPowerScores).toHaveLength(1);
    expect(data?.seasonPowerScores[0].power_score).toBe(80);
  });

  it('includes entry for teamId with no stats (defaults applied)', async () => {
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        team_season_stats: { data: [], error: null },
        teams: { data: [], error: null },
      })
    );

    const result = await fetchAllTeamsCareerData(['t1']);

    expect(result.has('t1')).toBe(true);
    const data = result.get('t1');
    expect(data?.seasonStats).toHaveLength(0);
    expect(data?.teamDivisionWeight).toBe(0.85);
  });

  it('throws DatabaseError when season_stats query fails', async () => {
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        team_season_stats: { data: null, error: pgError('season stats failed') },
      })
    );

    await expect(fetchAllTeamsCareerData(['t1'])).rejects.toThrow(DatabaseError);
  });

  // These used to warn and fall through to null, which meant a failed query and a
  // truncated one both produced quietly-wrong career stats. They now throw.
  it.each([
    ['matches', 'Failed to fetch bulk matches'],
    ['matches_archive', 'Failed to fetch bulk archived matches'],
    ['team_details_archive', 'Failed to fetch bulk team details archive'],
    ['playoff_matches', 'Failed to fetch bulk playoff matches'],
  ])('throws when the %s query fails', async (table, message) => {
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        [table]: { data: null, error: pgError(`${table} failed`) },
      })
    );

    await expect(fetchAllTeamsCareerData(['t1'])).rejects.toThrow(DatabaseError);
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        [table]: { data: null, error: pgError(`${table} failed`) },
      })
    );
    await expect(fetchAllTeamsCareerData(['t1'])).rejects.toThrow(message);
  });

  it('groups matches for the correct team', async () => {
    const matches = [
      {
        winner_id: 't1',
        loser_id: 't2',
        team1_game_wins: 2,
        team2_game_wins: 0,
        team1_id: 't1',
        team2_id: 't2',
        season_id: 's-1',
        team1: null,
        team2: null,
      },
    ];
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        matches: { data: matches, error: null },
      })
    );

    const result = await fetchAllTeamsCareerData(['t1']);
    expect(result.get('t1')?.currentMatches).toHaveLength(1);
  });

  it('excludes teams not in teamIds from returned map', async () => {
    mockFrom.mockImplementation(buildFromMock(successOverrides));
    const result = await fetchAllTeamsCareerData(['t1']);
    expect(result.has('t-other')).toBe(false);
  });
});

// ─── Bracket lookup cache ─────────────────────────────────────────────────────

const BRACKET_ROWS: Record<string, unknown> = {
  'b-old': {
    id: 'b-old',
    season_id: 's-1',
    divisions: { division_weight: 0.9, display_division: 'Competitive' },
  },
  'b-new': {
    id: 'b-new',
    season_id: 's-1',
    divisions: { division_weight: 1.0, display_division: 'Competitive' },
  },
};

const playoffMatchIn = (bracketId: string) => ({
  winner_id: 't1',
  loser_id: 't2',
  team1_score: 2,
  team2_score: 1,
  team1_id: 't1',
  team2_id: 't2',
  bracket_id: bracketId,
});

/** Like buildFromMock, but serves 'brackets' from BRACKET_ROWS and records the ids asked for. */
function buildFromMockWithBrackets(
  overrides: Record<string, { data: unknown; error: unknown }>,
  bracketIdCalls: string[][]
) {
  const base = buildFromMock(overrides);
  return (table: string) => {
    if (table !== 'brackets') return base(table);
    return {
      select: () => ({
        in: (_column: string, ids: string[]) => {
          bracketIdCalls.push([...ids]);
          return Promise.resolve({
            data: ids.map((id) => BRACKET_ROWS[id]).filter(Boolean),
            error: null,
          });
        },
      }),
    };
  };
}

describe('bracket lookup cache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves brackets first seen after the cache was populated, without re-querying known ones', async () => {
    // Fresh module so the module-level bracket cache starts empty
    vi.resetModules();
    const { fetchAllTeamsCareerData: freshFetch } = await import('../CareerBulkFetchService');

    const bracketIdCalls: string[][] = [];
    const withPlayoffMatches = (bracketIds: string[]) =>
      buildFromMockWithBrackets(
        {
          ...successOverrides,
          playoff_matches: { data: bracketIds.map(playoffMatchIn), error: null },
        },
        bracketIdCalls
      );

    mockFrom.mockImplementation(withPlayoffMatches(['b-old']));
    const first = await freshFetch(['t1']);
    expect(first.get('t1')?.bracketDivisionWeights).toEqual({ 'b-old': 0.9 });

    // A bracket created within the cache TTL must not fall back to the 0.85 default
    mockFrom.mockImplementation(withPlayoffMatches(['b-old', 'b-new']));
    const second = await freshFetch(['t1']);
    expect(second.get('t1')?.bracketDivisionWeights).toEqual({ 'b-old': 0.9, 'b-new': 1.0 });
    expect(second.get('t1')?.bracketDivisionDisplayNames['b-new']).toBe('Competitive');
    expect(second.get('t1')?.bracketSeasonMap['b-new']).toBe('s-1');

    // Only the unseen id was fetched the second time
    expect(bracketIdCalls).toEqual([['b-old'], ['b-new']]);

    // A third call adds nothing new, so it must not hit the database at all
    const third = await freshFetch(['t1']);
    expect(third.get('t1')?.bracketDivisionWeights).toEqual({ 'b-old': 0.9, 'b-new': 1.0 });
    expect(bracketIdCalls).toHaveLength(2);
  });

  it('does not re-query a bracket id that returned no row', async () => {
    vi.resetModules();
    const { fetchAllTeamsCareerData: freshFetch } = await import('../CareerBulkFetchService');

    const bracketIdCalls: string[][] = [];
    mockFrom.mockImplementation(
      buildFromMockWithBrackets(
        {
          ...successOverrides,
          playoff_matches: { data: [playoffMatchIn('b-deleted')], error: null },
        },
        bracketIdCalls
      )
    );

    await freshFetch(['t1']);
    await freshFetch(['t1']);

    expect(bracketIdCalls).toEqual([['b-deleted']]);
  });
});
