import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePendingMatches } from '../usePendingMatches';

// Mock dependencies
vi.mock('@/services/matches/MatchReadService', () => ({
  fetchPendingMatches: vi.fn().mockResolvedValue([]),
  fetchTeamsMap: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  approveMatchResult: vi.fn().mockResolvedValue(true),
  markMatchAsTie: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { approveMatchResult, markMatchAsTie } from '@/services/matches/MatchWriteService';

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
  const mockMatch = {
    id: 'match-1',
    team1Id: 'team-1',
    team2Id: 'team-2',
    team1_game_wins: 2,
    team2_game_wins: 1,
    roundNumber: 1,
    isCompleted: true,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    (approveMatchResult as any).mockResolvedValue(true);
    (markMatchAsTie as any).mockResolvedValue(true);
  });

  it('should call approveMatchResult with correct parameters for team 1 winner', async () => {
    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleApproveResult(mockMatch as any, 1);
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
      await result.current.handleApproveResult(mockMatch as any, 2);
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
    (approveMatchResult as any).mockRejectedValue(new Error('RPC failed'));

    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.handleApproveResult(mockMatch as any, 1);
      } catch {
        // Error is expected and handled by mutation
      }
    });

    expect(approveMatchResult).toHaveBeenCalled();
  });

  it('should call markMatchAsTie with match id', async () => {
    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleMarkAsTie('match-1');
    });

    expect(markMatchAsTie).toHaveBeenCalledWith('match-1');
  });
});
