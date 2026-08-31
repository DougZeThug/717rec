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
