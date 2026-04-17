import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(), matchLog: vi.fn(),
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

const pgError = (msg = 'query failed') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

// ─── fetchActiveSeasonIdStrict ────────────────────────────────────────────────

describe('fetchActiveSeasonIdStrict', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns season id when found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'season-1' }, error: null }) }) }),
    });
    const id = await fetchActiveSeasonIdStrict();
    expect(id).toBe('season-1');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }) }),
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
    const result = await countTeamMatchesInSeason('t1', 't2', 'season-1');
    expect(result).toBe(3);
  });

  it('returns 0 when count is null', async () => {
    mockFrom.mockReturnValue(countChain({ count: null, error: null }));
    const result = await countTeamMatchesInSeason('t1', 't2', 'season-1');
    expect(result).toBe(0);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(countChain({ count: null, error: pgError() }));
    await expect(countTeamMatchesInSeason('t1', 't2', 'season-1')).rejects.toThrow(DatabaseError);
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
    expect(await checkTeamsEverPlayed('t1', 't2')).toBe(true);
  });

  it('returns false when data is empty', async () => {
    mockFrom.mockReturnValue(limitChain({ data: [], error: null }));
    expect(await checkTeamsEverPlayed('t1', 't2')).toBe(false);
  });

  it('returns false when data is null', async () => {
    mockFrom.mockReturnValue(limitChain({ data: null, error: null }));
    expect(await checkTeamsEverPlayed('t1', 't2')).toBe(false);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(limitChain({ data: null, error: pgError() }));
    await expect(checkTeamsEverPlayed('t1', 't2')).rejects.toThrow(DatabaseError);
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
    expect(await haveTeamsPlayedBefore('t1', 't2')).toBe(true);
  });

  it('returns false when data is empty', async () => {
    mockFrom.mockReturnValue(limitChain({ data: [], error: null }));
    expect(await haveTeamsPlayedBefore('t1', 't2')).toBe(false);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(limitChain({ data: null, error: pgError() }));
    await expect(haveTeamsPlayedBefore('t1', 't2')).rejects.toThrow(DatabaseError);
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

  it('returns opponent history on success', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: activeSeason, error: null }) }) }) };
      }
      if (table === 'matches') {
        return { select: () => ({ eq: () => ({ eq: () => ({ is: () => Promise.resolve({ data: matches, error: null }) }) }) }) };
      }
      if (table === 'teams') {
        return { select: () => Promise.resolve({ data: teams, error: null }) };
      }
      return { select: () => Promise.resolve({ data: null, error: null }) };
    });

    const result = await fetchSeasonOpponentHistory();

    expect(result).not.toBeNull();
    expect(result!.seasonId).toBe('season-1');
    expect(result!.teams.length).toBeGreaterThan(0);
  });

  it('returns null when no active season', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: pgError('PGRST116') }) }) }),
    });
    const result = await fetchSeasonOpponentHistory();
    expect(result).toBeNull();
  });

  it('throws DatabaseError when matches query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: activeSeason, error: null }) }) }) };
      }
      // matches query fails
      return { select: () => ({ eq: () => ({ eq: () => ({ is: () => Promise.resolve({ data: null, error: pgError() }) }) }) }) };
    });
    await expect(fetchSeasonOpponentHistory()).rejects.toThrow(DatabaseError);
  });
});
