import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeams } from '../useTeams';

vi.mock('@/services/teams/TeamFetchService', () => ({
  fetchTeamsWithOptions: vi.fn(),
}));

import { fetchTeamsWithOptions } from '@/services/teams/TeamFetchService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockTeam = { id: 't1', name: 'Alpha' };

describe('useTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state and empty teams while fetching', () => {
    (fetchTeamsWithOptions as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(vi.fn()));
    const { result } = renderHook(() => useTeams(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.teams).toEqual([]);
  });

  it('returns teams on success and calls the fetch service', async () => {
    (fetchTeamsWithOptions as ReturnType<typeof vi.fn>).mockResolvedValue([mockTeam]);
    const { result } = renderHook(() => useTeams(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.teams).toEqual([mockTeam]);
    const noOptions = undefined;
    expect(fetchTeamsWithOptions).toHaveBeenCalledWith(noOptions);
  });

  it('returns empty teams on service error', async () => {
    (fetchTeamsWithOptions as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useTeams(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.teams).toEqual([]);
    expect(fetchTeamsWithOptions).toHaveBeenCalled();
  });

  it('propagates the fetch error so callers can show a retryable error state', async () => {
    (fetchTeamsWithOptions as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useTeams(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('boom');
  });

  it('exposes no error on success', async () => {
    (fetchTeamsWithOptions as ReturnType<typeof vi.fn>).mockResolvedValue([mockTeam]);
    const { result } = renderHook(() => useTeams(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('exposes mutation and fetch functions on its API surface', () => {
    (fetchTeamsWithOptions as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(vi.fn()));
    const { result } = renderHook(() => useTeams(), {
      wrapper: createWrapper(),
    });
    expect(typeof result.current.createTeam).toBe('function');
    expect(typeof result.current.updateTeam).toBe('function');
    expect(typeof result.current.deleteTeam).toBe('function');
    expect(typeof result.current.fetchTeams).toBe('function');
  });
});
