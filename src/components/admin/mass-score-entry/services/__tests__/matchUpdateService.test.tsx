import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MatchWithTeams } from '../../types';

const mockUpdateTeamStats = vi.fn();
const mockUpdateMatchInDatabase = vi.fn();

vi.mock('@/hooks/matches/useTeamRecordUpdate', () => ({
  useTeamRecordUpdate: () => ({ updateTeamStats: mockUpdateTeamStats }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../matchUpdateCore', () => ({
  updateMatchInDatabase: (...args: unknown[]) => mockUpdateMatchInDatabase(...args),
  determineWinnerLoser: vi.fn((match: MatchWithTeams) => ({
    winnerId: match.team1Id,
    loserId: match.team2Id,
  })),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { useMatchUpdateService } from '../matchUpdateService';

const makeMatch = (overrides: Partial<MatchWithTeams> = {}): MatchWithTeams => ({
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  team1_game_wins: 2,
  team2_game_wins: 1,
  iscompleted: true,
  team1: { id: 't1', name: 'Team 1' },
  team2: { id: 't2', name: 'Team 2' },
  ...overrides,
});

describe('useMatchUpdateService', () => {
  it('updates match and team stats on success', async () => {
    mockUpdateMatchInDatabase.mockResolvedValueOnce(true);
    mockUpdateTeamStats.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useMatchUpdateService());

    await act(async () => {
      const ok = await result.current.updateMatch(makeMatch());
      expect(ok).toBe(true);
    });

    expect(mockUpdateTeamStats).toHaveBeenCalled();
  });

  it('returns false on update errors', async () => {
    mockUpdateMatchInDatabase.mockRejectedValueOnce(new Error('db fail'));

    const { result } = renderHook(() => useMatchUpdateService());

    await act(async () => {
      const ok = await result.current.updateMatch(makeMatch({ id: 'm2' }));
      expect(ok).toBe(false);
    });
  });
});
