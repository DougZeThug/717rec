import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockHandleDatabaseError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockHandleDatabaseError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/errorHandler', () => ({
  handleDatabaseError: (...args: unknown[]) => mockHandleDatabaseError(...args),
}));

import { fetchCompletedPlayoffMatchesForSeason } from '../PlayoffSeasonMatchService';

type QueryResult = { data: unknown; error: unknown };

type QuerySpy = {
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
};

function createSupabaseMock(queuedByTable: Record<string, QueryResult[]>) {
  const querySpies: Record<string, QuerySpy[]> = {};

  mockFrom.mockImplementation((table: string) => {
    const queue = queuedByTable[table] ?? [];
    const result = queue.shift() ?? { data: null, error: null };

    const query = {} as Record<string, unknown>;

    const eq = vi.fn(() => query);
    const inFn = vi.fn(() => query);
    const not = vi.fn(() => query);
    const order = vi.fn(() => query);

    Object.assign(query, {
      eq,
      in: inFn,
      not,
      order,
      then: (
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) => Promise.resolve(result).then(onFulfilled, onRejected),
    });

    if (!querySpies[table]) querySpies[table] = [];
    querySpies[table].push({ eq, in: inFn, not, order });

    return { select: vi.fn(() => query) };
  });

  return querySpies;
}

const playoffRow = {
  id: 'pm-1',
  bracket_id: 'br-1',
  round: 2,
  position: 1,
  match_type: 'winners',
  team1_id: 'team-a',
  team2_id: 'team-b',
  team1_score: 2,
  team2_score: 1,
  team1_seed: 1,
  team2_seed: 8,
  winner_id: 'team-a',
  loser_id: 'team-b',
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-02T00:00:00.000Z',
};

describe('fetchCompletedPlayoffMatchesForSeason', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array without querying playoff_matches when the season has no brackets', async () => {
    const spies = createSupabaseMock({
      brackets: [{ data: [], error: null }],
    });

    const result = await fetchCompletedPlayoffMatchesForSeason('season-1');

    expect(result).toEqual([]);
    expect(spies.playoff_matches).toBeUndefined();
  });

  it('scopes the playoff query to the season bracket ids', async () => {
    const spies = createSupabaseMock({
      brackets: [{ data: [{ id: 'br-1' }, { id: 'br-2' }], error: null }],
      playoff_matches: [{ data: [], error: null }],
    });

    await fetchCompletedPlayoffMatchesForSeason('season-1');

    expect(spies.brackets[0].eq).toHaveBeenCalledWith('season_id', 'season-1');
    expect(spies.playoff_matches[0].in).toHaveBeenCalledWith('bracket_id', ['br-1', 'br-2']);
  });

  it('excludes byes and incomplete matches at the query level', async () => {
    const spies = createSupabaseMock({
      brackets: [{ data: [{ id: 'br-1' }], error: null }],
      playoff_matches: [{ data: [], error: null }],
    });

    await fetchCompletedPlayoffMatchesForSeason('season-1');

    const notCalls = spies.playoff_matches[0].not.mock.calls;
    expect(notCalls).toEqual(
      expect.arrayContaining([
        ['winner_id', 'is', null],
        ['team1_id', 'is', null],
        ['team2_id', 'is', null],
      ])
    );
  });

  it('normalizes rows, mapping game-win scores and the recorded timestamp', async () => {
    createSupabaseMock({
      brackets: [{ data: [{ id: 'br-1' }], error: null }],
      playoff_matches: [{ data: [playoffRow], error: null }],
    });

    const result = await fetchCompletedPlayoffMatchesForSeason('season-1');

    expect(result).toEqual([
      {
        id: 'pm-1',
        bracketId: 'br-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        winnerId: 'team-a',
        loserId: 'team-b',
        team1GameWins: 2,
        team2GameWins: 1,
        team1Seed: 1,
        team2Seed: 8,
        round: 2,
        position: 1,
        matchType: 'winners',
        recordedAt: '2026-08-02T00:00:00.000Z',
      },
    ]);
  });

  it('falls back to created_at when the row has never been updated', async () => {
    createSupabaseMock({
      brackets: [{ data: [{ id: 'br-1' }], error: null }],
      playoff_matches: [{ data: [{ ...playoffRow, updated_at: null }], error: null }],
    });

    const result = await fetchCompletedPlayoffMatchesForSeason('season-1');

    expect(result[0].recordedAt).toBe('2026-08-01T00:00:00.000Z');
  });

  it('surfaces a bracket query error', async () => {
    createSupabaseMock({
      brackets: [{ data: null, error: { message: 'boom' } }],
    });

    await fetchCompletedPlayoffMatchesForSeason('season-1');

    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'boom' },
      'Failed to fetch brackets for season playoff matches'
    );
  });

  it('surfaces a playoff match query error', async () => {
    createSupabaseMock({
      brackets: [{ data: [{ id: 'br-1' }], error: null }],
      playoff_matches: [{ data: null, error: { message: 'kaboom' } }],
    });

    await fetchCompletedPlayoffMatchesForSeason('season-1');

    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      { message: 'kaboom' },
      'Failed to fetch completed playoff matches'
    );
  });
});
