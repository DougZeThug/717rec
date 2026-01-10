import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateMatchScore, UpdateMatchScoreParams } from '../utils/matchDatabaseUtils';

// Mock supabase client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock BadgeProcessingService
vi.mock('@/services/BadgeProcessingService', () => ({
  BadgeProcessingService: {
    processMatchBadges: vi.fn().mockResolvedValue({ success: true }),
    processKingslayerBadge: vi.fn().mockResolvedValue({ success: true }),
    processClutchPerformerBadge: vi.fn().mockResolvedValue({ success: true }),
    processConsistentPerformerBadge: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/utils/logger', () => ({
  matchLog: vi.fn(),
  badgeLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
}));

import { BadgeProcessingService } from '@/services/BadgeProcessingService';

describe('updateMatchScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockChain = (
    matchData: any,
    updateData: any,
    matchError: any = null,
    updateError: any = null
  ) => {
    // First call - get match data
    const selectSingle = vi.fn().mockResolvedValueOnce({ data: matchData, error: matchError });
    const selectEq = vi.fn(() => ({ single: selectSingle }));
    const selectFn = vi.fn(() => ({ eq: selectEq }));

    // Second call - update match
    const updateSingle = vi.fn().mockResolvedValueOnce({ data: updateData, error: updateError });
    const updateSelectFn = vi.fn(() => ({ single: updateSingle }));
    const updateEq = vi.fn(() => ({ select: updateSelectFn }));
    const updateFn = vi.fn(() => ({ eq: updateEq }));

    mockSupabase.from.mockImplementation(() => ({
      select: selectFn,
      update: updateFn,
    }));
  };

  it('successfully updates match score when team1 wins', async () => {
    createMockChain(
      { team1_id: 'team-1', team2_id: 'team-2' },
      { id: 'match-1', team1_score: 2, team2_score: 1 }
    );

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    const result = await updateMatchScore(params);

    expect(result.team1Win).toBe(true);
    expect(result.team1_id).toBe('team-1');
    expect(result.team2_id).toBe('team-2');
    expect(result.data).toBeDefined();
  });

  it('correctly determines team2 as winner', async () => {
    createMockChain(
      { team1_id: 'team-1', team2_id: 'team-2' },
      { id: 'match-1', team1_score: 1, team2_score: 3 }
    );

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 1,
      team2Score: 3,
      team1GameWins: 1,
      team2GameWins: 3,
    };

    const result = await updateMatchScore(params);

    expect(result.team1Win).toBe(false);
  });

  it('throws error when match not found', async () => {
    createMockChain(null, null, { message: 'Match not found' });

    const params: UpdateMatchScoreParams = {
      matchId: 'non-existent',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    await expect(updateMatchScore(params)).rejects.toThrow('Failed to fetch match data');
  });

  it('throws error when update fails', async () => {
    createMockChain({ team1_id: 'team-1', team2_id: 'team-2' }, null, null, {
      message: 'Update failed',
    });

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    await expect(updateMatchScore(params)).rejects.toBeDefined();
  });

  it('processes badges after successful update', async () => {
    createMockChain(
      { team1_id: 'team-1', team2_id: 'team-2' },
      { id: 'match-1', team1_score: 2, team2_score: 1 }
    );

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    await updateMatchScore(params);

    expect(BadgeProcessingService.processMatchBadges).toHaveBeenCalledWith('team-1', 'team-2');
    expect(BadgeProcessingService.processKingslayerBadge).toHaveBeenCalled();
    expect(BadgeProcessingService.processClutchPerformerBadge).toHaveBeenCalled();
    expect(BadgeProcessingService.processConsistentPerformerBadge).toHaveBeenCalled();
  });

  it('does not fail when badge processing fails', async () => {
    vi.mocked(BadgeProcessingService.processMatchBadges).mockRejectedValueOnce(
      new Error('Badge error')
    );

    createMockChain(
      { team1_id: 'team-1', team2_id: 'team-2' },
      { id: 'match-1', team1_score: 2, team2_score: 1 }
    );

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    // Should not throw
    const result = await updateMatchScore(params);
    expect(result.data).toBeDefined();
  });
});
