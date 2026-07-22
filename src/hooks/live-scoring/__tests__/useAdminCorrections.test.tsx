import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAdminCorrections } from '../useAdminCorrections';

const mockUpdateRound = vi.fn();
const mockDeleteRound = vi.fn();
const mockSetGameWinner = vi.fn();
const mockInvalidateMatchRelatedQueries = vi.fn();
const mockToast = vi.fn();

vi.mock('@/services/liveScoring/AdminCorrectionsService', () => ({
  AdminCorrectionsService: {
    updateRound: (...args: unknown[]) => mockUpdateRound(...args),
    deleteRound: (...args: unknown[]) => mockDeleteRound(...args),
    setGameWinner: (...args: unknown[]) => mockSetGameWinner(...args),
  },
}));

vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: (...args: unknown[]) => mockInvalidateMatchRelatedQueries(...args),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

vi.mock('@/utils/errorHandler', () => ({
  getUIErrorMessage: (error: unknown) => (error instanceof Error ? error.message : 'Unknown error'),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateSpy, queryClient };
};

describe('useAdminCorrections', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('updates a round, toasts success, and invalidates live match caches', async () => {
    mockUpdateRound.mockResolvedValue({ id: 'round-1' });
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useAdminCorrections({ matchId: 'match-1' }), { wrapper });

    await result.current.updateRound.mutateAsync({
      roundId: 'round-1',
      patch: { team1Score: 5, team2Score: 2 },
    });

    expect(mockUpdateRound).toHaveBeenCalledWith('round-1', { team1Score: 5, team2Score: 2 });
    expect(mockToast).toHaveBeenCalledWith({ title: 'Round updated' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['live-match', 'match-1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'live-scored-matches'] });
    expect(mockInvalidateMatchRelatedQueries).not.toHaveBeenCalled();
  });

  it('deletes a round and invalidates standings-related caches for finalized matches', async () => {
    mockDeleteRound.mockResolvedValue(undefined);
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () => useAdminCorrections({ matchId: 'match-2', affectsStandings: true }),
      { wrapper }
    );

    await result.current.deleteRound.mutateAsync('round-2');

    expect(mockDeleteRound).toHaveBeenCalledWith('round-2');
    expect(mockToast).toHaveBeenCalledWith({ title: 'Round deleted' });
    expect(mockInvalidateMatchRelatedQueries).toHaveBeenCalledWith(queryClient);
  });

  it('changes a winner and shows a destructive toast when the service fails', async () => {
    mockSetGameWinner.mockRejectedValue(new Error('winner rejected'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAdminCorrections({ matchId: 'match-3' }), { wrapper });

    await expect(
      result.current.changeGameWinner.mutateAsync({
        gameId: 'game-1',
        winnerTeamId: 'team-b',
        finalTotals: { team1: 18, team2: 21 },
      })
    ).rejects.toThrow('winner rejected');

    expect(mockSetGameWinner).toHaveBeenCalledWith('game-1', 'team-b', { team1: 18, team2: 21 });
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Could not change game winner',
      description: 'winner rejected',
      variant: 'destructive',
    });
  });
});
