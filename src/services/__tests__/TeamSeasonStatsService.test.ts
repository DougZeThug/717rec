import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const mockFrom = vi.fn();
const mockErrorLog = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: (...args: unknown[]) => mockErrorLog(...args),
  dbLog: vi.fn(),
}));

vi.mock('@/hooks/teams/seasonBreakdown/processSeasonMatches', () => ({
  processSeasonMatches: vi.fn(() => ({
    sweeps: 0,
    closeWins: 0,
    closeLosses: 0,
    divisionRecords: {},
    playoffWins: 0,
    playoffLosses: 0,
  })),
}));

vi.mock('@/hooks/teams/seasonBreakdown/calculateSeasonStats', () => ({
  calculatePowerScoreTrend: vi.fn(() => 'up'),
  calculateBestWorstDivisionTiers: vi.fn(() => ({
    bestDivisionTier: 'Gold',
    worstDivisionTier: 'Silver',
  })),
}));

import { fetchSeasonBreakdown } from '../TeamSeasonStatsService';

type QueryResult = { data: any; error: any };

const createSeasonStatsQuery = (result: QueryResult, selects: string[]) => ({
  select: (columns: string) => {
    selects.push(columns);
    return {
      eq: () => ({
        order: () => Promise.resolve(result),
      }),
    };
  },
});

const createSimpleEqQuery = (result: QueryResult, selects: string[]) => ({
  select: (columns: string) => {
    selects.push(columns);
    return {
      eq: () => Promise.resolve(result),
    };
  },
});

const createOrEqQuery = (result: QueryResult, selects: string[]) => ({
  select: (columns: string) => {
    selects.push(columns);
    return {
      or: () => ({
        eq: () => Promise.resolve(result),
      }),
    };
  },
});

const createOrNotQuery = (result: QueryResult, selects: string[]) => ({
  select: (columns: string) => {
    selects.push(columns);
    return {
      or: () => ({
        not: () => Promise.resolve(result),
      }),
    };
  },
});

const createInQuery = (result: QueryResult, selects: string[]) => ({
  select: (columns: string) => {
    selects.push(columns);
    return {
      in: () => Promise.resolve(result),
    };
  },
});

const seasonRow = (overrides?: Partial<any>) => ({
  season_id: 's1',
  match_wins: 8,
  match_losses: 2,
  game_wins: 17,
  game_losses: 7,
  sos: 0.71,
  power_score: 0.9,
  champion: true,
  runner_up: false,
  playoff_rank: 1,
  division_name: 'Alpha',
  seasons: { id: 's1', name: 'Season 1', start_date: '2025-01-01' },
  ...overrides,
});

describe('fetchSeasonBreakdown', () => {
  const selectCalls: Record<string, string[]> = {
    team_season_stats: [],
    matches: [],
    matches_archive: [],
    playoff_matches: [],
    brackets: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(selectCalls).forEach((arr) => arr.splice(0, arr.length));
  });

  const setupQueries = (overrides?: Partial<Record<string, QueryResult>>) => {
    const results: Record<string, QueryResult> = {
      team_season_stats: { data: [seasonRow(), seasonRow({ season_id: 's2', power_score: 0.6 })], error: null },
      all_team_season_stats: {
        data: [
          { team_id: 'team-1', season_id: 's1', division_name: 'Alpha' },
          { team_id: 'team-2', season_id: 's1', division_name: 'Beta' },
        ],
        error: null,
      },
      matches: {
        data: [
          {
            winner_id: 'team-1', loser_id: 'team-2', team1_game_wins: 2, team2_game_wins: 1,
            team1_id: 'team-1', team2_id: 'team-2', season_id: 's1',
          },
          {
            winner_id: 'team-1', loser_id: 'team-3', team1_game_wins: 2, team2_game_wins: 0,
            team1_id: 'team-1', team2_id: 'team-3', season_id: 's2',
          },
        ],
        error: null,
      },
      matches_archive: { data: [], error: null },
      playoff_matches: {
        data: [
          {
            winner_id: 'team-1', loser_id: 'team-4', team1_score: 2, team2_score: 1,
            team1_id: 'team-1', team2_id: 'team-4', bracket_id: 'b1',
          },
        ],
        error: null,
      },
      brackets: {
        data: [{ id: 'b1', season_id: 's1', divisions: { division_weight: 1 } }],
        error: null,
      },
    };

    const merged = { ...results, ...overrides };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'team_season_stats') {
        if (selectCalls.team_season_stats.length === 0) {
          return createSeasonStatsQuery(merged.team_season_stats, selectCalls.team_season_stats);
        }
        return createSimpleEqQuery(merged.all_team_season_stats, selectCalls.team_season_stats);
      }
      if (table === 'matches') return createOrEqQuery(merged.matches, selectCalls.matches);
      if (table === 'matches_archive') {
        return createOrEqQuery(merged.matches_archive, selectCalls.matches_archive);
      }
      if (table === 'playoff_matches') {
        return createOrNotQuery(merged.playoff_matches, selectCalls.playoff_matches);
      }
      if (table === 'brackets') return createInQuery(merged.brackets, selectCalls.brackets);
      throw new Error(`Unexpected table: ${table}`);
    });
  };

  it('filters and groups records by season, then computes aggregated values', async () => {
    setupQueries();

    const result = await fetchSeasonBreakdown('team-1');

    expect(result?.seasons).toHaveLength(2);
    expect(result?.seasons.map((s) => s.seasonId)).toEqual(['s1', 's2']);
    expect(result?.averagePowerScore).toBe(75);
    expect(result?.bestSeason?.seasonId).toBe('s1');
    expect(result?.worstSeason?.seasonId).toBe('s2');
  });

  it('returns a safe empty shape when no season rows exist', async () => {
    setupQueries({ team_season_stats: { data: [], error: null } });

    const result = await fetchSeasonBreakdown('team-1');

    expect(result).toEqual({
      seasons: [],
      bestSeason: null,
      worstSeason: null,
      averagePowerScore: 0,
      powerScoreTrend: 'stable',
      bestDivisionTier: null,
      worstDivisionTier: null,
    });
  });

  it('throws DatabaseError when team season stats query fails', async () => {
    setupQueries({
      team_season_stats: {
        data: null,
        error: {
          message: 'query failed',
          code: '42P01',
          details: null,
          hint: null,
          name: 'PostgrestError',
        },
      },
    });

    await expect(fetchSeasonBreakdown('team-1')).rejects.toThrow(DatabaseError);
  });

  it('uses explicit column lists in all select queries', async () => {
    setupQueries();

    await fetchSeasonBreakdown('team-1');

    const allSelects = [
      ...selectCalls.team_season_stats,
      ...selectCalls.matches,
      ...selectCalls.matches_archive,
      ...selectCalls.playoff_matches,
      ...selectCalls.brackets,
    ];

    expect(allSelects.length).toBeGreaterThan(0);
    allSelects.forEach((columns) => {
      expect(columns).not.toContain('*');
    });

    expect(selectCalls.team_season_stats[0]).toContain('season_id');
    expect(selectCalls.matches[0]).toContain('winner_id');
    expect(selectCalls.playoff_matches[0]).toContain('bracket_id');
    expect(selectCalls.brackets[0]).toContain('divisions(division_weight)');
  });
});
