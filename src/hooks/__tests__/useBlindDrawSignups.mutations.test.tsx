import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockToast, mockService } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockService: {
    createSignup: vi.fn(),
    deleteSignup: vi.fn(),
    clearSignups: vi.fn(),
    fetchBlindDrawSignupCount: vi.fn(),
    fetchBlindDrawSignups: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/services/BlindDrawService', () => ({ BlindDrawService: mockService }));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn() }));

import {
  useAddBlindDrawSignup,
  useClearBlindDrawSignups,
  useBlindDrawSignupCount,
  useBlindDrawSignups,
  useDeleteBlindDrawSignup,
} from '../useBlindDrawSignups';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { mutations: { retry: false } } }) },
    children
  );

const run = async (fn: () => Promise<unknown>) => {
  await act(async () => {
    await fn().catch(() => undefined);
  });
};

describe('blind draw signup mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockService).forEach((fn) => fn.mockImplementation(() => Promise.resolve()));
  });

  it('confirms a removed signup with a success toast', async () => {
    const { result } = renderHook(() => useDeleteBlindDrawSignup(), { wrapper });

    await run(() => result.current.mutateAsync('signup-1' as never));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Signup removed', variant: 'success' })
    );
  });

  it('confirms cleared signups with a success toast', async () => {
    const { result } = renderHook(() => useClearBlindDrawSignups(), { wrapper });

    await run(() => result.current.mutateAsync(undefined as never));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Signups cleared', variant: 'success' })
    );
  });

  it.each([
    ['sign up', useAddBlindDrawSignup, 'createSignup'],
    ['remove', useDeleteBlindDrawSignup, 'deleteSignup'],
    ['clear', useClearBlindDrawSignups, 'clearSignups'],
  ] as const)('shows an error toast when trying to %s fails', async (_label, useHook, service) => {
    mockService[service].mockRejectedValue(new Error('db down'));
    const { result } = renderHook(() => useHook(), { wrapper });

    await run(() => result.current.mutateAsync({} as never));

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});

describe('blind draw signup queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.fetchBlindDrawSignupCount.mockResolvedValue(7);
    mockService.fetchBlindDrawSignups.mockResolvedValue([{ id: 'a' }]);
  });

  it('counts the signups for an event date', async () => {
    const { result } = renderHook(() => useBlindDrawSignupCount('2026-10-08'), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(7));
    expect(mockService.fetchBlindDrawSignupCount).toHaveBeenCalledWith('2026-10-08');
  });

  it('does not ask the server to count when there is no event date', () => {
    const { result } = renderHook(() => useBlindDrawSignupCount(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockService.fetchBlindDrawSignupCount).not.toHaveBeenCalled();
  });

  it('lists the signups for the admin view', async () => {
    const { result } = renderHook(() => useBlindDrawSignups('2026-10-08'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([{ id: 'a' }]));
  });
});
