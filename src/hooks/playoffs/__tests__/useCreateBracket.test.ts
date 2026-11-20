import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/bracket-creator', () => ({
  createBracket: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { createBracket } from '@/services/bracket-creator';
import type { BracketRecord } from '@/types/bracketRecord';
import { bracketLog, errorLog } from '@/utils/logger';

import { useCreateBracket } from '../useCreateBracket';

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

const renderCreateBracket = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const invalidate = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockImplementation(() => Promise.resolve());
  const { result } = renderHook(() => useCreateBracket(), {
    wrapper: createWrapper(queryClient),
  });
  return { result, invalidate };
};

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const payload = {
  title: 'Playoffs',
  format: 'singleElim',
  teams: [{ id: 't-1', name: 'Team One' }],
} as unknown as Parameters<typeof createBracket>[0];

const bracket = { id: 'b-1', title: 'Playoffs' } as unknown as BracketRecord;

describe('useCreateBracket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the form data to the service as is and returns the new bracket', async () => {
    asMock(createBracket).mockResolvedValue(bracket);
    const { result } = renderCreateBracket();

    const created = await result.current.mutateAsync(payload);

    expect(created).toBe(bracket);
    expect(createBracket).toHaveBeenCalledTimes(1);
    expect(asMock(createBracket).mock.calls[0][0]).toBe(payload);
  });

  it('refreshes the bracket and playoff lists after a bracket is created', async () => {
    asMock(createBracket).mockResolvedValue(bracket);
    const { result, invalidate } = renderCreateBracket();

    await result.current.mutateAsync(payload);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['brackets'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playoff-data'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playoff-matches'] });
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(bracketLog).toHaveBeenCalledWith('Bracket created successfully:', bracket);
  });

  it('logs the error, rejects, and leaves the lists alone when the save fails', async () => {
    const failure = new Error('row level security');
    asMock(createBracket).mockRejectedValue(failure);
    const { result, invalidate } = renderCreateBracket();

    await expect(result.current.mutateAsync(payload)).rejects.toBe(failure);

    expect(errorLog).toHaveBeenCalledWith('Failed to create bracket:', failure);
    expect(invalidate).not.toHaveBeenCalled();
    expect(bracketLog).not.toHaveBeenCalled();
  });
});
