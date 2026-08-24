import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, ValidationError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  matchLog: vi.fn(),
}));

// Import after mocks
import {
  checkTeamsEverPlayed,
  countTeamMatchesInSeason,
  fetchActiveSeasonIdStrict,
  fetchMatchPairsInSeason,
  fetchSeasonOpponentHistory,
  haveTeamsPlayedBefore,
} from '../MatchHistoryService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Valid, distinct v4 UUIDs — the guarded functions reject anything else.
const T1 = '11111111-1111-4111-8111-111111111111';
const T2 = '22222222-2222-4222-8222-222222222222';
const SEASON = '33333333-3333-4333-8333-333333333333';

const pgError = (msg = 'query failed', code = '42P01') => ({
  message: msg,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// ─── fetchActiveSeasonIdStrict ────────────────────────────────────────────────

describe('fetchActiveSeasonIdStrict', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns season id when found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: { id: 'season-1' }, error: null }) }),
      }),
    });
    const id = await fetchActiveSeasonIdStrict();
    expect(id).toBe('season-1');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchActiveSeasonIdStrict()).rejects.toThrow(DatabaseError);
  });
});

// ─── countTeamMatchesInSeason ─────────────────────────────────────────────────

describe('countTeamMatchesInSeason', () => {
  beforeEach(() => vi.clearAllMocks());

  // .select().or().eq().eq() → returns { count, error }
  const countChain = (result: { count: number | null; error: unknown }) => ({
    select: () => ({ or: () => ({ eq: () => ({ eq: () => Promise.resolve(result) }) }) }),
  });

  it('returns the count of matches', async () => {
    mockFrom.mockReturnValue(countChain({ count: 3, error: null }));
    const result = await countTeamMatchesInSeason(T1, T2, SEASON);
    expect(result).toBe(3);
  });

  it('returns 0 when count is null', async () => {
    mockFrom.mockReturnValue(countChain({ count: null, error: null }));
    const result = await countTeamMatchesInSeason(T1, T2, SEASON);
    expect(result).toBe(0);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(countChain({ count: null, error: pgError() }));
    await expect(countTeamMatchesInSeason(T1, T2, SEASON)).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchMatchPairsInSeason ──────────────────────────────────────────────────

describe('fetchMatchPairsInSeason', () => {
  beforeEach(() => vi.clearAllMocks());

  // .select().eq().eq().in().in()
  const pairsChain = (result: { data: unknown; error: unknown }) => ({
    select: () => ({
      eq: () => ({ eq: () => ({ in: () => ({ in: () => Promise.resolve(result) }) }) }),
    }),
  });

  it('returns match pairs', async () => {
    const rows = [{ team1_id: 't1', team2_id: 't2' }];
    mockFrom.mockReturnValue(pairsChain({ data: rows, error: null }));
    const result = await fetchMatchPairsInSeason(['t1', 't2'], 'season-1');
    expect(result).toHaveLength(1);
    expect(result[0].team1_id).toBe('t1');
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue(pairsChain({ data: null, error: null }));
    const result = await fetchMatchPairsInSeason(['t1', 't2'], 'season-1');
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(pairsChain({ data: null, error: pgError() }));
    await expect(fetchMatchPairsInSeason(['t1'], 'season-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── checkTeamsEverPlayed ─────────────────────────────────────────────────────

describe('checkTeamsEverPlayed', () => {
  beforeEach(() => vi.clearAllMocks());

  const limitChain = (result: { data: unknown; error: unknown }) => ({
    select: () => ({ or: () => ({ limit: () => Promise.resolve(result) }) }),
  });

  it('returns true when teams have played', async () => {
    mockFrom.mockReturnValue(limitChain({ data: [{ id: 'm-1' }], error: null }));
    expect(await checkTeamsEverPlayed(T1, T2)).toBe(true);
  });

  it('returns false when data is empty', async () => {
    mockFrom.mockReturnValue(limitChain({ data: [], error: null }));
    expect(await checkTeamsEverPlayed(T1, T2)).toBe(false);
  });

  it('returns false when data is null', async () => {
    mockFrom.mockReturnValue(limitChain({ data: null, error: null }));
    expect(await checkTeamsEverPlayed(T1, T2)).toBe(false);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(limitChain({ data: null, error: pgError() }));
    await expect(checkTeamsEverPlayed(T1, T2)).rejects.toThrow(DatabaseError);
  });

  it('rejects an invalid teamId before querying Supabase', async () => {
    await expect(checkTeamsEverPlayed('t1', T2)).rejects.toThrow(ValidationError);
    await expect(checkTeamsEverPlayed(T1, 't2')).rejects.toThrow(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ─── haveTeamsPlayedBefore ────────────────────────────────────────────────────

describe('haveTeamsPlayedBefore', () => {
  beforeEach(() => vi.clearAllMocks());

  const limitChain = (result: { data: unknown; error: unknown }) => ({
    select: () => ({ or: () => ({ limit: () => Promise.resolve(result) }) }),
  });

  it('returns true when teams have played', async () => {
    mockFrom.mockReturnValue(limitChain({ data: [{ id: 'm-1' }], error: null }));
    expect(await haveTeamsPlayedBefore(T1, T2)).toBe(true);
  });

  it('returns false when data is empty', async () => {
    mockFrom.mockReturnValue(limitChain({ data: [], error: null }));
    expect(await haveTeamsPlayedBefore(T1, T2)).toBe(false);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(limitChain({ data: null, error: pgError() }));
    await expect(haveTeamsPlayedBefore(T1, T2)).rejects.toThrow(DatabaseError);
  });

  it('rejects an invalid teamId before querying Supabase', async () => {
    await expect(haveTeamsPlayedBefore('t1', T2)).rejects.toThrow(ValidationError);
    await expect(haveTeamsPlayedBefore(T1, 't2')).rejects.toThrow(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ─── fetchSeasonOpponentHistory ───────────────────────────────────────────────

describe('fetchSeasonOpponentHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  const activeSeason = { id: 'season-1', name: 'Spring 2026' };
  const matches = [
    { id: 'm-1', team1_id: 't1', team2_id: 't2', winner_id: 't1', iscompleted: true },
    { id: 'm-2', team1_id: 't1', team2_id: 't2', winner_id: 't2', iscompleted: true },
  ];
  const teams = [
    { id: 't1', name: 'Eagles', division_id: 'd1', divisions: { name: 'Div A' } },
    { id: 't2', name: 'Hawks', division_id: 'd1', divisions: { name: 'Div A' } },
  ];

  /** Routes the seasons/matches/teams queries to fixed fixtures. */
  const mockSeasonQueries = (seasonMatches: typeof matches) => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: activeSeason, error: null }) }),
          }),
        };
      }
      if (table === 'matches') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ is: () => Promise.resolve({ data: seasonMatches, error: null }) }),
            }),
          }),
        };
      }
      if (table === 'teams') {
        return { select: () => Promise.resolve({ data: teams, error: null }) };
      }
      return { select: () => Promise.resolve({ data: null, error: null }) };
    });
  };

  it('returns opponent history on success', async () => {
    mockSeasonQueries(matches);

    const result = await fetchSeasonOpponentHistory();

    expect(result).toMatchObject({ seasonId: 'season-1' });
    expect(result?.teams).toHaveLength(2);
  });

  it('counts every match the team played, without halving', async () => {
    mockSeasonQueries(matches);

    const result = await fetchSeasonOpponentHistory();

    // Both teams played the same 2 matches against each other.
    result?.teams.forEach((team) => {
      expect(team.totalMatches).toBe(2);
      expect(team.uniqueOpponentCount).toBe(1);
      expect(team.opponents[0].matchCount).toBe(2);
    });
  });

  it('reports a whole number for an odd match count', async () => {
    // 3 matches between the same two teams: t1 wins two, t2 wins one.
    mockSeasonQueries([
      { id: 'm-1', team1_id: 't1', team2_id: 't2', winner_id: 't1', iscompleted: true },
      { id: 'm-2', team1_id: 't1', team2_id: 't2', winner_id: 't1', iscompleted: true },
      { id: 'm-3', team1_id: 't1', team2_id: 't2', winner_id: 't2', iscompleted: true },
    ]);

    const result = await fetchSeasonOpponentHistory();

    result?.teams.forEach((team) => {
      expect(Number.isInteger(team.totalMatches)).toBe(true);
      expect(team.totalMatches).toBe(3);
      // totalMatches must agree with the per-opponent breakdown it summarises.
      expect(team.totalMatches).toBe(
        team.opponents.reduce((sum, opponent) => sum + opponent.matchCount, 0)
      );
    });
  });

  it('returns null when no active season', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: null, error: pgError('No active season', 'PGRST116') }),
        }),
      }),
    });
    const result = await fetchSeasonOpponentHistory();
    expect(result).toBeNull();
  });

  it('throws DatabaseError when matches query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: activeSeason, error: null }) }),
          }),
        };
      }
      // matches query fails
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ is: () => Promise.resolve({ data: null, error: pgError() }) }),
          }),
        }),
      };
    });
    await expect(fetchSeasonOpponentHistory()).rejects.toThrow(DatabaseError);
  });
});
