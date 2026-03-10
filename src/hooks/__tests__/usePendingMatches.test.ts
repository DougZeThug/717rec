import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';

import { usePendingMatches } from '../usePendingMatches';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

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

    // Default mock for fetching matches and teams
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'matches') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'v_team_details') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    // Default RPC mock
    (supabase.rpc as any).mockResolvedValue({ data: true, error: null });
  });

  it('should call approve_match_result RPC with correct parameters for team 1 winner', async () => {
    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleApproveResult(mockMatch as any, 1);
    });

    expect(supabase.rpc).toHaveBeenCalledWith('approve_match_result', {
      p_match_id: 'match-1',
      p_winner_id: 'team-1',
      p_loser_id: 'team-2',
      p_winner_game_wins: 2,
      p_loser_game_wins: 1,
    });
  });

  it('should call approve_match_result RPC with swapped params for team 2 winner', async () => {
    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleApproveResult(mockMatch as any, 2);
    });

    expect(supabase.rpc).toHaveBeenCalledWith('approve_match_result', {
      p_match_id: 'match-1',
      p_winner_id: 'team-2',
      p_loser_id: 'team-1',
      p_winner_game_wins: 1,
      p_loser_game_wins: 2,
    });
  });

  it('should handle approve_match_result RPC failure gracefully', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'RPC failed' },
    });

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

    expect(supabase.rpc).toHaveBeenCalledWith('approve_match_result', expect.any(Object));
  });

  it('should call mark_match_as_tie RPC', async () => {
    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleMarkAsTie('match-1');
    });

    expect(supabase.rpc).toHaveBeenCalledWith('mark_match_as_tie', {
      p_match_id: 'match-1',
    });
  });
});
