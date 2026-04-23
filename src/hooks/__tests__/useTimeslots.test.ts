import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseTimeslotQuery = vi.fn();
const mockUseTimeslotMutation = vi.fn();

vi.mock('../useTimeslotQuery', () => ({
  useTimeslotQuery: (...args: unknown[]) => mockUseTimeslotQuery(...args),
}));

vi.mock('../useTimeslotMutation', () => ({
  useTimeslotMutation: () => mockUseTimeslotMutation(),
}));

import { useTimeslots } from '../useTimeslots';

const makeWrapper = (queryClient: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useTimeslots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTimeslotQuery.mockReturnValue({
      timeslots: [{ id: 'ts1' }],
      groupedTimeslots: { '6:00 PM': [{ id: 'ts1' }] },
      isLoading: false,
      error: null,
    });
    mockUseTimeslotMutation.mockReturnValue({
      isSubmitting: false,
      addTimeslot: vi.fn(),
      deleteTimeslot: vi.fn(),
      batchAssignTimeslots: vi.fn(),
      batchAssignDoubleHeaders: vi.fn(),
      assignByeWeek: vi.fn(),
      batchAssignByeWeeks: vi.fn(),
      removeByeWeek: vi.fn(),
    });
  });

  it('returns merged query+mutation state and handlers', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { result } = renderHook(() => useTimeslots(new Date('2026-04-02T10:00:00Z')), {
      wrapper: makeWrapper(queryClient),
    });

    expect(result.current.timeslots).toEqual([{ id: 'ts1' }]);
    expect(result.current.groupedTimeslots).toEqual({ '6:00 PM': [{ id: 'ts1' }] });
    expect(typeof result.current.addTimeslot).toBe('function');
  });

  it('reports loading when mutation is submitting', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    mockUseTimeslotMutation.mockReturnValue({
      ...mockUseTimeslotMutation.mock.results[0]?.value,
      isSubmitting: true,
    });

    const { result } = renderHook(() => useTimeslots(new Date('2026-04-02T10:00:00Z')), {
      wrapper: makeWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('refreshTimeslots invalidates date-scoped timeslot query', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useTimeslots(new Date('2026-04-02T10:00:00Z')), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.refreshTimeslots();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['timeslots', '2026-04-02'] });
  });
});
