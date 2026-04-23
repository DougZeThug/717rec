import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockHandleUpdateMatch = vi.fn();
const mockHandleDeleteMatch = vi.fn();

vi.mock('../useMatchUpdate', () => ({
  useMatchUpdate: () => ({
    handleUpdateMatch: mockHandleUpdateMatch,
    isUpdating: false,
  }),
}));

vi.mock('../useMatchDelete', () => ({
  useMatchDelete: () => ({
    handleDeleteMatch: mockHandleDeleteMatch,
  }),
}));

import { useMatchUpdates } from '../useMatchUpdates';

const makeWrapper = (queryClient: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useMatchUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes update/delete handlers from child hooks', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    mockHandleUpdateMatch.mockResolvedValue(true);
    mockHandleDeleteMatch.mockResolvedValue(true);

    const { result } = renderHook(() => useMatchUpdates([], vi.fn()), {
      wrapper: makeWrapper(queryClient),
    });

    await expect(result.current.handleUpdateMatch({} as any, [])).resolves.toBe(true);
    await expect(result.current.handleDeleteMatch([] as any)).resolves.toBe(true);
  });

  it('tracks editing and delete state changes', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

    const { result } = renderHook(() => useMatchUpdates([], vi.fn()), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.setEditingMatch({ id: 'm1' } as any);
      result.current.setDeleteMatchId('m2');
    });

    expect(result.current.editingMatch).toEqual({ id: 'm1' });
    expect(result.current.deleteMatchId).toBe('m2');
  });

  it('invalidates all data query groups when requested', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMatchUpdates([], vi.fn()), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.invalidateAllDataQueries();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['teams'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rankings'] });
  });
});
