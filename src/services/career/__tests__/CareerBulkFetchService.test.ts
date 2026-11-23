import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyDropoutDivisions, DROPOUT_DIVISIONS } from '@/constants/dropoutDivisions';
import { fetchRealDivisionOverrides } from '@/services/divisions/RealDivisionService';
import { DatabaseError } from '@/types/errors';
import { calculateDivisionRecords } from '@/utils/career/calculateDivisionRecords';

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

vi.mock('@/services/divisions/RealDivisionService', () => ({
  fetchRealDivisionOverrides: vi.fn(),
}));

// Import after mocks
import { type BulkTeamCareerData, fetchAllTeamsCareerData } from '../CareerBulkFetchService';

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

// No real divisions unless a test asks for them, so every test sees the stored names.
beforeEach(() => {
  vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(new Map());
});

// ─── fetchAllTeamsCareerData ──────────────────────────────────────────────────

describe('fetchAllTeamsCareerData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty Map when teamIds is empty', async () => {
    const result = await fetchAllTeamsCareerData([]);
    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(fetchRealDivisionOverrides).not.toHaveBeenCalled();
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

  it('includes entry for teamId with no stats (no team weight)', async () => {
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
    expect(data?.teamDivisionWeight).toBeNull();
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

  it.each([
    ['teams', /bulk team divisions/i],
    ['matches', /bulk matches/i],
    ['matches_archive', /bulk archived matches/i],
    ['team_details_archive', /bulk team division history/i],
    ['playoff_matches', /bulk playoff matches/i],
  ])('throws DatabaseError when the %s read fails, not empty numbers', async (table, text) => {
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        [table]: { data: null, error: pgError('read failed') },
      })
    );

    await expect(fetchAllTeamsCareerData(['t1'])).rejects.toThrow(DatabaseError);
    await expect(fetchAllTeamsCareerData(['t1'])).rejects.toThrow(text);
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

  /** Brackets read that fails on the first call and works on later calls. */
  function bracketsFailingOnce(bracketIdCalls: string[][], failures: number) {
    let remaining = failures;
    const base = buildFromMock({
      ...successOverrides,
      playoff_matches: { data: [playoffMatchIn('b-old')], error: null },
    });
    return (table: string) => {
      if (table !== 'brackets') return base(table);
      return {
        select: () => ({
          in: (_column: string, ids: string[]) => {
            bracketIdCalls.push([...ids]);
            if (remaining > 0) {
              remaining -= 1;
              return Promise.resolve({ data: null, error: pgError('brackets failed') });
            }
            return Promise.resolve({
              data: ids.map((id) => BRACKET_ROWS[id]).filter(Boolean),
              error: null,
            });
          },
        }),
      };
    };
  }

  it('throws when the first bracket read fails, then asks again instead of using a cached gap', async () => {
    vi.resetModules();
    const { fetchAllTeamsCareerData: freshFetch } = await import('../CareerBulkFetchService');
    const bracketIdCalls: string[][] = [];
    mockFrom.mockImplementation(bracketsFailingOnce(bracketIdCalls, 1));

    // (A reset module has its own error class, so match the message.)
    await expect(freshFetch(['t1'])).rejects.toThrow(/bracket lookups/i);

    // Nothing was cached from the failed read, so the retry asks the database again
    // and the competitive bracket keeps its real weight (not the 0.85 fallback).
    const retry = await freshFetch(['t1']);
    expect(retry.get('t1')?.bracketDivisionWeights).toEqual({ 'b-old': 0.9 });
    expect(bracketIdCalls).toEqual([['b-old'], ['b-old']]);
  });

  it('does not mark new bracket ids as queried when a read on a warm cache fails', async () => {
    vi.resetModules();
    const { fetchAllTeamsCareerData: freshFetch } = await import('../CareerBulkFetchService');
    const bracketIdCalls: string[][] = [];
    const withBrackets = (bracketIds: string[], failures: number) => {
      const fail = bracketsFailingOnce(bracketIdCalls, failures);
      const base = buildFromMock({
        ...successOverrides,
        playoff_matches: { data: bracketIds.map(playoffMatchIn), error: null },
      });
      return (table: string) => (table === 'brackets' ? fail(table) : base(table));
    };

    // Warm the cache with b-old.
    mockFrom.mockImplementation(withBrackets(['b-old'], 0));
    await freshFetch(['t1']);

    // b-new is new, and its read fails: the call throws.
    mockFrom.mockImplementation(withBrackets(['b-old', 'b-new'], 1));
    // (A reset module has its own error class, so match the message.)
    await expect(freshFetch(['t1'])).rejects.toThrow(/bracket lookups/i);

    // b-new was not marked as queried, so the next call asks for it again.
    const retry = await freshFetch(['t1']);
    expect(retry.get('t1')?.bracketDivisionWeights).toEqual({ 'b-old': 0.9, 'b-new': 1.0 });
    expect(bracketIdCalls).toEqual([['b-old'], ['b-new'], ['b-new']]);
  });
});

// ─── Team weight (unrated) and bracket weight (0.85 default) ──────────────────

// The team weight has no default: a team with no division or no weight is unrated
// (null). The bracket weight still defaults to 0.85. The bracket tests describe
// the code as it is today and claim no league rule.

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

describe('team division weight (unrated)', () => {
  beforeEach(() => vi.clearAllMocks());

  const fetchTeamWith = async (teamRows: unknown[]) => {
    mockFrom.mockImplementation(
      buildFromMock({ ...successOverrides, teams: { data: teamRows, error: null } })
    );
    const result = await fetchAllTeamsCareerData(['t1']);
    return result.get('t1');
  };

  // The team weight is read in three places: where the map is built, and in the
  // two fields of the result (teamDivisionWeight and teamData.divisions). They
  // must change together. If ANY ONE keeps an old `||` default, a stored 0 or a
  // missing weight turns back into 0.85 in the field it feeds, so every case here
  // reads BOTH fields. (When the three lines were changed from `||` to `??`,
  // changing only one of them could not be seen, because the other two turned the
  // 0 back into 0.85. That is why the three must stay in step.)
  it.each([
    { label: 'null', divisions: { division_weight: null } },
    { label: 'missing', divisions: {} },
    { label: 'absent (no division)', divisions: null },
  ])('a team division weight of $label is unrated (null) in both fields', async ({ divisions }) => {
    const data = await fetchTeamWith([{ id: 't1', divisions }]);

    expect(data?.teamDivisionWeight).toBeNull();
    expect(data?.teamData?.divisions?.division_weight).toBeNull();
  });

  it('keeps a stored team division weight of 0 as 0 in both fields', async () => {
    const data = await fetchTeamWith([{ id: 't1', divisions: { division_weight: 0 } }]);

    expect(data?.teamDivisionWeight).toBe(0);
    expect(data?.teamData?.divisions?.division_weight).toBe(0);
  });

  // The existing missing-team test only checks teamDivisionWeight; this also checks teamData.
  it('a team with no row at all is unrated (null) in both weight fields', async () => {
    const data = await fetchTeamWith([]);

    expect(data?.teamDivisionWeight).toBeNull();
    expect(data?.teamData?.divisions?.division_weight).toBeNull();
  });

  it('keeps a positive team division weight', async () => {
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

// A team moved to Hidden after it dropped out. Its games are real games, so the
// real division (Doug's list, plus the Power Score lookup) files them.
describe('real division of a dropped-out (Hidden) team', () => {
  beforeEach(() => vi.clearAllMocks());

  const doug = (prefix: string) => {
    const key = Object.keys(DROPOUT_DIVISIONS).find((k) => k.startsWith(prefix)) ?? '';
    const [teamId, seasonId] = key.split('_');
    return { key, teamId, seasonId };
  };
  const BURNING_HOLES = doug('eb7976c7'); // Summer 1 2026, really Recreational
  const ZOO_PALS = doug('56387477'); // Fall 2026 (active), really Intermediate
  const REAL_OPPONENT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  const game = (team1: string, team2: string, seasonId: string, team1Won: boolean) => ({
    winner_id: team1Won ? team1 : team2,
    loser_id: team1Won ? team2 : team1,
    team1_game_wins: team1Won ? 2 : 0,
    team2_game_wins: team1Won ? 0 : 2,
    team1_id: team1,
    team2_id: team2,
    season_id: seasonId,
  });

  const setup = () =>
    mockFrom.mockImplementation(
      buildFromMock({
        ...successOverrides,
        teams: {
          data: [
            { id: 't1', divisions: { division_weight: 0.9 } },
            { id: 't2', divisions: { division_weight: 0.5 } },
          ],
          error: null,
        },
        matches: {
          data: [
            // t1 beat Zoo Pals in the ACTIVE season: no archive row, joined division is Hidden.
            {
              ...game('t1', ZOO_PALS.teamId, ZOO_PALS.seasonId, true),
              team1: { id: 't1', divisions: { name: 'Competitive' } },
              team2: { id: ZOO_PALS.teamId, divisions: { name: 'Hidden' } },
            },
          ],
          error: null,
        },
        matches_archive: {
          data: [
            // t1 lost 0-2 to Burning Holes. t2 beat the same team.
            game('t1', BURNING_HOLES.teamId, BURNING_HOLES.seasonId, false),
            game('t2', BURNING_HOLES.teamId, BURNING_HOLES.seasonId, true),
            game('t1', REAL_OPPONENT, BURNING_HOLES.seasonId, true),
          ],
          error: null,
        },
        team_details_archive: {
          data: [
            {
              team_id: BURNING_HOLES.teamId,
              season_id: BURNING_HOLES.seasonId,
              divisionname: 'Hidden',
            },
            {
              team_id: REAL_OPPONENT,
              season_id: BURNING_HOLES.seasonId,
              divisionname: 'Competitive',
            },
          ],
          error: null,
        },
      })
    );

  const recordsFor = (data: BulkTeamCareerData | undefined, teamId: string) =>
    calculateDivisionRecords({
      currentMatches: data?.currentMatches ?? null,
      archivedMatches: data?.archivedMatches ?? null,
      playoffMatches: null,
      teamDivisionMap: data?.teamDivisionMap ?? new Map(),
      bracketDivisionWeights: {},
      bracketDivisionDisplayNames: {},
      teamId,
    });

  it("leaves today's numbers alone when there are no overrides: the Hidden games are dropped", async () => {
    setup();

    const result = await fetchAllTeamsCareerData(['t1', 't2']);

    expect(recordsFor(result.get('t1'), 't1')).toEqual({
      competitive: { wins: 1, losses: 0 },
      intermediate: { wins: 0, losses: 0 },
      recreational: { wins: 0, losses: 0 },
    });
    expect(recordsFor(result.get('t2'), 't2').recreational).toEqual({ wins: 0, losses: 0 });
  });

  it("files each team's Hidden games under the real division, active season included", async () => {
    setup();
    vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(applyDropoutDivisions(new Map()));

    const result = await fetchAllTeamsCareerData(['t1', 't2']);

    expect(recordsFor(result.get('t1'), 't1')).toEqual({
      competitive: { wins: 1, losses: 0 },
      // Zoo Pals, Fall 2026 (active): only the map can carry it.
      intermediate: { wins: 1, losses: 0 },
      // The 0-2 loss to Burning Holes.
      recreational: { wins: 0, losses: 1 },
    });
    expect(recordsFor(result.get('t2'), 't2').recreational).toEqual({ wins: 1, losses: 0 });
  });

  it('reads the overrides ONCE for the whole run and shares the map between teams', async () => {
    setup();
    vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(applyDropoutDivisions(new Map()));

    const result = await fetchAllTeamsCareerData(['t1', 't2']);

    expect(fetchRealDivisionOverrides).toHaveBeenCalledTimes(1);
    expect(result.get('t1')?.teamDivisionMap).toBe(result.get('t2')?.teamDivisionMap);
    expect(result.get('t1')?.teamDivisionMap.get(ZOO_PALS.key)).toBe('Intermediate');
  });

  it('never replaces a real archived division with an override', async () => {
    setup();
    vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(
      new Map([[`${REAL_OPPONENT}_${BURNING_HOLES.seasonId}`, 'Recreational']])
    );

    const result = await fetchAllTeamsCareerData(['t1']);

    expect(
      result.get('t1')?.teamDivisionMap.get(`${REAL_OPPONENT}_${BURNING_HOLES.seasonId}`)
    ).toBe('Competitive');
  });
});
