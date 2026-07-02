import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reverseTeamStats } from '../statReversalUtils';

const { mockReverseTeamStatsService } = vi.hoisted(() => ({
  mockReverseTeamStatsService: vi.fn(),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  reverseTeamStats: mockReverseTeamStatsService,
}));

describe('reverseTeamStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to the service with winner/loser ids and game wins in order', async () => {
    mockReverseTeamStatsService.mockResolvedValue(undefined);

    await reverseTeamStats('winner-1', 'loser-1', 2, 1);

    expect(mockReverseTeamStatsService).toHaveBeenCalledTimes(1);
    expect(mockReverseTeamStatsService).toHaveBeenCalledWith('winner-1', 'loser-1', 2, 1);
  });

  it('propagates service errors to the caller', async () => {
    mockReverseTeamStatsService.mockRejectedValue(new Error('rpc failed'));

    await expect(reverseTeamStats('winner-1', 'loser-1', 2, 0)).rejects.toThrow('rpc failed');
  });
});
