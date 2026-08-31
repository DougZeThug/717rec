import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockToast = vi.fn();

vi.mock('@/services/brackets/BracketWriteService', () => ({
  updateBracket: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { updateBracket } from '@/services/brackets/BracketWriteService';

import { useUpdateBracket } from '../useUpdateBracket';

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

const renderUpdateBracket = (bracketId: string | null = 'b-1') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const invalidate = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockImplementation(() => Promise.resolve());
  const { result } = renderHook(() => useUpdateBracket(bracketId), {
    wrapper: createWrapper(queryClient),
  });
  return { result, invalidate };
};

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe('useUpdateBracket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the patch for the bracket it was given', async () => {
    asMock(updateBracket).mockImplementation(() => Promise.resolve());
    const { result } = renderUpdateBracket('b-7');

    result.current.mutate({ title: 'Renamed' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateBracket).toHaveBeenCalledWith('b-7', { title: 'Renamed' });
  });

  it('confirms the save to the admin', async () => {
    asMock(updateBracket).mockImplementation(() => Promise.resolve());
    const { result } = renderUpdateBracket();

    result.current.mutate({ title: 'Renamed' });

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bracket updated' }));
  });

  it('refreshes the lists a renamed bracket appears in', async () => {
    asMock(updateBracket).mockImplementation(() => Promise.resolve());
    const { result, invalidate } = renderUpdateBracket('b-7');

    result.current.mutate({ title: 'Renamed' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = invalidate.mock.calls.map(([arg]) => JSON.stringify(arg));
    // The overview list's key does not start with 'brackets', so invalidating
    // ['brackets'] alone would leave a stale title on the division cards.
    expect(keys).toContain(JSON.stringify({ queryKey: ['brackets'] }));
    expect(keys).toContain(JSON.stringify({ queryKey: ['playoffs-brackets-overview'] }));
    expect(keys).toContain(JSON.stringify({ queryKey: ['bracket-info', 'b-7'] }));
    expect(keys).toContain(JSON.stringify({ queryKey: ['bracket-data', 'b-7'] }));
  });

  it('reports the reason when the write is refused', async () => {
    asMock(updateBracket).mockRejectedValue(new Error('row level security'));
    const { result } = renderUpdateBracket();

    result.current.mutate({ title: 'Renamed' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Could not update bracket',
        description: 'row level security',
        variant: 'destructive',
      })
    );
  });
});
