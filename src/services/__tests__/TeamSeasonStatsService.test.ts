import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, NotFoundError } from '@/types/errors';

interface PostgrestErrorLike {
  message: string;
  code: string;
  details: string | null;
  hint: string | null;
  name: string;
}

interface QueryResult<TData> {
  data: TData | null;
  error: PostgrestErrorLike | null;
}

interface SeasonRow {
  season_id: string;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  sos: number;
  power_score: number;
  champion: boolean;
  runner_up: boolean;
  playoff_rank: number;
  division_name: string;
  seasons: {
    id: string;
    name: string;
    start_date: string;
  };
}

const mockFrom = vi.fn();
const mockErrorLog = vi.fn();
const mockDbLog = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: (...args: unknown[]) => mockErrorLog(...args),
  dbLog: (...args: unknown[]) => mockDbLog(...args),
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

import { batchUpdateSeasonStats, fetchSeasonBreakdown } from '../TeamSeasonStatsService';

const createSeasonStatsQuery = <TData>(result: QueryResult<TData>, selects: string[]) => ({
  select: (columns: string) => {
    selects.push(columns);
    return {
      eq: () => ({
        order: () => Promise.resolve(result),
      }),
    };
  },
});

const createSimpleEqQuery = <TData>(result: QueryResult<TData>, selects: string[]) => ({
  select: (columns: string) => {
    selects.push(columns);
    return {
      eq: () => Promise.resolve(result),
    };
  },
});

const createOrEqQuery = <TData>(result: QueryResult<TData>, selects: string[]) => ({
  select: (columns: string) => {
    selects.push(columns);
    return {
      or: () => ({
        eq: () => Promise.resolve(result),
      }),
    };
  },
});

const createOrNotQuery = <TData>(result: QueryResult<TData>, selects: string[]) => ({
  select: (columns: string) => {
    selects.push(columns);
    return {
      or: () => ({
        not: () => Promise.resolve(result),
      }),
    };
  },
});

const createInQuery = <TData>(result: QueryResult<TData>, selects: string[]) => ({
  select: (columns: string) => {
    selects.push(columns);
    return {
      in: () => Promise.resolve(result),
    };
  },
});

const seasonRow = (overrides?: Partial<SeasonRow>): SeasonRow => ({
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

  const setupQueries = (overrides?: Partial<Record<string, QueryResult<unknown>>>) => {
    const results: Record<string, QueryResult<unknown>> = {
      team_season_stats: {
        data: [seasonRow(), seasonRow({ season_id: 's2', power_score: 0.6 })],
        error: null,
      },
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
            winner_id: 'team-1',
            loser_id: 'team-2',
            team1_game_wins: 2,
            team2_game_wins: 1,
            team1_id: 'team-1',
            team2_id: 'team-2',
            season_id: 's1',
          },
          {
            winner_id: 'team-1',
            loser_id: 'team-3',
            team1_game_wins: 2,
            team2_game_wins: 0,
            team1_id: 'team-1',
            team2_id: 'team-3',
            season_id: 's2',
          },
        ],
        error: null,
      },
      matches_archive: { data: [], error: null },
      playoff_matches: {
        data: [
          {
            winner_id: 'team-1',
            loser_id: 'team-4',
            team1_score: 2,
            team2_score: 1,
            team1_id: 'team-1',
            team2_id: 'team-4',
            bracket_id: 'b1',
          },
        ],
        error: null,
      },
      brackets: {
        data: [{ id: 'b1', season_id: 's1', divisions: { division_weight: 1 } }],
        error: null,
      },
    };

    const merged = { ...results, ...overrides } as Record<string, QueryResult<unknown>>;

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

  it('returns null when no season rows exist', async () => {
    setupQueries({ team_season_stats: { data: [], error: null } });

    const result = await fetchSeasonBreakdown('team-1');

    expect(result).toBeNull();
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

  it('keeps enrichment failures non-fatal and logs each query failure', async () => {
    const enrichmentError = {
      message: 'temporary failure',
      code: '57014',
      details: null,
      hint: null,
      name: 'PostgrestError',
    };

    setupQueries({
      all_team_season_stats: { data: null, error: enrichmentError },
      matches: { data: null, error: enrichmentError },
      matches_archive: { data: null, error: enrichmentError },
      playoff_matches: { data: null, error: enrichmentError },
      brackets: { data: null, error: enrichmentError },
    });

    const result = await fetchSeasonBreakdown('team-1');

    expect(result?.seasons).toHaveLength(2);
    expect(mockErrorLog).toHaveBeenCalledWith(
      'Failed to fetch current matches for season breakdown:',
      enrichmentError
    );
    expect(mockErrorLog).toHaveBeenCalledWith(
      'Failed to fetch archived matches for season breakdown:',
      enrichmentError
    );
    expect(mockErrorLog.mock.calls.length).toBeGreaterThanOrEqual(3);
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

describe('batchUpdateSeasonStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupUpdateQueries = (options?: {
    missingTeamSeasonStats?: boolean;
    archiveError?: PostgrestErrorLike | null;
  }) => {
    const optionValues = {
      missingTeamSeasonStats: false,
      archiveError: null,
      ...options,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'team_season_stats') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () =>
                  Promise.resolve({
                    data: optionValues.missingTeamSeasonStats ? [] : [{ team_id: 'team-1' }],
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }

      if (table === 'team_details_archive') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () =>
                  Promise.resolve({
                    data: [{ team_id: 'team-1' }],
                    error: optionValues.archiveError,
                  }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  };

  it('returns early when updates list is empty', async () => {
    await batchUpdateSeasonStats([]);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockDbLog).not.toHaveBeenCalled();
  });

  it('updates both tables and logs start/end messages', async () => {
    setupUpdateQueries();

    await batchUpdateSeasonStats([
      { team_id: 'team-1', season_id: 's1', division_name: 'Alpha', playoff_rank: 1 },
      { team_id: 'team-2', season_id: 's2', division_name: 'Beta', playoff_rank: 2 },
    ]);

    expect(mockFrom).toHaveBeenCalledWith('team_season_stats');
    expect(mockFrom).toHaveBeenCalledWith('team_details_archive');
    expect(mockDbLog).toHaveBeenNthCalledWith(1, 'Updating 2 team season stats...');
    expect(mockDbLog).toHaveBeenNthCalledWith(2, 'Successfully updated 2 team season stats');
  });

  it('throws NotFoundError when team_season_stats update does not return rows', async () => {
    setupUpdateQueries({ missingTeamSeasonStats: true });

    await expect(
      batchUpdateSeasonStats([
        { team_id: 'team-1', season_id: 's1', division_name: 'Alpha', playoff_rank: 1 },
      ])
    ).rejects.toThrow(NotFoundError);
  });
});
