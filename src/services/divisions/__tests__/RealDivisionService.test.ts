import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DROPOUT_DIVISIONS } from '@/constants/dropoutDivisions';
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

// Import after mocks
import { fetchRealDivisionOverrides } from '../RealDivisionService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

type Page = { data: unknown; error: unknown };

/** What the service asked for, so a test can check the shape of every query. */
const seen = {
  select: [] as Array<{ table: string; columns: string }>,
  ilike: [] as Array<{ column: string; pattern: string }>,
  inList: [] as Array<{ table: string; column: string; values: string[] }>,
  order: [] as Array<{ table: string; column: string }>,
  range: [] as Array<{ table: string; from: number; to: number }>,
};

/** Only read methods exist on the chains, so any write call would throw. */
const pagedChain = (table: string, pages: Page[]) => {
  let call = 0;
  const chain: Record<string, (...args: unknown[]) => unknown> = {
    select: (columns: unknown) => {
      seen.select.push({ table, columns: String(columns) });
      return chain;
    },
    ilike: (column: unknown, pattern: unknown) => {
      seen.ilike.push({ column: String(column), pattern: String(pattern) });
      return chain;
    },
    in: (column: unknown, values: unknown) => {
      seen.inList.push({ table, column: String(column), values: values as string[] });
      return chain;
    },
    order: (column: unknown) => {
      seen.order.push({ table, column: String(column) });
      return chain;
    },
    range: (from: unknown, to: unknown) => {
      seen.range.push({ table, from: Number(from), to: Number(to) });
      const page = pages[call] ?? { data: [], error: null };
      call += 1;
      return Promise.resolve(page);
    },
  };
  return chain;
};

/** The divisions table is read with one .select().in(), no paging. */
const divisionsChain = (result: Page) => ({
  select: (columns: unknown) => {
    seen.select.push({ table: 'divisions', columns: String(columns) });
    return {
      in: (column: unknown, values: unknown) => {
        seen.inList.push({
          table: 'divisions',
          column: String(column),
          values: values as string[],
        });
        return Promise.resolve(result);
      },
    };
  },
});

const STATS = 'team_season_stats';
const VIEW = 'v_power_score_team_matches_rated';

interface Tables {
  [STATS]?: Page[];
  [VIEW]?: Page[];
  divisions?: Page;
}

const mockTables = ({ [STATS]: stats, [VIEW]: view, divisions }: Tables) => {
  // One chain per table, reused for every page, so its page counter persists
  // (the pagination loop calls supabase.from(table) once per page).
  const statsChain = pagedChain(STATS, stats ?? [{ data: [], error: null }]);
  const viewChain = pagedChain(VIEW, view ?? [{ data: [], error: null }]);
  const divisionsTable = divisionsChain(divisions ?? { data: [], error: null });
  mockFrom.mockImplementation((table: string) => {
    if (table === STATS) return statsChain;
    if (table === VIEW) return viewChain;
    if (table === 'divisions') return divisionsTable;
    throw new Error(`unexpected table ${table}`);
  });
};

const rows = (data: unknown[]): Page[] => [{ data, error: null }];

// Divisions as the table holds them: a display name when there is one, else the name.
const DIVISIONS: Page = {
  data: [
    { id: 'div-competitive', name: 'Competitive 1', display_division: 'Competitive' },
    { id: 'div-intermediate', name: 'Intermediate', display_division: null },
    { id: 'div-recreational', name: 'Recreational', display_division: '  ' },
  ],
  error: null,
};

const viewRow = (opponent: string, season: string, divisionId: string | null, by = 'snapshot') => ({
  opponent_id: opponent,
  season_id: season,
  opp_division_id: divisionId,
  resolved_by: divisionId ? by : 'unresolved',
  match_date: '2026-03-01T18:00:00+00:00',
});

// Doug's 8 team-seasons, read back out of the constant.
const DOUG = Object.keys(DROPOUT_DIVISIONS).map((key) => {
  const [teamId, seasonId] = key.split('_');
  return { key, teamId, seasonId, real: DROPOUT_DIVISIONS[key] };
});
const dougStatsRows = DOUG.map(({ teamId, seasonId }) => ({
  team_id: teamId,
  season_id: seasonId,
}));
const dougMap = () => new Map(DOUG.map(({ key, real }) => [key, real]));
const divisionIdFor = (name: string) => `div-${name.toLowerCase()}`;

// A team that drops out AFTER this change: the lookup has to answer for it.
const NEW_TEAM = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const NEW_SEASON = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const NEW_KEY = `${NEW_TEAM}_${NEW_SEASON}`;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('fetchRealDivisionOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seen.select.length = 0;
    seen.ilike.length = 0;
    seen.inList.length = 0;
    seen.order.length = 0;
    seen.range.length = 0;
  });

  it("names a future dropout from the lookup and adds Doug's 8 rows", async () => {
    mockTables({
      [STATS]: rows([...dougStatsRows, { team_id: NEW_TEAM, season_id: NEW_SEASON }]),
      [VIEW]: rows([
        ...DOUG.map(({ teamId, seasonId, real }) => viewRow(teamId, seasonId, divisionIdFor(real))),
        viewRow(NEW_TEAM, NEW_SEASON, 'div-intermediate'),
        viewRow(NEW_TEAM, NEW_SEASON, 'div-intermediate'),
      ]),
      divisions: DIVISIONS,
    });

    const overrides = await fetchRealDivisionOverrides();

    expect(overrides.get(NEW_KEY)).toBe('Intermediate');
    expect(overrides.size).toBe(9);
    for (const { key, real } of DOUG) expect(overrides.get(key)).toBe(real);
    expect(warnLog).not.toHaveBeenCalled();
  });

  it('prefers the display name and falls back to the name when it is blank', async () => {
    const OTHER_TEAM = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    mockTables({
      [STATS]: rows([
        { team_id: NEW_TEAM, season_id: NEW_SEASON },
        { team_id: OTHER_TEAM, season_id: NEW_SEASON },
      ]),
      [VIEW]: rows([
        viewRow(NEW_TEAM, NEW_SEASON, 'div-competitive'),
        viewRow(OTHER_TEAM, NEW_SEASON, 'div-recreational'),
      ]),
      divisions: DIVISIONS,
    });

    const overrides = await fetchRealDivisionOverrides();

    // "Competitive 1" would show if the name beat the display name.
    expect(overrides.get(NEW_KEY)).toBe('Competitive');
    // The display name here is blank, so the name is used.
    expect(overrides.get(`${OTHER_TEAM}_${NEW_SEASON}`)).toBe('Recreational');
  });

  it("lets a row in Doug's list win over the lookup for the same team and season", async () => {
    const shut = DOUG.find(({ key }) => key.startsWith('5db6b718'));
    expect(shut?.real).toBe('Competitive');
    mockTables({
      [STATS]: rows(dougStatsRows),
      // The Power Score view says Recreational for Shut Your Cornhole. Doug says Competitive.
      [VIEW]: rows([viewRow(shut?.teamId ?? '', shut?.seasonId ?? '', 'div-recreational')]),
      divisions: DIVISIONS,
    });

    expect((await fetchRealDivisionOverrides()).get(shut?.key ?? '')).toBe('Competitive');
  });

  it('uses only the rows of a team in a season where it is Hidden', async () => {
    const REAL_SEASON = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    mockTables({
      [STATS]: rows([{ team_id: NEW_TEAM, season_id: NEW_SEASON }]),
      [VIEW]: rows([
        // Same team, an earlier season where it still played in a real division.
        viewRow(NEW_TEAM, REAL_SEASON, 'div-competitive'),
        viewRow(NEW_TEAM, NEW_SEASON, 'div-recreational'),
        // A team that is not Hidden at all.
        viewRow('cccccccc-cccc-4ccc-8ccc-cccccccccccc', NEW_SEASON, 'div-competitive'),
      ]),
      divisions: DIVISIONS,
    });

    const overrides = await fetchRealDivisionOverrides();

    expect(overrides.get(NEW_KEY)).toBe('Recreational');
    expect(overrides.has(`${NEW_TEAM}_${REAL_SEASON}`)).toBe(false);
    expect(overrides.has(`cccccccc-cccc-4ccc-8ccc-cccccccccccc_${NEW_SEASON}`)).toBe(false);
    // Only the division the kept row names is looked up.
    expect(seen.inList.find((q) => q.table === 'divisions')?.values).toEqual(['div-recreational']);
  });

  it('leaves a team the lookup cannot answer to the list, and reads no names for it', async () => {
    mockTables({
      [STATS]: rows([{ team_id: NEW_TEAM, season_id: NEW_SEASON }]),
      [VIEW]: rows([viewRow(NEW_TEAM, NEW_SEASON, null), viewRow(NEW_TEAM, NEW_SEASON, null)]),
    });

    const overrides = await fetchRealDivisionOverrides();

    expect(overrides.has(NEW_KEY)).toBe(false);
    expect([...overrides]).toEqual([...dougMap()]);
    expect(mockFrom).not.toHaveBeenCalledWith('divisions');
  });

  it('leaves a team to the list when the division names come back empty', async () => {
    mockTables({
      [STATS]: rows([{ team_id: NEW_TEAM, season_id: NEW_SEASON }]),
      [VIEW]: rows([viewRow(NEW_TEAM, NEW_SEASON, 'div-intermediate')]),
      divisions: { data: null, error: null },
    });

    const overrides = await fetchRealDivisionOverrides();

    expect(overrides.has(NEW_KEY)).toBe(false);
    expect([...overrides]).toEqual([...dougMap()]);
    expect(warnLog).not.toHaveBeenCalled();
  });

  it('reads nothing more when no team-season is Hidden', async () => {
    mockTables({});

    const overrides = await fetchRealDivisionOverrides();

    expect([...overrides]).toEqual([...dougMap()]);
    expect(mockFrom.mock.calls.map((call) => call[0])).toEqual([STATS]);
  });

  it('asks for Hidden team-seasons by name, with explicit columns and a stable order', async () => {
    mockTables({
      [STATS]: rows([
        { team_id: NEW_TEAM, season_id: NEW_SEASON },
        { team_id: NEW_TEAM, season_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' },
      ]),
      [VIEW]: rows([viewRow(NEW_TEAM, NEW_SEASON, 'div-intermediate')]),
      divisions: DIVISIONS,
    });

    await fetchRealDivisionOverrides();

    expect(seen.ilike).toEqual([{ column: 'division_name', pattern: '%hidden%' }]);
    expect(seen.select).toEqual([
      { table: STATS, columns: 'team_id, season_id' },
      {
        table: VIEW,
        columns: 'opponent_id, season_id, opp_division_id, resolved_by, match_date',
      },
      { table: 'divisions', columns: 'id, name, display_division' },
    ]);
    expect(seen.select.every((q) => !q.columns.includes('*'))).toBe(true);
    // A team that is Hidden in two seasons is asked for once.
    expect(seen.inList.find((q) => q.table === VIEW)).toEqual({
      table: VIEW,
      column: 'opponent_id',
      values: [NEW_TEAM],
    });
    // Range paging needs a stable, total order before .range().
    expect(seen.order).toEqual(
      expect.arrayContaining([
        { table: STATS, column: 'season_id' },
        { table: STATS, column: 'team_id' },
        { table: VIEW, column: 'match_id' },
        { table: VIEW, column: 'source' },
        { table: VIEW, column: 'team_id' },
      ])
    );
  });

  it('only reads: the tables are the three it needs and a write method does not exist', async () => {
    mockTables({
      [STATS]: rows([{ team_id: NEW_TEAM, season_id: NEW_SEASON }]),
      [VIEW]: rows([viewRow(NEW_TEAM, NEW_SEASON, 'div-intermediate')]),
      divisions: DIVISIONS,
    });

    await fetchRealDivisionOverrides();

    expect(mockFrom.mock.calls.map((call) => call[0])).toEqual([STATS, VIEW, 'divisions']);
    // A write call on these chains would throw, and a throw is logged as a warning.
    expect(warnLog).not.toHaveBeenCalled();
  });

  it('pages past the 1,000-row cap for both reads', async () => {
    const filler = (i: number) => ({
      team_id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, '0')}`,
      season_id: NEW_SEASON,
    });
    const fullStatsPage = Array.from({ length: 1000 }, (_, i) => filler(i));
    const fullViewPage = Array.from({ length: 1000 }, (_, i) =>
      viewRow(filler(i).team_id, NEW_SEASON, 'div-competitive')
    );
    mockTables({
      [STATS]: [
        { data: fullStatsPage, error: null },
        { data: [{ team_id: NEW_TEAM, season_id: NEW_SEASON }], error: null },
      ],
      [VIEW]: [
        { data: fullViewPage, error: null },
        { data: [viewRow(NEW_TEAM, NEW_SEASON, 'div-recreational')], error: null },
      ],
      divisions: DIVISIONS,
    });

    const overrides = await fetchRealDivisionOverrides();

    // The team on page 2 of the first read was asked for, and its row on page 2 of the second.
    expect(overrides.get(NEW_KEY)).toBe('Recreational');
    expect(seen.range).toEqual([
      { table: STATS, from: 0, to: 999 },
      { table: STATS, from: 1000, to: 1999 },
      { table: VIEW, from: 0, to: 999 },
      { table: VIEW, from: 1000, to: 1999 },
    ]);
    expect(seen.inList.find((q) => q.table === VIEW)?.values).toContain(NEW_TEAM);
  });

  describe('when the lookup fails', () => {
    // 22 games stay right, because they come from Doug's list, not from the lookup.
    const expectOnlyDougsList = async () => {
      const overrides = await fetchRealDivisionOverrides();
      expect([...overrides]).toEqual([...dougMap()]);
      expect(warnLog).toHaveBeenCalledTimes(1);
    };

    it("logs and keeps Doug's list when the Hidden team-season read fails", async () => {
      mockTables({ [STATS]: [{ data: null, error: pgError() }] });
      await expectOnlyDougsList();
    });

    it("logs and keeps Doug's list when the Power Score view read fails", async () => {
      mockTables({
        [STATS]: rows([{ team_id: NEW_TEAM, season_id: NEW_SEASON }]),
        [VIEW]: [{ data: null, error: pgError() }],
      });
      await expectOnlyDougsList();
    });

    it("logs and keeps Doug's list when the division names read fails", async () => {
      mockTables({
        [STATS]: rows([{ team_id: NEW_TEAM, season_id: NEW_SEASON }]),
        [VIEW]: rows([viewRow(NEW_TEAM, NEW_SEASON, 'div-intermediate')]),
        divisions: { data: null, error: pgError() },
      });
      await expectOnlyDougsList();
    });

    it("logs and keeps Doug's list when a read throws", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('network down');
      });
      await expectOnlyDougsList();
    });

    it('does not use a half-finished lookup', async () => {
      // The Hidden team-season read worked and the view read failed: no partial answer.
      mockTables({
        [STATS]: rows([{ team_id: NEW_TEAM, season_id: NEW_SEASON }]),
        [VIEW]: [{ data: null, error: pgError() }],
      });
      expect((await fetchRealDivisionOverrides()).has(NEW_KEY)).toBe(false);
    });
  });
});
