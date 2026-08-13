import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamMembership } from '../useTeamMembership';

vi.mock('@/contexts/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@/services/teams/TeamFetchService', () => ({
  fetchTeamMembership: vi.fn(),
  fetchAvailableTeams: vi.fn(),
  joinTeamMembership: vi.fn(),
  leaveTeamMembership: vi.fn(),
}));
vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn() }));

import { useAuth } from '@/contexts/auth-context';
import { toast } from '@/hooks/useToast';
import {
  fetchAvailableTeams,
  fetchTeamMembership,
  joinTeamMembership,
} from '@/services/teams/TeamFetchService';
import type { Team } from '@/types';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockMembership = { id: 'm1', team_id: 'team-1' };
const mockTeams = [{ id: 'team-2' }] as unknown as Team[];

describe('useTeamMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when there is no user', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });

    const { result } = renderHook(() => useTeamMembership(), {
      wrapper: createWrapper(),
    });

    expect(fetchTeamMembership).not.toHaveBeenCalled();
    expect(result.current.membership).toBeNull();
    expect(result.current.isFetching).toBe(false);
  });

  it('shows fetching state while loading membership', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: 'user-1' } });
    (fetchTeamMembership as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(vi.fn()));
    (fetchAvailableTeams as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { result } = renderHook(() => useTeamMembership(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(true);
  });

  it('returns membership and available teams on success', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: 'user-1' } });
    (fetchTeamMembership as ReturnType<typeof vi.fn>).mockResolvedValue(mockMembership);
    (fetchAvailableTeams as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeams);

    const { result } = renderHook(() => useTeamMembership(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.membership).toEqual(mockMembership);
    expect(result.current.availableTeams).toEqual(mockTeams);
    expect(fetchTeamMembership).toHaveBeenCalledWith('user-1');
  });

  it('guards joinTeam when there is no user', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });

    const { result } = renderHook(() => useTeamMembership(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.joinTeam('team-9');
    });

    expect(toast).toHaveBeenCalled();
    expect(joinTeamMembership).not.toHaveBeenCalled();
  });
});
