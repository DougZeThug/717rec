import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamDetails } from '../useTeamDetails';

vi.mock('@/services/teams/TeamFetchService', () => ({
  fetchTeamDetails: vi.fn(),
}));

import { fetchTeamDetails } from '@/services/teams/TeamFetchService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockTeam = {
  id: 'team-1',
  name: 'Alpha',
  wins: 5,
  losses: 2,
};

describe('useTeamDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when teamId is undefined', () => {
    const { result } = renderHook(() => useTeamDetails(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.team).toBeUndefined();
    expect(fetchTeamDetails).not.toHaveBeenCalled();
  });

  it('shows loading state while fetching', () => {
    (fetchTeamDetails as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTeamDetails('team-1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns team data on success', async () => {
    (fetchTeamDetails as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeam);
    const { result } = renderHook(() => useTeamDetails('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.team).toEqual(mockTeam);
    expect(fetchTeamDetails).toHaveBeenCalledWith('team-1');
  });

  it('sets team to undefined on service error', async () => {
    (fetchTeamDetails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'));
    const { result } = renderHook(() => useTeamDetails('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.team).toBeUndefined();
  });
});
