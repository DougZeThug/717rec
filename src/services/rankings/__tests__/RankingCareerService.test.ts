import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

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

// Import after mocks
import {
  fetchAllTeamsCareerPowerScores,
  fetchHistoricalPowerScores,
  fetchTeamCareerPowerScore,
} from '../RankingCareerService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (message = 'query failed', code = '42P01') => ({
  message,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

/**
 * Creates a chainable, thenable query object that mirrors the Supabase
 * PostgREST builder. Every filter method returns the same chain, and the
 * chain can be awaited directly to resolve to `{ data, error }`.
 */
const makeChain = (result: { data: unknown; error: unknown | null }) => {
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
    then: ((onFulfilled?: any, onRejected?: any) =>
      Promise.resolve(result).then(onFulfilled, onRejected)) as PromiseLike<unknown>['then'],
    catch: (onRejected?: any) => Promise.resolve(result).catch(onRejected),
  };
  return chain;
};

type TableResults = Record<string, { data: unknown; error: unknown | null }>;

const setupTables = (results: TableResults) => {
  mockFrom.mockImplementation((table: string) => {
    if (!(table in results)) {
      throw new Error(`Unexpected table: ${table}`);
    }
    return makeChain(results[table]);
  });
};

// ─── fetchAllTeamsCareerPowerScores ──────────────────────────────────────────

describe('fetchAllTeamsCareerPowerScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns aggregated team career data on success', async () => {
    setupTables({
      seasons: {
        data: [{ id: 's1', name: 'Season 1', start_date: '2024-01-01' }],
        error: null,
      },
      team_season_stats: {
        data: [{ team_id: 't1', season_id: 's1', power_score: 0.8, division_name: 'Open A' }],
        error: null,
      },
      teams: {
        data: [
          {
            id: 't1',
            name: 'Alpha',
            division_id: 'd1',
            divisions: { display_division: 'Open' },
          },
        ],
        error: null,
      },
    });

    const result = await fetchAllTeamsCareerPowerScores();

    expect(result).toHaveLength(1);
    expect(result[0].teamName).toBe('Alpha');
    expect(result[0].seasonData).toHaveLength(1);
    expect(result[0].seasonData[0].powerScore).toBe(0.8);
  });

  it('throws DatabaseError when the seasons query fails', async () => {
    setupTables({
      seasons: { data: null, error: pgError('seasons fetch failed') },
      team_season_stats: { data: [], error: null },
      teams: { data: [], error: null },
    });

    await expect(fetchAllTeamsCareerPowerScores()).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError when the team_season_stats query fails', async () => {
    setupTables({
      seasons: { data: [], error: null },
      team_season_stats: { data: null, error: pgError('stats fetch failed') },
      teams: { data: [], error: null },
    });

    await expect(fetchAllTeamsCareerPowerScores()).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError when the teams query fails', async () => {
    setupTables({
      seasons: { data: [], error: null },
      team_season_stats: { data: [], error: null },
      teams: { data: null, error: pgError('teams fetch failed') },
    });

    await expect(fetchAllTeamsCareerPowerScores()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchHistoricalPowerScores ──────────────────────────────────────────────

describe('fetchHistoricalPowerScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns historicalScores and previousScores on success', async () => {
    setupTables({
      v_team_details: {
        data: [{ team_id: 't1', name: 'Alpha', power_score: 75 }],
        error: null,
      },
      power_score_snapshots: {
        data: [
          { team_id: 't1', power_score: 70, snapshot_date: '2025-01-01', week_number: 1, season_id: 's1' },
        ],
        error: null,
      },
    });

    const result = await fetchHistoricalPowerScores();

    expect(result).toHaveProperty('historicalScores');
    expect(result).toHaveProperty('previousScores');
    expect(result.historicalScores).toHaveLength(1);
    expect(result.historicalScores[0].team_id).toBe('t1');
    // lastWeek should be the historical snapshot (70), not the current (75)
    expect(result.previousScores.t1).toBe(70);
  });

  it('throws DatabaseError when the v_team_details query fails', async () => {
    setupTables({
      v_team_details: { data: null, error: pgError('team details fetch failed') },
      power_score_snapshots: { data: [], error: null },
    });

    await expect(fetchHistoricalPowerScores()).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError when the power_score_snapshots query fails', async () => {
    setupTables({
      v_team_details: { data: [], error: null },
      power_score_snapshots: { data: null, error: pgError('snapshots fetch failed') },
    });

    // Call WITH a teamId to also exercise the `.eq('team_id', teamId)` branch
    await expect(fetchHistoricalPowerScores('t1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTeamCareerPowerScore ───────────────────────────────────────────────

describe('fetchTeamCareerPowerScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped season power score data on success', async () => {
    setupTables({
      team_season_stats: {
        data: [
          {
            season_id: 's1',
            power_score: 0.8,
            playoff_rank: 1,
            division_name: 'Open A',
            champion: true,
            runner_up: false,
          },
        ],
        error: null,
      },
      seasons: {
        data: [{ id: 's1', name: 'Season 1', start_date: '2024-01-01' }],
        error: null,
      },
    });

    const result = await fetchTeamCareerPowerScore('t1');

    expect(result).toHaveLength(1);
    expect(result[0].isChampion).toBe(true);
    // power_score is scaled by ×100 in the service
    expect(result[0].powerScore).toBe(80);
    expect(result[0].seasonName).toBe('Season 1');
  });

  it('early-returns empty array when team has no season stats', async () => {
    setupTables({
      team_season_stats: { data: [], error: null },
      // seasons is intentionally NOT in this map — if the service tries to
      // query it, mockFrom will throw. This proves the short-circuit.
    });

    const result = await fetchTeamCareerPowerScore('t1');

    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalledWith('seasons');
  });

  it('throws DatabaseError when team_season_stats query fails', async () => {
    setupTables({
      team_season_stats: { data: null, error: pgError('stats fetch failed') },
      seasons: { data: [], error: null },
    });

    await expect(fetchTeamCareerPowerScore('t1')).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError when the seasons lookup query fails', async () => {
    setupTables({
      team_season_stats: {
        data: [
          {
            season_id: 's1',
            power_score: 0.8,
            playoff_rank: 1,
            division_name: 'Open A',
            champion: false,
            runner_up: false,
          },
        ],
        error: null,
      },
      seasons: { data: null, error: pgError('seasons fetch failed') },
    });

    await expect(fetchTeamCareerPowerScore('t1')).rejects.toThrow(DatabaseError);
  });
});
