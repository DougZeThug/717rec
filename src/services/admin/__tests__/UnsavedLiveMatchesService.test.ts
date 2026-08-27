import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { UnsavedLiveMatchesService } from '../UnsavedLiveMatchesService';

const pgError = () => ({
  message: 'boom',
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

interface RecordedCall {
  method: string;
  args: unknown[];
}

/** Every filter call made across both queries, in order. */
let calls: RecordedCall[] = [];

/** Thenable stand-in for a Supabase query builder: every filter returns itself. */
const chain = (result: { data: unknown; error: unknown }) => {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'not', 'is', 'order', 'eq', 'in']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
};

const SEASON_ID = 's-1';

const matchRow = (over: Record<string, unknown> = {}) => ({
  id: 'm-1',
  date: '2026-08-20T23:00:00Z',
  season_id: 's-1',
  team1_id: 't-1',
  team2_id: 't-2',
  team1: { id: 't-1', name: 'Sweat Bandits' },
  team2: { id: 't-2', name: 'Corn Stars' },
  ...over,
});

/** Queue the two queries the service makes, in order: matches, then games. */
const mockQueries = (matches: unknown[], games: unknown[]) => {
  mockFrom
    .mockReturnValueOnce(chain({ data: matches, error: null }))
    .mockReturnValueOnce(chain({ data: games, error: null }));
};

describe('UnsavedLiveMatchesService.fetchUnsavedLiveMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls = [];
  });

  // Regression guard. archive_season deletes only completed matches and then
  // zeroes every team's counters, so a decided-but-unsaved match from an
  // archived season lives on in `matches`. Listing one would invite an admin to
  // save it, and finalize_live_match would add that old result to the current
  // season's team records.
  it('scopes the search to the given season', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: [], error: null }));

    await UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID);

    expect(calls).toContainEqual({ method: 'eq', args: ['season_id', SEASON_ID] });
  });

  it('returns [] and skips the games query when nothing is unrecorded', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: [], error: null }));

    expect(await UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID)).toEqual([]);
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('matches');
  });

  it('reports a 2-0 match that was decided but never saved', async () => {
    mockQueries(
      [matchRow()],
      [
        { match_id: 'm-1', winner_team_id: 't-1' },
        { match_id: 'm-1', winner_team_id: 't-1' },
      ]
    );

    expect(await UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID)).toEqual([
      {
        id: 'm-1',
        date: '2026-08-20T23:00:00Z',
        seasonId: 's-1',
        team1Name: 'Sweat Bandits',
        team2Name: 'Corn Stars',
        team1GameWins: 2,
        team2GameWins: 0,
      },
    ]);
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'games');
  });

  it('counts a 2-1 match to the side that won two games', async () => {
    mockQueries(
      [matchRow()],
      [
        { match_id: 'm-1', winner_team_id: 't-2' },
        { match_id: 'm-1', winner_team_id: 't-1' },
        { match_id: 'm-1', winner_team_id: 't-2' },
      ]
    );

    const [row] = await UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID);
    expect(row.team1GameWins).toBe(1);
    expect(row.team2GameWins).toBe(2);
  });

  it('ignores a match still in progress at one game each', async () => {
    mockQueries(
      [matchRow()],
      [
        { match_id: 'm-1', winner_team_id: 't-1' },
        { match_id: 'm-1', winner_team_id: 't-2' },
      ]
    );

    expect(await UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID)).toEqual([]);
  });

  it('ignores an unplayed match that has no live games', async () => {
    mockQueries([matchRow()], []);

    expect(await UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID)).toEqual([]);
  });

  it('ignores game wins credited to a team that is not in the match', async () => {
    mockQueries(
      [matchRow()],
      [
        { match_id: 'm-1', winner_team_id: 'other-team' },
        { match_id: 'm-1', winner_team_id: 'other-team' },
      ]
    );

    expect(await UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID)).toEqual([]);
  });

  it('attributes each match its own games when several are unsaved', async () => {
    mockQueries(
      [matchRow(), matchRow({ id: 'm-2', team1_id: 't-3', team2_id: 't-4' })],
      [
        { match_id: 'm-1', winner_team_id: 't-1' },
        { match_id: 'm-1', winner_team_id: 't-1' },
        { match_id: 'm-2', winner_team_id: 't-4' },
      ]
    );

    const rows = await UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('m-1');
  });

  it('falls back to a placeholder when a team join is missing', async () => {
    mockQueries(
      [matchRow({ team1: null })],
      [
        { match_id: 'm-1', winner_team_id: 't-2' },
        { match_id: 'm-1', winner_team_id: 't-2' },
      ]
    );

    const [row] = await UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID);
    expect(row.team1Name).toBe('Unknown team');
    expect(row.team2Name).toBe('Corn Stars');
  });

  it('skips game rows with no recorded winner', async () => {
    mockQueries(
      [matchRow()],
      [
        { match_id: 'm-1', winner_team_id: 't-1' },
        { match_id: 'm-1', winner_team_id: null },
      ]
    );

    expect(await UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID)).toEqual([]);
  });

  it('throws DatabaseError when the matches query fails', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: null, error: pgError() }));

    await expect(UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID)).rejects.toThrow(
      DatabaseError
    );
  });

  it('throws DatabaseError when the games query fails', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [matchRow()], error: null }))
      .mockReturnValueOnce(chain({ data: null, error: pgError() }));

    await expect(UnsavedLiveMatchesService.fetchUnsavedLiveMatches(SEASON_ID)).rejects.toThrow(
      DatabaseError
    );
  });
});
