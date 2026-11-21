import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDeleteMatchWithStatsReversal } = vi.hoisted(() => ({
  mockDeleteMatchWithStatsReversal: vi.fn(),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  deleteMatchWithStatsReversal: mockDeleteMatchWithStatsReversal,
}));

import { useDeleteMatchWithReversal } from '../useDeleteMatchWithReversal';

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

const renderDelete = (queryClient?: QueryClient) => {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const { result } = renderHook(() => useDeleteMatchWithReversal(), {
    wrapper: createWrapper(client),
  });
  return { result, invalidate };
};

describe('useDeleteMatchWithReversal', () => {
  beforeEach(() => {
    mockDeleteMatchWithStatsReversal.mockReset();
    mockDeleteMatchWithStatsReversal.mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    // Always put the browser back online, so no other test is affected.
    onlineManager.setOnline(true);
  });

  it('calls the service once with the match id and no extra argument', async () => {
    const { result } = renderDelete();

    await result.current.mutateAsync('match-1');

    expect(mockDeleteMatchWithStatsReversal).toHaveBeenCalledTimes(1);
    // TanStack passes (variables, context) to mutationFn. The service must get
    // the id only.
    expect(mockDeleteMatchWithStatsReversal.mock.calls[0]).toHaveLength(1);
    expect(mockDeleteMatchWithStatsReversal.mock.calls[0][0]).toBe('match-1');
  });

  it('resolves when the delete works', async () => {
    const { result } = renderDelete();

    await expect(result.current.mutateAsync('match-1')).resolves.toBeUndefined();
  });

  it('rejects with the same error object when the delete fails', async () => {
    const failure = new Error('rpc boom');
    mockDeleteMatchWithStatsReversal.mockImplementation(() => Promise.reject(failure));
    const { result } = renderDelete();

    await expect(result.current.mutateAsync('match-1')).rejects.toBe(failure);
  });

  it('passes a plain string rejection through unchanged', async () => {
    mockDeleteMatchWithStatsReversal.mockImplementation(() => Promise.reject('nope')); // skipcq: JS-0114
    const { result } = renderDelete();

    await expect(result.current.mutateAsync('match-1')).rejects.toBe('nope');
  });

  it('does not refresh any query itself (the tool does that after its toast)', async () => {
    const { result, invalidate } = renderDelete();

    await result.current.mutateAsync('match-1');

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('calls the service only once when the delete fails (no retry)', async () => {
    mockDeleteMatchWithStatsReversal.mockImplementation(() => Promise.reject(new Error('boom')));
    // A plain client with no mutation defaults, so the hook itself must not retry.
    const { result } = renderDelete(new QueryClient());

    await expect(result.current.mutateAsync('match-1')).rejects.toThrow('boom');

    expect(mockDeleteMatchWithStatsReversal).toHaveBeenCalledTimes(1);
  });

  // TanStack pauses an offline mutation by default. The tool must still fail at
  // once offline, as it did when it called the service directly.
  it('still runs the delete while the browser is offline', async () => {
    onlineManager.setOnline(false);
    const { result } = renderDelete();

    const deleted = result.current.mutateAsync('match-1');
    await waitFor(() => expect(mockDeleteMatchWithStatsReversal).toHaveBeenCalledTimes(1));

    await expect(deleted).resolves.toBeUndefined();
  });

  it('rejects with the same error when the delete fails while the browser is offline', async () => {
    const failure = new Error('Failed to fetch');
    mockDeleteMatchWithStatsReversal.mockImplementation(() => Promise.reject(failure));
    onlineManager.setOnline(false);
    const { result } = renderDelete();

    const outcome = result.current.mutateAsync('match-1').catch((error: unknown) => error);
    await waitFor(() => expect(mockDeleteMatchWithStatsReversal).toHaveBeenCalledTimes(1));

    expect(await outcome).toBe(failure);
  });
});
