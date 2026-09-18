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

/** Queues one result per read of a table, in call order, like the sibling suites. */
function createSupabaseMock(queuedByTable: Record<string, QueryResult[]>) {
  const eqCalls: Record<string, unknown[][]> = {};

  mockFrom.mockImplementation((table: string) => {
    const result = (queuedByTable[table] ?? []).shift() ?? { data: null, error: null };
    const query: Record<string, unknown> = {};
    const chain = () => query;

    Object.assign(query, {
      eq: vi.fn((...args: unknown[]) => {
        (eqCalls[table] ??= []).push(args);
        return query;
      }),
      neq: vi.fn(chain),
      lte: vi.fn(chain),
      not: vi.fn(chain),
      in: vi.fn(chain),
      order: vi.fn(() => Promise.resolve(result)),
      then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve),
    });

    return { select: vi.fn(() => query) };
  });

  return eqCalls;
}

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
