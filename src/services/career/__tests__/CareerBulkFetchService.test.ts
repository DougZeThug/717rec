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

function buildFromMock(overrides: Record<string, { data: unknown; error: unknown }>) {
  const defaultResult = { data: null, error: null };
  return (table: string) => {
    const result = overrides[table] ?? defaultResult;
    // eq() is thenable (matches, matches_archive end at .eq()) and has .single()
    const eqResult = Object.assign(Promise.resolve(result), {
      single: () => Promise.resolve(result),
    });
    // select() is thenable (team_details_archive) and has .in()/.eq()/.not()
    const selectResult = Object.assign(Promise.resolve(result), {
      in: () => Promise.resolve(result),
      eq: () => eqResult,
      not: () => Promise.resolve(result),
    });
    return { select: () => selectResult };
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
  beforeEach(() => vi.clearAllMocks());

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

  it('continues and returns data when non-critical queries fail', async () => {
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        matches: { data: null, error: pgError('matches failed') },
        matches_archive: { data: null, error: pgError('archive failed') },
        playoff_matches: { data: null, error: pgError('playoff failed') },
      })
    );

    const result = await fetchAllTeamsCareerData(['t1']);
    expect(result.size).toBe(1);
    const data = result.get('t1');
    expect(data?.currentMatches).toBeNull();
    expect(data?.archivedMatches).toBeNull();
    expect(data?.playoffMatches).toBeNull();
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

// ─── Default division weight (0.85) ───────────────────────────────────────────

// These pin the default division weight in CareerBulkFetchService.ts as it is today.
// They describe the code as it is and claim no league rule.

/** Like buildFromMock, but serves the given bracket rows (own copies, never BRACKET_ROWS). */
function buildFromMockServingBrackets(
  overrides: Record<string, { data: unknown; error: unknown }>,
  bracketRows: unknown[]
) {
  const base = buildFromMock(overrides);
  return (table: string) => {
    if (table !== 'brackets') return base(table);
    return {
      select: () => ({
        in: () => Promise.resolve({ data: bracketRows, error: null }),
      }),
    };
  };
}

describe("team division weight default (today's behaviour)", () => {
  beforeEach(() => vi.clearAllMocks());

  const fetchTeamWith = async (teamRows: unknown[]) => {
    mockFrom.mockImplementation(
      buildFromMock({ ...successOverrides, teams: { data: teamRows, error: null } })
    );
    const result = await fetchAllTeamsCareerData(['t1']);
    return result.get('t1');
  };

  // The team weight uses `||`, so a stored 0 becomes 0.85 today. This is the
  // current code, not a decided league rule. The `||` in buildTeamDivisionMaps is
  // masked by the two `||` where the result is assembled, so a switch to `??`
  // shows up here only when the map-building line and at least one of the two
  // assembling lines change together (the two assembling lines alone are not
  // caught).
  it.each([
    { label: '0', divisions: { division_weight: 0 } },
    { label: 'null', divisions: { division_weight: null } },
    { label: 'missing', divisions: {} },
    { label: 'absent (no division)', divisions: null },
  ])(
    "a team division weight of $label counts as 0.85 (today's behaviour)",
    async ({ divisions }) => {
      const data = await fetchTeamWith([{ id: 't1', divisions }]);

      expect(data?.teamDivisionWeight).toBe(0.85);
      expect(data?.teamData?.divisions?.division_weight).toBe(0.85);
    }
  );

  // The existing missing-team test only checks teamDivisionWeight; this also checks teamData.
  it("a team with no row at all counts as 0.85 in both weight fields (today's behaviour)", async () => {
    const data = await fetchTeamWith([]);

    expect(data?.teamDivisionWeight).toBe(0.85);
    expect(data?.teamData?.divisions?.division_weight).toBe(0.85);
  });

  it("keeps a positive team division weight (today's behaviour)", async () => {
    const data = await fetchTeamWith([{ id: 't1', divisions: { division_weight: 0.6 } }]);

    expect(data?.teamDivisionWeight).toBe(0.6);
    expect(data?.teamData?.divisions?.division_weight).toBe(0.6);
  });
});

describe("bracket division weight default (today's behaviour)", () => {
  beforeEach(() => vi.clearAllMocks());

  const fetchBracketWith = async (divisions: unknown) => {
    // Fresh module so the module-level bracket cache starts empty
    vi.resetModules();
    const { fetchAllTeamsCareerData: freshFetch } = await import('../CareerBulkFetchService');

    const bracketRows = [{ id: 'b-x', season_id: 's-1', divisions }];
    mockFrom.mockImplementation(
      buildFromMockServingBrackets(
        { ...successOverrides, playoff_matches: { data: [playoffMatchIn('b-x')], error: null } },
        bracketRows
      )
    );
    const result = await freshFetch(['t1']);
    return result.get('t1');
  };

  // The bracket weight uses `??`, so a stored 0 stays 0 here.
  it.each([
    {
      label: 'null',
      divisions: { division_weight: null, display_division: 'Competitive' },
      expected: 0.85,
    },
    { label: 'missing', divisions: { display_division: 'Competitive' }, expected: 0.85 },
    {
      label: '0',
      divisions: { division_weight: 0, display_division: 'Competitive' },
      expected: 0,
    },
    {
      label: '1',
      divisions: { division_weight: 1, display_division: 'Competitive' },
      expected: 1,
    },
    { label: 'absent (no division)', divisions: null, expected: 0.85 },
  ])(
    "a bracket division weight of $label counts as $expected (today's behaviour)",
    async ({ divisions, expected }) => {
      const data = await fetchBracketWith(divisions);

      expect(data?.bracketDivisionWeights).toEqual({ 'b-x': expected });
    }
  );
});

// ─── Team2 grouping, archive division names, active-season error ──────────────

// These pin CareerBulkFetchService.ts as it is today. They describe the code as it
// is and claim no league rule. None of them reaches the bracket cache (the playoff
// rows are empty), so they use the file's top-level import. A fresh module import
// would also load a second copy of DatabaseError, and the instanceof check in the
// last test would then fail.

describe("team2 match grouping (today's behaviour)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists a match under a team that is only ever team2, in match order (today's behaviour)", async () => {
    // t2 is team2 in both matches, so the second one adds to a list that already exists
    const firstMatch = {
      winner_id: 't3',
      loser_id: 't2',
      team1_game_wins: 2,
      team2_game_wins: 0,
      team1_id: 't3',
      team2_id: 't2',
      season_id: 's-1',
      team1: null,
      team2: null,
    };
    const secondMatch = {
      winner_id: 't2',
      loser_id: 't9',
      team1_game_wins: 1,
      team2_game_wins: 2,
      team1_id: 't9',
      team2_id: 't2',
      season_id: 's-1',
      team1: null,
      team2: null,
    };
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        matches: { data: [firstMatch, secondMatch], error: null },
      })
    );

    const result = await fetchAllTeamsCareerData(['t2', 't3']);

    expect(result.get('t2')?.currentMatches).toEqual([firstMatch, secondMatch]);
    // t3 is team1 in the first match only
    expect(result.get('t3')?.currentMatches).toEqual([firstMatch]);
    // t9 was not asked for, so it gets no entry
    expect(result.has('t9')).toBe(false);
  });
});

describe("archive division names (today's behaviour)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps teamId_seasonId to the archived division name and skips rows without one (today's behaviour)", async () => {
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        team_details_archive: {
          data: [
            { team_id: 't1', season_id: 's-1', divisionname: 'Gold' },
            { team_id: 't1', season_id: 's-2', divisionname: 'Silver' },
            // An opponent that was not asked for: the archive query is not filtered by team
            { team_id: 't-opp', season_id: 's-1', divisionname: 'Bronze' },
            // No division name: left out of the map
            { team_id: 't1', season_id: 's-3', divisionname: null },
            { team_id: 't1', season_id: 's-4', divisionname: '' },
          ],
          error: null,
        },
      })
    );

    const result = await fetchAllTeamsCareerData(['t1', 't2']);

    const expectedMap = new Map([
      ['t1_s-1', 'Gold'],
      ['t1_s-2', 'Silver'],
      ['t-opp_s-1', 'Bronze'],
    ]);
    expect(result.get('t1')?.teamDivisionMap).toEqual(expectedMap);
    // Every asked-for team gets the same map
    expect(result.get('t2')?.teamDivisionMap).toEqual(expectedMap);
  });
});

describe("active season lookup (today's behaviour)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws a DatabaseError when the active season query fails (today's behaviour)", async () => {
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        seasons: { data: null, error: pgError('active season failed') },
      })
    );

    const request = fetchAllTeamsCareerData(['t1']);

    await expect(request).rejects.toThrow(DatabaseError);
    await expect(request).rejects.toThrow('Failed to fetch active season: active season failed');
  });
});
