import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockFetchRecapForWeek, mockFetchTrends } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockFetchRecapForWeek: vi.fn(),
  mockFetchTrends: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn() }));
vi.mock('@/services/weeklyRecap/WeeklyRecapService', () => ({
  WeeklyRecapService: { fetchRecapForWeek: mockFetchRecapForWeek },
}));
vi.mock('@/services/rankings/weeklyTrendsForWeek', () => ({
  fetchPowerScoreTrendsForWeek: mockFetchTrends,
}));

import { fetchRecapFacts } from '../fetchRecapFacts';

/** Every filter each table saw, so the test can assert on the bounds used. */
type Call = { table: string; filters: Array<[string, unknown, unknown]> };

let calls: Call[] = [];

const snapshotRow = (teamId: string, week: number) => ({
  team_id: teamId,
  division_id: 'd-1',
  power_score: week === 6 ? 70 : 60,
  sos: 0.5,
  match_wins: 4,
  match_losses: 2,
  game_wins: 9,
  game_losses: 5,
});

/** Results per table, in the order that table is queried. */
const setupSupabase = (queued: Record<string, unknown[]>) => {
  // Cloned so each query shifts from its own copy and a test can be re-run.
  // A genuine deep clone, unlike the JSON round trip in buildRecapFacts.test,
  // where surviving serialisation IS the assertion.
  const remaining: Record<string, unknown[]> = structuredClone(queued);

  mockFrom.mockImplementation((table: string) => {
    const call: Call = { table, filters: [] };
    calls.push(call);

    const result = (remaining[table] ?? []).shift() ?? { data: [], error: null, count: 0 };
    const query: Record<string, unknown> = {};
    const record =
      (name: string) =>
      (...args: unknown[]) => {
        call.filters.push([name, args[0], args[1]]);
        return query;
      };

    Object.assign(query, {
      select: record('select'),
      eq: record('eq'),
      in: record('in'),
      is: record('is'),
      not: record('not'),
      gte: record('gte'),
      lt: record('lt'),
      order: record('order'),
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
    });

    return query;
  });
};

const filterOn = (table: string, name: string, nth = 0) =>
  calls.filter((c) => c.table === table)[nth]?.filters.find((f) => f[0] === name);

/** Whether the nth query on a table applied a given filter, whatever its order. */
const hasFilter = (table: string, name: string, column: string, value: unknown, nth = 0) =>
  (calls.filter((c) => c.table === table)[nth]?.filters ?? []).some(
    (f) => f[0] === name && f[1] === column && f[2] === value
  );

beforeEach(() => {
  calls = [];
  vi.clearAllMocks();
  mockFetchRecapForWeek.mockResolvedValue({ upsets: [], hotStreaks: [], hasData: false });
  mockFetchTrends.mockResolvedValue({
    trends: [],
    currentWeek: 6,
    previousWeek: 5,
    basis: 'compared',
  });
});

describe('fetchRecapFacts', () => {
  const season = {
    data: { id: 's-1', name: 'Fall 2026', start_date: '2026-09-04' },
    error: null,
  };

  it('bounds the match read to the end of the week being graded', async () => {
    setupSupabase({
      seasons: [season],
      power_score_snapshots: [{ data: [snapshotRow('t-1', 6)], error: null }],
      v_team_details: [
        {
          data: [
            { team_id: 't-1', name: 'A', logo_url: null, image_url: null, division_id: 'd-1' },
          ],
          error: null,
        },
      ],
      divisions: [
        {
          data: [{ id: 'd-1', name: 'Competitive', display_division: 'Competitive' }],
          error: null,
        },
      ],
      matches: [
        { count: 0, error: null },
        { data: [], error: null },
      ],
    });

    const facts = await fetchRecapFacts('s-1', 6);

    // The second matches query is the one feeding sweep and clutch. Without an
    // upper bound a week 3 edition would be graded on week 8 form.
    const bound = filterOn('matches', 'lt', 1);
    expect(bound?.[1]).toBe('date');
    expect(bound?.[2]).toBe(facts.weekEndIso);
    expect(hasFilter('matches', 'eq', 'iscompleted', true, 1)).toBe(true);
    // Regular season only — a playoff result is not part of a week's grading.
    expect(hasFilter('matches', 'is', 'bracket_id', null, 1)).toBe(true);
  });

  it('reads the previous standings for the week actually compared against', async () => {
    // basis 'gap': week 5 has no snapshot, so week 4 was used.
    mockFetchTrends.mockResolvedValue({
      trends: [],
      currentWeek: 6,
      previousWeek: 4,
      basis: 'gap',
    });

    setupSupabase({
      seasons: [season],
      power_score_snapshots: [
        { data: [snapshotRow('t-1', 6)], error: null },
        { data: [snapshotRow('t-1', 4)], error: null },
      ],
      v_team_details: [
        {
          data: [
            { team_id: 't-1', name: 'A', logo_url: null, image_url: null, division_id: 'd-1' },
          ],
          error: null,
        },
        {
          data: [
            { team_id: 't-1', name: 'A', logo_url: null, image_url: null, division_id: 'd-1' },
          ],
          error: null,
        },
      ],
      divisions: [
        {
          data: [{ id: 'd-1', name: 'Competitive', display_division: 'Competitive' }],
          error: null,
        },
        {
          data: [{ id: 'd-1', name: 'Competitive', display_division: 'Competitive' }],
          error: null,
        },
      ],
      matches: [
        { count: 0, error: null },
        { data: [], error: null },
      ],
    });

    await fetchRecapFacts('s-1', 6);

    const weeksRead = calls
      .filter((c) => c.table === 'power_score_snapshots')
      .map((c) => c.filters.find((f) => f[1] === 'week_number')?.[2]);

    // Week 4, not week 5: the arrow has to agree with the power delta.
    expect(weeksRead).toEqual([6, 4]);
  });

  it('reads no previous standings when there is no week to compare with', async () => {
    mockFetchTrends.mockResolvedValue({
      trends: [],
      currentWeek: 1,
      previousWeek: null,
      basis: 'baseline',
    });

    setupSupabase({
      seasons: [season],
      power_score_snapshots: [{ data: [snapshotRow('t-1', 1)], error: null }],
      v_team_details: [
        {
          data: [
            { team_id: 't-1', name: 'A', logo_url: null, image_url: null, division_id: 'd-1' },
          ],
          error: null,
        },
      ],
      divisions: [
        {
          data: [{ id: 'd-1', name: 'Competitive', display_division: 'Competitive' }],
          error: null,
        },
      ],
      matches: [
        { count: 0, error: null },
        { data: [], error: null },
      ],
    });

    const facts = await fetchRecapFacts('s-1', 1);

    expect(calls.filter((c) => c.table === 'power_score_snapshots')).toHaveLength(1);
    expect(facts.powerRankings?.every((t) => t.previousRank === null)).toBe(true);
  });

  // One visibility rule for the whole edition. weeklyTrendsForWeek gates on the
  // team's division today, so a team moved to Hidden after the week ended used
  // to keep its rank and grade in the standings while vanishing from movers --
  // a published, frozen recap contradicting itself.
  it('drops a team whose division is Hidden today, even if it was not then', async () => {
    setupSupabase({
      seasons: [season],
      power_score_snapshots: [
        { data: [snapshotRow('t-1', 6), snapshotRow('t-2', 6)], error: null },
      ],
      v_team_details: [
        {
          data: [
            // t-1 still plays. t-2 has since been moved to the Hidden division,
            // though its snapshot still records the division it played in.
            { team_id: 't-1', name: 'A', logo_url: null, image_url: null, division_id: 'd-1' },
            { team_id: 't-2', name: 'B', logo_url: null, image_url: null, division_id: 'd-hidden' },
          ],
          error: null,
        },
      ],
      divisions: [
        {
          data: [
            { id: 'd-1', name: 'Competitive', display_division: 'Competitive' },
            { id: 'd-hidden', name: 'Hidden', display_division: 'Hidden' },
          ],
          error: null,
        },
      ],
      matches: [
        { count: 0, error: null },
        { data: [], error: null },
      ],
    });

    const facts = await fetchRecapFacts('s-1', 6);

    const ranked = facts.powerRankings?.map((t) => t.teamId) ?? [];
    expect(ranked).toContain('t-1');
    expect(ranked).not.toContain('t-2');
  });

  it('asks the recap and the streaks for the same week it is building', async () => {
    setupSupabase({
      seasons: [season],
      power_score_snapshots: [{ data: [], error: null }],
      matches: [
        { count: 0, error: null },
        { data: [], error: null },
      ],
    });

    await fetchRecapFacts('s-1', 6);

    expect(mockFetchRecapForWeek).toHaveBeenCalledWith(
      expect.objectContaining({ seasonId: 's-1', weekNumber: 6, seasonStartDate: '2026-09-04' })
    );
    expect(mockFetchTrends).toHaveBeenCalledWith('s-1', 6);
  });

  it('throws rather than returning an empty edition when the season is missing', async () => {
    setupSupabase({ seasons: [{ data: null, error: null }] });
    await expect(fetchRecapFacts('s-nope', 6)).rejects.toThrow();
  });

  it('throws rather than publishing a half-read week when a query fails', async () => {
    setupSupabase({
      seasons: [season],
      power_score_snapshots: [{ data: null, error: { message: 'boom', code: '42P01' } }],
      matches: [
        { count: 0, error: null },
        { data: [], error: null },
      ],
    });

    await expect(fetchRecapFacts('s-1', 6)).rejects.toThrow();
  });
});
