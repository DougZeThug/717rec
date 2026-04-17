import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(),
}));

vi.mock('@/config/cache', () => ({
  QUERY_STALE_TIMES: { STANDARD: 300000 },
}));

// Import after mocks
import { fetchAllTeamsCareerData } from '../CareerBulkFetchService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

function buildFromMock(overrides: Record<string, { data: unknown; error: unknown }>) {
  const defaultResult = { data: null, error: null };
  return (table: string) => {
    const result = overrides[table] ?? defaultResult;
    // eq() is thenable (matches, matches_archive end at .eq()) and has .single()
    const eqResult = Object.assign(Promise.resolve(result), {
      single: () => Promise.resolve(result),
    });
    // select() is thenable (team_details_archive) and has .in()/.eq()/.not()
    const selectResult = Object.assign(Promise.resolve(result), {
      in: () => Promise.resolve(result),
      eq: () => eqResult,
      not: () => Promise.resolve(result),
    });
    return { select: () => selectResult };
  };
}

const successOverrides = {
  teams: {
    data: [{ id: 't1', divisions: { division_weight: 0.9 } }],
    error: null,
  },
  team_season_stats: {
    data: [
      {
        team_id: 't1',
        match_wins: 5,
        match_losses: 2,
        game_wins: 10,
        game_losses: 4,
        champion: false,
        runner_up: false,
        playoff_rank: null,
        sos: 0.6,
        division_name: 'Gold',
        season_id: 's-1',
        power_score: 80,
        seasons: { name: 'Season 1' },
      },
    ],
    error: null,
  },
  matches: { data: [], error: null },
  matches_archive: { data: [], error: null },
  team_details_archive: { data: [], error: null },
  playoff_matches: { data: [], error: null },
  seasons: { data: { id: 's-1' }, error: null },
};

// ─── fetchAllTeamsCareerData ──────────────────────────────────────────────────

describe('fetchAllTeamsCareerData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty Map when teamIds is empty', async () => {
    const result = await fetchAllTeamsCareerData([]);
    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns BulkTeamCareerData for each teamId on success', async () => {
    mockFrom.mockImplementation(buildFromMock(successOverrides));

    const result = await fetchAllTeamsCareerData(['t1']);

    expect(result.size).toBe(1);
    const data = result.get('t1')!;
    expect(data).not.toBeNull();
    expect(data.currentSeasonId).toBe('s-1');
    expect(data.teamDivisionWeight).toBe(0.9);
    expect(data.seasonStats).toHaveLength(1);
    expect(data.seasonPowerScores).toHaveLength(1);
    expect(data.seasonPowerScores[0].power_score).toBe(80);
  });

  it('includes entry for teamId with no stats (defaults applied)', async () => {
    mockFrom.mockImplementation(buildFromMock({
      ...successOverrides,
      team_season_stats: { data: [], error: null },
      teams: { data: [], error: null },
    }));

    const result = await fetchAllTeamsCareerData(['t1']);

    expect(result.has('t1')).toBe(true);
    const data = result.get('t1')!;
    expect(data.seasonStats).toHaveLength(0);
    expect(data.teamDivisionWeight).toBe(0.85); // default
  });

  it('throws DatabaseError when season_stats query fails', async () => {
    mockFrom.mockImplementation(buildFromMock({
      ...successOverrides,
      team_season_stats: { data: null, error: pgError('season stats failed') },
    }));

    await expect(fetchAllTeamsCareerData(['t1'])).rejects.toThrow(DatabaseError);
  });

  it('continues and returns data when non-critical queries fail', async () => {
    mockFrom.mockImplementation(buildFromMock({
      ...successOverrides,
      matches: { data: null, error: pgError('matches failed') },
      matches_archive: { data: null, error: pgError('archive failed') },
      playoff_matches: { data: null, error: pgError('playoff failed') },
    }));

    const result = await fetchAllTeamsCareerData(['t1']);
    expect(result.size).toBe(1);
    const data = result.get('t1')!;
    expect(data.currentMatches).toBeNull();
    expect(data.archivedMatches).toBeNull();
    expect(data.playoffMatches).toBeNull();
  });

  it('groups matches for the correct team', async () => {
    const matches = [
      { winner_id: 't1', loser_id: 't2', team1_game_wins: 2, team2_game_wins: 0, team1_id: 't1', team2_id: 't2', season_id: 's-1', team1: null, team2: null },
    ];
    mockFrom.mockImplementation(buildFromMock({
      ...successOverrides,
      matches: { data: matches, error: null },
    }));

    const result = await fetchAllTeamsCareerData(['t1']);
    const data = result.get('t1')!;
    expect(data.currentMatches).toHaveLength(1);
  });

  it('excludes teams not in teamIds from returned map', async () => {
    mockFrom.mockImplementation(buildFromMock(successOverrides));
    const result = await fetchAllTeamsCareerData(['t1']);
    expect(result.has('t-other')).toBe(false);
  });
});
