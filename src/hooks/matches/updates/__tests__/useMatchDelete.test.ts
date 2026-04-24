import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMatchDelete } from '../useMatchDelete';

const mockToast = vi.fn();
const mockInvalidateAllDataQueries = vi.fn();
const mockReverseTeamStats = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  deleteMatch: vi.fn(),
  upsertTeamSeasonStats: vi.fn(),
}));

vi.mock('../utils/queryInvalidation', () => ({
  invalidateAllDataQueries: (...args: unknown[]) => mockInvalidateAllDataQueries(...args),
}));

vi.mock('../utils/statReversalUtils', () => ({
  reverseTeamStats: (...args: unknown[]) => mockReverseTeamStats(...args),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { deleteMatch, upsertTeamSeasonStats } from '@/services/matches/MatchWriteService';

const createWrapper = (queryClient: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useMatchDelete', () => {
  const baseMatch = {
    id: 'match-1',
    team1Id: 'team-1',
    team2Id: 'team-2',
    iscompleted: true,
    winnerId: 'team-1',
    loserId: 'team-2',
    team1_game_wins: 3,
    team2_game_wins: 1,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteMatch).mockResolvedValue(undefined as any);
    vi.mocked(upsertTeamSeasonStats).mockResolvedValue(undefined as any);
  });

  it('deletes a match and invalidates caches', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const setMatches = vi.fn();
    const setDeleteMatchId = vi.fn();
    const setIsDeleting = vi.fn();

    const { result } = renderHook(
      () =>
        useMatchDelete({
          matches: [baseMatch],
          setMatches,
          deleteMatchId: 'match-1',
          setDeleteMatchId,
          setIsDeleting,
        }),
      { wrapper: createWrapper(queryClient) }
    );

    const success = await act(async () => result.current.handleDeleteMatch([]));

    expect(success).toBe(true);
    expect(deleteMatch).toHaveBeenCalledWith('match-1');
    expect(mockReverseTeamStats).toHaveBeenCalledWith('team-1', 'team-2', 3, 1);
    expect(upsertTeamSeasonStats).toHaveBeenCalled();
    expect(mockInvalidateAllDataQueries).toHaveBeenCalled();
    expect(setMatches).toHaveBeenCalledWith([]);
    expect(setDeleteMatchId).toHaveBeenCalledWith(null);
  });

  it('surfaces delete errors to caller and toast', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(deleteMatch).mockRejectedValue(new Error('delete failed'));

    const { result } = renderHook(
      () =>
        useMatchDelete({
          matches: [baseMatch],
          setMatches: vi.fn(),
          deleteMatchId: 'match-1',
          setDeleteMatchId: vi.fn(),
          setIsDeleting: vi.fn(),
        }),
      { wrapper: createWrapper(queryClient) }
    );

    const success = await act(async () => result.current.handleDeleteMatch([]));

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Failed to delete match: delete failed',
        variant: 'destructive',
      })
    );
  });

  it('does not reverse team stats for incomplete matches', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(
      () =>
        useMatchDelete({
          matches: [{ ...baseMatch, iscompleted: false, winnerId: undefined, loserId: undefined }],
          setMatches: vi.fn(),
          deleteMatchId: 'match-1',
          setDeleteMatchId: vi.fn(),
          setIsDeleting: vi.fn(),
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.handleDeleteMatch([]);
    });

    expect(mockReverseTeamStats).not.toHaveBeenCalled();
  });
});
