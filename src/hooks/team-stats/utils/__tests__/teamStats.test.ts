import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';

import { applyMatchResult } from '../teamRecordUtils';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('Team Stats Updates', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.resetAllMocks();

    // Set up default mocks for supabase.rpc (mockResolvedValue handles multiple async calls)
    (supabase.rpc as any).mockResolvedValue({
      data: { success: true },
      error: null,
    });

    // Set up default mocks for supabase.from().select().in()
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          data: [
            {
              id: 'winner-id',
              name: 'Winner Team',
              wins: 1,
              losses: 0,
              game_wins: 2,
              game_losses: 0,
            },
            {
              id: 'loser-id',
              name: 'Loser Team',
              wins: 0,
              losses: 1,
              game_wins: 0,
              game_losses: 2,
            },
          ],
          error: null,
        }),
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update team stats for a 2-0 result', async () => {
    // Test case: 2-0 win (winner gets 2 games, loser gets 0)
    await applyMatchResult('winner-id', 'loser-id', 2, 0);

    expect(supabase.rpc).toHaveBeenCalledWith('update_team_stats', {
      p_winner_id: 'winner-id',
      p_loser_id: 'loser-id',
      p_winner_game_wins: 2,
      p_loser_game_wins: 0,
    });
  });

  it('should update team stats for a 2-1 result', async () => {
    // Test case: 2-1 win (winner gets 2 games, loser gets 1)
    await applyMatchResult('winner-id', 'loser-id', 2, 1);

    expect(supabase.rpc).toHaveBeenCalledWith('update_team_stats', {
      p_winner_id: 'winner-id',
      p_loser_id: 'loser-id',
      p_winner_game_wins: 2,
      p_loser_game_wins: 1,
    });
  });

  it('should handle string inputs by converting them to numbers', async () => {
    // Test case: string inputs instead of numbers
    await applyMatchResult('winner-id', 'loser-id', '2' as any, '1' as any);

    expect(supabase.rpc).toHaveBeenCalledWith('update_team_stats', {
      p_winner_id: 'winner-id',
      p_loser_id: 'loser-id',
      p_winner_game_wins: 2,
      p_loser_game_wins: 1,
    });
  });

  it('should handle errors from the RPC call', async () => {
    // Mock RPC to return an error
    (supabase.rpc as any).mockReturnValue({
      data: null,
      error: { message: 'Test error' },
    });

    await expect(applyMatchResult('winner-id', 'loser-id', 2, 1)).rejects.toThrow(
      'Failed to update team stats via RPC: Test error'
    );
  });

  it('should throw an error when winnerId equals loserId', async () => {
    const sameTeamId = 'abc123';

    await expect(applyMatchResult(sameTeamId, sameTeamId, 2, 1)).rejects.toThrow(
      'Winner and loser must be different teams'
    );

    // Verify RPC was never called
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('should throw an error when winnerId equals loserId with different casing', async () => {
    await expect(
      applyMatchResult(
        '8F42B1C3-5D9E-4A7B-B2E1-9C3F4D5A6E7B',
        '8f42b1c3-5d9e-4a7b-b2e1-9c3f4d5a6e7b',
        2,
        1
      )
    ).rejects.toThrow('Winner and loser must be different teams');

    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
