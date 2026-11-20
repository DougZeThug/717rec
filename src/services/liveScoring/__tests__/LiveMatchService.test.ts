import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BusinessLogicError,
  DatabaseError,
  LiveScoringNotEnabledError,
  NotFoundError,
  ValidationError,
} from '@/types/errors';
import { getUIErrorMessage } from '@/utils/errorHandler';

// ─── Supabase mock (liveDb wraps the same client module) ─────────────────────

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args: unknown) => mockRpc(fn, args),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  matchLog: vi.fn(),
}));

// Import after mocks
import { LiveMatchService } from '../LiveMatchService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (code: string, msg = 'query failed') => ({
  message: msg,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const matchRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'match-1',
  season_id: 'season-1',
  date: '2026-07-08T18:00:00Z',
  location: 'Court 1',
  best_of: 3,
  iscompleted: false,
  winner_id: null,
  team1_id: 'team-1',
  team2_id: 'team-2',
  team1_game_wins: 0,
  team2_game_wins: 0,
  team1: { id: 'team-1', name: 'Baggers', logo_url: null, image_url: null },
  team2: { id: 'team-2', name: 'Tossers', logo_url: null, image_url: null },
  ...overrides,
});

const gameRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'game-1',
  match_id: 'match-1',
  game_number: 1,
  team1_score: null,
  team2_score: null,
  status: 'in_progress',
  winner_team_id: null,
  started_at: '2026-07-08T18:00:00Z',
  completed_at: null,
  created_at: '2026-07-08T18:00:00Z',
  updated_at: '2026-07-08T18:00:00Z',
  ...overrides,
});

// Route mockFrom by table name to independent chain objects.
const routeTables = (routes: Record<string, unknown>) => {
  mockFrom.mockImplementation((table: string) => {
    const chain = routes[table];
    if (!chain) throw new Error(`Unexpected table in test: ${table}`);
    return chain;
  });
};

const matchChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }),
});

const selectEqOrderChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => ({ order: () => Promise.resolve(result) }) }),
});

const selectInOrderChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ in: () => ({ order: () => Promise.resolve(result) }) }),
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── fetchLiveMatchBundle ────────────────────────────────────────────────────

describe('fetchLiveMatchBundle', () => {
  it('assembles match, games, rounds and game players', async () => {
    const gamePlayersChain = selectInOrderChain({
      data: [{ id: 'gp-1', game_id: 'game-1', team_id: 'team-1', player_id: 'p1', slot: 1 }],
      error: null,
    });
    routeTables({
      matches: matchChain({ data: matchRow(), error: null }),
      games: selectEqOrderChain({ data: [gameRow()], error: null }),
      match_rounds: selectEqOrderChain({ data: [], error: null }),
      game_players: gamePlayersChain,
    });

    const bundle = await LiveMatchService.fetchLiveMatchBundle('match-1');

    expect(bundle.match.id).toBe('match-1');
    expect(bundle.match.team1?.name).toBe('Baggers');
    expect(bundle.games).toHaveLength(1);
    expect(bundle.gamePlayers).toHaveLength(1);
  });

  it('skips the game_players query when no games exist yet', async () => {
    routeTables({
      matches: matchChain({ data: matchRow(), error: null }),
      games: selectEqOrderChain({ data: [], error: null }),
      match_rounds: selectEqOrderChain({ data: [], error: null }),
    });

    const bundle = await LiveMatchService.fetchLiveMatchBundle('match-1');

    expect(bundle.games).toEqual([]);
    expect(bundle.gamePlayers).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalledWith('game_players');
  });

  it('throws NotFoundError when the match does not exist', async () => {
    routeTables({
      matches: matchChain({ data: null, error: null }),
      games: selectEqOrderChain({ data: [], error: null }),
      match_rounds: selectEqOrderChain({ data: [], error: null }),
    });

    await expect(LiveMatchService.fetchLiveMatchBundle('nope')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('maps a missing match_rounds table to LiveScoringNotEnabledError', async () => {
    // PGRST205 is what PostgREST actually returns for a table missing from
    // its schema cache (verified against the live API pre-migration).
    for (const code of ['PGRST205', '42P01']) {
      routeTables({
        matches: matchChain({ data: matchRow(), error: null }),
        games: selectEqOrderChain({ data: [], error: null }),
        match_rounds: selectEqOrderChain({ data: null, error: pgError(code) }),
      });

      await expect(LiveMatchService.fetchLiveMatchBundle('match-1')).rejects.toBeInstanceOf(
        LiveScoringNotEnabledError
      );
    }
  });
});

// ─── createGame ───────────────────────────────────────────────────────────────

describe('createGame', () => {
  it('inserts and returns the new game', async () => {
    const insert = vi.fn(() => ({
      select: () => ({ single: () => Promise.resolve({ data: gameRow(), error: null }) }),
    }));
    routeTables({ games: { insert } });

    const game = await LiveMatchService.createGame('match-1', 1);

    expect(insert).toHaveBeenCalledWith({ match_id: 'match-1', game_number: 1 });
    expect(game.id).toBe('game-1');
  });

  it('returns the existing game when another scorer created it first (23505)', async () => {
    const existing = gameRow({ id: 'game-existing' });
    const eq2 = vi.fn(() => ({ single: () => Promise.resolve({ data: existing, error: null }) }));
    const eq1 = vi.fn(() => ({ eq: eq2 }));
    routeTables({
      games: {
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: pgError('23505') }),
          }),
        }),
        select: () => ({ eq: eq1 }),
      },
    });

    const game = await LiveMatchService.createGame('match-1', 1);

    expect(game.id).toBe('game-existing');
  });

  it('throws DatabaseError for other insert failures', async () => {
    routeTables({
      games: {
        insert: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: pgError('500') }) }),
        }),
      },
    });

    await expect(LiveMatchService.createGame('match-1', 1)).rejects.toBeInstanceOf(DatabaseError);
  });
});

// ─── completeGame / reopenGame ────────────────────────────────────────────────

// update -> eq -> select -> maybeSingle, as reopenGame chains it.
const updateChain = (result: { data: unknown; error: unknown }) => {
  const maybeSingle = vi.fn(() => Promise.resolve(result));
  const select = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  return { update, eq, select };
};

// A realistic stored value: Postgres keeps microseconds, JavaScript dates do not.
const SEEN = '2026-11-20T01:23:45.123456+00:00';
const NEWER = '2026-11-20T01:24:10.654321+00:00';
const TOTALS = { team1: 18, team2: 21 };
const STALE_MESSAGE =
  'This game was changed by someone else. The screen is updated. Check the score, then end the game again if it is right.';
const DIFFERENT_RESULT_MESSAGE =
  'Someone else already ended this game with a different score. Check the score. Reopen the game if it is wrong.';

// update -> eq -> eq -> eq -> select -> maybeSingle, as completeGame chains it.
const completeChain = (result: { data: unknown; error: unknown }) => {
  const maybeSingle = vi.fn(() => Promise.resolve(result));
  const select = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn((): { eq: unknown; select: unknown } => ({ eq, select }));
  const update = vi.fn(() => ({ eq }));
  return { update, eq, select };
};

// select -> eq -> maybeSingle, the re-read after the guarded update matched nothing.
const rereadChain = (result: { data: unknown; error: unknown }) => {
  const maybeSingle = vi.fn(() => Promise.resolve(result));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq };
};

// The first update matches nothing; the games table is then read again.
const noMatchThenReread = (reread: { data: unknown; error: unknown }) => {
  const upd = completeChain({ data: null, error: null });
  const read = rereadChain(reread);
  routeTables({ games: { update: upd.update, select: read.select } });
  return { upd, read };
};

describe('completeGame', () => {
  it('marks the game completed with winner and folded totals', async () => {
    const { update, eq, select } = completeChain({ data: { id: 'game-1' }, error: null });
    routeTables({ games: { update } });

    await LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        winner_team_id: 'team-2',
        team1_score: 18,
        team2_score: 21,
      })
    );
    expect(eq).toHaveBeenCalledWith('id', 'game-1');
    expect(select).toHaveBeenCalledWith('id');
  });

  it('only writes a game that is in progress and still at the version the screen saw', async () => {
    const { update, eq } = completeChain({ data: { id: 'game-1' }, error: null });
    routeTables({ games: { update } });

    await LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN);

    expect(eq).toHaveBeenCalledTimes(3);
    expect(eq).toHaveBeenCalledWith('id', 'game-1');
    expect(eq).toHaveBeenCalledWith('status', 'in_progress');
    // The exact raw string, microseconds and all. A Date round trip would cut
    // them and the database would match nothing.
    expect(eq).toHaveBeenCalledWith('updated_at', '2026-11-20T01:23:45.123456+00:00');
  });

  it('does not read the game again when the first write worked', async () => {
    const { update } = completeChain({ data: { id: 'game-1' }, error: null });
    const select = vi.fn();
    routeTables({ games: { update, select } });

    await LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN);

    expect(select).not.toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('throws DatabaseError when the update fails, and does not read again', async () => {
    const { update } = completeChain({ data: null, error: pgError('500') });
    const select = vi.fn();
    routeTables({ games: { update, select } });

    await expect(
      LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN)
    ).rejects.toBeInstanceOf(DatabaseError);
    expect(select).not.toHaveBeenCalled();
  });

  it('throws ValidationError for an empty version, before any database call', async () => {
    const thrown = await LiveMatchService.completeGame('game-1', 'team-2', TOTALS, '').catch(
      (error: unknown) => error
    );

    expect(thrown).toBeInstanceOf(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  describe('when the guarded write matched no row', () => {
    it('reads the game again by id with explicit columns', async () => {
      const { read } = noMatchThenReread({ data: gameRow({ updated_at: SEEN }), error: null });

      await LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN).catch(
        (error: unknown) => error
      );

      expect(read.select).toHaveBeenCalledTimes(1);
      const columns = (read.select.mock.calls as unknown as string[][])[0][0];
      expect(columns).not.toBe('*');
      expect(columns).toContain('updated_at');
      expect(read.eq).toHaveBeenCalledWith('id', 'game-1');
    });

    // A double tap, a second scorer finishing the same result, a lost reply, or
    // a match already finalized: the game is already as we wanted it.
    it('succeeds when the game is already ended with the same winner and totals', async () => {
      noMatchThenReread({
        data: gameRow({
          status: 'completed',
          winner_team_id: 'team-2',
          team1_score: 18,
          team2_score: 21,
          updated_at: NEWER,
        }),
        error: null,
      });

      await expect(
        LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN)
      ).resolves.toBeUndefined();
    });

    it('succeeds when the stored totals come back as numeric strings', async () => {
      noMatchThenReread({
        data: gameRow({
          status: 'completed',
          winner_team_id: 'team-2',
          team1_score: '18',
          team2_score: '21',
        }),
        error: null,
      });

      await expect(
        LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN)
      ).resolves.toBeUndefined();
    });

    it('refuses when the game was ended with a different winner', async () => {
      noMatchThenReread({
        data: gameRow({
          status: 'completed',
          winner_team_id: 'team-1',
          team1_score: 18,
          team2_score: 21,
        }),
        error: null,
      });

      const thrown = await LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN).catch(
        (error: unknown) => error
      );

      expect(thrown).toBeInstanceOf(BusinessLogicError);
      expect(getUIErrorMessage(thrown)).toBe(DIFFERENT_RESULT_MESSAGE);
    });

    it('refuses when the game was ended with the same winner but different totals', async () => {
      noMatchThenReread({
        data: gameRow({
          status: 'completed',
          winner_team_id: 'team-2',
          team1_score: 19,
          team2_score: 21,
        }),
        error: null,
      });

      const thrown = await LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN).catch(
        (error: unknown) => error
      );

      expect(thrown).toBeInstanceOf(BusinessLogicError);
      expect(getUIErrorMessage(thrown)).toBe(DIFFERENT_RESULT_MESSAGE);
    });

    // Null is not 0: a completed game with no stored score is not the 0-0 result.
    it('does not read stored null totals as 0-0', async () => {
      noMatchThenReread({
        data: gameRow({
          status: 'completed',
          winner_team_id: 'team-2',
          team1_score: null,
          team2_score: null,
        }),
        error: null,
      });

      const thrown = await LiveMatchService.completeGame(
        'game-1',
        'team-2',
        { team1: 0, team2: 0 },
        SEEN
      ).catch((error: unknown) => error);

      expect(thrown).toBeInstanceOf(BusinessLogicError);
      expect(getUIErrorMessage(thrown)).toBe(DIFFERENT_RESULT_MESSAGE);
    });

    // The reopen case: the game is back in progress and has moved on since the
    // screen loaded, so the stale phone must not finish it.
    it('refuses when the game was changed since the screen loaded it', async () => {
      noMatchThenReread({
        data: gameRow({ status: 'in_progress', updated_at: NEWER }),
        error: null,
      });

      const thrown = await LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN).catch(
        (error: unknown) => error
      );

      expect(thrown).toBeInstanceOf(BusinessLogicError);
      expect(getUIErrorMessage(thrown)).toBe(STALE_MESSAGE);
    });

    it('keeps the old message when the game is unchanged and still in progress', async () => {
      noMatchThenReread({
        data: gameRow({ status: 'in_progress', updated_at: SEEN }),
        error: null,
      });

      const thrown = await LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN).catch(
        (error: unknown) => error
      );

      // RLS filtered the write out: the guard did not fail, so this is not "stale".
      expect(thrown).toBeInstanceOf(BusinessLogicError);
      expect(getUIErrorMessage(thrown)).toBe(
        'Nothing was saved. This match may already be finished, or you can no longer score it. Refresh the page.'
      );
    });

    it('says the game is gone when the row no longer exists', async () => {
      noMatchThenReread({ data: null, error: null });

      const thrown = await LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN).catch(
        (error: unknown) => error
      );

      expect(thrown).toBeInstanceOf(BusinessLogicError);
      expect(getUIErrorMessage(thrown)).toBe('This game no longer exists. Refresh the page.');
    });

    it('throws DatabaseError when the second read fails', async () => {
      noMatchThenReread({ data: null, error: pgError('500') });

      await expect(
        LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN)
      ).rejects.toBeInstanceOf(DatabaseError);
    });

    it('maps a missing table on the second read to LiveScoringNotEnabledError', async () => {
      noMatchThenReread({ data: null, error: pgError('PGRST205') });

      await expect(
        LiveMatchService.completeGame('game-1', 'team-2', TOTALS, SEEN)
      ).rejects.toBeInstanceOf(LiveScoringNotEnabledError);
    });
  });
});

describe('reopenGame', () => {
  it('clears winner and returns the game to in_progress', async () => {
    const { update, eq, select } = updateChain({ data: { id: 'game-1' }, error: null });
    routeTables({ games: { update } });

    await LiveMatchService.reopenGame('game-1');

    expect(update).toHaveBeenCalledWith({
      status: 'in_progress',
      winner_team_id: null,
      completed_at: null,
    });
    expect(eq).toHaveBeenCalledWith('id', 'game-1');
    expect(select).toHaveBeenCalledWith('id');
  });

  it('throws DatabaseError when the update fails', async () => {
    const { update } = updateChain({ data: null, error: pgError('500') });
    routeTables({ games: { update } });

    await expect(LiveMatchService.reopenGame('game-1')).rejects.toBeInstanceOf(DatabaseError);
  });

  it('throws when no row was updated (RLS blocked it, no error)', async () => {
    const { update } = updateChain({ data: null, error: null });
    routeTables({ games: { update } });

    const thrown = await LiveMatchService.reopenGame('game-1').catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect(getUIErrorMessage(thrown)).toBe(
      'Nothing was reopened. This match may already be finished, or you can no longer change it. Refresh the page.'
    );
  });
});

// ─── startGameWithRoster ─────────────────────────────────────────────────────

describe('startGameWithRoster', () => {
  it('rejects more than 2 players per side before calling the database', async () => {
    await expect(
      LiveMatchService.startGameWithRoster('match-1', 1, 'team-1', ['a', 'b', 'c'], 'team-2', [])
    ).rejects.toThrow(/at most 2/);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('tells the scorer the limit rather than a generic failure', async () => {
    // A bare Error would be sanitised away; ValidationError is what carries the
    // wording to the toast in useGameFlow.
    const thrown = await LiveMatchService.startGameWithRoster(
      'match-1',
      1,
      'team-1',
      [],
      'team-2',
      ['a', 'b', 'c']
    ).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ValidationError);
    expect(getUIErrorMessage(thrown)).toBe('A team can select at most 2 players per game');
  });

  it('sends both line-ups in one call and returns the game row', async () => {
    mockRpc.mockResolvedValue({ data: { game_id: 'game-1', created: true }, error: null });
    const maybeSingle = vi.fn(() => Promise.resolve({ data: { id: 'game-1' }, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    routeTables({ games: { select } });

    const game = await LiveMatchService.startGameWithRoster(
      'match-1',
      2,
      'team-1',
      ['p1', 'p2'],
      'team-2',
      ['p3']
    );

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('start_game_with_roster', {
      p_match_id: 'match-1',
      p_game_number: 2,
      p_team1_id: 'team-1',
      p_team1_player_ids: ['p1', 'p2'],
      p_team2_id: 'team-2',
      p_team2_player_ids: ['p3'],
    });
    expect(eq).toHaveBeenCalledWith('id', 'game-1');
    expect(game).toEqual({ id: 'game-1' });
  });

  it('raises when the database refuses the start', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Not authorized to score this match', code: '42501' },
    });

    await expect(
      LiveMatchService.startGameWithRoster('match-1', 1, 'team-1', [], 'team-2', [])
    ).rejects.toThrow();
  });
});
