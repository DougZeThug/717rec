import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotTransformer } from '@/services/timeslots/TimeslotTransformer';
import type { TeamTimeslot } from '@/types/timeslots';

import { useTimeslotQuery } from '../useTimeslotQuery';
import { useTimeslots } from '../useTimeslots';

vi.mock('@/services/timeslots/TimeslotService', () => ({
  TimeslotService: { fetchByDate: vi.fn() },
}));
vi.mock('@/services/timeslots/TimeslotTransformer', () => ({
  TimeslotTransformer: { groupByTimeslot: vi.fn() },
}));

const mutationFns = {
  isSubmitting: false,
  addTimeslot: vi.fn(),
  deleteTimeslot: vi.fn(),
  batchAssignTimeslots: vi.fn(),
  batchAssignDoubleHeaders: vi.fn(),
  assignByeWeek: vi.fn(),
  batchAssignByeWeeks: vi.fn(),
  removeByeWeek: vi.fn(),
};
vi.mock('../useTimeslotMutation', () => ({
  useTimeslotMutation: () => mutationFns,
}));

const sampleRows = [{ id: 'ts-1', timeslot: '6:00 PM' }] as unknown as TeamTimeslot[];
const sampleGroups = { '6:00 PM': sampleRows };

let queryClient: QueryClient;
const createWrapper = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useTimeslotQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (TimeslotService.fetchByDate as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRows);
    (TimeslotTransformer.groupByTimeslot as ReturnType<typeof vi.fn>).mockReturnValue(
      sampleGroups
    );
  });

  it('fetches and groups timeslots for the given date', async () => {
    const date = new Date('2026-06-05T00:00:00');
    const { result } = renderHook(() => useTimeslotQuery(date), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(TimeslotService.fetchByDate).toHaveBeenCalledWith(date);
    expect(TimeslotTransformer.groupByTimeslot).toHaveBeenCalledWith(sampleRows);
    expect(result.current.timeslots).toEqual(sampleRows);
    expect(result.current.groupedTimeslots).toEqual(sampleGroups);
    expect(result.current.error).toBeNull();
  });

  it('stays idle and empty when no date is provided', () => {
    const { result } = renderHook(() => useTimeslotQuery(null), { wrapper: createWrapper() });
    expect(TimeslotService.fetchByDate).not.toHaveBeenCalled();
    expect(result.current.timeslots).toEqual([]);
    expect(result.current.groupedTimeslots).toEqual({});
  });

  it('surfaces the service error message instead of throwing', async () => {
    // The hook hardcodes retry: 2 with exponential backoff, so the error
    // only lands after all three attempts (~3-7s).
    (TimeslotService.fetchByDate as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('db down')
    );
    const { result } = renderHook(() => useTimeslotQuery(new Date('2026-06-05T00:00:00')), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.error).toBe('db down'), { timeout: 12_000 });
    expect(result.current.timeslots).toEqual([]);
  }, 15_000);
});

describe('useTimeslots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (TimeslotService.fetchByDate as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRows);
    (TimeslotTransformer.groupByTimeslot as ReturnType<typeof vi.fn>).mockReturnValue(
      sampleGroups
    );
  });

  it('exposes query data and every mutation function', async () => {
    const { result } = renderHook(() => useTimeslots(new Date('2026-06-05T00:00:00')), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.timeslots).toEqual(sampleRows);
    expect(result.current.addTimeslot).toBe(mutationFns.addTimeslot);
    expect(result.current.deleteTimeslot).toBe(mutationFns.deleteTimeslot);
    expect(result.current.batchAssignTimeslots).toBe(mutationFns.batchAssignTimeslots);
    expect(result.current.batchAssignDoubleHeaders).toBe(mutationFns.batchAssignDoubleHeaders);
    expect(result.current.assignByeWeek).toBe(mutationFns.assignByeWeek);
    expect(result.current.batchAssignByeWeeks).toBe(mutationFns.batchAssignByeWeeks);
    expect(result.current.removeByeWeek).toBe(mutationFns.removeByeWeek);
  });

  it('invalidates the date-scoped timeslot cache via refreshTimeslots', async () => {
    const { result } = renderHook(() => useTimeslots(new Date('2026-06-05T00:00:00')), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    result.current.refreshTimeslots();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['timeslots', '2026-06-05'] });
  });

  it('reports loading while a mutation is submitting', async () => {
    mutationFns.isSubmitting = true;
    const { result } = renderHook(() => useTimeslots(new Date('2026-06-05T00:00:00')), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    mutationFns.isSubmitting = false;
  });
});
