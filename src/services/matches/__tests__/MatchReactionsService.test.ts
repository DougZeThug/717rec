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
import { MatchReactionsService } from '../MatchReactionsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

const makeReaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'reaction-1', match_id: 'match-1', user_id: 'user-1',
  emoji: '🔥', created_at: '2026-04-17T18:00:00Z', ...overrides,
});

// ─── fetchReactions ───────────────────────────────────────────────────────────

describe('MatchReactionsService.fetchReactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns reactions on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: [makeReaction()], error: null }) }),
    });
    const result = await MatchReactionsService.fetchReactions('match-1');
    expect(result).toHaveLength(1);
    expect(result[0].emoji).toBe('🔥');
    expect(mockFrom).toHaveBeenCalledWith('match_reactions');
  });

  it('returns empty array when no reactions', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    });
    expect(await MatchReactionsService.fetchReactions('match-1')).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(MatchReactionsService.fetchReactions('match-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── insertReaction ───────────────────────────────────────────────────────────

describe('MatchReactionsService.insertReaction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue({
      upsert: () => Promise.resolve({ error: null }),
    });
    await expect(
      MatchReactionsService.insertReaction('match-1', 'user-1', '🔥')
    ).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('match_reactions');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      upsert: () => Promise.resolve({ error: pgError() }),
    });
    await expect(
      MatchReactionsService.insertReaction('match-1', 'user-1', '🔥')
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── deleteReaction ───────────────────────────────────────────────────────────

describe('MatchReactionsService.deleteReaction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    });
    await expect(
      MatchReactionsService.deleteReaction('reaction-1', 'user-1')
    ).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('match_reactions');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: pgError() }) }) }),
    });
    await expect(
      MatchReactionsService.deleteReaction('reaction-1', 'user-1')
    ).rejects.toThrow(DatabaseError);
  });
});
