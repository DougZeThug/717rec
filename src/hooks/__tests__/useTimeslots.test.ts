import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimeslots } from '../useTimeslots';

const mockUseTimeslotQuery = vi.fn();
const mockUseTimeslotMutation = vi.fn();

vi.mock('../useTimeslotQuery', () => ({
  useTimeslotQuery: (...args: unknown[]) => mockUseTimeslotQuery(...args),
}));

vi.mock('../useTimeslotMutation', () => ({
  useTimeslotMutation: () => mockUseTimeslotMutation(),
}));

const createWrapper = (queryClient: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useTimeslots', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseTimeslotQuery.mockReturnValue({
      timeslots: [{ id: 'ts-1' }],
      groupedTimeslots: { '7:00 PM': [{ id: 'ts-1' }] },
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

  it('returns query and mutation API in a single hook', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useTimeslots(new Date('2026-04-20')), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.timeslots).toEqual([{ id: 'ts-1' }]);
    expect(result.current.groupedTimeslots).toEqual({ '7:00 PM': [{ id: 'ts-1' }] });
    expect(typeof result.current.addTimeslot).toBe('function');
    expect(typeof result.current.batchAssignTimeslots).toBe('function');
  });

  it('combines loading states from query and mutation', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    mockUseTimeslotQuery.mockReturnValue({
      timeslots: [],
      groupedTimeslots: {},
      isLoading: false,
      error: null,
    });
    mockUseTimeslotMutation.mockReturnValue({
      isSubmitting: true,
      addTimeslot: vi.fn(),
      deleteTimeslot: vi.fn(),
      batchAssignTimeslots: vi.fn(),
      batchAssignDoubleHeaders: vi.fn(),
      assignByeWeek: vi.fn(),
      batchAssignByeWeeks: vi.fn(),
      removeByeWeek: vi.fn(),
    });

    const { result } = renderHook(() => useTimeslots(new Date('2026-04-20')), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('invalidates date-specific cache when refreshTimeslots is called', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useTimeslots(new Date('2026-04-20')), {
      wrapper: createWrapper(queryClient),
    });

    result.current.refreshTimeslots();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['timeslots', '2026-04-20'] });
  });
});
