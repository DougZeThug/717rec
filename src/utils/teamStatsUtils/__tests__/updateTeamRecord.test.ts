import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/teams/TeamUpdateService', () => ({
  updateTeamWinLossRecord: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/logger', () => ({
  dbLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { updateTeamWinLossRecord } from '@/services/teams/TeamUpdateService';

import { updateTeamRecord } from '../updateTeamRecord';

describe('updateTeamRecord', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls updateTeamWinLossRecord with incremented wins for a winner', async () => {
    await updateTeamRecord({
      teamId: 'team-1',
      isWinner: true,
      gameWins: 2,
      gameLosses: 1,
      currentWins: 3,
      currentLosses: 1,
      currentGameWins: 7,
      currentGameLosses: 4,
    });

    expect(updateTeamWinLossRecord).toHaveBeenCalledWith('team-1', {
      wins: 4,
      losses: 1,
      game_wins: 9,
      game_losses: 5,
    });
  });

  it('calls updateTeamWinLossRecord with incremented losses for a loser', async () => {
    await updateTeamRecord({
      teamId: 'team-2',
      isWinner: false,
      gameWins: 1,
      gameLosses: 2,
      currentWins: 2,
      currentLosses: 2,
      currentGameWins: 5,
      currentGameLosses: 6,
    });

    expect(updateTeamWinLossRecord).toHaveBeenCalledWith('team-2', {
      wins: 2,
      losses: 3,
      game_wins: 6,
      game_losses: 8,
    });
  });

  it('returns true on success', async () => {
    const result = await updateTeamRecord({
      teamId: 'team-1',
      isWinner: true,
      gameWins: 2,
      gameLosses: 1,
      currentWins: 0,
      currentLosses: 0,
      currentGameWins: 0,
      currentGameLosses: 0,
    });

    expect(result).toBe(true);
  });
});
