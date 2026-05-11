import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

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
}));

// Import after mocks
import {
  batchUpdateTeamSeeds,
  deleteBracket,
  deletePlayoffGames,
  insertPlayoffGames,
  updatePlayoffMatchResult,
  updatePlayoffMatchScores,
  updateTeamSeed,
  upsertPlayoffGame,
} from '../BracketWriteService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// ─── deleteBracket ────────────────────────────────────────────────────────────

describe('deleteBracket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({ delete: () => ({ eq: () => Promise.resolve({ error: null }) }) });
    await expect(deleteBracket('b-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('brackets');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(deleteBracket('b-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── updatePlayoffMatchResult ─────────────────────────────────────────────────

describe('updatePlayoffMatchResult', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) });
    await expect(
      updatePlayoffMatchResult('m-1', {
        winner_id: 't1',
        loser_id: 't2',
        team1_score: 2,
        team2_score: 1,
        status: 'complete',
      })
    ).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('playoff_matches');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(
      updatePlayoffMatchResult('m-1', {
        winner_id: 't1',
        loser_id: 't2',
        team1_score: 2,
        team2_score: 1,
        status: 'complete',
      })
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── upsertPlayoffGame ────────────────────────────────────────────────────────

describe('upsertPlayoffGame', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({ upsert: () => Promise.resolve({ error: null }) });
    await expect(
      upsertPlayoffGame({
        id: 'g-1',
        match_id: 'm-1',
        game_number: 1,
        team1_score: 2,
        team2_score: 1,
        winner_id: 't1',
      })
    ).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({ upsert: () => Promise.resolve({ error: pgError() }) });
    await expect(
      upsertPlayoffGame({
        id: 'g-1',
        match_id: 'm-1',
        game_number: 1,
        team1_score: 2,
        team2_score: 1,
        winner_id: null,
      })
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── updatePlayoffMatchScores ─────────────────────────────────────────────────

describe('updatePlayoffMatchScores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) });
    await expect(
      updatePlayoffMatchScores('m-1', {
        team1_score: 2,
        team2_score: 1,
        winner_id: 't1',
        loser_id: 't2',
        status: 'complete',
        updated_at: '2026-04-17',
      })
    ).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(
      updatePlayoffMatchScores('m-1', {
        team1_score: 2,
        team2_score: 1,
        winner_id: 't1',
        loser_id: 't2',
        status: 'complete',
        updated_at: '2026-04-17',
      })
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── deletePlayoffGames ───────────────────────────────────────────────────────

describe('deletePlayoffGames', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({ delete: () => ({ eq: () => Promise.resolve({ error: null }) }) });
    await expect(deletePlayoffGames('m-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('playoff_games');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(deletePlayoffGames('m-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── insertPlayoffGames ───────────────────────────────────────────────────────

describe('insertPlayoffGames', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({ insert: () => Promise.resolve({ error: null }) });
    await expect(
      insertPlayoffGames([
        { match_id: 'm-1', game_number: 1, team1_score: 2, team2_score: 1, winner_id: 't1' },
      ])
    ).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({ insert: () => Promise.resolve({ error: pgError() }) });
    await expect(
      insertPlayoffGames([
        { match_id: 'm-1', game_number: 1, team1_score: 2, team2_score: 1, winner_id: null },
      ])
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── updateTeamSeed ───────────────────────────────────────────────────────────

describe('updateTeamSeed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns updated seed data on success', async () => {
    const row = { id: 't-1', seed: 3 };
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }),
        }),
      }),
    });
    const result = await updateTeamSeed('t-1', 3);
    expect(result.seed).toBe(3);
    expect(mockFrom).toHaveBeenCalledWith('teams');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
        }),
      }),
    });
    await expect(updateTeamSeed('t-1', 3)).rejects.toThrow(DatabaseError);
  });
});

// ─── batchUpdateTeamSeeds ─────────────────────────────────────────────────────

describe('batchUpdateTeamSeeds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns parsed rpc results on success', async () => {
    mockRpc.mockResolvedValue({
      data: { results: [{ ok: true, team_id: 't-1', seed: '1' }] },
      error: null,
    });
    const result = await batchUpdateTeamSeeds([{ teamId: 't-1', seed: 1 }]);
    expect(mockRpc).toHaveBeenCalledWith('batch_update_team_seeds', {
      p_updates: [{ team_id: 't-1', seed: '1' }],
    });
    expect(result).toEqual([{ ok: true, team_id: 't-1', seed: '1' }]);
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(batchUpdateTeamSeeds([])).rejects.toThrow(DatabaseError);
  });
});
