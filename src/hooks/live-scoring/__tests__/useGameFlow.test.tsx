import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockStartGameWithRoster = vi.fn();
const mockCompleteGame = vi.fn();
const mockReopenGame = vi.fn();
const mockToast = vi.hoisted(() => vi.fn());

vi.mock('@/services/liveScoring/LiveMatchService', () => ({
  LiveMatchService: {
    startGameWithRoster: (...args: unknown[]) => mockStartGameWithRoster(...args),
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
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  onlineManager.setOnline(true);
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('startGame', () => {
  // One call, not three. The game and both line-ups land together or not at
  // all, so a failed line-up write can no longer leave a live game with one
  // side rostered and the other empty.
  it('starts the game and both line-ups in a single call', async () => {
    mockStartGameWithRoster.mockResolvedValue({ id: 'game-1' });

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

    expect(mockStartGameWithRoster).toHaveBeenCalledTimes(1);
    expect(mockStartGameWithRoster).toHaveBeenCalledWith(
      'match-1',
      2,
      'team-1',
      ['p1', 'p2'],
      'team-2',
      ['p3']
    );
  });

  it('toasts on failure', async () => {
    mockStartGameWithRoster.mockRejectedValue(new Error('nope'));

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

  // A round save is deliberately parked when the signal is gone. This is not:
  // it carries a snapshot of the totals, and a round held at the same moment can
  // still be refused before a parked completion would replay — writing a
  // finished game the recorded rounds do not agree with. It fails now instead.
  it('fails with no signal rather than waiting to be sent', async () => {
    onlineManager.setOnline(false);
    mockCompleteGame.mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useGameFlow('match-1'), { wrapper: createWrapper() });

    act(() => {
      result.current.confirmGameComplete.mutate({
        gameId: 'game-1',
        winnerTeamId: 'team-2',
        finalTotals: { team1: 18, team2: 21 },
      });
    });

    await waitFor(() => expect(result.current.confirmGameComplete.isError).toBe(true));
    expect(result.current.confirmGameComplete.isPaused).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not complete game', variant: 'destructive' })
    );
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

describe('per-game lineup selection', () => {
  it('starts Game 2 with a different lineup than Game 1', async () => {
    mockStartGameWithRoster
      .mockResolvedValueOnce({ id: 'game-1' })
      .mockResolvedValueOnce({ id: 'game-2' });

    const { result } = renderHook(() => useGameFlow('match-1'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.startGame.mutateAsync({
        gameNumber: 1,
        team1Id: 'team-1',
        team2Id: 'team-2',
        team1PlayerIds: ['p1', 'p2'],
        team2PlayerIds: ['p3', 'p4'],
      });
    });

    await act(async () => {
      await result.current.startGame.mutateAsync({
        gameNumber: 2,
        team1Id: 'team-1',
        team2Id: 'team-2',
        // 3-player team subs p5 in for p2; opponent keeps same pair.
        team1PlayerIds: ['p1', 'p5'],
        team2PlayerIds: ['p3', 'p4'],
      });
    });

    expect(mockStartGameWithRoster).toHaveBeenNthCalledWith(
      1,
      'match-1',
      1,
      'team-1',
      ['p1', 'p2'],
      'team-2',
      ['p3', 'p4']
    );
    expect(mockStartGameWithRoster).toHaveBeenNthCalledWith(
      2,
      'match-1',
      2,
      'team-1',
      ['p1', 'p5'],
      'team-2',
      ['p3', 'p4']
    );
  });
});
