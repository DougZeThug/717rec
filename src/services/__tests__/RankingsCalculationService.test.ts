import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFrom,
  mockHandleDatabaseError,
  mockFetchPlayoffMatches,
  mockFetchActiveSeason,
  mockFetchPlayoffActiveSeason,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockHandleDatabaseError: vi.fn(),
  mockFetchPlayoffMatches: vi.fn(),
  mockFetchActiveSeason: vi.fn(),
  mockFetchPlayoffActiveSeason: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/errorHandler', () => ({
  handleDatabaseError: (...args: unknown[]) => mockHandleDatabaseError(...args),
}));

vi.mock('@/services/brackets/read/PlayoffSeasonMatchService', () => ({
  fetchCompletedPlayoffMatchesForSeason: (...args: unknown[]) => mockFetchPlayoffMatches(...args),
}));

vi.mock('@/services/seasons/SeasonQueryService', () => ({
  SeasonQueryService: {
    fetchActiveSeason: () => mockFetchActiveSeason(),
    fetchPlayoffActiveSeason: () => mockFetchPlayoffActiveSeason(),
  },
}));

import { calculateStreak } from '@/utils/rankingUtils/calculateStreak';

import { fetchRankingsData } from '../RankingsCalculationService';

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock(queuedByTable: Record<string, QueryResult[]>) {
  mockFrom.mockImplementation((table: string) => {
    const queue = queuedByTable[table] ?? [];
    const result = queue.shift() ?? { data: null, error: null };

    const query = {} as Record<string, unknown>;
    for (const key of ['eq', 'order']) query[key] = vi.fn(() => query);
    query.maybeSingle = vi.fn(() => Promise.resolve(result));
    query.then = (
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected);

    return { select: vi.fn(() => query) };
  });
}

const regularRow = (id: string, winner: string, date: string) => ({
  id,
  team1_id: 'team-1',
  team2_id: 'opponent',
  winner_id: winner,
  loser_id: winner === 'team-1' ? 'opponent' : 'team-1',
  iscompleted: true,
  date,
  team1_game_wins: 2,
  team2_game_wins: 0,
});

const playoffRow = {
  id: 'pm-final',
  bracketId: 'br-1',
  team1Id: 'team-1',
  team2Id: 'opponent',
  winnerId: 'opponent',
  loserId: 'team-1',
  team1GameWins: 1,
  team2GameWins: 2,
  team1Seed: 1,
  team2Seed: 3,
  round: 1,
  position: 1,
  matchType: 'finals',
  recordedAt: '2026-08-02T00:00:00.000Z',
};

describe('fetchRankingsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPlayoffMatches.mockResolvedValue([]);
    mockFetchActiveSeason.mockResolvedValue({ id: 's-1' });
    mockFetchPlayoffActiveSeason.mockResolvedValue(null);
  });

  it('returns regular-season matches unchanged when no season can be resolved', async () => {
    mockFetchActiveSeason.mockResolvedValue(null);
    createSupabaseMock({
      matches: [{ data: [regularRow('r1', 'team-1', '2026-01-01')], error: null }],
    });

    const result = await fetchRankingsData();

    expect(result).toHaveLength(1);
    expect(mockFetchPlayoffMatches).not.toHaveBeenCalled();
  });

  it('falls back to the playoffs-active season once the regular season is archived', async () => {
    // partial_archive_season clears is_active and sets playoffs_active. Without the
    // fallback the bracket drops out of the streak column for the whole playoff run.
    mockFetchActiveSeason.mockResolvedValue(null);
    mockFetchPlayoffActiveSeason.mockResolvedValue({ id: 's-playoffs' });
    mockFetchPlayoffMatches.mockResolvedValue([playoffRow]);
    createSupabaseMock({
      matches: [{ data: [regularRow('r1', 'team-1', '2026-01-01')], error: null }],
    });

    const result = await fetchRankingsData();

    expect(mockFetchPlayoffMatches).toHaveBeenCalledWith('s-playoffs');
    expect(result.map((m) => m.id)).toEqual(['pm-final', 'r1']);
  });

  it('prefers the active season, so a new season does not inherit the old bracket', async () => {
    mockFetchActiveSeason.mockResolvedValue({ id: 's-new' });
    mockFetchPlayoffActiveSeason.mockResolvedValue({ id: 's-old' });
    createSupabaseMock({
      matches: [{ data: [regularRow('r1', 'team-1', '2026-01-01')], error: null }],
    });

    await fetchRankingsData();

    expect(mockFetchPlayoffMatches).toHaveBeenCalledWith('s-new');
    expect(mockFetchPlayoffActiveSeason).not.toHaveBeenCalled();
  });

  it('returns regular-season matches unchanged when the season has no playoff results', async () => {
    createSupabaseMock({
      matches: [{ data: [regularRow('r1', 'team-1', '2026-01-01')], error: null }],
    });

    const result = await fetchRankingsData();

    expect(mockFetchPlayoffMatches).toHaveBeenCalledWith('s-1');
    expect(result.map((m) => m.id)).toEqual(['r1']);
    expect(result[0].orderKey).toBeUndefined();
  });

  it('appends playoff matches and keeps the newest-first contract', async () => {
    createSupabaseMock({
      matches: [
        {
          data: [
            regularRow('r2', 'team-1', '2026-01-08'),
            regularRow('r1', 'team-1', '2026-01-01'),
          ],
          error: null,
        },
      ],
    });
    mockFetchPlayoffMatches.mockResolvedValue([playoffRow]);

    const result = await fetchRankingsData();

    // Newest first: the playoff game is the most recent, oldest regular game last.
    expect(result.map((m) => m.id)).toEqual(['pm-final', 'r2', 'r1']);
    expect(result.map((m) => m.orderKey)).toEqual([2, 1, 0]);
  });

  it('lets a playoff loss end a regular-season win streak on the standings', async () => {
    createSupabaseMock({
      matches: [
        {
          data: [
            regularRow('r2', 'team-1', '2026-01-08'),
            regularRow('r1', 'team-1', '2026-01-01'),
          ],
          error: null,
        },
      ],
    });
    mockFetchPlayoffMatches.mockResolvedValue([playoffRow]);

    const result = await fetchRankingsData();

    expect(calculateStreak('team-1', result)).toBe('L1');
  });

  it('surfaces a matches query error', async () => {
    createSupabaseMock({
      matches: [{ data: null, error: { message: 'boom' } }],
    });

    await fetchRankingsData();

    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'boom' },
      'Failed to fetch rankings data'
    );
  });
});
