import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { useTimeslotQuery } from '../useTimeslotQuery';

const makeWrapper = (queryClient: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useTimeslotQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches and transforms timeslots successfully', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    vi.mocked(TimeslotService.fetchByDate).mockResolvedValue([{ id: 'ts1', timeslot: '6:00 PM' }] as any);
    vi.mocked(TimeslotTransformer.groupByTimeslot).mockReturnValue({ '6:00 PM': [{ id: 'ts1' }] } as any);

    const { result } = renderHook(() => useTimeslotQuery(new Date('2026-04-01T10:00:00Z')), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(TimeslotService.fetchByDate).toHaveBeenCalled();
    expect(result.current.timeslots).toEqual([{ id: 'ts1', timeslot: '6:00 PM' }]);
    expect(result.current.groupedTimeslots).toEqual({ '6:00 PM': [{ id: 'ts1' }] });
    expect(result.current.error).toBeNull();
  });

  it('surfaces service error message to caller', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    vi.mocked(TimeslotService.fetchByDate).mockRejectedValue(new Error('query failed'));

    const { result } = renderHook(() => useTimeslotQuery(new Date('2026-04-01T10:00:00Z')), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBe('query failed'), { timeout: 5000 });
    expect(result.current.timeslots).toEqual([]);
  });

  it('does not fetch when date is null', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

    const { result } = renderHook(() => useTimeslotQuery(null), {
      wrapper: makeWrapper(queryClient),
    });

    expect(TimeslotService.fetchByDate).not.toHaveBeenCalled();
    expect(result.current.timeslots).toEqual([]);
    expect(result.current.groupedTimeslots).toEqual({});
  });
});
