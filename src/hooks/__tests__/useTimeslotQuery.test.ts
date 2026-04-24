import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimeslotQuery } from '../useTimeslotQuery';

vi.mock('@/services/timeslots/TimeslotService', () => ({
  TimeslotService: {
    fetchByDate: vi.fn(),
  },
}));

vi.mock('@/services/timeslots/TimeslotTransformer', () => ({
  TimeslotTransformer: {
    groupByTimeslot: vi.fn(),
  },
}));

import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotTransformer } from '@/services/timeslots/TimeslotTransformer';

const createWrapper = (queryClient: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useTimeslotQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns grouped data on successful query', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const timeslots = [{ id: 'ts-1', timeslot: '7:00 PM' }] as any;
    const grouped = { '7:00 PM': timeslots } as any;

    vi.mocked(TimeslotService.fetchByDate).mockResolvedValue(timeslots);
    vi.mocked(TimeslotTransformer.groupByTimeslot).mockReturnValue(grouped);

    const { result } = renderHook(() => useTimeslotQuery(new Date('2026-04-20')), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.timeslots).toEqual(timeslots);
    expect(result.current.groupedTimeslots).toEqual(grouped);
    expect(TimeslotTransformer.groupByTimeslot).toHaveBeenCalledWith(timeslots);
  });

  it('surfaces query errors', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(TimeslotService.fetchByDate).mockRejectedValue(new Error('cannot load timeslots'));

    const { result } = renderHook(() => useTimeslotQuery(new Date('2026-04-20')), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.error).toBe('cannot load timeslots');
    }, { timeout: 6000 });

    expect(TimeslotService.fetchByDate).toHaveBeenCalledTimes(3);
  });

  it('uses date-specific cache key so different dates refetch independently', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(TimeslotService.fetchByDate).mockResolvedValue([] as any);
    vi.mocked(TimeslotTransformer.groupByTimeslot).mockReturnValue({});

    const { rerender } = renderHook(({ date }) => useTimeslotQuery(date), {
      initialProps: { date: new Date('2026-04-20') },
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(TimeslotService.fetchByDate).toHaveBeenCalledTimes(1));

    rerender({ date: new Date('2026-04-21') });

    await waitFor(() => expect(TimeslotService.fetchByDate).toHaveBeenCalledTimes(2));
  });
});
