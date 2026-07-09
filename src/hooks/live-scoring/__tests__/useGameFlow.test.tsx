import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateGame = vi.fn();
const mockSetGamePlayers = vi.fn();
const mockCompleteGame = vi.fn();
const mockReopenGame = vi.fn();
const mockToast = vi.hoisted(() => vi.fn());

vi.mock('@/services/liveScoring/LiveMatchService', () => ({
  LiveMatchService: {
    createGame: (...args: unknown[]) => mockCreateGame(...args),
    setGamePlayers: (...args: unknown[]) => mockSetGamePlayers(...args),
    completeGame: (...args: unknown[]) => mockCompleteGame(...args),
    reopenGame: (...args: unknown[]) => mockReopenGame(...args),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast }),
}));

import { useGameFlow } from '../useGameFlow';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('startGame', () => {
  it('creates the game then assigns both sides players', async () => {
    mockCreateGame.mockResolvedValue({ id: 'game-1' });
    mockSetGamePlayers.mockResolvedValue(null);

    const { result } = renderHook(() => useGameFlow('match-1'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.startGame.mutateAsync({
        gameNumber: 2,
        team1Id: 'team-1',
        team2Id: 'team-2',
        team1PlayerIds: ['p1', 'p2'],
        team2PlayerIds: ['p3'],
      });
    });

    expect(mockCreateGame).toHaveBeenCalledWith('match-1', 2);
    expect(mockSetGamePlayers).toHaveBeenCalledWith('game-1', 'team-1', ['p1', 'p2']);
    expect(mockSetGamePlayers).toHaveBeenCalledWith('game-1', 'team-2', ['p3']);
  });

  it('toasts on failure', async () => {
    mockCreateGame.mockRejectedValue(new Error('nope'));

    const { result } = renderHook(() => useGameFlow('match-1'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.startGame
        .mutateAsync({
          gameNumber: 1,
          team1Id: 'team-1',
          team2Id: 'team-2',
          team1PlayerIds: [],
          team2PlayerIds: [],
        })
        .catch(() => undefined);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not start game', variant: 'destructive' })
    );
  });
});

describe('confirmGameComplete', () => {
  it('completes the game with the winner and folded totals', async () => {
    mockCompleteGame.mockResolvedValue(null);

    const { result } = renderHook(() => useGameFlow('match-1'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.confirmGameComplete.mutateAsync({
        gameId: 'game-1',
        winnerTeamId: 'team-2',
        finalTotals: { team1: 18, team2: 21 },
      });
    });

    expect(mockCompleteGame).toHaveBeenCalledWith('game-1', 'team-2', { team1: 18, team2: 21 });
  });
});

describe('reopenGame', () => {
  it('reopens the given game', async () => {
    mockReopenGame.mockResolvedValue(null);

    const { result } = renderHook(() => useGameFlow('match-1'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.reopenGame.mutateAsync('game-2');
    });

    expect(mockReopenGame).toHaveBeenCalledWith('game-2');
  });
});
