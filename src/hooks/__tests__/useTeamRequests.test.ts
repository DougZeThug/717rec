import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAllRequests,
  fetchPendingRequestsCount,
  updateTeamRequestStatus,
} from '@/services/teams/TeamFetchService';

import {
  useAllRequests,
  usePendingRequestsCount,
  useUpdateRequestStatus,
} from '../useTeamRequests';

const toast = vi.fn();
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'admin-7' } }) }));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn() }));
vi.mock('@/services/teams/TeamFetchService', () => ({
  fetchAllRequests: vi.fn(),
  fetchPendingRequestsCount: vi.fn(),
  fetchTeamRequests: vi.fn(),
  submitTeamRequest: vi.fn(),
  updateTeamRequestStatus: vi.fn(),
}));

let queryClient: QueryClient;
const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useAllRequests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the status filter through to the service', async () => {
    (fetchAllRequests as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useAllRequests('PENDING'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAllRequests).toHaveBeenCalledWith('PENDING');
  });

  it('fetches all requests when no filter is given', async () => {
    (fetchAllRequests as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useAllRequests(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAllRequests).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchAllRequests).mock.calls[0]).toEqual([undefined]);
  });
});

describe('usePendingRequestsCount', () => {
  it('returns the count from the service', async () => {
    (fetchPendingRequestsCount as ReturnType<typeof vi.fn>).mockResolvedValue(3);
    const { result } = renderHook(() => usePendingRequestsCount(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBe(3));
  });
});

describe('useUpdateRequestStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps the admin user id and invalidates team-request queries on success', async () => {
    (updateTeamRequestStatus as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve()
    );
    const { result } = renderHook(() => useUpdateRequestStatus(), { wrapper: createWrapper() });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({
        id: 'req-9',
        status: 'APPROVED',
        admin_notes: 'ok',
      });
    });

    expect(updateTeamRequestStatus).toHaveBeenCalledWith({
      id: 'req-9',
      status: 'APPROVED',
      admin_notes: 'ok',
      processed_by: 'admin-7',
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['team-requests'] });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Request Approved' }));
  });

  it('shows a destructive toast and propagates the error on failure', async () => {
    (updateTeamRequestStatus as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useUpdateRequestStatus(), { wrapper: createWrapper() });

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'req-9', status: 'DENIED' })).rejects.toThrow(
        'nope'
      );
    });

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
