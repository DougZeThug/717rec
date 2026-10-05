import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFetchRankingsData } = vi.hoisted(() => ({ mockFetchRankingsData: vi.fn() }));

vi.mock('@/services/RankingsCalculationService', () => ({
  fetchRankingsData: mockFetchRankingsData,
}));

import { useRankingsData } from '../useRankingsData';

let activeClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => {
  activeClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: activeClient }, children);
};

describe('useRankingsData polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchRankingsData.mockResolvedValue([]);
  });

  it('configures a refetchInterval that works when TanStack calls it with the query', async () => {
    const { result } = renderHook(() => useRankingsData(), { wrapper });
    await waitFor(() => expect(result.current.matchesLoading).toBe(false));

    const query = activeClient.getQueryCache().find({ queryKey: ['matches', 'rankings'] });
    const interval = query?.observers[0]?.options.refetchInterval;

    // TanStack hands the query to this function; it must still return a delay.
    expect(typeof interval).toBe('function');
    const wait = (interval as (q: unknown) => number | false)(query);
    expect(typeof wait).toBe('number');
    expect(wait).toBeGreaterThanOrEqual(60_000);
    expect(wait).toBeLessThanOrEqual(60 * 60 * 1000);
  });
});
