import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHeadToHead, useOpponentHistory } from '../useHeadToHead';

vi.mock('@/services/HeadToHeadService', () => ({
  HeadToHeadService: { getTeamHeadToHead: vi.fn(), getOpponentHistory: vi.fn() },
}));

import { HeadToHeadService } from '@/services/HeadToHeadService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useHeadToHead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when teamId is undefined', () => {
    const teamId: string | undefined = undefined;
    const { result } = renderHook(() => useHeadToHead(teamId), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(HeadToHeadService.getTeamHeadToHead).not.toHaveBeenCalled();
  });

  it('shows loading state while fetching', () => {
    (HeadToHeadService.getTeamHeadToHead as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(vi.fn())
    );
    const { result } = renderHook(() => useHeadToHead('team-1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns head-to-head data on success', async () => {
    const mockData = [{ opponentId: 'team-2', wins: 3, losses: 1 }] as unknown as Awaited<
      ReturnType<typeof HeadToHeadService.getTeamHeadToHead>
    >;
    (HeadToHeadService.getTeamHeadToHead as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const { result } = renderHook(() => useHeadToHead('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(HeadToHeadService.getTeamHeadToHead).toHaveBeenCalledWith('team-1');
  });

  it('sets data to undefined on service error', async () => {
    (HeadToHeadService.getTeamHeadToHead as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Failed to fetch head-to-head')
    );
    const { result } = renderHook(() => useHeadToHead('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('useOpponentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when opponentId is undefined', () => {
    const opponentId: string | undefined = undefined;
    const { result } = renderHook(() => useOpponentHistory('team-1', opponentId), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(HeadToHeadService.getOpponentHistory).not.toHaveBeenCalled();
  });

  it('shows loading state while fetching', () => {
    (HeadToHeadService.getOpponentHistory as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(vi.fn())
    );
    const { result } = renderHook(() => useOpponentHistory('team-1', 'team-2'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns opponent history data on success', async () => {
    const mockData = { totalMatches: 2 } as unknown as Awaited<
      ReturnType<typeof HeadToHeadService.getOpponentHistory>
    >;
    (HeadToHeadService.getOpponentHistory as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const { result } = renderHook(() => useOpponentHistory('team-1', 'team-2'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(HeadToHeadService.getOpponentHistory).toHaveBeenCalledWith('team-1', 'team-2');
  });

  it('sets data to undefined on service error', async () => {
    (HeadToHeadService.getOpponentHistory as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Failed to fetch opponent history')
    );
    const { result } = renderHook(() => useOpponentHistory('team-1', 'team-2'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
