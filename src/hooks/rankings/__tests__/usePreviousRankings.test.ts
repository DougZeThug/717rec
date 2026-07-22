import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/rankings/RankingPersistenceService', () => ({
  loadRankingsFromDatabase: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { loadRankingsFromDatabase } from '@/services/rankings/RankingPersistenceService';

import { usePreviousRankings } from '../usePreviousRankings';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePreviousRankings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('returns database rankings when available', async () => {
    vi.mocked(loadRankingsFromDatabase).mockResolvedValue({ 'team-1': 1, 'team-2': 2 });
    const { result } = renderHook(() => usePreviousRankings(), { wrapper: createWrapper() });

    await waitFor(() =>
      expect(result.current.previousRankings).toEqual({ 'team-1': 1, 'team-2': 2 })
    );
    expect(result.current.lastUpdated).not.toBeNull();
  });

  it('falls back to the localStorage backup when the database is empty', async () => {
    vi.mocked(loadRankingsFromDatabase).mockResolvedValue({});
    localStorage.setItem('previousRankings', JSON.stringify({ 'team-9': 4 }));
    localStorage.setItem('rankingsLastUpdated', '2026-07-01T00:00:00.000Z');

    const { result } = renderHook(() => usePreviousRankings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.previousRankings).toEqual({ 'team-9': 4 }));
    expect(result.current.lastUpdated).toBe('2026-07-01T00:00:00.000Z');
  });

  it('falls back to localStorage when the database read fails', async () => {
    vi.mocked(loadRankingsFromDatabase).mockRejectedValue(new Error('db down'));
    localStorage.setItem('previousRankings', JSON.stringify({ 'team-3': 7 }));

    const { result } = renderHook(() => usePreviousRankings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.previousRankings).toEqual({ 'team-3': 7 }));
  });

  it('returns an empty map when no source has data', async () => {
    vi.mocked(loadRankingsFromDatabase).mockResolvedValue({});
    const { result } = renderHook(() => usePreviousRankings(), { wrapper: createWrapper() });

    await waitFor(() => expect(loadRankingsFromDatabase).toHaveBeenCalled());
    expect(result.current.previousRankings).toEqual({});
    expect(result.current.lastUpdated).toBeNull();
  });

  it('is a pure read — never writes to localStorage', async () => {
    vi.mocked(loadRankingsFromDatabase).mockResolvedValue({});
    localStorage.setItem('previousRankings', JSON.stringify({ 'team-1': 1 }));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { result } = renderHook(() => usePreviousRankings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.previousRankings).toEqual({ 'team-1': 1 }));
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('shares one fetch across multiple consumers via the query cache', async () => {
    vi.mocked(loadRankingsFromDatabase).mockResolvedValue({ 'team-1': 1 });
    const wrapper = createWrapper();

    const first = renderHook(() => usePreviousRankings(), { wrapper });
    const second = renderHook(() => usePreviousRankings(), { wrapper });

    await waitFor(() => expect(first.result.current.previousRankings).toEqual({ 'team-1': 1 }));
    await waitFor(() => expect(second.result.current.previousRankings).toEqual({ 'team-1': 1 }));
    expect(loadRankingsFromDatabase).toHaveBeenCalledTimes(1);
  });
});
