import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePowerScoreTrends } from '../usePowerScoreTrends';

vi.mock('@/services/rankings/RankingTrendsService', () => ({
  fetchPowerScoreTrends: vi.fn(),
}));

import { fetchPowerScoreTrends } from '@/services/rankings/RankingTrendsService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockTrends = {
  trends: [
    { teamId: 'team-1', teamName: 'Alpha', delta: 4.5, logoUrl: null },
    { teamId: 'team-2', teamName: 'Beta', delta: 2.1, logoUrl: null },
  ],
};

describe('usePowerScoreTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses default direction=up and limit=10', async () => {
    (fetchPowerScoreTrends as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrends);
    const { result } = renderHook(() => usePowerScoreTrends(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchPowerScoreTrends).toHaveBeenCalledWith('up', 10);
  });

  it('passes direction=down when specified', async () => {
    (fetchPowerScoreTrends as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrends);
    const { result } = renderHook(() => usePowerScoreTrends('down', 5), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchPowerScoreTrends).toHaveBeenCalledWith('down', 5);
  });

  it('returns trend data on success', async () => {
    (fetchPowerScoreTrends as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrends);
    const { result } = renderHook(() => usePowerScoreTrends('up', 5), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockTrends);
  });

  it('sets error state on service failure', async () => {
    (fetchPowerScoreTrends as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Service error')
    );
    const { result } = renderHook(() => usePowerScoreTrends(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeUndefined();
  });
});
