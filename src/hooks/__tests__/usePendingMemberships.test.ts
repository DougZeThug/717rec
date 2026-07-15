import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePendingMemberships } from '../usePendingMemberships';

vi.mock('@/services/teams/TeamFetchService', () => ({
  fetchPendingMembershipsForAdmin: vi.fn(),
  updateMembershipApproval: vi.fn(),
}));

import {
  fetchPendingMembershipsForAdmin,
  updateMembershipApproval,
} from '@/services/teams/TeamFetchService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePendingMemberships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while fetching', () => {
    (fetchPendingMembershipsForAdmin as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(vi.fn())
    );
    const { result } = renderHook(() => usePendingMemberships(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.pendingMemberships).toEqual([]);
  });

  it('returns pending memberships on success', async () => {
    const rows = [{ id: 'm1' }] as unknown as Awaited<
      ReturnType<typeof fetchPendingMembershipsForAdmin>
    >;
    (fetchPendingMembershipsForAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(rows);
    const { result } = renderHook(() => usePendingMemberships(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pendingMemberships).toEqual([{ id: 'm1' }]);
  });

  it('returns empty list and error flag on service error', async () => {
    (fetchPendingMembershipsForAdmin as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Failed to fetch pending memberships')
    );
    const { result } = renderHook(() => usePendingMemberships(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.pendingMemberships).toEqual([]);
  });

  it('approveMembership calls updateMembershipApproval with the right args', async () => {
    (fetchPendingMembershipsForAdmin as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (updateMembershipApproval as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve()
    );
    const { result } = renderHook(() => usePendingMemberships(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.approveMembership('m1', true);
    });

    expect(updateMembershipApproval).toHaveBeenCalledWith('m1', true);
  });
});
