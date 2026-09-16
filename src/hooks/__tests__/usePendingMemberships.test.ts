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

  // The regression guard for the per-row lock. useMutation reports only the
  // newest call, so the old processingId dropped row A the instant row B
  // started — A's spinner vanished and its buttons re-enabled while A was
  // still saving.
  it('keeps every in-flight row locked, not just the newest one', async () => {
    (fetchPendingMembershipsForAdmin as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    let finishA!: () => void;
    let finishB!: () => void;
    (updateMembershipApproval as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => new Promise<void>((res) => (finishA = res)))
      .mockImplementationOnce(() => new Promise<void>((res) => (finishB = res)));

    const { result } = renderHook(() => usePendingMemberships(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.approveMembership('mem-a', true).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.processingIds.has('mem-a')).toBe(true));

    act(() => {
      result.current.approveMembership('mem-b', true).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.processingIds.has('mem-b')).toBe(true));

    // A has not resolved, so it must still be locked.
    expect(result.current.processingIds.has('mem-a')).toBe(true);
    expect(result.current.processingIds.size).toBe(2);

    await act(async () => {
      finishA();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.processingIds.has('mem-a')).toBe(false));
    expect(result.current.processingIds.has('mem-b')).toBe(true);

    await act(async () => {
      finishB();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.processingIds.size).toBe(0));
  });
});
