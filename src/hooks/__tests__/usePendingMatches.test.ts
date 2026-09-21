import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';

import { usePendingMatches } from '../usePendingMatches';

// Mock dependencies
vi.mock('@/services/matches/MatchReadService', () => ({
  fetchPendingMatches: vi.fn().mockResolvedValue([]),
  fetchTeamsMap: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  approveMatchResult: vi.fn().mockResolvedValue(true),
  confirmMatchTie: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { approveMatchResult, confirmMatchTie } from '@/services/matches/MatchWriteService';

// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePendingMatches', () => {
  const mockMatch: Match = {
    id: 'match-1',
    team1Id: 'team-1',
    team2Id: 'team-2',
    team1_game_wins: 2,
    team2_game_wins: 1,
    round_number: 1,
    iscompleted: true,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(approveMatchResult).mockResolvedValue(true);
  });

  it('should call approveMatchResult with correct parameters for team 1 winner', async () => {
    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleApproveResult(mockMatch, 1);
    });

    expect(approveMatchResult).toHaveBeenCalledWith(
      'match-1',
      'team-1', // winnerId
      'team-2', // loserId
      2, // winner's game wins
      1 // loser's game wins
    );
  });

  it('should pass correct game wins when team 2 wins', async () => {
    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleApproveResult(mockMatch, 2);
    });

    expect(approveMatchResult).toHaveBeenCalledWith(
      'match-1',
      'team-2', // winnerId (team 2 won)
      'team-1', // loserId
      1, // winner's game wins (team2GameWins)
      2 // loser's game wins (team1GameWins)
    );
  });

  it('should handle approveMatchResult failure gracefully', async () => {
    vi.mocked(approveMatchResult).mockRejectedValue(new Error('RPC failed'));

    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.handleApproveResult(mockMatch, 1);
      } catch {
        // Error is expected and handled by mutation
      }
    });

    expect(approveMatchResult).toHaveBeenCalled();
  });

  it('should call confirmMatchTie with match id', async () => {
    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleMarkAsTie('match-1');
    });

    expect(confirmMatchTie).toHaveBeenCalledWith('match-1');
  });

  // The list locks the actions of whichever matches are being written, so the
  // hook has to name them. Nothing used to, which let an admin ask for a winner
  // and a tie on one match before either write landed.
  describe('the matches a write is in flight for', () => {
    /**
     * A mock whose promise the test releases by hand. Two helpers rather than one
     * generic: `deferred<void>()` types the release function's own parameter as
     * `void`, which is not a valid parameter type.
     */
    const deferredVoid = () => {
      let release!: () => void;
      const promise = new Promise<void>((resolve) => {
        release = resolve;
      });
      return { promise, release };
    };

    const deferredValue = <T>() => {
      let release!: (value: T) => void;
      const promise = new Promise<T>((resolve) => {
        release = resolve;
      });
      return { promise, release };
    };

    it('names a match while its tie is being confirmed, and only then', async () => {
      const tie = deferredVoid();
      vi.mocked(confirmMatchTie).mockReturnValue(tie.promise);

      const { result } = renderHook(() => usePendingMatches(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect([...result.current.resolvingMatchIds]).toEqual([]);

      act(() => {
        result.current.handleMarkAsTie('match-1').catch(() => undefined);
      });
      await waitFor(() => expect([...result.current.resolvingMatchIds]).toEqual(['match-1']));

      await act(async () => {
        tie.release();
        await tie.promise;
      });
      await waitFor(() => expect([...result.current.resolvingMatchIds]).toEqual([]));
    });

    it('names a match while its winner is being approved', async () => {
      const approve = deferredValue<boolean>();
      vi.mocked(approveMatchResult).mockReturnValue(approve.promise);

      const { result } = renderHook(() => usePendingMatches(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.handleApproveResult(mockMatch, 1).catch(() => undefined);
      });
      await waitFor(() => expect([...result.current.resolvingMatchIds]).toEqual(['match-1']));

      await act(async () => {
        approve.release(true);
        await approve.promise;
      });
      await waitFor(() => expect([...result.current.resolvingMatchIds]).toEqual([]));
    });

    // A review caught this: with a single id, a second write on another match
    // took the slot and unlocked the first while it was still running, so the
    // admin could go back and ask for a contradictory result on it.
    it('keeps naming the first match when a second write starts on another', async () => {
      const tie = deferredVoid();
      const approve = deferredValue<boolean>();
      vi.mocked(confirmMatchTie).mockReturnValue(tie.promise);
      vi.mocked(approveMatchResult).mockReturnValue(approve.promise);

      const { result } = renderHook(() => usePendingMatches(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // A tie on match-1 starts...
      act(() => {
        result.current.handleMarkAsTie('match-1').catch(() => undefined);
      });
      await waitFor(() => expect(result.current.resolvingMatchIds.has('match-1')).toBe(true));

      // ...and an approval on match-2 starts before it finishes.
      act(() => {
        result.current
          .handleApproveResult({ ...mockMatch, id: 'match-2' }, 1)
          .catch(() => undefined);
      });
      await waitFor(() => expect(result.current.resolvingMatchIds.has('match-2')).toBe(true));

      // match-1 must still be named: its tie write has not settled.
      expect(result.current.resolvingMatchIds.has('match-1')).toBe(true);
      expect([...result.current.resolvingMatchIds].sort()).toEqual(['match-1', 'match-2']);

      // Each clears on its own settle, not the other's.
      await act(async () => {
        approve.release(true);
        await approve.promise;
      });
      await waitFor(() => expect(result.current.resolvingMatchIds.has('match-2')).toBe(false));
      expect(result.current.resolvingMatchIds.has('match-1')).toBe(true);

      await act(async () => {
        tie.release();
        await tie.promise;
      });
      await waitFor(() => expect([...result.current.resolvingMatchIds]).toEqual([]));
    });

    it('stops naming a match whose write failed', async () => {
      vi.mocked(confirmMatchTie).mockRejectedValue(new Error('refused'));

      const { result } = renderHook(() => usePendingMatches(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.handleMarkAsTie('match-1').catch(() => undefined);
      });

      await waitFor(() => expect([...result.current.resolvingMatchIds]).toEqual([]));
    });
  });

  it('should invalidate head-to-head and opponent-history queries after approval', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => usePendingMatches(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleApproveResult(mockMatch, 1);
    });

    const invalidatedKeys = invalidateSpy.mock.calls
      .map((call) => call[0]?.queryKey as readonly unknown[] | undefined)
      .filter((key): key is readonly unknown[] => Array.isArray(key));

    // head-to-head and opponent-history should be invalidated
    expect(invalidatedKeys.some((k) => k[0] === 'head-to-head')).toBe(true);
    expect(invalidatedKeys.some((k) => k[0] === 'opponent-history')).toBe(true);
  });

  it('should invalidate head-to-head and opponent-history queries after confirming a tie', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => usePendingMatches(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleMarkAsTie('match-1');
    });

    const invalidatedKeys = invalidateSpy.mock.calls
      .map((call) => call[0]?.queryKey as readonly unknown[] | undefined)
      .filter((key): key is readonly unknown[] => Array.isArray(key));

    expect(invalidatedKeys.some((k) => k[0] === 'head-to-head')).toBe(true);
    expect(invalidatedKeys.some((k) => k[0] === 'opponent-history')).toBe(true);
  });
});
