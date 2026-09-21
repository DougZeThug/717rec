import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UNSAVED_LIVE_MATCHES_KEY, useUnsavedLiveMatches } from '../useUnsavedLiveMatches';

const mockUseActiveSeason = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/hooks/useSeasons', () => ({
  useActiveSeason: () => mockUseActiveSeason(),
}));
vi.mock('@/services/admin/UnsavedLiveMatchesService', () => ({
  UnsavedLiveMatchesService: { fetchUnsavedLiveMatches: (id: string) => mockFetch(id) },
}));

const renderWithClient = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  const hook = renderHook(() => useUnsavedLiveMatches(), { wrapper });
  return { ...hook, queryClient };
};

describe('useUnsavedLiveMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActiveSeason.mockReturnValue({ data: { id: 'season-1' }, isLoading: false });
    mockFetch.mockResolvedValue([]);
  });

  /**
   * The card used to be keyed on an inline literal, which is how useFinalizeMatch
   * came to invalidate its sibling drift card and not this one. Pin the key to the
   * exported prefix so an invalidation by that prefix is known to reach it.
   */
  it('keys the card under the exported prefix, plus the season', async () => {
    const { queryClient } = renderWithClient();

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);

    expect(keys).toContainEqual([...UNSAVED_LIVE_MATCHES_KEY, 'season-1']);
  });

  it('asks for nothing until a season is known', () => {
    mockUseActiveSeason.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderWithClient();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.hasActiveSeason).toBe(false);
  });
});
