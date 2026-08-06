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
  deleteBracket,
  updatePlayoffMatchResult,
  updatePlayoffMatchScores,
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

