import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHistoricalPowerScores } from '../useHistoricalPowerScores';

vi.mock('@/services/rankings/RankingCareerService', () => ({
  fetchHistoricalPowerScores: vi.fn(),
}));

import { fetchHistoricalPowerScores } from '@/services/rankings/RankingCareerService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockResponse = {
  historicalScores: [{ team_id: 'team-1', power_scores: [{ date: '2026-01-01', score: 75.0 }] }],
  previousScores: { 'team-1': 70.5 },
};

describe('useHistoricalPowerScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches for all teams when no teamId provided', async () => {
    (fetchHistoricalPowerScores as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useHistoricalPowerScores(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchHistoricalPowerScores).toHaveBeenCalled();
  });

  it('passes teamId to service when provided', async () => {
    (fetchHistoricalPowerScores as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useHistoricalPowerScores('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchHistoricalPowerScores).toHaveBeenCalledWith('team-1');
  });

  it('extracts historicalScores and previousScores from response', async () => {
    (fetchHistoricalPowerScores as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useHistoricalPowerScores('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.historicalScores).toEqual(mockResponse.historicalScores);
    expect(result.current.previousScores).toEqual(mockResponse.previousScores);
  });

  it('defaults to empty arrays/objects when response is undefined', async () => {
    (fetchHistoricalPowerScores as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { result } = renderHook(() => useHistoricalPowerScores(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.historicalScores).toEqual([]);
    expect(result.current.previousScores).toEqual({});
  });

  it('sets error state on service failure', async () => {
    (fetchHistoricalPowerScores as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Fetch failed')
    );
    const { result } = renderHook(() => useHistoricalPowerScores('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.historicalScores).toEqual([]);
  });
});
