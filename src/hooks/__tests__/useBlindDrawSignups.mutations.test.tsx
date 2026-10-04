import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockToast, mockService } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockService: { createSignup: vi.fn(), deleteSignup: vi.fn(), clearSignups: vi.fn() },
}));

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/services/BlindDrawService', () => ({ BlindDrawService: mockService }));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn() }));

import {
  useAddBlindDrawSignup,
  useClearBlindDrawSignups,
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
