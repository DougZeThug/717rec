import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock (liveDb wraps the same client module) ─────────────────────

const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: (...args: unknown[]) => mockRpc(...args) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  matchLog: vi.fn(),
}));

// Import after mocks
import { FinalizeService } from '../FinalizeService';

const pgError = (code: string, msg = 'rpc failed') => ({
  message: msg,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('finalizeLiveMatch', () => {
  it('calls the RPC with the match id and parses an applied result', async () => {
    mockRpc.mockResolvedValue({
      data: { applied: true, winner_id: 'team-2', team1_game_wins: 1, team2_game_wins: 2 },
      error: null,
    });

    const result = await FinalizeService.finalizeLiveMatch('match-1');

    expect(mockRpc).toHaveBeenCalledWith('finalize_live_match', { p_match_id: 'match-1' });
    expect(result).toEqual({
      applied: true,
      winnerId: 'team-2',
      team1GameWins: 1,
      team2GameWins: 2,
      reason: undefined,
    });
  });

  it('parses applied:false (already completed) as a non-error outcome', async () => {
    mockRpc.mockResolvedValue({
      data: { applied: false, reason: 'already_completed' },
      error: null,
    });

    const result = await FinalizeService.finalizeLiveMatch('match-1');

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('already_completed');
  });

  it('throws DatabaseError when the RPC fails (e.g. match not decided)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError('P0001', 'Match is not decided yet') });

    await expect(FinalizeService.finalizeLiveMatch('match-1')).rejects.toBeInstanceOf(
      DatabaseError
    );
  });
});

describe('reopenLiveMatch', () => {
  it('returns true when the result was reversed', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    await expect(FinalizeService.reopenLiveMatch('match-1')).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('reopen_live_match', { p_match_id: 'match-1' });
  });

  it('returns false when there was nothing to reverse (idempotent)', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    await expect(FinalizeService.reopenLiveMatch('match-1')).resolves.toBe(false);
  });

  it('throws DatabaseError when the caller is not an admin', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError('P0001', 'Admin access required') });

    await expect(FinalizeService.reopenLiveMatch('match-1')).rejects.toBeInstanceOf(DatabaseError);
  });
});
