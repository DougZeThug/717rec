import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpdateRound = vi.fn();
const mockDeleteRound = vi.fn();
const mockSetGameWinner = vi.fn();
const mockToast = vi.hoisted(() => vi.fn());
const mockInvalidateMatchRelatedQueries = vi.hoisted(() => vi.fn());

vi.mock('@/services/liveScoring/AdminCorrectionsService', () => ({
  AdminCorrectionsService: {
    updateRound: (...args: unknown[]) => mockUpdateRound(...args),
    deleteRound: (...args: unknown[]) => mockDeleteRound(...args),
    setGameWinner: (...args: unknown[]) => mockSetGameWinner(...args),
    listLiveScoredMatches: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: mockInvalidateMatchRelatedQueries,
}));

import { useAdminCorrections } from '../useAdminCorrections';

let queryClient: QueryClient;

const createWrapper = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mockInvalidateMatchRelatedQueries.mockResolvedValue(null);
});

describe('useAdminCorrections', () => {
  it('updateRound calls the service and invalidates the live-match cache', async () => {
    mockUpdateRound.mockResolvedValue({ id: 'r1' });
    const spy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');

    const { result } = renderHook(() => useAdminCorrections({ matchId: 'match-1' }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.updateRound.mutateAsync({
        roundId: 'r1',
        patch: { team1Score: 8 },
      });
    });

    expect(mockUpdateRound).toHaveBeenCalledWith('r1', { team1Score: 8 });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['live-match', 'match-1'] });
    expect(mockInvalidateMatchRelatedQueries).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Round updated' }));
  });

  it('affectsStandings=true also invalidates match-related queries', async () => {
    mockDeleteRound.mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useAdminCorrections({ matchId: 'match-1', affectsStandings: true }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.deleteRound.mutateAsync('r1');
    });

    expect(mockDeleteRound).toHaveBeenCalledWith('r1');
    expect(mockInvalidateMatchRelatedQueries).toHaveBeenCalledWith(queryClient);
  });

  it('changeGameWinner passes gameId, winner, and totals through', async () => {
    mockSetGameWinner.mockResolvedValue({ id: 'g1' });

    const { result } = renderHook(() => useAdminCorrections({ matchId: 'match-1' }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.changeGameWinner.mutateAsync({
        gameId: 'g1',
        winnerTeamId: 'team-2',
        finalTotals: { team1: 15, team2: 21 },
      });
    });

    expect(mockSetGameWinner).toHaveBeenCalledWith('g1', 'team-2', { team1: 15, team2: 21 });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Game winner updated' })
    );
  });

  it('surfaces service errors via toast without throwing from onError', async () => {
    mockUpdateRound.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useAdminCorrections({ matchId: 'match-1' }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.updateRound
        .mutateAsync({ roundId: 'r1', patch: { team1Score: 8 } })
        .catch(() => {});
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not update round', variant: 'destructive' })
    );
  });
});
