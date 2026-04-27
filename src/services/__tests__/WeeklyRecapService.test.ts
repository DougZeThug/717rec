import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockHandleDatabaseError, mockCalculateStreak, mockWarnLog } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockHandleDatabaseError: vi.fn(),
  mockCalculateStreak: vi.fn(),
  mockWarnLog: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/errorHandler', () => ({
  handleDatabaseError: (...args: unknown[]) => mockHandleDatabaseError(...args),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  dbLog: vi.fn(),
  warnLog: (...args: unknown[]) => mockWarnLog(...args),
}));

vi.mock('@/utils/rankingUtils/calculateStreak', () => ({
  calculateStreak: (...args: unknown[]) => mockCalculateStreak(...args),
}));

import { WeeklyRecapService } from '../WeeklyRecapService';

type QueryResult = { data: unknown; error: unknown };

type QueryChain = PromiseLike<QueryResult> & {
  eq: (column: string, value: unknown) => QueryChain;
  is: (column: string, value: unknown) => QueryChain;
  not: (column: string, operator: string, value: unknown) => QueryChain;
  in: (column: string, values: unknown[]) => QueryChain;
  neq: (column: string, value: unknown) => QueryChain;
  gte: (column: string, value: unknown) => QueryChain;
  lt: (column: string, value: unknown) => QueryChain;
  order: (column: string, options?: unknown) => QueryChain;
  limit: (count: number) => QueryChain;
  single: () => Promise<QueryResult>;
};

type QuerySpy = {
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

const emptyState = { weekNumber: null, upsets: [], hotStreaks: [], hasData: false };

function createSupabaseMock(queuedByTable: Record<string, QueryResult[]>) {
  const querySpies: Record<string, QuerySpy[]> = {};

  mockFrom.mockImplementation((table: string) => {
    const queue = queuedByTable[table] ?? [];
    const result = queue.shift() ?? { data: null, error: null };

    const query = {} as QueryChain;

    const eq = vi.fn(() => query);
    const is = vi.fn(() => query);
    const not = vi.fn(() => query);
    const inFn = vi.fn(() => query);
    const neq = vi.fn(() => query);
    const gte = vi.fn(() => query);
    const lt = vi.fn(() => query);
    const order = vi.fn(() => query);
    const limit = vi.fn(() => query);
    const single = vi.fn(() => Promise.resolve(result));

    Object.assign(query, {
      eq,
      is,
      not,
      in: inFn,
      neq,
      gte,
      lt,
      order,
      limit,
      single,
      then: (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(onFulfilled, onRejected),
    });

    if (!querySpies[table]) querySpies[table] = [];
    querySpies[table].push({ eq, is, not, in: inFn, neq, gte, lt, order, limit, single });

    return {
      select: vi.fn(() => query),
    };
  });

  return querySpies;
}

describe('WeeklyRecapService.fetchWeeklyRecap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateStreak.mockReturnValue(null);
  });

  it('returns empty response when there is no active season', async () => {
    createSupabaseMock({
      seasons: [{ data: null, error: null }],
    });

    const result = await WeeklyRecapService.fetchWeeklyRecap();

    expect(result).toEqual(emptyState);
  });

  it('uses hot-streak-only path when latest completed match date is missing', async () => {
    mockCalculateStreak.mockImplementation((teamId: string) => (teamId === 't-1' ? 'W4' : 'W2'));

    createSupabaseMock({
      seasons: [{ data: { id: 's-1', start_date: '2026-01-01T00:00:00Z' }, error: null }],
      matches: [
        { data: null, error: null },
        {
          data: [
            {
              id: 'm-1',
              team1_id: 't-1',
              team2_id: 't-2',
              winner_id: 't-1',
              loser_id: 't-2',
              date: '2026-01-10T10:00:00Z',
              iscompleted: true,
              round_number: 1,
            },
          ],
          error: null,
        },
      ],
      v_team_details: [
        {
          data: [
            {
              team_id: 't-1',
              name: 'Alpha',
              image_url: 'alpha.png',
              logo_url: null,
              divisionname: 'Premier',
              division_id: 'd-visible',
            },
            {
              team_id: 't-2',
              name: 'Beta',
              image_url: 'beta.png',
              logo_url: null,
              divisionname: 'Premier',
              division_id: 'd-visible',
            },
          ],
          error: null,
        },
      ],
      divisions: [{ data: [{ id: 'd-visible' }], error: null }],
    });

    const result = await WeeklyRecapService.fetchWeeklyRecap();

    expect(result.weekNumber).toBeNull();
    expect(result.upsets).toEqual([]);
    expect(result.hotStreaks).toHaveLength(1);
    expect(result.hotStreaks[0]).toMatchObject({ teamId: 't-1', streak: 'W4' });
    expect(result.hasData).toBe(true);
  });

  it('computes week number and returns filtered/sorted/capped upsets and hot streaks', async () => {
    const querySpies = createSupabaseMock({
      seasons: [{ data: { id: 's-2026', start_date: '2026-01-01T00:00:00Z' }, error: null }],
      matches: [
        { data: { date: '2026-01-18T12:00:00Z' }, error: null },
        {
          data: [
            {
              id: 'u1',
              team1_id: 't-a',
              team2_id: 't-b',
              winner_id: 't-a',
              loser_id: 't-b',
              team1_game_wins: 2,
              team2_game_wins: 0,
            },
            {
              id: 'u2',
              team1_id: 't-c',
              team2_id: 't-d',
              winner_id: 't-c',
              loser_id: 't-d',
              team1_game_wins: 2,
              team2_game_wins: 1,
            },
            {
              id: 'u3',
              team1_id: 't-e',
              team2_id: 't-f',
              winner_id: 't-e',
              loser_id: 't-f',
              team1_game_wins: 3,
              team2_game_wins: 2,
            },
            {
              id: 'u4',
              team1_id: 't-g',
              team2_id: 't-h',
              winner_id: 't-g',
              loser_id: 't-h',
              team1_game_wins: 2,
              team2_game_wins: 1,
            },
            {
              id: 'no-upset',
              team1_id: 't-i',
              team2_id: 't-j',
              winner_id: 't-i',
              loser_id: 't-j',
              team1_game_wins: 2,
              team2_game_wins: 1,
            },
            {
              id: 'missing-team-info',
              team1_id: 't-k',
              team2_id: 't-l',
              winner_id: 't-k',
              loser_id: 't-l',
              team1_game_wins: 2,
              team2_game_wins: 1,
            },
            {
              id: 'missing-career-score',
              team1_id: 't-m',
              team2_id: 't-n',
              winner_id: 't-m',
              loser_id: 't-n',
              team1_game_wins: 2,
              team2_game_wins: 1,
            },
          ],
          error: null,
        },
        {
          data: [
            {
              id: 'ms-1',
              team1_id: 'st-1',
              team2_id: 'st-2',
              winner_id: 'st-1',
              loser_id: 'st-2',
              date: '2026-01-05T00:00:00Z',
              iscompleted: true,
              round_number: 1,
            },
            {
              id: 'ms-2',
              team1_id: 'st-3',
              team2_id: 'st-4',
              winner_id: 'st-3',
              loser_id: 'st-4',
              date: '2026-01-06T00:00:00Z',
              iscompleted: true,
              round_number: 1,
            },
            {
              id: 'ms-3',
              team1_id: 'st-5',
              team2_id: 'st-6',
              winner_id: 'st-5',
              loser_id: 'st-6',
              date: '2026-01-07T00:00:00Z',
              iscompleted: true,
              round_number: 2,
            },
            {
              id: 'ms-4',
              team1_id: 'st-7',
              team2_id: 'st-8',
              winner_id: 'st-7',
              loser_id: 'st-8',
              date: '2026-01-08T00:00:00Z',
              iscompleted: true,
              round_number: 2,
            },
          ],
          error: null,
        },
      ],
      v_team_details: [
        {
          data: [
            { team_id: 't-a', name: 'A', image_url: null, logo_url: 'a.png' },
            { team_id: 't-b', name: 'B', image_url: null, logo_url: 'b.png' },
            { team_id: 't-c', name: 'C', image_url: null, logo_url: 'c.png' },
            { team_id: 't-d', name: 'D', image_url: null, logo_url: 'd.png' },
            { team_id: 't-e', name: 'E', image_url: null, logo_url: 'e.png' },
            { team_id: 't-f', name: 'F', image_url: null, logo_url: 'f.png' },
            { team_id: 't-g', name: 'G', image_url: null, logo_url: 'g.png' },
            { team_id: 't-h', name: 'H', image_url: null, logo_url: 'h.png' },
            { team_id: 't-i', name: 'I', image_url: null, logo_url: 'i.png' },
            { team_id: 't-j', name: 'J', image_url: null, logo_url: 'j.png' },
            { team_id: 't-k', name: 'K', image_url: null, logo_url: 'k.png' },
            { team_id: 't-m', name: 'M', image_url: null, logo_url: 'm.png' },
            { team_id: 't-n', name: 'N', image_url: null, logo_url: 'n.png' },
          ],
          error: null,
        },
        {
          data: [
            {
              team_id: 'st-1',
              name: 'Streak One',
              image_url: null,
              logo_url: 'st1.png',
              divisionname: 'Visible One',
              division_id: 'd-1',
            },
            {
              team_id: 'st-2',
              name: 'Streak Two',
              image_url: null,
              logo_url: 'st2.png',
              divisionname: 'Visible One',
              division_id: 'd-1',
            },
            {
              team_id: 'st-3',
              name: 'Streak Three',
              image_url: null,
              logo_url: 'st3.png',
              divisionname: 'Visible Two',
              division_id: 'd-2',
            },
            {
              team_id: 'st-4',
              name: 'Hidden Team',
              image_url: null,
              logo_url: 'st4.png',
              divisionname: 'Hidden',
              division_id: 'd-hidden',
            },
            {
              team_id: 'st-5',
              name: 'Streak Five',
              image_url: null,
              logo_url: 'st5.png',
              divisionname: 'Visible One',
              division_id: 'd-1',
            },
            {
              team_id: 'st-6',
              name: 'Streak Six',
              image_url: null,
              logo_url: 'st6.png',
              divisionname: 'Visible Two',
              division_id: 'd-2',
            },
            {
              team_id: 'st-7',
              name: 'Streak Seven',
              image_url: null,
              logo_url: 'st7.png',
              divisionname: 'Visible Two',
              division_id: 'd-2',
            },
            {
              team_id: 'st-8',
              name: 'Streak Eight',
              image_url: null,
              logo_url: 'st8.png',
              divisionname: 'Visible One',
              division_id: 'd-1',
            },
          ],
          error: null,
        },
      ],
      team_season_stats: [
        {
          data: [
            { team_id: 't-a', power_score: 0.2 },
            { team_id: 't-b', power_score: 0.8 },
            { team_id: 't-c', power_score: 0.3 },
            { team_id: 't-d', power_score: 0.75 },
            { team_id: 't-e', power_score: 0.4 },
            { team_id: 't-f', power_score: 0.6 },
            { team_id: 't-g', power_score: 0.1 },
            { team_id: 't-h', power_score: 0.5 },
            { team_id: 't-i', power_score: 0.9 },
            { team_id: 't-j', power_score: 0.4 },
            { team_id: 't-k', power_score: 0.2 },
            { team_id: 't-l', power_score: 0.8 },
            { team_id: 't-n', power_score: 0.7 },
          ],
          error: null,
        },
      ],
      divisions: [{ data: [{ id: 'd-1' }, { id: 'd-2' }], error: null }],
    });

    mockCalculateStreak.mockImplementation((teamId: string) => {
      const map: Record<string, string | null> = {
        'st-1': 'W7',
        'st-2': 'W6',
        'st-3': 'W5',
        'st-4': 'W9',
        'st-5': 'W4',
        'st-6': 'W3',
        'st-7': 'L6',
        'st-8': 'W2',
      };
      return map[teamId] ?? null;
    });

    const result = await WeeklyRecapService.fetchWeeklyRecap();

    expect(result.weekNumber).toBe(3);

    expect(result.upsets).toHaveLength(3);
    expect(result.upsets.map((u) => u.winnerId)).toEqual(['t-a', 't-c', 't-g']);
    expect(result.upsets.map((u) => u.powerScoreGap)).toEqual([60, 45, 40]);
    expect(result.upsets[0].matchResult).toBe('2–0');
    expect(result.upsets[1].matchResult).toBe('2–1');

    expect(result.hotStreaks).toHaveLength(5);
    expect(result.hotStreaks.map((h) => h.teamId)).toEqual(['st-1', 'st-2', 'st-3', 'st-5', 'st-6']);

    const upsetMatchQuery = querySpies.matches[1];
    expect(upsetMatchQuery.eq).toHaveBeenCalledWith('season_id', 's-2026');
    expect(upsetMatchQuery.eq).toHaveBeenCalledWith('iscompleted', true);
    expect(upsetMatchQuery.is).toHaveBeenCalledWith('bracket_id', null);
    expect(upsetMatchQuery.not).toHaveBeenCalledWith('winner_id', 'is', null);
    expect(upsetMatchQuery.gte).toHaveBeenCalledWith('date', '2026-01-15T00:00:00.000Z');
    expect(upsetMatchQuery.lt).toHaveBeenCalledWith('date', '2026-01-22T00:00:00.000Z');

    expect(result.hasData).toBe(true);
  });

  it('returns safe empty response when top-level flow throws', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await WeeklyRecapService.fetchWeeklyRecap();

    expect(result).toEqual(emptyState);
    expect(mockWarnLog).toHaveBeenCalledTimes(1);
  });

  it('invokes error handler for query errors and continues when data is still available', async () => {
    createSupabaseMock({
      seasons: [{ data: { id: 's-err', start_date: '2026-01-01T00:00:00Z' }, error: null }],
      matches: [
        { data: { date: '2026-01-12T00:00:00Z' }, error: null },
        {
          data: [
            {
              id: 'up-1',
              team1_id: 'a',
              team2_id: 'b',
              winner_id: 'a',
              loser_id: 'b',
              team1_game_wins: 2,
              team2_game_wins: 1,
            },
          ],
          error: { message: 'upset matches query failed' },
        },
        {
          data: [
            {
              id: 'm-1',
              team1_id: 's1',
              team2_id: 's2',
              winner_id: 's1',
              loser_id: 's2',
              date: '2026-01-02T00:00:00Z',
              iscompleted: true,
              round_number: 1,
            },
          ],
          error: { message: 'hot streak matches query failed' },
        },
      ],
      v_team_details: [
        {
          data: [
            { team_id: 'a', name: 'A', logo_url: 'a.png', image_url: null },
            { team_id: 'b', name: 'B', logo_url: 'b.png', image_url: null },
          ],
          error: { message: 'team details for upsets failed' },
        },
        {
          data: [
            {
              team_id: 's1',
              name: 'S1',
              logo_url: 's1.png',
              image_url: null,
              divisionname: 'Visible',
              division_id: 'd-1',
            },
            {
              team_id: 's2',
              name: 'S2',
              logo_url: 's2.png',
              image_url: null,
              divisionname: 'Visible',
              division_id: 'd-1',
            },
          ],
          error: { message: 'team details for streaks failed' },
        },
      ],
      team_season_stats: [
        {
          data: [
            { team_id: 'a', power_score: 0.2 },
            { team_id: 'b', power_score: 0.9 },
          ],
          error: { message: 'career stats failed' },
        },
      ],
      divisions: [{ data: [{ id: 'd-1' }], error: null }],
    });

    mockCalculateStreak.mockImplementation((teamId: string) => (teamId === 's1' ? 'W3' : 'L2'));

    const result = await WeeklyRecapService.fetchWeeklyRecap();

    expect(result.upsets).toHaveLength(1);
    expect(result.hotStreaks).toHaveLength(1);
    expect(result.hasData).toBe(true);

    expect(mockHandleDatabaseError).toHaveBeenCalledTimes(5);
    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'upset matches query failed' },
      'Failed to fetch matches for upset detection'
    );
    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'team details for upsets failed' },
      'Failed to fetch team details for upset detection'
    );
    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'career stats failed' },
      'Failed to fetch career stats for upset detection'
    );
    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'hot streak matches query failed' },
      'Failed to fetch matches for streak calculation'
    );
    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'team details for streaks failed' },
      'Failed to fetch team details for streak display'
    );
  });
});
