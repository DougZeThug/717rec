import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  matchLog: vi.fn(),
  teamLog: vi.fn(),
  authLog: vi.fn(),
  warnLog: vi.fn(),
  scoreLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { warnLog } from '@/utils/logger';

// Import after mocks
import {
  fetchPowerScoreTrends,
  fetchWeeklyPowerScoreTrends,
} from '../RankingTrendsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (message = 'query failed', code = '42P01') => ({
  message,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

type Result = { data: unknown; error: unknown | null };

/**
 * Creates a chainable, thenable query object that mirrors the Supabase
 * PostgREST builder. Every filter method returns the same chain, and the
 * chain can be awaited directly OR terminated with `.single()`.
 */
const makeChain = (result: Result) => {
  const chain: Record<string, unknown> & PromiseLike<unknown> = {
    select: () => chain,
    order: () => chain,
    eq: () => chain,
    in: () => chain,
    neq: () => chain,
    not: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: ((
      onFulfilled?: ((value: unknown) => unknown) | null,
      onRejected?: ((reason: unknown) => unknown) | null,
    ) =>
      Promise.resolve(result).then(onFulfilled, onRejected)) as PromiseLike<unknown>['then'],
    catch: (onRejected?: ((reason: unknown) => unknown) | null) =>
      Promise.resolve(result).catch(onRejected),
  };
  return chain;
};

/**
 * Per-table queue of results. Each call to `supabase.from(table)` pops the
 * next queued result for that table. Falls back to `{data:null, error:null}`
 * if the queue is exhausted (which matches the service's error-tolerant
 * behavior — it swallows errors and returns empty results).
 */
const queues: Record<string, Result[]> = {};

const queueResult = (table: string, result: Result) => {
  if (!queues[table]) queues[table] = [];
  queues[table].push(result);
};

const resetQueues = () => {
  for (const k of Object.keys(queues)) delete queues[k];
};

// ─── fetchPowerScoreTrends ───────────────────────────────────────────────────

describe('fetchPowerScoreTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueues();
    mockFrom.mockImplementation((table: string) => {
      const q = queues[table];
      const next = q && q.length > 0 ? q.shift()! : { data: null, error: null };
      return makeChain(next);
    });
  });

  it('returns [] when no active season exists', async () => {
    queueResult('seasons', { data: null, error: null });

    const result = await fetchPowerScoreTrends();

    expect(result).toEqual([]);
  });

  it('returns [] when there is no previous season', async () => {
    queueResult('seasons', { data: { id: 's1' }, error: null }); // active season
    queueResult('seasons', { data: [{ id: 's1', start_date: '2025-01-01' }], error: null }); // only 1 season

    const result = await fetchPowerScoreTrends();

    expect(result).toEqual([]);
  });

  it('returns [] when current season query has an error', async () => {
    queueResult('seasons', { data: { id: 's1' }, error: null });
    queueResult('seasons', {
      data: [
        { id: 's2', start_date: '2025-01-01' },
        { id: 's1', start_date: '2024-01-01' },
      ],
      error: null,
    });
    queueResult('v_team_details', { data: null, error: pgError('current fetch failed') });

    const result = await fetchPowerScoreTrends();

    expect(result).toEqual([]);
    expect(warnLog).toHaveBeenCalled();
  });

  it('returns [] when previous season query has an error', async () => {
    queueResult('seasons', { data: { id: 's1' }, error: null });
    queueResult('seasons', {
      data: [
        { id: 's2', start_date: '2025-01-01' },
        { id: 's1', start_date: '2024-01-01' },
      ],
      error: null,
    });
    queueResult('v_team_details', { data: [], error: null });
    queueResult('team_season_stats', { data: null, error: pgError('previous fetch failed') });

    const result = await fetchPowerScoreTrends();

    expect(result).toEqual([]);
    expect(warnLog).toHaveBeenCalled();
  });

  it('returns trend rows on full success', async () => {
    queueResult('seasons', { data: { id: 's2' }, error: null });
    queueResult('seasons', {
      data: [
        { id: 's2', start_date: '2025-01-01' },
        { id: 's1', start_date: '2024-01-01' },
      ],
      error: null,
    });
    queueResult('v_team_details', {
      data: [
        {
          team_id: 't1',
          name: 'Alpha',
          divisionname: 'Open',
          division_id: 'd1',
          logo_url: null,
          image_url: null,
          power_score: 90,
        },
      ],
      error: null,
    });
    queueResult('team_season_stats', {
      data: [{ team_id: 't1', power_score: 70 }],
      error: null,
    });
    queueResult('divisions', { data: [{ id: 'd1' }], error: null });

    const result = await fetchPowerScoreTrends();

    expect(result).toHaveLength(1);
    expect(result[0].teamId).toBe('t1');
    expect(result[0].currentScore).toBe(90);
    expect(result[0].previousScore).toBe(70);
    expect(result[0].delta).toBe(20);
  });

  it('respects the limit parameter', async () => {
    queueResult('seasons', { data: { id: 's2' }, error: null });
    queueResult('seasons', {
      data: [
        { id: 's2', start_date: '2025-01-01' },
        { id: 's1', start_date: '2024-01-01' },
      ],
      error: null,
    });
    queueResult('v_team_details', {
      data: [
        {
          team_id: 't1',
          name: 'Alpha',
          divisionname: 'Open',
          division_id: 'd1',
          logo_url: null,
          image_url: null,
          power_score: 90,
        },
        {
          team_id: 't2',
          name: 'Beta',
          divisionname: 'Open',
          division_id: 'd1',
          logo_url: null,
          image_url: null,
          power_score: 85,
        },
        {
          team_id: 't3',
          name: 'Gamma',
          divisionname: 'Open',
          division_id: 'd1',
          logo_url: null,
          image_url: null,
          power_score: 80,
        },
      ],
      error: null,
    });
    queueResult('team_season_stats', {
      data: [
        { team_id: 't1', power_score: 70 },
        { team_id: 't2', power_score: 75 },
        { team_id: 't3', power_score: 78 },
      ],
      error: null,
    });
    queueResult('divisions', { data: [{ id: 'd1' }], error: null });

    const result = await fetchPowerScoreTrends('up', 2);

    expect(result).toHaveLength(2);
  });
});

// ─── fetchWeeklyPowerScoreTrends ─────────────────────────────────────────────

describe('fetchWeeklyPowerScoreTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueues();
    mockFrom.mockImplementation((table: string) => {
      const q = queues[table];
      const next = q && q.length > 0 ? q.shift()! : { data: null, error: null };
      return makeChain(next);
    });
  });

  it('returns {trends:[], hasData:false, latestWeek:null} when no active season', async () => {
    queueResult('seasons', { data: null, error: null });

    const result = await fetchWeeklyPowerScoreTrends();

    expect(result).toEqual({ trends: [], hasData: false, latestWeek: null });
  });

  it('returns {trends:[], hasData:false, latestWeek:null} when weekNumbers is empty', async () => {
    queueResult('seasons', { data: { id: 's1' }, error: null });
    queueResult('power_score_snapshots', { data: [], error: null });
    queueResult('divisions', { data: [{ id: 'd1' }], error: null });

    const result = await fetchWeeklyPowerScoreTrends();

    expect(result).toEqual({ trends: [], hasData: false, latestWeek: null });
  });

  it('returns {trends:[], hasData:true, latestWeek:<week>} when only one unique week exists', async () => {
    queueResult('seasons', { data: { id: 's1' }, error: null });
    queueResult('power_score_snapshots', {
      data: [{ week_number: 5 }, { week_number: 5 }],
      error: null,
    });
    queueResult('divisions', { data: [{ id: 'd1' }], error: null });

    const result = await fetchWeeklyPowerScoreTrends();

    expect(result).toEqual({ trends: [], hasData: true, latestWeek: 5 });
  });

  it('returns {trends:[], hasData:true, latestWeek:<currentWeek>} when a weekly snapshot query returns null data', async () => {
    queueResult('seasons', { data: { id: 's1' }, error: null });
    queueResult('power_score_snapshots', {
      data: [{ week_number: 2 }, { week_number: 1 }],
      error: null,
    });
    queueResult('divisions', { data: [{ id: 'd1' }], error: null });
    // current week snapshots — null data triggers the early return
    queueResult('power_score_snapshots', { data: null, error: null });
    queueResult('power_score_snapshots', { data: [], error: null });

    const result = await fetchWeeklyPowerScoreTrends();

    expect(result).toEqual({ trends: [], hasData: true, latestWeek: 2 });
  });

  it('returns computed trend rows on full success', async () => {
    queueResult('seasons', { data: { id: 's1' }, error: null });
    queueResult('power_score_snapshots', {
      data: [{ week_number: 2 }, { week_number: 1 }],
      error: null,
    });
    queueResult('divisions', { data: [{ id: 'd1' }], error: null });
    queueResult('power_score_snapshots', {
      data: [{ team_id: 't1', power_score: 90 }],
      error: null,
    });
    queueResult('power_score_snapshots', {
      data: [{ team_id: 't1', power_score: 70 }],
      error: null,
    });
    queueResult('v_team_details', {
      data: [
        {
          team_id: 't1',
          name: 'Alpha',
          divisionname: 'Open',
          division_id: 'd1',
          logo_url: null,
          image_url: null,
        },
      ],
      error: null,
    });

    const result = await fetchWeeklyPowerScoreTrends();

    expect(result.hasData).toBe(true);
    expect(result.latestWeek).toBe(2);
    expect(result.trends).toHaveLength(1);
    expect(result.trends[0].teamId).toBe('t1');
    expect(result.trends[0].delta).toBe(20);
    expect(result.trends[0].currentWeek).toBe(2);
    expect(result.trends[0].previousWeek).toBe(1);
  });

  it('does not throw on an unexpected database error', async () => {
    // Every query returns an error, but the service must still resolve
    // (never throws, per its contract).
    queueResult('seasons', { data: null, error: pgError('seasons fetch failed') });

    await expect(fetchWeeklyPowerScoreTrends()).resolves.toEqual({
      trends: [],
      hasData: false,
      latestWeek: null,
    });
  });
});
