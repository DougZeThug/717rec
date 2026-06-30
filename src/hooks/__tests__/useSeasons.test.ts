import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useActiveSeason,
  useHistoricalSeasons,
  usePlayoffActiveSeason,
  useSeasons,
} from '../useSeasons';

vi.mock('@/services/SeasonService', () => ({
  SeasonService: {
    fetchSeasons: vi.fn(),
    fetchActiveSeason: vi.fn(),
    fetchPlayoffActiveSeason: vi.fn(),
    fetchHistoricalSeasons: vi.fn(),
  },
}));

import { SeasonService } from '@/services/SeasonService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const activeSeason = { id: 's1', name: 'Spring 2026', is_active: true };
const inactiveSeason = { id: 's0', name: 'Fall 2025', is_active: false };

describe('useSeasons hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSeasons', () => {
    it('shows loading state while fetching', () => {
      (SeasonService.fetchSeasons as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(vi.fn())
      );
      const { result } = renderHook(() => useSeasons(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('returns all seasons on success', async () => {
      const seasons = [activeSeason, inactiveSeason];
      (SeasonService.fetchSeasons as ReturnType<typeof vi.fn>).mockResolvedValue(seasons);
      const { result } = renderHook(() => useSeasons(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toEqual(seasons);
      expect(SeasonService.fetchSeasons).toHaveBeenCalledTimes(1);
    });

    it('exposes error state when the service rejects', async () => {
      (SeasonService.fetchSeasons as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to fetch seasons')
      );
      const { result } = renderHook(() => useSeasons(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toBeUndefined();
      expect(result.current.isError).toBe(true);
    });
  });

  describe('useActiveSeason', () => {
    it('shows loading state while fetching', () => {
      (SeasonService.fetchActiveSeason as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(vi.fn())
      );
      const { result } = renderHook(() => useActiveSeason(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('returns the active season on success', async () => {
      (SeasonService.fetchActiveSeason as ReturnType<typeof vi.fn>).mockResolvedValue(activeSeason);
      const { result } = renderHook(() => useActiveSeason(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toEqual(activeSeason);
      expect(SeasonService.fetchActiveSeason).toHaveBeenCalledTimes(1);
    });

    it('exposes error state when the service rejects', async () => {
      (SeasonService.fetchActiveSeason as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to fetch active season')
      );
      const { result } = renderHook(() => useActiveSeason(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toBeUndefined();
      expect(result.current.isError).toBe(true);
    });
  });

  describe('usePlayoffActiveSeason', () => {
    it('shows loading state while fetching', () => {
      (SeasonService.fetchPlayoffActiveSeason as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(vi.fn())
      );
      const { result } = renderHook(() => usePlayoffActiveSeason(), {
        wrapper: createWrapper(),
      });
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('returns the playoff-active season on success', async () => {
      (SeasonService.fetchPlayoffActiveSeason as ReturnType<typeof vi.fn>).mockResolvedValue(
        activeSeason
      );
      const { result } = renderHook(() => usePlayoffActiveSeason(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toEqual(activeSeason);
      expect(SeasonService.fetchPlayoffActiveSeason).toHaveBeenCalledTimes(1);
    });

    it('exposes error state when the service rejects', async () => {
      (SeasonService.fetchPlayoffActiveSeason as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to fetch playoff active season')
      );
      const { result } = renderHook(() => usePlayoffActiveSeason(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toBeUndefined();
      expect(result.current.isError).toBe(true);
    });
  });

  describe('useHistoricalSeasons', () => {
    it('shows loading state while fetching', () => {
      (SeasonService.fetchHistoricalSeasons as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(vi.fn())
      );
      const { result } = renderHook(() => useHistoricalSeasons(), {
        wrapper: createWrapper(),
      });
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('returns historical seasons on success', async () => {
      const historical = [inactiveSeason];
      (SeasonService.fetchHistoricalSeasons as ReturnType<typeof vi.fn>).mockResolvedValue(
        historical
      );
      const { result } = renderHook(() => useHistoricalSeasons(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toEqual(historical);
      expect(SeasonService.fetchHistoricalSeasons).toHaveBeenCalledTimes(1);
    });

    it('exposes error state when the service rejects', async () => {
      (SeasonService.fetchHistoricalSeasons as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to fetch historical seasons')
      );
      const { result } = renderHook(() => useHistoricalSeasons(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toBeUndefined();
      expect(result.current.isError).toBe(true);
    });
  });
});
