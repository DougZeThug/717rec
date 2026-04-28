import { describe, expect, it, vi } from 'vitest';

const mockUpdateMatchArray = vi.fn();

vi.mock('@/services/matches/MatchWriteService', () => ({
  updateMatchArray: (...args: unknown[]) => mockUpdateMatchArray(...args),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  matchLog: vi.fn(),
}));

import { determineWinnerLoser, updateMatchInDatabase } from '../matchUpdateCore';

describe('matchUpdateCore', () => {
  it('determines winner/loser and rejects invalid score state', () => {
    expect(determineWinnerLoser({ team1Score: 1, team1Id: 't1', team2Id: 't2' } as any)).toEqual({
      winnerId: 't1',
      loserId: 't2',
    });
    expect(determineWinnerLoser({ team1Score: 0, team2Score: 0 } as any)).toBeNull();
  });

  it('sends update payload to supabase boundary and handles failures', async () => {
    mockUpdateMatchArray.mockResolvedValueOnce([{ id: 'm1' }]);

    const success = await updateMatchInDatabase({
      id: 'm1',
      team1Id: 't1',
      team2Id: 't2',
      team1Score: 1,
      team2Score: 0,
      team1_game_wins: 2,
      team2_game_wins: 1,
      iscompleted: true,
    } as any);

    expect(success).toBe(true);
    expect(mockUpdateMatchArray).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ winner_id: 't1', loser_id: 't2', team1_score: 1, team2_score: 0 })
    );

    mockUpdateMatchArray.mockResolvedValueOnce([]);
    const noRows = await updateMatchInDatabase({
      id: 'm2',
      team1Id: 't1',
      team2Id: 't2',
      team1Score: 1,
      team2Score: 0,
    } as any);

    expect(noRows).toBe(false);
  });
});
