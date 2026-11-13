import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockHandleDatabaseError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockHandleDatabaseError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/errorHandler', () => ({
  handleDatabaseError: (...args: unknown[]) => {
    mockHandleDatabaseError(...args);
    throw new Error(String(args[1]));
  },
}));

vi.mock('@/utils/logger', () => ({ errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn() }));

import { fetchPowerScoreTrendsForWeek, pickTeamOfTheWeek } from '../weeklyTrendsForWeek';

type QueryResult = { data: unknown; error: unknown };

/** One read of a table: the week it asked for and every `.not(...)` it applied. */
type RecordedRead = { table: string; week?: unknown; not: unknown[][] };

let reads: RecordedRead[] = [];

/** Queues one result per read of a table, in call order, like the sibling suites. */
function createSupabaseMock(queuedByTable: Record<string, QueryResult[]>) {
  const eqCalls: Record<string, unknown[][]> = {};
  reads = [];

  mockFrom.mockImplementation((table: string) => {
    const result = (queuedByTable[table] ?? []).shift() ?? { data: null, error: null };
    const read: RecordedRead = { table, not: [] };
    reads.push(read);
    const query: Record<string, unknown> = {};
    const chain = () => query;

    Object.assign(query, {
      eq: vi.fn((...args: unknown[]) => {
        (eqCalls[table] ??= []).push(args);
        if (args[0] === 'week_number') read.week = args[1];
        return query;
      }),
      neq: vi.fn(chain),
      lte: vi.fn(chain),
      not: vi.fn((...args: unknown[]) => {
        read.not.push(args);
        return query;
      }),
      in: vi.fn(chain),
      order: vi.fn(() => Promise.resolve(result)),
      then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve),
    });

    return { select: vi.fn(() => query) };
  });

  return eqCalls;
}

/** The `.not(...)` filters applied to the snapshot read for one week. */
const notFiltersForWeek = (week: number) =>
  reads
    .filter((read) => read.table === 'power_score_snapshots' && read.week === week)
    .flatMap((read) => read.not);

const snapshotWeeks = (weeks: number[]): QueryResult => ({
  data: weeks.map((week_number) => ({ week_number })),
  error: null,
});

const visibleDivisions: QueryResult = { data: [{ id: 'd-1' }], error: null };

const teamRows: QueryResult = {
  data: [
    {
      team_id: 't-1',
      name: 'Bag Chasers',
      divisionname: 'Competitive',
      division_id: 'd-1',
      logo_url: null,
      image_url: 'chasers.png',
    },
    {
      team_id: 't-2',
      name: 'Corn Stars',
      divisionname: 'Competitive',
      division_id: 'd-1',
      logo_url: null,
      image_url: null,
    },
    {
      team_id: 't-hidden',
      name: 'Retired Squad',
      divisionname: 'Hidden',
      division_id: 'd-hidden',
      logo_url: null,
      image_url: null,
    },
  ],
  error: null,
};

describe('fetchPowerScoreTrendsForWeek', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('compares week N against N-1 when both exist', async () => {
    const eqCalls = createSupabaseMock({
      power_score_snapshots: [
        snapshotWeeks([6, 5, 4]),
        { data: [{ team_id: 't-1', power_score: 64 }], error: null },
        { data: [{ team_id: 't-1', power_score: 60 }], error: null },
      ],
      divisions: [visibleDivisions],
      v_team_details: [teamRows],
    });

    const result = await fetchPowerScoreTrendsForWeek('s-1', 6);

    expect(result.basis).toBe('compared');
    expect(result.currentWeek).toBe(6);
    expect(result.previousWeek).toBe(5);
    expect(result.trends).toHaveLength(1);
    expect(result.trends[0].delta).toBeCloseTo(4);

    // Season scoping: the old function was hardcoded to the active season, so
    // this is a new way to get it wrong.
    expect(eqCalls.power_score_snapshots?.[0]).toEqual(['season_id', 's-1']);
  });

  it('reports a gap when the previous week has no snapshot', async () => {
    createSupabaseMock({
      // The cron missed week 6.
      power_score_snapshots: [
        snapshotWeeks([7, 5, 4]),
        { data: [{ team_id: 't-1', power_score: 70 }], error: null },
        { data: [{ team_id: 't-1', power_score: 60 }], error: null },
      ],
      divisions: [visibleDivisions],
      v_team_details: [teamRows],
    });

    const result = await fetchPowerScoreTrendsForWeek('s-1', 7);

    expect(result.basis).toBe('gap');
    // It must say which week it really compared against, not imply week 6.
    expect(result.previousWeek).toBe(5);
  });

  it('reports a baseline when nothing earlier exists', async () => {
    createSupabaseMock({
      power_score_snapshots: [snapshotWeeks([1])],
      divisions: [visibleDivisions],
    });

    const result = await fetchPowerScoreTrendsForWeek('s-1', 1);

    expect(result.basis).toBe('baseline');
    expect(result.trends).toEqual([]);
    expect(result.previousWeek).toBeNull();
  });

  it('reports missing when the week itself was never snapshotted', async () => {
    createSupabaseMock({
      power_score_snapshots: [snapshotWeeks([5, 4])],
      divisions: [visibleDivisions],
    });

    const result = await fetchPowerScoreTrendsForWeek('s-1', 6);

    expect(result.basis).toBe('missing');
    expect(result.trends).toEqual([]);
  });

  it('drops hidden-division teams and teams absent from the earlier week', async () => {
    createSupabaseMock({
      power_score_snapshots: [
        snapshotWeeks([6, 5]),
        {
          data: [
            { team_id: 't-1', power_score: 64 },
            { team_id: 't-2', power_score: 50 },
            { team_id: 't-hidden', power_score: 80 },
          ],
          error: null,
        },
        // t-2 is new this week, so it has no movement to report.
        {
          data: [
            { team_id: 't-1', power_score: 60 },
            { team_id: 't-hidden', power_score: 70 },
          ],
          error: null,
        },
      ],
      divisions: [visibleDivisions],
      v_team_details: [teamRows],
    });

    const result = await fetchPowerScoreTrendsForWeek('s-1', 6);

    expect(result.trends.map((t) => t.teamId)).toEqual(['t-1']);
  });

  it('returns both risers and fallers, unfiltered by sign', async () => {
    createSupabaseMock({
      power_score_snapshots: [
        snapshotWeeks([6, 5]),
        {
          data: [
            { team_id: 't-1', power_score: 64 },
            { team_id: 't-2', power_score: 45 },
          ],
          error: null,
        },
        {
          data: [
            { team_id: 't-1', power_score: 60 },
            { team_id: 't-2', power_score: 50 },
          ],
          error: null,
        },
      ],
      divisions: [visibleDivisions],
      v_team_details: [teamRows],
    });

    const result = await fetchPowerScoreTrendsForWeek('s-1', 6);

    expect(result.trends.map((t) => Math.round(t.delta))).toEqual([4, -5]);
  });

  it('throws on a database error rather than reporting an empty week', async () => {
    createSupabaseMock({
      power_score_snapshots: [{ data: null, error: { message: 'boom' } }],
      divisions: [visibleDivisions],
    });

    await expect(fetchPowerScoreTrendsForWeek('s-1', 6)).rejects.toThrow();
    expect(mockHandleDatabaseError).toHaveBeenCalled();
  });

  // Four more reads can fail. Each case lets the reads before it succeed, so the
  // code reaches the one under test.
  it.each([
    {
      failing: 'the visible divisions read',
      queue: () => ({
        power_score_snapshots: [snapshotWeeks([6, 5])],
        divisions: [{ data: null, error: { message: 'divisions down' } }],
      }),
      message: 'Failed to fetch visible divisions for the recap',
    },
    {
      failing: "this week's snapshots read",
      queue: () => ({
        power_score_snapshots: [
          snapshotWeeks([6, 5]),
          { data: null, error: { message: 'current down' } },
          { data: [{ team_id: 't-1', power_score: 60 }], error: null },
        ],
        divisions: [visibleDivisions],
      }),
      message: 'Failed to fetch this week\u2019s snapshots',
    },
    {
      failing: "the comparison week's snapshots read",
      queue: () => ({
        power_score_snapshots: [
          snapshotWeeks([6, 5]),
          { data: [{ team_id: 't-1', power_score: 64 }], error: null },
          { data: null, error: { message: 'previous down' } },
        ],
        divisions: [visibleDivisions],
      }),
      message: 'Failed to fetch the comparison week\u2019s snapshots',
    },
    {
      failing: 'the team details read',
      queue: () => ({
        power_score_snapshots: [
          snapshotWeeks([6, 5]),
          { data: [{ team_id: 't-1', power_score: 64 }], error: null },
          { data: [{ team_id: 't-1', power_score: 60 }], error: null },
        ],
        divisions: [visibleDivisions],
        v_team_details: [{ data: null, error: { message: 'details down' } }],
      }),
      message: 'Failed to fetch team details for the recap',
    },
  ])(
    "throws instead of reporting an empty week when $failing fails (today's behaviour)",
    async ({ queue, message }) => {
      createSupabaseMock(queue());

      await expect(fetchPowerScoreTrendsForWeek('s-1', 6)).rejects.toThrow(message);
      expect(mockHandleDatabaseError).toHaveBeenCalledTimes(1);
    }
  );

  it("returns no trends when this week has no snapshots (today's behaviour)", async () => {
    createSupabaseMock({
      power_score_snapshots: [
        snapshotWeeks([6, 5]),
        { data: [], error: null },
        { data: [{ team_id: 't-1', power_score: 60 }], error: null },
      ],
      divisions: [visibleDivisions],
    });

    const result = await fetchPowerScoreTrendsForWeek('s-1', 6);

    expect(result).toMatchObject({ trends: [], currentWeek: 6 });
    // It stops before asking for team details: there is nobody to look up.
    expect(mockFrom).not.toHaveBeenCalledWith('v_team_details');
  });

  it("asks only for scored rows, for this week and the week before (today's behaviour)", async () => {
    createSupabaseMock({
      power_score_snapshots: [
        snapshotWeeks([6, 5]),
        { data: [{ team_id: 't-1', power_score: 64 }], error: null },
        { data: [{ team_id: 't-1', power_score: 60 }], error: null },
      ],
      divisions: [visibleDivisions],
      v_team_details: [teamRows],
    });

    await fetchPowerScoreTrendsForWeek('s-1', 6);

    // Rows with no power score are filtered out by the database, not in code.
    expect(notFiltersForWeek(6)).toEqual([['power_score', 'is', null]]);
    expect(notFiltersForWeek(5)).toEqual([['power_score', 'is', null]]);
  });

  it("stays 'compared' with no trends when every scored team is new this week (today's behaviour)", async () => {
    createSupabaseMock({
      power_score_snapshots: [
        snapshotWeeks([6, 5]),
        // t-1 is scored this week. Week 5 scored only t-2, so no team is in both.
        { data: [{ team_id: 't-1', power_score: 64 }], error: null },
        { data: [{ team_id: 't-2', power_score: 50 }], error: null },
      ],
      divisions: [visibleDivisions],
      v_team_details: [teamRows],
    });

    const result = await fetchPowerScoreTrendsForWeek('s-1', 6);

    expect(result).toEqual({ trends: [], currentWeek: 6, previousWeek: 5, basis: 'compared' });
    // This week HAS a scored team, so the code went on to look the teams up.
    expect(mockFrom).toHaveBeenCalledWith('v_team_details');
  });

  it("stays 'compared' with no trends when the only scored team is in a Hidden division (today's behaviour)", async () => {
    createSupabaseMock({
      power_score_snapshots: [
        snapshotWeeks([6, 5]),
        // t-hidden is scored in both weeks, but its division is Hidden.
        { data: [{ team_id: 't-hidden', power_score: 80 }], error: null },
        { data: [{ team_id: 't-hidden', power_score: 70 }], error: null },
      ],
      divisions: [visibleDivisions],
      v_team_details: [teamRows],
    });

    const result = await fetchPowerScoreTrendsForWeek('s-1', 6);

    expect(result).toEqual({ trends: [], currentWeek: 6, previousWeek: 5, basis: 'compared' });
    expect(mockFrom).toHaveBeenCalledWith('v_team_details');
  });
});

describe('pickTeamOfTheWeek', () => {
  const trend = (teamId: string, delta: number) =>
    ({ teamId, delta }) as Parameters<typeof pickTeamOfTheWeek>[0][number];

  it('picks the biggest riser', () => {
    expect(pickTeamOfTheWeek([trend('a', 1.2), trend('b', 4.5), trend('c', 0.1)])?.teamId).toBe(
      'b'
    );
  });

  it('picks nobody when nothing rose', () => {
    expect(pickTeamOfTheWeek([trend('a', -1), trend('b', 0)])).toBeNull();
  });

  it('picks nobody from an empty week', () => {
    expect(pickTeamOfTheWeek([])).toBeNull();
  });
});
