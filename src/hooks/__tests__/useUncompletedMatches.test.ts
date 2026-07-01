import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';

import { useUncompletedMatches } from '../useUncompletedMatches';

const mockToast = vi.fn();
const mockHandleSubmitScore = vi.fn();
const mockFetchTeams = vi.fn().mockResolvedValue(undefined);
const mockInitializeScores = vi.fn();

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchUncompletedMatches: vi.fn(),
}));

vi.mock('@/hooks/matches/useMatchSubmission', () => ({
  useMatchSubmission: vi.fn(() => ({
    handleSubmitScore: mockHandleSubmitScore,
  })),
}));

vi.mock('@/hooks/teams', () => ({
  useTeamsMap: vi.fn(() => ({
    teams: {},
    refetch: mockFetchTeams,
  })),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/matchTransformers', () => ({
  transformDatabaseMatches: vi.fn((data: unknown[]) => data),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

// useMatchScoresState is internal — mock it to avoid its complexity
vi.mock('@/hooks/matches/useMatchScoresState', () => ({
  useMatchScoresState: vi.fn(() => ({
    scores: {},
    initializeScores: mockInitializeScores,
    handleScoreChange: vi.fn(),
  })),
}));

import { fetchUncompletedMatches } from '@/services/matches/MatchReadService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockMatches = [
  { id: 'match-1', team1Id: 'team-a', team2Id: 'team-b', iscompleted: false },
  { id: 'match-2', team1Id: 'team-c', team2Id: 'team-d', iscompleted: false },
] as unknown as Match[];

describe('useUncompletedMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while fetching', () => {
    (fetchUncompletedMatches as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(vi.fn()));
    const { result } = renderHook(() => useUncompletedMatches(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns matches after successful fetch', async () => {
    (fetchUncompletedMatches as ReturnType<typeof vi.fn>).mockResolvedValue(mockMatches);
    const { result } = renderHook(() => useUncompletedMatches(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.matches).toEqual(mockMatches);
    expect(fetchUncompletedMatches).toHaveBeenCalled();
  });

  it('shows error toast and throws when service fails', async () => {
    (fetchUncompletedMatches as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useUncompletedMatches(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('toggleItem flips openItems for a given id', async () => {
    (fetchUncompletedMatches as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useUncompletedMatches(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.openItems['match-1']).toBeUndefined();
    act(() => {
      result.current.toggleItem('match-1');
    });
    expect(result.current.openItems['match-1']).toBe(true);
    act(() => {
      result.current.toggleItem('match-1');
    });
    expect(result.current.openItems['match-1']).toBe(false);
  });

  it('forwards handleSubmitScore from useMatchSubmission', async () => {
    (fetchUncompletedMatches as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useUncompletedMatches(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.handleSubmitScore).toBe(mockHandleSubmitScore);
  });

  it('fetches teams on mount', async () => {
    (fetchUncompletedMatches as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderHook(() => useUncompletedMatches(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchTeams).toHaveBeenCalled());
  });

  it('reinitializes scores with matches once they load', async () => {
    (fetchUncompletedMatches as ReturnType<typeof vi.fn>).mockResolvedValue(mockMatches);
    const { result } = renderHook(() => useUncompletedMatches(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(mockInitializeScores).toHaveBeenCalledWith(mockMatches));
  });

  it('does not reinitialize scores when there are no matches', async () => {
    (fetchUncompletedMatches as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useUncompletedMatches(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockInitializeScores).not.toHaveBeenCalled();
  });
});
