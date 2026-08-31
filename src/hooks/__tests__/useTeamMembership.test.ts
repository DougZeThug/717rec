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
    expect(result.current.error).toBeNull();
    expect(fetchTeamMembership).toHaveBeenCalledWith('user-1');
  });

  it('reports an error string when the membership query fails', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: 'user-1' } });
    (fetchTeamMembership as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    (fetchAvailableTeams as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { result } = renderHook(() => useTeamMembership(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe('Failed to load team membership'));
  });

  // B-18: a refused request keeps its row, so `membership` is truthy for
  // somebody with no team. The hook has to tell that apart from an approved or
  // pending membership, both for the wording it shows and for activeMembership,
  // which is what every "what is this person's team" caller reads.
  describe('a refused request', () => {
    const refused = { id: 'm1', team_id: 'team-1', rejected_at: '2026-08-05T12:00:00.000Z' };

    const renderWithMembership = async (membership: unknown) => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: 'user-1' } });
      (fetchTeamMembership as ReturnType<typeof vi.fn>).mockResolvedValue(membership);
      (fetchAvailableTeams as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeams);
      const { result } = renderHook(() => useTeamMembership(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetching).toBe(false));
      return result;
    };

    it('drops it from activeMembership while keeping the raw row', async () => {
      const result = await renderWithMembership(refused);

      expect(result.current.membership).toEqual(refused);
      expect(result.current.activeMembership).toBeNull();
    });

    it('keeps a pending membership in activeMembership', async () => {
      const result = await renderWithMembership(mockMembership);

      expect(result.current.activeMembership).toEqual(mockMembership);
    });

    it('calls asking again a new request, not a team change', async () => {
      const result = await renderWithMembership(refused);

      await act(async () => {
        await result.current.joinTeam('team-2');
      });

      expect(joinTeamMembership).toHaveBeenCalledWith('user-1', 'team-2', true);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Your new request to join the team has been submitted for admin approval',
        })
      );
    });

    it('tells the service a live membership is a change, and reports a join', async () => {
      const result = await renderWithMembership(mockMembership);

      await act(async () => {
        await result.current.joinTeam('team-2');
      });

      // The service still learns this is a change, so the row is reused.
      expect(joinTeamMembership).toHaveBeenCalledWith('user-1', 'team-2', true);

      // There is no team-switch control in the product: a member sees the team
      // card with Leave Team, never a team picker. So the message is the plain
      // join one, and the separate "change teams" wording has been removed.
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Your request to join the team has been submitted for admin approval',
        })
      );
    });
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
