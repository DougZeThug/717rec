import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePendingMatches } from '../usePendingMatches';
import { supabase } from "@/integrations/supabase/client";
import { applyMatchResult } from '@/hooks/team-stats/utils/teamRecordUtils';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

vi.mock('@/hooks/team-stats/utils/teamRecordUtils', () => ({
  applyMatchResult: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
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
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('usePendingMatches', () => {
  const mockMatch = {
    id: 'match-1',
    team1Id: 'team-1',
    team2Id: 'team-2',
    team1_game_wins: 2,
    team2_game_wins: 1,
    roundNumber: 1,
    isCompleted: true
  };

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Default mock for fetching matches
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'matches') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            }),
            update: vi.fn()
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        };
      }
      if (table === 'v_team_details') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
  });

  it('should use atomic applyMatchResult for team stats update', async () => {
    // Setup mock to allow update
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'matches') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        };
      }
      if (table === 'v_team_details') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    (applyMatchResult as any).mockResolvedValue(true);

    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper()
    });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Call handleApproveResult with team 1 as winner
    await act(async () => {
      await result.current.handleApproveResult(mockMatch as any, 1);
    });

    // Verify applyMatchResult was called with correct parameters
    expect(applyMatchResult).toHaveBeenCalledWith(
      'team-1', // winnerId
      'team-2', // loserId
      2,        // winner's game wins
      1         // loser's game wins
    );
  });

  it('should handle applyMatchResult failure gracefully', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'matches') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        };
      }
      if (table === 'v_team_details') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    // Simulate RPC failure
    (applyMatchResult as any).mockRejectedValue(new Error('RPC failed'));

    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper()
    });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Call handleApproveResult - should not throw due to mutation error handling
    await act(async () => {
      try {
        await result.current.handleApproveResult(mockMatch as any, 1);
      } catch {
        // Error is expected and handled by mutation
      }
    });

    // The hook should handle the error gracefully (toast is shown)
    // applyMatchResult was still called
    expect(applyMatchResult).toHaveBeenCalled();
  });

  it('should pass correct game wins when team 2 wins', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'matches') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        };
      }
      if (table === 'v_team_details') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    (applyMatchResult as any).mockResolvedValue(true);

    const { result } = renderHook(() => usePendingMatches(), {
      wrapper: createWrapper()
    });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Call handleApproveResult with team 2 as winner
    await act(async () => {
      await result.current.handleApproveResult(mockMatch as any, 2);
    });

    // Verify applyMatchResult was called with swapped parameters
    expect(applyMatchResult).toHaveBeenCalledWith(
      'team-2', // winnerId (team 2 won)
      'team-1', // loserId
      1,        // winner's game wins (team2GameWins)
      2         // loser's game wins (team1GameWins)
    );
  });
});
