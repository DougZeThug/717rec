import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBracketsForSelector: vi.fn(),
}));

import { fetchBracketsForSelector } from '@/services/brackets/BracketReadService';

import { useBracketsQuery } from '../useBracketsQuery';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useBracketsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns brackets on success', async () => {
    vi.mocked(fetchBracketsForSelector).mockResolvedValue([{ id: 'b1', title: 'Bracket 1' }]);
    const { result } = renderHook(() => useBracketsQuery(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() =>
      expect(result.current.brackets).toEqual([{ id: 'b1', title: 'Bracket 1' }])
    );
    expect(result.current.error).toBeNull();
  });

  it('propagates a fetch error instead of swallowing it', async () => {
    vi.mocked(fetchBracketsForSelector).mockRejectedValue(new Error('brackets down'));
    const { result } = renderHook(() => useBracketsQuery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.brackets).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('refetch retries after a failure and recovers', async () => {
    vi.mocked(fetchBracketsForSelector)
      .mockRejectedValueOnce(new Error('brackets down'))
      .mockResolvedValueOnce([{ id: 'b2', title: 'Bracket 2' }]);
    const { result } = renderHook(() => useBracketsQuery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() =>
      expect(result.current.brackets).toEqual([{ id: 'b2', title: 'Bracket 2' }])
    );
    expect(result.current.error).toBeNull();
  });
});
