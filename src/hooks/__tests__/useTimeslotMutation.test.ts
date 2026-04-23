import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockToast = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/services/timeslots/TimeslotService', () => ({
  TimeslotService: {
    addTimeslot: vi.fn(),
    deleteTimeslot: vi.fn(),
    batchAssignTimeslots: vi.fn(),
    batchAssignDoubleHeaders: vi.fn(),
  },
}));

vi.mock('@/services/timeslots/ByeWeekService', () => ({
  ByeWeekService: {
    assignByeWeek: vi.fn(),
    batchAssignByeWeeks: vi.fn(),
    removeByeWeek: vi.fn(),
  },
}));

vi.mock('@/services/timeslots/TimeslotValidator', () => ({
  TimeslotValidator: {
    validateTimeslotAssignment: vi.fn(),
    validateBatchAssignment: vi.fn(),
  },
}));

import { ByeWeekService } from '@/services/timeslots/ByeWeekService';
import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotValidator } from '@/services/timeslots/TimeslotValidator';

import { useTimeslotMutation } from '../useTimeslotMutation';

const makeWrapper = (queryClient: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useTimeslotMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(TimeslotValidator.validateTimeslotAssignment).mockReturnValue({ valid: true });
    vi.mocked(TimeslotValidator.validateBatchAssignment).mockReturnValue({ valid: true });
  });

  it('adds timeslot and invalidates date-scoped caches', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(TimeslotService.addTimeslot).mockResolvedValue([{ id: 'ts1' }] as any);

    const { result } = renderHook(() => useTimeslotMutation(), { wrapper: makeWrapper(queryClient) });
    const date = new Date('2026-04-01T12:00:00Z');

    let response: any;
    await act(async () => {
      response = await result.current.addTimeslot(date, 'team-1', '6:00 PM');
    });

    expect(response).toEqual({ id: 'ts1' });
    expect(TimeslotService.addTimeslot).toHaveBeenCalledWith(date, 'team-1', '6:00 PM');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['timeslots', '2026-04-01'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['match-timeslots', '2026-04-01'] });
  });

  it('surfaces service error to caller and toast', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const error = new Error('insert failed');
    vi.mocked(TimeslotService.addTimeslot).mockRejectedValue(error);

    const { result } = renderHook(() => useTimeslotMutation(), { wrapper: makeWrapper(queryClient) });

    await expect(result.current.addTimeslot(new Date('2026-04-01'), 'team-1', '6:00 PM')).rejects.toThrow(
      'insert failed'
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error', description: 'insert failed', variant: 'destructive' })
    );
  });

  it('rolls submitting state back to false after failed mutation', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    vi.mocked(ByeWeekService.removeByeWeek).mockRejectedValue(new Error('remove failed'));

    const { result } = renderHook(() => useTimeslotMutation(), { wrapper: makeWrapper(queryClient) });

    expect(result.current.isSubmitting).toBe(false);
    await expect(result.current.removeByeWeek('bye-1')).rejects.toThrow('remove failed');

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
