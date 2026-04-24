import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimeslotMutation } from '../useTimeslotMutation';

const mockToast = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/services/timeslots/TimeslotValidator', () => ({
  TimeslotValidator: {
    validateTimeslotAssignment: vi.fn(),
    validateBatchAssignment: vi.fn(),
  },
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

import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotValidator } from '@/services/timeslots/TimeslotValidator';

const createWrapper = (queryClient: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useTimeslotMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(TimeslotValidator.validateTimeslotAssignment).mockReturnValue({ valid: true });
    vi.mocked(TimeslotValidator.validateBatchAssignment).mockReturnValue({ valid: true });
  });

  it('adds a timeslot and invalidates related caches', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const date = new Date('2026-04-20T12:00:00.000Z');

    vi.mocked(TimeslotService.addTimeslot).mockResolvedValue([
      { id: 'ts-1', team_id: 'team-1', timeslot: '7:00 PM' } as any,
    ]);

    const { result } = renderHook(() => useTimeslotMutation(), { wrapper: createWrapper(queryClient) });

    await act(async () => {
      const created = await result.current.addTimeslot(date, 'team-1', '7:00 PM');
      expect(created?.id).toBe('ts-1');
    });

    expect(TimeslotService.addTimeslot).toHaveBeenCalledWith(date, 'team-1', '7:00 PM');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['timeslots', '2026-04-20'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['match-timeslots', '2026-04-20'] });
  });

  it('surfaces service errors to caller and toast', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const failure = new Error('Failed at service layer');
    vi.mocked(TimeslotService.addTimeslot).mockRejectedValue(failure);

    const { result } = renderHook(() => useTimeslotMutation(), { wrapper: createWrapper(queryClient) });

    await expect(result.current.addTimeslot(new Date('2026-04-20'), 'team-1', '7:00 PM')).rejects.toThrow(
      'Failed at service layer'
    );

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Failed at service layer',
        variant: 'destructive',
      })
    );
  });

  it('returns early for validation failures without calling service', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(TimeslotValidator.validateTimeslotAssignment).mockReturnValue({
      valid: false,
      error: 'Missing team id',
    });

    const { result } = renderHook(() => useTimeslotMutation(), { wrapper: createWrapper(queryClient) });

    let response: unknown;
    await act(async () => {
      response = await result.current.addTimeslot(new Date('2026-04-20'), '', '7:00 PM');
    });

    expect(response).toBeNull();
    expect(TimeslotService.addTimeslot).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Validation Error', description: 'Missing team id' })
    );
  });
});
