import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePendingScoresMatches } from '@/hooks/usePendingScoresMatches';
import { handleQueryError } from '@/utils/queryErrorToast';

// One stable spy at module scope. A `() => ({ toast: vi.fn() })` factory mints a
// new function per render, which makes call counts unassertable.
const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
  toast: (...args: unknown[]) => mockToast(...args),
}));

const mockFetchPendingScoresMatches = vi.fn();
vi.mock('@/services/matches/MatchReadService', () => ({
  fetchPendingScoresMatches: (...args: unknown[]) => mockFetchPendingScoresMatches(...args),
}));
vi.mock('@/services/matches/MatchWriteService', () => ({
  createScoreSubmission: vi.fn(),
}));

/**
 * Mirrors the production wiring in App.tsx: `retry: 1`, and the failure toast
 * raised from the QueryCache rather than from inside queryFn. `retryDelay: 0`
 * skips react-query's 1s backoff so the test does not have to wait it out.
 */
const createWrapper = (retry: number | boolean) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry, retryDelay: 0, gcTime: 0 } },
    queryCache: new QueryCache({ onError: handleQueryError }),
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePendingScoresMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('raises exactly one toast when the load keeps failing under retry: 1', async () => {
    mockFetchPendingScoresMatches.mockRejectedValue(new Error('boom'));

    renderHook(() => usePendingScoresMatches(), { wrapper: createWrapper(1) });

    // Two attempts: the first and its one retry.
    await waitFor(() => expect(mockFetchPendingScoresMatches).toHaveBeenCalledTimes(2));

    // The toast used to live in queryFn's catch, so it fired on both.
    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error', variant: 'destructive' })
    );
  });

  it('raises no toast when the first attempt fails and the retry succeeds', async () => {
    mockFetchPendingScoresMatches
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => usePendingScoresMatches(), {
      wrapper: createWrapper(1),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetchPendingScoresMatches).toHaveBeenCalledTimes(2);

    // The list loaded. Reporting a failure here was the worst of the two cases.
    expect(mockToast).not.toHaveBeenCalled();
    expect(result.current.matches).toEqual([]);
  });

  it('maps the rows it loads onto the shape the card renders', async () => {
    mockFetchPendingScoresMatches.mockResolvedValue([
      {
        id: 'm1',
        team1_id: 't1',
        team2_id: 't2',
        team1_name: 'Alpha',
        team2_name: 'Beta',
        team1_logo: null,
        team2_logo: null,
        date: '2026-09-17',
        location: 'Lane 3',
      },
    ]);

    const { result } = renderHook(() => usePendingScoresMatches(), {
      wrapper: createWrapper(false),
    });

    await waitFor(() => expect(result.current.matches).toHaveLength(1));
    expect(result.current.matches[0]).toMatchObject({
      id: 'm1',
      team1_name: 'Alpha',
      team2_name: 'Beta',
      location: 'Lane 3',
    });
    expect(mockToast).not.toHaveBeenCalled();
  });
});
