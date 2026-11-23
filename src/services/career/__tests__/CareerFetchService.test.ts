import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyDropoutDivisions, DROPOUT_DIVISIONS } from '@/constants/dropoutDivisions';
import { fetchRealDivisionOverrides } from '@/services/divisions/RealDivisionService';
import { DatabaseError, ValidationError } from '@/types/errors';
import { calculateDivisionRecords } from '@/utils/career/calculateDivisionRecords';
import { warnLog } from '@/utils/logger';

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
import { fetchCareerData } from '../CareerFetchService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Valid v4 UUID — fetchCareerData guards its teamId before querying.
const TEAM_ID = '11111111-1111-4111-8111-111111111111';

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

// No real divisions unless a test asks for them, so every test sees the stored names.
beforeEach(() => {
  vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(new Map());
});

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

    const result = await fetchCareerData(TEAM_ID);

    expect(result).toMatchObject({ currentSeasonId: 'season-1', teamDivisionWeight: 0.85 });
  });

  it('throws DatabaseError when season_stats query fails (critical error)', async () => {
    mockFrom.mockImplementation(
      makeFromImpl({
        ...successResults,
        team_season_stats: { data: null, error: pgError('season stats failed') },
      })
    );

    await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(DatabaseError);
  });

  it('rejects an invalid teamId before querying Supabase', async () => {
    await expect(fetchCareerData('team-1')).rejects.toThrow(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(fetchRealDivisionOverrides).not.toHaveBeenCalled();
  });

  // Regression: the guard must not reject real rows. This team id is seeded by
  // supabase/migrations/00000000000000_baseline.sql and its version/variant
  // nibbles are not v4, so a version-4-only check would throw for a real team.
  it('accepts a stored team id whose UUID is not version 4', async () => {
    mockFrom.mockImplementation(makeFromImpl(successResults));

    const result = await fetchCareerData('f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c');

    expect(result).not.toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('teams');
  });
});

// ─── Query flow, fallbacks and maps ───────────────────────────────────────────
// A recording mock: every chained call is logged per table, and awaiting the
// chain gives the table's result. The two `brackets` queries are told apart by
// their select text.

type QueryResult = { data: unknown; error: unknown };
type RecordedQuery = { table: string; calls: Array<[string, unknown[]]> };

describe('fetchCareerData query flow', () => {
  const OTHER_TEAM = '22222222-2222-4222-8222-222222222222';
  let recorded: RecordedQuery[] = [];

  const defaults: Record<string, QueryResult> = {
    teams: { data: { divisions: { division_weight: 1 } }, error: null },
    team_season_stats: { data: [], error: null },
    matches: { data: [], error: null },
    matches_archive: { data: [], error: null },
    team_details_archive: { data: [], error: null },
    playoff_matches: { data: [], error: null },
    seasons: { data: { id: 'season-1' }, error: null },
    bracket_weights: { data: [], error: null },
    bracket_seasons: { data: [], error: null },
  };

  const playoffRow = (bracketId: string | null) => ({
    winner_id: TEAM_ID,
    loser_id: OTHER_TEAM,
    team1_score: 2,
    team2_score: 0,
    team1_id: TEAM_ID,
    team2_id: OTHER_TEAM,
    bracket_id: bracketId,
  });

  const setup = (overrides: Record<string, QueryResult> = {}) => {
    recorded = [];
    const results = { ...defaults, ...overrides };
    mockFrom.mockImplementation((table: string) => ({
      select: (columns: string) => {
        const key =
          table === 'brackets'
            ? columns.includes('division_weight')
              ? 'bracket_weights'
              : 'bracket_seasons'
            : table;
        const entry: RecordedQuery = { table, calls: [['select', [columns]]] };
        recorded.push(entry);
        const chain: unknown = new Proxy(
          {},
          {
            get(_target, prop) {
              if (prop === 'then') {
                return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
                  Promise.resolve(results[key]).then(resolve, reject);
              }
              return (...args: unknown[]) => {
                entry.calls.push([String(prop), args]);
                return chain;
              };
            },
          }
        );
        return chain;
      },
    }));
  };

  const queriesOn = (table: string) => recorded.filter((q) => q.table === table);
  const callsOn = (table: string, method: string) =>
    queriesOn(table).flatMap((q) => q.calls.filter(([m]) => m === method).map(([, args]) => args));

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
  });

  describe('queries', () => {
    it('runs the seven queries first, in order, with no bracket query when there are no playoffs', async () => {
      setup();

      await fetchCareerData(TEAM_ID);

      expect(recorded.map((q) => q.table)).toEqual([
        'teams',
        'team_season_stats',
        'matches',
        'matches_archive',
        'team_details_archive',
        'playoff_matches',
        'seasons',
      ]);
    });

    it('selects the expected columns', async () => {
      setup();

      await fetchCareerData(TEAM_ID);

      expect(callsOn('teams', 'select')[0][0]).toBe('divisions(division_weight)');
      expect(callsOn('team_season_stats', 'select')[0][0]).toContain('seasons!inner(name)');
      expect(callsOn('matches', 'select')[0][0]).toContain('team1:teams!matches_team1_id_fkey');
      expect(callsOn('matches_archive', 'select')[0][0]).toContain('team2_game_wins');
      expect(callsOn('team_details_archive', 'select')[0][0]).toBe(
        'team_id, season_id, divisionname'
      );
      expect(callsOn('playoff_matches', 'select')[0][0]).toContain('bracket_id');
      expect(callsOn('seasons', 'select')[0][0]).toBe('id');
    });

    it('filters each query by the team, completed matches and the active season', async () => {
      setup();
      const teamFilter = `team1_id.eq.${TEAM_ID},team2_id.eq.${TEAM_ID}`;

      await fetchCareerData(TEAM_ID);

      expect(callsOn('teams', 'eq')).toEqual([['id', TEAM_ID]]);
      expect(callsOn('teams', 'single')).toHaveLength(1);
      expect(callsOn('team_season_stats', 'eq')).toEqual([['team_id', TEAM_ID]]);
      expect(callsOn('matches', 'or')).toEqual([[teamFilter]]);
      expect(callsOn('matches', 'eq')).toEqual([['iscompleted', true]]);
      expect(callsOn('matches_archive', 'or')).toEqual([[teamFilter]]);
      expect(callsOn('matches_archive', 'eq')).toEqual([['iscompleted', true]]);
      expect(callsOn('playoff_matches', 'or')).toEqual([[teamFilter]]);
      expect(callsOn('playoff_matches', 'not')).toEqual([['winner_id', 'is', null]]);
      expect(callsOn('seasons', 'eq')).toEqual([['is_active', true]]);
      expect(callsOn('seasons', 'single')).toHaveLength(1);
    });

    it('passes the raw rows through', async () => {
      const teamData = { divisions: { division_weight: 0.9 } };
      const seasonStats = [{ match_wins: 3, season_id: 's1' }];
      const currentMatches = [{ winner_id: TEAM_ID }];
      const archivedMatches = [{ winner_id: OTHER_TEAM }];
      const playoffMatches = [playoffRow(null)];
      setup({
        teams: { data: teamData, error: null },
        team_season_stats: { data: seasonStats, error: null },
        matches: { data: currentMatches, error: null },
        matches_archive: { data: archivedMatches, error: null },
        playoff_matches: { data: playoffMatches, error: null },
      });

      const result = await fetchCareerData(TEAM_ID);

      expect(result?.teamData).toEqual(teamData);
      expect(result?.seasonStats).toEqual(seasonStats);
      expect(result?.currentMatches).toEqual(currentMatches);
      expect(result?.archivedMatches).toEqual(archivedMatches);
      expect(result?.playoffMatches).toEqual(playoffMatches);
    });
  });

  describe('team division weight', () => {
    it('uses the team division weight', async () => {
      setup({ teams: { data: { divisions: { division_weight: 0.6 } }, error: null } });

      expect((await fetchCareerData(TEAM_ID))?.teamDivisionWeight).toBe(0.6);
    });

    // A team with no division or no weight is unrated (null), not 0.85.
    it.each([
      ['the division is null', { data: { divisions: null }, error: null }],
      ['the weight is null', { data: { divisions: { division_weight: null } }, error: null }],
      ['the team row is missing', { data: null, error: null }],
      [
        'the team row is missing (PGRST116)',
        { data: null, error: { ...pgError(), code: 'PGRST116' } },
      ],
    ])('has no team weight (null) when %s', async (_label, teams) => {
      setup({ teams });

      expect((await fetchCareerData(TEAM_ID))?.teamDivisionWeight).toBeNull();
    });

    it('keeps a stored weight of 0 as 0', async () => {
      setup({ teams: { data: { divisions: { division_weight: 0 } }, error: null } });

      expect((await fetchCareerData(TEAM_ID))?.teamDivisionWeight).toBe(0);
    });
  });

  describe('active season', () => {
    it('returns the active season id', async () => {
      setup({ seasons: { data: { id: 'season-9' }, error: null } });

      expect((await fetchCareerData(TEAM_ID))?.currentSeasonId).toBe('season-9');
    });

    it.each([
      ['no row comes back', { data: null, error: null }],
      ['the row has no id', { data: { id: '' }, error: null }],
      [
        'there is no active season (PGRST116)',
        { data: null, error: { ...pgError(), code: 'PGRST116' } },
      ],
    ])('is null when %s', async (_label, seasons) => {
      setup({ seasons });

      expect((await fetchCareerData(TEAM_ID))?.currentSeasonId).toBeNull();
    });

    it('throws when the active-season query fails for another reason', async () => {
      setup({ seasons: { data: null, error: pgError('seasons failed') } });

      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(DatabaseError);
      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(/active season/i);
    });
  });

  describe('error handling order', () => {
    it('throws the season stats error before the active-season error', async () => {
      setup({
        team_season_stats: { data: null, error: pgError('stats failed') },
        seasons: { data: null, error: pgError('seasons failed') },
      });

      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(/season stats/i);
    });

    it('still runs every query before it throws', async () => {
      setup({ team_season_stats: { data: null, error: pgError('stats failed') } });

      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(DatabaseError);

      expect(recorded).toHaveLength(7);
    });

    it('throws when the team query fails for another reason', async () => {
      setup({ teams: { data: null, error: pgError('teams failed') } });

      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(DatabaseError);
      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(/fetch team:/i);
    });

    it('throws when the team division history read fails', async () => {
      setup({ team_details_archive: { data: null, error: pgError('archive failed') } });

      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(DatabaseError);
      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(/division history/i);
    });

    it.each([
      ['matches', /current matches/i],
      ['matches_archive', /archived matches/i],
      ['playoff_matches', /playoff matches/i],
    ])('throws, and does not just warn, when the %s read fails', async (table, text) => {
      setup({ [table]: { data: null, error: pgError('read failed') } });

      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(DatabaseError);
      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(text);
      expect(warnLog).not.toHaveBeenCalled();
    });
  });

  describe('bracket lookups', () => {
    it.each([
      ['playoff matches are null', { data: null, error: null }],
      ['there are no playoff matches', { data: [], error: null }],
      [
        'every bracket id is empty',
        { data: [playoffRow(null), playoffRow(''), playoffRow(null)], error: null },
      ],
    ])('does not query brackets when %s', async (_label, playoff_matches) => {
      setup({ playoff_matches });

      const result = await fetchCareerData(TEAM_ID);

      expect(queriesOn('brackets')).toHaveLength(0);
      expect(result?.bracketDivisionWeights).toEqual({});
      expect(result?.bracketDivisionDisplayNames).toEqual({});
      expect(result?.bracketSeasonMap).toEqual({});
    });

    it('queries brackets twice, in order, with unique non-empty ids', async () => {
      setup({
        playoff_matches: {
          data: [
            playoffRow('b1'),
            playoffRow('b1'),
            playoffRow('b2'),
            playoffRow(null),
            playoffRow(''),
          ],
          error: null,
        },
      });

      await fetchCareerData(TEAM_ID);

      const bracketQueries = queriesOn('brackets');
      expect(bracketQueries).toHaveLength(2);
      expect(recorded.slice(-2).map((q) => q.table)).toEqual(['brackets', 'brackets']);
      expect(bracketQueries[0].calls[0][1][0]).toContain('division_weight');
      expect(bracketQueries[0].calls[0][1][0]).toContain('display_division');
      expect(bracketQueries[1].calls[0][1][0]).toBe('id, season_id');
      for (const query of bracketQueries) {
        expect(query.calls.find(([m]) => m === 'in')?.[1]).toEqual(['id', ['b1', 'b2']]);
      }
    });

    it('sends both bracket queries before either one answers', async () => {
      // Both answers are held back. If the second query only started after the
      // first answered, it would not have been sent yet.
      let releaseWeights: (value: QueryResult) => void = () => undefined;
      let releaseSeasons: (value: QueryResult) => void = () => undefined;
      setup({
        playoff_matches: { data: [playoffRow('b1')], error: null },
        bracket_weights: new Promise<QueryResult>((resolve) => {
          releaseWeights = resolve;
        }) as unknown as QueryResult,
        bracket_seasons: new Promise<QueryResult>((resolve) => {
          releaseSeasons = resolve;
        }) as unknown as QueryResult,
      });

      const pending = fetchCareerData(TEAM_ID);
      await vi.waitFor(() => expect(queriesOn('brackets')).toHaveLength(2));

      releaseSeasons({ data: [{ id: 'b1', season_id: 's1' }], error: null });
      releaseWeights({
        data: [{ id: 'b1', divisions: { division_weight: 0.7, display_division: 'Intermediate' } }],
        error: null,
      });
      const result = await pending;

      expect(result?.bracketDivisionWeights).toEqual({ b1: 0.7 });
      expect(result?.bracketDivisionDisplayNames).toEqual({ b1: 'Intermediate' });
      expect(result?.bracketSeasonMap).toEqual({ b1: 's1' });
    });

    it('builds the weight, display name and season maps', async () => {
      setup({
        playoff_matches: {
          data: [playoffRow('b1'), playoffRow('b2'), playoffRow('b3'), playoffRow('b4')],
          error: null,
        },
        bracket_weights: {
          data: [
            { id: 'b1', divisions: { division_weight: 1, display_division: 'Competitive' } },
            { id: 'b2', divisions: null },
            { id: 'b3', divisions: { division_weight: 0, display_division: null } },
            { id: 'b4', divisions: { division_weight: 0.6, display_division: 'Recreational' } },
          ],
          error: null,
        },
        bracket_seasons: {
          data: [
            { id: 'b1', season_id: 's1' },
            { id: 'b2', season_id: null },
            { id: 'b3', season_id: 's3' },
          ],
          error: null,
        },
      });

      const result = await fetchCareerData(TEAM_ID);

      expect(result?.bracketDivisionWeights).toEqual({ b1: 1, b2: 0.85, b3: 0.85, b4: 0.6 });
      expect(result?.bracketDivisionDisplayNames).toEqual({
        b1: 'Competitive',
        b2: '',
        b3: '',
        b4: 'Recreational',
      });
      expect(result?.bracketSeasonMap).toEqual({ b1: 's1', b3: 's3' });
    });

    it('returns empty maps when the bracket queries answer with no rows', async () => {
      setup({
        playoff_matches: { data: [playoffRow('b1')], error: null },
        bracket_weights: { data: null, error: null },
        bracket_seasons: { data: null, error: null },
      });

      const result = await fetchCareerData(TEAM_ID);

      expect(result).not.toBeNull();
      expect(result?.bracketDivisionWeights).toEqual({});
      expect(result?.bracketDivisionDisplayNames).toEqual({});
      expect(result?.bracketSeasonMap).toEqual({});
    });

    it('throws when the bracket weight read fails', async () => {
      setup({
        playoff_matches: { data: [playoffRow('b1')], error: null },
        bracket_weights: { data: null, error: pgError('brackets failed') },
      });

      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(DatabaseError);
      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(/bracket divisions/i);
    });

    it('throws when the bracket season read fails', async () => {
      setup({
        playoff_matches: { data: [playoffRow('b1')], error: null },
        bracket_seasons: { data: null, error: pgError('brackets failed') },
      });

      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(DatabaseError);
      await expect(fetchCareerData(TEAM_ID)).rejects.toThrow(/bracket seasons/i);
    });
  });

  describe('team division map', () => {
    it('keys each division by team and season, skipping incomplete rows', async () => {
      setup({
        team_details_archive: {
          data: [
            { team_id: TEAM_ID, season_id: 's1', divisionname: 'Competitive' },
            { team_id: OTHER_TEAM, season_id: 's1', divisionname: 'Recreational' },
            { team_id: TEAM_ID, season_id: 's2', divisionname: null },
            { team_id: TEAM_ID, season_id: 's3', divisionname: '' },
            { team_id: TEAM_ID, season_id: '', divisionname: 'Intermediate' },
            { team_id: '', season_id: 's4', divisionname: 'Intermediate' },
          ],
          error: null,
        },
      });

      const result = await fetchCareerData(TEAM_ID);

      expect([...(result?.teamDivisionMap ?? [])]).toEqual([
        [`${TEAM_ID}_s1`, 'Competitive'],
        [`${OTHER_TEAM}_s1`, 'Recreational'],
      ]);
    });

    it('is an empty map when the archive has no data', async () => {
      setup({ team_details_archive: { data: null, error: null } });

      const result = await fetchCareerData(TEAM_ID);

      expect(result?.teamDivisionMap).toBeInstanceOf(Map);
      expect(result?.teamDivisionMap.size).toBe(0);
    });
  });

  // A team moved to Hidden after it dropped out. Its games are real games, so the
  // real division (Doug's list, plus the Power Score lookup) files them.
  describe('real division of a dropped-out (Hidden) team', () => {
    const doug = (prefix: string) => {
      const key = Object.keys(DROPOUT_DIVISIONS).find((k) => k.startsWith(prefix)) ?? '';
      const [teamId, seasonId] = key.split('_');
      return { key, teamId, seasonId };
    };
    const BURNING_HOLES = doug('eb7976c7'); // Summer 1 2026, really Recreational
    const TOMATO_SAUCERS = doug('accd6e20'); // Winter 2 2026, really Recreational
    const ZOO_PALS = doug('56387477'); // Fall 2026 (active), really Intermediate
    const REAL_OPPONENT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    const archivedGame = (opponentId: string, seasonId: string, teamWon: boolean) => ({
      winner_id: teamWon ? TEAM_ID : opponentId,
      loser_id: teamWon ? opponentId : TEAM_ID,
      team1_game_wins: teamWon ? 2 : 0,
      team2_game_wins: teamWon ? 0 : 2,
      team1_id: TEAM_ID,
      team2_id: opponentId,
      season_id: seasonId,
    });

    // The active season has no archive row, so the match carries the opponent's
    // CURRENT division, which is Hidden once the team drops out.
    const currentGame = (opponentId: string, seasonId: string, divisionName: string) => ({
      ...archivedGame(opponentId, seasonId, true),
      team1: { id: TEAM_ID, divisions: { name: 'Competitive' } },
      team2: { id: opponentId, divisions: { name: divisionName } },
    });

    const careerSetup = () =>
      setup({
        matches: {
          data: [currentGame(ZOO_PALS.teamId, ZOO_PALS.seasonId, 'Hidden')],
          error: null,
        },
        matches_archive: {
          data: [
            archivedGame(BURNING_HOLES.teamId, BURNING_HOLES.seasonId, false),
            archivedGame(TOMATO_SAUCERS.teamId, TOMATO_SAUCERS.seasonId, true),
            archivedGame(REAL_OPPONENT, BURNING_HOLES.seasonId, true),
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
              team_id: TOMATO_SAUCERS.teamId,
              season_id: TOMATO_SAUCERS.seasonId,
              divisionname: 'Hidden2',
            },
            {
              team_id: REAL_OPPONENT,
              season_id: BURNING_HOLES.seasonId,
              divisionname: 'Competitive',
            },
          ],
          error: null,
        },
      });

    const divisionRecordsOf = async () => {
      const data = await fetchCareerData(TEAM_ID);
      return calculateDivisionRecords({
        currentMatches: data?.currentMatches ?? null,
        archivedMatches: data?.archivedMatches ?? null,
        playoffMatches: null,
        teamDivisionMap: data?.teamDivisionMap ?? new Map(),
        bracketDivisionWeights: {},
        bracketDivisionDisplayNames: {},
        teamId: TEAM_ID,
      });
    };

    it("leaves today's numbers alone when there are no overrides: the Hidden games are dropped", async () => {
      careerSetup();

      expect(await divisionRecordsOf()).toEqual({
        competitive: { wins: 1, losses: 0 },
        intermediate: { wins: 0, losses: 0 },
        recreational: { wins: 0, losses: 0 },
      });
    });

    it('files the 3 Hidden games under their real division', async () => {
      careerSetup();
      vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(applyDropoutDivisions(new Map()));

      expect(await divisionRecordsOf()).toEqual({
        competitive: { wins: 1, losses: 0 },
        // The win over Zoo Pals in the ACTIVE season: no archive row, so only the
        // map can carry it (the match's own joined division says Hidden).
        intermediate: { wins: 1, losses: 0 },
        // The 0-2 loss to Burning Holes and the win over The Tomato Saucers.
        recreational: { wins: 1, losses: 1 },
      });
    });

    it('never replaces a real archived division with an override', async () => {
      careerSetup();
      vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(
        new Map([[`${REAL_OPPONENT}_${BURNING_HOLES.seasonId}`, 'Recreational']])
      );

      const data = await fetchCareerData(TEAM_ID);

      expect(data?.teamDivisionMap.get(`${REAL_OPPONENT}_${BURNING_HOLES.seasonId}`)).toBe(
        'Competitive'
      );
    });

    it('adds an answer for a team-season the archive has no row for', async () => {
      careerSetup();
      vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(applyDropoutDivisions(new Map()));

      const data = await fetchCareerData(TEAM_ID);

      expect(data?.teamDivisionMap.get(ZOO_PALS.key)).toBe('Intermediate');
      expect(data?.teamDivisionMap.get(BURNING_HOLES.key)).toBe('Recreational');
    });

    it('reads the overrides once', async () => {
      careerSetup();

      await fetchCareerData(TEAM_ID);

      expect(fetchRealDivisionOverrides).toHaveBeenCalledTimes(1);
    });
  });
});
