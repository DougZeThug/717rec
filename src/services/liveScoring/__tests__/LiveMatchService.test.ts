import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, LiveScoringNotEnabledError, NotFoundError } from '@/types/errors';

// ─── Supabase mock (liveDb wraps the same client module) ─────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table), rpc: vi.fn() },
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

describe('completeGame', () => {
  it('marks the game completed with winner and folded totals', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: null }));
    const update = vi.fn(() => ({ eq }));
    routeTables({ games: { update } });

    await LiveMatchService.completeGame('game-1', 'team-2', { team1: 18, team2: 21 });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        winner_team_id: 'team-2',
        team1_score: 18,
        team2_score: 21,
      })
    );
    expect(eq).toHaveBeenCalledWith('id', 'game-1');
  });
});

describe('reopenGame', () => {
  it('clears winner and returns the game to in_progress', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: null }));
    const update = vi.fn(() => ({ eq }));
    routeTables({ games: { update } });

    await LiveMatchService.reopenGame('game-1');

    expect(update).toHaveBeenCalledWith({
      status: 'in_progress',
      winner_team_id: null,
      completed_at: null,
    });
  });
});

// ─── setGamePlayers ───────────────────────────────────────────────────────────

describe('setGamePlayers', () => {
  it('rejects more than 2 players per side', async () => {
    await expect(
      LiveMatchService.setGamePlayers('game-1', 'team-1', ['a', 'b', 'c'])
    ).rejects.toThrow(/at most 2/);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('replaces the side selection with slotted rows', async () => {
    const eq2 = vi.fn(() => Promise.resolve({ error: null }));
    const eq1 = vi.fn(() => ({ eq: eq2 }));
    const del = vi.fn(() => ({ eq: eq1 }));
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    routeTables({ game_players: { delete: del, insert } });

    await LiveMatchService.setGamePlayers('game-1', 'team-1', ['p1', 'p2']);

    expect(eq1).toHaveBeenCalledWith('game_id', 'game-1');
    expect(eq2).toHaveBeenCalledWith('team_id', 'team-1');
    expect(insert).toHaveBeenCalledWith([
      { game_id: 'game-1', team_id: 'team-1', player_id: 'p1', slot: 1 },
      { game_id: 'game-1', team_id: 'team-1', player_id: 'p2', slot: 2 },
    ]);
  });

  it('clears the selection without inserting when the list is empty', async () => {
    const eq2 = vi.fn(() => Promise.resolve({ error: null }));
    const eq1 = vi.fn(() => ({ eq: eq2 }));
    const del = vi.fn(() => ({ eq: eq1 }));
    const insert = vi.fn();
    routeTables({ game_players: { delete: del, insert } });

    await LiveMatchService.setGamePlayers('game-1', 'team-1', []);

    expect(del).toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
