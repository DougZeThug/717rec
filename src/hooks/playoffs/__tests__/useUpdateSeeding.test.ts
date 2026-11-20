import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const seedingMock = vi.hoisted(() => {
  // A normal method that reads `this`, like the real service class. A bare
  // method reference loses `this`, so it throws here.
  const service = {
    marker: 'service',
    calls: [] as unknown[],
    impl: null as null | ((options: unknown) => Promise<void>),
    updateSeeding(
      this: { marker?: string; calls: unknown[]; impl: null | ((o: unknown) => Promise<void>) },
      options: unknown
    ) {
      if (this?.marker !== 'service') {
        return Promise.reject(new Error('this was lost'));
      }
      this.calls.push(options);
      return this.impl ? this.impl(options) : Promise.resolve();
    },
  };
  return service;
});

vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: seedingMock,
}));

import type { UpdateSeedingOptions } from '@/services/brackets/manager';

import { useUpdateSeeding } from '../useUpdateSeeding';

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

const renderUpdateSeeding = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const { result } = renderHook(() => useUpdateSeeding(), {
    wrapper: createWrapper(queryClient),
  });
  return { result, invalidate };
};

const options = {
  bracketId: 'b-1',
  newSeeding: [
    { id: 't-1', name: 'Alpha', seed: 1 },
    { id: 't-2', name: 'Bravo', seed: 2 },
  ],
  keepSameSize: true,
} as UpdateSeedingOptions;

describe('useUpdateSeeding', () => {
  beforeEach(() => {
    seedingMock.calls.length = 0;
    seedingMock.impl = null;
  });

  afterEach(() => {
    // Always put the browser back online, so no other test is affected.
    onlineManager.setOnline(true);
  });

  it('passes the exact options object to the service, once', async () => {
    const { result } = renderUpdateSeeding();

    await result.current.mutateAsync(options);

    expect(seedingMock.calls).toHaveLength(1);
    expect(seedingMock.calls[0]).toBe(options);
  });

  it('keeps the service as `this` (the real method reads this.seedingService)', async () => {
    const { result } = renderUpdateSeeding();

    // The mock rejects with "this was lost" when called without its service.
    await expect(result.current.mutateAsync(options)).resolves.toBeUndefined();
  });

  it('resolves to undefined on success', async () => {
    const { result } = renderUpdateSeeding();

    await expect(result.current.mutateAsync(options)).resolves.toBeUndefined();
  });

  it('rejects with the same error object when the save fails', async () => {
    const failure = new Error('Cannot update seeding of a started match');
    seedingMock.impl = () => Promise.reject(failure);
    const { result } = renderUpdateSeeding();

    await expect(result.current.mutateAsync(options)).rejects.toBe(failure);
  });

  it('passes a plain string rejection through unchanged', async () => {
    seedingMock.impl = () => Promise.reject('nope'); // skipcq: JS-0114
    const { result } = renderUpdateSeeding();

    await expect(result.current.mutateAsync(options)).rejects.toBe('nope');
  });

  it('does not refresh any query itself (the dialog does that after its toast)', async () => {
    const { result, invalidate } = renderUpdateSeeding();

    await result.current.mutateAsync(options);

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('calls the service only once when the save fails (no retry)', async () => {
    seedingMock.impl = () => Promise.reject(new Error('boom'));
    const { result } = renderUpdateSeeding();

    await expect(result.current.mutateAsync(options)).rejects.toThrow('boom');

    expect(seedingMock.calls).toHaveLength(1);
  });

  // TanStack pauses an offline mutation by default. The dialog must still fail
  // at once offline, as it did when it called the service directly.
  it('still runs the save while the browser is offline', async () => {
    onlineManager.setOnline(false);
    const { result } = renderUpdateSeeding();

    const saved = result.current.mutateAsync(options);
    await waitFor(() => expect(seedingMock.calls).toHaveLength(1));

    await expect(saved).resolves.toBeUndefined();
  });

  it('rejects with the same error when the save fails while the browser is offline', async () => {
    const failure = new Error('Failed to fetch');
    seedingMock.impl = () => Promise.reject(failure);
    onlineManager.setOnline(false);
    const { result } = renderUpdateSeeding();

    const outcome = result.current.mutateAsync(options).catch((error: unknown) => error);
    await waitFor(() => expect(seedingMock.calls).toHaveLength(1));

    expect(await outcome).toBe(failure);
  });
});
