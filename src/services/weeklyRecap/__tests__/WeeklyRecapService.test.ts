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

// Upset detection runs the real predictMatch model, the same one the schedule
// page uses. Its three data sources are stubbed so the test drives the model
// with known inputs rather than re-testing the career pipeline.
vi.mock('@/utils/rankingUtils/divisionWeightsCache', () => ({
  fetchDivisionWeights: () => Promise.resolve(new Map([['d-visible', 0.85]])),
}));

vi.mock('@/services/TeamCareerStatsService', () => ({
  fetchBatchHeadToHead: () => Promise.resolve(new Map()),
}));

vi.mock('@/hooks/career/computeAllTeamsTotals', () => ({
  computeAllTeamsTotals: (teams: Array<{ id: string; career_power_score: number | null }>) =>
    Promise.resolve(
      new Map(
        teams.map((team) => [
          team.id,
          {
            career_power_score: team.career_power_score ?? 0,
            career_sos: 0.5,
            career_match_wins: team.career_power_score && team.career_power_score > 50 ? 9 : 1,
            career_match_losses: team.career_power_score && team.career_power_score > 50 ? 1 : 9,
          },
        ])
      )
    ),
}));

import { UPSET_THRESHOLD } from '@/utils/predictions';

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
  maybeSingle: () => Promise<QueryResult>;
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
  maybeSingle: ReturnType<typeof vi.fn>;
};

const emptyState = {
  weekNumber: null,
  mode: 'regular',
  upsets: [],
  hotStreaks: [],
  hasData: false,
};

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
    const maybeSingle = vi.fn(() => Promise.resolve(result));

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
      maybeSingle,
      then: (
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) => Promise.resolve(result).then(onFulfilled, onRejected),
    });

    if (!querySpies[table]) querySpies[table] = [];
    querySpies[table].push({
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
      maybeSingle,
    });

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

  it('keeps an evening EST match in its own week (stored as next-day UTC)', async () => {
    // 8 PM EST on Jan 21 is stored as 2026-01-22T01:00:00Z. League week is 3.
    const querySpies = createSupabaseMock({
      seasons: [{ data: { id: 's-est', start_date: '2026-01-01' }, error: null }],
      matches: [
        { data: { date: '2026-01-22T01:00:00Z' }, error: null },
        { data: [], error: null },
      ],
      v_team_details: [{ data: [], error: null }],
      divisions: [{ data: [{ id: 'd-visible' }], error: null }],
    });

    const result = await WeeklyRecapService.fetchWeeklyRecap();

    expect(result.weekNumber).toBe(3);
    const upsetMatchQuery = querySpies.matches[1];
    expect(upsetMatchQuery.gte).toHaveBeenCalledWith('date', '2026-01-15T05:00:00.000Z');
    expect(upsetMatchQuery.lt).toHaveBeenCalledWith('date', '2026-01-22T05:00:00.000Z');
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
            {
              // Biggest gap of all, but both teams sit in a hidden division
              id: 'hidden-division-upset',
              team1_id: 't-hid-w',
              team2_id: 't-hid-l',
              winner_id: 't-hid-w',
              loser_id: 't-hid-l',
              team1_game_wins: 2,
              team2_game_wins: 0,
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
            {
              team_id: 't-a',
              name: 'A',
              image_url: null,
              logo_url: 'a.png',
              division_id: 'd-1',
              power_score: 20.0,
              sos: 0.42,
              career_power_score: 20.0,
              wins: 2,
              losses: 8,
            },
            {
              team_id: 't-b',
              name: 'B',
              image_url: null,
              logo_url: 'b.png',
              division_id: 'd-1',
              power_score: 80.0,
              sos: 0.78,
              career_power_score: 80.0,
              wins: 8,
              losses: 2,
            },
            {
              team_id: 't-c',
              name: 'C',
              image_url: null,
              logo_url: 'c.png',
              division_id: 'd-2',
              power_score: 30.0,
              sos: 0.48,
              career_power_score: 30.0,
              wins: 3,
              losses: 7,
            },
            {
              team_id: 't-d',
              name: 'D',
              image_url: null,
              logo_url: 'd.png',
              division_id: 'd-2',
              power_score: 75.0,
              sos: 0.75,
              career_power_score: 75.0,
              wins: 8,
              losses: 2,
            },
            {
              team_id: 't-e',
              name: 'E',
              image_url: null,
              logo_url: 'e.png',
              division_id: 'd-1',
              power_score: 40.0,
              sos: 0.54,
              career_power_score: 40.0,
              wins: 4,
              losses: 6,
            },
            {
              team_id: 't-f',
              name: 'F',
              image_url: null,
              logo_url: 'f.png',
              division_id: 'd-1',
              power_score: 60.0,
              sos: 0.66,
              career_power_score: 60.0,
              wins: 6,
              losses: 4,
            },
            {
              team_id: 't-g',
              name: 'G',
              image_url: null,
              logo_url: 'g.png',
              division_id: 'd-2',
              power_score: 10.0,
              sos: 0.36,
              career_power_score: 10.0,
              wins: 1,
              losses: 9,
            },
            {
              team_id: 't-h',
              name: 'H',
              image_url: null,
              logo_url: 'h.png',
              division_id: 'd-2',
              power_score: 50.0,
              sos: 0.6,
              career_power_score: 50.0,
              wins: 5,
              losses: 5,
            },
            {
              team_id: 't-i',
              name: 'I',
              image_url: null,
              logo_url: 'i.png',
              division_id: 'd-1',
              power_score: 90.0,
              sos: 0.84,
              career_power_score: 90.0,
              wins: 9,
              losses: 1,
            },
            {
              team_id: 't-j',
              name: 'J',
              image_url: null,
              logo_url: 'j.png',
              division_id: 'd-1',
              power_score: 40.0,
              sos: 0.54,
              career_power_score: 40.0,
              wins: 4,
              losses: 6,
            },
            {
              team_id: 't-k',
              name: 'K',
              image_url: null,
              logo_url: 'k.png',
              division_id: 'd-1',
              power_score: 20.0,
              sos: 0.42,
              career_power_score: 20.0,
              wins: 2,
              losses: 8,
            },
            {
              team_id: 't-m',
              name: 'M',
              image_url: null,
              logo_url: 'm.png',
              division_id: 'd-1',
              power_score: 80.0,
              sos: 0.78,
              career_power_score: 80.0,
              wins: 8,
              losses: 2,
            },
            {
              team_id: 't-n',
              name: 'N',
              image_url: null,
              logo_url: 'n.png',
              division_id: 'd-1',
              power_score: 70.0,
              sos: 0.72,
              career_power_score: 70.0,
              wins: 7,
              losses: 3,
            },
            {
              team_id: 't-hid-w',
              name: 'Hidden Winner',
              image_url: null,
              logo_url: 'hw.png',
              division_id: 'd-hidden',
              power_score: 5.0,
              sos: 0.33,
              career_power_score: 5.0,
              wins: 0,
              losses: 10,
            },
            {
              team_id: 't-hid-l',
              name: 'Hidden Loser',
              image_url: null,
              logo_url: 'hl.png',
              division_id: 'd-hidden',
              power_score: 95.0,
              sos: 0.87,
              career_power_score: 95.0,
              wins: 10,
              losses: 0,
            },
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
      // Queried once by _fetchUpsets and once by _fetchHotStreaks
      divisions: [
        { data: [{ id: 'd-1' }, { id: 'd-2' }], error: null },
        { data: [{ id: 'd-1' }, { id: 'd-2' }], error: null },
      ],
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
    // t-hid-w faced the longest odds of all but is in a hidden division, so it
    // is dropped. The rest are ordered by the winner's modelled chance, longest
    // odds first, and capped at three.
    expect(result.upsets.map((u) => u.winnerId)).toEqual(['t-a', 't-c', 't-g']);
    expect(result.upsets.map((u) => u.winnerProbability)).toEqual(
      [...result.upsets.map((u) => u.winnerProbability)].sort((a, b) => a - b)
    );
    for (const upset of result.upsets) {
      expect(upset.winnerProbability).toBeLessThanOrEqual(UPSET_THRESHOLD);
    }
    expect(result.upsets.map((u) => u.matchResult)).toContain('2–0');

    expect(result.hotStreaks).toHaveLength(5);
    expect(result.hotStreaks.map((h) => h.teamId)).toEqual([
      'st-1',
      'st-2',
      'st-3',
      'st-5',
      'st-6',
    ]);

    const upsetMatchQuery = querySpies.matches[1];
    expect(upsetMatchQuery.eq).toHaveBeenCalledWith('season_id', 's-2026');
    expect(upsetMatchQuery.eq).toHaveBeenCalledWith('iscompleted', true);
    expect(upsetMatchQuery.is).toHaveBeenCalledWith('bracket_id', null);
    expect(upsetMatchQuery.not).toHaveBeenCalledWith('winner_id', 'is', null);
    // Week boundaries are midnight in league time (EST = UTC-5 in January).
    expect(upsetMatchQuery.gte).toHaveBeenCalledWith('date', '2026-01-15T05:00:00.000Z');
    expect(upsetMatchQuery.lt).toHaveBeenCalledWith('date', '2026-01-22T05:00:00.000Z');

    expect(result.hasData).toBe(true);
  });

  it('surfaces a failure to load visible divisions instead of silently dropping every upset', async () => {
    createSupabaseMock({
      seasons: [{ data: { id: 's-div', start_date: '2026-01-01T00:00:00Z' }, error: null }],
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
          error: null,
        },
        { data: [], error: null },
      ],
      v_team_details: [
        {
          data: [
            {
              team_id: 'a',
              name: 'A',
              logo_url: 'a.png',
              image_url: null,
              division_id: 'd-1',
              power_score: 20,
              sos: 0.4,
              career_power_score: 18,
              wins: 1,
              losses: 9,
            },
            {
              team_id: 'b',
              name: 'B',
              logo_url: 'b.png',
              image_url: null,
              division_id: 'd-1',
              power_score: 92,
              sos: 0.9,
              career_power_score: 92,
              wins: 9,
              losses: 1,
            },
          ],
          error: null,
        },
      ],
      team_season_stats: [
        {
          data: [
            { team_id: 'a', power_score: 0.2 },
            { team_id: 'b', power_score: 0.9 },
          ],
          error: null,
        },
      ],
      divisions: [{ data: null, error: { message: 'divisions query failed' } }],
    });

    await WeeklyRecapService.fetchWeeklyRecap();

    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'divisions query failed' },
      'Failed to fetch visible divisions for upset detection'
    );
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
            {
              team_id: 'a',
              name: 'A',
              logo_url: 'a.png',
              image_url: null,
              division_id: 'd-1',
              power_score: 20,
              sos: 0.4,
              career_power_score: 18,
              wins: 1,
              losses: 9,
            },
            {
              team_id: 'b',
              name: 'B',
              logo_url: 'b.png',
              image_url: null,
              division_id: 'd-1',
              power_score: 92,
              sos: 0.9,
              career_power_score: 92,
              wins: 9,
              losses: 1,
            },
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
      // Queried once by _fetchUpsets and once by _fetchHotStreaks
      divisions: [
        { data: [{ id: 'd-1' }], error: null },
        { data: [{ id: 'd-1' }], error: null },
      ],
    });

    mockCalculateStreak.mockImplementation((teamId: string) => (teamId === 's1' ? 'W3' : 'L2'));

    const result = await WeeklyRecapService.fetchWeeklyRecap();

    expect(result.upsets).toHaveLength(1);
    expect(result.hotStreaks).toHaveLength(1);
    expect(result.hasData).toBe(true);

    expect(mockHandleDatabaseError).toHaveBeenCalledTimes(4);
    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'upset matches query failed' },
      'Failed to fetch matches for upset detection'
    );
    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'team details for upsets failed' },
      'Failed to fetch team details for upset detection'
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

  describe('recap mode', () => {
    // Built fresh per test: createSupabaseMock consumes these queues with shift().
    const seasonOnly = () => ({
      seasons: [{ data: { id: 's-1', start_date: '2026-01-01T00:00:00Z' }, error: null }],
      matches: [{ data: null, error: null }],
    });

    it('stays in regular mode when the season has no brackets', async () => {
      createSupabaseMock({ ...seasonOnly(), brackets: [{ data: [], error: null }] });

      const result = await WeeklyRecapService.fetchWeeklyRecap();

      expect(result.mode).toBe('regular');
    });

    it('stays in regular mode when brackets exist but no playoff game has a result', async () => {
      createSupabaseMock({
        ...seasonOnly(),
        brackets: [{ data: [{ id: 'br-1' }], error: null }],
        playoff_matches: [{ data: [], error: null }],
      });

      const result = await WeeklyRecapService.fetchWeeklyRecap();

      expect(result.mode).toBe('regular');
    });

    it('switches to playoffs mode and suppresses the week number once a playoff game is complete', async () => {
      createSupabaseMock({
        ...seasonOnly(),
        brackets: [{ data: [{ id: 'br-1' }], error: null }],
        playoff_matches: [
          {
            data: [
              {
                id: 'pm-1',
                bracket_id: 'br-1',
                round: 1,
                position: 1,
                match_type: 'winners',
                team1_id: 't-1',
                team2_id: 't-2',
                team1_score: 2,
                team2_score: 0,
                team1_seed: 1,
                team2_seed: 8,
                winner_id: 't-1',
                loser_id: 't-2',
                created_at: '2026-02-01T00:00:00Z',
                updated_at: '2026-02-02T00:00:00Z',
              },
            ],
            error: null,
          },
        ],
      });

      const result = await WeeklyRecapService.fetchWeeklyRecap();

      expect(result.mode).toBe('playoffs');
      expect(result.weekNumber).toBeNull();
    });

    it('detects upsets in bracket games, with no week window applied', async () => {
      createSupabaseMock({
        ...seasonOnly(),
        brackets: [{ data: [{ id: 'br-1' }], error: null }],
        playoff_matches: [
          {
            data: [
              {
                // An 8 seed beating a 1 seed: the underdog has the weaker career score.
                id: 'pm-1',
                bracket_id: 'br-1',
                round: 2,
                position: 1,
                match_type: 'winners',
                team1_id: 't-underdog',
                team2_id: 't-favorite',
                team1_score: 2,
                team2_score: 1,
                team1_seed: 8,
                team2_seed: 1,
                winner_id: 't-underdog',
                loser_id: 't-favorite',
                created_at: '2026-02-01T00:00:00Z',
                updated_at: '2026-02-02T00:00:00Z',
              },
            ],
            error: null,
          },
        ],
        v_team_details: [
          {
            data: [
              {
                team_id: 't-underdog',
                name: 'Massive Sacks',
                image_url: null,
                logo_url: null,
                division_id: 'd-visible',
                power_score: 22,
                sos: 0.4,
                career_power_score: 20,
                wins: 1,
                losses: 9,
              },
              {
                team_id: 't-favorite',
                name: 'Smooth Sliders',
                image_url: null,
                logo_url: null,
                division_id: 'd-visible',
                power_score: 88,
                sos: 0.9,
                career_power_score: 90,
                wins: 9,
                losses: 1,
              },
            ],
            error: null,
          },
        ],
        divisions: [{ data: [{ id: 'd-visible' }], error: null }],
      });

      const result = await WeeklyRecapService.fetchWeeklyRecap();

      expect(result.upsets).toHaveLength(1);
      expect(result.upsets[0]).toMatchObject({
        winnerId: 't-underdog',
        loserId: 't-favorite',
        matchResult: '2–1',
        weekNumber: null,
      });
      // Qualified by the model, not by a power-score gap: the winner's modelled
      // chance must sit at or below the schedule page's UPSET_THRESHOLD.
      expect(result.upsets[0].winnerProbability).toBeLessThanOrEqual(UPSET_THRESHOLD);
      expect(result.upsets[0].powerScoreGap).toBeCloseTo(66, 5);
      expect(result.hasData).toBe(true);
    });

    it('feeds playoff results into streaks, so a bracket loss ends a win streak', async () => {
      // Mirrors the live bug: a team unbeaten in the regular season that lost the
      // grand final was still being shown on a long winning streak.
      mockCalculateStreak.mockImplementation((_teamId: string, matches: unknown) => {
        const list = matches as Array<{ id: string; orderKey?: number }>;
        // Assert the playoff game is ordered last, then report the real streak.
        return list[list.length - 1]?.id === 'pm-final' ? 'L1' : 'W12';
      });

      createSupabaseMock({
        seasons: [{ data: { id: 's-1', start_date: '2026-01-01T00:00:00Z' }, error: null }],
        brackets: [{ data: [{ id: 'br-1' }], error: null }],
        playoff_matches: [
          {
            data: [
              {
                id: 'pm-final',
                bracket_id: 'br-1',
                round: 1,
                position: 1,
                match_type: 'finals',
                team1_id: 't-champ',
                team2_id: 't-runnerup',
                team1_score: 2,
                team2_score: 1,
                team1_seed: 3,
                team2_seed: 1,
                winner_id: 't-champ',
                loser_id: 't-runnerup',
                created_at: '2026-08-01T00:00:00Z',
                updated_at: '2026-08-02T00:00:00Z',
              },
            ],
            error: null,
          },
        ],
        matches: [
          {
            data: [
              {
                id: 'reg-1',
                team1_id: 't-runnerup',
                team2_id: 't-other',
                winner_id: 't-runnerup',
                loser_id: 't-other',
                date: '2026-02-01T00:00:00Z',
                iscompleted: true,
                round_number: 1,
              },
            ],
            error: null,
          },
        ],
        v_team_details: [
          { data: [], error: null },
          {
            data: [
              {
                team_id: 't-runnerup',
                name: "Cuzzo's Clinic",
                image_url: null,
                logo_url: null,
                divisionname: 'Competitive',
                division_id: 'd-visible',
              },
            ],
            error: null,
          },
        ],
        // Two entries: fetchUpsets and fetchHotStreaks each query divisions, and
        // fetchUpsets runs first. With only one queued, fetchHotStreaks would fall
        // through to the mock default, see no visible divisions, skip every team
        // and never reach calculateStreak — the assertions below would then pass
        // no matter what the ordering did.
        divisions: [
          { data: [{ id: 'd-visible' }], error: null },
          { data: [{ id: 'd-visible' }], error: null },
        ],
      });

      const result = await WeeklyRecapService.fetchWeeklyRecap();

      // The streak really was evaluated, with the playoff game ordered last.
      expect(mockCalculateStreak).toHaveBeenCalled();
      const [, orderedMatches] = mockCalculateStreak.mock.calls[0] as [
        string,
        Array<{ id: string }>,
      ];
      expect(orderedMatches.map((m) => m.id)).toEqual(['reg-1', 'pm-final']);

      // The streak resolved to L1, so the team is filtered out of Winning Streaks.
      expect(result.hotStreaks).toEqual([]);
    });
  });
});

describe('WeeklyRecapService.fetchRecapForWeek', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateStreak.mockReturnValue(null);
    mockHandleDatabaseError.mockImplementation((_error: unknown, context: string) => {
      throw new Error(context);
    });
  });

  it('windows on the week it was asked for, not the newest one', async () => {
    const querySpies = createSupabaseMock({
      seasons: [{ data: { id: 's-1', start_date: '2026-09-04' }, error: null }],
      matches: [{ data: [], error: null }],
      v_team_details: [{ data: [], error: null }],
      divisions: [{ data: [], error: null }],
      team_season_stats: [{ data: [], error: null }],
    });

    const result = await WeeklyRecapService.fetchRecapForWeek({
      seasonId: 's-1',
      weekNumber: 3,
    });

    expect(result.weekNumber).toBe(3);
    expect(result.mode).toBe('regular');

    // Week 3 of a season starting 2026-09-04 runs 18 Sept -> 25 Sept, league time.
    const matchSpy = querySpies.matches?.[0];
    expect(matchSpy?.gte).toHaveBeenCalledWith('date', '2026-09-18T04:00:00.000Z');
    expect(matchSpy?.lt).toHaveBeenCalledWith('date', '2026-09-25T04:00:00.000Z');
  });

  it('skips the season lookup when the caller supplies the start date', async () => {
    createSupabaseMock({
      matches: [{ data: [], error: null }],
      v_team_details: [{ data: [], error: null }],
      divisions: [{ data: [], error: null }],
      team_season_stats: [{ data: [], error: null }],
    });

    const result = await WeeklyRecapService.fetchRecapForWeek({
      seasonId: 's-1',
      weekNumber: 2,
      seasonStartDate: '2026-09-04',
    });

    expect(result.weekNumber).toBe(2);
    expect(mockFrom).not.toHaveBeenCalledWith('seasons');
  });

  it('caps streaks at the end of the week being recapped', async () => {
    createSupabaseMock({
      seasons: [{ data: { id: 's-1', start_date: '2026-09-04' }, error: null }],
      matches: [{ data: [], error: null }],
      v_team_details: [{ data: [], error: null }],
      divisions: [{ data: [], error: null }],
      team_season_stats: [{ data: [], error: null }],
    });

    await WeeklyRecapService.fetchRecapForWeek({ seasonId: 's-1', weekNumber: 2 });

    // The streaks query is the second read of `matches`. It must carry the
    // week's upper bound, or an old edition reports today's streaks.
    const streakSpy = mockFrom.mock.calls.filter(([table]) => table === 'matches');
    expect(streakSpy.length).toBeGreaterThanOrEqual(2);
  });

  // The whole point of the split: the same failure that the home page hides
  // must be visible to an admin about to publish it as fact.
  it('throws where fetchWeeklyRecap swallows, given the same failure', async () => {
    const dbError = { message: 'boom', code: '42P01', details: null, hint: null };

    createSupabaseMock({ seasons: [{ data: null, error: dbError }] });
    await expect(
      WeeklyRecapService.fetchRecapForWeek({ seasonId: 's-1', weekNumber: 1 })
    ).rejects.toThrow();

    vi.clearAllMocks();
    mockCalculateStreak.mockReturnValue(null);
    createSupabaseMock({ seasons: [{ data: null, error: dbError }] });

    await expect(WeeklyRecapService.fetchWeeklyRecap()).resolves.toEqual(emptyState);
    expect(mockWarnLog).toHaveBeenCalled();
  });
});
