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

describe('reopenAndRefinalize', () => {
  it('reverses the old result and saves the new one, with a single toast', async () => {
    mockReopenLiveMatch.mockResolvedValue(true);
    mockFinalizeLiveMatch.mockResolvedValue({
      applied: true,
      winnerId: 'team-1',
      team1GameWins: 2,
      team2GameWins: 1,
    });

    const { result } = renderHook(() => useFinalizeMatch('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.reopenAndRefinalize.mutateAsync();
    });

    expect(mockReopenLiveMatch).toHaveBeenCalledWith('match-1');
    expect(mockFinalizeLiveMatch).toHaveBeenCalledWith('match-1');
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Result re-saved',
        description: expect.stringContaining('2–1'),
      })
    );
    expect(mockInvalidateMatchRelatedQueries).toHaveBeenCalledWith(queryClient);
  });

  it('reopens before it saves, so finalize_live_match is not a no-op', async () => {
    const order: string[] = [];
    mockReopenLiveMatch.mockImplementation(async () => {
      order.push('reopen');
      return true;
    });
    mockFinalizeLiveMatch.mockImplementation(async () => {
      order.push('finalize');
      return { applied: true, team1GameWins: 2, team2GameWins: 0 };
    });

    const { result } = renderHook(() => useFinalizeMatch('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.reopenAndRefinalize.mutateAsync();
    });

    expect(order).toEqual(['reopen', 'finalize']);
  });

  it('says the result was reversed and not restored when the save is refused', async () => {
    mockReopenLiveMatch.mockResolvedValue(true);
    mockFinalizeLiveMatch.mockRejectedValue(
      new Error('Match is not decided yet (game wins: 1 - 1)')
    );

    const { result } = renderHook(() => useFinalizeMatch('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.reopenAndRefinalize.mutateAsync().catch(() => undefined);
    });

    const [[toastArg]] = mockToast.mock.calls;
    expect(toastArg).toMatchObject({
      title: 'Could not re-save the result',
      variant: 'destructive',
    });
    expect(toastArg.description).toContain('The old result was reversed');
    expect(toastArg.description).toContain('The match is open now');
    // The records have moved, so the screens must be refreshed even on failure.
    expect(mockInvalidateMatchRelatedQueries).toHaveBeenCalledWith(queryClient);
  });

  it('does not claim success when the save applied nothing', async () => {
    mockReopenLiveMatch.mockResolvedValue(true);
    mockFinalizeLiveMatch.mockResolvedValue({ applied: false, reason: 'already_completed' });

    const { result } = renderHook(() => useFinalizeMatch('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.reopenAndRefinalize.mutateAsync();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Nothing was re-saved', variant: 'destructive' })
    );
  });

  it('leaves the result alone when reopening itself fails', async () => {
    mockReopenLiveMatch.mockRejectedValue(new Error('Admin access required'));

    const { result } = renderHook(() => useFinalizeMatch('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.reopenAndRefinalize.mutateAsync().catch(() => undefined);
    });

    expect(mockFinalizeLiveMatch).not.toHaveBeenCalled();
    const [[toastArg]] = mockToast.mock.calls;
    expect(toastArg.title).toBe('Could not re-save the result');
    expect(toastArg.description).not.toContain('The old result was reversed');
  });
});
