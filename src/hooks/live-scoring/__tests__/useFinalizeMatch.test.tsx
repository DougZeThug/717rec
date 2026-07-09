import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFinalizeLiveMatch = vi.fn();
const mockReopenLiveMatch = vi.fn();
const mockToast = vi.hoisted(() => vi.fn());
const mockInvalidateMatchRelatedQueries = vi.hoisted(() => vi.fn());

vi.mock('@/services/liveScoring/FinalizeService', () => ({
  FinalizeService: {
    finalizeLiveMatch: (...args: unknown[]) => mockFinalizeLiveMatch(...args),
    reopenLiveMatch: (...args: unknown[]) => mockReopenLiveMatch(...args),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: mockInvalidateMatchRelatedQueries,
}));

import { useFinalizeMatch } from '../useFinalizeMatch';

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

describe('finalize', () => {
  it('finalizes and refreshes every match-related query', async () => {
    mockFinalizeLiveMatch.mockResolvedValue({
      applied: true,
      winnerId: 'team-2',
      team1GameWins: 1,
      team2GameWins: 2,
    });

    const { result } = renderHook(() => useFinalizeMatch('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.finalize.mutateAsync();
    });

    expect(mockFinalizeLiveMatch).toHaveBeenCalledWith('match-1');
    expect(mockInvalidateMatchRelatedQueries).toHaveBeenCalledWith(queryClient);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Match result saved' })
    );
  });

  it('reports an already-finalized match as informational, not an error', async () => {
    mockFinalizeLiveMatch.mockResolvedValue({ applied: false, reason: 'already_completed' });

    const { result } = renderHook(() => useFinalizeMatch('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.finalize.mutateAsync();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Match already finalized' })
    );
    // Still refreshes so the UI picks up the other writer's result.
    expect(mockInvalidateMatchRelatedQueries).toHaveBeenCalled();
  });

  it('surfaces finalize failures as a destructive toast', async () => {
    mockFinalizeLiveMatch.mockRejectedValue(new Error('Match is not decided yet'));

    const { result } = renderHook(() => useFinalizeMatch('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.finalize.mutateAsync().catch(() => undefined);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not finalize match', variant: 'destructive' })
    );
    expect(mockInvalidateMatchRelatedQueries).not.toHaveBeenCalled();
  });
});

describe('reopen', () => {
  it('reopens and refreshes standings-related queries', async () => {
    mockReopenLiveMatch.mockResolvedValue(true);

    const { result } = renderHook(() => useFinalizeMatch('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.reopen.mutateAsync();
    });

    expect(mockReopenLiveMatch).toHaveBeenCalledWith('match-1');
    expect(mockInvalidateMatchRelatedQueries).toHaveBeenCalledWith(queryClient);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Match reopened' }));
  });

  it('handles the idempotent nothing-to-reopen outcome', async () => {
    mockReopenLiveMatch.mockResolvedValue(false);

    const { result } = renderHook(() => useFinalizeMatch('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.reopen.mutateAsync();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nothing to reopen' }));
  });
});
