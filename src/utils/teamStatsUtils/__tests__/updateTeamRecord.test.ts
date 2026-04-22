import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/teams/TeamUpdateService', () => ({
  updateTeamWinLossRecord: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  dbLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { updateTeamWinLossRecord } from '@/services/teams/TeamUpdateService';

import { updateTeamRecord } from '../updateTeamRecord';

describe('updateTeamRecord', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    {
      label: 'winner branch',
      input: {
        teamId: 'team-1',
        isWinner: true,
        gameWins: 2,
        gameLosses: 1,
        currentWins: 3,
        currentLosses: 1,
        currentGameWins: 7,
        currentGameLosses: 4,
      },
      expectedPayload: {
        wins: 4,
        losses: 1,
        game_wins: 9,
        game_losses: 5,
      },
    },
    {
      label: 'loser branch',
      input: {
        teamId: 'team-2',
        isWinner: false,
        gameWins: 1,
        gameLosses: 2,
        currentWins: 2,
        currentLosses: 2,
        currentGameWins: 5,
        currentGameLosses: 6,
      },
      expectedPayload: {
        wins: 2,
        losses: 3,
        game_wins: 6,
        game_losses: 8,
      },
    },
    {
      label: 'zero delta and missing optional fields style input',
      input: {
        teamId: 'team-3',
        isWinner: false,
        gameWins: 0,
        gameLosses: 0,
        currentWins: 0,
        currentLosses: 0,
        currentGameWins: 0,
        currentGameLosses: 0,
      },
      expectedPayload: {
        wins: 0,
        losses: 1,
        game_wins: 0,
        game_losses: 0,
      },
    },
  ])('updates stats for $label', async ({ input, expectedPayload }) => {
    await expect(updateTeamRecord(input)).resolves.toBe(true);
    expect(updateTeamWinLossRecord).toHaveBeenCalledWith(input.teamId, expectedPayload);
  });

  it('propagates update service failure', async () => {
    vi.mocked(updateTeamWinLossRecord).mockRejectedValueOnce(new Error('write failed'));

    await expect(
      updateTeamRecord({
        teamId: 'team-1',
        isWinner: true,
        gameWins: 2,
        gameLosses: 0,
        currentWins: 0,
        currentLosses: 0,
        currentGameWins: 0,
        currentGameLosses: 0,
      })
    ).rejects.toThrow('write failed');
  });
});
